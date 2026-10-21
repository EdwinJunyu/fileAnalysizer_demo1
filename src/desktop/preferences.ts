import { mkdir, open, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { isLocale, type Locale } from '../i18n/index.js';

/** Only the interface locale is persisted; imported files and results remain session-only. */
export class LanguagePreferences {
  private saving: Promise<void> = Promise.resolve();
  private constructor(private readonly path: string, public locale: Locale) {}

  static async load(path: string): Promise<LanguagePreferences> {
    let locale: Locale = 'zh-CN';
    try {
      const file = await open(path, 'r');
      try {
        if ((await file.stat()).size <= 1024) {
          const data: unknown = JSON.parse(await file.readFile('utf8'));
          if (data && typeof data === 'object' && 'locale' in data && isLocale(data.locale)) locale = data.locale;
        }
      } finally { await file.close(); }
    } catch { /* Missing or damaged preferences use the existing Chinese default. */ }
    return new LanguagePreferences(path, locale);
  }

  setLocale(value: unknown): Promise<Locale> {
    if (!isLocale(value)) return Promise.reject(new Error('不支持此语言。'));
    const save = this.saving.catch(() => {}).then(async () => {
      const temporary = `${this.path}.tmp`;
      try {
        await mkdir(dirname(this.path), { recursive: true });
        await writeFile(temporary, JSON.stringify({ locale: value }) + '\n', { mode: 0o600 });
        await rename(temporary, this.path);
        this.locale = value;
      } catch {
        await rm(temporary, { force: true }).catch(() => {});
        throw new Error('无法保存语言设置，请检查配置目录权限后重试。');
      }
    });
    this.saving = save;
    return save.then(() => value);
  }
}
