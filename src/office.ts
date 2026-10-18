import type { Readable } from 'node:stream';
import { openPromise } from 'yauzl';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { extractExif, normalizeExifMetadata } from './exif.js';
import { field, finiteNumber } from './fields.js';
import { ToolError } from './tools.js';
import { validateTimeout } from './options.js';
import type { AnalysisIssue, AnalysisOptions, ExtractedMetadata, MetadataField } from './types.js';

const MAX_ENTRIES = 20_000;
const MAX_PART_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
const SAVED_NOTE = '文档保存的统计属性，可能过时；未重新排版或计算';
type XmlNode = Record<string, unknown>;

/** Read only selected XML parts in memory; never extract archive paths to disk. */
async function readParts(path: string, selected: Set<string>, timeoutMs: number): Promise<Map<string, Buffer>> {
  const zip = await openPromise(path, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true });
  return new Promise((resolve, reject) => {
    const parts = new Map<string, Buffer>();
    let entries = 0;
    let total = 0;
    let active: Readable | undefined;
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      active?.destroy();
      zip.close();
      if (error) reject(error);
      else resolve(parts);
    };
    const timer = setTimeout(() => finish(new Error(`OOXML 读取超时（${timeoutMs} ms）`)), timeoutMs);
    zip.on('error', finish);
    zip.on('end', () => finish());
    zip.on('entry', entry => {
      if (finished) return;
      if (++entries > MAX_ENTRIES) return finish(new Error(`OOXML ZIP 条目超过 ${MAX_ENTRIES} 个的解析上限`));
      if (!selected.has(entry.fileName)) return zip.readEntry();
      if (parts.has(entry.fileName)) return finish(new Error(`OOXML 包含重复部件：${entry.fileName}`));
      if (entry.uncompressedSize > MAX_PART_BYTES || total + entry.uncompressedSize > MAX_TOTAL_BYTES) {
        return finish(new Error('OOXML 所需 XML 部件超过解压大小上限（单部件 4 MiB，总计 12 MiB）'));
      }
      zip.openReadStream(entry, (error, stream) => {
        if (finished) { stream?.destroy(); return; }
        if (error) return finish(error);
        active = stream;
        const chunks: Buffer[] = [];
        let size = 0;
        stream.on('error', finish);
        stream.on('data', (chunk: Buffer) => {
          size += chunk.length;
          total += chunk.length;
          if (size > MAX_PART_BYTES || total > MAX_TOTAL_BYTES) {
            finish(new Error('OOXML XML 实际解压数据超过允许大小'));
          } else chunks.push(chunk);
        });
        stream.on('end', () => {
          if (finished) return;
          parts.set(entry.fileName, Buffer.concat(chunks));
          active = undefined;
          zip.readEntry();
        });
      });
    });
    zip.readEntry();
  });
}

function parsePart(buffer: Buffer, expectedRoot: string): XmlNode {
  const encoding = buffer[0] === 0xff && buffer[1] === 0xfe ? 'utf-16le'
    : buffer[0] === 0xfe && buffer[1] === 0xff ? 'utf-16be' : 'utf-8';
  const xml = new TextDecoder(encoding, { fatal: true }).decode(buffer);
  // OOXML metadata needs no DTD. Reject declarations rather than expanding untrusted entities.
  if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(xml)) throw new Error('不接受含 DTD 或实体声明的 XML');
  const validation = XMLValidator.validate(xml);
  if (validation !== true) throw new Error(`XML 格式无效：${validation.err.msg}`);
  const parsed: unknown = new XMLParser({
    ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false,
    isArray: name => name === 'sheet' || name === 'sldId',
  }).parse(xml);
  if (!isNode(parsed) || !(expectedRoot in parsed)) throw new Error(`缺少 XML 根元素 ${expectedRoot}`);
  const root = parsed[expectedRoot];
  if (root === '') return {};
  if (!isNode(root)) throw new Error(`XML 根元素 ${expectedRoot} 结构无效`);
  return root;
}

function isNode(value: unknown): value is XmlNode {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

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
    parts = await readParts(path, new Set(['docProps/core.xml', 'docProps/app.xml', ...(part ? [part] : [])]), timeout);
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
