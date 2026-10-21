import { test, expect, _electron, type ElectronApplication, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createRequire } from 'node:module';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFixtures } from '../fixtures.js';
import { pdfFixture } from '../pdf-fixtures.js';
import { runTool } from '../../src/tools.js';
import type { Locale } from '../../src/i18n/index.js';

const executablePath = createRequire(import.meta.url)('electron') as string;
let fixtures: Awaited<ReturnType<typeof createFixtures>>;
let application: ElectronApplication;
let page: Page;
let profile: string;
let userData: string;

async function launch(): Promise<void> {
  application = await _electron.launch({ executablePath,
    args: [...(process.platform === 'linux' ? ['--no-sandbox'] : []), `--user-data-dir=${profile}`, process.cwd()],
    env: { ...process.env, XDG_CONFIG_HOME: profile, XDG_CACHE_HOME: profile },
  });
  page = await application.firstWindow();
  await expect(page.locator('#language-select')).toBeEnabled();
  userData = await application.evaluate(({ app }) => app.getPath('userData'));
}
async function choose(paths: string[]): Promise<void> {
  await application.evaluate(({ dialog }, files) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: files });
  }, paths);
  await page.locator('#add-files').click();
}
async function language(locale: Locale): Promise<void> {
  await page.locator('#language-select').selectOption(locale);
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('#language-select')).toBeEnabled();
}

test.beforeAll(async () => {
  fixtures = await createFixtures();
  fixtures.files.localizedImage = join(fixtures.dir, '标题.png');
  await copyFile(fixtures.files.png!, fixtures.files.localizedImage);
  await runTool('exiftool', ['-overwrite_original', '-Artist=作者', fixtures.files.localizedImage]);
  fixtures.files.localizedPdf = join(fixtures.dir, 'language.pdf');
  await writeFile(fixtures.files.localizedPdf, await pdfFixture('作者 <img src=x onerror=alert(1)>'));
});
test.afterAll(async () => { await fixtures.cleanup(); });
test.beforeEach(async () => { profile = await mkdtemp(join(tmpdir(), 'file-analyzer-locale-')); await launch(); });
test.afterEach(async () => { await application?.close(); await rm(profile, { recursive: true, force: true }); });

const cases = [
  { locale: 'en-US', add: 'Add files', width: 'Pixel width', pdf: 'PDF page count', missing: 'File not found.' },
  { locale: 'ja-JP', add: 'ファイルを追加', width: 'ピクセル幅', pdf: 'PDF のページ数', missing: 'ファイルが見つかりません。' },
  { locale: 'ko-KR', add: '파일 추가', width: '픽셀 너비', pdf: 'PDF 페이지 수', missing: '파일을 찾을 수 없습니다.' },
  { locale: 'fr-FR', add: 'Ajouter des fichiers', width: 'Largeur en pixels', pdf: 'Nombre de pages PDF', missing: 'Fichier introuvable.' },
  { locale: 'es-ES', add: 'Añadir archivos', width: 'Ancho en píxeles', pdf: 'Número de páginas PDF', missing: 'Archivo no encontrado.' },
] as const;

for (const copy of cases) test(`${copy.locale}：主要流程、原始元数据、计算与列顺序保留、窄屏和可访问性`, async () => {
  await page.context().setOffline(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await choose([fixtures.files.localizedImage!, fixtures.files.wav!, fixtures.files.localizedPdf!]);
  await expect(page.locator('#list-summary')).toHaveText('3 个文件 · 3 个已处理');
  await language(copy.locale);
  await expect(page.getByRole('button', { name: copy.add, exact: true })).toBeVisible();
  await expect(page.locator('#file-parameters-table')).toContainText(copy.width);
  await expect(page.locator('.detail-heading h3')).toHaveText('标题.png');
  await page.locator('[id="base-info-table-help-file.type-summary"]').click();
  await expect(page.locator('[id="base-info-table-help-file.type"]')).toHaveAttribute('open', '');
  const dpi = copy.locale === 'fr-FR' || copy.locale === 'es-ES' ? '150,5' : copy.locale === 'ja-JP' ? '１５０．５' : '150.5';
  if (copy.locale === 'ja-JP') await page.locator('#print-dpi').dispatchEvent('compositionstart');
  await page.locator('#print-dpi').fill(dpi); await page.locator('#print-dpi').press('Enter');
  if (copy.locale === 'ja-JP') {
    await expect(page.locator('#print-result')).not.toContainText('150.5');
    await page.locator('#print-dpi').dispatchEvent('compositionend'); await page.locator('#print-dpi').press('Enter');
  }
  const density = new Intl.NumberFormat(copy.locale).format(150.5);
  await expect(page.locator('#print-result')).toContainText(density);
  await expect(page.locator('#print-error')).toBeEmpty();
  await page.locator('#compare-tab').click();
  await page.locator('.column-handle').first().focus(); await page.keyboard.press('Alt+ArrowRight');
  const order = ['sample.wav', '标题.png', 'language.pdf'];
  await expect(page.locator('.comparison-file-name')).toHaveText(order);
  await page.screenshot({ path: `test-results/i18n-${copy.locale}-comparison.png`, fullPage: true });
  await language('zh-CN'); await expect(page.locator('.comparison-file-name')).toHaveText(order);
  await language(copy.locale); await page.locator('#detail-tab').click();
  await expect(page.locator('#print-dpi')).toHaveValue(dpi);
  await expect(page.locator('#print-result')).toContainText(density);
  await expect(page.locator('[id="base-info-table-help-file.type"]')).toHaveAttribute('open', '');
  await page.locator('.file-select').filter({ hasText: 'language.pdf' }).click();
  await expect(page.locator('#file-parameters-table')).toContainText(copy.pdf);
  await page.locator('#privacy-records-summary').click();
  await expect(page.locator('#privacy-metadata-table')).toContainText('作者 <img src=x onerror=alert(1)>');
  await expect(page.locator('#privacy-section img')).toHaveCount(0);
  await page.locator('#pdf-page-records-summary').click();
  await expect(page.locator('.pdf-page-section')).toContainText(new Intl.NumberFormat(copy.locale).format(1224));
  await page.setViewportSize({ width: 390, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).setLegacyMode().analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/i18n-${copy.locale}-narrow.png`, fullPage: true });
  if (copy.locale === 'ja-JP') {
    const devtools = await page.context().newCDPSession(page);
    await devtools.send('Emulation.clearDeviceMetricsOverride');
    await application.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0]!;
      window.setBounds({ x: 0, y: 0, width: 1280, height: 900 }); window.webContents.setZoomFactor(2);
    });
    await expect.poll(() => application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.getContentBounds().width))
      .toBeGreaterThan(1200);
    const bounds = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.getContentBounds());
    await devtools.send('Emulation.setDeviceMetricsOverride', {
      width: bounds.width, height: bounds.height, deviceScaleFactor: 1, mobile: false,
    });
    await expect.poll(() => page.evaluate(() => window.innerWidth)).toBeGreaterThan(600);
    expect(await page.evaluate(() => window.innerWidth)).toBeLessThan(700);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator('#privacy-section').scrollIntoViewIfNeeded();
    const capture = await application.evaluate(async ({ BrowserWindow }) =>
      (await BrowserWindow.getAllWindows()[0]!.webContents.capturePage()).toPNG().toString('base64'));
    await writeFile('test-results/i18n-ja-zoom.png', Buffer.from(capture, 'base64'));
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.webContents.setZoomFactor(1));
    await devtools.detach();
  }
  await choose([join(fixtures.dir, 'missing.pdf')]);
  await expect(page.locator('.file-state[data-state="failed"]')).toHaveCount(1);
  await page.locator('.file-select').filter({ hasText: 'missing.pdf' }).click();
  await expect(page.locator('#detail-content')).toContainText(copy.missing);
  await expect(page.locator('#detail-content')).not.toContainText('文件不存在。');
});

test('语言偏好在重新启动后保留，不保存导入列表；文件选择器标题随语言变化', async () => {
  await choose([fixtures.files.png!]); await expect(page.locator('.file-state[data-state="done"]')).toHaveCount(1);
  await language('ja-JP');
  expect(userData).toBe(profile);
  expect(JSON.parse(await readFile(join(userData, 'preferences.json'), 'utf8'))).toEqual({ locale: 'ja-JP' });
  await application.close(); await launch();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja-JP');
  await expect(page.locator('#file-count')).toHaveText('0');
  await expect(page.locator('#language-select')).toHaveValue('ja-JP');
  await application.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async (...args: unknown[]) => {
      const options = (args.length > 1 ? args[1] : args[0]) as { title?: string } | undefined;
      (globalThis as typeof globalThis & { pickerTitle?: string }).pickerTitle = options?.title;
      return { canceled: true, filePaths: [] };
    };
  });
  await page.locator('#add-files').click();
  expect(await application.evaluate(() => (globalThis as typeof globalThis & { pickerTitle?: string }).pickerTitle)).toBe('端末内のファイルを追加');
});

test('偏好保存失败恢复当前语言和焦点，修复后可重试；IPC 拒绝非法语言', async () => {
  await language('en-US');
  await mkdir(join(userData, 'preferences.json.tmp'));
  await page.locator('#language-select').selectOption('fr-FR');
  await expect(page.locator('#app-error')).toContainText('Could not save the language setting');
  await expect(page.locator('#language-select')).toBeEnabled();
  await expect(page.locator('#language-select')).toHaveValue('en-US');
  await expect(page.locator('#language-select')).toBeFocused();
  await rm(join(userData, 'preferences.json.tmp'), { recursive: true });
  await language('fr-FR'); await expect(page.locator('#app-error')).toBeHidden();
  const invalid = await page.evaluate(async () => {
    try { await Reflect.apply(window.fileAnalyzer!.setLocale, null, ['../../bad']); return false; }
    catch { return true; }
  });
  expect(invalid).toBe(true);
  expect(JSON.parse(await readFile(join(userData, 'preferences.json'), 'utf8'))).toEqual({ locale: 'fr-FR' });
  await page.locator('#language-select').focus(); await page.keyboard.press('Home');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('#language-select')).toBeEnabled();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
});

test('解析队列运行中切换语言保持任务、键盘焦点和 IME 快捷键行为', async () => {
  const paths: string[] = [];
  for (let index = 0; index < 10; index++) {
    const path = join(fixtures.dir, `queued-${index}.wav`); await copyFile(fixtures.files.wav!, path); paths.push(path);
  }
  await choose(paths); await expect(page.locator('.file-state[data-state="waiting"]').first()).toBeVisible();
  await language('en-US');
  await expect(page.locator('#list-summary')).toHaveText('10 files · 10 processed');
  await expect(page.locator('#language-select')).toBeFocused();
  await application.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async () => { throw new Error('IME shortcut must not open the picker'); };
  });
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', ctrlKey: true, isComposing: true, bubbles: true })));
  await expect(page.locator('#app-error')).toBeHidden();
});
