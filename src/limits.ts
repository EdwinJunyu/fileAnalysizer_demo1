import type { AnalysisIssue, FileCategory } from './types.js';

export const DOCUMENT_MAX_BYTES = 1_000_000_000;
export const MEDIA_MAX_BYTES = 6_000_000_000;
export const PDF_HEAP_MB = 512;
export const PDF_STRUCTURE_TIMEOUT_MS = 60_000;
export const FILE_SIZE_HINT = '单个文档最大 1 GB，音视频最大 6 GB（十进制）。';

/** Source-file limits are separate from decoded data and parser resource budgets. */
export function fileSizeIssue(category: FileCategory, bytes: number): AnalysisIssue | undefined {
  const document = category === 'pdf' || category === 'office';
  const media = category === 'audio' || category === 'video';
  if ((!document && !media) || bytes <= (document ? DOCUMENT_MAX_BYTES : MEDIA_MAX_BYTES)) return undefined;
  return { code: 'FILE_SIZE_LIMIT',
    message: `${document ? '文档' : '音视频'}文件超过单个文件 ${document ? '1 GB' : '6 GB'} 的大小上限，未执行专属解析。请缩小文件后重新解析；基础文件信息仍可查看。` };
}
