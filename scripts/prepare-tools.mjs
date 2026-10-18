import { chmod, copyFile, cp, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { execute, inventory, projectRoot, sha256, sourceIdsFor, sources, targetFromArguments, verifyTools } from './packaging/tools.mjs';

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
  await execute('tar', ['-xzf', path, '--strip-components=1', '-C', extracted], { timeout: 120_000 });
}

await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'licenses', 'sources'), { recursive: true });
for (const id of sourceIds) {
  await copyFile(join(cache, sources[id].archive), join(output, 'licenses', 'sources', sources[id].archive));
}
await copyFile(join(projectRoot, 'THIRD_PARTY_NOTICES.md'), join(output, 'licenses', 'THIRD_PARTY_NOTICES.md'));

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

if (target.platform === 'win32') {
  // Keep the complete payload, including DLLs, Archive::Zip, licenses and downstream patch notices.
  const payload = join(taskWork, 'exiftoolWindows');
  await cp(join(payload, 'bin'), output, { recursive: true });
  await mkdir(join(output, 'licenses', 'exiftool-windows'), { recursive: true });
  for (const name of ['LICENSE', 'README.md', 'package.json']) {
    await copyFile(join(payload, name), join(output, 'licenses', 'exiftool-windows', name));
  }
  await cp(join(payload, 'patches'), join(output, 'licenses', 'exiftool-windows', 'patches'), { recursive: true });
} else {
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
