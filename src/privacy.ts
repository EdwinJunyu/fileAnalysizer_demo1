import { field } from './fields.js';
import type { AnalysisResult, PrivacyFinding, PrivacyReport } from './types.js';

type Kind = PrivacyFinding['kind'];
const labels: Readonly<Record<string, string>> = {
  gpslatitude: 'GPS 纬度', gpslatituderef: '纬度方向', gpslongitude: 'GPS 经度', gpslongituderef: '经度方向',
  gpsposition: 'GPS 位置', gpscoordinates: 'GPS 坐标', gpsaltitude: 'GPS 海拔', gpsaltituderef: '海拔参考',
  gpsdatestamp: 'GPS 记录日期', gpstimestamp: 'GPS 记录时间', gpsdatetime: 'GPS 记录时间',
  city: '城市', country: '国家', countryname: '国家', state: '州或省', province: '省份', sublocation: '详细地点',
  author: '作者', artist: '署名或艺术家', creator: '创作者', byline: '署名', copyright: '版权声明', rights: '权利声明',
  ownername: '所有者姓名', cameraownername: '相机所有者', lastmodifiedby: '最后修改者', company: '公司', manager: '经理',
  email: '联系邮箱', creatorworkemail: '创作者邮箱', creatorworktelephone: '创作者电话', composer: '作曲者', encodedby: '编码者',
  make: '设备品牌', model: '设备型号', cameramodelname: '相机型号', serialnumber: '设备序列号',
  bodyserialnumber: '机身序列号', lensserialnumber: '镜头序列号', internalserialnumber: '内部序列号',
  deviceserialnumber: '设备序列号', deviceid: '设备标识',
};
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const quickTimeTagAliases: Readonly<Record<string, string>> = {
  comapplequicktimeauthor: 'author', comapplequicktimemake: 'make', comapplequicktimemodel: 'model',
};

function classify(name: string): { kind: Kind; label: string } | undefined {
  const normalized = name.split(':').at(-1)!.toLowerCase().replace(/[-_ .]/g, '');
  const tag = Object.hasOwn(quickTimeTagAliases, normalized) ? quickTimeTagAliases[normalized]! : normalized;
  if (/^(gps(latitude|longitude|position|coordinates|altitude|datestamp|timestamp|datetime)(ref)?|location|locationeng|comapplequicktimelocationiso6709|city|country|countryname|state|province|sublocation)$/.test(tag)) {
    return { kind: 'location', label: labels[tag] ?? '地理位置' };
  }
  // PDF Creator names software; its Author and XMP-dc:Creator name people.
  if (name === 'PDF:Creator') return undefined;
  if (/^(author|artist|creator|byline|copyright|rights|ownername|cameraownername|lastmodifiedby|company|manager|email|creatorworkemail|creatorworktelephone|composer|encodedby)$/.test(tag)) {
    return { kind: 'identity', label: labels[tag] ?? '作者、署名或联系信息' };
  }
  if (/^(make|model|cameramodelname|serialnumber|bodyserialnumber|lensserialnumber|internalserialnumber|deviceserialnumber|deviceid)$/.test(tag)) {
    return { kind: 'device', label: labels[tag] ?? '设备型号或标识' };
  }
  return undefined;
}

/** Inspect only known metadata locations; never scan file bodies or filesystem paths. */
export function inspectPrivacy(result: AnalysisResult): PrivacyReport {
  const report: PrivacyReport = { status: 'unavailable', findings: [], checkedSources: [], limitations: [
    '仅检查已读取的受支持元数据字段；未发现记录不代表文件不含隐私。未检查正文、图像内容、批注、附件和历史版本。',
  ] };
  if (result.category === 'other') { report.status = 'unsupported'; return report; }
  let limited = false;
  const seen = new Set<string>();
  const add = (name: string, value: unknown, source: string, match = classify(name)): void => {
    if (!match) return;
    let text: string;
    if (Array.isArray(value)) {
      if (value.length > 32) limited = true;
      const parts = value.slice(0, 32).filter(item => typeof item === 'string' || typeof item === 'number');
      if (parts.length !== Math.min(value.length, 32)) limited = true;
      text = parts.join('; ').trim();
    } else if (typeof value === 'string') text = value.trim();
    else if (typeof value === 'number' && Number.isFinite(value)) text = String(value);
    else { if (value != null) limited = true; return; }
    if (!text) return;
    const identity = `${source}\n${text}`;
    if (seen.has(identity)) return;
    seen.add(identity);
    if (report.findings.length >= 100) { limited = true; return; }
    const truncated = text.length > 2048;
    if (truncated) limited = true;
    report.findings.push({ ...field(`privacy.${report.findings.length}`, match.label,
      truncated ? `${text.slice(0, 2048)}…` : text, source, undefined,
      truncated ? '值较长，显示内容已截断。' : undefined), kind: match.kind });
  };
  const raw = result.rawMetadata ?? {};
  if (result.category === 'audio' || result.category === 'video') {
    if (record(raw.format) || Array.isArray(raw.streams)) {
      report.checkedSources.push('FFprobe 文件和轨道标签');
      const tags = (container: unknown, source: string): void => {
        if (record(container) && record(container.tags)) {
          for (const [name, value] of Object.entries(container.tags)) add(name, value, `${source}.tags.${name}`);
        }
      };
      tags(raw.format, 'ffprobe.format');
      if (Array.isArray(raw.streams)) raw.streams.forEach((stream, index) => tags(stream, `ffprobe.streams[${index}]`));
    }
    report.limitations.push('音视频仅检查 FFprobe 返回的标签，不覆盖全部厂商私有数据。');
  } else {
    if (Object.hasOwn(raw, 'ExifTool:ExifToolVersion') || Object.hasOwn(raw, 'File:FileType')) {
      report.checkedSources.push('ExifTool 元数据');
      for (const [name, value] of Object.entries(raw)) {
        if (name.includes(':') && !/^(?:System|File|ExifTool):/.test(name)) add(name, value, `ExifTool: ${name}`);
      }
    }
    if (Object.keys(raw).some(name => name.startsWith('OOXML: '))) report.checkedSources.push('Office 文档属性');
    if (record(raw.PDFParser)) report.checkedSources.push('PDF 文档属性');
    for (const item of result.fields) {
      const match: { kind: Kind; label: string } | undefined =
        ['office.creator', 'office.lastModifiedBy', 'office.company', 'pdf.author'].includes(item.key)
          ? { kind: 'identity', label: item.label } : undefined;
      if (item.status === 'present' && match) add(item.key, item.value, item.source, match);
    }
  }
  if (report.checkedSources.length) report.status = result.status === 'ok' && !limited ? 'checked' : 'partial';
  if (limited) report.limitations.push('发现项较多、过长或结构无法展开，仅展示前 100 项及受限长度，检查范围不完整。');
  if (report.status === 'unavailable') report.limitations.push('解析工具未返回可检查的元数据，请查看解析问题并重试。');
  return report;
}
