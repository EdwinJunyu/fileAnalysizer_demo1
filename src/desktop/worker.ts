import { parentPort, workerData } from 'node:worker_threads';
import { analyzeFile } from '../analyze.js';
import { shutdownTools } from '../tools.js';
import type { AnalysisOptions } from '../types.js';

const { path, options } = workerData as { path: string; options: AnalysisOptions };
let closing = false;
parentPort?.on('message', (message: unknown) => {
  if (message !== 'close' || closing) return;
  closing = true;
  // The parent may terminate synchronous parsing only after all external tools have exited.
  void shutdownTools().then(() => {
    parentPort?.postMessage({ closed: true });
    parentPort?.close();
  });
});
try {
  const result = await analyzeFile(path, options);
  if (!closing) parentPort?.postMessage({ result });
} catch (error) {
  if (!closing) parentPort?.postMessage({ error: error instanceof Error ? error.message : '文件分析失败，请重试。' });
} finally {
  if (!closing) parentPort?.close();
}
