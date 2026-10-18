import type { AnalysisResult, SpectrogramResult } from '../types.js';

export interface DesktopFile {
  id: string;
  path: string;
  name: string;
}

export type DesktopEvent =
  | { type: 'started'; id: string }
  | { type: 'result'; id: string; result: AnalysisResult }
  | { type: 'failed'; id: string; message: string };

/** The renderer gets only local-file operations, never arbitrary IPC or Node access. */
export interface DesktopBridge {
  chooseFiles(): Promise<DesktopFile[]>;
  importFiles(files: File[]): Promise<DesktopFile[]>;
  analyzeFiles(ids: string[]): Promise<void>;
  retryFile(id: string): Promise<void>;
  removeFiles(ids: string[]): Promise<void>;
  generateSpectrogram(id: string, streamIndex: number): Promise<SpectrogramResult>;
  cancelSpectrogram(id: string): Promise<void>;
  onEvent(listener: (event: DesktopEvent) => void): () => void;
}
