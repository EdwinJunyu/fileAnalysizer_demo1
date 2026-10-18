import { field, finiteNumber } from './fields.js';
import { resolve } from 'node:path';
import { runTool, ToolError } from './tools.js';
import type { AnalysisOptions, ExtractedMetadata, MetadataField } from './types.js';

type Tags = Record<string, unknown>;
type Tag = { name: string; value: unknown };
const source = (tag?: Tag): string => tag ? `ExifTool: ${tag.name}` : 'ExifTool';
const tagName = (name: string): string => name.slice(name.lastIndexOf(':') + 1);

function primaryImageTags(tags: Tags): Tags {
  // Numbered IFDs after IFD0 describe other pages or thumbnails. Their tags
  // remain in raw metadata, but must not fill gaps or conflict with the main
  // image's dimensions, colour, transparency, orientation or print density.
  return Object.fromEntries(Object.entries(tags).filter(([name]) =>
    !/^(?:IFD[1-9]\d*|Thumbnail[^:]*|Preview[^:]*):/.test(name)));
}

function find(tags: Tags, names: string[], groups?: RegExp): Tag | undefined {
  for (const name of names) {
    const match = Object.entries(tags).find(([key]) =>
      (key === name || (!name.includes(':') && tagName(key) === name)) &&
      (!groups || groups.test(key)));
    if (match) return { name: match[0], value: match[1] };
  }
  return undefined;
}

function text(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const items = value.map(text).filter((item): item is string => item !== undefined);
    return items.length ? items.join('; ') : undefined;
  }
  return undefined;
}

function positive(value: unknown): number | undefined {
  const number = finiteNumber(value);
  return number !== undefined && number > 0 ? number : undefined;
}

function addText(fields: MetadataField[], tags: Tags, key: string, label: string,
  names: string[], note?: string, groups?: RegExp): void {
  const tag = find(tags, names, groups);
  fields.push(field(key, label, text(tag?.value), source(tag), undefined, note));
}

interface Resolution {
  tag: Tag;
  dpi?: number;
  note: string;
}

function resolutions(tags: Tags, axis: 'X' | 'Y'): Resolution[] {
  const result: Resolution[] = [];
  for (const [name, value] of Object.entries(tags)) {
    const group = name.slice(0, name.lastIndexOf(':'));
    const tag = tagName(name);
    if (tag !== `${axis}Resolution` && tag !== `PixelsPerUnit${axis}`) continue;
    if (/^(System|File|Composite)/.test(group)) continue;
    const amount = positive(value);
    let factor: number | undefined;
    let explanation = '未记录可换算为英寸的物理单位';
    if (tag === `PixelsPerUnit${axis}` && /^PNG/.test(group)) {
      const unit = tags[`${group}:PixelUnits`];
      if (unit === 1 || unit === '1' || unit === 'meters') {
        factor = 0.0254;
        explanation = '由每米像素数 × 0.0254 换算';
      }
    } else if (group === 'Photoshop') {
      // Photoshop stores these fixed-point values in pixels/inch. Its
      // DisplayedUnits tags change display preferences, not the stored unit.
      factor = 1;
      explanation = 'Photoshop ResolutionInfo 按像素/英寸记录';
    } else {
      const unit = tags[`${group}:ResolutionUnit`];
      const numericUnit = finiteNumber(unit);
      const unitText = typeof unit === 'string' ? unit.toLowerCase() : '';
      if ((group === 'JFIF' && numericUnit === 1) ||
          (group !== 'JFIF' && numericUnit === 2) || /^(inches|inch|in)$/.test(unitText)) {
        factor = 1;
        explanation = '文件按像素/英寸记录';
      } else if ((group === 'JFIF' && numericUnit === 2) ||
                 (group !== 'JFIF' && numericUnit === 3) || /^(cm|centimeters)$/.test(unitText)) {
        factor = 2.54;
        explanation = '由每厘米像素数 × 2.54 换算';
      }
    }
    result.push({ tag: { name, value }, dpi: amount !== undefined && factor !== undefined
      ? amount * factor : undefined, note: amount === undefined ? '分辨率记录不是有效正数' : explanation });
  }
  return result;
}

function dpiField(tags: Tags, axis: 'X' | 'Y'): MetadataField {
  const records = resolutions(tags, axis);
  const valid = records.filter((record): record is Resolution & { dpi: number } => record.dpi !== undefined);
  const first = valid[0];
  if (!first) {
    return field(`image.dpi${axis}`, `${axis === 'X' ? '水平' : '垂直'} DPI`, null,
      records.length ? records.map(record => source(record.tag)).join('; ') : 'ExifTool', 'dpi',
      records.length ? records.map(record => `${record.tag.name}: ${record.note}`).join('; ')
        : '文件未记录可用的物理分辨率，不使用默认 72 DPI',
      records.length ? 'unknown' : 'missing');
  }
  // PNG pHYs stores integer pixels/metre, so allow its rounding difference.
  const conflict = valid.some(record => Math.abs(record.dpi - first.dpi) > Math.max(0.01, first.dpi * 0.0001));
  if (conflict) {
    return field(`image.dpi${axis}`, `${axis === 'X' ? '水平' : '垂直'} DPI`, null,
      valid.map(record => source(record.tag)).join('; '), 'dpi',
      `分辨率来源冲突：${valid.map(record => `${record.tag.name} = ${Number(record.dpi.toFixed(4))} dpi`).join('; ')}。未选择单一值`,
      'unknown');
  }
  const notes = [first.note, '文件记录的名义打印分辨率，不代表画质'];
  if (records.some(record => record.dpi === undefined)) notes.push('另有无有效物理单位的记录，详见原始元数据');
  return field(`image.dpi${axis}`, `${axis === 'X' ? '水平' : '垂直'} DPI`,
    Number(first.dpi.toFixed(6)), valid.map(record => source(record.tag)).join('; '), 'dpi', notes.join('; '));
}

function alphaField(tags: Tags): MetadataField {
  const colorType = find(tags, ['PNG:ColorType']);
  const pngType = finiteNumber(colorType?.value);
  const transparency = find(tags, ['PNG:Transparency', 'GIF:TransparentColor']);
  const used = find(tags, ['AlphaIsUsed']);
  const flags = find(tags, ['WebP_Flags']);
  const extras = find(tags, ['ExtraSamples']);
  let value: boolean | undefined;
  let tag: Tag | undefined;
  if (transparency) { value = true; tag = transparency; }
  else if (pngType !== undefined && [0, 2, 3, 4, 6].includes(pngType)) {
    value = pngType === 4 || pngType === 6; tag = colorType;
  } else if (used && finiteNumber(used.value) !== undefined) {
    value = finiteNumber(used.value) !== 0; tag = used;
  } else if (flags && finiteNumber(flags.value) !== undefined) {
    value = (Number(flags.value) & 0x10) !== 0; tag = flags;
  } else if (extras) {
    const values = Array.isArray(extras.value) ? extras.value : String(extras.value).split(/\s+/);
    if (values.some(value => value === 1 || value === 2 || value === '1' || value === '2')) {
      value = true; tag = extras;
    }
  }
  if (value === undefined && /^(JPEG|GIF)$/i.test(String(tags['File:FileType']))) {
    value = false; tag = { name: 'File:FileType', value: tags['File:FileType'] };
  }
  return field('image.hasAlpha', '透明通道/透明色', value, source(tag), undefined,
    '表示透明信息是否存在，不证明实际像素包含半透明内容', 'unknown');
}

function imageFields(tags: Tags): MetadataField[] {
  const fields: MetadataField[] = [];
  for (const [axis, label] of [['Width', '像素宽度'], ['Height', '像素高度']] as const) {
    const tag = find(tags, [`File:Image${axis}`, `PNG:Image${axis}`, `GIF:Image${axis}`,
      `IFD0:Image${axis}`, `RIFF:Image${axis}`, `Image${axis}`, `ExifImage${axis}`]);
    fields.push(field(`image.${axis.toLowerCase()}`, label, positive(tag?.value), source(tag), 'px'));
  }
  fields.push(dpiField(tags, 'X'), dpiField(tags, 'Y'));
  const depth = find(tags, ['PNG:BitDepth', 'BitsPerSample', 'BitDepth', 'BitsPerPixel']);
  const parts = (Array.isArray(depth?.value) ? depth.value : String(depth?.value ?? '').split(/\s+/))
    .map(positive).filter((value): value is number => value !== undefined);
  const uniqueDepths = [...new Set(parts)];
  const palette = depth && (tagName(depth.name) === 'BitsPerPixel' ||
    (depth.name === 'PNG:BitDepth' && finiteNumber(tags['PNG:ColorType']) === 3));
  fields.push(field('image.bitDepth', '位深', uniqueDepths.length === 1 ? uniqueDepths[0]
    : uniqueDepths.length ? uniqueDepths.join('/') : undefined, source(depth), palette ? 'bit/pixel' : 'bit/channel',
    palette ? '调色板索引位数' : '每通道位数；多个不同值按原始通道列出'));
  const color = find(tags, ['ColorSpace', 'PNG:ColorType', 'PhotometricInterpretation', 'ColorMode']);
  let colorValue = text(color?.value);
  if (color && tagName(color.name) === 'ColorSpace') {
    colorValue = ({ 1: 'sRGB', 2: 'Adobe RGB', 65535: 'Uncalibrated' } as Record<string, string>)[String(color.value)] ?? colorValue;
  } else if (color?.name === 'PNG:ColorType') {
    colorValue = ({ 0: 'Grayscale', 2: 'RGB', 3: 'Palette', 4: 'Grayscale + Alpha', 6: 'RGBA' } as Record<string, string>)[String(color.value)] ?? colorValue;
  } else if (color && tagName(color.name) === 'PhotometricInterpretation') {
    colorValue = ({ 0: 'WhiteIsZero', 1: 'BlackIsZero', 2: 'RGB', 3: 'Palette', 5: 'CMYK', 6: 'YCbCr', 8: 'CIELab' } as Record<string, string>)[String(color.value)] ?? colorValue;
  }
  fields.push(field('image.colorSpace', '色彩空间/模式', colorValue, source(color)), alphaField(tags));
  addText(fields, tags, 'image.iccProfile', 'ICC 配置描述', ['ProfileDescription']);
  addText(fields, tags, 'image.orientation', '方向记录', ['IFD0:Orientation', 'Orientation'], 'ExifTool 数值代码；未对像素执行旋转');
  return fields;
}

function officeFields(tags: Tags): MetadataField[] {
  const fields: MetadataField[] = [];
  const subtype = text(tags['File:FileType'])?.toUpperCase();
  const applicable: Record<string, string[]> = {
    pageCount: ['DOCX'], wordCount: ['DOCX', 'PPTX'], sheetCount: ['XLSX'],
    slideCount: ['PPTX'], characterCount: ['DOCX', 'PPTX'],
    charactersWithSpaces: ['DOCX'], paragraphCount: ['DOCX'],
    lineCount: ['DOCX'], hiddenSlideCount: ['PPTX'],
  };
  // Explicitly exclude System/ZIP/File times; those describe the container,
  // not the creation or modification of the Office document itself.
  const documentGroups = /^(XML:|XMP-|Microsoft:|FlashPix:)/;
  for (const [key, label, names] of [
    ['creator', '作者', ['Creator', 'Author']],
    ['createdAt', '文档创建时间', ['CreateDate']],
    ['modifiedAt', '文档修改时间', ['ModifyDate']],
    ['lastModifiedBy', '最后修改者', ['LastModifiedBy']],
    ['application', '创建应用', ['Application', 'Software']],
    ['appVersion', '应用版本', ['AppVersion']],
    ['company', '公司', ['Company']],
    ['revision', '修订记录', ['RevisionNumber']],
  ] as const) {
    addText(fields, tags, `office.${key}`, label, [...names], undefined, documentGroups);
  }
  const savedNote = '文档保存的统计属性，可能过时；未重新排版或计算';
  for (const [key, label, names, unit] of [
    ['pageCount', '保存的页数', ['Pages', 'PageCount'], 'pages'],
    ['wordCount', '保存的字数', ['Words', 'WordCount'], 'words'],
    ['sheetCount', '保存的工作表数量', ['Worksheets', 'SheetCount'], 'sheets'],
    ['slideCount', '保存的幻灯片数量', ['Slides', 'SlideCount'], 'slides'],
    ['characterCount', '保存的字符数', ['Characters'], 'characters'],
    ['charactersWithSpaces', '保存的含空格字符数', ['CharactersWithSpaces'], 'characters'],
    ['paragraphCount', '保存的段落数', ['Paragraphs'], 'paragraphs'],
    ['lineCount', '保存的行数', ['Lines'], 'lines'],
    ['hiddenSlideCount', '保存的隐藏幻灯片数量', ['HiddenSlides'], 'slides'],
  ] as const) {
    const tag = find(tags, [...names], documentGroups);
    const count = finiteNumber(tag?.value);
    fields.push(field(`office.${key}`, label,
      count !== undefined && Number.isInteger(count) && count >= 0 ? count : undefined,
      source(tag), unit, savedNote,
      subtype && ['DOCX', 'XLSX', 'PPTX'].includes(subtype) && !applicable[key]?.includes(subtype)
        ? 'not_applicable' : 'missing'));
  }
  return fields;
}

/** Normalize one ExifTool JSON record, retaining every original tag for details. */
export function normalizeExifMetadata(tags: Tags, category: 'image' | 'office'): ExtractedMetadata {
  const fieldTags = category === 'image' ? primaryImageTags(tags) : tags;
  const fields = category === 'image' ? imageFields(fieldTags) : officeFields(fieldTags);
  for (const [key, label, names] of [
    ['title', '标题', ['XML:Title', 'XMP-dc:Title', 'Title']],
    ['subject', '主题', ['XML:Subject', 'XMP-dc:Subject', 'Subject']],
    ['description', '描述', ['XML:Description', 'XMP-dc:Description', 'ImageDescription', 'Description']],
    ['keywords', '关键词', ['XML:Keywords', 'XMP-pdf:Keywords', 'Keywords']],
  ] as const) addText(fields, fieldTags, `document.${key}`, label, [...names]);
  const issues = [];
  for (const [name, value] of Object.entries(tags)) {
    if (/^(Warning|Error)$/.test(tagName(name))) {
      issues.push({ code: tagName(name) === 'Error' ? 'EXIFTOOL_ERROR' : 'EXIFTOOL_WARNING',
        message: text(value) ?? 'ExifTool 报告无法解析的元数据', tool: 'exiftool' });
    }
  }
  if (fields.some(item => item.key.startsWith('image.dpi') && item.note?.startsWith('分辨率来源冲突'))) {
    issues.push({ code: 'CONFLICTING_RESOLUTION', message: '图片包含互相冲突的 DPI 元数据，详见字段来源和原始元数据', tool: 'exiftool' });
  }
  return { fields, rawMetadata: tags, issues };
}

export async function extractExif(path: string, category: 'image' | 'office', options: AnalysisOptions): Promise<ExtractedMetadata> {
  const { stdout } = await runTool('exiftool', ['-charset', 'filename=UTF8', '-json', '-n', '-G1', resolve(path)], options);
  let parsed: unknown;
  try { parsed = JSON.parse(stdout); }
  catch { throw new ToolError('INVALID_TOOL_OUTPUT', 'ExifTool 未返回有效 JSON 元数据', 'exiftool'); }
  if (!Array.isArray(parsed) || parsed.length !== 1 || !parsed[0] ||
      typeof parsed[0] !== 'object' || Array.isArray(parsed[0])) {
    throw new ToolError('INVALID_TOOL_OUTPUT', 'ExifTool 未返回单个文件的 JSON 元数据记录', 'exiftool');
  }
  return normalizeExifMetadata(parsed[0] as Tags, category);
}
