import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { projectRoot } from './tools.mjs';

const execute = promisify(execFile);

test('offline build stops after a failed stage and exposes its diagnostics to CI', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'file-analyzer-build-failure-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const npmCli = join(directory, 'failing-npm.cjs');
  await writeFile(npmCli, 'process.stdout.write("stage stdout 50%\\n"); process.stderr.write("stage stderr\\r\\n"); process.exitCode = 42;\n');
  const args = [join(projectRoot, 'scripts', 'build-offline.mjs'), ...(process.platform === 'linux' ? ['--development-linux'] : [])];
  await assert.rejects(execute(process.execPath, args, {
    cwd: projectRoot, timeout: 15_000,
    env: { ...process.env, npm_execpath: npmCli, GITHUB_ACTIONS: 'true' },
  }), error => {
    assert.equal(error.code, 1);
    assert.match(error.stdout, /Offline package stage: npm run test:packaging/);
    assert.match(error.stdout, /stage stdout 50%/);
    assert.doesNotMatch(error.stdout, /Offline package stage: prepare-tools/);
    const annotation = error.stderr.split('\n').find(line => line.startsWith('::error title=Offline package build::'));
    assert.ok(annotation);
    assert.match(annotation, /stage stdout 50%25%0A/);
    assert.match(annotation, /stage stderr%0D%0A/);
    assert.match(annotation, /\(42\)/);
    return true;
  });
});
