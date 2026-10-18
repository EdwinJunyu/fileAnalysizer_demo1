import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { SpectrogramResult } from '../types.js';
import type { DesktopBridge, DesktopEvent, DesktopFile } from './contracts.js';

const bridge: DesktopBridge = {
  chooseFiles: () => ipcRenderer.invoke('files:choose') as Promise<DesktopFile[]>,
  importFiles: files => {
    if (!Array.isArray(files)) return Promise.reject(new Error('请选择本地文件。'));
    // File paths are obtained from native File objects rather than renderer-supplied strings.
    const paths = files.map(file => webUtils.getPathForFile(file)).filter(Boolean);
    return ipcRenderer.invoke('files:import', paths) as Promise<DesktopFile[]>;
  },
  analyzeFiles: ids => ipcRenderer.invoke('files:analyze', ids) as Promise<void>,
  retryFile: id => ipcRenderer.invoke('files:retry', id) as Promise<void>,
  removeFiles: ids => ipcRenderer.invoke('files:remove', ids) as Promise<void>,
  generateSpectrogram: async (id, streamIndex) => {
    const reply = await ipcRenderer.invoke('spectrum:generate', id, streamIndex) as {
      result?: SpectrogramResult; error?: string;
    };
    if (reply.error) throw new Error(reply.error);
    if (!reply.result) throw new Error('频谱生成失败，请重试。');
    return reply.result;
  },
  cancelSpectrogram: id => ipcRenderer.invoke('spectrum:cancel', id) as Promise<void>,
  onEvent: listener => {
    const receive = (_event: Electron.IpcRendererEvent, value: DesktopEvent): void => listener(value);
    ipcRenderer.on('files:event', receive);
    return () => ipcRenderer.removeListener('files:event', receive);
  },
};

contextBridge.exposeInMainWorld('fileAnalyzer', bridge);
