import type { DesktopBridge, DesktopFile, DesktopEvent } from '../desktop/contracts.js';
import type { AnalysisResult, MediaStream, MetadataField, SpectrogramResult } from '../types.js';
import { buildComparison, categoryLabel, comparisonEntries, reorderComparisonColumns, formatBytes, formatBitRate, formatDuration, formatField, stateLabel, type FileEntry } from './model.js';
import { parameterExplanation, pcmEstimate, positiveField, printDimensions } from './guidance.js';
import { FILE_SIZE_HINT } from '../limits.js';
import { SPECTRUM_GRADIENT, SPECTRUM_STYLE } from '../spectrum-style.js';
import { plotTicks, plotTime } from './plot.js';
import { getLocale, isLocale, languages, numberFormat, setLocale, t, translateNote, translateText, type Locale } from '../i18n/index.js';

declare global { interface Window { fileAnalyzer?: DesktopBridge } }

const bridge = window.fileAnalyzer;
const entries: FileEntry[] = [];
let activeId: string | undefined;
let view: 'detail' | 'compare' = 'detail';
let comparisonOrder: string[] = [];
let columnDrag: { id: string; clientX: number; clientY: number; frame: number } | undefined;
let picking = false;
const removing = new Set<string>();
interface SpectrogramState {
  streamIndex: number;
  status: 'idle' | 'loading' | 'ready' | 'error' | 'canceled';
  result?: SpectrogramResult;
  message?: string;
  canceling?: boolean;
}
interface SpectrogramJob {
  id: string;
  state: SpectrogramState;
  cancelRequested: boolean;
}
const spectrograms = new Map<string, SpectrogramState>();
const printSettings = new Map<string, { dpi: string; calculated: boolean; inputLocale: Locale }>();
let spectrogramJob: SpectrogramJob | undefined;
let renderedDetail: {
  locale: Locale;
  id?: string; state?: FileEntry['state']; result?: AnalysisResult; message?: string; picking: boolean;
  spectrogram?: SpectrogramState; spectrogramBusyId?: string;
} | undefined;
const plotNumbers = { format: (value: number) => numberFormat({ maximumFractionDigits: 2 }).format(value) };
let operationError: string | undefined;
let errorScope: 'operation' | 'language' = 'operation';
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: ${id}`);
  return element as T;
};
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

function action(text: string, handler: () => void, className = 'button'): HTMLButtonElement {
  const element = node('button', className, text);
  element.type = 'button';
  element.addEventListener('click', handler);
  return element;
}

function announce(message: string): void { $('live-status').textContent = message; }
function report(error: unknown, scope: 'operation' | 'language' = 'operation'): void {
  const message = error instanceof Error ? error.message : String(error);
  operationError = message; errorScope = scope;
  $('app-error').textContent = t("操作未完成：{0}。请重试；已有结果仍保留。", translateText(message));
  $('app-error').hidden = false;
  announce(t("操作未完成，请查看提示后重试。"));
}

async function addFiles(descriptors: DesktopFile[]): Promise<void> {
  const added = descriptors.filter(file => !entries.some(entry => entry.id === file.id));
  for (const file of added) entries.push({ ...file, state: 'waiting' });
  if (!activeId && entries.length) activeId = entries[0]!.id;
  render();
  if (!added.length) {
    if (descriptors.length) announce(t("所选文件已在列表中。"));
    return;
  }
  $('app-error').hidden = true;
  announce(t("已添加 {0} 个文件，开始解析。", added.length));
  try { await bridge!.analyzeFiles(added.map(file => file.id)); }
  catch (error) {
    for (const file of added) {
      const entry = entries.find(item => item.id === file.id);
      if (entry && entry.state === 'waiting') { entry.state = 'failed'; entry.message = '无法开始解析，请重试。'; }
    }
    render();
    report(error);
  }
}

async function chooseFiles(): Promise<void> {
  if (!bridge || picking) return;
  const openerId = document.activeElement?.id;
  picking = true;
  render();
  try { await addFiles(await bridge.chooseFiles()); }
  catch (error) { report(error); }
  finally {
    picking = false;
    render();
    // Rendering may replace the empty-state button or disable the original opener.
    const opener = openerId ? document.getElementById(openerId) : null;
    (opener && !opener.matches(':disabled') ? opener : $('add-files')).focus({ preventScroll: true });
  }
}

async function removeFiles(ids: string[]): Promise<void> {
  if (!bridge || ids.some(id => removing.has(id))) return;
  ids.forEach(id => removing.add(id));
  render();
  try {
    await bridge.removeFiles(ids);
    const removed = new Set(ids);
    comparisonOrder = comparisonOrder.filter(id => !removed.has(id));
    const previousIndex = entries.findIndex(entry => entry.id === activeId);
    for (let index = entries.length - 1; index >= 0; index--) if (removed.has(entries[index]!.id)) entries.splice(index, 1);
    ids.forEach(id => { spectrograms.delete(id); printSettings.delete(id); });
    if (!entries.some(entry => entry.id === activeId)) activeId = entries[Math.max(0, Math.min(previousIndex, entries.length - 1))]?.id;
    if (entries.length < 2) view = 'detail';
    render();
    announce(t("已从列表移除 {0} 个文件，原文件保持不变。", ids.length));
    (activeId ? document.getElementById(`file-${activeId}`) : $('add-files'))?.focus();
  } catch (error) { report(error); }
  finally { ids.forEach(id => removing.delete(id)); render(); }
}

async function retry(entry: FileEntry): Promise<void> {
  if (!bridge || entry.state === 'processing' || entry.state === 'waiting') return;
  spectrograms.delete(entry.id);
  printSettings.delete(entry.id);
  entry.state = 'waiting';
  entry.result = undefined;
  entry.message = undefined;
  render();
  document.getElementById(`file-${entry.id}`)?.focus({ preventScroll: true });
  announce(t("重新解析 {0}。", entry.name));
  try { await bridge.retryFile(entry.id); }
  catch (error) { entry.state = 'failed'; entry.message = '无法重试，请再次尝试。'; render(); report(error); }
}

function receive(event: DesktopEvent): void {
  const entry = entries.find(item => item.id === event.id);
  if (!entry) return;
  if (event.type === 'started') entry.state = 'processing';
  if (event.type === 'result') {
    entry.result = event.result;
    entry.state = event.result.status === 'ok' ? 'done' : event.result.status === 'partial' ? 'partial' : 'failed';
    announce(`${entry.name}：${stateLabel(entry.state)}。`);
  }
  if (event.type === 'failed') { entry.state = 'failed'; entry.message = event.message; announce(t("{0}：解析失败，可重试。", entry.name)); }
  render();
}

function badge(entry: FileEntry): HTMLElement { return node('span', `badge ${entry.state}`, stateLabel(entry.state)); }

function audioStreams(entry: FileEntry): MediaStream[] {
  if (!entry.result || !['audio', 'video'].includes(entry.result.category)) return [];
  return entry.result.streams.filter(stream => stream.type === 'audio');
}

function spectrogramState(entry: FileEntry | undefined): SpectrogramState | undefined {
  if (!entry) return undefined;
  const streams = audioStreams(entry);
  if (!streams.length) return undefined;
  const current = spectrograms.get(entry.id);
  if (current && streams.some(stream => stream.index === current.streamIndex)) return current;
  const initial: SpectrogramState = { streamIndex: streams[0]!.index, status: 'idle' };
  spectrograms.set(entry.id, initial);
  return initial;
}

async function generateSpectrogram(entry: FileEntry): Promise<void> {
  const state = spectrogramState(entry);
  if (!bridge || !state || spectrogramJob || removing.has(entry.id)) return;
  const pending: SpectrogramState = { streamIndex: state.streamIndex, status: 'loading' };
  const job: SpectrogramJob = { id: entry.id, state: pending, cancelRequested: false };
  spectrograms.set(entry.id, pending);
  spectrogramJob = job;
  render();
  document.getElementById('spectrogram-cancel')?.focus({ preventScroll: true });
  announce(t("正在生成 {0} 的音频轨道 #{1} 频谱。", entry.name, state.streamIndex));
  try {
    const result = await bridge.generateSpectrogram(entry.id, state.streamIndex);
    if (!entries.includes(entry) || spectrograms.get(entry.id) !== job.state) return;
    if (job.cancelRequested) throw new Error('频谱生成已取消。');
    spectrograms.set(entry.id, { streamIndex: state.streamIndex, status: 'ready', result });
    announce(t("{0} 的频谱已生成。", entry.name));
  } catch (error) {
    if (!entries.includes(entry) || spectrograms.get(entry.id) !== job.state) return;
    const message = error instanceof Error ? error.message : String(error);
    const canceled = job.cancelRequested || message.includes('频谱生成已取消');
    spectrograms.set(entry.id, { streamIndex: state.streamIndex, status: canceled ? 'canceled' : 'error', message: canceled ? undefined : message });
    announce(canceled ? t("{0} 的频谱生成已取消。", entry.name) : t("{0} 的频谱未能生成，可重试。", entry.name));
  } finally {
    if (spectrogramJob === job) spectrogramJob = undefined;
    render();
  }
}

async function cancelSpectrogram(entry: FileEntry): Promise<void> {
  const job = spectrogramJob;
  if (!bridge || !job || job.id !== entry.id || job.cancelRequested || spectrograms.get(entry.id) !== job.state) return;
  job.cancelRequested = true;
  job.state = { ...job.state, canceling: true, message: undefined };
  spectrograms.set(entry.id, job.state);
  render();
  try { await bridge.cancelSpectrogram(entry.id); }
  catch (error) {
    if (spectrogramJob !== job || spectrograms.get(entry.id) !== job.state) return;
    job.cancelRequested = false;
    job.state = { ...job.state, canceling: false, message: `取消未完成：${error instanceof Error ? error.message : String(error)}。请再次取消。` };
    spectrograms.set(entry.id, job.state);
    render();
    announce(t("取消频谱生成未完成，请再次尝试。"));
  }
}

function streamValue(stream: MediaStream | undefined, key: string): MetadataField['value'] | undefined {
  const field = stream?.fields.find(item => item.key === key);
  return field?.status === 'present' ? field.value : undefined;
}

function trackLabel(stream: MediaStream): string {
  const fields = ['stream.codec', 'stream.language', 'audio.sampleRate', 'audio.channels'];
  const labels = fields.flatMap(key => {
    const field = stream.fields.find(item => item.key === key && item.status === 'present');
    if (!field) return [];
    return [key === 'audio.channels' ? t("{0} 声道", field.value) : formatField(field)];
  });
  return t("音频轨道 #{0}{1}", stream.index, labels.length ? ` · ${labels.join(' · ')}` : '');
}

function renderSpectrogram(entry: FileEntry, state: SpectrogramState): HTMLElement {
  const section = node('section', 'spectrogram-section');
  section.id = 'spectrogram-section';
  section.dataset.state = state.status;
  section.setAttribute('aria-labelledby', 'spectrogram-heading');
  const heading = node('div', 'section-heading');
  const title = node('h4', '', t("音轨频谱")); title.id = 'spectrogram-heading';
  heading.append(title, node('span', '', t("FFmpeg · 本机生成")));
  const controls = node('div', 'spectrogram-controls');
  const trackField = node('div', 'spectrogram-track');
  const label = node('label', '', t("音频轨道")); label.htmlFor = 'audio-track';
  const select = node('select', 'audio-track-select'); select.id = 'audio-track';
  const streams = audioStreams(entry);
  for (const stream of streams) {
    const option = node('option', '', trackLabel(stream)); option.value = String(stream.index); select.append(option);
  }
  select.value = String(state.streamIndex);
  select.disabled = state.status === 'loading' || removing.has(entry.id);
  select.addEventListener('change', () => {
    spectrograms.set(entry.id, { streamIndex: Number(select.value), status: 'idle' });
    render();
    announce(t("已切换音频轨道，可生成此轨道的频谱。"));
  });
  trackField.append(label, select);
  const buttons = node('div', 'spectrogram-actions');
  const generateLabel = state.status === 'ready' ? t("重新生成") : ['error', 'canceled'].includes(state.status) ? t("重试生成") : t("生成频谱");
  const generate = action(generateLabel, () => { void generateSpectrogram(entry); });
  generate.id = 'spectrogram-generate';
  generate.disabled = Boolean(spectrogramJob) || removing.has(entry.id);
  buttons.append(generate);
  if (state.status === 'loading') {
    const cancel = action(state.canceling ? t("正在取消…") : t("取消生成"), () => { void cancelSpectrogram(entry); });
    cancel.id = 'spectrogram-cancel';
    // Keep the pending cancel control focusable until the task actually settles.
    cancel.setAttribute('aria-disabled', String(Boolean(state.canceling)));
    buttons.append(cancel);
  }
  controls.append(trackField, buttons);
  const busyOther = spectrogramJob && spectrogramJob.id !== entry.id;
  const busyName = busyOther ? entries.find(item => item.id === spectrogramJob!.id)?.name : undefined;
  const statusText = {
    idle: t("尚未生成此音轨的频谱。"), loading: state.canceling ? t("正在取消生成，请稍候。") : t("正在生成完整音轨频谱，长文件可能需要更长时间。"),
    ready: t("频谱已生成。"), error: t("未能生成频谱，可重试生成。"), canceled: t("频谱生成已取消，可重试生成。"),
  }[state.status];
  const status = node('p', `spectrogram-status${state.status === 'error' ? ' error-text' : ''}`, busyOther
    ? t('正在生成 {0} 的频谱；完成后可生成此音轨，也可切回该文件取消。', busyName ?? t('另一个文件')) : statusText);
  status.id = 'spectrogram-status';
  const figure = node('figure', 'spectrogram-figure');
  const selected = streams.find(stream => stream.index === state.streamIndex);
  // Never show a completed image under a different track's selection.
  const result = state.status === 'ready' && state.result?.streamIndex === state.streamIndex ? state.result : undefined;
  const sampleRate = result?.sampleRateHz ?? streamValue(selected, 'audio.sampleRate');
  const duration = result?.durationSeconds ?? streamValue(selected, 'stream.duration');
  const maxFrequency = typeof sampleRate === 'number' ? sampleRate / 2 : undefined;
  const elapsed = typeof duration === 'number' ? duration : undefined;
  const scroll = node('div', 'spectrogram-scroll');
  scroll.id = 'spectrogram-scroll'; scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', t('频谱图，窄窗口可横向滚动查看完整坐标和色标'));
  const chart = node('div', 'spectrogram-chart');
  chart.style.setProperty('--spectrum-ratio', `${SPECTRUM_STYLE.width} / ${SPECTRUM_STYLE.height}`);
  const chartHeading = node('div', 'spectrogram-chart-heading');
  chartHeading.append(node('p', 'spectrogram-filename', entry.name));
  if (selected) chartHeading.append(node('p', 'spectrogram-track-info', trackLabel(selected)));
  const frequencyAxis = node('div', 'spectrogram-frequency');
  frequencyAxis.setAttribute('aria-hidden', 'true');
  for (const frequency of plotTicks(maxFrequency, 5)) {
    const tick = node('span', 'spectrogram-frequency-tick', `${plotNumbers.format(frequency / 1000)} kHz`);
    tick.style.bottom = `${frequency / maxFrequency! * 100}%`;
    frequencyAxis.append(tick);
  }
  if (!maxFrequency) frequencyAxis.append(node('span', 'spectrogram-axis-unknown', t('频率 Hz')));
  const frame = node('div', 'spectrogram-frame');
  frame.setAttribute('aria-busy', String(state.status === 'loading'));
  if (result) {
    const image = node('img', 'spectrogram-image'); image.id = 'spectrogram-image';
    image.src = result.imageDataUrl; image.width = result.width; image.height = result.height;
    image.alt = t("{0}，音频轨道 #{1} 的频谱；横轴为时间，纵轴为频率，颜色表示信号强度。", entry.name, state.streamIndex);
    image.setAttribute('aria-describedby', 'spectrogram-description');
    frame.append(image);
  } else {
    const placeholder = node('div', 'spectrogram-placeholder');
    if (state.status === 'loading') {
      const spinner = node('span', 'spinner'); spinner.setAttribute('aria-hidden', 'true'); placeholder.append(spinner);
    }
    placeholder.append(node('span', '', state.status === 'idle' ? t("点击“生成频谱”查看此音轨") : statusText));
    frame.append(placeholder);
  }
  const timeAxis = node('div', 'spectrogram-time');
  timeAxis.setAttribute('aria-hidden', 'true');
  for (const time of plotTicks(elapsed, 8)) {
    const tick = node('span', 'spectrogram-time-tick', plotTime(time, elapsed!));
    tick.style.left = `${time / elapsed! * 100}%`;
    timeAxis.append(tick);
  }
  if (!elapsed) timeAxis.append(node('span', 'spectrogram-axis-unknown', t('时间（分:秒）')));
  const legend = node('div', 'spectrogram-legend'); legend.setAttribute('aria-hidden', 'true');
  const colorBar = node('div', 'spectrogram-colorbar');
  colorBar.style.backgroundImage = SPECTRUM_GRADIENT;
  const decibels = node('div', 'spectrogram-decibels');
  for (let db = SPECTRUM_STYLE.maxDb; db >= SPECTRUM_STYLE.minDb; db -= 20) {
    const tick = node('span', 'spectrogram-db-tick', `${db < 0 ? '−' : ''}${Math.abs(db)} dB`);
    tick.style.top = `${(SPECTRUM_STYLE.maxDb - db) / (SPECTRUM_STYLE.maxDb - SPECTRUM_STYLE.minDb) * 100}%`;
    decibels.append(tick);
  }
  legend.append(colorBar, decibels);
  const description = node('figcaption', 'spectrogram-description'); description.id = 'spectrogram-description';
  const channels = result?.channels ?? streamValue(selected, 'audio.channels');
  const ranges = result ? t("时间 0–{0} s；频率 0–{1} Hz，线性刻度。", plotNumbers.format(result.durationSeconds), plotNumbers.format(result.sampleRateHz / 2)) : t("横轴为时间（秒），纵轴为频率（Hz），均为线性刻度。");
  const channelNote = typeof channels === 'number' ? channels > 1 ? t("{0} 个声道合并显示。", channels) : t("单声道显示。") : t("多个声道合并显示。");
  description.textContent = t("{0}颜色表示信号强度，显示范围 −120 至 0 dBFS，暗为弱、亮为强。{1}频谱不能单独用于判断源文件是否真无损。", ranges, channelNote);
  description.append(' ', t("完整音轨流式分析；同一时间列保留较强信号，短暂峰值可能更突出。"));
  chart.append(chartHeading, frequencyAxis, frame, legend, timeAxis);
  scroll.append(chart); figure.append(scroll, description);
  section.append(heading, controls, status);
  if (state.message) section.append(node('p', 'spectrogram-error', translateText(state.message)));
  section.append(figure);
  return section;
}

function renderList(): void {
  const list = $('file-list');
  const fragment = document.createDocumentFragment();
  for (const entry of entries) {
    const row = node('li', `file-row${entry.id === activeId ? ' selected' : ''}`);
    const select = action('', () => { activeId = entry.id; view = 'detail'; render(); }, 'file-select');
    select.id = `file-${entry.id}`;
    select.setAttribute('aria-pressed', String(entry.id === activeId));
    const ext = entry.result?.detectedType.ext ?? entry.name.split('.').slice(1).at(-1) ?? 'FILE';
    const tile = node('span', 'file-type', ext.slice(0, 5).toUpperCase());
    tile.setAttribute('aria-hidden', 'true');
    const info = node('span', 'file-info');
    const status = node('span', 'file-state', stateLabel(entry.state));
    status.dataset.state = entry.state;
    info.append(node('span', 'file-name', entry.name), status);
    select.append(tile, info);
    const remove = action('×', () => { void removeFiles([entry.id]); }, 'remove-file');
    remove.id = `remove-${entry.id}`;
    remove.setAttribute('aria-label', t("从列表移除 {0}", entry.name));
    remove.disabled = removing.has(entry.id);
    row.append(select, remove);
    fragment.append(row);
  }
  list.replaceChildren(fragment);
  $('file-count').textContent = String(entries.length);
  const complete = entries.filter(entry => !['waiting', 'processing'].includes(entry.state)).length;
  $('list-summary').textContent = entries.length ? t("{0} 个文件 · {1} 个已处理", entries.length, complete) : t("添加文件后开始解析");
  $('list-hint').hidden = entries.length > 0;
  $<HTMLButtonElement>('clear-files').disabled = !entries.length || removing.size > 0;
  const busy = entries.filter(entry => entry.state === 'processing' || entry.state === 'waiting').length;
  $('session-status').textContent = busy ? t("{0} 个文件待完成", busy) : entries.length ? t("本次解析已完成") : t("准备就绪");
}

function parameterTable(title: string, fields: MetadataField[], id: string): HTMLElement {
  const section = node('section');
  const heading = node('div', 'section-heading');
  heading.append(node('h4', '', title), node('span', '', t("{0} 项参数", fields.length)));
  const wrapper = node('div', 'table-scroll');
  wrapper.id = id;
  wrapper.tabIndex = 0;
  wrapper.setAttribute('aria-label', t("{0}，可滚动查看", title));
  const table = node('table', 'metadata-table');
  const caption = node('caption', 'sr-only', title);
  const head = node('thead');
  const headRow = node('tr');
  for (const label of [t("参数"), t("值"), t("来源")]) {
    const cell = node('th', label === t("来源") ? 'field-source' : '', label); cell.scope = 'col'; headRow.append(cell);
  }
  head.append(headRow);
  const body = node('tbody');
  for (const field of fields) {
    const row = node('tr');
    const label = node('th', '', translateText(field.label)); label.scope = 'row';
    explainParameter(label, field.key, `${id}-help-${field.key}`);
    const value = node('td', field.status === 'present' ? 'field-value' : 'unavailable', formatField(field));
    if (field.note) value.append(node('span', 'field-note', translateNote(field.note)));
    const source = node('td', 'field-source', field.source);
    row.append(label, value, source);
    body.append(row);
  }
  table.append(caption, head, body); wrapper.append(table); section.append(heading, wrapper);
  return section;
}

function explainParameter(label: HTMLElement, key: string, id: string): void {
  const explanation = parameterExplanation(key);
  if (!explanation) return;
  const disclosure = node('details', 'parameter-help');
  disclosure.id = id;
  const summary = node('summary', '', t("参数解释"));
  summary.id = `${id}-summary`;
  summary.setAttribute('aria-label', t("{0}：参数解释", label.textContent));
  disclosure.append(summary, node('p', '', explanation));
  label.append(disclosure);
}

function usageCalculations(entry: FileEntry): HTMLElement | undefined {
  const result = entry.result!;
  if (result.status === 'error') return undefined;
  const streams = result.streams.filter(stream => stream.type === 'audio');
  if (result.category !== 'image' && !streams.length) return undefined;
  const section = node('section', 'usage-calculations');
  section.setAttribute('aria-labelledby', 'usage-heading');
  const heading = node('div', 'section-heading');
  const title = node('h4', '', t("用途计算")); title.id = 'usage-heading';
  heading.append(title, node('span', '', t("根据参数估算")));
  section.append(heading);
  const numbers = numberFormat({ maximumSignificantDigits: 5 });
  if (result.category === 'image') {
    let state = printSettings.get(entry.id);
    if (!state) { state = { dpi: '300', calculated: true, inputLocale: getLocale() }; printSettings.set(entry.id, state); }
    const settings = state;
    let composing = false;
    const form = node('form', 'usage-form'); form.noValidate = true;
    const label = node('label', '', t("目标打印 DPI")); label.htmlFor = 'print-dpi';
    const controls = node('div', 'usage-controls');
    const input = node('input', 'usage-input'); input.id = 'print-dpi';
    input.type = 'text'; input.inputMode = 'decimal'; input.maxLength = 32;
    input.value = settings.dpi;
    input.setAttribute('aria-describedby', 'print-hint print-error');
    const button = node('button', 'button', t("计算尺寸")); button.type = 'submit';
    controls.append(input, button);
    const hint = node('p', 'usage-note',
      t("默认 300 DPI 是计算条件，不是文件记录值。按每英寸像素数换算，不裁切、不放大；结果不保证实际印刷质量。"));
    hint.id = 'print-hint';
    const error = node('p', 'usage-error'); error.id = 'print-error';
    const output = node('output', 'usage-result'); output.id = 'print-result';
    output.htmlFor.add(input.id);
    const formula = node('p', 'usage-note', t("公式：打印尺寸（cm）= 像素尺寸 ÷ 目标 DPI × 2.54。"));
    const update = (): boolean => {
      error.textContent = ''; input.removeAttribute('aria-invalid');
      if (!settings.calculated) { output.textContent = t("条件已更改，请计算。"); return true; }
      const calculated = printDimensions(positiveField(result.fields, 'image.width'),
        positiveField(result.fields, 'image.height'), settings.dpi, settings.inputLocale);
      if ('error' in calculated) {
        output.textContent = t("暂无可用的打印尺寸。");
        error.textContent = translateText(calculated.error);
        if (calculated.invalidDpi) input.setAttribute('aria-invalid', 'true');
        return !calculated.invalidDpi;
      }
      output.textContent = t("按 {0} DPI：宽 {1} cm × 高 {2} cm", numbers.format(calculated.dpi), numbers.format(calculated.widthCm), numbers.format(calculated.heightCm));
      return true;
    };
    input.addEventListener('input', () => {
      settings.dpi = input.value; settings.calculated = false; settings.inputLocale = getLocale(); update();
    });
    input.addEventListener('compositionstart', () => { composing = true; });
    input.addEventListener('compositionend', () => { composing = false; });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (composing) return;
      settings.calculated = true;
      if (!update()) input.focus();
    });
    update();
    form.append(label, controls, hint, error, output, formula);
    section.append(form);
  }
  for (const stream of streams) {
    const block = node('div', 'usage-audio');
    block.append(node('h5', '', t("PCM 数据量估算 · 音频轨道 #{0}", stream.index)));
    const estimate = pcmEstimate(stream);
    if ('error' in estimate) block.append(node('p', 'usage-note', translateText(estimate.error)));
    else {
      block.append(node('p', 'usage-result', t("每分钟约 {0}", formatBytes(estimate.bytesPerMinute))),
        node('p', 'usage-note', t("PCM 码率：{0}。", formatBitRate(estimate.bitRate))));
      if (estimate.totalBytes !== undefined) {
        block.append(node('p', 'usage-note',
          t("按该轨道记录的时长 {0} 估算：{1}。", formatDuration(estimate.duration!), formatBytes(estimate.totalBytes))));
      } else block.append(node('p', 'usage-note', t("缺少可可靠计算的轨道时长，仅显示每分钟用量；不以容器时长代替。")));
    }
    block.append(node('p', 'usage-note',
      t("公式：采样率 × 位深 × 声道数 × 秒数 ÷ 8。假设参数恒定且采样紧密存储，不含文件头、对齐和元数据；不是当前压缩文件大小或质量评分。")));
    section.append(block);
  }
  return section;
}

function privacySection(result: AnalysisResult): HTMLElement | undefined {
  const privacy = result.privacy;
  if (!privacy) return undefined;
  const section = node('section', 'privacy-section');
  section.id = 'privacy-section'; section.dataset.state = privacy.status;
  section.setAttribute('aria-labelledby', 'privacy-heading');
  const heading = node('div', 'section-heading');
  const title = node('h4', '', t("隐私元数据检查")); title.id = 'privacy-heading';
  heading.append(title, node('span', '', t("本机只读检查"))); section.append(heading);
  const status = ({ checked: t("已检查支持的字段"), partial: t("检查不完整"), unavailable: t("未能检查"), unsupported: t("未支持此格式") })[privacy.status];
  section.append(node('p', 'privacy-status', t("{0} · {1} 项可能涉及隐私的记录", status, privacy.findings.length)));
  if (!privacy.findings.length) section.append(node('p', 'usage-note', privacy.status === 'checked'
    ? t("在已读取的支持字段中未发现记录；这不代表文件不含隐私。")
    : t("检查范围不足，无法据此判断文件是否包含隐私信息。")));
  else {
    const disclosure = node('details', 'metadata-disclosure'); disclosure.id = 'privacy-records';
    const summary = node('summary', '', t("查看发现的元数据（{0} 项）", privacy.findings.length)); summary.id = 'privacy-records-summary';
    disclosure.append(summary, parameterTable(t("可能涉及隐私的元数据"), privacy.findings, 'privacy-metadata-table'));
    section.append(disclosure);
  }
  if (privacy.checkedSources.length) section.append(node('p', 'usage-note', t("已检查来源：{0}。",
    privacy.checkedSources.map(translateText).join(['zh-CN', 'ja-JP'].includes(getLocale()) ? '、' : ', '))));
  for (const limitation of privacy.limitations) section.append(node('p', 'usage-note', translateText(limitation)));
  return section;
}

function pdfPageSection(result: AnalysisResult): HTMLElement | undefined {
  if (result.category !== 'pdf') return undefined;
  const section = node('section', 'pdf-page-section');
  const heading = node('div', 'section-heading');
  heading.append(node('h4', '', t("PDF 页面尺寸")), node('span', '', t('1 pt = 1/72 inch')));
  section.append(heading, node('p', 'usage-note', t("按 MediaBox 记录宽高，已计入 UserUnit；尺寸未应用旋转，未裁切到 CropBox，不代表打印机的可打印区域。")));
  const pages = result.pdfPages ?? [];
  if (!pages.length) { section.append(node('p', 'usage-note', t("未读取到可展示的页面尺寸，请查看解析问题。"))); return section; }
  const disclosure = node('details', 'metadata-disclosure'); disclosure.id = 'pdf-page-records';
  const summary = node('summary', '', t("查看页面尺寸（已读取 {0} 页）", pages.length)); summary.id = 'pdf-page-records-summary';
  const wrapper = node('div', 'table-scroll'); wrapper.tabIndex = 0;
  wrapper.setAttribute('aria-label', t("PDF 逐页尺寸，可滚动查看"));
  const table = node('table'); table.append(node('caption', 'sr-only', t("PDF 逐页页面尺寸")));
  const head = node('thead'); const header = node('tr');
  for (const text of [t("页码"), t("宽度"), t("高度"), t("旋转")]) { const th = node('th', '', text); th.scope = 'col'; header.append(th); }
  head.append(header);
  const body = node('tbody'); const numbers = numberFormat({ maximumFractionDigits: 2 });
  for (const page of pages) {
    const row = node('tr'); const th = node('th', '', String(page.number)); th.scope = 'row'; row.append(th);
    for (const value of [t('{0} mm（{1} pt）', numbers.format(page.widthPt / 72 * 25.4), numbers.format(page.widthPt)),
      t('{0} mm（{1} pt）', numbers.format(page.heightPt / 72 * 25.4), numbers.format(page.heightPt)), `${page.rotation}°`]) row.append(node('td', 'field-value', value));
    body.append(row);
  }
  table.append(head, body); wrapper.append(table); disclosure.append(summary, wrapper); section.append(disclosure);
  return section;
}

function renderDetail(): void {
  const container = $('detail-content');
  const entry = entries.find(item => item.id === activeId);
  const spectrum = spectrogramState(entry);
  const next = { locale: getLocale(), id: entry?.id, state: entry?.state, result: entry?.result, message: entry?.message,
    picking: entry ? false : picking, spectrogram: spectrum, spectrogramBusyId: spectrum ? spectrogramJob?.id : undefined };
  // Background results must not replace the active file's DOM or steal its focus/scroll.
  if (renderedDetail && Object.keys(next).every(key =>
    next[key as keyof typeof next] === renderedDetail![key as keyof typeof next])) return;
  const sameFile = renderedDetail?.id === entry?.id;
  const locationOpen = sameFile && (document.getElementById('file-location') as HTMLDetailsElement | null)?.open;
  const openHelp = sameFile ? Array.from(container.querySelectorAll<HTMLDetailsElement>('.parameter-help[open], .metadata-disclosure[open]')).map(item => item.id) : [];
  const offsets = sameFile ? Array.from(container.querySelectorAll<HTMLElement>('.table-scroll, .spectrogram-scroll')).map(element =>
    ({ id: element.id, left: element.scrollLeft, top: element.scrollTop })) : [];
  renderedDetail = next;
  if (!entry) {
    const empty = node('div', 'empty-state');
    const symbol = node('div', 'drop-symbol', '↓'); symbol.setAttribute('aria-hidden', 'true');
    const add = action(t("选择本地文件"), () => { void chooseFiles(); }, 'button primary');
    add.id = 'empty-add'; add.disabled = !bridge || picking;
    empty.append(symbol, node('h3', '', t("把文件拖到这里")), node('p', '', t("查看文件的编码、尺寸、时长和文档属性，也可以添加多个文件进行对比。")), add,
      node('p', 'format-list', t('AUDIO / VIDEO / IMAGE / OFFICE / PDF')));
    container.replaceChildren(empty);
    return;
  }
  const detail = node('div', 'file-detail');
  const heading = node('div', 'detail-heading');
  const identity = node('div');
  const title = node('h3', '', entry.name);
  const meta = node('div', 'detail-meta');
  meta.append(node('span', '', entry.result ? categoryLabel(entry.result.category) : t("本地文件")), badge(entry));
  identity.append(title, meta); heading.append(identity);
  if (entry.state === 'partial' || entry.state === 'failed') {
    const retryButton = action(t("重新解析"), () => { void retry(entry); }); retryButton.id = 'retry-file'; heading.append(retryButton);
  }
  detail.append(heading);
  const location = node('details', 'file-path');
  location.id = 'file-location'; location.open = Boolean(locationOpen);
  const summary = node('summary', '', t("文件位置")); summary.id = 'file-location-summary';
  location.append(summary, node('p', '', entry.path));
  detail.append(location);
  if (entry.state === 'processing' || entry.state === 'waiting') {
    const pending = node('div', 'processing-block');
    const spinner = node('span', 'spinner'); spinner.setAttribute('aria-hidden', 'true');
    pending.append(spinner, node('span', '', entry.state === 'processing' ? t("正在读取文件参数，仍可添加或切换文件。") : t("等待前面的文件完成解析。")));
    detail.append(pending);
    detail.setAttribute('aria-busy', 'true');
  }
  const issues = entry.result?.issues ?? [];
  if (issues.length || entry.message) {
    const notice = node('div', `notice${entry.state === 'failed' ? ' error' : ''}`);
    notice.append(node('strong', '', entry.state === 'failed' ? t("未能完成此文件的解析") : t("部分信息需要留意")));
    if (entry.message) notice.append(node('p', '', translateText(entry.message)));
    for (const issue of issues) notice.append(node('p', '', translateText(issue.message)));
    if (issues.some(issue => issue.code.startsWith('TOOL_'))) notice.append(node('p', '', t("请检查解析工具是否已安装，以及启动应用时的工具路径配置，然后重新解析。")));
    if (entry.state === 'failed') notice.append(node('p', '', t("可以检查文件是否仍存在、能否读取，或添加另一个文件。")));
    detail.append(notice);
  }
  if (entry.result) {
    const privacy = privacySection(entry.result);
    if (privacy) detail.append(privacy);
    if (spectrum) detail.append(renderSpectrogram(entry, spectrum));
    else if (entry.result.category === 'video') detail.append(node('p', 'spectrogram-unavailable', t("未读取到可用音轨，无法生成频谱；仍可查看视频参数。")));
    const calculations = usageCalculations(entry);
    if (calculations) detail.append(calculations);
    const file = entry.result.fields.filter(field => field.key.startsWith('file.'));
    const specialized = entry.result.fields.filter(field => !field.key.startsWith('file.'));
    if (file.length) detail.append(parameterTable(t("基础信息"), file, 'base-info-table'));
    if (specialized.length) detail.append(parameterTable(t("文件参数"), specialized, 'file-parameters-table'));
    const pdfPages = pdfPageSection(entry.result);
    if (pdfPages) detail.append(pdfPages);
    for (const stream of entry.result.streams) {
      const type = ({ video: t("视频轨道"), audio: t("音频轨道"), subtitle: t("字幕轨道") } as Record<string, string>)[stream.type] ?? t("其他轨道");
      detail.append(parameterTable(`${type} #${stream.index}`, stream.fields, `stream-table-${stream.index}`));
    }
  }
  container.replaceChildren(detail);
  for (const id of openHelp) {
    const disclosure = document.getElementById(id) as HTMLDetailsElement | null;
    if (disclosure) disclosure.open = true;
  }
  for (const offset of offsets) {
    const element = document.getElementById(offset.id);
    if (element) { element.scrollLeft = offset.left; element.scrollTop = offset.top; }
  }
}

function finishColumnDrag(): void {
  if (!columnDrag) return;
  cancelAnimationFrame(columnDrag.frame);
  columnDrag = undefined;
  if (view === 'compare') renderComparison();
}

function moveComparisonColumn(source: string, target: string, side: 'before' | 'after'): void {
  const ordered = comparisonEntries(entries, comparisonOrder);
  comparisonOrder = reorderComparisonColumns(ordered.map(entry => entry.id), source, target, side);
  if (columnDrag) { cancelAnimationFrame(columnDrag.frame); columnDrag = undefined; }
  renderComparison();
  const handle = document.getElementById(`column-handle-${source}`);
  handle?.focus({ preventScroll: true });
  handle?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const entry = entries.find(item => item.id === source);
  if (entry) announce(t("{0} 已移到第 {1} 个文件列，共 {2} 列。", entry.name, comparisonOrder.indexOf(source) + 1, comparisonOrder.length));
}

function renderComparison(): void {
  // Keep native drag targets alive while background analysis updates arrive.
  if (columnDrag && entries.some(entry => entry.id === columnDrag!.id)) return;
  if (columnDrag) { cancelAnimationFrame(columnDrag.frame); columnDrag = undefined; }
  const focused = document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
  const ordered = comparisonEntries(entries, comparisonOrder);
  comparisonOrder = ordered.map(entry => entry.id);
  const openHelp = new Set(Array.from($('compare-content').querySelectorAll<HTMLDetailsElement>('.parameter-help[open]')).map(item => item.id));
  const previousScroll = document.getElementById('comparison-scroll');
  const offset = { left: previousScroll?.scrollLeft ?? 0, top: previousScroll?.scrollTop ?? 0 };
  const detail = node('div', 'compare-detail');
  detail.append(node('h3', '', t("{0} 个文件的参数对比", entries.length)), node('p', 'compare-description', t("比较当前列表中的文件。未记录与不适用分别标注，完整参数可在文件详情中查看。")));
  const controls = node('div', 'comparison-toolbar');
  const hint = node('p', '', t("拖动文件列的“拖动排序”调整顺序，也可点击左右箭头。键盘可用 Alt + ← / →。"));
  hint.id = 'comparison-reorder-hint';
  const reset = action(t("恢复添加顺序"), () => {
    comparisonOrder = entries.map(entry => entry.id); renderComparison();
    const handle = document.getElementById(`column-handle-${entries[0]?.id}`);
    handle?.focus({ preventScroll: true });
    handle?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    announce(t("对比列已恢复为文件添加顺序。"));
  }, 'button small');
  reset.id = 'comparison-reset';
  reset.disabled = ordered.every((entry, index) => entry === entries[index]);
  controls.append(hint, reset); detail.append(controls);
  const wrapper = node('div', 'table-scroll'); wrapper.tabIndex = 0;
  wrapper.id = 'comparison-scroll';
  wrapper.setAttribute('aria-label', t("文件参数对比，可横向滚动"));
  const table = node('table', 'compare-table');
  table.style.width = `${160 + entries.length * 190}px`;
  table.append(node('caption', 'sr-only', t("当前列表的文件参数对比")));
  const head = node('thead'); const header = node('tr');
  const corner = node('th', '', t("参数")); corner.scope = 'col'; header.append(corner);
  for (const [index, entry] of ordered.entries()) {
    const cell = node('th'); cell.scope = 'col'; cell.dataset.columnId = entry.id;
    cell.append(node('span', 'comparison-file-name', entry.name), node('span', 'field-note', stateLabel(entry.state)));
    const actions = node('div', 'column-actions');
    const handle = action(t("↔ 拖动排序"), () => { handle.focus(); }, 'button small column-handle');
    handle.id = `column-handle-${entry.id}`;
    handle.draggable = true;
    handle.setAttribute('aria-label', t("拖动排序：{0} 列", entry.name));
    handle.setAttribute('aria-describedby', hint.id);
    handle.setAttribute('aria-keyshortcuts', 'Alt+ArrowLeft Alt+ArrowRight');
    handle.addEventListener('keydown', event => {
      if (event.isComposing) return;
      if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const neighbor = ordered[index + (event.key === 'ArrowLeft' ? -1 : 1)];
      if (neighbor) moveComparisonColumn(entry.id, neighbor.id, event.key === 'ArrowLeft' ? 'before' : 'after');
    });
    handle.addEventListener('dragstart', event => {
      if (!event.dataTransfer) return;
      columnDrag = { id: entry.id, clientX: event.clientX, clientY: event.clientY, frame: 0 };
      event.dataTransfer.setData('application/x-file-analyzer-column', entry.id);
      event.dataTransfer.effectAllowed = 'move';
      for (const element of table.querySelectorAll<HTMLElement>('[data-column-id]')) {
        if (element.dataset.columnId === entry.id) element.dataset.dragging = 'true';
      }
      columnDrag.frame = requestAnimationFrame(scrollColumnDrag);
      announce(t("正在移动 {0} 列，拖到目标列的左侧或右侧放下，按 Escape 取消。", entry.name));
    });
    handle.addEventListener('dragend', finishColumnDrag);
    const left = action('←', () => moveComparisonColumn(entry.id, ordered[index - 1]!.id, 'before'), 'button small');
    left.id = `column-left-${entry.id}`; left.disabled = index === 0;
    left.setAttribute('aria-label', t("左移 {0} 列", entry.name));
    const right = action('→', () => moveComparisonColumn(entry.id, ordered[index + 1]!.id, 'after'), 'button small');
    right.id = `column-right-${entry.id}`; right.disabled = index === ordered.length - 1;
    right.setAttribute('aria-label', t("右移 {0} 列", entry.name));
    actions.append(handle, left, right); cell.append(actions); header.append(cell);
  }
  head.append(header);
  const body = node('tbody');
  for (const row of buildComparison(ordered).rows) {
    const tr = node('tr'); const th = node('th', '', row.label); th.scope = 'row';
    explainParameter(th, row.key, `compare-help-${row.key}`);
    const help = th.querySelector('details');
    if (help && openHelp.has(help.id)) help.open = true;
    tr.append(th);
    for (const [index, value] of row.values.entries()) {
      const cell = node('td', 'field-value', value); cell.dataset.columnId = ordered[index]!.id; tr.append(cell);
    }
    body.append(tr);
  }
  table.append(head, body); wrapper.append(table); detail.append(wrapper);
  const dropTarget = (x: number, y: number): { id: string; side: 'before' | 'after' } | undefined => {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-column-id]');
    if (!element || !table.contains(element)) return undefined;
    return { id: element.dataset.columnId!, side: x < element.getBoundingClientRect().left + element.offsetWidth / 2 ? 'before' : 'after' };
  };
  let indicatedTarget = '';
  const indicateTarget = (x: number, y: number): void => {
    const target = dropTarget(x, y);
    const key = target && target.id !== columnDrag?.id ? `${target.id}:${target.side}` : '';
    if (key === indicatedTarget) return;
    indicatedTarget = key;
    for (const element of table.querySelectorAll<HTMLElement>('[data-column-id]')) {
      if (target && target.id !== columnDrag?.id && element.dataset.columnId === target.id) element.dataset.dropSide = target.side;
      else delete element.dataset.dropSide;
    }
  };
  function scrollColumnDrag(): void {
    if (!columnDrag) return;
    const bounds = wrapper.getBoundingClientRect();
    const { clientX: x, clientY: y } = columnDrag;
    if (y >= bounds.top && y <= bounds.bottom && x >= bounds.left && x <= bounds.right) {
      const speed = x < bounds.left + 45 ? -12 : x > bounds.right - 45 ? 12 : 0;
      wrapper.scrollLeft += speed;
      indicateTarget(x, y);
    }
    columnDrag.frame = requestAnimationFrame(scrollColumnDrag);
  }
  wrapper.addEventListener('dragover', event => {
    if (!columnDrag || event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault(); event.stopPropagation();
    columnDrag.clientX = event.clientX; columnDrag.clientY = event.clientY;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    indicateTarget(event.clientX, event.clientY);
  });
  wrapper.addEventListener('dragleave', event => {
    if (!columnDrag || (event.relatedTarget instanceof Node && wrapper.contains(event.relatedTarget))) return;
    columnDrag.clientX = -1; columnDrag.clientY = -1; indicateTarget(-1, -1);
  });
  wrapper.addEventListener('drop', event => {
    if (!columnDrag || event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault(); event.stopPropagation();
    const target = dropTarget(event.clientX, event.clientY);
    if (target) moveComparisonColumn(columnDrag.id, target.id, target.side);
    else finishColumnDrag();
  });
  $('compare-content').replaceChildren(detail);
  wrapper.scrollLeft = offset.left; wrapper.scrollTop = offset.top;
  if (focused) document.getElementById(focused)?.focus({ preventScroll: true });
}

function render(): void {
  renderLocaleShell();
  const focused = document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
  renderList();
  renderDetail();
  if (entries.length < 2) view = 'detail';
  const compare = view === 'compare';
  if (compare) renderComparison();
  $('detail-panel').hidden = compare; $('compare-panel').hidden = !compare;
  const detailTab = $<HTMLButtonElement>('detail-tab');
  detailTab.disabled = false;
  const compareTab = $<HTMLButtonElement>('compare-tab');
  compareTab.disabled = entries.length < 2;
  for (const [tab, selected] of [[detailTab, !compare], [compareTab, compare]] as const) {
    tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
  }
  const add = $<HTMLButtonElement>('add-files'); add.disabled = !bridge || picking; add.setAttribute('aria-busy', String(picking));
  $('view-hint').textContent = entries.length < 2 ? t("添加多个文件可进行对比") : t("当前列表可切换对比");
  const active = entries.find(item => item.id === activeId);
  document.title = active ? `${active.name} · File Analyzer` : t("File Analyzer · 文件参数");
  if (focused && document.activeElement === document.body) {
    const previous = document.getElementById(focused);
    if (previous && !previous.matches(':disabled')) previous.focus({ preventScroll: true });
    else if (focused === 'spectrogram-cancel' && !compare) document.getElementById('spectrogram-generate')?.focus({ preventScroll: true });
  }
}

$('add-files').addEventListener('click', () => { void chooseFiles(); });
$('clear-files').addEventListener('click', () => { void removeFiles(entries.map(entry => entry.id)); });
for (const kind of ['detail', 'compare'] as const) {
  $(`${kind}-tab`).addEventListener('click', () => { view = kind; render(); });
  $(`${kind}-tab`).addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (entries.length < 2) return;
    view = event.key === 'Home' ? 'detail' : event.key === 'End' ? 'compare' : view === 'detail' ? 'compare' : 'detail';
    render(); $(`${view}-tab`).focus();
  });
}

let dragDepth = 0;
document.addEventListener('dragenter', event => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault(); dragDepth++; $('drag-overlay').hidden = false;
});
document.addEventListener('dragover', event => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault(); event.dataTransfer.dropEffect = 'copy';
});
document.addEventListener('dragleave', event => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; $('drag-overlay').hidden = true; }
});
document.addEventListener('drop', event => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault(); dragDepth = 0; $('drag-overlay').hidden = true;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (!files.length || !bridge) return;
  void bridge.importFiles(files).then(addFiles).catch(report);
});
window.addEventListener('blur', () => { dragDepth = 0; $('drag-overlay').hidden = true; finishColumnDrag(); });
window.addEventListener('keydown', event => {
  if (event.isComposing) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); void chooseFiles(); }
});
const unsubscribe = bridge?.onEvent(receive);
window.addEventListener('beforeunload', () => unsubscribe?.(), { once: true });
if (!bridge) {
  $('app-error').textContent = t("桌面连接未就绪，请重新启动应用。"); $('app-error').hidden = false;
}
const languageSelect = $<HTMLSelectElement>('language-select');
for (const language of languages) {
  const option = node('option', '', language.name); option.value = language.locale; option.lang = language.locale;
  languageSelect.append(option);
}
function renderLocaleShell(): void {
  document.documentElement.lang = getLocale();
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) element.textContent = t(element.dataset.i18n!);
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n-label]')) element.setAttribute('aria-label', t(element.dataset.i18nLabel!));
  $('file-size-hint').textContent = t(FILE_SIZE_HINT);
  if (operationError && !$('app-error').hidden) $('app-error').textContent =
    t('操作未完成：{0}。请重试；已有结果仍保留。', translateText(operationError));
  languageSelect.value = getLocale();
}
languageSelect.addEventListener('change', () => {
  const selected = languageSelect.value;
  if (!bridge || !isLocale(selected)) return;
  finishColumnDrag();
  languageSelect.disabled = true; languageSelect.setAttribute('aria-busy', 'true');
  void bridge.setLocale(selected).then(saved => {
    if (!isLocale(saved)) throw new Error('不支持此语言。');
    if (errorScope === 'language') { $('app-error').hidden = true; operationError = undefined; }
    setLocale(saved); render(); announce(t('界面语言已更新。'));
  }).catch(error => report(error, 'language')).finally(() => {
    languageSelect.value = getLocale(); languageSelect.disabled = false;
    languageSelect.removeAttribute('aria-busy'); languageSelect.focus({ preventScroll: true });
  });
});
async function initializeLocale(): Promise<void> {
  try {
    if (bridge) { const saved = await bridge.getLocale(); if (isLocale(saved)) setLocale(saved); }
  } catch (error) { report(error); }
  render(); languageSelect.disabled = !bridge;
}
void initializeLocale();
