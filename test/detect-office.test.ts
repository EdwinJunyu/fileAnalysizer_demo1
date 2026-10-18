import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strToU8, zipSync } from 'fflate';
import { fileTypeFromFile } from 'file-type';
import { analyzeFile } from '../src/index.js';
import { detectType } from '../src/detect.js';
import { readParts } from '../src/ooxml.js';

const TYPES_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';
const RELS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const DOC_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const formats = [
  { ext: 'docx', part: 'word/document.xml', kind: 'wordprocessingml.document',
    body: '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>' },
  { ext: 'xlsx', part: 'xl/workbook.xml', kind: 'spreadsheetml.sheet',
    body: `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${DOC_REL}"><sheets><sheet name="First" sheetId="1" r:id="rId1"/></sheets></workbook>` },
  { ext: 'pptx', part: 'ppt/presentation.xml', kind: 'presentationml.presentation',
    body: `<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="${DOC_REL}"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>` },
];
let dir: string;
let sequence = 0;
before(async () => { dir = await mkdtemp(join(tmpdir(), 'file-analyzer-detect-office-')); });
after(async () => { await rm(dir, { recursive: true, force: true }); });

async function archive(parts: Record<string, string | Uint8Array>, ext = 'bin'): Promise<string> {
  const path = join(dir, `${sequence++}.${ext}`);
  await writeFile(path, zipSync(Object.fromEntries(Object.entries(parts).map(([name, value]) =>
    [name, typeof value === 'string' ? strToU8(value) : value])), { level: 6 }));
  return path;
}

function manifest(format: typeof formats[number], prefix = ''): string {
  return `<${prefix}Types xmlns${prefix ? `:${prefix.slice(0, -1)}` : ''}='${TYPES_NS}'>` +
    `<${prefix}Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/>` +
    `<${prefix}Default Extension='xml' ContentType='application/xml'/>` +
    `<${prefix}Override PartName='/${format.part}' ContentType='application/vnd.openxmlformats-officedocument.${format.kind}.main+xml'/>` +
    `</${prefix}Types>`;
}

function utf16(xml: string, endian: 'le' | 'be', bom: boolean): Buffer {
  const data = Buffer.from(`<?xml version='1.0' encoding='UTF-16${endian.toUpperCase()}'?>${xml}`, 'utf16le');
  if (endian === 'be') data.swap16();
  return bom ? Buffer.concat([Buffer.from(endian === 'le' ? [0xff, 0xfe] : [0xfe, 0xff]), data]) : data;
}

test('single-quoted Office manifests reach the actual Office metadata and structure parsers', async t => {
  for (const format of formats) await t.test(format.ext, async () => {
    const path = await archive({
      '[Content_Types].xml': manifest(format),
      '_rels/.rels': `<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${DOC_REL}/officeDocument" Target="${format.part}"/></Relationships>`,
      [format.part]: format.body,
      'docProps/core.xml': '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Office regression</dc:creator></cp:coreProperties>',
      'docProps/app.xml': '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Pages>7</Pages></Properties>',
    }, format.ext);
    assert.equal((await fileTypeFromFile(path))?.ext, 'zip', 'exercise the real upstream detection gap');
    const result = await analyzeFile(path);
    assert.equal(result.category, 'office');
    assert.equal(result.detectedType.source, 'signature');
    assert.equal(result.detectedType.ext, format.ext);
    assert.equal(result.status, 'ok', JSON.stringify(result.issues));
    assert.equal(result.fields.find(field => field.key === 'office.creator')?.value, 'Office regression');
    const count = format.ext === 'docx' ? ['office.pageCount', 7]
      : format.ext === 'xlsx' ? ['office.sheetCount', 1] : ['office.slideCount', 1];
    assert.equal(result.fields.find(field => field.key === count[0])?.value, count[1]);
  });
});

test('UTF-16 in both byte orders and namespace prefixes detect renamed Office files by content', async t => {
  for (const format of formats) {
    for (const [name, xml] of [
      ['prefixed', manifest(format, 'ct:')],
      ['UTF-16LE', utf16(manifest(format), 'le', true)],
      ['UTF-16BE', utf16(manifest(format), 'be', true)],
      ['UTF-16LE without BOM', utf16(manifest(format), 'le', false)],
    ] as const) await t.test(`${format.ext}: ${name}`, async () => {
      const path = await archive({ '[Content_Types].xml': xml, [format.part]: format.body });
      const detected = await detectType(path);
      assert.equal(detected.ext, format.ext);
      assert.equal(detected.category, 'office');
      assert.equal(detected.source, 'signature');
    });
  }
});

test('ordinary ZIPs and invalid or incomplete Office manifests remain ZIPs despite an Office suffix', async t => {
  const format = formats[0]!;
  const cases = [
    ['ordinary ZIP', { 'word/readme.txt': 'This is a ZIP archive, not an Office document.' }],
    ['missing main part', { '[Content_Types].xml': manifest(format), 'readme.txt': 'No document body.' }],
    ['wrong namespace', { '[Content_Types].xml': manifest(format).replace(TYPES_NS, 'urn:other'), [format.part]: format.body }],
    ['invalid XML', { '[Content_Types].xml': manifest(format).replace('</Types>', ''), [format.part]: format.body }],
    ['DTD', { '[Content_Types].xml': `<!DOCTYPE Types [<!ENTITY item 'value'>]>${manifest(format)}`, [format.part]: format.body }],
  ] as const;
  for (const [name, parts] of cases) await t.test(name, async () => {
    const result = await detectType(await archive(parts, 'docx'));
    assert.deepEqual(result, { ext: 'zip', mime: 'application/zip', category: 'other', source: 'signature' });
  });
});

test('Office confirmation bounds the manifest decompression but does not decompress the document body', async () => {
  const format = formats[0]!;
  const oversizedManifest = await archive({
    '[Content_Types].xml': manifest(format).replace('</Types>', `${' '.repeat(4 * 1024 * 1024)}</Types>`),
    [format.part]: format.body,
  });
  await assert.rejects(detectType(oversizedManifest), /解压大小上限/);
  const largeBody = await archive({
    '[Content_Types].xml': manifest(format),
    [format.part]: `${format.body}${' '.repeat(5 * 1024 * 1024)}`,
  });
  assert.equal((await detectType(largeBody)).ext, 'docx');
});

test('shared OOXML reads enforce the entry limit and deadline', async () => {
  const path = await archive(Object.fromEntries(Array.from({ length: 20_001 }, (_, index) => [`part-${index}`, ''])));
  await assert.rejects(readParts(path, new Set(['[Content_Types].xml']), 15_000), /20000/);
  await assert.rejects(readParts(path, new Set(['[Content_Types].xml']), 1), /超时/);
});
