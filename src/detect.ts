import { extname } from 'node:path';
import { fileTypeFromFile } from 'file-type';
import type { DetectedType, FileCategory } from './types.js';
import { validateTimeout } from './options.js';

const audio = new Set(['mp3', 'flac', 'wav', 'aac', 'm4a', 'ogg', 'oga', 'opus']);
const video = new Set(['mp4', 'mkv', 'mov', 'webm', 'm4v', 'ogv']);
const image = new Set(['jpg', 'jpeg', 'png', 'webp', 'tif', 'tiff', 'gif', 'apng']);
const office = new Set(['docx', 'xlsx', 'pptx']);

function category(ext: string): FileCategory {
  if (audio.has(ext)) return 'audio';
  if (video.has(ext)) return 'video';
  if (image.has(ext)) return 'image';
  if (office.has(ext)) return 'office';
  return 'other';
}

export async function detectType(path: string, timeoutMs?: number): Promise<DetectedType> {
  const timeout = validateTimeout(timeoutMs);
  const detected = await fileTypeFromFile(path, {
    maxBufferSize: 1024 * 1024,
    signal: AbortSignal.timeout(timeout),
  });
  if (detected) {
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
