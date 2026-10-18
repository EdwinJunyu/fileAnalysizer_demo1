import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { analyzeFile, analyzeFiles, InvalidOptionsError } from '../src/index.js';
import { detectType } from '../src/detect.js';
import { extractOffice } from '../src/office.js';
import { DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS, validateTimeout } from '../src/options.js';
import { runTool } from '../src/tools.js';

test('无效超时在公共API、内容识别和工具执行前统一拒绝', async t => {
  const invalid = [0, -1, 0.5, NaN, Infinity, MAX_TIMEOUT_MS + 1, Number.MAX_SAFE_INTEGER];
  const reject = (error: unknown) => error instanceof InvalidOptionsError && error.code === 'INVALID_OPTIONS';
  for (const timeoutMs of invalid) {
    await t.test(String(timeoutMs), async () => {
      assert.throws(() => validateTimeout(timeoutMs), reject);
      // Nonexistent files make sure option errors cannot turn into detection/file errors.
      await assert.rejects(analyzeFile('absent.wav', { timeoutMs }), reject);
      await assert.rejects(analyzeFile('absent.unknown', { timeoutMs }), reject);
      await assert.rejects(analyzeFiles([], { timeoutMs }), reject);
      await assert.rejects(detectType('absent.wav', timeoutMs), reject);
      await assert.rejects(extractOffice('absent.xlsx', 'xlsx', { timeoutMs }), reject);
      await assert.rejects(runTool('ffprobe', [], { ffprobePath: 'absent-ffprobe', timeoutMs }), reject);
    });
  }
});

test('默认值和有效超时边界不会被夹成1毫秒', async () => {
  assert.equal(validateTimeout(undefined), DEFAULT_TIMEOUT_MS);
  assert.equal(validateTimeout(1), 1);
  assert.equal(validateTimeout(MAX_TIMEOUT_MS), MAX_TIMEOUT_MS);
  const output = await runTool('ffprobe', ['-e', 'setTimeout(() => process.stdout.write("ok"), 25)'],
    { ffprobePath: process.execPath, timeoutMs: MAX_TIMEOUT_MS });
  assert.equal(output.stdout, 'ok');
  const dir = await mkdtemp(join(tmpdir(), 'file-analyzer-options-'));
  try {
    const file = join(dir, 'valid.unknown');
    await writeFile(file, 'test');
    const result = await analyzeFile(file, { timeoutMs: MAX_TIMEOUT_MS });
    assert.equal(result.status, 'ok');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
