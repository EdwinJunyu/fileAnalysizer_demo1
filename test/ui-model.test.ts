import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { field } from '../src/fields.js';
import type { AnalysisResult, FileCategory, MediaStream, MetadataField } from '../src/types.js';
import { buildComparison, categoryLabel, comparisonEntries, reorderComparisonColumns, firstAudioStream, firstVideoStream, formatBytes, formatField,
  stateLabel, type FileEntry } from '../src/ui/model.js';

function result(category: FileCategory, fields: MetadataField[] = [], streams: MediaStream[] = [], ext: string = category): AnalysisResult {
  return { path: `/sample.${ext}`, name: `sample.${ext}`, category, status: 'ok',
    detectedType: { category, ext, mime: null, source: 'signature' }, fields, streams, issues: [] };
}

function entry(value: AnalysisResult, state: FileEntry['state'] = 'done'): FileEntry {
  return { id: value.path, path: value.path, name: value.name, state, result: value };
}

const stream = (index: number, type: string, fields: MetadataField[]): MediaStream => ({ index, type, fields });
const mediaField = (key: string, value: string | number | boolean | null, unit?: string) => field(key, key, value, 'ffprobe', unit);

function values(entries: FileEntry[], key: string): string[] {
  const row = buildComparison(entries).rows.find(row => row.key === key);
  assert.ok(row, `Missing comparison row: ${key}`);
  return row.values;
}

test('comparison columns move before/after neighbors without changing the file list', () => {
  const order = ['audio', 'image', 'office', 'pdf'];
  assert.deepEqual(reorderComparisonColumns(order, 'audio', 'office', 'after'), ['image', 'office', 'audio', 'pdf']);
  assert.deepEqual(reorderComparisonColumns(order, 'pdf', 'image', 'before'), ['audio', 'pdf', 'image', 'office']);
  assert.deepEqual(reorderComparisonColumns(order, 'image', 'audio', 'before'), ['image', 'audio', 'office', 'pdf']);
  assert.deepEqual(order, ['audio', 'image', 'office', 'pdf']);
  assert.deepEqual(reorderComparisonColumns(order, 'missing', 'image', 'after'), order);
  assert.deepEqual(reorderComparisonColumns(order, 'audio', 'missing', 'before'), order);
  assert.deepEqual(reorderComparisonColumns(order, 'audio', 'audio', 'after'), order);
});

test('comparison order prunes removed IDs, appends new files and keeps values aligned', () => {
  const audio = entry(result('audio', [mediaField('file.type', 'wav')]));
  const image = entry(result('image', [mediaField('file.type', 'png')]));
  const office = entry(result('office', [mediaField('file.type', 'docx')]));
  const files = [audio, image, office];
  const sorted = comparisonEntries(files, ['removed', image.id, image.id, audio.id]);
  assert.deepEqual(sorted, [image, audio, office]);
  assert.deepEqual(values(sorted, 'file.type'), ['png', 'wav', 'docx']);
  assert.deepEqual(files, [audio, image, office]);
  assert.deepEqual(comparisonEntries([office], [audio.id, image.id, office.id]), [office]);
  assert.deepEqual(comparisonEntries([], [audio.id]), []);
});

test('field formatting preserves zero and false, and distinguishes every unavailable status', () => {
  assert.equal(formatField(undefined), '未记录');
  assert.equal(formatField(field('x', 'x', null, 'tool')), '未记录');
  assert.equal(formatField(field('x', 'x', null, 'tool', undefined, undefined, 'not_applicable')), '不适用');
  assert.equal(formatField(field('x', 'x', null, 'tool', undefined, undefined, 'unknown')), '无法确定');
  assert.equal(formatField(field('x', 'x', null, 'tool', undefined, undefined, 'error')), '解析错误');
  assert.equal(formatField(field('x', 'x', 0, 'tool', 's')), '0 s');
  assert.equal(formatField(field('x', 'x', false, 'tool')), '否');
  assert.equal(formatField(field('x', 'x', true, 'tool')), '是');
  assert.equal(formatField(field('x', 'x', 48_000, 'tool', 'Hz')), '48,000 Hz');
  assert.equal(formatField(field('x', 'x', 1e-8, 'tool', 's')), '0.00000001 s');
});

test('byte display uses binary units and retains the precise byte count', () => {
  assert.equal(formatBytes(0), '0 byte');
  assert.equal(formatBytes(1023), '1,023 byte');
  assert.equal(formatBytes(1536), '1.5 KiB（1,536 byte）');
  assert.equal(formatField(field('file.sizeBytes', '文件大小', 1_048_577, 'filesystem', 'byte')),
    '1 MiB（1,048,577 byte）');
});

test('only filesystem ISO dates become explicitly zoned local time', () => {
  const iso = '2024-01-02T03:04:05.000Z';
  const expected = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23', timeZoneName: 'shortOffset',
  }).format(new Date(iso));
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  assert.equal(formatField(field('file.createdAt', '创建时间', iso, 'filesystem')), `${expected}（${zone}）`);
  assert.equal(formatField(field('office.createdAt', '文档创建时间', iso, 'OOXML: docProps/core.xml/created')), iso);
  assert.equal(formatField(field('office.createdAt', '文档创建时间', '2024:01:02 03:04:05Z', 'ExifTool')), '2024:01:02 03:04:05Z');
  assert.equal(formatField(field('file.createdAt', '创建时间', '2024-99-99T03:04:05Z', 'filesystem')), '2024-99-99T03:04:05Z');
});

test('mixed categories use not applicable while missing applicable parameters stay unrecorded', () => {
  const audio = result('audio', [mediaField('media.duration', 0, 's')], [
    stream(0, 'audio', [mediaField('stream.codec', 'flac'), mediaField('audio.sampleRate', 44_100, 'Hz')]),
  ]);
  const image = result('image', [field('image.width', '宽度', 800, 'ExifTool', 'px'),
    field('image.dpiX', '水平 DPI', null, 'ExifTool', 'dpi')]);
  const files = [entry(audio), entry(image)];
  assert.deepEqual(values(files, 'media.duration'), ['0 s', '不适用']);
  assert.deepEqual(values(files, 'media.bitRate'), ['未记录', '不适用']);
  assert.deepEqual(values(files, 'audio.sampleRate'), ['44,100 Hz', '不适用']);
  assert.deepEqual(values(files, 'image.width'), ['不适用', '800 px']);
  assert.deepEqual(values(files, 'image.dpiX'), ['不适用', '未记录']);
});

test('all imported files keep their columns during waiting, processing and failure', () => {
  const complete = entry(result('image', [field('image.width', '宽度', 42, 'ExifTool', 'px')]));
  const waiting: FileEntry = { id: 'wait', path: '/wait', name: 'wait', state: 'waiting' };
  const processing: FileEntry = { id: 'busy', path: '/busy', name: 'busy', state: 'processing' };
  const failed: FileEntry = { id: 'fail', path: '/fail', name: 'fail', state: 'failed', message: 'unreadable' };
  assert.deepEqual(values([complete, waiting, processing, failed], 'image.width'),
    ['42 px', '等待解析', '解析中', '解析失败']);
  const failedResult = result('other');
  failedResult.status = 'error';
  assert.deepEqual(values([entry(failedResult)], 'file.sizeBytes'), ['解析失败']);
});

test('stream comparison excludes covers and never combines different tracks or sorts by stream index', () => {
  const cover = stream(0, 'video', [mediaField('stream.codec', 'mjpeg'), mediaField('stream.attachedPicture', true),
    mediaField('video.width', 600, 'px')]);
  const firstAudio = stream(7, 'audio', [mediaField('stream.codec', 'aac'), mediaField('audio.sampleRate', 48_000, 'Hz')]);
  const firstVideo = stream(5, 'video', [mediaField('stream.codec', 'h264'), mediaField('video.height', 1080, 'px')]);
  const secondVideo = stream(1, 'video', [mediaField('stream.codec', 'hevc'), mediaField('video.width', 3840, 'px')]);
  const secondAudio = stream(2, 'audio', [mediaField('stream.codec', 'flac'), mediaField('audio.bitDepth', 24, 'bit')]);
  const video = result('video', [], [cover, firstAudio, firstVideo, secondVideo, secondAudio]);
  assert.equal(firstVideoStream(video), firstVideo);
  assert.equal(firstAudioStream(video), firstAudio);
  const files = [entry(video)];
  assert.deepEqual(values(files, 'media.codec'), ['h264']);
  assert.deepEqual(values(files, 'image.width'), ['未记录']);
  assert.deepEqual(values(files, 'image.height'), ['1,080 px']);
  assert.deepEqual(values(files, 'audio.sampleRate'), ['48,000 Hz']);
  assert.deepEqual(values(files, 'audio.bitDepth'), ['未记录']);
  assert.match(buildComparison(files).rows.find(row => row.key === 'media.codec')!.label, /首个视频轨道/);
  assert.match(buildComparison(files).rows.find(row => row.key === 'audio.sampleRate')!.label, /首个音频轨道/);
});

test('audio with cover artwork compares its audio codec, and silent video has no applicable audio properties', () => {
  const cover = stream(0, 'video', [mediaField('stream.attachedPicture', true), mediaField('stream.codec', 'mjpeg')]);
  const audio = result('audio', [], [cover, stream(1, 'audio', [mediaField('stream.codec', 'flac')])]);
  const silent = result('video', [], [stream(0, 'video', [mediaField('stream.codec', 'vp9')])]);
  const missingTools = result('video');
  missingTools.status = 'partial';
  assert.deepEqual(values([entry(audio), entry(silent), entry(missingTools, 'partial')], 'media.codec'), ['flac', 'vp9', '未记录']);
  assert.deepEqual(values([entry(audio), entry(silent), entry(missingTools, 'partial')], 'audio.sampleRate'), ['未记录', '不适用', '未记录']);
});

test('Office counts honor document subtype even if irrelevant saved properties are present', () => {
  const docx = result('office', [field('office.wordCount', '保存的字数', 0, 'OOXML', 'words')], [], 'docx');
  const xlsx = result('office', [field('office.sheetCount', '工作表数量', 3, 'OOXML', 'sheets'),
    field('office.pageCount', '保存的页数', 5, 'OOXML', 'pages')], [], 'xlsx');
  const pptx = result('office', [field('office.slideCount', '幻灯片数量', 2, 'OOXML', 'slides')], [], 'pptx');
  const files = [entry(docx), entry(xlsx), entry(pptx), entry(result('other'))];
  assert.deepEqual(values(files, 'office.pageCount'), ['未记录', '不适用', '不适用', '不适用']);
  assert.deepEqual(values(files, 'office.wordCount'), ['0 词', '不适用', '未记录', '不适用']);
  assert.deepEqual(values(files, 'office.sheetCount'), ['不适用', '3 张', '不适用', '不适用']);
  assert.deepEqual(values(files, 'office.slideCount'), ['不适用', '不适用', '2 张', '不适用']);
});

test('partial metadata remains comparable and does not overwrite error or unknown field states', () => {
  const partial = result('image', [field('image.width', '宽度', 80, 'ExifTool', 'px'),
    field('image.dpiX', 'DPI', null, 'ExifTool', 'dpi', 'conflict', 'unknown'),
    field('image.dpiY', 'DPI', null, 'ExifTool', 'dpi', 'invalid', 'error')]);
  partial.status = 'partial';
  const files = [entry(partial, 'partial')];
  assert.deepEqual(values(files, 'image.width'), ['80 px']);
  assert.deepEqual(values(files, 'image.dpiX'), ['无法确定']);
  assert.deepEqual(values(files, 'image.dpiY'), ['解析错误']);
});

test('empty comparison has no rows and shared labels use explicit Chinese text', () => {
  assert.deepEqual(buildComparison([]), { rows: [] });
  assert.equal(categoryLabel('office'), 'Office 文档');
  assert.equal(stateLabel('partial'), '部分解析');
  assert.equal(stateLabel('waiting'), '等待解析');
});
