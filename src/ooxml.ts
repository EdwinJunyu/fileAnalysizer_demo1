import type { Readable } from 'node:stream';
import { open, type ZipFile } from 'yauzl';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const MAX_ENTRIES = 20_000;
const MAX_PART_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
export type XmlNode = Record<string, unknown>;

/** Read only selected XML parts in memory; never extract archive paths to disk. */
export async function readParts(path: string, selected: Set<string>, timeoutMs: number): Promise<{
  parts: Map<string, Buffer>;
  entryNames: Set<string>;
}> {
  return new Promise((resolve, reject) => {
    const parts = new Map<string, Buffer>();
    const entryNames = new Set<string>();
    let zip: ZipFile | undefined;
    let entries = 0;
    let entryNameBytes = 0;
    let total = 0;
    let active: Readable | undefined;
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      active?.destroy();
      zip?.close();
      if (error) reject(error);
      else resolve({ parts, entryNames });
    };
    const timer = setTimeout(() => finish(new Error(`OOXML 读取超时（${timeoutMs} ms）`)), timeoutMs);
    // Start the deadline before opening, and close handles that arrive after it expires.
    open(path, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, opened) => {
      if (finished) { opened?.close(); return; }
      if (error) return finish(error);
      if (!opened) return finish(new Error('无法打开 OOXML ZIP'));
      zip = opened;
      opened.on('error', finish);
      opened.on('end', () => finish());
      opened.on('entry', entry => {
        if (finished) return;
        if (++entries > MAX_ENTRIES) return finish(new Error(`OOXML ZIP 条目超过 ${MAX_ENTRIES} 个的解析上限`));
        entryNameBytes += Buffer.byteLength(entry.fileName, 'utf8');
        if (entryNameBytes > MAX_TOTAL_BYTES) return finish(new Error('OOXML ZIP 条目名称总大小超过 12 MiB 上限'));
        entryNames.add(entry.fileName);
        if (!selected.has(entry.fileName)) return opened.readEntry();
        if (parts.has(entry.fileName)) return finish(new Error(`OOXML 包含重复部件：${entry.fileName}`));
        if (entry.uncompressedSize > MAX_PART_BYTES || total + entry.uncompressedSize > MAX_TOTAL_BYTES) {
          return finish(new Error('OOXML 所需 XML 部件超过解压大小上限（单部件 4 MiB，总计 12 MiB）'));
        }
        opened.openReadStream(entry, (error, stream) => {
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
            opened.readEntry();
          });
        });
      });
      opened.readEntry();
    });
  });
}

export function parsePart(buffer: Buffer, expectedRoot: string, namespace?: string): XmlNode {
  const encoding = (buffer[0] === 0xff && buffer[1] === 0xfe) || (buffer[0] === 0x3c && buffer[1] === 0)
    ? 'utf-16le' : (buffer[0] === 0xfe && buffer[1] === 0xff) || (buffer[0] === 0 && buffer[1] === 0x3c)
      ? 'utf-16be' : 'utf-8';
  const xml = new TextDecoder(encoding, { fatal: true }).decode(buffer);
  // OOXML metadata needs no DTD. Reject declarations rather than expanding untrusted entities.
  if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(xml)) throw new Error('不接受含 DTD 或实体声明的 XML');
  const validation = XMLValidator.validate(xml);
  if (validation !== true) throw new Error(`XML 格式无效：${validation.err.msg}`);
  const parsed: unknown = new XMLParser({
    ignoreAttributes: false, removeNSPrefix: namespace === undefined, parseTagValue: false,
    isArray: name => ['sheet', 'sldId', 'Override'].includes(name.split(':').at(-1)!),
  }).parse(xml);
  if (!isNode(parsed)) throw new Error(`缺少 XML 根元素 ${expectedRoot}`);
  const roots = Object.keys(parsed).filter(name => !name.startsWith('?') && !name.startsWith('@_') && name !== '#text');
  const rootName = roots[0];
  if (roots.length !== 1 || rootName?.split(':').at(-1) !== expectedRoot) {
    throw new Error(`缺少 XML 根元素 ${expectedRoot}`);
  }
  const root = parsed[rootName!];
  if (root === '' && namespace === undefined) return {};
  if (!isNode(root)) throw new Error(`XML 根元素 ${expectedRoot} 结构无效`);
  if (namespace) {
    const prefix = rootName!.includes(':') ? rootName!.split(':')[0] : undefined;
    if (root[prefix ? `@_xmlns:${prefix}` : '@_xmlns'] !== namespace) throw new Error('XML 命名空间无效');
  }
  return root;
}

export function isNode(value: unknown): value is XmlNode {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

