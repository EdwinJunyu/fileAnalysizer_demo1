import { parentPort, workerData } from 'node:worker_threads';
import { open } from 'node:fs/promises';
import { PDFDocument, PDFName, PDFNumber, EncryptedPDFError } from 'pdf-lib';
import { field } from './fields.js';
import type { ExtractedMetadata, MetadataField, PdfPage } from './types.js';

// This reader never renders pages, runs JavaScript, resolves links, or saves a PDF.
const MAX_BYTES = 64 * 1024 * 1024;
const MAX_PAGES = 200;
let warned = false;
console.warn = () => { warned = true; }; // Do not leak PDF contents into CLI output.
try {
  const file = await open((workerData as { path: string }).path, 'r');
  let bytes: Buffer;
  try {
    const info = await file.stat();
    if (!info.isFile()) throw new Error('NOT_A_FILE');
    if (info.size > MAX_BYTES) throw new Error('PDF_SIZE_LIMIT');
    // Bound the actual read as well as stat, including files that grow during analysis.
    bytes = Buffer.alloc(info.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const read = await file.read(bytes, length, bytes.length - length, null);
      if (!read.bytesRead) break;
      length += read.bytesRead;
    }
    if (length !== info.size) throw new Error('PDF_CHANGED');
    bytes = bytes.subarray(0, length);
  } finally { await file.close(); }
  const document = await PDFDocument.load(bytes, {
    updateMetadata: false, ignoreEncryption: false, throwOnInvalidObject: true,
  });
  const allPages = document.getPages();
  const fields: MetadataField[] = [
    field('pdf.pageCount', 'PDF 页数', allPages.length, 'pdf-lib: page tree', 'pages'),
    field('pdf.encrypted', 'PDF 是否加密', false, 'pdf-lib: Encrypt dictionary'),
  ];
  for (const [key, label, read] of [
    ['title', '标题', () => document.getTitle()], ['author', '作者', () => document.getAuthor()],
    ['subject', '主题', () => document.getSubject()], ['keywords', '关键词', () => document.getKeywords()],
    ['creator', '创建应用', () => document.getCreator()], ['producer', 'PDF 生成程序', () => document.getProducer()],
    ['createdAt', '文档创建时间', () => document.getCreationDate()?.toISOString()],
    ['modifiedAt', '文档修改时间', () => document.getModificationDate()?.toISOString()],
  ] as const) {
    try { fields.push(field(`pdf.${key}`, label, read(), `pdf-lib: Info/${key}`)); }
    catch { warned = true; fields.push(field(`pdf.${key}`, label, null, `pdf-lib: Info/${key}`, undefined, '记录无法可靠解码', 'error')); }
  }
  const pages: PdfPage[] = [];
  const issues: NonNullable<ExtractedMetadata['issues']> = [];
  for (const [index, page] of allPages.slice(0, MAX_PAGES).entries()) {
    try {
      const unit = page.node.lookupMaybe(PDFName.of('UserUnit'), PDFNumber)?.asNumber() ?? 1;
      const { width, height } = page.getMediaBox();
      const rotation = ((page.getRotation().angle % 360) + 360) % 360;
      if (![width, height, unit].every(value => Number.isFinite(value) && value > 0) || unit > 75000 ||
        ![0, 90, 180, 270].includes(rotation) || !Number.isFinite(width * unit) || !Number.isFinite(height * unit)) {
        throw new Error('PDF_PAGE_INVALID');
      }
      pages.push({ number: index + 1, widthPt: width * unit, heightPt: height * unit, rotation });
    } catch {
      issues.push({ code: 'PDF_PAGE_WARNING',
        message: `第 ${index + 1} 页的尺寸或旋转无法可靠读取，已跳过此页并保留其他可用结果。`, tool: 'pdf-lib' });
    }
  }
  if (allPages.length > MAX_PAGES) issues.push({ code: 'PDF_PAGE_LIMIT', message: '仅检查前 200 页的尺寸；总页数单独显示。', tool: 'pdf-lib' });
  if (warned) issues.push({ code: 'PDF_STRUCTURE_WARNING', message: '部分 PDF 属性或页面尺寸无法可靠读取，已保留可用结果。', tool: 'pdf-lib' });
  const result: ExtractedMetadata = { fields, pdfPages: pages, issues,
    rawMetadata: { PDFParser: { pageCount: allPages.length, encrypted: false, pages } } };
  parentPort!.postMessage({ result });
} catch (error) {
  // pdf-lib 1.17's ES5 Error subclass does not preserve instanceof or .name.
  const encrypted = error instanceof Error && error.message === new EncryptedPDFError().message;
  parentPort!.postMessage({ code: encrypted ? 'PDF_ENCRYPTED' : error instanceof Error && error.message === 'PDF_SIZE_LIMIT'
    ? 'PDF_SIZE_LIMIT' : error instanceof Error && error.message === 'PDF_CHANGED' ? 'PDF_CHANGED' : 'PDF_STRUCTURE_FAILED' });
}
