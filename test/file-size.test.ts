import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeFile } from '../src/analyze.js';
import { generateSpectrogram, SpectrogramError } from '../src/spectrogram.js';
import { DOCUMENT_MAX_BYTES, MEDIA_MAX_BYTES } from '../src/limits.js';

test('文档 512 MiB 和媒体 2 GiB 大小边界统一生效，超限不调用解析工具', async t => {
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
        // A full-size valid PDF is exercised separately rather than allocating another 512 MiB here.
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

test('2 GiB 临界大小的有效 WAV 可读取参数，频谱仍单独限制解码内存', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'media-full-size-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'full-size.wav');
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(MEDIA_MAX_BYTES - 8, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
  header.writeUInt32LE(48_000, 24); header.writeUInt32LE(192_000, 28);
  header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(MEDIA_MAX_BYTES - 44, 40);
  const file = await open(path, 'w');
  try { await file.write(header); await file.truncate(MEDIA_MAX_BYTES); } finally { await file.close(); }
  const result = await analyzeFile(path);
  assert.equal(result.status, 'ok', JSON.stringify(result.issues));
  assert.equal(result.fields.find(item => item.key === 'file.sizeBytes')!.value, MEDIA_MAX_BYTES);
  const audio = result.streams.find(stream => stream.type === 'audio')!;
  assert.equal(audio.fields.find(item => item.key === 'audio.sampleRate')!.value, 48_000);
  await assert.rejects(generateSpectrogram(path, audio.index),
    error => error instanceof SpectrogramError && error.code === 'SPECTROGRAM_SIZE_LIMIT');
});

test('直接调用频谱 API 时也在工具启动前拒绝超过 2 GiB 的源文件', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'spectrum-source-limit-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'over.wav'); const file = await open(path, 'w');
  try { await file.truncate(MEDIA_MAX_BYTES + 1); } finally { await file.close(); }
  await assert.rejects(generateSpectrogram(path, 0, { ffprobePath: join(dir, 'missing') }),
    error => error instanceof SpectrogramError && error.code === 'FILE_SIZE_LIMIT');
});
