import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, rm, writeFile, access, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { _electron, expect } from '@playwright/test';
import { strToU8, zipSync } from 'fflate';
import { PDFDocument, PDFName, PDFNumber, PDFString, degrees } from 'pdf-lib';
import { execute, projectRoot, targetFromArguments, verifyTools } from './packaging/tools.mjs';

const target = targetFromArguments();
const candidates = target.platform === 'win32'
  ? [join(projectRoot, 'release', 'win-unpacked', 'File Analyzer.exe')]
  : target.platform === 'darwin'
    ? [join(projectRoot, 'release', target.arch === 'arm64' ? 'mac-arm64' : 'mac', 'File Analyzer.app', 'Contents', 'MacOS', 'File Analyzer')]
    : [join(projectRoot, 'release', 'linux-unpacked', 'file-analyzer')];
const argument = process.argv.find(value => value.startsWith('--app='));
const executablePath = argument ? resolve(argument.slice(6)) : candidates[0];
await access(executablePath);
const resources = target.platform === 'darwin'
  ? join(dirname(dirname(executablePath)), 'Resources') : join(dirname(executablePath), 'resources');
await verifyTools(join(resources, 'tools'), target);
const sandbox = await mkdtemp(join(tmpdir(), 'file-analyzer-package-'));
let application;
try {
  // Exercise a fresh location with spaces and Unicode; compiled Perl must relocate with its @INC.
  const relocated = join(sandbox, 'relocated tools 中文');
  await cp(join(resources, 'tools'), relocated, { recursive: true });
  await verifyTools(relocated, target);
  if (target.platform !== 'win32') {
    const { stdout: includePaths } = await execute(join(relocated, 'perl/bin/perl'), ['-e', 'print join "\\n", @INC'], { timeout: 30_000 });
    for (const path of includePaths.split('\n')) {
      assert.ok(path.startsWith(join(relocated, 'perl') + '/'), `Perl @INC escapes the relocated runtime: ${path}`);
    }
  }
  const sample = join(sandbox, 'packaging smoke 中文.wav');
  const sampleRate = 48_000;
  const pcm = Buffer.alloc(sampleRate * 2);
  for (let i = 0; i < sampleRate; i++) pcm.writeInt16LE(Math.round(12_000 * Math.sin(2 * Math.PI * 1_000 * i / sampleRate)), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(pcm.length + 36, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  await writeFile(sample, Buffer.concat([header, pcm]));
  const document = join(sandbox, 'packaging smoke 中文.docx');
  await writeFile(document, zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    'word/document.xml': strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>'),
    'docProps/core.xml': strToU8('<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Packaging smoke author</dc:creator></cp:coreProperties>'),
  }));
  const pdf = join(sandbox, 'packaging smoke 中文.pdf');
  const pdfDocument = await PDFDocument.create({ updateMetadata: false });
  pdfDocument.setTitle('Packaging PDF structure');
  pdfDocument.setAuthor('Packaging PDF author');
  pdfDocument.addPage([595.28, 841.89]);
  const rotatedPage = pdfDocument.addPage([612, 792]);
  rotatedPage.setRotation(degrees(90));
  rotatedPage.node.set(PDFName.of('UserUnit'), PDFNumber.of(2));
  // The analyzer must read structure without executing document actions.
  pdfDocument.catalog.set(PDFName.of('OpenAction'), pdfDocument.context.obj({
    S: 'JavaScript', JS: PDFString.of('fetch("https://packaging-smoke.invalid/pdf-action")'),
  }));
  await writeFile(pdf, await pdfDocument.save());
  const suffix = target.platform === 'win32' ? '.exe' : '';
  const exif = await execute(join(relocated, 'exiftool' + suffix), ['-charset', 'filename=UTF8', '-json', document], { timeout: 30_000 });
  assert.match(exif.stdout, /Packaging smoke author/);
  assert.doesNotMatch(exif.stdout, /Install Archive::Zip|Error opening file|Can't locate/);
  const decode = await execute(join(relocated, 'ffmpeg' + suffix), ['-v', 'error', '-i', sample, '-f', 'f32le', '-ac', '1', '-ar', '12000', '-t', '1', 'pipe:1'], {
    encoding: 'buffer', timeout: 30_000, maxBuffer: 1_000_000,
  });
  assert.equal(decode.stdout.length, 12_000 * 4);
  const configDirectory = join(sandbox, 'config');
  await mkdir(configDirectory);
  // No FFprobe, FFmpeg or ExifTool may be found through the host's PATH.
  // The Unix launcher needs only dirname; preserve that command explicitly.
  const isolatedPath = join(sandbox, 'isolated-path');
  await mkdir(isolatedPath);
  if (process.platform !== 'win32') await symlink('/usr/bin/dirname', join(isolatedPath, 'dirname'));
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'path'));
  application = await _electron.launch({ executablePath,
    args: [...(process.platform === 'linux' ? ['--no-sandbox'] : []), '--disable-background-networking', `--user-data-dir=${configDirectory}`],
    env: { ...environment, PATH: isolatedPath, XDG_CONFIG_HOME: configDirectory, XDG_CACHE_HOME: configDirectory,
      FILE_ANALYZER_FFPROBE: join(sandbox, 'absent-ffprobe'),
      FILE_ANALYZER_FFMPEG: join(sandbox, 'absent-ffmpeg'),
      FILE_ANALYZER_EXIFTOOL: join(sandbox, 'absent-exiftool') },
  });
  assert.equal(await application.evaluate(({ app }) => app.isPackaged), true);
  assert.match(await application.evaluate(({ app }) => app.getAppPath()), /app\.asar$/);
  const networkRequests = [];
  const context = application.context();
  context.on('request', request => {
    if (/^(?:https?|wss?|ftp):/i.test(request.url())) networkRequests.push(request.url());
  });
  await context.setOffline(true);
  const page = await application.firstWindow();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await expect(page.getByRole('heading', { name: 'File Analyzer', exact: true })).toBeVisible();
  await expect(page.locator('#language-select')).toBeEnabled();
  await page.evaluate(() => {
    window.packagingEvents = [];
    window.fileAnalyzer.onEvent(event => window.packagingEvents.push(event));
  });
  await application.evaluate(({ dialog }, paths) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: paths });
  }, [sample, document, pdf]);
  await page.getByRole('button', { name: '添加文件', exact: true }).click();
  await expect(page.locator('#list-summary')).toHaveText('3 个文件 · 3 个已处理', { timeout: 30_000 });
  await expect(page.locator('#detail-content')).toContainText('48,000 Hz');
  await page.getByRole('button', { name: '生成频谱', exact: true }).click();
  const spectrogram = page.locator('.spectrogram-image');
  await expect(spectrogram).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => spectrogram.evaluate(image => image.naturalWidth)).toBe(2400);
  await page.getByRole('button', { name: /packaging smoke 中文\.docx.*解析完成/ }).click();
  await expect(page.locator('#detail-content')).toContainText('Packaging smoke author');
  await expect(page.locator('#privacy-section')).toHaveAttribute('data-state', 'checked');
  await page.getByRole('button', { name: /packaging smoke 中文\.pdf.*解析完成/ }).click();
  await expect(page.locator('#file-parameters-table')).toContainText('PDF 页数');
  await expect(page.locator('#privacy-section')).toHaveAttribute('data-state', 'checked');
  await page.locator('#privacy-records-summary').click();
  await expect(page.locator('#privacy-metadata-table')).toContainText('Packaging PDF author');
  await page.locator('#pdf-page-records-summary').click();
  await expect(page.locator('#pdf-page-records tbody tr')).toHaveCount(2);
  await expect(page.locator('#pdf-page-records')).toContainText('1,224 pt');
  await expect(page.locator('#pdf-page-records')).toContainText('90°');
  const results = await page.evaluate(() => window.packagingEvents.filter(event => event.type === 'result'));
  assert.equal(results.length, 3);
  const pdfResult = results.find(event => event.result.category === 'pdf')?.result;
  assert.equal(pdfResult?.fields.find(field => field.key === 'pdf.pageCount')?.value, 2);
  assert.deepEqual(pdfResult?.pdfPages.map(({ widthPt, heightPt, rotation }) => ({ widthPt, heightPt, rotation })), [
    { widthPt: 595.28, heightPt: 841.89, rotation: 0 },
    { widthPt: 1224, heightPt: 1584, rotation: 90 },
  ]);
  // Cached analysis and all translations must remain usable without source files or a network.
  await Promise.all([sample, document, pdf].map(path => rm(path)));
  const languages = [
    ['en-US', 'PDF page count'], ['ja-JP', 'PDF のページ数'], ['ko-KR', 'PDF 페이지 수'],
    ['fr-FR', 'Nombre de pages PDF'], ['es-ES', 'Número de páginas PDF'], ['zh-CN', 'PDF 页数'],
  ];
  for (const [locale, label] of languages) {
    await page.locator('#language-select').selectOption(locale);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('#language-select')).toBeEnabled();
    await expect(page.locator('#file-parameters-table')).toContainText(label);
    await expect(page.locator('#privacy-metadata-table')).toContainText('Packaging PDF author');
    await expect(page.locator('#pdf-page-records tbody tr')).toHaveCount(2);
  }
  assert.deepEqual(await page.evaluate(() => window.packagingEvents.filter(event => event.type === 'result')), results);
  assert.deepEqual(networkRequests, [], 'Packaged features attempted an external network request');
  assert.deepEqual(pageErrors, [], 'Packaged interface raised an uncaught error');
  console.log(`Offline packaged Electron/ASAR workers, isolated-PATH tools, spectrum, DOCX/PDF privacy and six languages passed: ${target.platform}-${target.arch}`);
} finally {
  await application?.close();
  await rm(sandbox, { recursive: true, force: true });
}
