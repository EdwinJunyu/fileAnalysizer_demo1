import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);

test('Windows-style Git checkout keeps the native tools Bash script as LF', async t => {
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
  await writeFile(join(directory, 'control.txt'), 'This ordinary text file should become CRLF.\n');
  await git('add', '.gitattributes', script, 'control.txt');

  // checkout-index exercises real Git conversion without needing a commit or author identity.
  await rm(join(directory, script));
  await rm(join(directory, 'control.txt'));
  await git('checkout-index', '--all', '--force');
  const checkedOut = await readFile(join(directory, script), 'utf8');
  assert.ok(checkedOut.startsWith('#!/usr/bin/env bash\nset -euo pipefail\n'));
  assert.ok(!checkedOut.includes('\r'), 'The Bash script must not contain CRLF.');
  assert.match(await readFile(join(directory, 'control.txt'), 'utf8'), /\r\n$/, 'autocrlf must really be enabled.');
});
