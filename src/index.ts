export { analyzeFile, analyzeFiles } from './analyze.js';
export { InvalidOptionsError } from './options.js';
export { generateSpectrogram, SpectrogramError } from './spectrogram.js';
export { inspectPrivacy } from './privacy.js';
export type { AnalysisResult, AnalysisOptions, AnalysisIssue, MetadataField, MediaStream, DetectedType,
  FileCategory, FieldStatus, SpectrogramResult, PrivacyReport, PrivacyFinding, PdfPage } from './types.js';
