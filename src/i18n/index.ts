import { catalog } from './catalog.js';

export const languages = [
  { locale: 'zh-CN', name: '简体中文' }, { locale: 'en-US', name: 'English' },
  { locale: 'ja-JP', name: '日本語' }, { locale: 'ko-KR', name: '한국어' },
  { locale: 'fr-FR', name: 'Français' }, { locale: 'es-ES', name: 'Español' },
] as const;
export type Locale = typeof languages[number]['locale'];
let currentLocale: Locale = 'zh-CN';
export const isLocale = (value: unknown): value is Locale => languages.some(language => language.locale === value);
export const getLocale = (): Locale => currentLocale;
export function setLocale(locale: Locale): void {
  if (!isLocale(locale)) throw new Error('Unsupported locale');
  currentLocale = locale;
}

const numberFormats = new Map<string, Intl.NumberFormat>();
export function numberFormat(options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = `${currentLocale}:${JSON.stringify(options)}`;
  let formatter = numberFormats.get(key);
  if (!formatter) { formatter = new Intl.NumberFormat(currentLocale, options); numberFormats.set(key, formatter); }
  return formatter;
}

/** Translate owned copy only. Filenames and metadata values never pass through this function. */
export function t(source: string, ...values: unknown[]): string {
  const index = languages.findIndex(language => language.locale === currentLocale) - 1;
  let translated = index < 0 ? source : catalog[source]?.[index] ?? source;
  const choices = translated.split('¦');
  if (choices.length === 2) {
    const count = values.find(value => typeof value === 'number');
    translated = choices[typeof count === 'number' && new Intl.PluralRules(currentLocale).select(count) === 'one' ? 0 : 1]!;
  }
  return translated.replace(/\{(\d+)\}/g, (placeholder, position: string) => {
    const value = values[Number(position)];
    return value === undefined ? placeholder : typeof value === 'number'
      ? numberFormat({ maximumSignificantDigits: 15 }).format(value) : String(value);
  });
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates = Object.keys(catalog).filter(key => /\{\d+\}/.test(key)).sort((a, b) => b.length - a.length).map(source => {
  const positions: number[] = [];
  let end = 0; let pattern = '^';
  for (const match of source.matchAll(/\{(\d+)\}/g)) {
    pattern += escapeRegex(source.slice(end, match.index)) + '([\\s\\S]*?)';
    positions.push(Number(match[1])); end = match.index + match[0].length;
  }
  return { source, positions, regex: new RegExp(pattern + escapeRegex(source.slice(end)) + '$') };
});
const nestedDiagnostics: Record<string, number[]> = {
  '内容识别未完成：{0}': [0], '无法读取 Office XML：{0}': [0], '取消未完成：{0}。请再次取消。': [0],
};

/** Normalize built-in field notes and diagnostics without rewriting original metadata. */
export function translateText(source: string): string {
  if (currentLocale === 'zh-CN') return source;
  if (Object.hasOwn(catalog, source)) return t(source);
  if (!/\p{Script=Han}/u.test(source)) return source;
  const xmlDiagnostic = /^(docProps\/(?:core|app)\.xml|xl\/workbook\.xml|ppt\/presentation\.xml)：([\s\S]*)$/.exec(source);
  if (xmlDiagnostic) return `${xmlDiagnostic[1]}: ${translateText(xmlDiagnostic[2]!)}`;
  for (const template of templates) {
    const match = template.regex.exec(source);
    if (!match) continue;
    const values: string[] = [];
    template.positions.forEach((position, index) => { values[position] = match[index + 1]!; });
    for (const position of nestedDiagnostics[template.source] ?? []) values[position] = translateText(values[position]!);
    if (template.source.startsWith('{0}文件超过单个文件') && ['文档', '音视频'].includes(values[0]!)) values[0] = t(values[0]!);
    return t(template.source, ...values);
  }
  return source;
}

/** Notes are authored by our parsers and may combine several known explanations. */
export function translateNote(source: string): string {
  if (currentLocale === 'zh-CN') return source;
  const translated = translateText(source);
  if (translated !== source) return translated;
  return source.split('; ').map(part => {
    const tagNote = /^([A-Za-z0-9_:.-]+): (.*)$/.exec(part);
    return tagNote ? `${tagNote[1]}: ${translateText(tagNote[2]!)}` : translateText(part);
  }).join('; ');
}
