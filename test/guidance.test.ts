import test from 'node:test';
import assert from 'node:assert/strict';
import { parameterExplanation, pcmEstimate, positiveField, printDimensions } from '../src/ui/guidance.js';
import type { MediaStream, MetadataField } from '../src/types.js';

const field = (key: string, value: MetadataField['value'], status: MetadataField['status'] = 'present'): MetadataField =>
  ({ key, value, status, label: key, source: 'fixture' });
const audio = (fields: MetadataField[]): MediaStream => ({ index: 3, type: 'audio', fields });
const pcmFields = [
  field('audio.sampleRate', 44100), field('audio.bitDepth', 16), field('audio.channels', 2),
];

test('打印尺寸使用明确的目标密度，保留方向并支持小数', () => {
  assert.deepEqual(printDimensions(3000, 2000, '300'), { widthCm: 25.4, heightCm: 2000 / 300 * 2.54, dpi: 300 });
  assert.deepEqual(printDimensions(2000, 3000, ' 150.5 '),
    { widthCm: 2000 / 150.5 * 2.54, heightCm: 3000 / 150.5 * 2.54, dpi: 150.5 });
  const tiny = printDimensions(1, 1, '9600');
  assert.ok('widthCm' in tiny && tiny.widthCm > 0);
});

test('目标 DPI 与像素尺寸分别校验，错误不变成默认值或零', () => {
  for (const dpi of ['', ' ', '0', '-1', '9601', 'Infinity', 'NaN', '300px', '1e2', '0x100', '1,000', '1.2.3']) {
    const result = printDimensions(3000, 2000, dpi);
    assert.ok('error' in result && result.invalidDpi, dpi);
  }
  for (const width of [undefined, 0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const result = printDimensions(width, 2000, '300');
    assert.ok('error' in result && !result.invalidDpi);
  }
});

test('计算只接受 present 状态的有限正数，保留数据状态的含义', () => {
  for (const status of ['missing', 'unknown', 'error', 'not_applicable'] as const) {
    assert.equal(positiveField([field('image.width', 3000, status)], 'image.width'), undefined);
  }
  for (const value of [null, '3000', false, 0, -1, Infinity, NaN]) {
    assert.equal(positiveField([field('image.width', value)], 'image.width'), undefined);
  }
  assert.equal(positiveField([field('image.width', 3000)], 'image.width'), 3000);
});

test('CD 规格立体声 PCM 每分钟 10584000 字节，总量仅用本轨道时长', () => {
  assert.deepEqual(pcmEstimate(audio([...pcmFields, field('stream.duration', 90)])),
    { bitRate: 1411200, bytesPerMinute: 10584000, totalBytes: 15876000, duration: 90 });
  assert.deepEqual(pcmEstimate(audio([...pcmFields, field('media.duration', 3600)])),
    { bitRate: 1411200, bytesPerMinute: 10584000 });
});

test('PCM 估算拒绝不适用位深和溢出，不混用其他轨道参数', () => {
  for (const status of ['missing', 'not_applicable', 'unknown', 'error'] as const) {
    assert.ok('error' in pcmEstimate(audio([...pcmFields.slice(0, 1),
      field('audio.bitDepth', 16, status), pcmFields[2]!])));
  }
  assert.ok('error' in pcmEstimate(audio(pcmFields.slice(0, 2))));
  assert.ok('error' in pcmEstimate({ index: 0, type: 'video', fields: pcmFields }));
  assert.ok('error' in pcmEstimate(audio([field('audio.sampleRate', Number.MAX_SAFE_INTEGER), ...pcmFields.slice(1)])));
  const estimate = pcmEstimate(audio([...pcmFields, field('stream.duration', 1e30)]));
  assert.ok(!('error' in estimate) && estimate.totalBytes === undefined);
});

test('详情和对比的编码解释保持一致，未知字段不编造解释', () => {
  assert.equal(parameterExplanation('media.codec'), parameterExplanation('stream.codec'));
  assert.match(parameterExplanation('audio.losslessEncoding')!, /无法证明/);
  assert.match(parameterExplanation('image.dpiX')!, /不假设为 72/);
  assert.equal(parameterExplanation('unknown.parameter'), undefined);
  assert.equal(parameterExplanation('__proto__'), undefined);
});
