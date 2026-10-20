import { extname } from 'node:path';
import { fileTypeFromFile } from 'file-type';
import type { DetectedType, FileCategory } from './types.js';
import { validateTimeout } from './options.js';
import { isNode, parsePart, readParts, type XmlNode } from './ooxml.js';

const audio = new Set(['mp3', 'flac', 'wav', 'aac', 'm4a', 'ogg', 'oga', 'opus']);
const video = new Set(['mp4', 'mkv', 'mov', 'webm', 'm4v', 'ogv']);
const image = new Set(['jpg', 'jpeg', 'png', 'webp', 'tif', 'tiff', 'gif', 'apng']);
const office = new Set(['docx', 'xlsx', 'pptx']);
const TYPES_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';
const officeMime = new Map([
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
    { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
    { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }],
  ['application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml',
    { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }],
]);

/** Select immediate children in the expected namespace, including legal prefixed XML. */
function children(root: XmlNode, localName: string, namespace: string): XmlNode[] {
  return Object.entries(root).flatMap(([name, value]) => {
    if (name.split(':').at(-1) !== localName) return [];
    const prefix = name.includes(':') ? name.split(':')[0] : undefined;
    const declaration = prefix ? `@_xmlns:${prefix}` : '@_xmlns';
    return (Array.isArray(value) ? value : [value]).filter((child): child is XmlNode =>
      isNode(child) && (child[declaration] ?? root[declaration]) === namespace);
  });
}

function packagePart(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value || value.includes('\\') || /^[a-z][a-z\d+.-]*:/i.test(value)) return undefined;
  try {
    const url = new URL(value, 'https://ooxml.invalid/');
    if (url.origin !== 'https://ooxml.invalid' || url.search || url.hash) return undefined;
    return decodeURIComponent(url.pathname.slice(1));
  } catch { return undefined; }
}

/** Confirm a declared main document exists, without extracting document bodies or trusting the suffix. */
async function detectOfficePackage(path: string, timeout: number): Promise<DetectedType | undefined> {
  const { parts, entryNames } = await readParts(path, new Set(['[Content_Types].xml']), timeout);
  const contentTypes = parts.get('[Content_Types].xml');
  if (!contentTypes) return undefined;
  let types: XmlNode;
  try {
    types = parsePart(contentTypes, 'Types', TYPES_NS);
  } catch { return undefined; } // A valid ZIP with invalid OPC XML remains a ZIP.
  const candidates = children(types, 'Override', TYPES_NS).flatMap(override => {
    const mainPart = typeof override['@_PartName'] === 'string' && override['@_PartName'].startsWith('/')
      ? packagePart(override['@_PartName']) : undefined;
    const type = officeMime.get(String(override['@_ContentType']).toLowerCase());
    return type && mainPart && entryNames.has(mainPart) ? [type] : [];
  });
  const type = candidates.length === 1 ? candidates[0] : undefined;
  return type ? { ...type, category: 'office', source: 'signature' } : undefined;
}

function category(ext: string): FileCategory {
  if (audio.has(ext)) return 'audio';
  if (video.has(ext)) return 'video';
  if (image.has(ext)) return 'image';
  if (office.has(ext)) return 'office';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

export async function detectType(path: string, timeoutMs?: number): Promise<DetectedType> {
  const timeout = validateTimeout(timeoutMs);
  const started = Date.now();
  const detected = await fileTypeFromFile(path, {
    maxBufferSize: 1024 * 1024,
    signal: AbortSignal.timeout(timeout),
  });
  if (detected) {
    // file-type's XML string scan misses valid single-quoted attributes and UTF-16 XML.
    if (detected.ext === 'zip') {
      const remaining = timeout - (Date.now() - started);
      if (remaining <= 0) throw new Error(`内容识别超时（${timeout} ms）`);
      return await detectOfficePackage(path, remaining) ??
        { ext: 'zip', mime: 'application/zip', category: 'other', source: 'signature' };
    }
    return { ...detected, category: category(detected.ext), source: 'signature' };
  }
  // Only route damaged/unrecognized known formats by suffix; never claim content recognition.
  return typeFromExtension(path);
}

export function typeFromExtension(path: string): DetectedType {
  const ext = extname(path).slice(1).toLowerCase();
  return { ext: ext || null, mime: null, category: category(ext), source: ext ? 'extension' : 'unknown' };
}

export function sameExtension(left: string, right: string): boolean {
  const canonical = (ext: string) => ({ jpeg: 'jpg', tiff: 'tif', oga: 'ogg' })[ext] ?? ext;
  const actual = canonical(left);
  const detected = canonical(right);
  return actual === detected || (actual === 'ogg' && detected === 'opus') ||
    (actual === 'png' && detected === 'apng');
}
