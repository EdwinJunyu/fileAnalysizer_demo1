import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { electronExecutable, verifyElectronRuntime } from './electron.mjs';

async function fixture(t, platform, arch = 'x64') {
  const directory = await mkdtemp(join(tmpdir(), 'file-analyzer-electron-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const executable = join(directory, 'dist', electronExecutable(platform));
  await mkdir(dirname(executable), { recursive: true });
  await writeFile(join(directory, 'package.json'), JSON.stringify({ version: '44.9.0' }));
  await writeFile(join(directory, 'dist', 'version'), 'v44.9.0\n');
  await writeFile(join(directory, 'path.txt'), electronExecutable(platform));
  const header = Buffer.alloc(256);
  if (platform === 'win32') {
    header.write('MZ'); header.writeUInt32LE(128, 60); header.write('PE\0\0', 128); header.writeUInt16LE(0x8664, 132);
  } else if (platform === 'darwin') {
    header.writeUInt32LE(0xfeedfacf); header.writeUInt32LE(arch === 'arm64' ? 0x0100000c : 0x01000007, 4);
  } else {
    header.write('\x7fELF'); header[5] = 1; header.writeUInt16LE(62, 18);
  }
  await writeFile(executable, header);
  return { directory, target: { platform, arch }, executable };
}

test('Electron preparation verifies the pinned version and native executable headers on each release platform', async t => {
  for (const [platform, arch] of [['win32', 'x64'], ['darwin', 'x64'], ['darwin', 'arm64'], ['linux', 'x64']]) {
    const { directory, target, executable } = await fixture(t, platform, arch);
    assert.deepEqual(await verifyElectronRuntime(directory, target, '44.9.0'), { version: '44.9.0', executable });
  }
});

test('Electron preparation rejects missing, mismatched and redirected native distributions', async t => {
  const { directory, target, executable } = await fixture(t, 'win32');
  await assert.rejects(verifyElectronRuntime(directory, target, '44.8.0'), /pinned version/);
  await writeFile(join(directory, 'dist', 'version'), '44.8.0');
  await assert.rejects(verifyElectronRuntime(directory, target, '44.9.0'), /version mismatch/);
  await writeFile(join(directory, 'dist', 'version'), '44.9.0');
  await writeFile(join(directory, 'path.txt'), '../external.exe');
  await assert.rejects(verifyElectronRuntime(directory, target, '44.9.0'), /executable path/);
  await writeFile(join(directory, 'path.txt'), 'electron.exe');
  await assert.rejects(verifyElectronRuntime(directory, { ...target, arch: 'arm64' }, '44.9.0'), /CPU architecture/);
  await rm(executable);
  await assert.rejects(verifyElectronRuntime(directory, target, '44.9.0'), /ENOENT/);
});
