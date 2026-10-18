import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve, isAbsolute, sep } from 'node:path';
import type { AnalysisOptions } from './types.js';
import { validateTimeout } from './options.js';

export type ToolName = 'ffprobe' | 'exiftool';

export interface ToolOutput {
  stdout: string;
  stderr: string;
}

export class ToolError extends Error {
  constructor(public readonly code: string, message: string, public readonly tool: ToolName) {
    super(message);
    this.name = 'ToolError';
  }
}

/** Bundled tools take priority; a configured missing path must not silently fall back. */
export async function toolPath(tool: ToolName, options: AnalysisOptions = {}): Promise<string> {
  if (options.bundledToolsDir) {
    const candidate = join(options.bundledToolsDir, tool + (process.platform === 'win32' ? '.exe' : ''));
    try {
      await access(candidate, constants.F_OK);
      return resolve(candidate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new ToolError('TOOL_NOT_EXECUTABLE', `无法访问随包工具：${candidate}`, tool);
      }
    }
  }
  const configured = tool === 'ffprobe'
    ? options.ffprobePath ?? process.env.FILE_ANALYZER_FFPROBE
    : options.exiftoolPath ?? process.env.FILE_ANALYZER_EXIFTOOL;
  if (!configured) return tool;
  return isAbsolute(configured) || configured.includes(sep) || configured.includes('/')
    ? resolve(configured) : configured;
}

export async function runTool(tool: ToolName, args: string[], options: AnalysisOptions = {}): Promise<ToolOutput> {
  const timeout = validateTimeout(options.timeoutMs);
  const executable = await toolPath(tool, options);
  return new Promise((resolveOutput, reject) => {
    execFile(executable, args, {
      encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024, windowsHide: true,
    }, (error, stdout, stderr) => {
      if (!error) return resolveOutput({ stdout, stderr });
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        reject(new ToolError('TOOL_NOT_FOUND', `未找到 ${tool}，请安装工具或设置其路径。`, tool));
      } else if (code === 'EACCES' || code === 'EPERM') {
        reject(new ToolError('TOOL_NOT_EXECUTABLE', `${tool} 无法执行，请检查路径和权限。`, tool));
      } else if (code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
        reject(new ToolError('TOOL_OUTPUT_LIMIT', `${tool} 输出超过允许大小。`, tool));
      } else if (error.killed) {
        reject(new ToolError('TOOL_TIMEOUT', `${tool} 解析超时（${timeout} ms）。`, tool));
      } else {
        reject(new ToolError('TOOL_FAILED', `${tool} 解析失败：${stderr.trim().slice(0, 1200) || error.message}`, tool));
      }
    });
  });
}
