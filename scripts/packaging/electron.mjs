import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { nativeArchitecture } from './tools.mjs';

export function electronExecutable(platform) {
  if (platform === 'win32') return 'electron.exe';
  if (platform === 'darwin') return 'Electron.app/Contents/MacOS/Electron';
  if (platform === 'linux') return 'electron';
  throw new Error(`Unsupported Electron platform: ${platform}`);
}

/** Validate the native distribution explicitly; installing the npm package is insufficient. */
export async function verifyElectronRuntime(packageDirectory, target, expectedVersion) {
  const installedPackage = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8'));
  if (installedPackage.version !== expectedVersion) throw new Error('Installed Electron package differs from the pinned version; run npm ci.');
  const version = (await readFile(join(packageDirectory, 'dist', 'version'), 'utf8')).trim().replace(/^v/, '');
  if (version !== expectedVersion) throw new Error(`Electron runtime version mismatch: ${version} (expected ${expectedVersion}).`);
  const executable = electronExecutable(target.platform);
  if ((await readFile(join(packageDirectory, 'path.txt'), 'utf8')).trim() !== executable) {
    throw new Error('Electron executable path does not match the native platform.');
  }
  const path = join(packageDirectory, 'dist', executable);
  if (await nativeArchitecture(path, target.platform) !== target.arch) {
    throw new Error(`Electron runtime CPU architecture does not match ${target.arch}; reinstall the native distribution.`);
  }
  return { version, executable: path };
}
