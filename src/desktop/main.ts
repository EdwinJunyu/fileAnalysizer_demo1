import { app, BrowserWindow, dialog, ipcMain, Menu, session } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DesktopJobs, WorkerAnalyzer } from './job-manager.js';
import { setLocale, t } from '../i18n/index.js';
import { LanguagePreferences } from './preferences.js';

const uiURL = new URL('../../ui/index.html', import.meta.url);
const uiDirectory = fileURLToPath(new URL('.', uiURL));
const partition = 'file-analyzer';
let window: BrowserWindow | null = null;
let jobs: DesktopJobs | undefined;
let analyzer: WorkerAnalyzer | undefined;
const pendingCleanup = new Set<Promise<void>>();
let preferences: LanguagePreferences;
let quitting = false;
let cleanupComplete = false;

function closeAnalysis(currentJobs: DesktopJobs, currentAnalyzer: WorkerAnalyzer): void {
  const cleanup = Promise.all([currentJobs.close(), currentAnalyzer.close()]).then(() => {});
  pendingCleanup.add(cleanup);
  void cleanup.then(() => pendingCleanup.delete(cleanup));
}

function requireWindow(event: IpcMainInvokeEvent): BrowserWindow {
  if (!window || window.isDestroyed() || event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame || event.senderFrame.url !== uiURL.href) {
    throw new Error('不允许的窗口来源。');
  }
  return window;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 10_000 ||
    !value.every(item => typeof item === 'string' && item.length > 0 && item.length <= 32_768 && !item.includes('\0'))) {
    throw new Error('文件列表参数无效。');
  }
  return value as string[];
}

function filePaths(value: unknown): string[] {
  const paths = stringList(value);
  if (!paths.every(path => isAbsolute(path))) throw new Error('只能导入本地文件。');
  return paths;
}

function configureIPC(): void {
  ipcMain.handle('settings:get-locale', event => { requireWindow(event); return preferences.locale; });
  ipcMain.handle('settings:set-locale', async (event, locale: unknown) => {
    requireWindow(event);
    const saved = await preferences.setLocale(locale);
    setLocale(saved); configureMenu(); return saved;
  });
  ipcMain.handle('files:choose', async event => {
    const source = requireWindow(event);
    const currentJobs = jobs!;
    const selection = await dialog.showOpenDialog(source, {
      title: t('添加本地文件'), properties: ['openFile', 'multiSelections'],
    });
    return selection.canceled ? [] : currentJobs.register(filePaths(selection.filePaths));
  });
  ipcMain.handle('files:import', (event, paths: unknown) => {
    requireWindow(event);
    return jobs!.register(filePaths(paths));
  });
  ipcMain.handle('files:analyze', (event, ids: unknown) => {
    requireWindow(event);
    jobs!.analyzeFiles(stringList(ids));
  });
  ipcMain.handle('files:retry', (event, id: unknown) => {
    requireWindow(event);
    const [fileID] = stringList([id]);
    return jobs!.retryFile(fileID!);
  });
  ipcMain.handle('files:remove', (event, ids: unknown) => {
    requireWindow(event);
    return jobs!.removeFiles(stringList(ids));
  });
  ipcMain.handle('spectrum:generate', async (event, id: unknown, streamIndex: unknown) => {
    requireWindow(event);
    const [fileID] = stringList([id]);
    if (typeof streamIndex !== 'number' || !Number.isSafeInteger(streamIndex) || streamIndex < 0) {
      throw new Error('音轨参数无效。');
    }
    try {
      return { result: await jobs!.generateSpectrogram(fileID!, streamIndex) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : '频谱生成失败，请重试。' };
    }
  });
  ipcMain.handle('spectrum:cancel', (event, id: unknown) => {
    requireWindow(event);
    const [fileID] = stringList([id]);
    return jobs!.cancelSpectrogram(fileID!);
  });
}

function createWindow(): void {
  const toolsDirectory = join(process.resourcesPath, 'tools');
  const toolOptions = existsSync(toolsDirectory) ? { bundledToolsDir: toolsDirectory } : {};
  analyzer = new WorkerAnalyzer(toolOptions);
  const backgroundColor = readFileSync(new URL('tokens.css', uiURL), 'utf8')
    .match(/--color-background:\s*([^;]+);/)?.[1]?.trim();
  if (!backgroundColor) throw new Error('界面颜色配置缺失，请先运行 npm run build。');
  const activeWindow = new BrowserWindow({
    width: 1100, height: 760, minWidth: 620, minHeight: 500,
    title: 'File Analyzer', backgroundColor, show: false,
    webPreferences: {
      preload: fileURLToPath(new URL('./preload.cjs', import.meta.url)),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      partition, webSecurity: true, allowRunningInsecureContent: false,
    },
  });
  window = activeWindow;
  jobs = new DesktopJobs(analyzer.analyze, event => {
    if (!activeWindow.isDestroyed()) activeWindow.webContents.send('files:event', event);
  }, () => new WorkerAnalyzer(toolOptions));
  const currentJobs = jobs;
  const currentAnalyzer = analyzer;
  activeWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  activeWindow.webContents.on('will-navigate', event => event.preventDefault());
  activeWindow.webContents.on('will-frame-navigate', event => event.preventDefault());
  activeWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  activeWindow.once('ready-to-show', () => activeWindow.show());
  activeWindow.on('closed', () => {
    closeAnalysis(currentJobs, currentAnalyzer);
    if (window === activeWindow) {
      window = null;
      jobs = undefined;
      analyzer = undefined;
    }
  });
  void activeWindow.loadFile(fileURLToPath(uiURL));
}

function configureMenu(): void {
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'File Analyzer', submenu: [
        { role: 'hide', label: t('隐藏 File Analyzer') },
        { role: 'hideOthers', label: t('隐藏其他应用') },
        { role: 'unhide', label: t('显示全部') },
        { type: 'separator' }, { role: 'quit', label: t('退出 File Analyzer') },
      ] },
      { label: t('编辑'), submenu: [
        { role: 'copy', label: t('复制') }, { role: 'selectAll', label: t('全选') },
      ] },
      { label: t('窗口'), submenu: [
        { role: 'minimize', label: t('最小化') }, { role: 'close', label: t('关闭窗口') },
      ] },
    ]));
  } else {
    Menu.setApplicationMenu(null);
  }
}

// Electron waits for ESM main loading to finish before ready; top-level awaiting ready deadlocks.
void app.whenReady().then(async () => {
  preferences = await LanguagePreferences.load(join(app.getPath('userData'), 'preferences.json'));
  setLocale(preferences.locale); configureMenu();
  const localSession = session.fromPartition(partition);
  localSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  localSession.setPermissionCheckHandler(() => false);
  // All renderer resources are shipped locally. Neither imports nor metadata may open a network URL.
  localSession.webRequest.onBeforeRequest((details, callback) => {
    try {
      const url = new URL(details.url);
      const path = url.protocol === 'file:' ? relative(uiDirectory, fileURLToPath(url)) : '..';
      callback({ cancel: path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path) });
    } catch {
      callback({ cancel: true });
    }
  });
  configureIPC();
  createWindow();
  app.on('activate', () => { if (!quitting && BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch((error: unknown) => {
  console.error('File Analyzer 启动失败：', error);
  app.exit(1);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', event => {
  if (cleanupComplete) return;
  if (jobs && analyzer) closeAnalysis(jobs, analyzer);
  if (!pendingCleanup.size) return;
  event.preventDefault();
  if (quitting) return;
  quitting = true;
  // A window may already be destroyed, so wait for tracked cleanups as well as the current one.
  void Promise.all([...pendingCleanup]).then(() => {
    cleanupComplete = true;
    app.quit();
  });
});
