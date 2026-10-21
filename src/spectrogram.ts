import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { validateTimeout } from './options.js';
import { runTool } from './tools.js';
import { fileSizeIssue } from './limits.js';
import { SPECTRUM_STYLE } from './spectrum-style.js';
import type { AnalysisOptions, SpectrogramResult } from './types.js';

const { width: WIDTH, height: HEIGHT, color, minDb, maxDb } = SPECTRUM_STYLE;
// showspectrumpic retains floating-point samples until EOF. Reject oversized
// jobs before decoding, and impose a decoded sample limit before the filter too.
const MAX_PCM_BYTES = 256 * 1024 * 1024;
const MAX_PNG_BYTES = 4 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export class SpectrogramError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'SpectrogramError';
  }
}

function positiveNumber(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function streamDuration(stream: Record<string, unknown>): number | undefined {
  const duration = positiveNumber(stream.duration);
  if (duration) return duration;
  // Matroska commonly stores per-track durations in a DURATION tag instead.
  const tags = record(stream.tags);
  const tag = tags?.DURATION ?? tags?.duration;
  if (typeof tag === 'string') {
    const match = /^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(tag);
    if (match) {
      // FFmpeg's Matroska DURATION tag is an end timestamp, not elapsed audio.
      const start = Number(stream.start_time ?? 0);
      const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) -
        (Number.isFinite(start) ? start : 0);
      if (Number.isFinite(seconds) && seconds > 0) return seconds;
    }
  }
  return undefined;
}

/**
 * Generate an offline, full-duration overview of one global FFprobe audio index.
 * Color represents log amplitude (-120..0 dBFS); time and frequency are linear.
 * Channels are combined by showspectrumpic, preserving the original sample rate.
 */
export async function generateSpectrogram(
  path: string, streamIndex: number, options: AnalysisOptions = {},
): Promise<SpectrogramResult> {
  const timeoutMs = validateTimeout(options.timeoutMs ?? 120_000);
  if (!Number.isSafeInteger(streamIndex) || streamIndex < 0 || streamIndex > 2_147_483_647) {
    throw new SpectrogramError('SPECTROGRAM_INVALID_STREAM', '请选择有效的音频轨道。');
  }
  const absolutePath = resolve(path);
  const info = await stat(absolutePath);
  if (!info.isFile()) {
    throw new SpectrogramError('SPECTROGRAM_INVALID_FILE', '频谱只能分析本地普通文件。');
  }
  const sizeIssue = fileSizeIssue('audio', info.size);
  if (sizeIssue) throw new SpectrogramError(sizeIssue.code, sizeIssue.message);
  const toolOptions = { ...options, timeoutMs };
  const probe = await runTool('ffprobe', [
    '-v', 'error', '-show_streams', '-show_format', '-of', 'json',
    '-protocol_whitelist', 'file,pipe', '-i', absolutePath,
  ], toolOptions);
  let metadata: Record<string, unknown> | undefined;
  try { metadata = record(JSON.parse(probe.stdout)); } catch { /* handled below */ }
  if (!metadata || probe.stderr.trim()) {
    throw new SpectrogramError('SPECTROGRAM_INVALID_MEDIA', '无法可靠读取音频参数，请检查文件是否损坏。');
  }
  const streams = Array.isArray(metadata.streams) ? metadata.streams : [];
  const stream = streams.map(record).find(candidate => candidate?.index === streamIndex);
  if (!stream || stream.codec_type !== 'audio') {
    throw new SpectrogramError('SPECTROGRAM_INVALID_STREAM', '所选轨道不是音频轨道，或已不存在。');
  }
  const sampleRateHz = positiveNumber(stream.sample_rate);
  const channels = positiveNumber(stream.channels);
  const estimatedDuration = streamDuration(stream);
  if (!sampleRateHz || !Number.isInteger(sampleRateHz) || !channels || !Number.isInteger(channels)) {
    throw new SpectrogramError('SPECTROGRAM_UNKNOWN_PARAMETERS', '无法确定该音轨的采样率或声道数，暂时无法生成频谱。');
  }
  if (estimatedDuration && sampleRateHz * channels * estimatedDuration * 4 > MAX_PCM_BYTES) {
    throw new SpectrogramError('SPECTROGRAM_SIZE_LIMIT', '该音轨过长或声道过多，频谱内存预计超过 256 MiB。请先截取较短片段；文件参数仍可查看。');
  }
  const maxSamples = Math.floor(MAX_PCM_BYTES / (channels * 4));
  const directory = await mkdtemp(join(tmpdir(), 'file-analyzer-spectrum-'));
  try {
    const imagePath = join(directory, 'spectrum.png');
    const output = await runTool('ffmpeg', [
      '-hide_banner', '-v', 'info', '-nostats', '-nostdin', '-xerror', '-y',
      '-threads', '1', '-protocol_whitelist', 'file,pipe', '-i', absolutePath,
      '-filter_complex_threads', '1', '-filter_complex',
      `[0:${streamIndex}]atrim=end_sample=${maxSamples + 1},` +
        'astats=metadata=0:reset=0:measure_perchannel=none:measure_overall=Number_of_samples,' +
        `showspectrumpic=s=${WIDTH}x${HEIGHT}:legend=0:mode=combined:color=${color}:scale=log:fscale=lin:drange=${maxDb - minDb}:limit=${maxDb},` +
        'scale=in_range=full:in_color_matrix=bt601,format=rgb24[spectrum]',
      '-map', '[spectrum]',
      '-frames:v', '1', '-threads', '1', '-c:v', 'png', '-pix_fmt', 'rgb24',
      '-update', '1', imagePath,
    ], toolOptions);
    // Count decoded samples, not container duration or possibly-offset timestamps.
    // Keep one extra sample so a limit hit can never be returned as a full graph.
    const counts = [...output.stderr.matchAll(/^\[Parsed_astats_\d+[^\]]*\] Number of samples: (\d+)\s*$/gm)];
    // Reinitialization discards the buffered spectrum and resets astats. Never
    // present the last segment as the complete track under its original axes.
    if (/^\[fc#\d+ @[^\]\r\n]+\] Reconfiguring filter graph\b/m.test(output.stderr) || counts.length > 1) {
      throw new SpectrogramError('SPECTROGRAM_PARAMETERS_CHANGED',
        '音轨中途改变了采样率、声道布局或采样格式，暂不支持生成完整频谱。请先统一音轨参数后重试；文件参数仍可查看。');
    }
    const samples = counts.length ? Number(counts[0]![1]) : NaN;
    if (!Number.isSafeInteger(samples) || samples <= 0) {
      throw new SpectrogramError('SPECTROGRAM_INVALID_OUTPUT', '无法确认频谱覆盖的实际音频时长。');
    }
    if (samples > maxSamples) {
      throw new SpectrogramError('SPECTROGRAM_SIZE_LIMIT', '该音轨实际解码数据超过 256 MiB。请先截取较短片段；文件参数仍可查看。');
    }
    const durationSeconds = samples / sampleRateHz;
    if ((await stat(imagePath)).size > MAX_PNG_BYTES) {
      throw new SpectrogramError('SPECTROGRAM_OUTPUT_LIMIT', '频谱图像超过允许大小。');
    }
    const png = await readFile(imagePath);
    if (!png.subarray(0, 8).equals(PNG_SIGNATURE) || png.length < 24 ||
      png.readUInt32BE(16) !== WIDTH || png.readUInt32BE(20) !== HEIGHT) {
      throw new SpectrogramError('SPECTROGRAM_INVALID_OUTPUT', 'FFmpeg 未生成有效的频谱图像。');
    }
    return { streamIndex, imageDataUrl: `data:image/png;base64,${png.toString('base64')}`,
      width: WIDTH, height: HEIGHT, sampleRateHz, durationSeconds, channels };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
