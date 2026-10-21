import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { inventory, sourceIdsFor, sources } from './tools.mjs';
import { writeReleaseReport } from './release-report.mjs';

const hash = content => createHash('sha256').update(content).digest('hex');

async function fixture(t, platform = 'win32', arch = 'x64') {
  const projectDirectory = await mkdtemp(join(tmpdir(), 'file-analyzer-report-'));
  t.after(() => rm(projectDirectory, { recursive: true, force: true }));
  await writeFile(join(projectDirectory, 'package.json'), JSON.stringify({ name: 'file-analyzer', version: '0.1.0' }));
  const outputDirectory = join(projectDirectory, 'release');
  const appDirectory = platform === 'win32' ? join(outputDirectory, 'win-unpacked')
    : join(outputDirectory, arch === 'arm64' ? 'mac-arm64' : 'mac', 'File Analyzer.app');
  const resources = join(appDirectory, ...(platform === 'darwin' ? ['Contents', 'Resources'] : ['resources']));
  const tools = join(resources, 'tools');
  async function put(path, content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  await put(join(resources, 'app.asar'), 'packaged application fixture');
  const suffix = platform === 'win32' ? '.exe' : '';
  for (const name of ['ffmpeg', 'ffprobe', 'exiftool']) await put(join(tools, name + suffix), name);
  const runtimeFiles = platform === 'win32'
    ? ['exiftool_files/perl.exe', 'exiftool_files/perl532.dll', 'exiftool_files/lib/Archive/Zip.pm',
      'exiftool_files/exiftool.pl', 'exiftool_files/Licenses_Strawberry_Perl.zip']
    : ['perl/bin/perl', 'exiftool_files/exiftool', 'exiftool_files/lib/Archive/Zip.pm'];
  for (const name of [...runtimeFiles, 'licenses/THIRD_PARTY_NOTICES.md', 'licenses/ffmpeg/configure-arguments.json']) {
    await put(join(tools, name), name);
  }
  // Use tiny archives in this isolated test process. Keep production verification unchanged.
  // Top-level node:test cases run sequentially; each case restores the pinned checksum table.
  for (const id of sourceIdsFor(platform)) {
    const originalHash = sources[id].sha256;
    t.after(() => { sources[id].sha256 = originalHash; });
    const content = `fixture source: ${id}`;
    sources[id].sha256 = hash(content);
    await put(join(tools, 'licenses', 'sources', sources[id].archive), content);
  }
  const manifest = { schema: 1, platform, arch,
    sources: sourceIdsFor(platform).map(id => ({ id, ...sources[id] })), files: await inventory(tools) };
  await put(join(tools, 'manifest.json'), JSON.stringify(manifest));
  const installer = join(outputDirectory, `File-Analyzer-0.1.0-${platform}-${arch}.${platform === 'win32' ? 'exe' : 'dmg'}`);
  await put(installer, 'installer fixture');
  return { projectDirectory, outputDirectory, platform, arch, artifacts: [installer], appDirectory, tools, installer };
}

test('release report measures the complete package and writes deterministic portable checksums', async t => {
  const options = await fixture(t);
  const report = await writeReleaseReport(options);
  assert.equal(report.artifacts[0].bytes, Buffer.byteLength('installer fixture'));
  assert.equal(report.artifacts[0].sha256, hash('installer fixture'));
  assert.equal(report.artifacts[0].file, 'File-Analyzer-0.1.0-win32-x64.exe');
  assert.equal(report.unpacked.appAsar.bytes, Buffer.byteLength('packaged application fixture'));
  assert.equal(report.unpacked.ffmpeg.bytes, 'ffmpeg'.length);
  assert.equal(report.unpacked.ffprobe.bytes, 'ffprobe'.length);
  assert.ok(report.unpacked.exiftoolRuntime.bytes > 0);
  assert.ok(report.unpacked.sourceArchives.bytes > 0);
  assert.ok(report.unpacked.licenses.bytes > report.unpacked.sourceArchives.bytes);
  assert.ok(report.unpacked.bytes > report.unpacked.bundledTools.bytes);
  assert.deepEqual(report.tools.map(tool => tool.id), ['exiftool', 'exiftoolWindows', 'ffmpeg', 'zlib']);
  assert.deepEqual(report.validation, { toolManifest: 'verified', smoke: 'not-recorded', installedSmoke: 'not-recorded' });
  const reportPath = join(options.outputDirectory, 'release-report.json');
  const before = await readFile(reportPath, 'utf8');
  assert.ok(!before.includes(options.projectDirectory));
  const sums = await readFile(join(options.outputDirectory, 'SHA256SUMS'), 'utf8');
  assert.equal(sums, `${hash('installer fixture')}  File-Analyzer-0.1.0-win32-x64.exe\n`);
  await writeReleaseReport(options);
  assert.equal(await readFile(reportPath, 'utf8'), before);
  const validated = await writeReleaseReport({ ...options, validation: { smoke: 'passed', installedSmoke: 'passed' } });
  assert.equal(validated.validation.installedSmoke, 'passed');
});

test('release report refuses missing, duplicate, empty and external installer artifacts', async t => {
  const options = await fixture(t);
  await assert.rejects(writeReleaseReport({ ...options, artifacts: [] }), /exact non-empty/);
  await assert.rejects(writeReleaseReport({ ...options, artifacts: [...options.artifacts, ...options.artifacts] }), /duplicate/);
  await assert.rejects(writeReleaseReport({ ...options, artifacts: [join(options.projectDirectory, 'outside.exe')] }), /Invalid/);
  await assert.rejects(writeReleaseReport({ ...options, artifacts: ['missing.exe'] }), /ENOENT/);
  await writeFile(options.installer, '');
  await assert.rejects(writeReleaseReport(options), /non-empty regular file/);
});

test('release report refuses incomplete or modified bundled tools', async t => {
  const options = await fixture(t);
  await writeFile(join(options.tools, 'ffmpeg.exe'), 'tampered');
  await assert.rejects(writeReleaseReport(options), /checksum mismatch/);
  await rm(join(options.tools, 'ffmpeg.exe'));
  await assert.rejects(writeReleaseReport(options), /files differ/);
});

test('release report includes macOS architecture layout without following framework aliases', async t => {
  const options = await fixture(t, 'darwin', 'arm64');
  if (process.platform !== 'win32') await symlink('Resources', join(options.appDirectory, 'Contents', 'Resources-alias'));
  const report = await writeReleaseReport(options);
  assert.equal(report.unpacked.directory, 'mac-arm64/File Analyzer.app');
  assert.ok(report.unpacked.perlRuntime.bytes > 0);
  assert.equal(report.unpacked.symlinks, process.platform === 'win32' ? 0 : 1);
});

test('release report rejects external and cyclic symlinks and unsubstantiated validation states', async t => {
  const options = await fixture(t);
  await assert.rejects(writeReleaseReport({ ...options, validation: { smoke: 'assumed' } }), /validation states/);
  if (process.platform === 'win32') return;
  const link = join(options.appDirectory, 'external');
  await symlink('..', link);
  await assert.rejects(writeReleaseReport(options), /symlink escapes/);
  await rm(link);
  await symlink('cycle', join(options.appDirectory, 'cycle'));
  await assert.rejects(writeReleaseReport(options), /ELOOP/);
});
