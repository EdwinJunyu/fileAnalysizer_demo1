import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inventory, nativeArchitecture, safeChild, sourceIdsFor, sources, verifyTools } from './tools.mjs';
import { collectRuntimeLicenses } from './licenses.mjs';

async function fixture(t, platform = 'darwin') {
  const root = await mkdtemp(join(tmpdir(), 'file-analyzer-packaging-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const manifest = { schema: 1, platform, arch: 'x64',
    sources: sourceIdsFor(platform).map(id => ({ id, ...sources[id] })), files: {} };
  await writeFile(join(root, 'ffmpeg'), 'original executable bytes');
  manifest.files = await inventory(root);
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
  return { root, manifest, target: { platform, arch: 'x64' } };
}

test('packaging rejects modified and unexpected tool files before executing anything', async t => {
  const { root, target } = await fixture(t);
  await writeFile(join(root, 'ffmpeg'), 'changed executable bytes');
  await assert.rejects(verifyTools(root, target, { executeTools: false }), /checksum mismatch/);
  await writeFile(join(root, 'added'), 'unexpected');
  await assert.rejects(verifyTools(root, target, { executeTools: false }), /files differ/);
});

test('packaging rejects an architecture mismatch and incomplete pinned source set', async t => {
  const { root, manifest, target } = await fixture(t);
  await assert.rejects(verifyTools(root, { ...target, arch: 'arm64' }, { executeTools: false }), /architecture/);
  manifest.sources.pop();
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
  await assert.rejects(verifyTools(root, target, { executeTools: false }), /complete pinned source set/);
});

test('a Windows executable alone is not accepted as a complete ExifTool package', async t => {
  const { root, manifest, target } = await fixture(t, 'win32');
  await rm(join(root, 'ffmpeg'));
  for (const name of ['ffmpeg.exe', 'ffprobe.exe', 'exiftool.exe', 'licenses/THIRD_PARTY_NOTICES.md', 'licenses/ffmpeg/configure-arguments.json']) {
    const parent = name.slice(0, name.lastIndexOf('/'));
    if (parent) await mkdir(join(root, parent), { recursive: true });
    await writeFile(join(root, name), 'fixture');
  }
  manifest.files = await inventory(root);
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
  await assert.rejects(verifyTools(root, target, { executeTools: false }), /Required bundled file missing: exiftool_files\/perl.exe/);
});

test('tool manifests reject paths and symlinks that escape the relocatable directory', async t => {
  for (const name of ['../ffmpeg', 'nested/../../ffmpeg', '/tmp/ffmpeg', 'nested\\ffmpeg']) {
    assert.throws(() => safeChild('/tmp/tools', name), /Unsafe|escapes/);
  }
  const { root } = await fixture(t);
  if (process.platform !== 'win32') {
    await symlink('/bin/sh', join(root, 'external'));
    await assert.rejects(inventory(root), /Non-portable symlink/);
  }
});

test('production licenses include nested dependency versions and fail when a license text is missing', async t => {
  const root = await mkdtemp(join(tmpdir(), 'file-analyzer-npm-notices-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'package.json'), JSON.stringify({ dependencies: { alpha: '1', outer: '1' } }));
  const packages = [
    ['node_modules/alpha', { name: 'alpha', version: '1.0.0', license: 'MIT' }],
    ['node_modules/outer', { name: 'outer', version: '1.0.0', license: 'MIT', dependencies: { alpha: '2' } }],
    ['node_modules/outer/node_modules/alpha', { name: 'alpha', version: '2.0.0', license: 'BSD-2-Clause' }],
  ];
  for (const [name, pkg] of packages) {
    await mkdir(join(root, name), { recursive: true });
    await writeFile(join(root, name, 'package.json'), JSON.stringify(pkg));
    await writeFile(join(root, name, 'LICENSE'), `${pkg.name}@${pkg.version} license text`);
  }
  const output = join(root, 'notices');
  const collected = await collectRuntimeLicenses(root, output);
  assert.equal(collected.length, 3);
  assert.equal(await readFile(join(output, 'alpha@2.0.0/LICENSE'), 'utf8'), 'alpha@2.0.0 license text');
  await rm(join(root, 'node_modules/alpha/LICENSE'));
  await assert.rejects(collectRuntimeLicenses(root, output), /No license text found for alpha@1.0.0/);
});

test('native architecture checks read executable headers rather than trusting the manifest label', async t => {
  const { root } = await fixture(t);
  const path = join(root, 'binary');
  const macho = Buffer.alloc(64); macho.writeUInt32LE(0xfeedfacf); macho.writeUInt32LE(0x0100000c, 4);
  await writeFile(path, macho);
  assert.equal(await nativeArchitecture(path, 'darwin'), 'arm64');
  const pe = Buffer.alloc(256); pe.write('MZ'); pe.writeUInt32LE(128, 60); pe.write('PE\0\0', 128); pe.writeUInt16LE(0x8664, 132);
  await writeFile(path, pe);
  assert.equal(await nativeArchitecture(path, 'win32'), 'x64');
  await writeFile(path, 'not an executable');
  await assert.rejects(nativeArchitecture(path, 'win32'), /Invalid native binary/);
});

test('license collection preserves full README licenses and only uses exact reviewed upstream fallback versions', async t => {
  const root = await mkdtemp(join(tmpdir(), 'file-analyzer-npm-fallback-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'package.json'), JSON.stringify({ dependencies: { '@nodable/entities': '3.1.0', alpha: '1' } }));
  const nodable = join(root, 'node_modules/@nodable/entities');
  const alpha = join(root, 'node_modules/alpha');
  await mkdir(nodable, { recursive: true }); await mkdir(alpha, { recursive: true });
  await writeFile(join(nodable, 'package.json'), JSON.stringify({ name: '@nodable/entities', version: '3.1.0', license: 'MIT' }));
  await writeFile(join(alpha, 'package.json'), JSON.stringify({ name: 'alpha', version: '1.0.0', license: 'MIT' }));
  const mit = await readFile(new URL('./notices/nodable-entities-3.1.0-LICENSE', import.meta.url), 'utf8');
  await writeFile(join(alpha, 'README.md'), `# Package\n\n## License\n${mit.replace('2026 Nodable', '2020 Example')}`);
  const output = join(root, 'notices');
  const packages = await collectRuntimeLicenses(root, output);
  assert.match(await readFile(join(output, '@nodable__entities@3.1.0/LICENSE.upstream'), 'utf8'), /Copyright \(c\) 2026 Nodable/);
  assert.match(packages.find(pkg => pkg.name === '@nodable/entities').supplementalLicense.url, /ac48e7ea591da372be023a481875c747535812b3/);
  assert.match(await readFile(join(output, 'alpha@1.0.0/README.md'), 'utf8'), /Copyright/);
  await writeFile(join(nodable, 'package.json'), JSON.stringify({ name: '@nodable/entities', version: '3.1.1', license: 'MIT' }));
  await assert.rejects(collectRuntimeLicenses(root, output), /No license text found for @nodable\/entities@3.1.1/);
});
