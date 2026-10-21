import type { MediaStream, MetadataField } from '../types.js';
import { getLocale, t, type Locale } from '../i18n/index.js';

/** Shared by detail and comparison tables; explanations never change recorded values. */
const explanations: Readonly<Record<string, string>> = {
  'file.type': '格式按文件内容识别，扩展名只作回退提示。容器格式与其中的音视频编码可能不同。',
  'file.sizeBytes': '文件在磁盘中占用的大小，包含压缩数据、容器和元数据。显示为 MB 或 GB（十进制），1 GB = 1000 MB。',
  'file.createdAt': '文件系统记录的创建时间。复制、下载或迁移可能改变它，不能据此确定作品的创作时间。',
  'file.modifiedAt': '文件系统记录的最后修改时间，与文档内部保存的修改时间可能不同。',
  'media.duration': '容器报告的文件时长。各轨道可能有不同起点和长度，不能代替实际解码后的时长。',
  'stream.duration': '当前轨道报告的时长。它可能与容器时长不同，也不代表已完成整条轨道的解码校验。',
  'media.bitRate': '整个文件每秒的数据量，通常包含多个轨道及容器开销。码率高不一定意味着画质或音质更好。',
  'stream.bitRate': '当前轨道每秒的数据量。可变码率内容的瞬时码率会变化，不能单凭码率判断质量。',
  'stream.codec': '编码决定数据如何压缩或存储，例如 FLAC、AAC、H.264。MP4、MKV 等容器可以容纳不同编码。',
  'audio.sampleRate': '每秒每声道的采样次数，单位 Hz。48,000 Hz 表示每秒 48,000 次采样；提高采样率不会恢复已丢失的高频。',
  'audio.bitDepth': 'PCM 每个采样的精度，影响可表示的动态范围。它不是码率；有损音频的解码格式不能证明原始位深。',
  'audio.channels': '独立音频声道的数量，例如单声道为 1、立体声通常为 2。声道数不能单独说明具体的声道布局。',
  'audio.channelLayout': '声道在空间中的分配，例如左右声道或 5.1 环绕。声道数量相同也可能采用不同布局。',
  'audio.losslessEncoding': '表示当前编码是否无损。FLAC 等无损编码无法证明音源此前没有经历有损压缩。',
  'image.width': '画面水平方向的像素数量。对比视频时取首个非封面视频轨道；图片打印尺寸还取决于目标像素密度。',
  'image.height': '画面垂直方向的像素数量。对比视频时取首个非封面视频轨道；像素数量不等同于纸张上的厘米尺寸。',
  'image.dpiX': '文件记录的水平物理分辨率。显示为 DPI；用于打印尺寸换算时按每英寸像素数理解。缺失或冲突时不假设为 72。',
  'image.dpiY': '文件记录的垂直物理分辨率。它可能与水平值不同；用途计算使用你明确输入的统一目标 DPI。',
  'image.bitDepth': '图像采样的精度。具体是每通道还是整体位数，以字段来源和说明为准，不能直接当作音频位深。',
  'image.colorSpace': '描述颜色的表示方式。色彩空间名称并不能替代完整 ICC 配置和输出设备的色彩管理。',
  'video.width': '视频画面的水平像素数量。实际显示比例还可能受到像素宽高比和旋转信息影响。',
  'video.height': '视频画面的垂直像素数量。分辨率较高并不保证素材清晰，编码与源素材也会影响细节。',
  'video.frameRate': '平均每秒帧数。可变帧率视频的帧间隔可能不同；平均帧率相同不代表时间节奏完全相同。',
  'video.bitDepth': '视频颜色采样的精度。10 bit 能表示更多等级，但不能单凭位深确定 HDR 或实际画质。',
  'office.pageCount': '来自文档保存的页数统计，可能过时。本工具没有重新排版，换字体或纸张设置可能改变页数。',
  'office.wordCount': '来自文档保存的字数统计，可能过时；不同办公软件的统计口径也可能不同。',
  'office.sheetCount': '读取到的工作表数量，不代表每张表都有内容，也不能替代打印页数。',
  'office.slideCount': '读取到的幻灯片数量，不代表播放时一定展示全部页面。',
  'pdf.pageCount': '页面结构解析成功时按页面树计数。加密或结构未读完时，可能只能显示工具报告值，请结合字段来源和解析问题。',
  'pdf.encrypted': '表示检测到 PDF 的加密字典，不等同于必须输入打开密码。加密文档不解密页面结构，也不尝试绕过访问限制。',
  'pdf.version': 'PDF 格式的版本声明，不是创建应用版本，也不能据此判断文件安全性。',
  'pdf.author': 'PDF 文档属性中的作者，由文件生成者填写，可能过时或被修改。分享前可在隐私元数据检查中核对。',
};

export function parameterExplanation(key: string): string | undefined {
  // Comparison aliases refer to the same concepts as the detailed stream fields.
  const canonicalKey = key === 'media.codec' ? 'stream.codec' : key;
  return Object.hasOwn(explanations, canonicalKey) ? t(explanations[canonicalKey]!) : undefined;
}

export function positiveField(fields: MetadataField[], key: string): number | undefined {
  const field = fields.find(item => item.key === key);
  return field?.status === 'present' && typeof field.value === 'number' &&
    Number.isFinite(field.value) && field.value > 0 ? field.value : undefined;
}

export function printDimensions(width: number | undefined, height: number | undefined, dpiText: string, inputLocale: Locale = getLocale()):
  { widthCm: number; heightCm: number; dpi: number } | { error: string; invalidDpi: boolean } {
  // Accept ordinary decimal input, not JS number literals, exponents or partially parsed text.
  let text = dpiText.trim().normalize('NFKC');
  if (['fr-FR', 'es-ES'].includes(inputLocale)) text = text.replace(',', '.');
  const dpi = /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : NaN;
  if (!Number.isFinite(dpi) || dpi < 1 || dpi > 9600) {
    return { error: '请输入 1 至 9600 之间的目标 DPI，可使用小数。', invalidDpi: true };
  }
  if (!width || !height || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
    width < 0 || height < 0) {
    return { error: '未读取到有效的像素宽度和高度，无法换算打印尺寸。', invalidDpi: false };
  }
  return { widthCm: width / dpi * 2.54, heightCm: height / dpi * 2.54, dpi };
}

export function pcmEstimate(stream: MediaStream):
  { bitRate: number; bytesPerMinute: number; totalBytes?: number; duration?: number } | { error: string } {
  if (stream.type !== 'audio') return { error: '仅音频轨道可估算 PCM 数据量。' };
  const rate = positiveField(stream.fields, 'audio.sampleRate');
  const bits = positiveField(stream.fields, 'audio.bitDepth');
  const channels = positiveField(stream.fields, 'audio.channels');
  if (![rate, bits, channels].every(value => value !== undefined && Number.isSafeInteger(value))) {
    return { error: '缺少有效的采样率、位深或声道数，无法估算；不使用默认值替代。' };
  }
  const bitRate = rate! * bits! * channels!;
  const bytesPerMinute = Math.ceil(bitRate * 60 / 8);
  if (!Number.isSafeInteger(bitRate) || !Number.isSafeInteger(bytesPerMinute)) {
    return { error: '参数超出可可靠计算的范围，无法估算。' };
  }
  const duration = positiveField(stream.fields, 'stream.duration');
  const totalBytes = duration === undefined ? undefined : Math.ceil(bitRate * duration / 8);
  return { bitRate, bytesPerMinute,
    ...(totalBytes !== undefined && Number.isSafeInteger(totalBytes) ? { totalBytes, duration } : {}) };
}
