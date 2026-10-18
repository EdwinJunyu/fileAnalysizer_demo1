import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { analyzeFile } from '../src/analyze.js';

interface Page {
  width: number;
  height: number;
  dpi: number;
  channels: 1 | 4;
  depth: 8 | 16;
  orientation?: number;
}

// Uncompressed little-endian TIFF pages with one strip each. Constructing the
// actual IFD chain exercises ExifTool's page grouping without a fixture binary
// or a separate image-generation dependency.
function tiff(pages: Page[]): Buffer {
  const header = Buffer.from([0x49, 0x49, 42, 0, 8, 0, 0, 0]);
  const chunks = [header];
  let offset = header.length;
  for (const [index, page] of pages.entries()) {
    const pixels = Buffer.alloc(page.width * page.height * page.channels * page.depth / 8);
    const entries: Array<[number, number, number[]]> = [
      [256, 4, [page.width]], [257, 4, [page.height]],
      [258, 3, Array<number>(page.channels).fill(page.depth)],
      [259, 3, [1]], [262, 3, [page.channels === 1 ? 1 : 2]],
      [273, 4, [0]], [277, 3, [page.channels]], [278, 4, [page.height]],
      [279, 4, [pixels.length]], [282, 5, [page.dpi, 1]],
      [283, 5, [page.dpi, 1]], [284, 3, [1]], [296, 3, [2]],
    ];
    if (page.orientation !== undefined) entries.push([274, 3, [page.orientation]]);
    if (page.channels === 4) entries.push([338, 3, [2]]);
    entries.sort(([a], [b]) => a - b);
    const directorySize = 2 + entries.length * 12 + 4;
    const dataSize = entries.reduce((sum, [, type, values]) => {
      const bytes = values.length * (type === 3 ? 2 : 4);
      return sum + (bytes > 4 ? bytes : 0);
    }, 0);
    const chunk = Buffer.alloc(directorySize + dataSize + pixels.length);
    const pixelOffset = offset + directorySize + dataSize;
    chunk.writeUInt16LE(entries.length);
    let dataOffset = directorySize;
    for (const [entryIndex, [tag, type, values]] of entries.entries()) {
      const entryOffset = 2 + entryIndex * 12;
      chunk.writeUInt16LE(tag, entryOffset);
      chunk.writeUInt16LE(type, entryOffset + 2);
      chunk.writeUInt32LE(type === 5 ? values.length / 2 : values.length, entryOffset + 4);
      const bytes = values.length * (type === 3 ? 2 : 4);
      const valueOffset = bytes <= 4 ? entryOffset + 8 : dataOffset;
      if (bytes > 4) {
        chunk.writeUInt32LE(offset + dataOffset, entryOffset + 8);
        dataOffset += bytes;
      }
      for (const [valueIndex, value] of values.entries()) {
        if (type === 3) chunk.writeUInt16LE(value, valueOffset + valueIndex * 2);
        else chunk.writeUInt32LE(tag === 273 ? pixelOffset : value, valueOffset + valueIndex * 4);
      }
    }
    chunk.writeUInt32LE(index === pages.length - 1 ? 0 : offset + chunk.length,
      2 + entries.length * 12);
    pixels.copy(chunk, directorySize + dataSize);
    chunks.push(chunk);
    offset += chunk.length;
  }
  return Buffer.concat(chunks);
}

test('real multipage TIFF keeps the first page DPI and image properties without false conflicts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'file-analyzer-multipage-tiff-'));
  try {
    const path = join(dir, 'pages.tiff');
    await writeFile(path, tiff([
      { width: 2, height: 1, dpi: 72, channels: 1, depth: 8 },
      { width: 3, height: 2, dpi: 150, channels: 1, depth: 16 },
      { width: 4, height: 3, dpi: 300, channels: 4, depth: 16, orientation: 6 },
    ]));
    const result = await analyzeFile(path);
    assert.equal(result.status, 'ok', JSON.stringify(result.issues));
    assert.equal(result.category, 'image');
    const get = (key: string) => result.fields.find(field => field.key === key);
    assert.equal(get('image.dpiX')?.value, 72);
    assert.equal(get('image.dpiY')?.value, 72);
    assert.equal(get('image.width')?.value, 2);
    assert.equal(get('image.height')?.value, 1);
    assert.equal(get('image.bitDepth')?.value, 8);
    assert.equal(get('image.colorSpace')?.value, 'BlackIsZero');
    assert.equal(get('image.hasAlpha')?.status, 'unknown');
    assert.equal(get('image.orientation')?.status, 'missing');
    assert.equal(result.rawMetadata?.['IFD1:XResolution'], 150);
    assert.equal(result.rawMetadata?.['IFD2:XResolution'], 300);
    assert.equal(result.rawMetadata?.['IFD2:ExtraSamples'], 2);
    assert.equal(result.rawMetadata?.['IFD2:Orientation'], 6);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
