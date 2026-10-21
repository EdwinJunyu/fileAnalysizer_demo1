import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, open, readFile, readdir, readlink } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const execute = promisify(execFile);
export const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
export const sources = JSON.parse(await readFile(new URL('./sources.json', import.meta.url), 'utf8'));
export const sourceIdsFor = platform => platform === 'win32'
  ? ['ffmpeg', 'zlib', 'exiftool', 'exiftoolWindows'] : ['ffmpeg', 'zlib', 'exiftool', 'perl', 'archiveZip'];

export async function extractSourceArchive(archive, directory, { platform = process.platform, cwd = projectRoot } = {}) {
  // GNU tar treats a drive colon as a remote host and backslashes as escape sequences.
  const localPath = path => platform === 'win32' ? path.replaceAll('\\', '/') : path;
  await execute('tar', [...(platform === 'win32' ? ['--force-local'] : []),
    '-xzf', localPath(archive), '--strip-components=1', '-C', localPath(directory)], { cwd, timeout: 120_000 });
}

export async function sha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export async function nativeArchitecture(path, platform) {
  const file = await open(path, 'r');
  const header = Buffer.alloc(4096);
  let length;
  try { length = (await file.read(header, 0, header.length, 0)).bytesRead; } finally { await file.close(); }
  if (length < 64) throw new Error(`Invalid native binary: ${path}`);
  if (platform === 'win32' && header.toString('ascii', 0, 2) === 'MZ') {
    const offset = header.readUInt32LE(60);
    if (offset + 6 <= length && header.toString('ascii', offset, offset + 4) === 'PE\0\0') {
      if (header.readUInt16LE(offset + 4) === 0x8664) return 'x64';
      if (header.readUInt16LE(offset + 4) === 0xaa64) return 'arm64';
    }
  } else if (platform === 'darwin' && header.readUInt32LE(0) === 0xfeedfacf) {
    if (header.readUInt32LE(4) === 0x01000007) return 'x64';
    if (header.readUInt32LE(4) === 0x0100000c) return 'arm64';
  } else if (platform === 'linux' && header.toString('ascii', 1, 4) === 'ELF' && header[5] === 1) {
    if (header.readUInt16LE(18) === 62) return 'x64';
    if (header.readUInt16LE(18) === 183) return 'arm64';
  }
  throw new Error(`Unsupported native binary format/architecture: ${path}`);
}

export function safeChild(root, name) {
  if (!name || isAbsolute(name) || name.includes('\\') || name.split('/').some(part => part === '..' || part === '.')) {
    throw new Error(`Unsafe manifest path: ${name}`);
  }
  const path = resolve(root, name);
  if (!path.startsWith(resolve(root) + sep)) throw new Error(`Path escapes tools directory: ${name}`);
  return path;
}

export async function inventory(directory) {
  const files = {};
  async function visit(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      const name = relative(directory, path).split(sep).join('/');
      if (name === 'manifest.json') continue;
      if (entry.isDirectory()) await visit(path);
      else if (entry.isSymbolicLink()) {
        const link = await readlink(path);
        const target = resolve(folder, link);
        if (isAbsolute(link) || !target.startsWith(resolve(directory) + sep)) throw new Error(`Non-portable symlink: ${name}`);
        files[name] = { link };
      } else if (entry.isFile()) {
        files[name] = { sha256: await sha256(path), size: (await lstat(path)).size };
      } else throw new Error(`Unsupported tools entry: ${name}`);
    }
  }
  await visit(directory);
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
}

export function targetFromArguments(args = process.argv.slice(2)) {
  const developmentLinux = args.includes('--development-linux');
  const supported = process.platform === 'win32' && process.arch === 'x64'
    || process.platform === 'darwin' && ['x64', 'arm64'].includes(process.arch)
    || process.platform === 'linux' && developmentLinux;
  if (!supported) throw new Error('Use native Windows x64 or macOS x64/arm64; Linux needs --development-linux for verification only.');
  return { platform: process.platform, arch: process.arch };
}

export async function verifyTools(directory, target, { executeTools = true } = {}) {
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
  if (manifest.schema !== 1 || manifest.platform !== target.platform || manifest.arch !== target.arch) {
    throw new Error('Tool manifest platform/architecture does not match this native build.');
  }
  if (!manifest.files || !Array.isArray(manifest.sources) || manifest.sources.length === 0) throw new Error('Incomplete tool manifest.');
  const expectedSources = sourceIdsFor(target.platform).sort();
  if (JSON.stringify(manifest.sources.map(source => source.id).sort()) !== JSON.stringify(expectedSources)) {
    throw new Error('Tool manifest must include the complete pinned source set for its platform.');
  }
  const actual = await inventory(directory);
  if (JSON.stringify(Object.keys(actual).sort()) !== JSON.stringify(Object.keys(manifest.files).sort())) {
    throw new Error('Tool files differ from the manifest; rerun prepare:tools.');
  }
  for (const [name, expected] of Object.entries(manifest.files)) {
    safeChild(directory, name);
    if (JSON.stringify(actual[name]) !== JSON.stringify(expected)) throw new Error(`Tool checksum mismatch: ${name}`);
  }
  const suffix = target.platform === 'win32' ? '.exe' : '';
  const required = ['ffmpeg', 'ffprobe', 'exiftool'].map(name => name + suffix);
  required.push('licenses/THIRD_PARTY_NOTICES.md', 'licenses/ffmpeg/configure-arguments.json');
  if (target.platform === 'win32') {
    required.push('exiftool_files/perl.exe', 'exiftool_files/perl532.dll', 'exiftool_files/lib/Archive/Zip.pm',
      'exiftool_files/exiftool.pl', 'exiftool_files/Licenses_Strawberry_Perl.zip');
  } else {
    required.push('perl/bin/perl', 'exiftool_files/exiftool', 'exiftool_files/lib/Archive/Zip.pm');
  }
  for (const name of required) if (!actual[name]) throw new Error(`Required bundled file missing: ${name}`);
  for (const record of manifest.sources) {
    const pinned = sources[record.id];
    if (!pinned || record.sha256 !== pinned.sha256 || record.version !== pinned.version || record.url !== pinned.url) throw new Error(`Unpinned source: ${record.id}`);
    const sourcePath = `licenses/sources/${pinned.archive}`;
    if (actual[sourcePath]?.sha256 !== pinned.sha256) throw new Error(`Corresponding source missing or changed: ${sourcePath}`);
  }
  if (executeTools) {
    const nativeFiles = ['ffmpeg' + suffix, 'ffprobe' + suffix,
      target.platform === 'win32' ? 'exiftool.exe' : 'perl/bin/perl'];
    for (const name of nativeFiles) {
      if (await nativeArchitecture(join(directory, name), target.platform) !== target.arch) throw new Error(`Wrong tool CPU architecture: ${name}`);
    }
    const options = { timeout: 30_000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 };
    for (const name of ['ffmpeg', 'ffprobe']) {
      const { stdout } = await execute(join(directory, name + suffix), ['-version'], options);
      if (!new RegExp(`^${name} version n?${sources.ffmpeg.version.replaceAll('.', '\\.')}(?:\\s|-)`).test(stdout)) {
        throw new Error(`Unexpected ${name} version: ${stdout.split('\n')[0]}`);
      }
      if (/--enable-(?:gpl|nonfree|version3)(?:\s|$)/.test(stdout)) throw new Error(`Unexpected ${name} license configuration.`);
    }
    const license = await execute(join(directory, 'ffmpeg' + suffix), ['-L'], options);
    if (!/GNU\s+Lesser\s+General\s+Public\s+License/.test(license.stdout) || /GNU\s+General\s+Public\s+License/.test(license.stdout)) {
      throw new Error('FFmpeg must report its LGPL configuration.');
    }
    const capabilities = await execute(join(directory, 'ffmpeg' + suffix), ['-hide_banner', '-encoders'], options);
    if (!/\bpng\s+PNG/.test(capabilities.stdout)) throw new Error('FFmpeg lacks the PNG encoder required for spectrograms.');
    const filters = await execute(join(directory, 'ffmpeg' + suffix), ['-hide_banner', '-filters'], options);
    if (!/\bshowspectrumpic\s/.test(filters.stdout)) throw new Error('FFmpeg lacks the spectrogram filter.');
    const { stdout } = await execute(join(directory, 'exiftool' + suffix), ['-ver'], options);
    if (stdout.trim() !== sources.exiftool.version) throw new Error(`Unexpected ExifTool version: ${stdout.trim()}`);
    if (target.platform !== 'win32') {
      const { stdout: perlVersion } = await execute(join(directory, 'perl/bin/perl'), ['-e', 'print $^V'], options);
      if (perlVersion !== `v${sources.perl.version}`) throw new Error(`Unexpected bundled Perl: ${perlVersion}`);
      await execute(join(directory, 'perl/bin/perl'), ['-I', join(directory, 'exiftool_files/lib'), '-MArchive::Zip', '-MCompress::Raw::Zlib', '-e', 'exit 0'], options);
    }
  }
  return manifest;
}
