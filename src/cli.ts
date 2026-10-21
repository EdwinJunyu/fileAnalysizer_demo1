#!/usr/bin/env node
import { analyzeFiles } from './analyze.js';
import type { AnalysisOptions, AnalysisResult, MetadataField } from './types.js';
import { validateTimeout } from './options.js';
import { FILE_SIZE_HINT } from './limits.js';
import { isLocale, languages, setLocale, t, translateNote, translateText } from './i18n/index.js';
import { categoryLabel, formatField } from './ui/model.js';

function help(): string {
  return [t('File Analyzer — 离线文件参数与隐私元数据检查'), '',
    t('用法：npm run analyze -- [选项] <文件...>'), '',
    `  --json                 ${t('输出 JSON 数组（适合程序读取）')}`,
    `  --lang <locale>        ${t('界面语言')} (zh-CN, en-US, ja-JP, ko-KR, fr-FR, es-ES)`,
    `  --ffprobe <path>       ${t('指定 ffprobe 路径')}`,
    `  --exiftool <path>      ${t('指定 ExifTool 路径')}`,
    `  --tools-dir <path>     ${t('随包工具目录，优先于指定路径和 PATH')}`,
    `  --timeout <ms>         ${t('单次内容识别/工具调用超时，默认 15000 毫秒')}`,
    `  --                     ${t('后续参数均作为文件路径')}`,
    `  --help                 ${t('显示帮助')}`, '',
    t('也可设置 FILE_ANALYZER_FFPROBE 和 FILE_ANALYZER_EXIFTOOL。'), t(FILE_SIZE_HINT),
    t('PDF 结构检查默认超时 60000 毫秒；显式 --timeout 同样约束结构检查。'),
    t('退出码：0 成功（包括仅基础信息），1 有文件失败或部分解析，2 参数错误。'), ''].join('\n');
}

function table(result: AnalysisResult): void {
  const status = t(({ ok: '解析完成', partial: '部分解析', error: '解析失败' })[result.status]);
  console.log(`\n${result.name} [${categoryLabel(result.category)}, ${status}]\n${result.path}`);
  const row = (scope: string, item: MetadataField) => ({ [t('范围')]: scope, [t('参数')]: translateText(item.label),
    [t('值')]: formatField(item), [t('来源')]: item.source, [t('说明')]: translateNote(item.note ?? '') });
  console.table([...result.fields.map(item => row(t('文件'), item)),
    ...result.streams.flatMap(stream => stream.fields.map(item => row(`${t(({ audio: '音频轨道', video: '视频轨道',
      subtitle: '字幕轨道' } as Record<string, string>)[stream.type] ?? '其他轨道')} #${stream.index}`, item)))]);
  if (result.privacy) {
    const report = result.privacy;
    console.log(t('隐私元数据检查：{0}；发现 {1} 项。', t(({ checked: '已检查支持的字段', partial: '检查不完整',
      unavailable: '未能检查', unsupported: '未支持此格式' })[report.status]), report.findings.length));
    if (report.findings.length) console.table(report.findings.map(item => ({ [t('类别')]: translateText(item.label),
      [t('值')]: item.value, [t('来源')]: item.source })));
    for (const note of report.limitations) console.log(translateText(note));
  }
  if (result.pdfPages?.length) console.table(result.pdfPages.map(page => ({ [t('页码')]: page.number,
    [`${t('宽度')} (pt)`]: page.widthPt, [`${t('高度')} (pt)`]: page.heightPt, [`${t('旋转')} (°)`]: page.rotation })));
  for (const issue of result.issues) console.error(`[${issue.code}] ${translateText(issue.message)}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const paths: string[] = [];
  const options: AnalysisOptions = {};
  let json = false;
  let showHelp = false;
  let positional = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (positional) { paths.push(arg); continue; }
    if (arg === '--') { positional = true; continue; }
    if (arg === '--help' || arg === '-h') { showHelp = true; continue; }
    if (arg === '--json') { json = true; continue; }
    if (['--ffprobe', '--exiftool', '--tools-dir', '--timeout', '--lang'].includes(arg)) {
      const value = args[++index];
      if (!value) throw new Error(t('{0} 缺少值。', arg));
      if (arg === '--lang') {
        const locale = languages.find(language => language.locale.toLowerCase() === value.toLowerCase() ||
          language.locale.split('-')[0] === value.toLowerCase())?.locale;
        if (!isLocale(locale)) throw new Error(t('不支持此语言。'));
        setLocale(locale);
      }
      if (arg === '--ffprobe') options.ffprobePath = value;
      if (arg === '--exiftool') options.exiftoolPath = value;
      if (arg === '--tools-dir') options.bundledToolsDir = value;
      if (arg === '--timeout') {
        options.timeoutMs = validateTimeout(Number(value));
      }
      continue;
    }
    if (arg.startsWith('-')) throw new Error(t('未知选项：{0}；以 - 开头的文件名请放在 -- 后。', arg));
    paths.push(arg);
  }
  if (showHelp) { console.log(help()); return; }
  if (!paths.length) throw new Error(t('请提供至少一个文件。') + '\n' + help());
  const results = await analyzeFiles(paths, options);
  if (json) console.log(JSON.stringify(results, null, 2));
  else results.forEach(table);
  if (results.some(result => result.status !== 'ok')) process.exitCode = 1;
}

main().catch((error: Error) => { console.error(translateText(error.message)); process.exitCode = 2; });
