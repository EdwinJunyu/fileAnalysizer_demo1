export type FileCategory = 'audio' | 'video' | 'image' | 'office' | 'other';
export type FieldStatus = 'present' | 'missing' | 'not_applicable' | 'unknown' | 'error';

export interface MetadataField {
  key: string;
  label: string;
  value: string | number | boolean | null;
  status: FieldStatus;
  source: string;
  unit?: string;
  note?: string;
}

export interface AnalysisIssue {
  code: string;
  message: string;
  tool?: string;
}

export interface MediaStream {
  index: number;
  type: string;
  fields: MetadataField[];
}

export interface DetectedType {
  ext: string | null;
  mime: string | null;
  category: FileCategory;
  source: 'signature' | 'extension' | 'unknown';
}

export interface AnalysisResult {
  path: string;
  name: string;
  category: FileCategory;
  status: 'ok' | 'partial' | 'error';
  detectedType: DetectedType;
  fields: MetadataField[];
  streams: MediaStream[];
  issues: AnalysisIssue[];
  rawMetadata?: Record<string, unknown>;
}

export interface AnalysisOptions {
  bundledToolsDir?: string;
  ffprobePath?: string;
  exiftoolPath?: string;
  timeoutMs?: number;
}

export interface ExtractedMetadata {
  fields: MetadataField[];
  streams?: MediaStream[];
  rawMetadata?: Record<string, unknown>;
  issues?: AnalysisIssue[];
}
