import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog } from '../src/i18n/catalog.js';
import { getLocale, isLocale, languages, setLocale, t, translateNote, translateText } from '../src/i18n/index.js';
import { buildComparison, formatBytes, formatField, type FileEntry } from '../src/ui/model.js';
import { printDimensions, parameterExplanation } from '../src/ui/guidance.js';

afterEach(() => setLocale('zh-CN'));
const placeholders = (value: string) => [...new Set([...value.matchAll(/\{(\d+)\}/g)].map(match => match[1]))].sort();

test('全部词条都有五种完整翻译，单复数分支与占位符保持一致', () => {
  assert.equal(languages.length, 6);
  assert.ok(Object.keys(catalog).length >= 490);
  for (const [source, translations] of Object.entries(catalog)) {
    assert.equal(translations.length, 5, source);
    for (const value of translations) {
      assert.ok(value.trim(), source);
      for (const branch of value.split('¦')) assert.deepEqual(placeholders(branch), placeholders(source), source);
    }
  }
});

test('界面和系统菜单声明的静态词条都在完整词典中', async () => {
  for (const path of ['src/ui/app.ts', 'src/ui/model.ts', 'src/desktop/main.ts', 'src/cli.ts']) {
    const source = await readFile(path, 'utf8');
    for (const match of source.matchAll(/\bt\(("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g)) {
      const literal = match[1]!;
      const key: string = literal[0] === '"' ? JSON.parse(literal) : literal.slice(1, -1).replace(/\\'/g, "'");
      assert.ok(Object.hasOwn(catalog, key), `${path}: ${key}`);
    }
  }
  const html = await readFile('src/ui/index.html', 'utf8');
  for (const match of html.matchAll(/data-i18n(?:-label)?="([^"]+)"/g)) assert.ok(Object.hasOwn(catalog, match[1]!));
});

test('按当前语言处理数字与单复数，日期和比较标签在切换后重新格式化', () => {
  setLocale('en-US');
  assert.equal(t('添加文件'), 'Add files');
  assert.equal(t('{0} 项参数', 1), '1 parameter');
  assert.equal(t('{0} 项参数', 2), '2 parameters');
  assert.equal(formatField({ key: 'office.pageCount', label: '页数', source: 'fixture', status: 'present', value: 1, unit: 'pages' }), '1 page');
  const date = { key: 'file.createdAt', label: '文件系统创建时间', source: 'filesystem', status: 'present' as const, value: '2026-10-20T10:00:00Z' };
  const englishDate = formatField(date);
  setLocale('fr-FR');
  assert.ok(formatBytes(1_500_000).startsWith('1,5 MB'));
  assert.notEqual(formatField(date), englishDate);
  assert.equal(formatField({ key: 'media.duration', label: '时长', source: 'fixture', status: 'present', value: 5025.125, unit: 's' }), '01:23:45,125');
  const files: FileEntry[] = [{ id: 'one', path: '/作者.png', name: '作者.png', state: 'waiting' }];
  assert.equal(buildComparison(files).rows[0]!.label, 'Nom du fichier');
  assert.equal(buildComparison(files).rows[0]!.values[0], 'En attente');
});

test('字段原始值不翻译，模板参数按纯文本保留，内置动态诊断可以翻译', () => {
  setLocale('en-US');
  const original = { key: 'pdf.author', label: '作者', source: 'ExifTool', status: 'present' as const, value: '文件名 <img src=x>' };
  assert.equal(formatField(original), '文件名 <img src=x>');
  assert.equal(t('从列表移除 {0}', '作者 {1} $&'), 'Remove 作者 {1} $& from the list');
  assert.equal(translateText('第 2 页的尺寸或旋转无法可靠读取，已跳过此页并保留其他可用结果。'),
    'Could not read dimensions or rotation on page 2. That page was skipped; other usable results are retained.');
  assert.equal(translateText('内容识别未完成：内容识别超时（10 ms）'), 'Content detection was incomplete: Content detection timed out (10 ms)');
  assert.ok(translateText('文档文件超过单个文件 1 GB 的大小上限，未执行专属解析。请缩小文件后重新解析；基础文件信息仍可查看。').startsWith('Document file'));
  assert.equal(translateNote('由每米像素数 × 0.0254 换算; 文件记录的名义打印分辨率，不代表画质'),
    'Converted from pixels per meter × 0.0254; Nominal print resolution recorded in the file; not an image quality measure');
  assert.equal(translateText('docProps/core.xml：XML 命名空间无效'), 'docProps/core.xml: Invalid XML namespace');
});

test('法语和西班牙语支持小数逗号，日语全角输入有效，原输入语言可随条件保留', () => {
  for (const locale of ['fr-FR', 'es-ES'] as const) {
    setLocale(locale);
    const result = printDimensions(3000, 2000, '150,5');
    assert.ok('dpi' in result && result.dpi === 150.5);
  }
  setLocale('ja-JP');
  const wide = printDimensions(3000, 2000, '１５０．５');
  assert.ok('dpi' in wide && wide.dpi === 150.5);
  setLocale('en-US');
  const retained = printDimensions(3000, 2000, '150,5', 'fr-FR');
  assert.ok('dpi' in retained && retained.dpi === 150.5);
  assert.ok('error' in printDimensions(3000, 2000, '1,000'));
  assert.ok(parameterExplanation('audio.sampleRate')!.includes('Samples per second'));
});

test('仅允许已知语言，非法值不会改变当前语言', () => {
  assert.equal(isLocale({ locale: 'en-US' }), false);
  assert.equal(isLocale('__proto__'), false);
  assert.equal(isLocale('ja-JP'), true);
  assert.throws(() => Reflect.apply(setLocale, null, ['../preferences']));
  assert.equal(getLocale(), 'zh-CN');
});

test('CLI 语言标志支持五种新增语言，表格本地化且 JSON 保持协议及原始值', async context => {
  const exec = promisify(execFile);
  const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
  for (const [locale, usage] of [['en', 'Usage:'], ['ja', '使い方：'], ['ko', '사용법:'], ['fr', 'Utilisation :'], ['es', 'Uso:']] as const) {
    const result = await exec(process.execPath, [cli, '--help', '--lang', locale]);
    assert.ok(result.stdout.includes(usage), locale);
  }
  const dir = await mkdtemp(join(tmpdir(), 'cli-language-')); context.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, '作者.txt'); await writeFile(path, 'public fixture');
  const table = await exec(process.execPath, [cli, '--lang', 'en-US', path]);
  assert.ok(table.stdout.includes('Filename'));
  assert.ok(table.stdout.includes('作者.txt'));
  const json = await exec(process.execPath, [cli, '--lang', 'fr-FR', '--json', path]);
  const result = JSON.parse(json.stdout)[0];
  assert.equal(result.name, '作者.txt');
  assert.equal(result.fields.find((item: { key: string }) => item.key === 'file.name').value, '作者.txt');
  await assert.rejects(exec(process.execPath, [cli, '--lang', 'en', '--invalid']), error =>
    (error as { code?: number; stderr?: string }).code === 2 && Boolean((error as { stderr?: string }).stderr?.includes('Unknown option')));
});
