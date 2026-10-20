import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectPrivacy } from '../src/privacy.js';
import { field } from '../src/fields.js';
import type { AnalysisResult } from '../src/types.js';

const sample = (overrides: Partial<AnalysisResult> = {}): AnalysisResult => ({
  path: '/local/Personal Name.jpg', name: 'Personal Name.jpg', category: 'image', status: 'ok',
  detectedType: { ext: 'jpg', mime: 'image/jpeg', category: 'image', source: 'signature' },
  fields: [], streams: [], issues: [], rawMetadata: { 'File:FileType': 'JPEG' }, ...overrides,
});

test('隐私检查保留零坐标、作者、设备标识及各自来源，忽略系统路径', () => {
  const report = inspectPrivacy(sample({ rawMetadata: {
    'File:FileType': 'JPEG', 'System:Directory': '/home/Person', 'System:FileName': 'Person.jpg',
    'GPS:GPSLatitude': 0, 'GPS:GPSLongitude': 12.34, 'IFD0:Artist': 'Public Photographer',
    'ExifIFD:BodySerialNumber': 'PUBLIC-123', 'XMP-dc:Creator': ['One', 'Two'],
  } }));
  assert.equal(report.status, 'checked');
  assert.equal(report.findings.length, 5);
  assert.ok(report.findings.some(item => item.value === '0' && item.source === 'ExifTool: GPS:GPSLatitude'));
  assert.ok(report.findings.some(item => item.kind === 'device' && item.value === 'PUBLIC-123'));
  assert.ok(!report.findings.some(item => item.source.startsWith('ExifTool: System:')));
});

test('PDF 创建应用不误当个人，作者字段在两条路径下不会重复展示', () => {
  const result = sample({ category: 'pdf', rawMetadata: {
    'File:FileType': 'PDF', 'PDF:Creator': 'Public PDF App', 'PDF:Author': 'Public Author',
  }, fields: [field('pdf.author', '作者', 'Public Author', 'ExifTool: PDF:Author')] });
  const report = inspectPrivacy(result);
  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0]!.value, 'Public Author');
});

test('空检查、工具失败和未支持的格式保持不同状态', () => {
  assert.equal(inspectPrivacy(sample()).status, 'checked');
  assert.equal(inspectPrivacy(sample({ rawMetadata: {}, status: 'partial' })).status, 'unavailable');
  assert.equal(inspectPrivacy(sample({ category: 'other' })).status, 'unsupported');
  const checked = inspectPrivacy(sample());
  assert.equal(checked.findings.length, 0);
  assert.match(checked.limitations[0]!, /未发现记录不代表文件不含隐私/);
});

test('Office 工具降级仍展示结构读取的作者，并明确检查不完整', () => {
  const report = inspectPrivacy(sample({ category: 'office', status: 'partial', rawMetadata: { 'OOXML: docProps/core.xml': {} },
    fields: [field('office.creator', '作者', 'Public Office Author', 'OOXML: docProps/core.xml/creator')] }));
  assert.equal(report.status, 'partial');
  assert.equal(report.findings[0]!.value, 'Public Office Author');
});

test('音视频位置及署名按文件和轨道标签检查，编码器不作为个人', () => {
  const report = inspectPrivacy(sample({ category: 'video', rawMetadata: {
    format: { tags: { 'com.apple.quicktime.location.ISO6709': '+00.0+012.3/', encoder: 'Lavf' } },
    streams: [{ tags: { artist: 'Public Artist' } }],
  } }));
  assert.equal(report.findings.length, 2);
  assert.equal(report.findings[1]!.source, 'ffprobe.streams[0].tags.artist');
});

test('QuickTime 作者和设备标签保留分类、标签来源，不泛化未知命名空间或软件标签', () => {
  const report = inspectPrivacy(sample({ category: 'video', rawMetadata: {
    format: { tags: { 'com.apple.quicktime.author': 'Public Author', 'com.apple.quicktime.make': 'Apple',
      'com.apple.quicktime.model': 'iPhone 15 Pro', 'com.apple.quicktime.software': 'Public Software',
      'unrecognized.author': 'Unknown Author' } },
    streams: [{ tags: { 'com.apple.quicktime.author': 'Track Author' } }],
  } }));
  assert.equal(report.status, 'checked');
  assert.deepEqual(report.findings.map(({ label, kind, value, source }) => ({ label, kind, value, source })), [
    { label: '作者', kind: 'identity', value: 'Public Author', source: 'ffprobe.format.tags.com.apple.quicktime.author' },
    { label: '设备品牌', kind: 'device', value: 'Apple', source: 'ffprobe.format.tags.com.apple.quicktime.make' },
    { label: '设备型号', kind: 'device', value: 'iPhone 15 Pro', source: 'ffprobe.format.tags.com.apple.quicktime.model' },
    { label: '作者', kind: 'identity', value: 'Track Author', source: 'ffprobe.streams[0].tags.com.apple.quicktime.author' },
  ]);
});

test('长值或过多字段显式限制，不遍历任意深度的元数据', () => {
  const raw: Record<string, unknown> = { 'File:FileType': 'JPEG', 'XMP-dc:Creator': 'A'.repeat(3000) };
  for (let index = 0; index < 105; index++) raw[`IFD${index}:Artist`] = `Public ${index}`;
  raw['XMP:GPSLatitude'] = { nested: { malicious: 'not a scalar' } };
  const report = inspectPrivacy(sample({ rawMetadata: raw }));
  assert.equal(report.findings.length, 100);
  assert.equal(report.status, 'partial');
  assert.match(report.findings[0]!.note!, /截断/);
});
