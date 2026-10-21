import { Worker } from 'node:worker_threads';
import { field, finiteNumber } from './fields.js';
import { readExifTags } from './exif.js';
import { ToolError } from './tools.js';
import { validateTimeout } from './options.js';
import { PDF_HEAP_MB, PDF_STRUCTURE_TIMEOUT_MS } from './limits.js';
import type { AnalysisOptions, ExtractedMetadata } from './types.js';

const readers = new Set<{ cancel: () => Promise<void> }>();
let closing = false;
let shutdown: Promise<void> | undefined;

export function shutdownPdfReaders(): Promise<void> {
  closing = true;
  return shutdown ??= Promise.all([...readers].map(reader => reader.cancel())).then(() => {});
}

function readStructure(path: string, timeout: number): Promise<ExtractedMetadata> {
  if (closing) return Promise.reject(new Error('PDF_READ_CANCELLED'));
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./pdf-worker.js', import.meta.url), {
      workerData: { path }, resourceLimits: { maxOldGenerationSizeMb: PDF_HEAP_MB }, stdout: true, stderr: true,
      // The compiled parser does not need host eval, test-runner or V8 launch flags.
      execArgv: [],
    });
    worker.stdout.resume(); worker.stderr.resume();
    let settled = false;
    let finished: Promise<void> | undefined;
    const finish = (result?: ExtractedMetadata, code?: string): Promise<void> => {
      if (settled) return finished!;
      settled = true;
      clearTimeout(timer);
      finished = worker.terminate().then(() => {
        readers.delete(reader);
        if (result) resolve(result);
        else reject(new Error(code ?? 'PDF_STRUCTURE_FAILED'));
      });
      return finished;
    };
    const reader = { cancel: () => finish(undefined, 'PDF_READ_CANCELLED') };
    readers.add(reader);
    const timer = setTimeout(() => { void finish(undefined, 'PDF_READ_TIMEOUT'); }, timeout);
    worker.once('message', (message: { result?: ExtractedMetadata; code?: string }) => { void finish(message.result, message.code); });
    worker.once('error', error => {
      void finish(undefined, (error as NodeJS.ErrnoException).code === 'ERR_WORKER_OUT_OF_MEMORY'
        ? 'PDF_MEMORY_LIMIT' : 'PDF_STRUCTURE_FAILED');
    });
    worker.once('exit', () => { if (!settled) void finish(undefined, 'PDF_STRUCTURE_FAILED'); });
  });
}

/** Structural parsing and ExifTool are independent so either can preserve useful evidence. */
export async function extractPdf(path: string, options: AnalysisOptions): Promise<ExtractedMetadata> {
  const timeout = validateTimeout(options.timeoutMs ?? PDF_STRUCTURE_TIMEOUT_MS);
  const extracted: ExtractedMetadata = { fields: [], issues: [], rawMetadata: {} };
  try {
    const tags = await readExifTags(path, options);
    extracted.rawMetadata = tags;
    const text = (name: string): string | undefined => typeof tags[`PDF:${name}`] === 'string'
      ? (tags[`PDF:${name}`] as string).trim() || undefined : undefined;
    const count = finiteNumber(tags['PDF:PageCount']);
    extracted.fields.push(
      field('pdf.version', 'PDF 版本', text('PDFVersion') ?? finiteNumber(tags['PDF:PDFVersion']), 'ExifTool: PDF:PDFVersion'),
      field('pdf.pageCount', 'PDF 页数', count !== undefined && Number.isSafeInteger(count) && count >= 0 ? count : undefined,
        'ExifTool: PDF:PageCount', 'pages', '工具报告值；页面结构检查成功后使用结构计数'),
      field('pdf.encrypted', 'PDF 是否加密', text('Encryption') ? true : undefined,
        'ExifTool: PDF:Encryption', undefined, '未读取到加密标签时，不能仅据此判断为未加密', 'unknown'),
    );
    for (const [key, label, tag] of [
      ['author', '作者', 'Author'], ['title', '标题', 'Title'], ['subject', '主题', 'Subject'],
      ['keywords', '关键词', 'Keywords'], ['creator', '创建应用', 'Creator'], ['producer', 'PDF 生成程序', 'Producer'],
      ['createdAt', '文档创建时间', 'CreateDate'], ['modifiedAt', '文档修改时间', 'ModifyDate'],
    ]) extracted.fields.push(field(`pdf.${key}`, label!, text(tag!), `ExifTool: PDF:${tag}`));
    for (const [key] of Object.entries(tags)) {
      if (/(?:^|:)(?:Warning|Error)$/.test(key)) extracted.issues!.push({
        code: 'PDF_METADATA_WARNING', message: 'ExifTool 报告 PDF 元数据读取不完整，隐私检查可能遗漏信息。', tool: 'exiftool',
      });
    }
  } catch (error) {
    extracted.issues!.push({ code: error instanceof ToolError ? error.code : 'PDF_METADATA_FAILED',
      message: error instanceof Error ? error.message : 'PDF 元数据读取失败。', tool: 'exiftool' });
  }
  try {
    const structure = await readStructure(path, timeout);
    for (const next of structure.fields) {
      const index = extracted.fields.findIndex(item => item.key === next.key);
      if (index < 0) extracted.fields.push(next);
      else if (['pdf.pageCount', 'pdf.encrypted'].includes(next.key) || extracted.fields[index]!.status !== 'present') extracted.fields[index] = next;
    }
    extracted.pdfPages = structure.pdfPages;
    extracted.issues!.push(...structure.issues ?? []);
    Object.assign(extracted.rawMetadata!, structure.rawMetadata);
  } catch (error) {
    const knownCodes = ['PDF_ENCRYPTED', 'PDF_SIZE_LIMIT', 'PDF_MEMORY_LIMIT', 'PDF_READ_TIMEOUT', 'PDF_READ_CANCELLED', 'PDF_CHANGED'];
    const code = error instanceof Error && knownCodes.includes(error.message) ? error.message : 'PDF_STRUCTURE_FAILED';
    const messages: Record<string, string> = {
      PDF_ENCRYPTED: 'PDF 已加密，未解密页面结构；只能展示可读取的元数据。',
      PDF_SIZE_LIMIT: 'PDF 超过 512 MiB，未检查页面结构；可读取的元数据仍保留。',
      PDF_MEMORY_LIMIT: 'PDF 页面结构超出解析内存预算，已停止结构检查；可读取的元数据仍保留。',
      PDF_READ_TIMEOUT: 'PDF 页面结构检查超时，已停止解析；可读取的元数据仍保留。',
      PDF_READ_CANCELLED: 'PDF 页面结构检查已取消。',
      PDF_CHANGED: 'PDF 在检查期间发生变化，无法可靠检查页面结构，请重新解析。',
    };
    extracted.issues!.push({ code, message: Object.hasOwn(messages, code) ? messages[code]! : '无法可靠读取 PDF 页面结构，文件可能损坏或超出解析器能力。', tool: 'pdf-lib' });
    if (!extracted.fields.some(item => item.key === 'pdf.encrypted' && item.status === 'present')) {
      extracted.fields = extracted.fields.filter(item => item.key !== 'pdf.encrypted');
      extracted.fields.push(field('pdf.encrypted', 'PDF 是否加密', code === 'PDF_ENCRYPTED' ? true : undefined,
        'pdf-lib: Encrypt dictionary', undefined, undefined, 'unknown'));
    }
    if (!extracted.fields.some(item => item.key === 'pdf.pageCount')) extracted.fields.push(
      field('pdf.pageCount', 'PDF 页数', null, 'pdf-lib: page tree', 'pages', '页面结构检查未完成', 'unknown'));
  }
  return extracted;
}
