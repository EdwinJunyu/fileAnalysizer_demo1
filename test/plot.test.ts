import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { plotTicks, plotTime } from '../src/ui/plot.js';
import { setLocale } from '../src/i18n/index.js';

afterEach(() => setLocale('zh-CN'));

test('线性坐标保留实际终点，末端刻度不挤在一起', () => {
  assert.deepEqual(plotTicks(48000, 5), [0, 10000, 20000, 30000, 40000, 48000]);
  assert.deepEqual(plotTicks(22050, 5), [0, 5000, 10000, 15000, 22050]);
  for (const maximum of [0.06, 0.6, 1, 252, 3599.8, 100000]) {
    const ticks = plotTicks(maximum, 8);
    assert.equal(ticks[0], 0);
    assert.equal(ticks.at(-1), maximum);
    assert.ok(ticks.length >= 3 && ticks.length <= 10);
    for (let index = 1; index < ticks.length; index++) assert.ok(ticks[index]! > ticks[index - 1]!);
    assert.ok(ticks.at(-1)! - ticks.at(-2)! >= (ticks[1]! - ticks[0]!) * 0.55);
  }
  for (const maximum of [undefined, 0, -1, Infinity, NaN]) assert.deepEqual(plotTicks(maximum, 8), []);
});

test('相对时间保留短音轨小数秒并按语言格式显示，进位不会出现 0:60', () => {
  assert.equal(plotTime(0, 252), '0:00');
  assert.equal(plotTime(252, 252), '4:12');
  assert.equal(plotTime(3599.8, 3599.8), '60:00');
  assert.equal(plotTime(0.6, 0.6), '0:00.6');
  assert.equal(plotTime(0.01, 0.1), '0:00.01');
  assert.equal(plotTime(0.001, 0.006), '0:00.001');
  setLocale('fr-FR');
  assert.equal(plotTime(0.6, 0.6), '0:00,6');
});
