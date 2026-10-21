import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, copyFile, open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { analyzeFile, analyzeFiles } from '../src/index.js';
import { pdfFixture, encryptedPdfFixture, writeSparsePdf } from './pdf-fixtures.js';
import { DOCUMENT_MAX_BYTES } from '../src/limits.js';

test('真实 PDF：按内容识别、混合页面尺寸、UserUnit 和旋转，不修改文件', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'file-analyzer-pdf-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, '公共 PDF.pdf'); const bytes = await pdfFixture('Public PDF Author');
  await writeFile(path, bytes);
  const result = await analyzeFile(path);
  assert.equal(result.category, 'pdf'); assert.equal(result.status, 'ok', JSON.stringify(result.issues));
  assert.equal(result.fields.find(item => item.key === 'pdf.pageCount')!.value, 2);
  assert.equal(result.fields.find(item => item.key === 'pdf.encrypted')!.value, false);
  assert.deepEqual(result.pdfPages, [
    { number: 1, widthPt: 595.28, heightPt: 841.89, rotation: 0 },
    { number: 2, widthPt: 1224, heightPt: 1584, rotation: 90 },
  ]);
  assert.ok(result.privacy!.findings.some(item => item.value === 'Public PDF Author'));
  assert.equal(result.privacy!.status, 'checked');
  assert.deepEqual(await readFile(path), Buffer.from(bytes));
  const renamed = join(dir, 'renamed.bin'); await copyFile(path, renamed);
  const detected = await analyzeFile(renamed);
  assert.equal(detected.category, 'pdf'); assert.equal(detected.detectedType.source, 'signature');
  assert.ok(detected.issues.some(issue => issue.code === 'EXTENSION_MISMATCH'));
});

test('没有 ExifTool 时保留结构和作者，工具缺失不误报隐私检查完整', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pdf-fallback-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'fallback.pdf'); await writeFile(path, await pdfFixture('Fallback Author'));
  const result = await analyzeFile(path, { exiftoolPath: join(dir, 'missing-exiftool') });
  assert.equal(result.status, 'partial'); assert.equal(result.pdfPages!.length, 2);
  assert.equal(result.privacy!.status, 'partial');
  assert.ok(result.privacy!.findings.some(item => item.value === 'Fallback Author' && item.source.startsWith('pdf-lib:')));
});

test('PDF 单页属性损坏时保留文档属性及前后正常页面，缺少工具仍保留作者', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pdf-partial-page-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const key of ['UserUnit', 'MediaBox', 'Rotate']) {
    await t.test(key, async () => {
      const document = await PDFDocument.load(await pdfFixture('Partial PDF Author', 3), { updateMetadata: false });
      document.getPages()[1]!.node.set(PDFName.of(key), PDFString.of('invalid'));
      const bytes = await document.save();
      const path = join(dir, `${key}.pdf`); await writeFile(path, bytes);
      const result = await analyzeFile(path, { exiftoolPath: join(dir, 'missing-exiftool') });
      assert.equal(result.status, 'partial');
      assert.equal(result.fields.find(item => item.key === 'pdf.pageCount')!.value, 3);
      assert.equal(result.fields.find(item => item.key === 'pdf.encrypted')!.value, false);
      assert.deepEqual(result.pdfPages, [
        { number: 1, widthPt: 595.28, heightPt: 841.89, rotation: 0 },
        { number: 3, widthPt: 595.28, heightPt: 841.89, rotation: 0 },
      ]);
      assert.ok(result.issues.some(issue => issue.code === 'PDF_PAGE_WARNING' && issue.message.includes('第 2 页')));
      assert.equal(result.privacy!.status, 'partial');
      assert.ok(result.privacy!.findings.some(item => item.value === 'Partial PDF Author' && item.source.startsWith('pdf-lib:')));
      assert.deepEqual(await readFile(path), Buffer.from(bytes));
    });
  }
});

test('真实加密 PDF、损坏文件和无作者文档不会被显示为未加密或安全', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pdf-encrypted-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const encrypted = join(dir, 'encrypted.pdf'); const broken = join(dir, 'broken.pdf'); const clean = join(dir, 'clean.pdf');
  await writeFile(encrypted, encryptedPdfFixture()); await writeFile(broken, '%PDF-1.7\nnot a document');
  await writeFile(clean, await pdfFixture());
  const [locked, corrupt, unrecorded] = await analyzeFiles([encrypted, broken, clean]);
  assert.equal(locked!.fields.find(item => item.key === 'pdf.encrypted')!.value, true);
  assert.ok(locked!.issues.some(issue => issue.code === 'PDF_ENCRYPTED'));
  assert.equal(locked!.pdfPages, undefined); assert.equal(locked!.status, 'partial');
  assert.notEqual(locked!.privacy!.status, 'checked');
  assert.equal(corrupt!.status, 'partial');
  assert.notEqual(corrupt!.fields.find(item => item.key === 'pdf.encrypted')!.value, false);
  assert.equal(unrecorded!.status, 'ok'); assert.equal(unrecorded!.privacy!.findings.length, 0);
  assert.equal(unrecorded!.fields.find(item => item.key === 'pdf.author')!.status, 'missing');
});

test('PDF 页数和大小限制显式报告，保留已检查范围', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pdf-limits-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const pages = join(dir, 'many-pages.pdf'); await writeFile(pages, await pdfFixture(undefined, 201));
  const result = await analyzeFile(pages);
  assert.equal(result.fields.find(item => item.key === 'pdf.pageCount')!.value, 201);
  assert.equal(result.pdfPages!.length, 200); assert.ok(result.issues.some(issue => issue.code === 'PDF_PAGE_LIMIT'));
  const large = join(dir, 'large.pdf'); const file = await open(large, 'w');
  try { await file.write('%PDF-1.7\n'); await file.truncate(DOCUMENT_MAX_BYTES + 1); } finally { await file.close(); }
  const limited = await analyzeFile(large, { exiftoolPath: join(dir, 'missing-exiftool') });
  assert.ok(limited.issues.some(issue => issue.code === 'FILE_SIZE_LIMIT'));
});

test('1 GB 临界大小的有效 PDF 能完成结构解析并保留作者', { timeout: 90_000 }, async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pdf-full-size-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'full-size.pdf'); await writeSparsePdf(path, DOCUMENT_MAX_BYTES);
  const result = await analyzeFile(path, { exiftoolPath: join(dir, 'missing-exiftool') });
  assert.equal(result.fields.find(item => item.key === 'file.sizeBytes')!.value, DOCUMENT_MAX_BYTES);
  assert.equal(result.fields.find(item => item.key === 'pdf.pageCount')!.value, 1);
  assert.deepEqual(result.pdfPages, [{ number: 1, widthPt: 612, heightPt: 792, rotation: 0 }]);
  assert.ok(result.privacy!.findings.some(item => item.value === 'Public large PDF author'));
  assert.equal(result.issues.length, 1, JSON.stringify(result.issues));
  assert.equal(result.issues[0]!.tool, 'exiftool');
  t.diagnostic(`1 GB PDF test process peak RSS: ${process.resourceUsage().maxRSS} KiB`);
});

test('PDF OpenAction 的 JavaScript 不执行或请求网络', async t => {
  let requests = 0; const server = createServer((_request, response) => { requests++; response.end('no'); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const dir = await mkdtemp(join(tmpdir(), 'pdf-no-script-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'action.pdf'); await writeFile(path, await pdfFixture(undefined, 1, `http://127.0.0.1:${address.port}/`));
  const result = await analyzeFile(path); assert.equal(result.category, 'pdf'); assert.equal(result.status, 'ok');
  assert.equal(requests, 0);
});

test('PDF 结构超时会终止解析线程并返回未完成状态', { timeout: 5000 }, async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pdf-timeout-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'timeout.pdf'); await writeFile(path, await pdfFixture());
  const result = await analyzeFile(path, { timeoutMs: 1 });
  assert.equal(result.status, 'partial');
  assert.ok(result.issues.some(issue => issue.code === 'PDF_READ_TIMEOUT'));
  assert.notEqual(result.privacy!.status, 'checked');
});
