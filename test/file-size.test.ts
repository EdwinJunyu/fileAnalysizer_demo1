import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeFile } from '../src/analyze.js';
import { generateSpectrogram, SpectrogramError } from '../src/spectrogram.js';
import { DOCUMENT_MAX_BYTES, MEDIA_MAX_BYTES } from '../src/limits.js';

test('文档 1 GB 和媒体 6 GB 大小边界统一生效，超限不调用解析工具', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'file-size-boundaries-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const [ext, header, limit, category] of [
    ['pdf', '%PDF-1.7\n', DOCUMENT_MAX_BYTES, 'pdf'],
    ['docx', 'unrecognized document\n', DOCUMENT_MAX_BYTES, 'office'],
    ['wav', 'unrecognized audio\n', MEDIA_MAX_BYTES, 'audio'],
    ['mp4', 'unrecognized video\n', MEDIA_MAX_BYTES, 'video'],
  ] as const) {
    await t.test(ext, async () => {
      const path = join(dir, `large.${ext}`);
      const file = await open(path, 'w');
      try {
        await file.write(header); await file.truncate(limit + 1);
        const options = { exiftoolPath: join(dir, 'missing-exiftool'), ffprobePath: join(dir, 'missing-ffprobe') };
        const rejected = await analyzeFile(path, options);
        assert.equal(rejected.category, category);
        assert.equal(rejected.status, 'error');
        assert.equal(rejected.fields.find(item => item.key === 'file.sizeBytes')!.value, limit + 1);
        assert.ok(rejected.issues.some(issue => issue.code === 'FILE_SIZE_LIMIT'));
        assert.ok(!rejected.issues.some(issue => issue.tool));
        assert.equal(rejected.privacy!.status, 'unavailable');
        // Under-limit parsing can fail for these synthetic files, but must reach the parser.
        // A full-size valid PDF is exercised separately rather than allocating another 1 GB here.
        if (ext !== 'pdf') {
          for (const size of [limit, limit - 1]) {
            await file.truncate(size);
            const allowed = await analyzeFile(path, options);
            assert.ok(!allowed.issues.some(issue => issue.code === 'FILE_SIZE_LIMIT'));
            assert.ok(allowed.issues.some(issue => issue.tool), JSON.stringify(allowed.issues));
          }
        }
      } finally { await file.close(); }
    });
  }
});

test('6 GB 临界大小的有效 RF64 WAV 可读取参数与完整时长', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'media-full-size-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'full-size.wav');
  // RIFF uses 32-bit lengths. A real file above 4 GiB must use RF64/ds64.
  const header = Buffer.alloc(80);
  header.write('RF64', 0); header.writeUInt32LE(0xffffffff, 4); header.write('WAVEds64', 8);
  header.writeUInt32LE(28, 16); header.writeBigUInt64LE(BigInt(MEDIA_MAX_BYTES - 8), 20);
  header.writeBigUInt64LE(BigInt(MEDIA_MAX_BYTES - 80), 28);
  header.writeBigUInt64LE(BigInt((MEDIA_MAX_BYTES - 80) / 4), 36);
  header.write('fmt ', 48); header.writeUInt32LE(16, 52); header.writeUInt16LE(1, 56); header.writeUInt16LE(2, 58);
  header.writeUInt32LE(48_000, 60); header.writeUInt32LE(192_000, 64);
  header.writeUInt16LE(4, 68); header.writeUInt16LE(16, 70);
  header.write('data', 72); header.writeUInt32LE(0xffffffff, 76);
  const file = await open(path, 'w');
  try { await file.write(header); await file.truncate(MEDIA_MAX_BYTES); } finally { await file.close(); }
  const result = await analyzeFile(path);
  assert.equal(result.status, 'ok', JSON.stringify(result.issues));
  assert.equal(result.fields.find(item => item.key === 'file.sizeBytes')!.value, MEDIA_MAX_BYTES);
  const audio = result.streams.find(stream => stream.type === 'audio')!;
  assert.equal(audio.fields.find(item => item.key === 'audio.sampleRate')!.value, 48_000);
  assert.ok(Number(result.fields.find(item => item.key === 'media.duration')!.value) > 31_000);
});

test('直接调用频谱 API 时也在工具启动前拒绝超过 6 GB 的源文件', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'spectrum-source-limit-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'over.wav'); const file = await open(path, 'w');
  try { await file.truncate(MEDIA_MAX_BYTES + 1); } finally { await file.close(); }
  await assert.rejects(generateSpectrogram(path, 0, { ffprobePath: join(dir, 'missing') }),
    error => error instanceof SpectrogramError && error.code === 'FILE_SIZE_LIMIT');
});
