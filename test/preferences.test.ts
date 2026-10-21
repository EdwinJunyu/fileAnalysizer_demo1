import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LanguagePreferences } from '../src/desktop/preferences.js';

test('语言偏好独立保存且可重新加载，连续保存串行完成', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'language-preferences-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'settings', 'preferences.json');
  const preferences = await LanguagePreferences.load(path);
  assert.equal(preferences.locale, 'zh-CN');
  await Promise.all([preferences.setLocale('en-US'), preferences.setLocale('ja-JP')]);
  assert.equal(preferences.locale, 'ja-JP');
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), { locale: 'ja-JP' });
  assert.equal((await LanguagePreferences.load(path)).locale, 'ja-JP');
  await assert.rejects(preferences.setLocale({ locale: 'fr-FR', path: '/tmp/untrusted' }));
  assert.equal(preferences.locale, 'ja-JP');
});

test('损坏或未知偏好回退中文，保存失败不改变当前语言且可恢复', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'language-preferences-invalid-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'preferences.json');
  for (const text of ['{bad', '{"locale":"invalid"}', 'null', 'x'.repeat(1025)]) {
    await writeFile(path, text); assert.equal((await LanguagePreferences.load(path)).locale, 'zh-CN');
  }
  const preferences = await LanguagePreferences.load(path);
  await preferences.setLocale('en-US');
  await mkdir(`${path}.tmp`);
  await assert.rejects(preferences.setLocale('fr-FR'));
  assert.equal(preferences.locale, 'en-US');
  assert.equal((await LanguagePreferences.load(path)).locale, 'en-US');
  await rm(`${path}.tmp`, { recursive: true });
  await preferences.setLocale('fr-FR');
  assert.equal((await LanguagePreferences.load(path)).locale, 'fr-FR');
});
