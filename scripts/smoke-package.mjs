import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { _electron, expect } from '@playwright/test';
import { strToU8, zipSync } from 'fflate';
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
  const sample = join(sandbox, 'packaging smoke.wav');
  const sampleRate = 48_000;
  const pcm = Buffer.alloc(sampleRate * 2);
  for (let i = 0; i < sampleRate; i++) pcm.writeInt16LE(Math.round(12_000 * Math.sin(2 * Math.PI * 1_000 * i / sampleRate)), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(pcm.length + 36, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  await writeFile(sample, Buffer.concat([header, pcm]));
  const document = join(sandbox, 'packaging smoke.docx');
  await writeFile(document, zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    'word/document.xml': strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>'),
    'docProps/core.xml': strToU8('<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Packaging smoke author</dc:creator></cp:coreProperties>'),
  }));
  const suffix = target.platform === 'win32' ? '.exe' : '';
  const exif = await execute(join(relocated, 'exiftool' + suffix), ['-json', document], { timeout: 30_000 });
  assert.match(exif.stdout, /Packaging smoke author/);
  assert.doesNotMatch(exif.stdout, /Install Archive::Zip|Error opening file|Can't locate/);
  const decode = await execute(join(relocated, 'ffmpeg' + suffix), ['-v', 'error', '-i', sample, '-f', 'f32le', '-ac', '1', '-ar', '12000', '-t', '1', 'pipe:1'], {
    encoding: 'buffer', timeout: 30_000, maxBuffer: 1_000_000,
  });
  assert.equal(decode.stdout.length, 12_000 * 4);
  const configDirectory = join(sandbox, 'config');
  await mkdir(configDirectory);
  application = await _electron.launch({ executablePath,
    args: [...(process.platform === 'linux' ? ['--no-sandbox'] : []), `--user-data-dir=${configDirectory}`],
    env: { ...process.env, XDG_CONFIG_HOME: configDirectory, XDG_CACHE_HOME: configDirectory,
      FILE_ANALYZER_FFPROBE: join(sandbox, 'absent-ffprobe'),
      FILE_ANALYZER_FFMPEG: join(sandbox, 'absent-ffmpeg'),
      FILE_ANALYZER_EXIFTOOL: join(sandbox, 'absent-exiftool') },
  });
  assert.equal(await application.evaluate(({ app }) => app.isPackaged), true);
  assert.match(await application.evaluate(({ app }) => app.getAppPath()), /app\.asar$/);
  const page = await application.firstWindow();
  await expect(page.getByRole('heading', { name: 'File Analyzer', exact: true })).toBeVisible();
  await application.evaluate(({ dialog }, paths) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: paths });
  }, [sample, document]);
  await page.getByRole('button', { name: '添加文件', exact: true }).click();
  await expect(page.locator('#list-summary')).toHaveText('2 个文件 · 2 个已处理', { timeout: 30_000 });
  await expect(page.locator('#detail-content')).toContainText('48,000 Hz');
  await page.getByRole('button', { name: '生成频谱', exact: true }).click();
  const spectrogram = page.locator('.spectrogram-image');
  await expect(spectrogram).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => spectrogram.evaluate(image => image.naturalWidth)).toBe(1200);
  await page.getByRole('button', { name: /packaging smoke.docx.*解析完成/ }).click();
  await expect(page.locator('#detail-content')).toContainText('Packaging smoke author');
  console.log(`Packaged Electron/ASAR worker, bundled FFprobe/FFmpeg and ExifTool+Archive::Zip passed: ${target.platform}-${target.arch}`);
} finally {
  await application?.close();
  await rm(sandbox, { recursive: true, force: true });
}
