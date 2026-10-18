import { parentPort, workerData } from 'node:worker_threads';
import { analyzeFile } from '../analyze.js';
import type { AnalysisOptions } from '../types.js';

const { path, options } = workerData as { path: string; options: AnalysisOptions };
try {
  const result = await analyzeFile(path, options);
  parentPort?.postMessage({ result });
} catch (error) {
  parentPort?.postMessage({ error: error instanceof Error ? error.message : '文件分析失败，请重试。' });
}
