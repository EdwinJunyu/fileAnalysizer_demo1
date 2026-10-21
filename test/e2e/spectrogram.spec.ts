import { test, expect, _electron, type ElectronApplication, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';

const executablePath = createRequire(import.meta.url)('electron') as string;
const execFileAsync = promisify(execFile);
const ffmpegPath = process.env.FILE_ANALYZER_FFMPEG || process.env.FFMPEG_PATH || 'ffmpeg';
let fixtureDirectory: string;
let video: string;
let audio: string;
let image: string;
let sandboxDirectory: string;
let application: ElectronApplication | undefined;
let applicationClosed: boolean;
let page: Page;
const toolPIDs = new Set<number>();

test.beforeAll(async () => {
  fixtureDirectory = await mkdtemp(join(tmpdir(), 'file-analyzer-spectrum-fixtures-'));
  video = join(fixtureDirectory, 'two-audio-tracks.mkv');
  audio = join(fixtureDirectory, 'standalone-tone.wav');
  image = join(fixtureDirectory, 'no-audio.png');
  const ffmpeg = (args: string[]) => execFileAsync(ffmpegPath,
    ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', ...args],
    { timeout: 30_000, maxBuffer: 1024 * 1024 });
  // The audio indexes are globally 1 and 2, rather than audio-relative 0 and 1.
  await ffmpeg([
    '-f', 'lavfi', '-i', 'color=c=navy:size=160x90:rate=10:duration=0.6',
    '-f', 'lavfi', '-i', 'sine=frequency=1000:sample_rate=48000:duration=0.6',
    '-f', 'lavfi', '-i', 'sine=frequency=8000:sample_rate=48000:duration=0.6',
    '-map', '0:v:0', '-map', '1:a:0', '-map', '2:a:0',
    '-c:v', 'ffv1', '-c:a', 'pcm_s16le', '-threads', '1', video,
  ]);
  await ffmpeg(['-f', 'lavfi', '-i', 'sine=frequency=2000:sample_rate=48000:duration=0.6',
    '-c:a', 'pcm_s16le', '-threads', '1', audio]);
  await ffmpeg(['-f', 'lavfi', '-i', 'color=c=navy:size=80x60:duration=0.04',
    '-frames:v', '1', '-threads', '1', '-update', '1', image]);
});

test.afterAll(async () => {
  if (fixtureDirectory) await rm(fixtureDirectory, { recursive: true, force: true });
});

test.beforeEach(async () => {
  toolPIDs.clear();
  applicationClosed = false;
  sandboxDirectory = await mkdtemp(join(tmpdir(), 'file-analyzer-spectrum-electron-'));
  application = await _electron.launch({ executablePath,
    args: [...(process.platform === 'linux' ? ['--no-sandbox'] : []), `--user-data-dir=${sandboxDirectory}`, process.cwd()],
    env: { ...process.env, XDG_CONFIG_HOME: sandboxDirectory,
      FILE_ANALYZER_FFMPEG: ffmpegPath,
      ...(process.platform === 'linux' ? { XDG_CACHE_HOME: sandboxDirectory } : {}) },
  });
  application.on('close', () => { applicationClosed = true; });
  page = await application.firstWindow();
  await expect(page.locator('#add-files')).toBeEnabled();
});

test.afterEach(async () => {
  try {
    if (application && !applicationClosed) await application.close();
  } finally {
    application = undefined;
    for (const pid of toolPIDs) if (running(pid)) process.kill(pid, 'SIGKILL');
    if (sandboxDirectory) await rm(sandboxDirectory, { recursive: true, force: true });
  }
});

async function pick(paths: string[]): Promise<void> {
  await application!.evaluate(({ dialog }, files) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: files });
  }, paths);
  await page.locator('#add-files').click();
}

async function completed(count: number): Promise<void> {
  await expect(page.locator('#list-summary')).toHaveText(`${count} 个文件 · ${count} 个已处理`);
}

async function selectFile(path: string): Promise<void> {
  await page.locator('.file-select').filter({ has: page.locator('.file-name', { hasText: basename(path) }) }).click();
}

async function configureFFmpeg(path: string): Promise<void> {
  await application!.evaluate((_electron, executable) => { process.env.FILE_ANALYZER_FFMPEG = executable; }, path);
}

async function generate(): Promise<void> {
  await page.locator('#spectrogram-generate').click();
  await expect(page.locator('#spectrogram-section')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#spectrogram-image')).toBeVisible();
  await expect(page.locator('#spectrogram-image')).toHaveJSProperty('naturalWidth', 1200);
  await expect(page.locator('#spectrogram-image')).toHaveJSProperty('naturalHeight', 744);
}

/** Locate the brightest horizontal band without depending on exact PNG bytes. */
async function peakFrequencyHz(): Promise<number> {
  return page.locator('#spectrogram-image').evaluate(element => {
    const imageElement = element as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(imageElement, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let peakRow = 0;
    let peakIntensity = -1;
    for (let y = 0; y < canvas.height; y++) {
      let intensity = 0;
      for (let x = Math.floor(canvas.width * 0.1); x < canvas.width * 0.9; x++) {
        const offset = (y * canvas.width + x) * 4;
        intensity += data[offset]! + data[offset + 1]! + data[offset + 2]!;
      }
      if (intensity > peakIntensity) { peakIntensity = intensity; peakRow = y; }
    }
    return (canvas.height - 1 - peakRow) / (canvas.height - 1) * 24_000;
  });
}

function running(pid: number): boolean {
  try { process.kill(pid, 0); return true; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
    throw error;
  }
}

async function slowFFmpeg(): Promise<() => Promise<number>> {
  const suffix = String(toolPIDs.size);
  const pidPath = join(sandboxDirectory, `ffmpeg-${suffix}.pid`);
  const tool = join(sandboxDirectory, `ffmpeg-${suffix}.cjs`);
  await writeFile(tool, `#!/usr/bin/env node
process.on('SIGTERM', () => {});
require('node:fs').writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));
setInterval(() => {}, 1000);
`, { mode: 0o700 });
  await configureFFmpeg(tool);
  return async () => {
    let pid = 0;
    await expect.poll(async () => {
      try { pid = Number(await readFile(pidPath, 'utf8')); return pid > 0; }
      catch { return false; }
    }).toBe(true);
    toolPIDs.add(pid);
    expect(running(pid)).toBe(true);
    return pid;
  };
}

test('离线生成真实双音轨频谱，原生键盘选轨及窄窗口可访问性', async () => {
  await page.context().setOffline(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await pick([video, image]);
  await completed(2);
  await expect(page.getByRole('heading', { name: '音频轨道 #1', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '音频轨道 #2', exact: true })).toBeVisible();
  const selector = page.locator('#audio-track');
  await expect(selector.locator('option')).toHaveCount(2);
  await expect(selector).toHaveValue('1');
  await expect(page.locator('#spectrogram-image')).toHaveCount(0);
  await generate();
  const firstImage = await page.locator('#spectrogram-image').getAttribute('src');
  expect(await peakFrequencyHz()).toBeGreaterThan(600);
  expect(await peakFrequencyHz()).toBeLessThan(1400);

  // Exercise the native popup as well as closed-select arrow navigation.
  await selector.focus();
  await selector.press('Space');
  await page.keyboard.press('Escape');
  await expect(selector).toBeFocused();
  await expect(selector).toHaveValue('1');
  await selector.press('ArrowDown');
  await selector.press('Enter');
  await expect(selector).toHaveValue('2');
  await generate();
  expect(await page.locator('#spectrogram-image').getAttribute('src')).not.toBe(firstImage);
  expect(await peakFrequencyHz()).toBeGreaterThan(7400);
  expect(await peakFrequencyHz()).toBeLessThan(8600);
  const spectrum = page.locator('#spectrogram-section');
  await expect(spectrum).toContainText(/时间/);
  await expect(spectrum).toContainText(/Hz/);
  await expect(spectrum).toContainText(/强度|幅度/);
  await expect(spectrum).toContainText(/dB/);
  await expect(spectrum.locator('.spectrogram-filename')).toHaveText(basename(video));
  await expect(spectrum.locator('.spectrogram-track-info')).toContainText('#2');
  await expect(spectrum.locator('.spectrogram-chart')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(spectrum.locator('.spectrogram-frequency-tick').first()).toHaveText('0 kHz');
  await expect(spectrum.locator('.spectrogram-frequency-tick').last()).toHaveText('24 kHz');
  await expect(spectrum.locator('.spectrogram-frequency-tick')).toHaveCount(6);
  await expect(spectrum.locator('.spectrogram-db-tick')).toHaveText(['0 dB', '−20 dB', '−40 dB', '−60 dB', '−80 dB', '−100 dB', '−120 dB']);
  await expect(spectrum.locator('.spectrogram-time-tick').last()).toHaveText('0:00.6');
  await page.locator('.spectrogram-chart').screenshot({ path: 'test-results/spectrogram-reference-style.png' });

  await page.setViewportSize({ width: 390, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const chartScroll = page.locator('#spectrogram-scroll');
  expect(await chartScroll.evaluate(element => element.scrollWidth - element.clientWidth)).toBeGreaterThan(200);
  await chartScroll.evaluate(element => { element.scrollLeft = 200; });
  await expect.poll(() => chartScroll.evaluate(element => element.scrollLeft)).toBe(200);

  const completedImage = await page.locator('#spectrogram-image').getAttribute('src');
  for (const locale of ['en-US', 'ja-JP', 'ko-KR', 'fr-FR', 'es-ES', 'zh-CN']) {
    await page.locator('#language-select').selectOption(locale);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('#language-select')).toBeEnabled();
    await expect(page.locator('#audio-track')).toHaveValue('2');
    await expect(page.locator('#spectrogram-image')).toHaveAttribute('src', completedImage!);
    await expect(spectrum.locator('.spectrogram-time-tick').last()).toHaveText(
      ['fr-FR', 'es-ES'].includes(locale) ? '0:00,6' : '0:00.6');
    // Locale rerenders must preserve the part of the chart being inspected.
    await expect.poll(() => chartScroll.evaluate(element => element.scrollLeft)).toBe(200);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('#spectrogram-image')).toBeVisible();
  await chartScroll.focus();
  await chartScroll.press('ArrowRight');
  await expect.poll(() => chartScroll.evaluate(element => element.scrollLeft)).toBeGreaterThan(200);
  // The app has one document; Electron cannot create axe's cross-frame helper page.
  const accessibility = await new AxeBuilder({ page }).setLegacyMode().analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: 'test-results/spectrogram-narrow.png', fullPage: true });
  await selectFile(image);
  await expect(page.locator('#detail-content')).toContainText('80 px');
  await expect(page.locator('#spectrogram-generate')).toHaveCount(0);
  await selectFile(video);
  await expect(page.locator('#audio-track')).toHaveValue('2');
  await expect(page.locator('#spectrogram-section')).toHaveAttribute('data-state', 'ready');
});

test('缺少 FFmpeg 只影响频谱，修正配置后重试保留文件参数', async () => {
  await configureFFmpeg(join(sandboxDirectory, 'missing-ffmpeg'));
  await pick([video]);
  await completed(1);
  const metadata = await page.locator('#stream-table-1').textContent();
  await page.locator('#spectrogram-generate').click();
  await expect(page.locator('#spectrogram-section')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#spectrogram-section')).toContainText('ffmpeg');
  await expect(page.locator('#spectrogram-section')).not.toContainText('spectrum:generate');
  await expect(page.locator('#detail-content .badge')).toHaveText('解析完成');
  expect(await page.locator('#stream-table-1').textContent()).toBe(metadata);
  await expect(page.locator('#spectrogram-image')).toHaveCount(0);
  await configureFFmpeg(ffmpegPath);
  await generate();
  expect(await page.locator('#stream-table-1').textContent()).toBe(metadata);
});

test('频谱生成中可导入和切换文件，取消及移除会回收工具且旧结果不复活', async () => {
  test.skip(process.platform === 'win32', '故意忽略 SIGTERM 的工具使用 POSIX 可执行脚本；正常频谱流程跨平台运行。');
  await pick([video]);
  await completed(1);
  const waitForPID = await slowFFmpeg();
  await page.locator('#spectrogram-generate').click();
  const canceledPID = await waitForPID();
  await expect(page.locator('#spectrogram-section')).toHaveAttribute('data-state', 'loading');
  await expect(page.locator('#audio-track')).toBeDisabled();
  await pick([audio, image]);
  await completed(3);
  await selectFile(audio);
  await expect(page.locator('#spectrogram-generate')).toBeDisabled();
  await expect(page.locator('#spectrogram-status')).toContainText(/其他|正在|等待/);
  await selectFile(image);
  await expect(page.locator('#detail-content')).toContainText('80 px');
  await selectFile(video);
  await page.locator('#spectrogram-cancel').click();
  await expect(page.locator('#spectrogram-section')).toHaveAttribute('data-state', 'canceled');
  expect(running(canceledPID)).toBe(false);
  await expect(page.locator('#spectrogram-image')).toHaveCount(0);
  await expect(page.locator('#spectrogram-generate')).toBeEnabled();
  await expect(page.locator('#spectrogram-generate')).toBeFocused();
  await configureFFmpeg(ffmpegPath);
  await generate();

  const waitForRemovedPID = await slowFFmpeg();
  await page.locator('#spectrogram-generate').click();
  const removedPID = await waitForRemovedPID();
  await page.getByRole('button', { name: `从列表移除 ${basename(video)}`, exact: true }).click();
  await expect(page.locator('#file-count')).toHaveText('2');
  expect(running(removedPID)).toBe(false);
  await configureFFmpeg(ffmpegPath);
  await pick([video]);
  await completed(3);
  await selectFile(video);
  await expect(page.locator('#spectrogram-section')).toHaveAttribute('data-state', 'idle');
  await expect(page.locator('#spectrogram-image')).toHaveCount(0);
  await expect(page.locator('#detail-content .badge')).toHaveText('解析完成');
});

test('退出应用前回收正在生成频谱的 FFmpeg 进程', async () => {
  test.skip(process.platform === 'win32', '此进程回收样本需要 POSIX shebang；正常频谱流程不跳过 Windows。');
  await pick([video]);
  await completed(1);
  const waitForPID = await slowFFmpeg();
  await page.locator('#spectrogram-generate').click();
  const pid = await waitForPID();
  const exited = application!.waitForEvent('close');
  await application!.evaluate(({ app }) => { setImmediate(() => app.quit()); });
  await exited;
  expect(running(pid)).toBe(false);
});
