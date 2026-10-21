import assert from 'node:assert/strict';
import test from 'node:test';
import { SpectrumOverview } from '../src/spectrum-overview.js';

test('流式时间归并保留首、中、尾信号，任意字节分块不改变图像', () => {
  const columns = Buffer.alloc(64 * 3);
  columns.set([255, 0, 0], 0);
  columns.set([0, 255, 0], 32 * 3);
  columns.set([0, 0, 255], 63 * 3);
  const whole = new SpectrumOverview(4, 1, 1);
  whole.push(columns);
  const split = new SpectrumOverview(4, 1, 1);
  for (const byte of columns) split.push(Buffer.from([byte]));
  const expected = Buffer.from([255, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 255]);
  assert.deepEqual(whole.image(64), expected);
  assert.deepEqual(split.image(64), expected);
});

test('频率行顺序保留，短音轨铺满宽度；未完成的列不能输出成功结果', () => {
  const overview = new SpectrumOverview(4, 2, 1);
  assert.throws(() => overview.image(1));
  overview.push(Buffer.from([255, 0, 0, 0, 0]));
  assert.throws(() => overview.image(1));
  overview.push(Buffer.from([255]));
  assert.deepEqual(overview.image(1), Buffer.from([
    255, 0, 0, 255, 0, 0, 255, 0, 0, 255, 0, 0,
    0, 0, 255, 0, 0, 255, 0, 0, 255, 0, 0, 255,
  ]));
});

test('不足一窗的尾段按实际样本时长定位，样本计数不符时拒绝图像', () => {
  const overview = new SpectrumOverview(8, 1, 4);
  overview.push(Buffer.from([0, 0, 0, 255, 0, 0]));
  // The tail contains only one sample, so it occupies 1/5 rather than 1/2.
  assert.deepEqual(overview.image(5), Buffer.from([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 255, 0, 0, 255, 0, 0,
  ]));
  for (const samples of [0, -1, NaN, Infinity, 4, 9]) assert.throws(() => overview.image(samples));
});
