import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { normalizeExifMetadata } from '../src/exif.js';
import type { ExtractedMetadata } from '../src/types.js';

const get = (result: ExtractedMetadata, key: string) => {
  const found = result.fields.find(item => item.key === key);
  assert.ok(found, `Missing field ${key}`);
  return found;
};

test('DPI uses recorded units rather than a default or unitless density', () => {
  const absent = normalizeExifMetadata({}, 'image');
  assert.equal(get(absent, 'image.dpiX').status, 'missing');
  assert.equal(get(absent, 'image.dpiX').value, null);
  const unknown = normalizeExifMetadata({ 'JFIF:XResolution': 72, 'JFIF:ResolutionUnit': 0 }, 'image');
  assert.equal(get(unknown, 'image.dpiX').status, 'unknown');
  const cm = normalizeExifMetadata({ 'IFD0:XResolution': 100, 'IFD0:ResolutionUnit': 3 }, 'image');
  assert.equal(get(cm, 'image.dpiX').value, 254);
  assert.match(get(cm, 'image.dpiX').source, /IFD0:XResolution/);
  const jfifCm = normalizeExifMetadata({ 'JFIF:XResolution': 100, 'JFIF:ResolutionUnit': 2 }, 'image');
  assert.equal(get(jfifCm, 'image.dpiX').value, 254);
});

test('PNG metre densities are converted, with rounding tolerance across sources', () => {
  const result = normalizeExifMetadata({ 'PNG-pHYs:PixelsPerUnitX': 11811,
    'PNG-pHYs:PixelUnits': 1, 'IFD0:XResolution': 300, 'IFD0:ResolutionUnit': 2 }, 'image');
  assert.equal(get(result, 'image.dpiX').status, 'present');
  assert.equal(get(result, 'image.dpiX').value, 299.9994);
  assert.equal(result.issues?.length, 0);
});

test('conflicting physical DPI is unknown, retaining each source', () => {
  const result = normalizeExifMetadata({ 'JFIF:XResolution': 72, 'JFIF:ResolutionUnit': 1,
    'IFD0:XResolution': 300, 'IFD0:ResolutionUnit': 2 }, 'image');
  assert.equal(get(result, 'image.dpiX').status, 'unknown');
  assert.equal(get(result, 'image.dpiX').value, null);
  assert.match(get(result, 'image.dpiX').note ?? '', /72.*300/);
  assert.ok(result.issues?.some(issue => issue.code === 'CONFLICTING_RESOLUTION'));
});

test('Photoshop display centimetres do not change pixels/inch storage', () => {
  const result = normalizeExifMetadata({ 'Photoshop:XResolution': 300, 'Photoshop:DisplayedUnitsX': 2 }, 'image');
  assert.equal(get(result, 'image.dpiX').value, 300);
});

test('TIFF standard fields do not borrow values from later pages or thumbnails', () => {
  const tags = {
    'IFD0:ImageWidth': 80, 'IFD0:ImageHeight': 60,
    'IFD0:XResolution': 72, 'IFD0:YResolution': 72, 'IFD0:ResolutionUnit': 2,
    'IFD1:XResolution': 150, 'IFD1:YResolution': 150, 'IFD1:ResolutionUnit': 2,
    'IFD2:XResolution': 300, 'IFD2:YResolution': 300, 'IFD2:ResolutionUnit': 2,
    'IFD2:BitsPerSample': '16 16 16 16', 'IFD2:ExtraSamples': 2,
    'IFD2:PhotometricInterpretation': 2, 'IFD2:Orientation': 6,
    'IFD2:ImageDescription': 'A different page',
    'IFD12:XResolution': 600, 'IFD12:ResolutionUnit': 2,
    'Thumbnail:BitsPerSample': 16, 'PreviewImage:ImageWidth': 1024,
  };
  const result = normalizeExifMetadata(tags, 'image');
  assert.equal(get(result, 'image.dpiX').value, 72);
  assert.equal(get(result, 'image.dpiY').value, 72);
  assert.equal(get(result, 'image.width').value, 80);
  assert.equal(get(result, 'image.bitDepth').status, 'missing');
  assert.equal(get(result, 'image.colorSpace').status, 'missing');
  assert.equal(get(result, 'image.hasAlpha').status, 'unknown');
  assert.equal(get(result, 'image.orientation').status, 'missing');
  assert.equal(get(result, 'document.description').status, 'missing');
  assert.deepEqual(result.rawMetadata, tags);
  assert.equal(result.issues?.length, 0);

  const noMainPage = normalizeExifMetadata({ 'IFD2:ImageWidth': 640,
    'IFD2:XResolution': 300, 'IFD2:ResolutionUnit': 2 }, 'image');
  assert.equal(get(noMainPage, 'image.width').status, 'missing');
  assert.equal(get(noMainPage, 'image.dpiX').status, 'missing');
});

test('other main-image DPI sources still report genuine conflicts', () => {
  for (const secondary of [
    { 'Photoshop:XResolution': 300 },
    { 'PNG-pHYs:PixelsPerUnitX': 11811, 'PNG-pHYs:PixelUnits': 1 },
  ]) {
    const result = normalizeExifMetadata({ 'IFD0:XResolution': 72,
      'IFD0:ResolutionUnit': 2, ...secondary }, 'image');
    assert.equal(get(result, 'image.dpiX').status, 'unknown');
    assert.ok(result.issues?.some(issue => issue.code === 'CONFLICTING_RESOLUTION'));
  }
});

test('image depth remains per-channel and transparency follows explicit tags', () => {
  const tags = { 'PNG:ImageWidth': 80, 'PNG:ImageHeight': 60, 'PNG:BitDepth': 8,
    'PNG:ColorType': 2, 'PNG:Transparency': '(Binary data 6 bytes)', 'custom:Tag': 'retained' };
  const png = normalizeExifMetadata(tags, 'image');
  assert.equal(get(png, 'image.width').value, 80);
  assert.equal(get(png, 'image.bitDepth').unit, 'bit/channel');
  assert.equal(get(png, 'image.hasAlpha').value, true);
  assert.deepEqual(png.rawMetadata, tags);
  const tiff = normalizeExifMetadata({ 'IFD0:BitsPerSample': '8 8 8' }, 'image');
  assert.equal(get(tiff, 'image.bitDepth').value, 8);
  assert.equal(get(tiff, 'image.hasAlpha').status, 'unknown');
});

test('indexed PNG depth describes palette indices rather than color channels', () => {
  const indexed = normalizeExifMetadata({ 'PNG:BitDepth': 1, 'PNG:ColorType': 3 }, 'image');
  const depth = get(indexed, 'image.bitDepth');
  assert.equal(depth.value, 1);
  assert.equal(depth.unit, 'bit/pixel');
  assert.match(depth.note ?? '', /调色板索引/);

  const rgb = normalizeExifMetadata({ 'PNG:BitDepth': 8, 'PNG:ColorType': 2 }, 'image');
  assert.equal(get(rgb, 'image.bitDepth').value, 8);
  assert.equal(get(rgb, 'image.bitDepth').unit, 'bit/channel');
});

test('Office times exclude filesystem values and saved statistics are labelled', () => {
  const result = normalizeExifMetadata({ 'System:FileModifyDate': '2026:10:18 01:00:00',
    'XML:CreateDate': '2024:01:01 00:00:00Z', 'XML:Creator': 'Author',
    'XML:Pages': 1, 'XML:Words': 0, 'XML:Slides': 2 }, 'office');
  assert.equal(get(result, 'office.createdAt').value, '2024:01:01 00:00:00Z');
  assert.equal(get(result, 'office.modifiedAt').status, 'missing');
  assert.equal(get(result, 'office.pageCount').value, 1);
  assert.match(get(result, 'office.pageCount').note ?? '', /可能过时/);
  assert.equal(get(result, 'office.wordCount').value, 0);
  assert.equal(get(result, 'office.sheetCount').value, null);
});

test('ExifTool warnings remain visible even when some metadata was extracted', () => {
  const result = normalizeExifMetadata({ 'ExifTool:Warning': 'Install Archive::Zip' }, 'office');
  assert.equal(result.issues?.[0]?.code, 'EXIFTOOL_WARNING');
  assert.match(result.issues?.[0]?.message ?? '', /Archive::Zip/);
});

test('Office subtype distinguishes inapplicable fields from missing saved properties', () => {
  const docx = normalizeExifMetadata({ 'File:FileType': 'DOCX' }, 'office');
  assert.equal(get(docx, 'office.pageCount').status, 'missing');
  assert.equal(get(docx, 'office.sheetCount').status, 'not_applicable');
  assert.equal(get(docx, 'office.slideCount').status, 'not_applicable');
  const xlsx = normalizeExifMetadata({ 'File:FileType': 'XLSX' }, 'office');
  assert.equal(get(xlsx, 'office.pageCount').status, 'not_applicable');
  assert.equal(get(xlsx, 'office.sheetCount').status, 'missing');
});
