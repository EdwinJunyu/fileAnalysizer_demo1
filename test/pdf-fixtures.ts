import { createHash } from 'node:crypto';
import { PDFDocument, PDFName, PDFNumber, PDFString, degrees } from 'pdf-lib';

export async function pdfFixture(author?: string, count = 2, actionUrl?: string): Promise<Uint8Array> {
  const document = await PDFDocument.create({ updateMetadata: false });
  if (author !== undefined) document.setAuthor(author);
  document.setTitle('Public PDF fixture');
  for (let index = 0; index < count; index++) {
    const page = document.addPage(index % 2 ? [612, 792] : [595.28, 841.89]);
    if (index === 1) {
      page.setRotation(degrees(90));
      page.node.set(PDFName.of('UserUnit'), PDFNumber.of(2));
    }
  }
  if (actionUrl) document.catalog.set(PDFName.of('OpenAction'), document.context.obj({
    S: 'JavaScript', JS: PDFString.of(`fetch(${JSON.stringify(actionUrl)})`),
  }));
  return document.save();
}

// Public, generated Standard Security Handler revision-2 fixture. RC4/MD5 are
// required by this legacy PDF test format, and are never used by application code.
export function encryptedPdfFixture(): Buffer {
  const padding = Buffer.from('28bf4e5e4e758a4164004e56fffa01082e2e00b6d0683e802f0ca9fe6453697a', 'hex');
  const pad = (password: string) => Buffer.concat([Buffer.from(password), padding]).subarray(0, 32);
  const md5 = (bytes: Buffer) => createHash('md5').update(bytes).digest();
  const rc4 = (key: Buffer, bytes: Buffer): Buffer => {
    const s = Array.from({ length: 256 }, (_, index) => index);
    let j = 0;
    for (let i = 0; i < 256; i++) { j = (j + s[i]! + key[i % key.length]!) % 256; [s[i], s[j]] = [s[j]!, s[i]!]; }
    let i = 0; j = 0;
    return Buffer.from(bytes.map(byte => {
      i = (i + 1) % 256; j = (j + s[i]!) % 256;
      [s[i], s[j]] = [s[j]!, s[i]!];
      return byte ^ s[(s[i]! + s[j]!) % 256]!;
    }));
  };
  const owner = rc4(md5(pad('public-owner')).subarray(0, 5), pad('public-user'));
  const id = md5(Buffer.from('File Analyzer public encrypted test fixture'));
  const permissions = Buffer.alloc(4); permissions.writeInt32LE(-4);
  const key = md5(Buffer.concat([pad('public-user'), owner, permissions, id])).subarray(0, 5);
  const user = rc4(key, padding);
  const infoKey = md5(Buffer.concat([key, Buffer.from([4, 0, 0, 0, 0])])).subarray(0, 10);
  const author = rc4(infoKey, Buffer.from('Private Fixture Author')).toString('hex');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>',
    `<< /Author <${author}> >>`,
    `<< /Filter /Standard /V 1 /R 2 /Length 40 /P -4 /O <${owner.toString('hex')}> /U <${user.toString('hex')}> >>`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R /Info 4 0 R /Encrypt 5 0 R /ID [<${id.toString('hex')}> <${id.toString('hex')}>] >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
