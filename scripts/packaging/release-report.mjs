import { lstat, readFile, readdir, readlink, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectRoot, sha256, targetFromArguments, verifyTools } from './tools.mjs';

const size = bytes => ({ bytes, decimalMB: Number((bytes / 1_000_000).toFixed(3)) });
const portableName = name => name.split(sep).join('/');
const inside = (root, path) => {
  const child = relative(root, path);
  return child === '' || child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child);
};

/** Count regular file lengths once. Never follow symlinks or silently measure external files. */
async function measureApplication(directory) {
  const root = await realpath(directory);
  const files = new Map();
  let symlinks = 0;
  async function visit(folder) {
    for (const entry of (await readdir(folder)).sort()) {
      const path = join(folder, entry);
      const stat = await lstat(path);
      const name = portableName(relative(root, path));
      if (stat.isSymbolicLink()) {
        const link = await readlink(path);
        if (isAbsolute(link) || !inside(root, resolve(folder, link)) || !inside(root, await realpath(path))) {
          throw new Error(`Application symlink escapes its directory: ${name}`);
        }
        symlinks++;
      } else if (stat.isDirectory()) await visit(path);
      else if (stat.isFile()) files.set(name, stat.size);
      else throw new Error(`Unsupported application file: ${name}`);
    }
  }
  await visit(root);
  return { files, symlinks };
}

function applicationLayout(outputDirectory, platform, arch) {
  if (platform === 'win32' && arch === 'x64') {
    return { directory: join(outputDirectory, 'win-unpacked'), resources: 'resources' };
  }
  if (platform === 'darwin' && ['x64', 'arm64'].includes(arch)) {
    return { directory: join(outputDirectory, arch === 'arm64' ? 'mac-arm64' : 'mac', 'File Analyzer.app'), resources: 'Contents/Resources' };
  }
  if (platform === 'linux' && arch === 'x64') {
    return { directory: join(outputDirectory, 'linux-unpacked'), resources: 'resources' };
  }
  throw new Error(`Unsupported release report target: ${platform}-${arch}`);
}

/** Report exact artifacts after packaging. This does not claim installer/runtime tests have passed. */
export async function writeReleaseReport({ projectDirectory = projectRoot, outputDirectory = join(projectDirectory, 'release'),
  platform = process.platform, arch = process.arch, artifacts, validation = {} } = {}) {
  const smoke = validation.smoke ?? 'not-recorded';
  const installedSmoke = validation.installedSmoke ?? 'not-recorded';
  if (![smoke, installedSmoke].every(state => ['passed', 'not-recorded'].includes(state))) {
    throw new Error('Smoke validation states must be passed or not-recorded.');
  }
  if (!Array.isArray(artifacts) || artifacts.length === 0 || artifacts.some(path => typeof path !== 'string' || !path)) {
    throw new Error('Pass the exact non-empty installer artifact paths to report.');
  }
  outputDirectory = await realpath(outputDirectory);
  const extension = platform === 'win32' ? '.exe' : platform === 'darwin' ? '.dmg' : null;
  if (!extension) throw new Error('Release reports require Windows EXE or macOS DMG artifacts.');
  const names = new Set();
  const artifactRecords = [];
  for (const argument of artifacts) {
    const path = resolve(outputDirectory, argument);
    const name = basename(path);
    const key = name.toLowerCase();
    if (dirname(path) !== outputDirectory || /[\r\n\\]/.test(name) || extname(name).toLowerCase() !== extension || names.has(key)) {
      throw new Error(`Invalid or duplicate installer artifact: ${name}`);
    }
    names.add(key);
    const stat = await lstat(path);
    if (!stat.isFile() || stat.size === 0) throw new Error(`Installer artifact must be a non-empty regular file: ${name}`);
    artifactRecords.push({ file: name, ...size(stat.size), sha256: await sha256(path) });
  }
  artifactRecords.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);

  const layout = applicationLayout(outputDirectory, platform, arch);
  if (!inside(outputDirectory, await realpath(layout.directory))) throw new Error('Application directory escapes the release output.');
  const { files, symlinks } = await measureApplication(layout.directory);
  const appAsar = `${layout.resources}/app.asar`;
  if (!files.has(appAsar) || files.get(appAsar) === 0) throw new Error('Packaged app.asar is missing or empty.');
  const toolPrefix = `${layout.resources}/tools/`;
  const manifest = await verifyTools(join(layout.directory, layout.resources, 'tools'), { platform, arch }, { executeTools: false });
  const total = prefix => size([...files].filter(([name]) => name.startsWith(prefix)).reduce((sum, [, bytes]) => sum + bytes, 0));
  const fileSize = name => size(files.get(`${toolPrefix}${name}`) ?? 0);
  const suffix = platform === 'win32' ? '.exe' : '';
  const pkg = JSON.parse(await readFile(join(projectDirectory, 'package.json'), 'utf8'));
  const report = {
    schema: 1,
    application: { name: pkg.name, version: pkg.version, platform, arch },
    units: { decimalMB: 1_000_000, unpacked: 'sum of regular file lengths; symlinks are not followed' },
    artifacts: artifactRecords,
    unpacked: {
      directory: portableName(relative(outputDirectory, layout.directory)),
      ...total(''),
      regularFiles: files.size,
      symlinks,
      appAsar: size(files.get(appAsar)),
      bundledTools: total(toolPrefix),
      ffmpeg: fileSize('ffmpeg' + suffix),
      ffprobe: fileSize('ffprobe' + suffix),
      exiftoolLauncher: fileSize('exiftool' + suffix),
      exiftoolRuntime: total(toolPrefix + 'exiftool_files/'),
      perlRuntime: total(toolPrefix + 'perl/'),
      licenses: total(toolPrefix + 'licenses/'),
      sourceArchives: total(toolPrefix + 'licenses/sources/'),
    },
    tools: manifest.sources.map(({ id, version, sha256: sourceSha256 }) => ({ id, version, sourceSha256 }))
      .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    validation: { toolManifest: 'verified', smoke, installedSmoke },
  };
  await writeFile(join(outputDirectory, 'release-report.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(join(outputDirectory, 'SHA256SUMS'), artifactRecords.map(({ file, sha256: digest }) => `${digest}  ${file}\n`).join(''));
  return report;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const target = targetFromArguments();
  const artifacts = process.argv.slice(2).filter(argument => argument.startsWith('--artifact=')).map(argument => argument.slice(11));
  const report = await writeReleaseReport({ ...target, artifacts });
  for (const artifact of report.artifacts) console.log(`${artifact.file}: ${artifact.decimalMB} MB, SHA-256 ${artifact.sha256}`);
}
