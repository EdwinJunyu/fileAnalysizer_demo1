import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { analyzeFile } from '../src/analyze.js';

// Self-generated 2×1 PNG: one-bit palette indices, red/blue palette, and tRNS.
// Keeping its bytes inline avoids requiring Pillow or committing a binary fixture.
const INDEXED_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABAQMAAADO7O3JAAAABlBMVEX/AAAAAP9sof2OAAAAAXRSTlMAQObYZgAAAApJREFUeJxjcAAAAEIAQSk39O8AAAAASUVORK5CYII=';

test('real indexed PNG preserves one-bit palette depth and transparency', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'file-analyzer-indexed-png-'));
  try {
    const path = join(dir, 'indexed.png');
    await writeFile(path, Buffer.from(INDEXED_PNG, 'base64'));
    const result = await analyzeFile(path);
    assert.equal(result.status, 'ok', JSON.stringify(result.issues));
    assert.equal(result.category, 'image');
    const depth = result.fields.find(item => item.key === 'image.bitDepth');
    assert.ok(depth);
    assert.equal(depth.value, 1);
    assert.equal(depth.unit, 'bit/pixel');
    assert.match(depth.note ?? '', /调色板索引/);
    assert.equal(result.fields.find(item => item.key === 'image.hasAlpha')?.value, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
