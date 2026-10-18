import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { strToU8, zipSync } from 'fflate';
import { extractOffice } from '../src/office.js';
import type { ExtractedMetadata } from '../src/types.js';

async function inspect(ext: string, parts: Record<string, string> | string): Promise<ExtractedMetadata> {
  const dir = await mkdtemp(join(tmpdir(), 'file-analyzer-office-unit-'));
  try {
    const path = join(dir, `sample.${ext}`);
    await writeFile(path, typeof parts === 'string' ? parts
      : zipSync(Object.fromEntries(Object.entries(parts).map(([name, xml]) => [name, strToU8(xml)])), { level: 6 }));
    return await extractOffice(path, ext, { exiftoolPath: join(dir, 'missing-exiftool') });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const item = (result: ExtractedMetadata, key: string) => result.fields.find(field => field.key === key)!;

test('XLSX counts workbook entries including hidden sheets, despite missing ExifTool and stale saved counts', async () => {
  const result = await inspect('xlsx', {
    'xl/workbook.xml': '<workbook xmlns:r="urn:relationships"><sheets><sheet name="A" sheetId="1" r:id="rId1"/><sheet name="B" sheetId="2" state="hidden" r:id="rId2"/><sheet name="C" sheetId="3" state="veryHidden" r:id="rId3"/></sheets></workbook>',
    'docProps/app.xml': '<Properties><Worksheets>99</Worksheets></Properties>',
    'xl/worksheets/unreferenced.xml': '<worksheet/>',
  });
  assert.equal(item(result, 'office.sheetCount').value, 3);
  assert.equal(item(result, 'office.sheetCount').source, 'OOXML: xl/workbook.xml');
  assert.equal(item(result, 'office.sheetCount').status, 'present');
  assert.equal(item(result, 'office.pageCount').status, 'not_applicable');
  assert.equal(item(result, 'office.wordCount').status, 'not_applicable');
  assert.equal(item(result, 'office.slideCount').status, 'not_applicable');
  assert.ok(result.issues?.some(issue => issue.code === 'TOOL_NOT_FOUND'));
  assert.ok(result.rawMetadata?.['OOXML: xl/workbook.xml']);
});

test('PPTX counts slide references rather than stored statistics, masters or loose slide files', async () => {
  const result = await inspect('pptx', {
    'ppt/presentation.xml': '<p:presentation xmlns:p="urn:p" xmlns:r="urn:r"><p:sldMasterIdLst><p:sldMasterId r:id="m1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/></p:sldIdLst></p:presentation>',
    'docProps/app.xml': '<Properties><Slides>99</Slides><HiddenSlides>1</HiddenSlides></Properties>',
    'ppt/slides/unreferenced.xml': '<p:sld xmlns:p="urn:p"/>',
  });
  assert.equal(item(result, 'office.slideCount').value, 2);
  assert.equal(item(result, 'office.pageCount').status, 'not_applicable');
  assert.equal(item(result, 'office.sheetCount').status, 'not_applicable');
  assert.equal(item(result, 'office.hiddenSlideCount').value, 1);
  const empty = await inspect('pptx', { 'ppt/presentation.xml': '<p:presentation xmlns:p="urn:p"/>' });
  assert.equal(item(empty, 'office.slideCount').value, 0);
  assert.equal(item(empty, 'office.slideCount').status, 'present');
});

test('DOCX properties remain saved statistics; document dates are not filesystem times', async () => {
  const result = await inspect('docx', {
    'docProps/core.xml': '<cp:coreProperties xmlns:cp="urn:cp" xmlns:dc="urn:dc" xmlns:dcterms="urn:terms" xmlns:xsi="urn:xsi"><dc:creator>A &amp; B</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">2024-01-01T00:00:00Z</dcterms:created></cp:coreProperties>',
    'docProps/app.xml': '<Properties><Pages>7</Pages><Words>42</Words><AppVersion>1.0000</AppVersion></Properties>',
  });
  assert.equal(item(result, 'office.creator').value, 'A & B');
  assert.equal(item(result, 'office.createdAt').value, '2024-01-01T00:00:00Z');
  assert.equal(item(result, 'office.modifiedAt').status, 'missing');
  assert.equal(item(result, 'office.pageCount').value, 7);
  assert.equal(item(result, 'office.wordCount').value, 42);
  assert.match(item(result, 'office.pageCount').note!, /未重新排版或计算/);
  assert.equal(item(result, 'office.appVersion').value, '1.0000');
  assert.equal(item(result, 'office.sheetCount').status, 'not_applicable');
  assert.equal(item(result, 'office.hiddenSlideCount').status, 'not_applicable');
  assert.equal(result.rawMetadata?.['File:FileType'], undefined);
});

test('damaged ZIP, invalid XML, wrong root and missing structural parts never produce a zero count', async t => {
  const cases: Array<[string, Record<string, string> | string, string]> = [
    ['damaged ZIP', 'not a zip archive', 'OOXML_READ_FAILED'],
    ['invalid XML', { 'xl/workbook.xml': '<workbook><sheets></workbook>' }, 'OOXML_PART_INVALID'],
    ['wrong root', { 'xl/workbook.xml': '<unrelated/>' }, 'OOXML_PART_INVALID'],
    ['missing part', { 'docProps/app.xml': '<Properties><Worksheets>99</Worksheets></Properties>' }, 'OOXML_PART_MISSING'],
    ['wrong list structure', { 'xl/workbook.xml': '<workbook><sheets>broken</sheets></workbook>' }, 'OOXML_STRUCTURE_INVALID'],
  ];
  for (const [name, parts, code] of cases) await t.test(name, async () => {
    const result = await inspect('xlsx', parts);
    assert.equal(item(result, 'office.sheetCount').value, null);
    assert.equal(item(result, 'office.sheetCount').status, 'error');
    assert.ok(result.issues?.some(issue => issue.code === code));
  });
});

test('selected XML parts have a decompression size limit', async () => {
  const result = await inspect('xlsx', { 'xl/workbook.xml': `<workbook>${' '.repeat(4 * 1024 * 1024)}</workbook>` });
  assert.equal(item(result, 'office.sheetCount').status, 'error');
  assert.ok(result.issues?.some(issue => issue.code === 'OOXML_READ_FAILED' && /大小上限/.test(issue.message)));
});

test('untrusted entity declarations are rejected without losing other readable properties', async () => {
  const result = await inspect('docx', {
    'docProps/core.xml': '<!DOCTYPE coreProperties [<!ENTITY secret SYSTEM "file:///etc/passwd">]><coreProperties><creator>&secret;</creator></coreProperties>',
    'docProps/app.xml': '<Properties><Words>42</Words></Properties>',
  });
  assert.equal(item(result, 'office.creator').status, 'missing');
  assert.equal(item(result, 'office.wordCount').value, 42);
  assert.ok(result.issues?.some(issue => issue.code === 'OOXML_PART_INVALID'));
});
