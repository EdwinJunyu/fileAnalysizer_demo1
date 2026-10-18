import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { runTool, toolPath, ToolError } from '../src/tools.js';

test('随包工具优先；缺少随包文件时使用配置的路径', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'file-analyzer-tools-'));
  try {
    const options = { bundledToolsDir: dir, ffprobePath: process.execPath };
    assert.equal(await toolPath('ffprobe', options), process.execPath);
    const bundled = join(dir, `ffprobe${process.platform === 'win32' ? '.exe' : ''}`);
    await writeFile(bundled, 'placeholder used only to test path selection');
    assert.equal(await toolPath('ffprobe', options), bundled);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('配置路径错误时不悄悄使用PATH中的另一工具', async () => {
  await assert.rejects(runTool('ffprobe', [], { ffprobePath: join(tmpdir(), 'absent-file-analyzer-ffprobe') }),
    (error: unknown) => error instanceof ToolError && error.code === 'TOOL_NOT_FOUND');
});

test('工具调用超时能终止进程并返回明确错误', async () => {
  await assert.rejects(runTool('ffprobe', ['-e', 'setTimeout(() => {}, 10000)'],
    { ffprobePath: process.execPath, timeoutMs: 30 }),
    (error: unknown) => error instanceof ToolError && error.code === 'TOOL_TIMEOUT');
});

test('输出过大与超时错误分别报告', async () => {
  await assert.rejects(runTool('ffprobe', ['-e', 'process.stdout.write("x".repeat(17 * 1024 * 1024))'],
    { ffprobePath: process.execPath }),
    (error: unknown) => error instanceof ToolError && error.code === 'TOOL_OUTPUT_LIMIT');
});

test('成功退出时仍保留标准错误诊断', async () => {
  const output = await runTool('ffprobe', ['-e',
    'process.stdout.write("metadata"); process.stderr.write("parse diagnostic")'], { ffprobePath: process.execPath });
  assert.equal(output.stdout, 'metadata');
  assert.equal(output.stderr, 'parse diagnostic');
});
