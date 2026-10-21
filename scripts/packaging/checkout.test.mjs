import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execute = promisify(execFile);

test('Windows-style Git checkout preserves Bash line endings and pinned license bytes', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'file-analyzer-checkout-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const git = (...args) => execute('git', ['-c', 'core.autocrlf=true', '-c', 'core.safecrlf=false', ...args], {
    cwd: directory, timeout: 10_000,
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_ATTR_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: join(directory, 'empty.gitconfig') },
  });
  await writeFile(join(directory, 'empty.gitconfig'), '');
  await git('init', '--quiet');
  await copyFile(new URL('../../.gitattributes', import.meta.url), join(directory, '.gitattributes'));
  await mkdir(join(directory, 'scripts', 'packaging'), { recursive: true });
  const script = 'scripts/packaging/build-native-tools.sh';
  await copyFile(new URL('./build-native-tools.sh', import.meta.url), join(directory, script));
  const notices = 'scripts/packaging/notices';
  await cp(new URL('./notices/', import.meta.url), join(directory, notices), { recursive: true });
  // Import the checked-out collector so its fallback license comes from that checkout.
  const helpers = ['licenses.mjs', 'tools.mjs', 'sources.json'];
  for (const name of helpers) {
    await copyFile(new URL(name, import.meta.url), join(directory, 'scripts', 'packaging', name));
  }
  await writeFile(join(directory, 'control.txt'), 'This ordinary text file should become CRLF.\n');
  await git('add', '.gitattributes', 'scripts', 'control.txt');

  // checkout-index exercises real Git conversion without needing a commit or author identity.
  await rm(join(directory, script));
  await rm(join(directory, notices), { recursive: true });
  for (const name of helpers) await rm(join(directory, 'scripts', 'packaging', name));
  await rm(join(directory, 'control.txt'));
  await git('checkout-index', '--all', '--force');
  const checkedOut = await readFile(join(directory, script), 'utf8');
  assert.ok(checkedOut.startsWith('#!/usr/bin/env bash\nset -euo pipefail\n'));
  assert.ok(!checkedOut.includes('\r'), 'The Bash script must not contain CRLF.');
  assert.match(await readFile(join(directory, 'control.txt'), 'utf8'), /\r\n$/, 'autocrlf must really be enabled.');

  const provenance = JSON.parse(await readFile(new URL('./notices/provenance.json', import.meta.url), 'utf8'));
  assert.deepEqual(await readFile(join(directory, notices, 'provenance.json')),
    await readFile(new URL('./notices/provenance.json', import.meta.url)));
  for (const record of Object.values(provenance)) {
    const checkedOutLicense = await readFile(join(directory, notices, record.file));
    assert.equal(createHash('sha256').update(checkedOutLicense).digest('hex'), record.sha256,
      `Pinned license checksum must survive Windows checkout: ${record.file}`);
  }

  const app = join(directory, 'application');
  const dependency = join(app, 'node_modules', '@nodable', 'entities');
  await mkdir(dependency, { recursive: true });
  await writeFile(join(app, 'package.json'), JSON.stringify({ dependencies: { '@nodable/entities': '3.1.0' } }));
  await writeFile(join(dependency, 'package.json'), JSON.stringify({ name: '@nodable/entities', version: '3.1.0', license: 'MIT' }));
  const { collectRuntimeLicenses } = await import(pathToFileURL(join(directory, 'scripts', 'packaging', 'licenses.mjs')).href);
  const output = join(directory, 'collected-notices');
  const collected = await collectRuntimeLicenses(app, output);
  assert.equal(collected.length, 1);
  assert.deepEqual(await readFile(join(output, '@nodable__entities@3.1.0', 'LICENSE.upstream')),
    await readFile(new URL('./notices/nodable-entities-3.1.0-LICENSE', import.meta.url)));
});
