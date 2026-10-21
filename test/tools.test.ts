import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { runTool, streamTool, toolPath, ToolError } from '../src/tools.js';

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

test('超时强制结束忽略 SIGTERM 的真实子进程，并等待其退出', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'file-analyzer-tool-timeout-'));
  const pidFile = join(dir, 'pid');
  let pid: number | undefined;
  try {
    const startedAt = Date.now();
    await assert.rejects(runTool('ffprobe', ['-e',
      `process.on('SIGTERM', () => {}); require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setTimeout(() => process.exit(0), 4000);`],
    { ffprobePath: process.execPath, timeoutMs: 1000 }),
    (error: unknown) => error instanceof ToolError && error.code === 'TOOL_TIMEOUT');
    assert.ok(Date.now() - startedAt < 2500, 'The timeout must kill the tool instead of waiting for its own exit.');
    pid = Number(await readFile(pidFile, 'utf8'));
    assert.throws(() => process.kill(pid!, 0), { code: 'ESRCH' });
  } finally {
    if (pid) { try { process.kill(pid, 'SIGKILL'); } catch {} }
    await rm(dir, { recursive: true, force: true });
  }
});

test('关闭 runner 封闭工具发现期间的启动竞态，并拒绝后续调用', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'file-analyzer-tool-shutdown-'));
  try {
    // A separate Node module instance keeps this one-way worker shutdown isolated from other tests.
    const script = `
      import assert from 'node:assert/strict';
      const { runTool, shutdownTools } = await import(${JSON.stringify(new URL('../src/tools.js', import.meta.url).href)});
      const options = { bundledToolsDir: ${JSON.stringify(dir)}, ffprobePath: process.execPath };
      const args = ['-e', 'process.exit(0)'];
      const starting = runTool('ffprobe', args, options);
      const stopping = shutdownTools();
      assert.equal(stopping, shutdownTools());
      await assert.rejects(starting, { code: 'TOOL_CANCELLED' });
      await stopping;
      await assert.rejects(runTool('ffprobe', args, options), { code: 'TOOL_CANCELLED' });
    `;
    await promisify(execFile)(process.execPath, ['--input-type=module', '-e', script]);
  } finally { await rm(dir, { recursive: true, force: true }); }
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

test('二进制流不受文本输出缓存限制，缺失工具仍返回明确错误', async () => {
  let bytes = 0;
  const output = await streamTool('ffmpeg', ['-e',
    'process.stdout.write(Buffer.alloc(17 * 1024 * 1024, 255)); process.stderr.write("done");'],
  chunk => { bytes += chunk.length; assert.ok(chunk.every(byte => byte === 255)); }, { ffmpegPath: process.execPath });
  assert.equal(bytes, 17 * 1024 * 1024);
  assert.equal(output.stderr, 'done');
  await assert.rejects(streamTool('ffmpeg', [], () => {}, { ffmpegPath: join(tmpdir(), 'missing-stream-ffmpeg') }),
    { code: 'TOOL_NOT_FOUND' });
});

test('流式工具超时和消费失败都回收真实进程，保留原始失败原因', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'stream-tool-stop-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const mode of ['timeout', 'consumer'] as const) {
    const pidFile = join(dir, mode);
    const failure = new Error('consumer stopped');
    await assert.rejects(streamTool('ffmpeg', ['-e',
      `require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); process.stdout.write('start'); setInterval(() => {}, 1000);`],
    () => { if (mode === 'consumer') throw failure; }, { ffmpegPath: process.execPath, timeoutMs: 1000 }),
    error => mode === 'consumer' ? error === failure : (error as ToolError).code === 'TOOL_TIMEOUT');
    const pid = Number(await readFile(pidFile, 'utf8'));
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  }
});

test('流式进程加入共享退出管理，关闭后拒绝再次启动', async () => {
  const script = `
    import assert from 'node:assert/strict';
    const { streamTool, shutdownTools } = await import(${JSON.stringify(new URL('../src/tools.js', import.meta.url).href)});
    let stop;
    const started = new Promise(resolve => { stop = resolve; });
    const running = streamTool('ffmpeg', ['-e', 'process.stdout.write("ready"); setInterval(() => {}, 1000);'],
      () => stop(), { ffmpegPath: process.execPath });
    const stopped = assert.rejects(running, { code: 'TOOL_CANCELLED' });
    await started;
    await shutdownTools();
    await stopped;
    await assert.rejects(streamTool('ffmpeg', [], () => {}, { ffmpegPath: process.execPath }), { code: 'TOOL_CANCELLED' });
  `;
  await promisify(execFile)(process.execPath, ['--input-type=module', '-e', script]);
});
