import { isNode, parsePart, readParts, type XmlNode } from './ooxml.js';
import { extractExif, normalizeExifMetadata } from './exif.js';
import { field, finiteNumber } from './fields.js';
import { ToolError } from './tools.js';
import { validateTimeout } from './options.js';
import type { AnalysisIssue, AnalysisOptions, ExtractedMetadata, MetadataField } from './types.js';

const SAVED_NOTE = '文档保存的统计属性，可能过时；未重新排版或计算';

function text(value: unknown): string | undefined {
  const content = isNode(value) ? value['#text'] : value;
  return typeof content === 'string' && content.trim() ? content.trim() : undefined;
}

function put(fields: MetadataField[], next: MetadataField, replace = false): void {
  const index = fields.findIndex(item => item.key === next.key);
  if (index < 0) fields.push(next);
  else if (replace || (fields[index]!.status !== 'present' && next.status === 'present')) fields[index] = next;
}

/** ExifTool retains rich metadata; direct OOXML reads supplement saved properties and structural counts. */
export async function extractOffice(path: string, ext: string, options: AnalysisOptions): Promise<ExtractedMetadata> {
  const timeout = validateTimeout(options.timeoutMs);
  let extracted: ExtractedMetadata;
  try {
    extracted = await extractExif(path, 'office', options);
  } catch (error) {
    extracted = normalizeExifMetadata({ 'File:FileType': ext.toUpperCase() }, 'office');
    // The known format only selects applicable fields; it is not an ExifTool result.
    extracted.rawMetadata = {};
    extracted.issues!.push({ code: error instanceof ToolError ? error.code : 'EXIFTOOL_PARSE_FAILED',
      message: (error as Error).message, tool: 'exiftool' });
  }
  const fields = extracted.fields;
  const issues: AnalysisIssue[] = extracted.issues ??= [];
  const raw = extracted.rawMetadata ??= {};
  const part = ext === 'xlsx' ? 'xl/workbook.xml' : ext === 'pptx' ? 'ppt/presentation.xml' : undefined;
  const countKey = ext === 'xlsx' ? 'office.sheetCount' : ext === 'pptx' ? 'office.slideCount' : undefined;
  const countLabel = ext === 'xlsx' ? '工作表数量（含隐藏）' : '幻灯片数量';
  const countUnit = ext === 'xlsx' ? 'sheets' : 'slides';
  let parts: Map<string, Buffer>;
  try {
    ({ parts } = await readParts(path, new Set(['docProps/core.xml', 'docProps/app.xml', ...(part ? [part] : [])]), timeout));
  } catch (error) {
    issues.push({ code: 'OOXML_READ_FAILED', message: `无法读取 Office XML：${(error as Error).message}`, tool: 'ooxml' });
    if (countKey) put(fields, field(countKey, countLabel, null, `OOXML: ${part}`, countUnit,
      '未能读取文档结构，不使用可能过时的保存统计值', 'error'), true);
    return extracted;
  }

  const readXml = (name: string, root: string, required = false): XmlNode | undefined => {
    const data = parts.get(name);
    if (!data) {
      if (required) issues.push({ code: 'OOXML_PART_MISSING', message: `Office 包缺少必要部件：${name}`, tool: 'ooxml' });
      return undefined;
    }
    try {
      const node = parsePart(data, root);
      raw[`OOXML: ${name}`] = node;
      return node;
    } catch (error) {
      issues.push({ code: 'OOXML_PART_INVALID', message: `${name}：${(error as Error).message}`, tool: 'ooxml' });
      return undefined;
    }
  };
  const core = readXml('docProps/core.xml', 'coreProperties');
  if (core) {
    for (const [key, label, name] of [
      ['office.creator', '作者', 'creator'], ['office.createdAt', '文档创建时间', 'created'],
      ['office.modifiedAt', '文档修改时间', 'modified'], ['office.lastModifiedBy', '最后修改者', 'lastModifiedBy'],
      ['office.revision', '修订记录', 'revision'], ['document.title', '标题', 'title'],
      ['document.subject', '主题', 'subject'], ['document.description', '描述', 'description'],
      ['document.keywords', '关键词', 'keywords'],
    ]) put(fields, field(key!, label!, text(core[name!]), `OOXML: docProps/core.xml/${name}`));
  }
  const app = readXml('docProps/app.xml', 'Properties');
  if (app) {
    for (const [key, label, name] of [
      ['application', '创建应用', 'Application'], ['appVersion', '应用版本', 'AppVersion'], ['company', '公司', 'Company'],
    ]) put(fields, field(`office.${key}`, label!, text(app[name!]), `OOXML: docProps/app.xml/${name}`));
    for (const [key, label, name, unit] of [
      ['pageCount', '保存的页数', 'Pages', 'pages'], ['wordCount', '保存的字数', 'Words', 'words'],
      ['characterCount', '保存的字符数', 'Characters', 'characters'],
      ['charactersWithSpaces', '保存的含空格字符数', 'CharactersWithSpaces', 'characters'],
      ['paragraphCount', '保存的段落数', 'Paragraphs', 'paragraphs'], ['lineCount', '保存的行数', 'Lines', 'lines'],
      ['hiddenSlideCount', '保存的隐藏幻灯片数量', 'HiddenSlides', 'slides'],
    ]) {
      const count = finiteNumber(text(app[name!]));
      put(fields, field(`office.${key}`, label!, count !== undefined && Number.isInteger(count) && count >= 0 ? count : undefined,
        `OOXML: docProps/app.xml/${name}`, unit, SAVED_NOTE));
    }
  }

  if (part && countKey) {
    const node = readXml(part, ext === 'xlsx' ? 'workbook' : 'presentation', true);
    let count: number | undefined;
    if (node) {
      const list = node[ext === 'xlsx' ? 'sheets' : 'sldIdLst'];
      const items = isNode(list) ? list[ext === 'xlsx' ? 'sheet' : 'sldId'] : undefined;
      if (Array.isArray(items) && items.every(item => isNode(item) && text(item['@_id']))) count = items.length;
      // A presentation may legally have no slides; a workbook requires a sheets list.
      else if (ext === 'pptx' && (list === undefined || list === '')) count = 0;
      else issues.push({ code: 'OOXML_STRUCTURE_INVALID', message: `${part} 的${countLabel}结构无效，无法计数`, tool: 'ooxml' });
    }
    put(fields, field(countKey, countLabel, count, `OOXML: ${part}`, countUnit,
      ext === 'xlsx' ? '按 workbook.xml 的 sheet 条目计数，包含隐藏工作表；未打开或计算单元格'
        : '按 presentation.xml 的 sldId 条目计数，包含隐藏幻灯片；不计入母版和未引用部件',
      'error'), true);
  }
  return extracted;
}
