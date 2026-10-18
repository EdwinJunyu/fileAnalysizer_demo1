import type { DesktopBridge, DesktopFile, DesktopEvent } from '../desktop/contracts.js';
import type { AnalysisResult, MediaStream, MetadataField, SpectrogramResult } from '../types.js';
import { buildComparison, categoryLabel, formatField, stateLabel, type FileEntry } from './model.js';

declare global { interface Window { fileAnalyzer?: DesktopBridge } }

const bridge = window.fileAnalyzer;
const entries: FileEntry[] = [];
let activeId: string | undefined;
let view: 'detail' | 'compare' = 'detail';
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
let spectrogramJob: SpectrogramJob | undefined;
let renderedDetail: {
  id?: string; state?: FileEntry['state']; result?: AnalysisResult; message?: string; picking: boolean;
  spectrogram?: SpectrogramState; spectrogramBusyId?: string;
} | undefined;
const plotNumbers = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });
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
function report(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  $('app-error').textContent = `操作未完成：${message}。请重试；已有结果仍保留。`;
  $('app-error').hidden = false;
  announce('操作未完成，请查看提示后重试。');
}

async function addFiles(descriptors: DesktopFile[]): Promise<void> {
  const added = descriptors.filter(file => !entries.some(entry => entry.id === file.id));
  for (const file of added) entries.push({ ...file, state: 'waiting' });
  if (!activeId && entries.length) activeId = entries[0]!.id;
  render();
  if (!added.length) {
    if (descriptors.length) announce('所选文件已在列表中。');
    return;
  }
  $('app-error').hidden = true;
  announce(`已添加 ${added.length} 个文件，开始解析。`);
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
    const previousIndex = entries.findIndex(entry => entry.id === activeId);
    for (let index = entries.length - 1; index >= 0; index--) if (removed.has(entries[index]!.id)) entries.splice(index, 1);
    ids.forEach(id => spectrograms.delete(id));
    if (!entries.some(entry => entry.id === activeId)) activeId = entries[Math.max(0, Math.min(previousIndex, entries.length - 1))]?.id;
    if (entries.length < 2) view = 'detail';
    render();
    announce(`已从列表移除 ${ids.length} 个文件，原文件保持不变。`);
    (activeId ? document.getElementById(`file-${activeId}`) : $('add-files'))?.focus();
  } catch (error) { report(error); }
  finally { ids.forEach(id => removing.delete(id)); render(); }
}

async function retry(entry: FileEntry): Promise<void> {
  if (!bridge || entry.state === 'processing' || entry.state === 'waiting') return;
  spectrograms.delete(entry.id);
  entry.state = 'waiting';
  entry.result = undefined;
  entry.message = undefined;
  render();
  document.getElementById(`file-${entry.id}`)?.focus({ preventScroll: true });
  announce(`重新解析 ${entry.name}。`);
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
  if (event.type === 'failed') { entry.state = 'failed'; entry.message = event.message; announce(`${entry.name}：解析失败，可重试。`); }
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
  announce(`正在生成 ${entry.name} 的音频轨道 #${state.streamIndex} 频谱。`);
  try {
    const result = await bridge.generateSpectrogram(entry.id, state.streamIndex);
    if (!entries.includes(entry) || spectrograms.get(entry.id) !== job.state) return;
    if (job.cancelRequested) throw new Error('频谱生成已取消。');
    spectrograms.set(entry.id, { streamIndex: state.streamIndex, status: 'ready', result });
    announce(`${entry.name} 的频谱已生成。`);
  } catch (error) {
    if (!entries.includes(entry) || spectrograms.get(entry.id) !== job.state) return;
    const message = error instanceof Error ? error.message : String(error);
    const canceled = job.cancelRequested || message.includes('频谱生成已取消');
    spectrograms.set(entry.id, { streamIndex: state.streamIndex, status: canceled ? 'canceled' : 'error', message: canceled ? undefined : message });
    announce(canceled ? `${entry.name} 的频谱生成已取消。` : `${entry.name} 的频谱未能生成，可重试。`);
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
    announce('取消频谱生成未完成，请再次尝试。');
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
    return [key === 'audio.channels' ? `${formatField(field)} 声道` : formatField(field)];
  });
  return `音频轨道 #${stream.index}${labels.length ? ` · ${labels.join(' · ')}` : ''}`;
}

function renderSpectrogram(entry: FileEntry, state: SpectrogramState): HTMLElement {
  const section = node('section', 'spectrogram-section');
  section.id = 'spectrogram-section';
  section.dataset.state = state.status;
  section.setAttribute('aria-labelledby', 'spectrogram-heading');
  const heading = node('div', 'section-heading');
  const title = node('h4', '', '音轨频谱'); title.id = 'spectrogram-heading';
  heading.append(title, node('span', '', 'FFmpeg · 本机生成'));
  const controls = node('div', 'spectrogram-controls');
  const trackField = node('div', 'spectrogram-track');
  const label = node('label', '', '音频轨道'); label.htmlFor = 'audio-track';
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
    announce('已切换音频轨道，可生成此轨道的频谱。');
  });
  trackField.append(label, select);
  const buttons = node('div', 'spectrogram-actions');
  const generateLabel = state.status === 'ready' ? '重新生成' : ['error', 'canceled'].includes(state.status) ? '重试生成' : '生成频谱';
  const generate = action(generateLabel, () => { void generateSpectrogram(entry); });
  generate.id = 'spectrogram-generate';
  generate.disabled = Boolean(spectrogramJob) || removing.has(entry.id);
  buttons.append(generate);
  if (state.status === 'loading') {
    const cancel = action(state.canceling ? '正在取消…' : '取消生成', () => { void cancelSpectrogram(entry); });
    cancel.id = 'spectrogram-cancel';
    // Keep the pending cancel control focusable until the task actually settles.
    cancel.setAttribute('aria-disabled', String(Boolean(state.canceling)));
    buttons.append(cancel);
  }
  controls.append(trackField, buttons);
  const busyOther = spectrogramJob && spectrogramJob.id !== entry.id;
  const busyName = busyOther ? entries.find(item => item.id === spectrogramJob!.id)?.name : undefined;
  const statusText = {
    idle: '尚未生成此音轨的频谱。', loading: state.canceling ? '正在取消生成，请稍候。' : '正在生成完整音轨频谱，长文件可能需要更长时间。',
    ready: '频谱已生成。', error: '未能生成频谱，可重试生成。', canceled: '频谱生成已取消，可重试生成。',
  }[state.status];
  const status = node('p', `spectrogram-status${state.status === 'error' ? ' error-text' : ''}`, busyOther ? `正在生成${busyName ? `「${busyName}」的` : '另一个文件的'}频谱；完成后可生成此音轨，也可切回该文件取消。` : statusText);
  status.id = 'spectrogram-status';
  const figure = node('figure', 'spectrogram-figure');
  const selected = streams.find(stream => stream.index === state.streamIndex);
  // Never show a completed image under a different track's selection.
  const result = state.status === 'ready' && state.result?.streamIndex === state.streamIndex ? state.result : undefined;
  const sampleRate = result?.sampleRateHz ?? streamValue(selected, 'audio.sampleRate');
  const duration = result?.durationSeconds ?? streamValue(selected, 'stream.duration');
  const frequencyAxis = node('div', 'spectrogram-frequency');
  frequencyAxis.setAttribute('aria-hidden', 'true');
  frequencyAxis.append(node('span', '', typeof sampleRate === 'number' ? `${plotNumbers.format(sampleRate / 2)} Hz` : '频率 Hz'), node('span', '', '0 Hz'));
  const frame = node('div', 'spectrogram-frame');
  frame.setAttribute('aria-busy', String(state.status === 'loading'));
  if (result) {
    const image = node('img', 'spectrogram-image'); image.id = 'spectrogram-image';
    image.src = result.imageDataUrl; image.width = result.width; image.height = result.height;
    image.alt = `${entry.name}，音频轨道 #${state.streamIndex} 的频谱；横轴为时间，纵轴为频率，颜色表示信号强度。`;
    image.setAttribute('aria-describedby', 'spectrogram-description');
    frame.append(image);
  } else {
    const placeholder = node('div', 'spectrogram-placeholder');
    if (state.status === 'loading') {
      const spinner = node('span', 'spinner'); spinner.setAttribute('aria-hidden', 'true'); placeholder.append(spinner);
    }
    placeholder.append(node('span', '', state.status === 'idle' ? '点击“生成频谱”查看此音轨' : statusText));
    frame.append(placeholder);
  }
  const timeAxis = node('div', 'spectrogram-time');
  timeAxis.setAttribute('aria-hidden', 'true');
  timeAxis.append(node('span', '', '0 s'), node('span', '', '时间（秒）'), node('span', '', typeof duration === 'number' ? `${plotNumbers.format(duration)} s` : '— s'));
  const description = node('figcaption', 'spectrogram-description'); description.id = 'spectrogram-description';
  const channels = result?.channels ?? streamValue(selected, 'audio.channels');
  const ranges = result ? `时间 0–${plotNumbers.format(result.durationSeconds)} s；频率 0–${plotNumbers.format(result.sampleRateHz / 2)} Hz，线性刻度。` : '横轴为时间（秒），纵轴为频率（Hz），均为线性刻度。';
  const channelNote = typeof channels === 'number' ? channels > 1 ? `${channels} 个声道合并显示。` : '单声道显示。' : '多个声道合并显示。';
  description.textContent = `${ranges}颜色表示信号强度，显示范围 −120 至 0 dBFS，暗为弱、亮为强。${channelNote}频谱不能单独用于判断源文件是否真无损。`;
  figure.append(frequencyAxis, frame, timeAxis, description);
  section.append(heading, controls, status);
  if (state.message) section.append(node('p', 'spectrogram-error', state.message));
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
    remove.setAttribute('aria-label', `从列表移除 ${entry.name}`);
    remove.disabled = removing.has(entry.id);
    row.append(select, remove);
    fragment.append(row);
  }
  list.replaceChildren(fragment);
  $('file-count').textContent = String(entries.length);
  const complete = entries.filter(entry => !['waiting', 'processing'].includes(entry.state)).length;
  $('list-summary').textContent = entries.length ? `${entries.length} 个文件 · ${complete} 个已处理` : '添加文件后开始解析';
  $('list-hint').hidden = entries.length > 0;
  $<HTMLButtonElement>('clear-files').disabled = !entries.length || removing.size > 0;
  const busy = entries.filter(entry => entry.state === 'processing' || entry.state === 'waiting').length;
  $('session-status').textContent = busy ? `${busy} 个文件待完成` : entries.length ? '本次解析已完成' : '准备就绪';
}

function parameterTable(title: string, fields: MetadataField[], id: string): HTMLElement {
  const section = node('section');
  const heading = node('div', 'section-heading');
  heading.append(node('h4', '', title), node('span', '', `${fields.length} 项参数`));
  const wrapper = node('div', 'table-scroll');
  wrapper.id = id;
  wrapper.tabIndex = 0;
  wrapper.setAttribute('aria-label', `${title}，可滚动查看`);
  const table = node('table', 'metadata-table');
  const caption = node('caption', 'sr-only', title);
  const head = node('thead');
  const headRow = node('tr');
  for (const label of ['参数', '值', '来源']) {
    const cell = node('th', label === '来源' ? 'field-source' : '', label); cell.scope = 'col'; headRow.append(cell);
  }
  head.append(headRow);
  const body = node('tbody');
  for (const field of fields) {
    const row = node('tr');
    const label = node('th', '', field.label); label.scope = 'row';
    const value = node('td', field.status === 'present' ? 'field-value' : 'unavailable', formatField(field));
    if (field.note) value.append(node('span', 'field-note', field.note));
    const source = node('td', 'field-source', field.source);
    row.append(label, value, source);
    body.append(row);
  }
  table.append(caption, head, body); wrapper.append(table); section.append(heading, wrapper);
  return section;
}

function renderDetail(): void {
  const container = $('detail-content');
  const entry = entries.find(item => item.id === activeId);
  const spectrum = spectrogramState(entry);
  const next = { id: entry?.id, state: entry?.state, result: entry?.result, message: entry?.message,
    picking: entry ? false : picking, spectrogram: spectrum, spectrogramBusyId: spectrum ? spectrogramJob?.id : undefined };
  // Background results must not replace the active file's DOM or steal its focus/scroll.
  if (renderedDetail && Object.keys(next).every(key =>
    next[key as keyof typeof next] === renderedDetail![key as keyof typeof next])) return;
  const sameFile = renderedDetail?.id === entry?.id;
  const locationOpen = sameFile && (document.getElementById('file-location') as HTMLDetailsElement | null)?.open;
  const offsets = sameFile ? Array.from(container.querySelectorAll<HTMLElement>('.table-scroll')).map(element =>
    ({ id: element.id, left: element.scrollLeft, top: element.scrollTop })) : [];
  renderedDetail = next;
  if (!entry) {
    const empty = node('div', 'empty-state');
    const symbol = node('div', 'drop-symbol', '↓'); symbol.setAttribute('aria-hidden', 'true');
    const add = action('选择本地文件', () => { void chooseFiles(); }, 'button primary');
    add.id = 'empty-add'; add.disabled = !bridge || picking;
    empty.append(symbol, node('h3', '', '把文件拖到这里'), node('p', '', '查看文件的编码、尺寸、时长和文档属性，也可以添加多个文件进行对比。'), add,
      node('p', 'format-list', 'AUDIO / VIDEO / IMAGE / OFFICE'));
    container.replaceChildren(empty);
    return;
  }
  const detail = node('div', 'file-detail');
  const heading = node('div', 'detail-heading');
  const identity = node('div');
  const title = node('h3', '', entry.name);
  const meta = node('div', 'detail-meta');
  meta.append(node('span', '', entry.result ? categoryLabel(entry.result.category) : '本地文件'), badge(entry));
  identity.append(title, meta); heading.append(identity);
  if (entry.state === 'partial' || entry.state === 'failed') {
    const retryButton = action('重新解析', () => { void retry(entry); }); retryButton.id = 'retry-file'; heading.append(retryButton);
  }
  detail.append(heading);
  const location = node('details', 'file-path');
  location.id = 'file-location'; location.open = Boolean(locationOpen);
  const summary = node('summary', '', '文件位置'); summary.id = 'file-location-summary';
  location.append(summary, node('p', '', entry.path));
  detail.append(location);
  if (entry.state === 'processing' || entry.state === 'waiting') {
    const pending = node('div', 'processing-block');
    const spinner = node('span', 'spinner'); spinner.setAttribute('aria-hidden', 'true');
    pending.append(spinner, node('span', '', entry.state === 'processing' ? '正在读取文件参数，仍可添加或切换文件。' : '等待前面的文件完成解析。'));
    detail.append(pending);
    detail.setAttribute('aria-busy', 'true');
  }
  const issues = entry.result?.issues ?? [];
  if (issues.length || entry.message) {
    const notice = node('div', `notice${entry.state === 'failed' ? ' error' : ''}`);
    notice.append(node('strong', '', entry.state === 'failed' ? '未能完成此文件的解析' : '部分信息需要留意'));
    if (entry.message) notice.append(node('p', '', entry.message));
    for (const issue of issues) notice.append(node('p', '', issue.message));
    if (issues.some(issue => issue.code.startsWith('TOOL_'))) notice.append(node('p', '', '请检查解析工具是否已安装，以及启动应用时的工具路径配置，然后重新解析。'));
    if (entry.state === 'failed') notice.append(node('p', '', '可以检查文件是否仍存在、能否读取，或添加另一个文件。'));
    detail.append(notice);
  }
  if (entry.result) {
    if (spectrum) detail.append(renderSpectrogram(entry, spectrum));
    else if (entry.result.category === 'video') detail.append(node('p', 'spectrogram-unavailable', '未读取到可用音轨，无法生成频谱；仍可查看视频参数。'));
    const file = entry.result.fields.filter(field => field.key.startsWith('file.'));
    const specialized = entry.result.fields.filter(field => !field.key.startsWith('file.'));
    if (file.length) detail.append(parameterTable('基础信息', file, 'base-info-table'));
    if (specialized.length) detail.append(parameterTable('文件参数', specialized, 'file-parameters-table'));
    for (const stream of entry.result.streams) {
      const type = ({ video: '视频轨道', audio: '音频轨道', subtitle: '字幕轨道' } as Record<string, string>)[stream.type] ?? '其他轨道';
      detail.append(parameterTable(`${type} #${stream.index}`, stream.fields, `stream-table-${stream.index}`));
    }
  }
  container.replaceChildren(detail);
  for (const offset of offsets) {
    const element = document.getElementById(offset.id);
    if (element) { element.scrollLeft = offset.left; element.scrollTop = offset.top; }
  }
}

function renderComparison(): void {
  const previousScroll = document.getElementById('comparison-scroll');
  const offset = { left: previousScroll?.scrollLeft ?? 0, top: previousScroll?.scrollTop ?? 0 };
  const detail = node('div', 'compare-detail');
  detail.append(node('h3', '', `${entries.length} 个文件的参数对比`), node('p', 'compare-description', '比较当前列表中的文件。未记录与不适用分别标注，完整参数可在文件详情中查看。'));
  const wrapper = node('div', 'table-scroll'); wrapper.tabIndex = 0;
  wrapper.id = 'comparison-scroll';
  wrapper.setAttribute('aria-label', '文件参数对比，可横向滚动');
  const table = node('table', 'compare-table');
  table.style.width = `${160 + entries.length * 190}px`;
  table.append(node('caption', 'sr-only', '当前列表的文件参数对比'));
  const head = node('thead'); const header = node('tr');
  const corner = node('th', '', '参数'); corner.scope = 'col'; header.append(corner);
  for (const entry of entries) {
    const cell = node('th', '', entry.name); cell.scope = 'col'; cell.append(node('span', 'field-note', stateLabel(entry.state))); header.append(cell);
  }
  head.append(header);
  const body = node('tbody');
  for (const row of buildComparison(entries).rows) {
    const tr = node('tr'); const th = node('th', '', row.label); th.scope = 'row'; tr.append(th);
    for (const value of row.values) tr.append(node('td', 'field-value', value));
    body.append(tr);
  }
  table.append(head, body); wrapper.append(table); detail.append(wrapper);
  $('compare-content').replaceChildren(detail);
  wrapper.scrollLeft = offset.left; wrapper.scrollTop = offset.top;
}

function render(): void {
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
  $('view-hint').textContent = entries.length < 2 ? '添加多个文件可进行对比' : '当前列表可切换对比';
  const active = entries.find(item => item.id === activeId);
  document.title = active ? `${active.name} · File Analyzer` : 'File Analyzer · 文件参数';
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
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (entries.length < 2) return;
    view = event.key === 'Home' ? 'detail' : event.key === 'End' ? 'compare' : view === 'detail' ? 'compare' : 'detail';
    render(); $(`${view}-tab`).focus();
  });
}

let dragDepth = 0;
document.addEventListener('dragenter', event => {
  event.preventDefault();
  if (event.dataTransfer?.types.includes('Files')) { dragDepth++; $('drag-overlay').hidden = false; }
});
document.addEventListener('dragover', event => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; });
document.addEventListener('dragleave', event => { event.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; $('drag-overlay').hidden = true; } });
document.addEventListener('drop', event => {
  event.preventDefault(); dragDepth = 0; $('drag-overlay').hidden = true;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (!files.length || !bridge) return;
  void bridge.importFiles(files).then(addFiles).catch(report);
});
window.addEventListener('blur', () => { dragDepth = 0; $('drag-overlay').hidden = true; });
window.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); void chooseFiles(); }
});
const unsubscribe = bridge?.onEvent(receive);
window.addEventListener('beforeunload', () => unsubscribe?.(), { once: true });
if (!bridge) {
  $('app-error').textContent = '桌面连接未就绪，请重新启动应用。'; $('app-error').hidden = false;
}
render();
