import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setImmediate, setTimeout } from 'node:timers/promises';
import { test } from 'node:test';
import type { DesktopEvent } from '../src/desktop/contracts.js';
import { DesktopJobs, WorkerAnalyzer } from '../src/desktop/job-manager.js';
import type { AnalysisResult } from '../src/types.js';

function result(path: string, status: AnalysisResult['status'] = 'ok'): AnalysisResult {
  return { path, name: path, category: 'other', status,
    detectedType: { ext: null, mime: null, category: 'other', source: 'unknown' },
    fields: [], streams: [], issues: [] };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: Error) => void } {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

test('注册按规范化绝对路径去重，注册时不启动分析', async () => {
  let calls = 0;
  const jobs = new DesktopJobs(async path => { calls++; return result(path); }, () => {});
  const path = resolve('fixture.txt');
  const added = jobs.register([path, resolve('nested', '..', 'fixture.txt')]);
  assert.equal(added.length, 1);
  assert.equal(added[0]?.path, path);
  assert.deepEqual(jobs.register([path]), added);
  await setImmediate();
  assert.equal(calls, 0);
  assert.throws(() => jobs.register(['relative.txt']), /绝对路径/);
  jobs.removeFiles([added[0]!.id]);
  const again = jobs.register([path]);
  assert.equal(again.length, 1);
  assert.notEqual(again[0]!.id, added[0]!.id);
  jobs.close();
});

test('串行分析与重复启动保护；一个任务失败不阻止下一个', async () => {
  const first = deferred<AnalysisResult>();
  const events: DesktopEvent[] = [];
  const calls: string[] = [];
  const jobs = new DesktopJobs(path => {
    calls.push(path);
    return calls.length === 1 ? first.promise : Promise.resolve(result(path));
  }, event => events.push(event));
  const entries = jobs.register([resolve('first.txt'), resolve('second.txt')]);
  const ids = entries.map(file => file.id);
  jobs.analyzeFiles(ids);
  jobs.analyzeFiles(ids);
  jobs.retryFile(ids[0]!);
  await setImmediate();
  assert.equal(calls.length, 1);
  assert.deepEqual(events.map(event => event.type), ['started']);
  first.reject(new Error('模拟线程失败'));
  await setImmediate();
  assert.equal(calls.length, 2);
  assert.deepEqual(events.map(event => event.type), ['started', 'failed', 'started', 'result']);
  assert.equal(events[1]?.type === 'failed' && events[1].message, '模拟线程失败');
  jobs.close();
});

test('同步分析异常也隔离到单个文件', async () => {
  const events: DesktopEvent[] = [];
  let count = 0;
  const jobs = new DesktopJobs(path => {
    if (++count === 1) throw new Error('同步失败');
    return Promise.resolve(result(path));
  }, event => events.push(event));
  jobs.analyzeFiles(jobs.register([resolve('a'), resolve('b')]).map(file => file.id));
  await setImmediate();
  assert.deepEqual(events.map(event => event.type), ['started', 'failed', 'started', 'result']);
  jobs.close();
});

test('移除运行中及等待中的文件后忽略旧响应，重新导入获得独立结果', async () => {
  const old = deferred<AnalysisResult>();
  const events: DesktopEvent[] = [];
  const calls: string[] = [];
  const path = resolve('same.txt');
  const jobs = new DesktopJobs(input => {
    calls.push(input);
    return calls.length === 1 ? old.promise : Promise.resolve(result(input));
  }, event => events.push(event));
  const first = jobs.register([path, resolve('removed-before-start.txt')]);
  jobs.analyzeFiles(first.map(file => file.id));
  await setImmediate();
  jobs.removeFiles(first.map(file => file.id));
  const [replacement] = jobs.register([path]);
  jobs.analyzeFiles([replacement!.id]);
  old.resolve(result(path));
  await setImmediate();
  assert.equal(calls.length, 2);
  assert.deepEqual(events.filter(event => event.type === 'result').map(event => event.id), [replacement!.id]);
  assert.equal(events.filter(event => event.id === first[1]!.id).length, 0);
  jobs.close();
});

test('只重试部分结果或失败任务；活动重试不会重复排队', async () => {
  const retried = deferred<AnalysisResult>();
  const events: DesktopEvent[] = [];
  let calls = 0;
  const jobs = new DesktopJobs(path => ++calls === 1 ? Promise.resolve(result(path, 'partial')) : retried.promise,
    event => events.push(event));
  const [entry] = jobs.register([resolve('partial.txt')]);
  jobs.analyzeFiles([entry!.id]);
  await setImmediate();
  jobs.retryFile(entry!.id);
  jobs.retryFile(entry!.id);
  jobs.analyzeFiles([entry!.id]);
  await setImmediate();
  assert.equal(calls, 2);
  retried.resolve(result(entry!.path));
  await setImmediate();
  jobs.retryFile(entry!.id);
  await setImmediate();
  assert.equal(calls, 2);
  assert.deepEqual(events.map(event => event.type), ['started', 'result', 'started', 'result']);
  jobs.close();
});

test('关闭会清空队列并丢弃活动结果', async () => {
  const pending = deferred<AnalysisResult>();
  const events: DesktopEvent[] = [];
  let calls = 0;
  const jobs = new DesktopJobs(() => { calls++; return pending.promise; }, event => events.push(event));
  jobs.analyzeFiles(jobs.register([resolve('a'), resolve('b')]).map(file => file.id));
  await setImmediate();
  jobs.close();
  pending.resolve(result(resolve('a')));
  await setImmediate();
  assert.equal(calls, 1);
  assert.deepEqual(events.map(event => event.type), ['started']);
  assert.deepEqual(jobs.register([resolve('c')]), []);
});

test('真实Worker在后台解析未知格式并返回文件错误，不依赖媒体工具', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'file-analyzer-desktop-worker-'));
  const analyzer = new WorkerAnalyzer();
  try {
    const path = join(dir, 'plain.txt');
    await writeFile(path, 'A small offline text fixture.');
    const analyzed = await analyzer.analyze(path);
    assert.equal(analyzed.status, 'ok');
    assert.equal(analyzed.category, 'other');
    assert.equal(analyzed.fields.find(field => field.key === 'file.name')?.value, 'plain.txt');
    const absent = await analyzer.analyze(join(dir, 'absent.bin'));
    assert.equal(absent.status, 'error');
    assert.equal(absent.issues[0]?.code, 'FILE_NOT_FOUND');
  } finally { await analyzer.close(); await rm(dir, { recursive: true, force: true }); }
});

test('Worker异常转为可重试失败；关闭后禁止新增分析', async () => {
  const analyzer = new WorkerAnalyzer({ timeoutMs: -1 });
  try {
    await assert.rejects(analyzer.analyze(resolve('unused.txt')), /timeoutMs/);
  } finally { await analyzer.close(); }
  await assert.rejects(analyzer.analyze(resolve('unused.txt')), /已关闭/);
});

test('关闭 Worker 会先杀死并回收忽略 SIGTERM 的解析工具，重复关闭共用同一任务',
  { skip: process.platform === 'win32', timeout: 10_000 }, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'file-analyzer-worker-child-'));
    const pidFile = join(dir, 'pid');
    const executable = join(dir, 'ffprobe.cjs');
    const audio = join(dir, 'audio.wav');
    const analyzer = new WorkerAnalyzer({ ffprobePath: executable, timeoutMs: 60_000 });
    let pid: number | undefined;
    let pending: Promise<void> | undefined;
    try {
      await writeFile(audio, 'The WAV suffix routes this damaged fixture to ffprobe.');
      await writeFile(executable, `#!${process.execPath}\nprocess.on('SIGTERM', () => {}); require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setInterval(() => {}, 1000);\n`, { mode: 0o700 });
      pending = assert.rejects(analyzer.analyze(audio), /已关闭/);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        try { pid = Number(await readFile(pidFile, 'utf8')); break; }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        await setTimeout(20);
      }
      assert.ok(pid, 'The real tool process must have started before shutdown.');
      process.kill(pid, 0);
      const closing = analyzer.close();
      assert.equal(analyzer.close(), closing);
      await closing;
      await pending;
      assert.throws(() => process.kill(pid!, 0), { code: 'ESRCH' });
    } finally {
      await analyzer.close();
      await pending;
      if (pid) { try { process.kill(pid, 'SIGKILL'); } catch {} }
      await rm(dir, { recursive: true, force: true });
    }
  });

test('刚创建 Worker 即关闭也等待退出，不允许延迟启动工具',
  { skip: process.platform === 'win32', timeout: 15_000 }, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'file-analyzer-worker-immediate-close-'));
    const audio = join(dir, 'audio.wav');
    const executable = join(dir, 'ffprobe.cjs');
    const marker = join(dir, 'unexpected-start');
    try {
      await writeFile(audio, 'The WAV suffix routes this damaged fixture to ffprobe.');
      await writeFile(executable, `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(marker)}, 'started'); setInterval(() => {}, 1000);\n`, { mode: 0o700 });
      for (let attempt = 0; attempt < 8; attempt++) {
        const analyzer = new WorkerAnalyzer({ ffprobePath: executable });
        const pending = assert.rejects(analyzer.analyze(audio), /已关闭/);
        await analyzer.close();
        await pending;
      }
      await assert.rejects(readFile(marker), { code: 'ENOENT' });
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
