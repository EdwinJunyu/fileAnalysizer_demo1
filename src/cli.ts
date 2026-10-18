#!/usr/bin/env node
import { analyzeFiles } from './analyze.js';
import type { AnalysisOptions, AnalysisResult, MetadataField } from './types.js';
import { validateTimeout } from './options.js';

const help = `File Analyzer — 阶段一离线文件参数解析

用法：npm run analyze -- [选项] <文件...>

  --json                 输出 JSON 数组（适合程序读取）
  --ffprobe <路径>       指定 ffprobe
  --exiftool <路径>      指定 ExifTool
  --tools-dir <目录>     随包工具目录，优先于指定路径和 PATH
  --timeout <毫秒>       单次内容识别/工具调用超时，默认 15000
  --                     后续参数均作为文件路径
  --help                 显示帮助

也可设置 FILE_ANALYZER_FFPROBE 和 FILE_ANALYZER_EXIFTOOL。
退出码：0 成功（包括仅基础信息），1 有文件失败或部分解析，2 参数错误。
`;

function displayValue(item: MetadataField): string {
  if (item.status === 'present') return `${item.value}${item.unit ? ` ${item.unit}` : ''}`;
  return ({ missing: '未记录', not_applicable: '不适用', unknown: '无法可靠判断', error: '解析失败' })[item.status];
}

function table(result: AnalysisResult): void {
  console.log(`\n${result.name} [${result.category}, ${result.status}]\n${result.path}`);
  const rows = [...result.fields.map(item => ({ 范围: '文件', 参数: item.label, 值: displayValue(item), 来源: item.source,
    说明: item.note ?? '' })), ...result.streams.flatMap(stream => stream.fields.map(item => ({
    范围: `${stream.type} #${stream.index}`, 参数: item.label, 值: displayValue(item), 来源: item.source, 说明: item.note ?? '',
  })))];
  console.table(rows);
  for (const issue of result.issues) console.error(`[${issue.code}] ${issue.message}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const paths: string[] = [];
  const options: AnalysisOptions = {};
  let json = false;
  let positional = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (positional) { paths.push(arg); continue; }
    if (arg === '--') { positional = true; continue; }
    if (arg === '--help' || arg === '-h') { console.log(help); return; }
    if (arg === '--json') { json = true; continue; }
    if (['--ffprobe', '--exiftool', '--tools-dir', '--timeout'].includes(arg)) {
      const value = args[++index];
      if (!value) throw new Error(`${arg} 缺少值。`);
      if (arg === '--ffprobe') options.ffprobePath = value;
      if (arg === '--exiftool') options.exiftoolPath = value;
      if (arg === '--tools-dir') options.bundledToolsDir = value;
      if (arg === '--timeout') {
        options.timeoutMs = validateTimeout(Number(value));
      }
      continue;
    }
    if (arg.startsWith('-')) throw new Error(`未知选项：${arg}；以 - 开头的文件名请放在 -- 后。`);
    paths.push(arg);
  }
  if (!paths.length) throw new Error(`请提供至少一个文件。\n${help}`);
  const results = await analyzeFiles(paths, options);
  if (json) console.log(JSON.stringify(results, null, 2));
  else results.forEach(table);
  if (results.some(result => result.status !== 'ok')) process.exitCode = 1;
}

main().catch((error: Error) => { console.error(error.message); process.exitCode = 2; });
