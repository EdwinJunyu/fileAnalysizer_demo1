import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractPdf, shutdownPdfReaders } from '../src/pdf.js';
import { DOCUMENT_MAX_BYTES } from '../src/limits.js';
import { writeSparsePdf } from './pdf-fixtures.js';

// Shutdown seals this module instance; keep this lifecycle test in its own test process.
test('关闭 512 MiB PDF 解析器会取消任务并回收结构线程', { timeout: 10_000 }, async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pdf-large-cancel-'));
  t.after(async () => { await shutdownPdfReaders(); await rm(dir, { recursive: true, force: true }); });
  const path = join(dir, 'cancel.pdf'); await writeSparsePdf(path, DOCUMENT_MAX_BYTES);
  const pending = extractPdf(path, { exiftoolPath: join(dir, 'missing-exiftool') });
  const timer = setTimeout(() => { void shutdownPdfReaders(); }, 50);
  t.after(() => clearTimeout(timer));
  const result = await pending;
  await shutdownPdfReaders();
  assert.ok(result.issues!.some(issue => issue.code === 'PDF_READ_CANCELLED'), JSON.stringify(result.issues));
  assert.equal(result.pdfPages, undefined);
});
