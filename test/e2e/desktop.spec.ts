import { test, expect, _electron, type ElectronApplication, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createRequire } from 'node:module';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createFixtures } from '../fixtures.js';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const require = createRequire(import.meta.url);
const executablePath = require('electron') as string;
const root = process.cwd();
let fixtures: Awaited<ReturnType<typeof createFixtures>>;
let application: ElectronApplication;
let page: Page;
let sandboxDirectory: string;

test.beforeAll(async () => { fixtures = await createFixtures(); });
test.afterAll(async () => { await fixtures.cleanup(); });
test.beforeEach(async () => {
  sandboxDirectory = await mkdtemp(join(tmpdir(), 'file-analyzer-electron-'));
  application = await _electron.launch({ executablePath,
    args: [...(process.platform === 'linux' ? ['--no-sandbox'] : []), root],
    env: { ...process.env, XDG_CONFIG_HOME: sandboxDirectory,
      FILE_ANALYZER_EXIFTOOL: process.env.FILE_ANALYZER_EXIFTOOL ?? '',
      ...(process.platform === 'linux' ? { XDG_CACHE_HOME: sandboxDirectory } : {}) },
  });
  page = await application.firstWindow();
  await expect(page.getByRole('heading', { name: 'File Analyzer', exact: true })).toBeVisible();
});
test.afterEach(async () => { await application?.close(); await rm(sandboxDirectory, { recursive: true, force: true }); });

async function pick(paths: string[]): Promise<void> {
  await application.evaluate(({ dialog }, files) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: files });
  }, paths);
  await page.getByRole('button', { name: '添加文件', exact: true }).click();
}

async function completed(count: number): Promise<void> {
  await expect(page.locator('#list-summary')).toHaveText(`${count} 个文件 · ${count} 个已处理`);
}

test('文件选择取消或出错后恢复键盘焦点，空态消失时使用添加按钮', async () => {
  await application.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] });
  });
  for (const id of ['empty-add', 'add-files']) {
    const opener = page.locator(`#${id}`);
    await opener.focus();
    await opener.press('Enter');
    await expect(page.locator('#add-files')).toBeEnabled();
    await expect(opener).toBeFocused();
  }

  // A shortcut launched without a focused control returns to the primary action.
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); });
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+o' : 'Control+o');
  await expect(page.locator('#add-files')).toBeEnabled();
  await expect(page.locator('#add-files')).toBeFocused();

  await application.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async () => { throw new Error('picker unavailable'); };
  });
  await page.locator('#empty-add').focus();
  await page.locator('#empty-add').press('Enter');
  await expect(page.locator('#app-error')).toContainText('picker unavailable');
  await expect(page.locator('#empty-add')).toBeFocused();

  await application.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
  }, fixtures.files.wav!);
  await page.locator('#empty-add').press('Enter');
  await completed(1);
  await expect(page.locator('#empty-add')).toHaveCount(0);
  await expect(page.locator('#add-files')).toBeFocused();
});

test('真实后台解析单个/多个文件，详情及混合类型对比可用', async () => {
  await expect(page.getByRole('heading', { name: '把文件拖到这里' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '参数对比' })).toBeDisabled();
  await pick([fixtures.files.wav!, fixtures.files.png!, fixtures.files.docx!]);
  await completed(3);
  await expect(page.locator('#detail-content')).toContainText('48,000 Hz');
  await expect(page.getByRole('heading', { name: '音频轨道 #0' })).toBeVisible();
  await page.getByRole('button', { name: /sample.png.*解析完成/ }).click();
  await expect(page.locator('#detail-content')).toContainText('299.9994 dpi');
  await expect(page.getByRole('heading', { name: '文件参数', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: '参数对比' }).click();
  await expect(page.getByRole('heading', { name: '3 个文件的参数对比' })).toBeVisible();
  const sampleRate = page.getByRole('row', { name: /采样率（首个音频轨道）/ });
  await expect(sampleRate).toContainText('48,000 Hz');
  await expect(sampleRate.getByRole('cell', { name: '不适用', exact: true })).toHaveCount(2);
  await page.screenshot({ path: 'test-results/desktop-comparison.png', fullPage: true });
  await pick([fixtures.files.png!]);
  await expect(page.locator('#file-count')).toHaveText('3');
  await expect(page.locator('#live-status')).toHaveText('所选文件已在列表中。');
  await page.getByRole('button', { name: '清空列表' }).click();
  await expect(page.locator('#file-count')).toHaveText('0');
  expect((await readFile(fixtures.files.png!)).length).toBeGreaterThan(0);
});

test('坏文件与缺失工具保留其他结果，修复文件后可重试', async () => {
  await pick([fixtures.files.corruptVideo!, fixtures.files.wav!]);
  await completed(2);
  await expect(page.locator('#detail-content')).toContainText('部分信息需要留意');
  await expect(page.getByRole('button', { name: '重新解析' })).toBeVisible();
  await copyFile(fixtures.files.mp4!, fixtures.files.corruptVideo!);
  await page.getByRole('button', { name: '重新解析' }).click();
  await completed(2);
  await expect(page.locator('#detail-content .badge')).toHaveText('解析完成');
  await expect(page.locator('#detail-content')).toContainText('160 px');
  await page.getByRole('button', { name: /sample.wav.*解析完成/ }).click();
  await expect(page.locator('#detail-content')).toContainText('48,000 Hz');
  await pick([join(fixtures.dir, 'does-not-exist.wav')]);
  await completed(3);
  await page.getByRole('button', { name: 'does-not-exist.wav 解析失败', exact: true }).click();
  await expect(page.locator('#detail-content')).toContainText('文件不存在');
  await expect(page.getByRole('button', { name: '重新解析' })).toBeVisible();
});

test('处理中仍可交互，清空后旧结果不复活', async () => {
  // Real worker startup and several files expose waiting/processing while the UI remains usable.
  const path = join(fixtures.dir, 'pending.unknown');
  await writeFile(path, 'local fixture');
  await pick([path, fixtures.files.xlsx!, fixtures.files.mp4!, fixtures.files.gif!]);
  await expect(page.locator('#file-count')).toHaveText('4');
  await expect(page.locator('.file-state[data-state="processing"]')).toHaveCount(1);
  await page.getByRole('tab', { name: '参数对比' }).click();
  await expect(page.getByRole('heading', { name: '4 个文件的参数对比' })).toBeVisible();
  await page.getByRole('button', { name: '清空列表' }).click();
  await expect(page.locator('#file-count')).toHaveText('0');
  // Reimport immediately while prior worker completion may still be in flight.
  await pick([fixtures.files.wav!]);
  await completed(1);
  await expect(page.locator('#file-count')).toHaveText('1');
  await expect(page.locator('#detail-content')).toContainText('48,000 Hz');
});

test('真实本地文件拖放可导入', async () => {
  const cdp = await page.context().newCDPSession(page);
  const data = { items: [], files: [fixtures.files.jpeg!], dragOperationsMask: 1 };
  await cdp.send('Input.dispatchDragEvent', { type: 'dragEnter', x: 650, y: 340, data });
  await expect(page.getByText('松开以添加文件', { exact: true })).toBeVisible();
  await cdp.send('Input.dispatchDragEvent', { type: 'dragOver', x: 650, y: 340, data });
  await cdp.send('Input.dispatchDragEvent', { type: 'drop', x: 650, y: 340, data });
  await completed(1);
  await expect(page.locator('#detail-content')).toContainText('300 dpi');
});

test('其他文件完成时保留当前详情的展开状态和键盘焦点', async () => {
  const selected = join(fixtures.dir, 'inspection.txt');
  await writeFile(selected, 'local inspection fixture');
  const paths = [selected];
  for (let index = 0; index < 6; index++) {
    const path = join(fixtures.dir, `background-${index}.wav`);
    await copyFile(fixtures.files.wav!, path);
    paths.push(path);
  }
  await pick(paths);
  await expect(page.locator('#detail-content .badge')).toHaveText('解析完成');
  await expect(page.locator('.file-state[data-state="processing"]')).toHaveCount(1);
  const summary = page.locator('#file-location-summary');
  await summary.click();
  await summary.focus();
  await completed(7);
  await expect(page.locator('#file-location')).toHaveJSProperty('open', true);
  await expect(summary).toBeFocused();
});

test('缺少工具时保留基础信息与其他文件结果，修复配置后可重试', async () => {
  await application.evaluate((_electron, path) => { process.env.FILE_ANALYZER_FFPROBE = path; }, join(sandboxDirectory, 'missing-ffprobe'));
  await pick([fixtures.files.wav!, fixtures.files.png!]);
  await completed(2);
  await expect(page.locator('#detail-content')).toContainText('未找到 ffprobe');
  await expect(page.locator('#detail-content')).toContainText('文件大小');
  await page.getByRole('button', { name: /sample.png.*解析完成/ }).click();
  await expect(page.locator('#detail-content')).toContainText('80 px');
  await application.evaluate((_electron, path) => { process.env.FILE_ANALYZER_FFPROBE = path; }, process.env.FILE_ANALYZER_FFPROBE || 'ffprobe');
  await page.getByRole('button', { name: /sample.wav.*部分解析/ }).click();
  await page.getByRole('button', { name: '重新解析' }).click();
  await completed(2);
  await expect(page.locator('#detail-content')).toContainText('48,000 Hz');
});

test('长文件名和HTML形状的元数据按文本显示', async () => {
  const path = join(fixtures.dir, `${'用于验证较长文件名的本地文档'.repeat(4)}.docx`);
  const archive = unzipSync(await readFile(fixtures.files.docx!));
  const title = '<img src=x onerror=alert(1)>';
  archive['docProps/core.xml'] = strToU8(strFromU8(archive['docProps/core.xml']!).replace('Metadata fixture', '&lt;img src=x onerror=alert(1)&gt;'));
  await writeFile(path, zipSync(archive));
  await pick([path]);
  await completed(1);
  await expect(page.locator('#detail-content')).toContainText(title);
  await expect(page.locator('#detail-content img')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('键盘、窄窗口、离线状态及可访问性', async () => {
  await page.context().setOffline(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await pick([fixtures.files.png!, fixtures.files.wav!]);
  await completed(2);
  const tab = page.getByRole('tab', { name: '文件详情' });
  await tab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '参数对比' })).toBeFocused();
  await expect(page.getByRole('tab', { name: '参数对比' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(tab).toBeFocused();
  // Electron cannot create the extra browser page used by axe's cross-frame aggregator.
  // This single-document app has no frames; legacy mode scans its complete current document.
  const accessibility = await new AxeBuilder({ page }).setLegacyMode().analyze();
  expect(accessibility.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: '添加文件', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/desktop-narrow.png', fullPage: true });
  expect(await page.evaluate(() => getComputedStyle(document.body).scrollbarColor)).not.toBe('auto');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.spinner') ?? document.body).animationName)).toBe('none');
  const unavailable = await page.evaluate(() => typeof (window as unknown as { require?: unknown }).require);
  expect(unavailable).toBe('undefined');
});
