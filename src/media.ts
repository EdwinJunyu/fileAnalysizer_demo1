import { field, finiteNumber } from './fields.js';
import { runTool, ToolError } from './tools.js';
import type { AnalysisOptions, ExtractedMetadata, MediaStream, MetadataField } from './types.js';

type JsonRecord = Record<string, unknown>;
const text = (value: unknown) => typeof value === 'string' ? value : undefined;

function rational(value: unknown): number | undefined {
  if (typeof value !== 'string') return finiteNumber(value);
  const [numerator, denominator] = value.split('/').map(Number);
  return denominator === undefined ? finiteNumber(value)
    : numerator !== undefined && denominator !== 0 ? numerator / denominator : undefined;
}

function lossless(codec: string | undefined): boolean | undefined {
  if (!codec) return undefined;
  if (['pcm_mulaw', 'pcm_alaw'].includes(codec)) return false;
  if (codec.startsWith('pcm_') || ['flac', 'alac', 'ape', 'tta', 'truehd', 'mlp'].includes(codec)) return true;
  if (['mp3', 'mp2', 'aac', 'vorbis', 'opus', 'ac3', 'eac3', 'amr_nb', 'amr_wb'].includes(codec)) return false;
  // Some codecs (e.g. WavPack, DTS) have lossless and lossy variants.
  return undefined;
}

function mapStream(stream: JsonRecord, position: number): MediaStream {
  const index = finiteNumber(stream.index) ?? position;
  const type = text(stream.codec_type) ?? 'unknown';
  const source = `ffprobe.streams[${position}]`;
  const codec = text(stream.codec_name);
  const tags = stream.tags as JsonRecord | undefined;
  const disposition = stream.disposition as JsonRecord | undefined;
  const fields: MetadataField[] = [
    field('stream.codec', '编码格式', codec, source),
    field('stream.codecDescription', '编码说明', text(stream.codec_long_name), source),
    field('stream.profile', '编码配置', text(stream.profile), source),
    field('stream.duration', '轨道时长', finiteNumber(stream.duration), source, 's'),
    field('stream.bitRate', '轨道码率', finiteNumber(stream.bit_rate), source, 'bit/s'),
    field('stream.language', '语言', text(tags?.language), `${source}.tags`),
    field('stream.title', '轨道标题', text(tags?.title), `${source}.tags`),
    field('stream.attachedPicture', '附加封面图', disposition ? Boolean(disposition.attached_pic) : undefined,
      `${source}.disposition`),
  ];
  if (type === 'audio') {
    const bitDepth = finiteNumber(stream.bits_per_raw_sample) || finiteNumber(stream.bits_per_sample);
    const encodedLossless = lossless(codec);
    fields.push(
      field('audio.sampleRate', '采样率', finiteNumber(stream.sample_rate), source, 'Hz'),
      field('audio.channels', '声道数', finiteNumber(stream.channels), source),
      field('audio.channelLayout', '声道布局', text(stream.channel_layout), source),
      field('audio.bitDepth', '位深', encodedLossless !== false && bitDepth && bitDepth > 0 ? bitDepth : undefined, source, 'bit',
        '有损音轨的解码采样格式不等于原始位深。', encodedLossless === false ? 'not_applicable' : 'missing'),
      field('audio.losslessEncoding', '编码是否无损', encodedLossless, `${source}.codec_name`, undefined,
        '依据编码类型判断，不能证明音源未经历有损压缩。', 'unknown'),
      field('audio.sampleFormat', '解码采样格式', text(stream.sample_fmt), source),
    );
  }
  if (type === 'video') {
    const reportedFrames = rational(stream.avg_frame_rate);
    fields.push(
      field('video.width', '像素宽度', finiteNumber(stream.width), source, 'px'),
      field('video.height', '像素高度', finiteNumber(stream.height), source, 'px'),
      field('video.frameRate', '平均帧率', reportedFrames && reportedFrames > 0 ? reportedFrames : undefined,
        `${source}.avg_frame_rate`, 'fps', '平均帧率；可变帧率视频的各帧间隔可能不同。'),
      field('video.pixelFormat', '像素格式', text(stream.pix_fmt), source),
      field('video.colorSpace', '色彩空间', text(stream.color_space), source),
      field('video.colorPrimaries', '色彩原色', text(stream.color_primaries), source),
      field('video.bitDepth', '位深', finiteNumber(stream.bits_per_raw_sample), source, 'bit'),
      field('video.frameCount', '记录的帧数', finiteNumber(stream.nb_frames), source),
    );
  }
  return { index, type, fields };
}

export async function extractMedia(path: string, options: AnalysisOptions): Promise<ExtractedMetadata> {
  const { stdout, stderr } = await runTool('ffprobe', [
    '-v', 'error', '-show_error', '-show_format', '-show_streams', '-of', 'json',
    '-protocol_whitelist', 'file,pipe', '-i', path,
  ], options);
  let data: JsonRecord;
  try {
    data = JSON.parse(stdout) as JsonRecord;
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
  } catch {
    throw new ToolError('INVALID_TOOL_OUTPUT', 'ffprobe 未返回有效的 JSON 对象。', 'ffprobe');
  }
  if (!Array.isArray(data.streams) || data.streams.length === 0) {
    throw new ToolError('INVALID_MEDIA', '未读取到有效的媒体轨道。', 'ffprobe');
  }
  const format = (data.format ?? {}) as JsonRecord;
  const tags = format.tags as JsonRecord | undefined;
  return {
    fields: [
      field('media.container', '容器格式', text(format.format_name), 'ffprobe.format'),
      field('media.containerDescription', '容器说明', text(format.format_long_name), 'ffprobe.format'),
      field('media.duration', '文件时长', finiteNumber(format.duration), 'ffprobe.format', 's'),
      field('media.bitRate', '文件总码率', finiteNumber(format.bit_rate), 'ffprobe.format', 'bit/s'),
      field('media.streamCount', '媒体轨道数', data.streams.length, 'ffprobe.streams'),
      field('media.title', '标题', text(tags?.title), 'ffprobe.format.tags'),
      field('media.artist', '艺术家', text(tags?.artist), 'ffprobe.format.tags'),
      field('media.album', '专辑', text(tags?.album), 'ffprobe.format.tags'),
    ],
    streams: (data.streams as JsonRecord[]).map(mapStream),
    rawMetadata: data,
    // With -v error, diagnostics on stderr are real parsing errors even on exit 0.
    issues: stderr.trim() ? [{ code: 'FFPROBE_DIAGNOSTIC',
      message: `FFprobe 报告解析错误，已保留可读取的参数：${stderr.trim().slice(0, 1200)}`, tool: 'ffprobe' }] : [],
  };
}
