import { randomUUID } from 'node:crypto';
import { basename, isAbsolute, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import type { AnalysisOptions, AnalysisResult } from '../types.js';
import type { DesktopEvent, DesktopFile } from './contracts.js';

type Analyze = (path: string) => Promise<AnalysisResult>;
type Entry = DesktopFile & {
  attempt: number;
  state: 'registered' | 'queued' | 'active' | 'done' | 'failed';
  result?: AnalysisResult;
};
type Job = { id: string; attempt: number };

/** Small in-memory serial queue. Removed or superseded attempts never publish results. */
export class DesktopJobs {
  private readonly entries = new Map<string, Entry>();
  private readonly paths = new Map<string, string>();
  private readonly queue: Job[] = [];
  private running = false;
  private closed = false;

  constructor(private readonly analyze: Analyze, private readonly emit: (event: DesktopEvent) => void) {}

  register(paths: string[]): DesktopFile[] {
    if (this.closed) return [];
    const added: DesktopFile[] = [];
    const returned = new Set<string>();
    for (const input of paths) {
      if (!isAbsolute(input) || input.includes('\0')) throw new Error('只能导入本地绝对路径。');
      const path = resolve(input);
      const key = this.pathKey(path);
      const existingID = this.paths.get(key);
      if (existingID) {
        const existing = this.entries.get(existingID)!;
        if (!returned.has(existingID)) added.push({ id: existing.id, path: existing.path, name: existing.name });
        returned.add(existingID);
        continue;
      }
      const entry: Entry = { id: randomUUID(), path, name: basename(path), attempt: 0, state: 'registered' };
      this.entries.set(entry.id, entry);
      this.paths.set(key, entry.id);
      added.push({ id: entry.id, path: entry.path, name: entry.name });
      returned.add(entry.id);
    }
    return added;
  }

  analyzeFiles(ids: string[]): void {
    for (const id of ids) {
      const entry = this.entries.get(id);
      if (entry?.state === 'registered') this.enqueue(entry);
    }
    this.pump();
  }

  retryFile(id: string): void {
    const entry = this.entries.get(id);
    if (entry && (entry.state === 'failed' || entry.state === 'done' && entry.result?.status !== 'ok')) {
      this.enqueue(entry);
      this.pump();
    }
  }

  removeFiles(ids: string[]): void {
    for (const id of ids) {
      const entry = this.entries.get(id);
      if (!entry) continue;
      this.paths.delete(this.pathKey(entry.path));
      this.entries.delete(id);
    }
  }

  close(): void {
    this.closed = true;
    this.entries.clear();
    this.paths.clear();
    this.queue.length = 0;
  }

  private pathKey(path: string): string {
    return process.platform === 'win32' ? path.toLowerCase() : path;
  }

  private enqueue(entry: Entry): void {
    entry.attempt += 1;
    entry.state = 'queued';
    this.queue.push({ id: entry.id, attempt: entry.attempt });
  }

  private pump(): void {
    if (this.running || this.closed) return;
    let job: Job | undefined;
    let entry: Entry | undefined;
    while ((job = this.queue.shift())) {
      const candidate = this.entries.get(job.id);
      if (candidate?.attempt === job.attempt && candidate.state === 'queued') {
        entry = candidate;
        break;
      }
    }
    if (!entry || !job) return;
    const activeJob = job;
    const activeEntry = entry;
    this.running = true;
    activeEntry.state = 'active';
    this.emit({ type: 'started', id: activeEntry.id });
    // The microtask also catches a synchronous analyzer failure, so the next file still runs.
    void Promise.resolve().then(() => this.analyze(activeEntry.path)).then(result => {
      if (!this.isCurrent(activeJob)) return;
      activeEntry.state = 'done';
      activeEntry.result = result;
      this.emit({ type: 'result', id: activeEntry.id, result });
    }).catch((error: unknown) => {
      if (!this.isCurrent(activeJob)) return;
      activeEntry.state = 'failed';
      this.emit({ type: 'failed', id: activeEntry.id,
        message: error instanceof Error ? error.message : '文件分析失败，请重试。' });
    }).finally(() => {
      this.running = false;
      this.pump();
    });
  }

  private isCurrent(job: Job): boolean {
    return !this.closed && this.entries.get(job.id)?.attempt === job.attempt;
  }
}

/** Only the worker imports the parsing core; the Electron main process stays responsive. */
export class WorkerAnalyzer {
  private readonly workers = new Map<Worker, { exited: Promise<void>; cancel: () => void }>();
  private closed = false;
  private shutdown: Promise<void> | undefined;

  constructor(private readonly options: AnalysisOptions = {}) {}

  analyze = (path: string): Promise<AnalysisResult> => {
    if (this.closed) return Promise.reject(new Error('分析窗口已关闭。'));
    return new Promise((resolveResult, reject) => {
      const worker = new Worker(new URL('./worker.js', import.meta.url), {
        workerData: { path, options: this.options },
      });
      let settled = false;
      const finish = (result: AnalysisResult | undefined, error?: Error): void => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolveResult(result!);
      };
      worker.on('message', (message: { result?: AnalysisResult; error?: string; closed?: boolean }) => {
        if (message.closed) {
          // The worker has sealed its tool runner and reaped every child before this acknowledgement.
          void worker.terminate();
          return;
        }
        if (message.result) finish(message.result);
        else finish(undefined, new Error(message.error || '分析线程返回了无效结果。'));
      });
      worker.once('error', error => finish(undefined, error instanceof Error ? error : new Error(String(error))));
      const exited = new Promise<void>(resolveExit => {
        worker.once('exit', code => {
          this.workers.delete(worker);
          finish(undefined, new Error(`分析线程意外退出（${code}），请重试。`));
          resolveExit();
        });
      });
      this.workers.set(worker, { exited, cancel: () => finish(undefined, new Error('分析窗口已关闭。')) });
    });
  };

  close(): Promise<void> {
    if (this.shutdown) return this.shutdown;
    this.closed = true;
    const active = [...this.workers];
    for (const [worker, state] of active) {
      state.cancel();
      worker.postMessage('close');
    }
    this.shutdown = Promise.all(active.map(([, state]) => state.exited)).then(() => {});
    return this.shutdown;
  }
}
