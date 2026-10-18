import { parentPort, workerData } from 'node:worker_threads';
import { analyzeFile } from '../analyze.js';
import { generateSpectrogram } from '../spectrogram.js';
import { shutdownTools } from '../tools.js';
import type { AnalysisOptions } from '../types.js';

const { operation, path, streamIndex, options } = workerData as {
  operation: 'analyze' | 'spectrogram'; path: string; streamIndex?: number; options: AnalysisOptions;
};
let closing = false;
parentPort?.on('message', (message: unknown) => {
  if (message !== 'close' || closing) return;
  closing = true;
  // Reap tools and finish the operation's cleanup (including temporary images) before termination.
  void shutdownTools().then(() => task).then(() => {
    parentPort?.postMessage({ closed: true });
    parentPort?.close();
  });
});
const task = (async () => {
  try {
    const result = operation === 'spectrogram'
      ? await generateSpectrogram(path, streamIndex!, options)
      : await analyzeFile(path, options);
    if (!closing) parentPort?.postMessage({ result });
  } catch (error) {
    if (!closing) parentPort?.postMessage({ error: error instanceof Error ? error.message : '文件分析失败，请重试。' });
  } finally {
    if (!closing) parentPort?.close();
  }
})();
await task;
