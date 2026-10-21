import { test, expect, _electron, type ElectronApplication, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createRequire } from 'node:module';
import { copyFile, mkdtemp, open, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createFixtures } from '../fixtures.js';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { pdfFixture, encryptedPdfFixture, writeSparsePdf } from '../pdf-fixtures.js';
import { runTool } from '../../src/tools.js';
import { DOCUMENT_MAX_BYTES, MEDIA_MAX_BYTES } from '../../src/limits.js';

const require = createRequire(import.meta.url);
const executablePath = require('electron') as string;
const root = process.cwd();
let fixtures: Awaited<ReturnType<typeof createFixtures>>;
let application: ElectronApplication;
let page: Page;
let sandboxDirectory: string;

test.beforeAll(async () => {
  fixtures = await createFixtures();
  for (const [key, bytes] of [
    ['pdf', await pdfFixture('Public <img src=x onerror=alert(1)> Author')],
    ['pdfClean', await pdfFixture()], ['pdfEncrypted', encryptedPdfFixture()],
  ] as const) {
    fixtures.files[key] = join(fixtures.dir, `${key}.pdf`);
    await writeFile(fixtures.files[key]!, bytes);
  }
  fixtures.files.privateImage = join(fixtures.dir, 'private-photo.jpg');
  await copyFile(fixtures.files.jpeg!, fixtures.files.privateImage);
  await runTool('exiftool', ['-overwrite_original', '-Artist=Public Photographer', '-GPSLatitude=0',
    '-GPSLatitudeRef=N', '-GPSLongitude=12.34', '-GPSLongitudeRef=E', '-Make=Public Camera',
    '-Model=Public Model', '-ExifIFD:SerialNumber=PUBLIC-123', fixtures.files.privateImage]);
});
test.afterAll(async () => { await fixtures.cleanup(); });
test.beforeEach(async () => {
  sandboxDirectory = await mkdtemp(join(tmpdir(), 'file-analyzer-electron-'));
  application = await _electron.launch({ executablePath,
    args: [...(process.platform === 'linux' ? ['--no-sandbox'] : []), `--user-data-dir=${sandboxDirectory}`, root],
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
  await expect(page.getByRole('heading', { name: '音频轨道 #0', exact: true })).toBeVisible();
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

test('打印用途计算保留条件、验证输入，并与文件记录的 DPI 区分', async () => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.context().setOffline(true);
  await pick([fixtures.files.png!, fixtures.files.wav!]);
  await completed(2);
  const input = page.getByLabel('目标打印 DPI', { exact: true });
  await expect(input).toHaveValue('300');
  await expect(page.locator('#print-result')).toHaveText('按 300 DPI：宽 0.67733 cm × 高 0.508 cm');
  await expect(page.locator('#print-hint')).toContainText('不是文件记录值');

  await input.fill('0');
  await expect(page.locator('#print-result')).toHaveText('条件已更改，请计算。');
  await input.press('Enter');
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#print-error')).toContainText('1 至 9600');
  await input.fill('');
  await input.press('Enter');
  await expect(page.locator('#print-result')).toHaveText('暂无可用的打印尺寸。');
  await input.fill('150');
  await input.press('Enter');
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#print-result')).toHaveText('按 150 DPI：宽 1.3547 cm × 高 1.016 cm');
  await expect(page.locator('#file-parameters-table')).toContainText('299.9994 dpi');

  const help = page.locator('#detail-content summary[aria-label="水平 DPI：参数解释"]');
  await help.focus();
  await page.keyboard.press('Enter');
  await expect(help.locator('..')).toHaveAttribute('open', '');
  await expect(help.locator('..')).toContainText('缺失或冲突时不假设为 72');
  await page.getByRole('tab', { name: '参数对比' }).click();
  await page.getByRole('tab', { name: '文件详情' }).click();
  await expect(input).toHaveValue('150');
  await expect(help.locator('..')).toHaveAttribute('open', '');

  await page.getByRole('button', { name: /sample.wav.*解析完成/ }).click();
  await expect(page.locator('.usage-audio')).toContainText('11,520,000 byte');
  await page.getByRole('button', { name: /sample.png.*解析完成/ }).click();
  await expect(input).toHaveValue('150');
  await expect(page.locator('#print-result')).toContainText('按 150 DPI');
  await page.setViewportSize({ width: 390, height: 780 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await input.fill('abc');
  await page.getByRole('button', { name: '计算尺寸', exact: true }).click();
  expect((await new AxeBuilder({ page }).setLegacyMode().analyze()).violations).toEqual([]);
  await input.fill('150'); await input.press('Enter');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/usage-print-narrow.png', fullPage: true });
  await page.locator('.usage-calculations').screenshot({ path: 'test-results/usage-print-panel.png' });
  await page.getByRole('button', { name: '从列表移除 sample.png', exact: true }).click();
  await pick([fixtures.files.png!]); await completed(2);
  await page.getByRole('button', { name: /sample.png.*解析完成/ }).click();
  await expect(input).toHaveValue('300');
  expect(pageErrors).toEqual([]);
});

test('有损位深不默认猜测，音频参数解释在详情和对比中可用', async () => {
  await pick([fixtures.files.mp3!, fixtures.files.wav!]);
  await completed(2);
  await expect(page.locator('.usage-audio')).toContainText('缺少有效的采样率、位深或声道数');
  await expect(page.locator('.usage-audio')).not.toContainText('每分钟约');
  const detailHelp = page.locator('summary[aria-label="采样率：参数解释"]');
  await detailHelp.click();
  await expect(detailHelp.locator('..')).toContainText('提高采样率不会恢复已丢失的高频');
  await page.getByRole('tab', { name: '参数对比' }).click();
  const compareHelp = page.locator('summary[aria-label="采样率（首个音频轨道）：参数解释"]');
  await compareHelp.focus(); await page.keyboard.press('Enter');
  await expect(compareHelp.locator('..')).toContainText('提高采样率不会恢复已丢失的高频');
  expect((await new AxeBuilder({ page }).setLegacyMode().analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/parameter-help-comparison.png', fullPage: true });
});

test('真实图片的 GPS、作者和设备信息可按来源检查，切换文件不泄漏旧结果', async () => {
  await page.context().setOffline(true);
  const before = await readFile(fixtures.files.privateImage!);
  await pick([fixtures.files.privateImage!, fixtures.files.pdfClean!]); await completed(2);
  await expect(page.locator('#privacy-section')).toHaveAttribute('data-state', 'checked');
  await expect(page.locator('#privacy-metadata-table')).not.toBeVisible();
  await page.locator('#privacy-records-summary').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#privacy-metadata-table')).toContainText('Public Photographer');
  await expect(page.locator('#privacy-metadata-table')).toContainText('PUBLIC-123');
  await expect(page.locator('#privacy-metadata-table')).toContainText('ExifTool: GPS:GPSLatitude');
  const latitude = page.locator('#privacy-metadata-table').getByRole('cell', { name: 'ExifTool: GPS:GPSLatitude', exact: true }).locator('..');
  await expect(latitude.getByRole('cell', { name: '0', exact: true })).toHaveCount(1);
  expect((await new AxeBuilder({ page }).setLegacyMode().analyze()).violations).toEqual([]);
  await page.locator('#privacy-section').screenshot({ path: 'test-results/privacy-photo.png' });
  await page.getByRole('button', { name: /pdfClean.pdf.*解析完成/ }).click();
  await expect(page.locator('#privacy-section')).toContainText('在已读取的支持字段中未发现记录');
  await expect(page.locator('#privacy-section')).not.toContainText('PUBLIC-123');
  expect(await readFile(fixtures.files.privateImage!)).toEqual(before);
});

test('PDF 专项参数、逐页尺寸和隐私发现离线可用，混合对比保持不适用状态', async () => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.context().setOffline(true);
  await pick([fixtures.files.pdf!, fixtures.files.png!]); await completed(2);
  await expect(page.locator('.detail-meta')).toContainText('PDF 文档');
  await expect(page.locator('#file-parameters-table')).toContainText('PDF 页数');
  await page.locator('#privacy-records-summary').click();
  await expect(page.locator('#privacy-metadata-table')).toContainText('Public <img src=x onerror=alert(1)> Author');
  await expect(page.locator('#privacy-section img')).toHaveCount(0);
  await page.locator('#pdf-page-records-summary').focus(); await page.keyboard.press('Enter');
  await expect(page.getByLabel('PDF 逐页尺寸，可滚动查看')).toContainText('1,224 pt');
  await expect(page.getByLabel('PDF 逐页尺寸，可滚动查看')).toContainText('90°');
  await page.setViewportSize({ width: 390, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).setLegacyMode().analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/pdf-narrow.png', fullPage: true });
  await page.getByRole('tab', { name: '参数对比' }).click();
  const count = page.getByRole('row', { name: /PDF 页数/ });
  await expect(count.getByRole('cell', { name: '2 页', exact: true })).toHaveCount(1);
  await expect(count.getByRole('cell', { name: '不适用', exact: true })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('加密 PDF 明确标示检查不完整，其他文件仍能正常检查', async () => {
  await pick([fixtures.files.pdfEncrypted!, fixtures.files.pdfClean!]); await completed(2);
  await expect(page.locator('#detail-content')).toContainText('PDF 已加密，未解密页面结构');
  await expect(page.locator('#privacy-section')).toHaveAttribute('data-state', 'partial');
  await expect(page.locator('#privacy-section')).not.toContainText('在已读取的支持字段中未发现记录');
  await expect(page.locator('#pdf-page-records')).toHaveCount(0);
  await page.getByRole('button', { name: /pdfClean.pdf.*解析完成/ }).click();
  await expect(page.locator('#privacy-section')).toHaveAttribute('data-state', 'checked');
  await expect(page.locator('#pdf-page-records-summary')).toBeVisible();
});

test('超限文档和媒体显示原因及基础信息，队列仍能完成其他文件', async () => {
  const paths: string[] = [];
  for (const [name, header, size] of [['oversized.pdf', '%PDF-1.7\n', DOCUMENT_MAX_BYTES + 1],
    ['oversized.wav', 'unrecognized audio\n', MEDIA_MAX_BYTES + 1]] as const) {
    const path = join(fixtures.dir, name); const file = await open(path, 'w');
    try { await file.write(header); await file.truncate(size); } finally { await file.close(); }
    paths.push(path);
  }
  await pick([...paths, fixtures.files.png!]); await completed(3);
  await expect(page.locator('#file-size-hint')).toContainText('文档最大 512 MiB，音视频最大 2 GiB');
  await expect(page.locator('#detail-content')).toContainText('超过单个文件 512 MiB');
  await expect(page.locator('#base-info-table')).toContainText('oversized.pdf');
  await expect(page.locator('#privacy-section')).toHaveAttribute('data-state', 'unavailable');
  await page.getByRole('button', { name: /oversized.wav.*解析失败/ }).click();
  await expect(page.locator('#detail-content')).toContainText('超过单个文件 2 GiB');
  await page.getByRole('button', { name: /sample.png.*解析完成/ }).click();
  await expect(page.locator('#file-parameters-table')).toContainText('像素宽度');
  await page.setViewportSize({ width: 390, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).setLegacyMode().analyze()).violations).toEqual([]);
});

test('大型 PDF 解析中可移除文件，排队文件继续解析且旧结果不复活', async () => {
  const path = join(fixtures.dir, 'large-document.pdf'); await writeSparsePdf(path, DOCUMENT_MAX_BYTES);
  await pick([path, fixtures.files.png!]);
  await expect(page.locator('.file-row').filter({ hasText: 'large-document.pdf' }).locator('.file-state'))
    .toHaveAttribute('data-state', 'processing');
  await page.getByRole('button', { name: '从列表移除 large-document.pdf', exact: true }).click();
  await completed(1);
  await expect(page.locator('.file-select .file-name')).toHaveText(['sample.png']);
  await expect(page.locator('#detail-content')).not.toContainText('large-document.pdf');
});

test('对比列可原生拖动，整列值对应正确，切换视图和增删文件保留排序', async () => {
  await pick([fixtures.files.wav!, fixtures.files.png!, fixtures.files.docx!]); await completed(3);
  await page.getByRole('tab', { name: '参数对比' }).click();
  const names = page.locator('.comparison-file-name');
  const source = page.getByRole('button', { name: '拖动排序：sample.wav 列', exact: true });
  const target = page.locator('.compare-table thead th').filter({ hasText: 'sample.docx' });
  const bounds = await target.boundingBox(); expect(bounds).not.toBeNull();
  await source.dragTo(target, { targetPosition: { x: bounds!.width - 12, y: 12 } });
  await expect(names).toHaveText(['sample.png', 'sample.docx', 'sample.wav']);
  await expect(page.locator('.compare-table tbody tr').first().locator('td')).toHaveText(['sample.png', 'sample.docx', 'sample.wav']);
  await expect(page.getByRole('row', { name: /识别的文件类型/ }).getByRole('cell')).toHaveText(['png', 'docx', 'wav']);
  await expect(page.locator('#drag-overlay')).toBeHidden();
  await expect(page.locator('.file-select .file-name')).toHaveText(['sample.wav', 'sample.png', 'sample.docx']);
  await page.getByRole('tab', { name: '文件详情' }).click();
  await page.getByRole('tab', { name: '参数对比' }).click();
  await expect(names).toHaveText(['sample.png', 'sample.docx', 'sample.wav']);
  await pick([fixtures.files.mp4!]); await completed(4);
  await expect(names).toHaveText(['sample.png', 'sample.docx', 'sample.wav', 'sample.mp4']);
  await page.getByRole('button', { name: '从列表移除 sample.docx', exact: true }).click();
  await expect(names).toHaveText(['sample.png', 'sample.wav', 'sample.mp4']);
  await page.getByRole('button', { name: '恢复添加顺序', exact: true }).click();
  await expect(names).toHaveText(['sample.wav', 'sample.png', 'sample.mp4']);
  await expect(page.getByRole('button', { name: '拖动排序：sample.wav 列', exact: true })).toBeFocused();
});

test('对比列左右移动和键盘排序在窄窗口离线可用', async () => {
  await page.context().setOffline(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await pick([fixtures.files.wav!, fixtures.files.png!, fixtures.files.docx!]); await completed(3);
  await page.getByRole('tab', { name: '参数对比' }).click();
  const handle = page.getByRole('button', { name: '拖动排序：sample.wav 列', exact: true });
  await expect(page.getByRole('button', { name: '左移 sample.wav 列', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '右移 sample.docx 列', exact: true })).toBeDisabled();
  await handle.focus(); await page.keyboard.press('Alt+ArrowRight');
  await expect(page.locator('.comparison-file-name')).toHaveText(['sample.png', 'sample.wav', 'sample.docx']);
  await expect(handle).toBeFocused();
  await expect(page.locator('#live-status')).toContainText('第 2 个文件列');
  await page.setViewportSize({ width: 390, height: 780 });
  await page.getByRole('button', { name: '右移 sample.wav 列', exact: true }).click();
  await expect(page.locator('.comparison-file-name')).toHaveText(['sample.png', 'sample.docx', 'sample.wav']);
  await expect(handle).toBeFocused();
  const viewport = await page.locator('#comparison-scroll').boundingBox();
  const focused = await handle.boundingBox();
  expect(focused!.x).toBeGreaterThanOrEqual(viewport!.x);
  expect(focused!.x + focused!.width).toBeLessThanOrEqual(viewport!.x + viewport!.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).setLegacyMode().analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/column-order-narrow.png', fullPage: true });
});

test('多文件横向滚动后恢复添加顺序，键盘焦点保持在可视区域', async () => {
  await pick([fixtures.files.wav!, fixtures.files.png!, fixtures.files.docx!, fixtures.files.mp3!,
    fixtures.files.flac!, fixtures.files.jpeg!, fixtures.files.mp4!]); await completed(7);
  await page.getByRole('tab', { name: '参数对比' }).click();
  const original = await page.locator('.comparison-file-name').allTextContents();
  const handle = page.getByRole('button', { name: '拖动排序：sample.wav 列', exact: true });
  const reset = page.getByRole('button', { name: '恢复添加顺序', exact: true });
  for (const width of [1090, 390]) {
    await page.setViewportSize({ width, height: 780 });
    await handle.focus(); await page.keyboard.press('Alt+ArrowRight');
    await page.locator('#comparison-scroll').evaluate(element => { element.scrollLeft = element.scrollWidth; });
    expect(await page.locator('#comparison-scroll').evaluate(element => element.scrollLeft)).toBeGreaterThan(100);
    await reset.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.comparison-file-name')).toHaveText(original);
    await expect(handle).toBeFocused();
    const viewport = await page.locator('#comparison-scroll').boundingBox();
    const focused = await handle.boundingBox();
    expect(focused!.x).toBeGreaterThanOrEqual(viewport!.x);
    expect(focused!.x + focused!.width).toBeLessThanOrEqual(viewport!.x + viewport!.width);
    await page.keyboard.press('Alt+ArrowRight');
    await expect(handle).toBeFocused();
    await reset.focus(); await page.keyboard.press('Enter');
  }
});

test('文件列拖动到边缘自动横向滚动，Escape 取消不会改变顺序或触发文件导入', async () => {
  await pick([fixtures.files.wav!, fixtures.files.png!, fixtures.files.docx!, fixtures.files.mp3!,
    fixtures.files.flac!, fixtures.files.jpeg!, fixtures.files.mp4!, fixtures.files.pdf!]); await completed(8);
  await page.getByRole('tab', { name: '参数对比' }).click();
  const names = page.locator('.comparison-file-name'); const original = await names.allTextContents();
  const source = page.getByRole('button', { name: '拖动排序：sample.wav 列', exact: true });
  await source.scrollIntoViewIfNeeded();
  const handle = await source.boundingBox(); const area = await page.locator('#comparison-scroll').boundingBox();
  expect(handle).not.toBeNull(); expect(area).not.toBeNull();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle!.x + handle!.width / 2 + 20, handle!.y + handle!.height / 2, { steps: 5 });
  await page.mouse.move(area!.x + area!.width - 6, handle!.y + handle!.height / 2, { steps: 10 });
  await expect.poll(() => page.locator('#comparison-scroll').evaluate(element => element.scrollLeft)).toBeGreaterThan(100);
  await expect(page.locator('#drag-overlay')).toBeHidden();
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(names).toHaveText(original);
  await expect(page.locator('.compare-table [data-dragging]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '恢复添加顺序', exact: true })).toBeDisabled();
  await expect(page.locator('#file-count')).toHaveText('8');
});
