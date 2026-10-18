import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { strToU8, zipSync } from 'fflate';

const execFileAsync = promisify(execFile);
const REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const DOC_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const S = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const GROUP = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

function relationships(items: Array<[string, string, string]>): string {
  return `<Relationships xmlns="${REL}">${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`).join('')}</Relationships>`;
}

function officeArchive(
  main: string,
  parts: Record<string, string>,
  overrides: Array<[string, string]>,
  properties: string,
): Uint8Array {
  const core = '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Metadata fixture</dc:title><dc:creator>Fixture Generator</dc:creator><cp:lastModifiedBy>Fixture Generator</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">2024-01-01T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2024-01-02T00:00:00Z</dcterms:modified></cp:coreProperties>';
  const app = `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>File Analyzer Fixtures</Application><AppVersion>1.0000</AppVersion>${properties}</Properties>`;
  const contentTypes = `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${overrides.map(([part, type]) => `<Override PartName="/${part}" ContentType="application/vnd.openxmlformats-officedocument.${type}+xml"/>`).join('')}</Types>`;
  const archive = {
    '[Content_Types].xml': contentTypes,
    '_rels/.rels': relationships([
      ['rId1', `${DOC_REL}/officeDocument`, main],
      ['rId2', 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', 'docProps/core.xml'],
      ['rId3', `${DOC_REL}/extended-properties`, 'docProps/app.xml'],
    ]),
    'docProps/core.xml': core,
    'docProps/app.xml': app,
    ...parts,
  };
  return zipSync(Object.fromEntries(Object.entries(archive).map(([name, xml]) => [name, strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${xml}`)])), { level: 6, mtime: new Date('2024-01-01T00:00:00Z') });
}

function docx(): Uint8Array {
  return officeArchive('word/document.xml', {
    'word/document.xml': `<w:document xmlns:w="${W}"><w:body><w:p><w:r><w:t>Public test document.</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`,
  }, [['word/document.xml', 'wordprocessingml.document.main']], '<Pages>1</Pages><Words>3</Words><Characters>21</Characters><Company>Fixture Lab</Company>');
}

function xlsx(): Uint8Array {
  return officeArchive('xl/workbook.xml', {
    'xl/workbook.xml': `<workbook xmlns="${S}" xmlns:r="${DOC_REL}"><sheets><sheet name="First" sheetId="1" r:id="rId1"/><sheet name="Second" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': relationships([
      ['rId1', `${DOC_REL}/worksheet`, 'worksheets/sheet1.xml'],
      ['rId2', `${DOC_REL}/worksheet`, 'worksheets/sheet2.xml'],
    ]),
    'xl/worksheets/sheet1.xml': `<worksheet xmlns="${S}"><dimension ref="A1:B2"/><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Value</t></is></c><c r="B1" t="inlineStr"><is><t>Name</t></is></c></row><row r="2"><c r="A2"><v>42</v></c><c r="B2" t="inlineStr"><is><t>Example</t></is></c></row></sheetData></worksheet>`,
    'xl/worksheets/sheet2.xml': `<worksheet xmlns="${S}"><dimension ref="A1"/><sheetData><row r="1"><c r="A1"><v>7</v></c></row></sheetData></worksheet>`,
  }, [
    ['xl/workbook.xml', 'spreadsheetml.sheet.main'],
    ['xl/worksheets/sheet1.xml', 'spreadsheetml.worksheet'],
    ['xl/worksheets/sheet2.xml', 'spreadsheetml.worksheet'],
  ], '<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>2</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="2" baseType="lpstr"><vt:lpstr>First</vt:lpstr><vt:lpstr>Second</vt:lpstr></vt:vector></TitlesOfParts>');
}

function pptx(): Uint8Array {
  const parts: Record<string, string> = {
    'ppt/presentation.xml': `<p:presentation xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${DOC_REL}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/></p:sldIdLst><p:sldSz cx="9144000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
    'ppt/_rels/presentation.xml.rels': relationships([
      ['rId1', `${DOC_REL}/slideMaster`, 'slideMasters/slideMaster1.xml'],
      ['rId2', `${DOC_REL}/slide`, 'slides/slide1.xml'],
      ['rId3', `${DOC_REL}/slide`, 'slides/slide2.xml'],
    ]),
    'ppt/slideMasters/slideMaster1.xml': `<p:sldMaster xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${DOC_REL}"><p:cSld><p:spTree>${GROUP}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`,
    'ppt/slideMasters/_rels/slideMaster1.xml.rels': relationships([
      ['rId1', `${DOC_REL}/slideLayout`, '../slideLayouts/slideLayout1.xml'],
      ['rId2', `${DOC_REL}/theme`, '../theme/theme1.xml'],
    ]),
    'ppt/slideLayouts/slideLayout1.xml': `<p:sldLayout xmlns:p="${P}" xmlns:a="${A}" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${GROUP}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels': relationships([['rId1', `${DOC_REL}/slideMaster`, '../slideMasters/slideMaster1.xml']]),
    'ppt/theme/theme1.xml': `<a:theme xmlns:a="${A}" name="Fixture"><a:themeElements><a:clrScheme name="Fixture">${['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].map((name, index) => `<a:${name}><a:srgbClr val="${index % 2 ? 'FFFFFF' : '000000'}"/></a:${name}>`).join('')}</a:clrScheme><a:fontScheme name="Fixture"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Fixture"><a:fillStyleLst>${'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'.repeat(3)}</a:fillStyleLst><a:lnStyleLst>${'<a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>'.repeat(3)}</a:lnStyleLst><a:effectStyleLst>${'<a:effectStyle><a:effectLst/></a:effectStyle>'.repeat(3)}</a:effectStyleLst><a:bgFillStyleLst>${'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'.repeat(3)}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`,
  };
  for (const number of [1, 2]) {
    parts[`ppt/slides/slide${number}.xml`] = `<p:sld xmlns:p="${P}" xmlns:a="${A}"><p:cSld><p:spTree>${GROUP}<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="7315200" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Public test slide ${number}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
    parts[`ppt/slides/_rels/slide${number}.xml.rels`] = relationships([['rId1', `${DOC_REL}/slideLayout`, '../slideLayouts/slideLayout1.xml']]);
  }
  return officeArchive('ppt/presentation.xml', parts, [
    ['ppt/presentation.xml', 'presentationml.presentation.main'],
    ['ppt/slides/slide1.xml', 'presentationml.slide'],
    ['ppt/slides/slide2.xml', 'presentationml.slide'],
    ['ppt/slideMasters/slideMaster1.xml', 'presentationml.slideMaster'],
    ['ppt/slideLayouts/slideLayout1.xml', 'presentationml.slideLayout'],
    ['ppt/theme/theme1.xml', 'theme'],
  ], '<Slides>2</Slides><Notes>0</Notes><HiddenSlides>0</HiddenSlides><PresentationFormat>On-screen Show (4:3)</PresentationFormat>');
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Self-generated fixtures, under 1 second each; no private files or committed binaries. */
export async function createFixtures(): Promise<{
  dir: string;
  files: Record<string, string>;
  cleanup: () => Promise<void>;
}> {
  const dir = await mkdtemp(join(tmpdir(), 'file-analyzer-fixtures-'));
  const files: Record<string, string> = {};
  const cleanup = () => rm(dir, { recursive: true, force: true });
  const ffmpeg = async (args: string[]) => {
    await execFileAsync(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', ...args], { timeout: 30_000, maxBuffer: 1024 * 1024 });
  };
  const path = (key: string, extension = key) => files[key] = join(dir, `sample.${extension}`);
  try {
    await ffmpeg(['-f', 'lavfi', '-i', 'sine=frequency=1000:sample_rate=48000:duration=0.4', '-ac', '2', '-c:a', 'pcm_s16le', '-threads', '1', path('wav')]);
    const audio: Array<[string, string[]]> = [
      ['mp3', ['-c:a', 'libmp3lame', '-b:a', '128k']],
      ['flac', ['-c:a', 'flac']],
      ['aac', ['-c:a', 'aac', '-b:a', '96k']],
      ['m4a', ['-c:a', 'aac', '-b:a', '96k']],
      ['ogg', ['-c:a', 'libvorbis', '-q:a', '3']],
    ];
    for (const [extension, codec] of audio) await ffmpeg(['-i', files.wav!, ...codec, '-threads', '1', path(extension)]);
    for (const extension of ['mp4', 'mkv', 'mov', 'webm']) {
      const codec = extension === 'webm'
        ? ['-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8', '-c:a', 'libopus', '-b:a', '64k']
        : ['-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-b:a', '64k'];
      await ffmpeg(['-f', 'lavfi', '-i', 'testsrc2=size=160x90:rate=10:duration=0.4', '-i', files.wav!, '-t', '0.4', ...codec, '-pix_fmt', 'yuv420p', '-threads', '1', path(extension)]);
    }
    for (const extension of ['jpeg', 'png', 'webp', 'tiff', 'gif']) {
      await ffmpeg(['-f', 'lavfi', '-i', 'color=c=navy:size=80x60:duration=0.04', '-frames:v', '1', '-threads', '1', '-update', '1', path(extension, extension === 'jpeg' ? 'jpg' : extension)]);
    }
    // Explicit 300-DPI metadata: JFIF uses dots/inch; PNG stores pixels/metre.
    const jpeg = await readFile(files.jpeg!);
    const jfif = jpeg.indexOf(Buffer.from('JFIF\0', 'ascii'));
    if (jfif < 0) throw new Error('Generated JPEG has no JFIF metadata');
    jpeg[jfif + 7] = 1;
    jpeg.writeUInt16BE(300, jfif + 8);
    jpeg.writeUInt16BE(300, jfif + 10);
    await writeFile(files.jpeg!, jpeg);
    const png = await readFile(files.png!);
    const phys = Buffer.alloc(21);
    phys.writeUInt32BE(9, 0);
    phys.write('pHYs', 4, 'ascii');
    phys.writeUInt32BE(11811, 8);
    phys.writeUInt32BE(11811, 12);
    phys[16] = 1;
    phys.writeUInt32BE(crc32(phys.subarray(4, 17)), 17);
    const chunks: Buffer[] = [png.subarray(0, 8)];
    for (let offset = 8; offset < png.length;) {
      const length = png.readUInt32BE(offset);
      const chunk = png.subarray(offset, offset + length + 12);
      const type = png.toString('ascii', offset + 4, offset + 8);
      if (type !== 'pHYs') chunks.push(chunk);
      if (type === 'IHDR') chunks.push(phys);
      offset += length + 12;
    }
    await writeFile(files.png!, Buffer.concat(chunks));
    await writeFile(path('docx'), docx());
    await writeFile(path('xlsx'), xlsx());
    await writeFile(path('pptx'), pptx());
    await writeFile(path('unknown', 'unknown'), 'Public fixture with an intentionally unknown file format.\n');
    await writeFile(path('corrupt', 'broken.png'), png.subarray(0, 20));
    await writeFile(path('corruptVideo', 'broken.mp4'), 'This is not an MP4 file.\n');
    await copyFile(files.png!, path('mismatched', 'image-as-audio.mp3'));
    await writeFile(path('empty', 'empty'), '');
    return { dir, files, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
