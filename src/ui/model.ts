import type { DesktopFile } from '../desktop/contracts.js';
import type { AnalysisResult, FileCategory, MediaStream, MetadataField } from '../types.js';

export interface FileEntry extends DesktopFile {
  state: 'waiting' | 'processing' | 'done' | 'partial' | 'failed';
  result?: AnalysisResult;
  message?: string;
}

export interface ComparisonRow {
  key: string;
  label: string;
  values: string[];
}

const numbers = new Intl.NumberFormat('zh-CN', { maximumSignificantDigits: 15 });
const compactNumbers = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });
const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const dates = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  timeZoneName: 'shortOffset',
});

const unitLabels: Readonly<Record<string, string>> = {
  pages: '页', words: '词', sheets: '张', slides: '张',
  characters: '字符', paragraphs: '段', lines: '行',
};

/** Binary display units are explicit; retain the exact byte count alongside them. */
export function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size < 0) return '无法确定';
  const exact = `${numbers.format(size)} byte`;
  if (size < 1024) return exact;
  const units = ['KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length);
  return `${compactNumbers.format(size / 1024 ** exponent)} ${units[exponent - 1]}（${exact}）`;
}

/** One value formatter is shared by details and comparison; absent values never become zero. */
export function formatField(field: MetadataField | undefined): string {
  if (!field || field.status === 'missing') return '未记录';
  if (field.status === 'not_applicable') return '不适用';
  if (field.status === 'unknown') return '无法确定';
  if (field.status === 'error') return '解析错误';
  if (field.value === null || field.value === '') return '未记录';
  if (typeof field.value === 'boolean') return field.value ? '是' : '否';
  if (typeof field.value === 'number' && !Number.isFinite(field.value)) return '无法确定';
  if (field.source === 'filesystem' && ['file.createdAt', 'file.modifiedAt'].includes(field.key) &&
    typeof field.value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(field.value)) {
    const date = new Date(field.value);
    if (Number.isFinite(date.valueOf())) return `${dates.format(date)}（${localTimeZone}）`;
  }
  if (field.unit === 'byte' && typeof field.value === 'number') return formatBytes(field.value);
  const value = typeof field.value === 'number' ? numbers.format(field.value) : field.value;
  return field.unit ? `${value} ${unitLabels[field.unit] ?? field.unit}` : value;
}

export function categoryLabel(category: FileCategory): string {
  return ({ audio: '音频', video: '视频', image: '图片', office: 'Office 文档', other: '其他文件' })[category];
}

export function stateLabel(state: FileEntry['state']): string {
  return ({ waiting: '等待解析', processing: '解析中', done: '解析完成', partial: '部分解析', failed: '解析失败' })[state];
}

export function firstAudioStream(result: AnalysisResult): MediaStream | undefined {
  return result.streams.find(stream => stream.type === 'audio');
}

/** An attached cover is a video stream in FFprobe, but is not the video's picture track. */
export function firstVideoStream(result: AnalysisResult): MediaStream | undefined {
  return result.streams.find(stream => stream.type === 'video' &&
    stream.fields.find(field => field.key === 'stream.attachedPicture')?.value !== true);
}

const findField = (fields: MetadataField[], key: string) => fields.find(field => field.key === key);
const fromResult = (result: AnalysisResult, key: string) => formatField(findField(result.fields, key));
const fromStream = (stream: MediaStream | undefined, key: string) => formatField(stream && findField(stream.fields, key));

interface RowDefinition {
  key: string;
  label: string;
  categories?: FileCategory[];
  officeTypes?: string[];
  read(result: AnalysisResult): string;
}

const audioField = (key: string, label: string): RowDefinition => ({
  key, label: `${label}（首个音频轨道）`, categories: ['audio', 'video'],
  read: result => {
    const stream = firstAudioStream(result);
    return stream ? fromStream(stream, key) : result.streams.length ? '不适用' : '未记录';
  },
});

const officeField = (key: string, label: string, officeTypes: string[]): RowDefinition => ({
  key, label, categories: ['office'], officeTypes, read: result => fromResult(result, key),
});

const definitions: RowDefinition[] = [
  { key: 'file.name', label: '文件名', read: result => result.name },
  { key: 'file.type', label: '识别的文件类型', read: result => fromResult(result, 'file.type') },
  { key: 'file.category', label: '文件类别', read: result => categoryLabel(result.category) },
  { key: 'file.sizeBytes', label: '文件大小', read: result => fromResult(result, 'file.sizeBytes') },
  { key: 'file.createdAt', label: '文件系统创建时间', read: result => fromResult(result, 'file.createdAt') },
  { key: 'file.modifiedAt', label: '文件系统修改时间', read: result => fromResult(result, 'file.modifiedAt') },
  { key: 'media.duration', label: '文件时长', categories: ['audio', 'video'], read: result => fromResult(result, 'media.duration') },
  { key: 'media.bitRate', label: '文件总码率', categories: ['audio', 'video'], read: result => fromResult(result, 'media.bitRate') },
  { key: 'media.codec', label: '编码格式（首个视频轨道优先，否则首个音频轨道）', categories: ['audio', 'video'],
    read: result => fromStream(firstVideoStream(result) ?? firstAudioStream(result), 'stream.codec') },
  { key: 'image.width', label: '像素宽度（视频取首个视频轨道）', categories: ['image', 'video'],
    read: result => result.category === 'image' ? fromResult(result, 'image.width') : fromStream(firstVideoStream(result), 'video.width') },
  { key: 'image.height', label: '像素高度（视频取首个视频轨道）', categories: ['image', 'video'],
    read: result => result.category === 'image' ? fromResult(result, 'image.height') : fromStream(firstVideoStream(result), 'video.height') },
  { key: 'video.frameRate', label: '平均帧率（首个视频轨道）', categories: ['video'],
    read: result => fromStream(firstVideoStream(result), 'video.frameRate') },
  audioField('audio.sampleRate', '采样率'),
  audioField('audio.channels', '声道数'),
  audioField('audio.bitDepth', '音频位深'),
  audioField('audio.losslessEncoding', '编码是否无损'),
  { key: 'image.dpiX', label: '水平 DPI', categories: ['image'], read: result => fromResult(result, 'image.dpiX') },
  { key: 'image.dpiY', label: '垂直 DPI', categories: ['image'], read: result => fromResult(result, 'image.dpiY') },
  { key: 'image.bitDepth', label: '图片位深', categories: ['image'], read: result => fromResult(result, 'image.bitDepth') },
  { key: 'image.colorSpace', label: '图片色彩空间/模式', categories: ['image'], read: result => fromResult(result, 'image.colorSpace') },
  officeField('office.pageCount', '保存的页数（可能过时）', ['docx']),
  officeField('office.wordCount', '保存的字数（可能过时）', ['docx', 'pptx']),
  officeField('office.sheetCount', '工作表数量（含隐藏）', ['xlsx']),
  officeField('office.slideCount', '幻灯片数量', ['pptx']),
];

function isApplicable(definition: RowDefinition, result: AnalysisResult): boolean {
  if (definition.categories && !definition.categories.includes(result.category)) return false;
  const ext = result.detectedType.ext?.toLowerCase();
  // Known Office subtypes are decisive even when an unrelated saved property exists.
  return !definition.officeTypes || !ext || !['docx', 'xlsx', 'pptx'].includes(ext) || definition.officeTypes.includes(ext);
}

/** Every imported entry keeps its column; stream fields always come from one selected track. */
export function buildComparison(entries: FileEntry[]): { rows: ComparisonRow[] } {
  if (!entries.length) return { rows: [] };
  const availableResults = entries.flatMap(entry => entry.result && entry.result.status !== 'error' ? [entry.result] : []);
  const rows = definitions.filter(definition => !definition.categories || availableResults.some(result => isApplicable(definition, result)))
    .map(definition => ({
      key: definition.key,
      label: definition.label,
      values: entries.map(entry => {
        if (entry.state === 'waiting' || entry.state === 'processing') return stateLabel(entry.state);
        if (entry.state === 'failed' || entry.result?.status === 'error') return '解析失败';
        if (!entry.result) return '未记录';
        return isApplicable(definition, entry.result) ? definition.read(entry.result) : '不适用';
      }),
    }));
  return { rows };
}
