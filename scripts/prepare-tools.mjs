import { chmod, copyFile, cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { execute, extractSourceArchive, inventory, projectRoot, sha256, sourceIdsFor, sources, targetFromArguments, verifyTools } from './packaging/tools.mjs';
import { enableWindowsUtf8Manifest } from './packaging/windows-exiftool.mjs';
import { strToU8, zipSync } from 'fflate';

const target = targetFromArguments();
const taskRoot = join(projectRoot, '.tools', 'packaging');
const cache = join(taskRoot, 'cache');
const taskWork = join(taskRoot, `${target.platform}-${target.arch}`, 'work');
const output = join(taskRoot, `${target.platform}-${target.arch}`, 'tools');
const sourceIds = sourceIdsFor(target.platform);
await mkdir(cache, { recursive: true });
await mkdir(taskWork, { recursive: true });

// This is a build step only. The shipped application never calls a downloader.
for (const id of sourceIds) {
  const source = sources[id];
  const path = join(cache, source.archive);
  let existing;
  try { existing = await sha256(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing !== undefined && existing !== source.sha256) throw new Error(`Cached source checksum mismatch: ${source.archive}. Remove it and retry.`);
  if (!existing) {
    console.log(`Downloading pinned build source: ${source.archive}`);
    const response = await fetch(source.url, { signal: AbortSignal.timeout(180_000) });
    if (!response.ok || !response.body) throw new Error(`${response.status} downloading ${source.url}`);
    const partial = path + '.part';
    try {
      await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
      if (await sha256(partial) !== source.sha256) throw new Error(`Downloaded source checksum mismatch: ${source.archive}`);
      await rename(partial, path);
    } finally { await rm(partial, { force: true }); }
  }
  const extracted = join(taskWork, id);
  // A clean extraction also prevents a previous build's generated files changing the next build.
  await rm(extracted, { recursive: true, force: true });
  await mkdir(extracted, { recursive: true });
  await extractSourceArchive(path, extracted, { platform: target.platform });
}

await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'licenses', 'sources'), { recursive: true });
for (const id of sourceIds) {
  await copyFile(join(cache, sources[id].archive), join(output, 'licenses', 'sources', sources[id].archive));
}
await copyFile(join(projectRoot, 'THIRD_PARTY_NOTICES.md'), join(output, 'licenses', 'THIRD_PARTY_NOTICES.md'));

if (target.platform === 'win32') {
  // Preserve the complete upstream runtime and notices; only the launcher's manifest is changed.
  const payload = join(taskWork, 'exiftoolWindows');
  await cp(join(payload, 'bin'), output, { recursive: true });
  await mkdir(join(output, 'licenses', 'exiftool-windows'), { recursive: true });
  for (const name of ['LICENSE', 'README.md', 'package.json']) {
    await copyFile(join(payload, name), join(output, 'licenses', 'exiftool-windows', name));
  }
  await cp(join(payload, 'patches'), join(output, 'licenses', 'exiftool-windows', 'patches'), { recursive: true });
  const launcher = join(output, 'exiftool.exe');
  await writeFile(launcher, enableWindowsUtf8Manifest(await readFile(launcher)));
  await writeFile(join(output, 'licenses', 'exiftool-windows', 'utf8-manifest-patch.json'), JSON.stringify({
    modification: 'Application manifest opts the unmodified launcher code into process UTF-8 on Windows 10 1903+.',
    tool: 'resedit@1.7.2',
    originalSha256: await sha256(join(payload, 'bin', 'exiftool.exe')),
    modifiedSha256: await sha256(launcher),
    recipe: 'licenses/build-recipe/windows-exiftool.mjs',
  }, null, 2) + '\n');

  // Fail before lengthy FFmpeg compilation when Unicode paths or Archive::Zip cannot work.
  const probe = await mkdtemp(join(taskWork, 'exiftool-check-'));
  try {
    const relocated = join(probe, '工具 中文');
    await mkdir(relocated);
    await copyFile(launcher, join(relocated, 'exiftool.exe'));
    await cp(join(output, 'exiftool_files'), join(relocated, 'exiftool_files'), { recursive: true });
    const document = join(relocated, '中文 素材.docx');
    await writeFile(document, zipSync({
      '[Content_Types].xml': strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
      'word/document.xml': strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>'),
      'docProps/core.xml': strToU8('<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Unicode path author</dc:creator></cp:coreProperties>'),
    }));
    const { stdout, stderr } = await execute(join(relocated, 'exiftool.exe'), ['-charset', 'filename=UTF8', '-json', document], { timeout: 30_000 });
    // DOCX dc:creator is emitted as Creator in ungrouped ExifTool JSON.
    if (JSON.parse(stdout)[0]?.Creator !== 'Unicode path author') {
      throw new Error(`ExifTool cannot read DOCX metadata through Unicode paths: ${stdout.slice(0, 3000)} ${stderr.slice(0, 1000)}`);
    }
    console.log('Windows ExifTool Unicode runtime and input-path verification passed.');
  } finally { await rm(probe, { recursive: true, force: true }); }
}

console.log(`Compiling native tools for ${target.platform}-${target.arch} (this can take several minutes).`);
const { spawn } = await import('node:child_process');
const script = join(projectRoot, 'scripts', 'packaging', 'build-native-tools.sh').replaceAll('\\', '/');
await new Promise((resolveBuild, reject) => {
  const child = spawn('bash', [script, target.platform, taskWork, output], {
    cwd: projectRoot, stdio: 'inherit', env: process.env,
  });
  child.once('error', reject);
  child.once('exit', (code, signal) => code === 0 ? resolveBuild() : reject(new Error(`Native tool build failed (${code ?? signal}).`)));
});

if (target.platform !== 'win32') {
  await mkdir(join(output, 'exiftool_files'), { recursive: true });
  await cp(join(taskWork, 'exiftool', 'lib'), join(output, 'exiftool_files', 'lib'), { recursive: true });
  await cp(join(taskWork, 'archiveZip', 'lib'), join(output, 'exiftool_files', 'lib'), { recursive: true });
  await copyFile(join(taskWork, 'exiftool', 'exiftool'), join(output, 'exiftool_files', 'exiftool'));
  // No /usr/bin/perl, inherited Perl config, or absolute build path is needed after relocation.
  await writeFile(join(output, 'exiftool'), '#!/bin/sh\nset -eu\nTOOLS_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)\nunset PERL5LIB PERLLIB PERL5OPT\nexec "$TOOLS_DIR/perl/bin/perl" -I "$TOOLS_DIR/exiftool_files/lib" "$TOOLS_DIR/exiftool_files/exiftool" "$@"\n');
  await chmod(join(output, 'exiftool'), 0o755);
}

// Keep the exact build recipe with corresponding source, beside the binaries.
await cp(join(projectRoot, 'scripts', 'packaging'), join(output, 'licenses', 'build-recipe'), {
  recursive: true, filter: source => !source.endsWith('.test.mjs'),
});
const manifest = {
  schema: 1, platform: target.platform, arch: target.arch,
  sources: sourceIds.map(id => ({ id, ...sources[id] })),
  files: await inventory(output),
};
await writeFile(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await verifyTools(output, target);
console.log(`Verified complete bundled tools: ${output}`);
