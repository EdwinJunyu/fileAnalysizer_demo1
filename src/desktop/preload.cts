import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { SpectrogramResult } from '../types.js';
import type { DesktopBridge, DesktopEvent, DesktopFile } from './contracts.js';
import type { Locale } from '../i18n/index.js';

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  try { return await ipcRenderer.invoke(channel, ...args) as T; }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, ''));
  }
}

const bridge: DesktopBridge = {
  getLocale: () => invoke('settings:get-locale') as Promise<Locale>,
  setLocale: locale => invoke('settings:set-locale', locale) as Promise<Locale>,
  chooseFiles: () => invoke('files:choose') as Promise<DesktopFile[]>,
  importFiles: files => {
    if (!Array.isArray(files)) return Promise.reject(new Error('请选择本地文件。'));
    // File paths are obtained from native File objects rather than renderer-supplied strings.
    const paths = files.map(file => webUtils.getPathForFile(file)).filter(Boolean);
    return invoke('files:import', paths) as Promise<DesktopFile[]>;
  },
  analyzeFiles: ids => invoke('files:analyze', ids) as Promise<void>,
  retryFile: id => invoke('files:retry', id) as Promise<void>,
  removeFiles: ids => invoke('files:remove', ids) as Promise<void>,
  generateSpectrogram: async (id, streamIndex) => {
    const reply = await invoke('spectrum:generate', id, streamIndex) as {
      result?: SpectrogramResult; error?: string;
    };
    if (reply.error) throw new Error(reply.error);
    if (!reply.result) throw new Error('频谱生成失败，请重试。');
    return reply.result;
  },
  cancelSpectrogram: id => invoke('spectrum:cancel', id) as Promise<void>,
  onEvent: listener => {
    const receive = (_event: Electron.IpcRendererEvent, value: DesktopEvent): void => listener(value);
    ipcRenderer.on('files:event', receive);
    return () => ipcRenderer.removeListener('files:event', receive);
  },
};

contextBridge.exposeInMainWorld('fileAnalyzer', bridge);
