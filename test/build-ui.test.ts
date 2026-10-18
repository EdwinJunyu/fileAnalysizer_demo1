import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';

const exec = promisify(execFile);

test('真实 UI 构建兼容 LF 和 CRLF 的设计文件，生成相同 tokens 并通过检查', { timeout: 30_000 }, async () => {
  const root = resolve('.');
  const directory = await mkdtemp(join(tmpdir(), 'file-analyzer-build-ui-'));
  try {
    await mkdir(join(directory, 'scripts'));
    await copyFile(join(root, 'scripts', 'build-ui.mjs'), join(directory, 'scripts', 'build-ui.mjs'));
    await cp(join(root, 'src', 'ui'), join(directory, 'src', 'ui'), { recursive: true });
    await symlink(join(root, 'node_modules'), join(directory, 'node_modules'), 'junction');
    const design = (await readFile(join(root, 'DESIGN.md'), 'utf8')).replace(/\r\n/g, '\n');
    const build = (...args: string[]) => exec(process.execPath, ['scripts/build-ui.mjs', ...args], {
      cwd: directory,
      timeout: 10_000,
    });

    await writeFile(join(directory, 'DESIGN.md'), design);
    await build();
    const tokensPath = join(directory, 'dist', 'ui', 'tokens.css');
    const expectedTokens = await readFile(tokensPath, 'utf8');
    assert.match(expectedTokens, /--color-primary:/);

    await writeFile(join(directory, 'DESIGN.md'), design.replace(/\n/g, '\r\n'));
    await build();
    assert.equal(await readFile(tokensPath, 'utf8'), expectedTokens);
    assert.ok((await readFile(join(directory, 'dist', 'ui', 'app.js'), 'utf8')).length > 0);
    await build('--check');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
