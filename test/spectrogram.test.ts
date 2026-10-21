import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { inflateSync } from 'node:zlib';
import { generateSpectrogram, SpectrogramError } from '../src/spectrogram.js';
import { ToolError, toolPath } from '../src/tools.js';
import { SPECTRUM_STYLE, spectrumColor } from '../src/spectrum-style.js';

const execFileAsync = promisify(execFile);

test('桌面色标与真实 FFmpeg intensity 色标在各 dB 档位一致', async () => {
  const { width, height, color, minDb, maxDb } = SPECTRUM_STYLE;
  const { stdout } = await execFileAsync(await toolPath('ffmpeg'), [
    '-hide_banner', '-v', 'error', '-nostdin', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono:d=0.1',
    '-filter_complex_threads', '1', '-lavfi',
    `showspectrumpic=s=${width}x${height}:legend=1:mode=combined:color=${color}:scale=log:fscale=lin:drange=${maxDb - minDb}:limit=${maxDb},` +
      // Sample the built-in legend independently of the desktop gradient.
      `crop=1:${height}:iw/2+${width / 2}+24:64,scale=in_range=full:in_color_matrix=bt601,format=rgb24`,
    '-frames:v', '1', '-threads', '1', '-f', 'rawvideo', 'pipe:1',
  ], { encoding: 'buffer', timeout: 30_000, maxBuffer: 1024 * 1024 });
  assert.equal(stdout.length, height * 3);
  for (const db of [-120, -100, -80, -60, -40, -20, 0]) {
    const row = Math.max(0, Math.min(height - 1, height - 1 - Math.round((db - minDb) / (maxDb - minDb) * height)));
    const expected = spectrumColor((height - 1 - row) / height);
    const actual = [...stdout.subarray(row * 3, row * 3 + 3)];
    for (let channel = 0; channel < 3; channel++) assert.ok(Math.abs(actual[channel]! - expected[channel]!) <= 2,
      `${db} dB: FFmpeg ${actual}, desktop ${expected}`);
  }
});

async function fixture(args: string[]): Promise<void> {
  await execFileAsync(await toolPath('ffmpeg'), [
    '-hide_banner', '-v', 'error', '-nostdin', '-y', '-threads', '1', ...args,
  ], { timeout: 30_000, maxBuffer: 1024 * 1024 });
}

/** Decode RGB PNG rows so the tests verify frequency placement, not just a file header. */
function peakFrequency(imageDataUrl: string, width: number, height: number, sampleRate: number,
  left = 0.25, right = 0.75): number {
  const png = Buffer.from(imageDataUrl.slice('data:image/png;base64,'.length), 'base64');
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png[24], 8, '8-bit PNG');
  assert.equal(png[25], 2, 'RGB PNG');
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const decoded = inflateSync(Buffer.concat(chunks));
  const stride = width * 3;
  let previous = Buffer.alloc(stride);
  let peak = 0;
  let strongest = -1;
  for (let row = 0; row < height; row++) {
    const start = row * (stride + 1);
    const filter = decoded[start]!;
    const pixels = Buffer.alloc(stride);
    for (let index = 0; index < stride; index++) {
      const left = pixels[index - 3] ?? 0;
      const up = previous[index]!;
      const upperLeft = previous[index - 3] ?? 0;
      let prediction = 0;
      if (filter === 1) prediction = left;
      else if (filter === 2) prediction = up;
      else if (filter === 3) prediction = Math.floor((left + up) / 2);
      else if (filter === 4) {
        const value = left + up - upperLeft;
        const distances = [Math.abs(value - left), Math.abs(value - up), Math.abs(value - upperLeft)];
        prediction = distances[0]! <= distances[1]! && distances[0]! <= distances[2]!
          ? left : distances[1]! <= distances[2]! ? up : upperLeft;
      } else assert.equal(filter, 0);
      pixels[index] = (decoded[start + 1 + index]! + prediction) & 255;
    }
    // Exclude the first/last columns, which can contain FFT boundary effects.
    let brightness = 0;
    for (let column = Math.floor(width * left); column < width * right; column++) {
      brightness += pixels[column * 3]! * 0.2126 + pixels[column * 3 + 1]! * 0.7152 + pixels[column * 3 + 2]! * 0.0722;
    }
    if (brightness > strongest) { strongest = brightness; peak = row; }
    previous = pixels;
  }
  return (height - 1 - peak) / height * sampleRate / 2;
}

test('真实多轨音视频按全局索引选择音轨，频谱峰值对应不同频率', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'file-analyzer-spectrum-test-'));
  try {
    const path = join(directory, '中文 $(touch SHOULD_NOT_EXIST); 音轨.mkv');
    await fixture([
      '-f', 'lavfi', '-i', 'color=size=16x16:rate=1:duration=0.5',
      '-f', 'lavfi', '-i', 'sine=frequency=1500:sample_rate=48000:duration=0.5',
      '-f', 'lavfi', '-i', 'sine=frequency=12000:sample_rate=48000:duration=0.5',
      '-map', '0:v:0', '-map', '1:a:0', '-map', '2:a:0', '-c:v', 'ffv1', '-c:a', 'pcm_s16le', path,
    ]);
    for (const [streamIndex, frequency] of [[1, 1500], [2, 12000]]) {
      const result = await generateSpectrogram(path, streamIndex!);
      assert.equal(result.streamIndex, streamIndex);
      assert.equal(result.width, 2400);
      assert.equal(result.height, 1488);
      assert.equal(result.sampleRateHz, 48000);
      assert.equal(result.channels, 1);
      assert.ok(Math.abs(result.durationSeconds - 0.5) < 0.01, 'use track duration rather than longer video/container');
      const peak = peakFrequency(result.imageDataUrl, result.width, result.height, result.sampleRateHz);
      assert.ok(Math.abs(peak - frequency!) < 120, `expected ${frequency}Hz, found ${peak}Hz`);
    }
    await assert.rejects(generateSpectrogram(path, 0), { code: 'SPECTROGRAM_INVALID_STREAM' });
    await assert.rejects(generateSpectrogram(path, 3), { code: 'SPECTROGRAM_INVALID_STREAM' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('高采样率频谱保留 60kHz 高频，不为节省资源降采样', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'file-analyzer-spectrum-high-'));
  try {
    const path = join(directory, 'high.wav');
    await fixture(['-f', 'lavfi', '-i', 'sine=frequency=60000:sample_rate=192000:duration=0.25', path]);
    const result = await generateSpectrogram(path, 0);
    assert.equal(result.sampleRateHz, 192000);
    const peak = peakFrequency(result.imageDataUrl, result.width, result.height, result.sampleRateHz);
    assert.ok(Math.abs(peak - 60000) < 400, `expected 60kHz, found ${peak}Hz`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('晚于视频开始的音轨以实际样本时长为横轴，不截掉有效音频', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'file-analyzer-spectrum-offset-'));
  try {
    const path = join(directory, 'late.mkv');
    await fixture([
      '-f', 'lavfi', '-i', 'color=size=16x16:rate=1:duration=3',
      '-itsoffset', '2', '-f', 'lavfi', '-i', 'sine=frequency=6000:sample_rate=48000:duration=0.5',
      '-map', '0:v', '-map', '1:a', '-c:v', 'ffv1', '-c:a', 'pcm_s16le', path,
    ]);
    const result = await generateSpectrogram(path, 1);
    assert.equal(result.durationSeconds, 0.5);
    assert.ok(Math.abs(peakFrequency(result.imageDataUrl, result.width, result.height, result.sampleRateHz) - 6000) < 120);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('链式 Ogg 中途改变采样率时明确拒绝，不返回末段的错误频谱', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'file-analyzer-spectrum-chain-'));
  try {
    const first = join(directory, 'first.ogg');
    const sameRate = join(directory, 'same-rate.ogg');
    const changedRate = join(directory, 'changed-rate.ogg');
    for (const [path, sampleRate, duration] of [
      [first, 48_000, 1], [sameRate, 48_000, 0.5], [changedRate, 96_000, 0.5],
    ] as const) {
      // The built-in encoder also exists in the LGPL bundle; no libvorbis is needed.
      await fixture(['-f', 'lavfi', '-i', `sine=frequency=1500:sample_rate=${sampleRate}:duration=${duration}`,
        '-ac', '2', '-c:a', 'vorbis', '-strict', 'experimental', path]);
    }
    const firstBytes = await readFile(first);
    const changed = join(directory, 'changed-chain.ogg');
    await writeFile(changed, Buffer.concat([firstBytes, await readFile(changedRate)]));
    await assert.rejects(generateSpectrogram(changed, 0), (error: unknown) =>
      error instanceof SpectrogramError && error.code === 'SPECTROGRAM_PARAMETERS_CHANGED' &&
      /采样率/.test(error.message));

    // Chaining alone is valid: unchanged parameters must retain both segments.
    const unchanged = join(directory, 'unchanged-chain.ogg');
    await writeFile(unchanged, Buffer.concat([firstBytes, await readFile(sameRate)]));
    const result = await generateSpectrogram(unchanged, 0);
    assert.equal(result.sampleRateHz, 48_000);
    assert.equal(result.channels, 2);
    assert.ok(Math.abs(result.durationSeconds - 1.5) < 0.05, `expected the complete chain, got ${result.durationSeconds}s`);
    assert.ok(Math.abs(peakFrequency(result.imageDataUrl, result.width, result.height, result.sampleRateHz) - 1500) < 120);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('伪造FLAC头部短时长仍按完整解码样本生成频谱', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'file-analyzer-spectrum-forged-'));
  try {
    const path = join(directory, 'forged.flac');
    await fixture(['-f', 'lavfi', '-i', 'anullsrc=r=192000:cl=7.1', '-t', '50', '-c:a', 'flac', '-compression_level', '0', path]);
    const flac = await readFile(path);
    assert.equal(flac.toString('ascii', 0, 4), 'fLaC');
    // STREAMINFO's low 36 bits declare total samples. Preserve sample rate,
    // channels and bit depth, but claim a single sample while retaining frames.
    const parameters = flac.readBigUInt64BE(18);
    flac.writeBigUInt64BE((parameters & ~((1n << 36n) - 1n)) | 1n, 18);
    await writeFile(path, flac);
    const result = await generateSpectrogram(path, 0);
    assert.equal(result.durationSeconds, 50);
    assert.equal(result.sampleRateHz, 192_000);
    assert.equal(result.channels, 8);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('超过旧 256 MiB 浮点预算的多声道音轨可流式生成完整频谱', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'file-analyzer-spectrum-large-'));
  try {
    const path = join(directory, 'large.flac');
    await fixture(['-f', 'lavfi', '-i', 'anullsrc=r=192000:cl=7.1', '-t', '50', '-c:a', 'flac', '-compression_level', '0', path]);
    const result = await generateSpectrogram(path, 0);
    assert.equal(result.durationSeconds, 50);
    assert.equal(result.sampleRateHz, 192_000);
    assert.equal(result.channels, 8);
    assert.equal(result.width, 2400);
    assert.equal(result.height, 1488);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('16 分 40 秒双声道音轨保留前后不同频率，生成 2400 像素完整频谱', { timeout: 90_000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'file-analyzer-spectrum-long-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, '完整长音轨.flac');
  await fixture(['-f', 'lavfi', '-i',
    'aevalsrc=0.1*sin(2*PI*if(lt(t\\,500)\\,1500\\,12000)*t):s=48000:d=1000',
    '-ac', '2', '-c:a', 'flac', path]);
  const spectrum = await generateSpectrogram(path, 0);
  assert.equal(spectrum.durationSeconds, 1000);
  assert.equal(spectrum.sampleRateHz, 48_000);
  assert.equal(spectrum.channels, 2);
  assert.equal(spectrum.width, 2400);
  assert.equal(spectrum.height, 1488);
  for (const [left, right, frequency] of [[0.05, 0.4, 1500], [0.6, 0.95, 12000]]) {
    const peak = peakFrequency(spectrum.imageDataUrl, spectrum.width, spectrum.height, spectrum.sampleRateHz, left, right);
    assert.ok(Math.abs(peak - frequency!) < 120, `expected ${frequency} Hz in ${left}–${right}, got ${peak} Hz`);
  }
});

test('频谱明确报告缺少FFmpeg、损坏媒体、非法索引及目录输入', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'file-analyzer-spectrum-fail-'));
  try {
    const path = join(directory, 'audio.wav');
    await fixture(['-f', 'lavfi', '-i', 'sine=duration=0.1', path]);
    await assert.rejects(generateSpectrogram(path, 0, { ffmpegPath: join(directory, 'absent-ffmpeg') }),
      (error: unknown) => error instanceof ToolError && error.code === 'TOOL_NOT_FOUND' && error.tool === 'ffmpeg');
    for (const index of [-1, 0.2, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
      await assert.rejects(generateSpectrogram(path, index), { code: 'SPECTROGRAM_INVALID_STREAM' });
    }
    await assert.rejects(generateSpectrogram(directory, 0), { code: 'SPECTROGRAM_INVALID_FILE' });
    const corrupt = join(directory, 'corrupt.wav');
    await writeFile(corrupt, 'broken audio');
    await assert.rejects(generateSpectrogram(corrupt, 0), (error: unknown) => error instanceof ToolError && error.code === 'TOOL_FAILED');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
