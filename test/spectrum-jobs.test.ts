import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setImmediate, setTimeout } from 'node:timers/promises';
import { test } from 'node:test';
import { DesktopJobs, WorkerAnalyzer, type SpectrumWorker } from '../src/desktop/job-manager.js';
import type { AnalysisResult, SpectrogramResult } from '../src/types.js';

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: Error) => void } {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function result(path: string, status: AnalysisResult['status'] = 'ok'): AnalysisResult {
  return { path, name: path, category: 'video', status,
    detectedType: { ext: 'mkv', mime: 'video/x-matroska', category: 'video', source: 'signature' },
    fields: [], streams: [{ index: 0, type: 'video', fields: [] },
      { index: 2, type: 'audio', fields: [] }, { index: 4, type: 'audio', fields: [] }], issues: [] };
}
const image: SpectrogramResult = {
  imageDataUrl: 'data:image/png;base64,cG5n', streamIndex: 2, width: 1200, height: 512,
  sampleRateHz: 48000, durationSeconds: 1, channels: 2,
};

class FakeWorker implements SpectrumWorker {
  readonly pending = deferred<SpectrogramResult>();
  calls: { path: string; streamIndex: number }[] = [];
  closes = 0;
  cancelOnClose = true;
  cleanup: Promise<void> = Promise.resolve();
  generateSpectrogram(path: string, streamIndex: number): Promise<SpectrogramResult> {
    this.calls.push({ path, streamIndex });
    return this.pending.promise;
  }
  close(): Promise<void> {
    this.closes++;
    if (this.cancelOnClose && this.calls.length) this.pending.reject(new Error('worker closed'));
    return this.cleanup;
  }
}

async function fixture(status: AnalysisResult['status'] = 'ok'): Promise<{
  jobs: DesktopJobs; workers: FakeWorker[]; first: string; second: string; path: string;
}> {
  const workers: FakeWorker[] = [];
  const jobs = new DesktopJobs(async path => result(path, status), () => {}, () => {
    const worker = new FakeWorker(); workers.push(worker); return worker;
  });
  const path = resolve('audio-video.mkv');
  const entries = jobs.register([path, resolve('second.mkv')]);
  jobs.analyzeFiles(entries.map(entry => entry.id));
  await setImmediate();
  return { jobs, workers, first: entries[0]!.id, second: entries[1]!.id, path };
}

test('频谱只接受已完成分析的注册文件和实际音轨索引，不能绕过文件注册访问路径', async () => {
  const pending = deferred<AnalysisResult>();
  let starts = 0;
  const jobs = new DesktopJobs(() => pending.promise, () => {}, () => { starts++; return new FakeWorker(); });
  const [entry] = jobs.register([resolve('media.mkv')]);
  try {
    await assert.rejects(jobs.generateSpectrogram(resolve('arbitrary.wav'), 2), /重新添加/);
    await assert.rejects(jobs.generateSpectrogram(entry!.id, 2), /先完成/);
    jobs.analyzeFiles([entry!.id]);
    await setImmediate();
    await assert.rejects(jobs.generateSpectrogram(entry!.id, 2), /先完成/);
    pending.resolve(result(entry!.path));
    await setImmediate();
    for (const index of [0, 1, -1, 2.5, NaN, Infinity]) {
      await assert.rejects(jobs.generateSpectrogram(entry!.id, index), /有效的音轨/);
    }
    assert.equal(starts, 0);
  } finally { await jobs.close(); }
});

test('相同频谱请求去重，全局只生成一个频谱，完成后回收worker并释放生成槽位', async () => {
  const { jobs, workers, first, second, path } = await fixture();
  try {
    const pending = jobs.generateSpectrogram(first, 2);
    assert.equal(jobs.generateSpectrogram(first, 2), pending);
    await assert.rejects(jobs.generateSpectrogram(first, 4), /另一个频谱/);
    await assert.rejects(jobs.generateSpectrogram(second, 2), /另一个频谱/);
    await setImmediate();
    assert.equal(workers.length, 1);
    assert.deepEqual(workers[0]!.calls, [{ path, streamIndex: 2 }]);
    workers[0]!.pending.resolve(image);
    assert.deepEqual(await pending, image);
    assert.ok(workers[0]!.closes > 0);
    const next = jobs.generateSpectrogram(second, 4);
    workers[1]!.pending.resolve({ ...image, streamIndex: 4 });
    assert.equal((await next).streamIndex, 4);
  } finally { await jobs.close(); }
});

test('取消等待进程清理完成才释放全局槽位，其他文件的取消不影响当前任务', async () => {
  const { jobs, workers, first, second } = await fixture();
  try {
    const pending = jobs.generateSpectrogram(first, 2);
    const rejection = assert.rejects(pending, /频谱生成已取消/);
    await setImmediate();
    const cleanup = deferred<void>();
    workers[0]!.cleanup = cleanup.promise;
    await jobs.cancelSpectrogram(second);
    assert.equal(workers[0]!.closes, 0);
    let completed = false;
    const cancellation = jobs.cancelSpectrogram(first).then(() => { completed = true; });
    await setImmediate();
    assert.equal(completed, false);
    await assert.rejects(jobs.generateSpectrogram(second, 2), /另一个频谱/);
    cleanup.resolve();
    await cancellation;
    await rejection;
    const next = jobs.generateSpectrogram(second, 2);
    workers[1]!.pending.resolve(image);
    await next;
  } finally { await jobs.close(); }
});

test('移除并重新导入同一路径不会发布旧频谱，移除等待清理且不取消元数据队列', async () => {
  const { jobs, workers, first, path } = await fixture();
  try {
    const old = jobs.generateSpectrogram(first, 2);
    const rejection = assert.rejects(old, /频谱生成已取消/);
    await setImmediate();
    workers[0]!.cancelOnClose = false;
    let removed = false;
    const removing = jobs.removeFiles([first]).then(() => { removed = true; });
    const [replacement] = jobs.register([path]);
    assert.notEqual(replacement!.id, first);
    jobs.analyzeFiles([replacement!.id]);
    await setImmediate();
    assert.equal(removed, false);
    workers[0]!.pending.resolve(image);
    await removing;
    await rejection;
    await assert.rejects(jobs.generateSpectrogram(first, 2), /重新添加/);
    const next = jobs.generateSpectrogram(replacement!.id, 2);
    workers[1]!.pending.resolve(image);
    await next;
  } finally { await jobs.close(); }
});

test('重试部分分析结果取消旧频谱并允许完成新分析后重新生成', async () => {
  const { jobs, workers, first } = await fixture('partial');
  try {
    const pending = jobs.generateSpectrogram(first, 2);
    const rejection = assert.rejects(pending, /频谱生成已取消/);
    await setImmediate();
    await jobs.retryFile(first);
    await rejection;
    await setImmediate();
    const next = jobs.generateSpectrogram(first, 4);
    workers[1]!.pending.resolve({ ...image, streamIndex: 4 });
    assert.equal((await next).streamIndex, 4);
  } finally { await jobs.close(); }
});

test('立即关闭取消尚未启动的频谱且关闭后禁止继续生成', async () => {
  const { jobs, workers, first } = await fixture();
  const pending = jobs.generateSpectrogram(first, 2);
  const rejection = assert.rejects(pending, /频谱生成已取消/);
  await jobs.close();
  await rejection;
  assert.equal(workers[0]!.calls.length, 0);
  await assert.rejects(jobs.generateSpectrogram(first, 2), /重新添加/);
  await jobs.close();
});

test('生成工具失败后释放槽位，允许用户重试并且保留参数分析结果', async () => {
  const { jobs, workers, first } = await fixture();
  try {
    const failed = jobs.generateSpectrogram(first, 2);
    const rejection = assert.rejects(failed, /缺少 FFmpeg/);
    await setImmediate();
    workers[0]!.pending.reject(new Error('缺少 FFmpeg'));
    await rejection;
    const retry = jobs.generateSpectrogram(first, 2);
    workers[1]!.pending.resolve(image);
    await retry;
  } finally { await jobs.close(); }
});


test('真实频谱Worker取消会回收FFmpeg并完成临时图像目录清理',
  { skip: process.platform === 'win32', timeout: 10_000 }, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'file-analyzer-spectrum-worker-'));
    const audio = join(directory, 'audio.wav');
    const probe = join(directory, 'ffprobe.cjs');
    const ffmpeg = join(directory, 'ffmpeg.cjs');
    const marker = join(directory, 'running.json');
    const analyzer = new WorkerAnalyzer({ ffprobePath: probe, ffmpegPath: ffmpeg, timeoutMs: 60_000 });
    let running: { pid: number; directory: string } | undefined;
    let rejected: Promise<void> | undefined;
    try {
      await writeFile(audio, 'Local regular fixture; tools are deterministic test executables.');
      const metadata = JSON.stringify({ streams: [{ index: 2, codec_type: 'audio',
        sample_rate: '48000', channels: 2, duration: '1' }], format: { duration: '1' } });
      await writeFile(probe, `#!${process.execPath}\nprocess.stdout.write(${JSON.stringify(metadata)});\n`, { mode: 0o700 });
      await writeFile(ffmpeg, `#!${process.execPath}\nprocess.on('SIGTERM', () => {}); require('node:fs').writeFileSync(${JSON.stringify(marker)}, JSON.stringify({pid:process.pid,directory:process.cwd()})); setInterval(() => {},1000);\n`, { mode: 0o700 });
      rejected = assert.rejects(analyzer.generateSpectrogram(audio, 2), /已关闭/);
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        try { running = JSON.parse(await readFile(marker, 'utf8')) as typeof running; break; }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        await setTimeout(20);
      }
      assert.ok(running, 'The FFmpeg process must have started before cancellation.');
      process.kill(running.pid, 0);
      assert.ok((await stat(running.directory)).isDirectory());
      await analyzer.close();
      await rejected;
      assert.throws(() => process.kill(running!.pid, 0), { code: 'ESRCH' });
      await assert.rejects(stat(running.directory), { code: 'ENOENT' });
    } finally {
      await analyzer.close();
      await rejected;
      if (running) { try { process.kill(running.pid, 'SIGKILL'); } catch {} }
      await rm(directory, { recursive: true, force: true });
    }
  });

for (const action of ['取消', '移除', '重试'] as const) {
  test(`图像已返回但Worker仍在清理时${action}，完成清理后也不得返回旧频谱`, async () => {
    const { jobs, workers, first, path } = await fixture('partial');
    const cleanup = deferred<void>();
    const pending = jobs.generateSpectrogram(first, 2);
    const rejection = assert.rejects(pending, /频谱生成已取消/);
    try {
      const worker = workers[0]!;
      worker.cleanup = cleanup.promise;
      worker.pending.resolve(image);
      await setImmediate();
      assert.ok(worker.closes > 0, 'The generated image has reached the worker cleanup phase.');
      let settled = false;
      const cancelling = (action === '取消' ? jobs.cancelSpectrogram(first)
        : action === '移除' ? jobs.removeFiles([first]) : jobs.retryFile(first))
        .then(() => { settled = true; });
      await setImmediate();
      assert.equal(settled, false);
      cleanup.resolve();
      await cancelling;
      await rejection;
      let currentID = first;
      if (action === '移除') {
        currentID = jobs.register([path])[0]!.id;
        jobs.analyzeFiles([currentID]);
      }
      await setImmediate();
      const next = jobs.generateSpectrogram(currentID, 2);
      workers[1]!.pending.resolve(image);
      await next;
    } finally {
      cleanup.resolve();
      await jobs.close();
    }
  });
}
