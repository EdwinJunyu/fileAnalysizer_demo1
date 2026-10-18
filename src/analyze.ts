import { stat } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { detectType, sameExtension, typeFromExtension } from './detect.js';
import { extractExif } from './exif.js';
import { field } from './fields.js';
import { extractMedia } from './media.js';
import { extractOffice } from './office.js';
import { ToolError } from './tools.js';
import { validateTimeout } from './options.js';
import type { AnalysisOptions, AnalysisResult } from './types.js';

/** Analyze one local file. Expected file/tool errors are returned without discarding base metadata. */
export async function analyzeFile(input: string, options: AnalysisOptions = {}): Promise<AnalysisResult> {
  // Invalid configuration is a caller error, not a damaged-file or detection error.
  validateTimeout(options.timeoutMs);
  const path = resolve(input);
  const result: AnalysisResult = {
    path, name: basename(path), category: 'other', status: 'ok',
    detectedType: { ext: null, mime: null, category: 'other', source: 'unknown' },
    fields: [], streams: [], issues: [],
  };
  let info;
  try {
    info = await stat(path);
    if (!info.isFile()) throw Object.assign(new Error('路径不是普通文件。'), { code: 'NOT_A_FILE' });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    result.status = 'error';
    result.issues.push({ code: code === 'ENOENT' ? 'FILE_NOT_FOUND' : code === 'EACCES' ? 'FILE_ACCESS_DENIED' : code ?? 'FILE_ERROR',
      message: code === 'ENOENT' ? '文件不存在。' : code === 'EACCES' ? '没有权限读取文件。' : (error as Error).message });
    return result;
  }
  result.fields.push(
    field('file.name', '文件名', result.name, 'filesystem'),
    field('file.sizeBytes', '文件大小', info.size, 'filesystem', 'byte'),
    field('file.createdAt', '文件系统创建时间', info.birthtimeMs > 0 ? info.birthtime.toISOString() : undefined, 'filesystem', undefined,
      '文件系统记录时间；不代表媒体或文档的原始创作时间。'),
    field('file.modifiedAt', '文件系统修改时间', info.mtime.toISOString(), 'filesystem'),
  );
  try {
    result.detectedType = await detectType(path, options.timeoutMs);
  } catch (error) {
    result.detectedType = typeFromExtension(path);
    result.status = 'partial';
    result.issues.push({ code: 'DETECTION_FAILED', message: `内容识别未完成：${(error as Error).message}` });
  }
  result.category = result.detectedType.category;
  result.fields.push(
    field('file.type', '识别的文件类型', result.detectedType.ext, result.detectedType.source, undefined,
      result.detectedType.source === 'extension' ? '仅依据扩展名，内容类型尚未验证。' : undefined, 'unknown'),
    field('file.mimeType', 'MIME 类型', result.detectedType.mime, result.detectedType.source, undefined, undefined, 'unknown'),
  );
  const extension = extname(path).slice(1).toLowerCase();
  if (extension && result.detectedType.source === 'signature' && result.detectedType.ext &&
    !sameExtension(extension, result.detectedType.ext)) {
    result.issues.push({ code: 'EXTENSION_MISMATCH',
      message: `扩展名 .${extension} 与内容识别结果 ${result.detectedType.ext} 不同，按实际内容解析。` });
  }
  if (result.category === 'other') {
    result.fields.push(field('file.analysisLevel', '解析范围', '基础文件信息', 'analyzer', undefined,
      '暂未支持此格式的专属参数；文件类型也可能尚未识别。'));
    return result;
  }
  try {
    const extracted = result.category === 'audio' || result.category === 'video'
      ? await extractMedia(path, options)
      : result.category === 'office'
        ? await extractOffice(path, result.detectedType.ext!, options)
        : await extractExif(path, 'image', options);
    result.fields.push(...extracted.fields);
    result.streams = extracted.streams ?? [];
    result.rawMetadata = extracted.rawMetadata;
    result.issues.push(...extracted.issues ?? []);
    if (extracted.issues?.length) result.status = 'partial';
    // MP4/OGG are containers: an audio-only file should not become video just because of its suffix.
    if (result.streams.length) {
      const hasVideo = result.streams.some(stream => stream.type === 'video' &&
        stream.fields.find(item => item.key === 'stream.attachedPicture')?.value !== true);
      const hasAudio = result.streams.some(stream => stream.type === 'audio');
      if (hasVideo) result.category = 'video';
      else if (hasAudio) result.category = 'audio';
    }
  } catch (error) {
    result.status = 'partial';
    const known = error instanceof ToolError;
    result.issues.push({ code: known ? error.code : 'PARSE_FAILED', message: (error as Error).message,
      ...(known ? { tool: error.tool } : {}) });
    result.fields.push(field('analysis.details', '专属参数', null, known ? error.tool : 'analyzer', undefined,
      (error as Error).message, 'error'));
  }
  return result;
}

/** Serial execution bounds tool concurrency and isolates failures between files. */
export async function analyzeFiles(paths: string[], options: AnalysisOptions = {}): Promise<AnalysisResult[]> {
  validateTimeout(options.timeoutMs);
  const results: AnalysisResult[] = [];
  for (const path of paths) results.push(await analyzeFile(path, options));
  return results;
}
