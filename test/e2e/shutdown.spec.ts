import { test, expect, _electron, type ElectronApplication } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const executablePath = createRequire(import.meta.url)('electron') as string;
let application: ElectronApplication | undefined;
let applicationClosed = false;
let directory: string;
let toolPID: number | undefined;

function running(pid: number): boolean {
  try { process.kill(pid, 0); return true; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
    throw error;
  }
}

test.beforeEach(async () => {
  // The fake executable uses a POSIX shebang; Windows needs its native release validation.
  test.skip(process.platform === 'win32', '此进程生命周期样本需要 POSIX 可执行脚本。');
  toolPID = undefined;
  applicationClosed = false;
  directory = await mkdtemp(join(tmpdir(), 'file-analyzer-shutdown-'));
  const tool = join(directory, 'ffprobe.cjs');
  const pidPath = join(directory, 'tool.pid');
  await writeFile(tool, `#!/usr/bin/env node
process.on('SIGTERM', () => {});
require('node:fs').writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));
setInterval(() => {}, 1000);
`, { mode: 0o700 });
  application = await _electron.launch({ executablePath,
    args: [...(process.platform === 'linux' ? ['--no-sandbox'] : []), process.cwd()],
    env: { ...process.env, XDG_CONFIG_HOME: directory, XDG_CACHE_HOME: directory,
      FILE_ANALYZER_FFPROBE: tool },
  });
  application.on('close', () => { applicationClosed = true; });
  const page = await application.firstWindow();
  await expect(page.getByRole('button', { name: '添加文件', exact: true })).toBeEnabled();
  // An invalid WAV still reaches ffprobe via the supported-extension fallback.
  const path = join(directory, 'pending.wav');
  await writeFile(path, 'pending local audio fixture');
  await application.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
  }, path);
  await page.getByRole('button', { name: '添加文件', exact: true }).click();
  await expect.poll(async () => {
    try { toolPID = Number(await readFile(pidPath, 'utf8')); return toolPID > 0; }
    catch { return false; }
  }).toBe(true);
  expect(running(toolPID!)).toBe(true);
});

test.afterEach(async () => {
  try {
    if (application && !applicationClosed) await application.close();
  } finally {
    application = undefined;
    if (toolPID && running(toolPID)) process.kill(toolPID, 'SIGKILL');
    if (directory) await rm(directory, { recursive: true, force: true });
  }
});

test('关闭窗口会停止正在运行的解析工具', async () => {
  const page = await application!.firstWindow();
  const closed = page.waitForEvent('close');
  const exited = process.platform === 'darwin' ? undefined : application!.waitForEvent('close');
  await application!.evaluate(({ BrowserWindow }) => {
    setImmediate(() => BrowserWindow.getAllWindows()[0]!.close());
  });
  await closed;
  if (exited) await exited;
  await expect.poll(() => running(toolPID!)).toBe(false);
});

test('退出应用会在进程结束前回收正在运行的解析工具', async () => {
  const exited = application!.waitForEvent('close');
  await application!.evaluate(({ app }) => { setImmediate(() => app.quit()); });
  await exited;
  expect(running(toolPID!)).toBe(false);
});
