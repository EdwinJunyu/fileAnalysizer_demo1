import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { analyzeFile, analyzeFiles } from '../src/index.js';
import { runTool } from '../src/tools.js';
import type { AnalysisResult, MetadataField } from '../src/types.js';
import { createFixtures } from './fixtures.js';

const exec = promisify(execFile);
let fixtures: Awaited<ReturnType<typeof createFixtures>>;
const get = (result: AnalysisResult, key: string): MetadataField => {
  const match = [...result.fields, ...result.streams.flatMap(stream => stream.fields)].find(item => item.key === key);
  assert.ok(match, `缺少字段 ${key}`);
  return match;
};

before(async () => {
  // Integration tests deliberately require real tools rather than silently skipping them.
  await runTool('ffprobe', ['-version']);
  await runTool('exiftool', ['-ver']);
  fixtures = await createFixtures();
});
after(async () => { await fixtures?.cleanup(); });

test('18种首批格式均由实际内容识别并成功提取参数', async t => {
  for (const [category, formats] of [
    ['audio', ['wav', 'mp3', 'flac', 'aac', 'm4a', 'ogg']],
    ['video', ['mp4', 'mkv', 'mov', 'webm']],
    ['image', ['jpeg', 'png', 'webp', 'tiff', 'gif']],
    ['office', ['docx', 'xlsx', 'pptx']],
  ] as const) {
    for (const format of formats) {
      await t.test(format, async () => {
        const result = await analyzeFile(fixtures.files[format]!);
        assert.equal(result.category, category);
        assert.equal(result.status, 'ok', JSON.stringify(result.issues));
        assert.equal(result.detectedType.source, 'signature');
        assert.ok(Number(get(result, 'file.sizeBytes').value) > 0);
        assert.ok(Object.keys(result.rawMetadata ?? {}).length > 0);
        if (category === 'audio' || category === 'video') {
          const duration = get(result, 'media.duration');
          assert.equal(duration.unit, 's');
          assert.ok(Number(duration.value) > 0.3 && Number(duration.value) < 0.7);
        }
        if (category === 'image') {
          assert.equal(get(result, 'image.width').value, 80);
          assert.equal(get(result, 'image.height').value, 60);
          assert.equal(get(result, 'image.width').unit, 'px');
        }
        if (category === 'office') assert.equal(get(result, 'office.creator').value, 'Fixture Generator');
      });
    }
  }
});

test('编码无损属性、轨道码率和采样格式正确分开', async () => {
  const [wav, flac, mp3] = await analyzeFiles(['wav', 'flac', 'mp3'].map(key => fixtures.files[key]!));
  assert.equal(get(wav!, 'audio.losslessEncoding').value, true);
  assert.equal(get(flac!, 'audio.losslessEncoding').value, true);
  assert.equal(get(mp3!, 'audio.losslessEncoding').value, false);
  assert.equal(get(wav!, 'audio.bitDepth').value, 16);
  assert.equal(get(wav!, 'audio.sampleRate').value, 48000);
  assert.equal(get(wav!, 'audio.channels').value, 2);
  assert.equal(get(mp3!, 'stream.bitRate').value, 128000);
  assert.equal(get(mp3!, 'stream.bitRate').unit, 'bit/s');
  assert.equal(get(mp3!, 'audio.bitDepth').status, 'not_applicable');
  assert.equal(get(mp3!, 'audio.bitDepth').value, null);
});

test('视频包含独立的视频和音频轨道', async () => {
  const result = await analyzeFile(fixtures.files.mp4!);
  assert.equal(get(result, 'video.width').value, 160);
  assert.equal(get(result, 'video.height').value, 90);
  assert.equal(get(result, 'video.frameRate').value, 10);
  assert.ok(result.streams.some(stream => stream.type === 'video'));
  assert.ok(result.streams.some(stream => stream.type === 'audio'));
  assert.equal(get(result, 'media.bitRate').source, 'ffprobe.format');
});

test('G.711压扩WAV不会被误报为无损线性PCM', async () => {
  for (const codec of ['pcm_mulaw', 'pcm_alaw']) {
    const path = join(fixtures.dir, `${codec}.wav`);
    await exec(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-v', 'error', '-i', fixtures.files.wav!, '-c:a', codec, '-y', path]);
    const result = await analyzeFile(path);
    assert.equal(result.status, 'ok');
    assert.equal(get(result, 'audio.losslessEncoding').value, false);
    assert.equal(get(result, 'audio.bitDepth').status, 'not_applicable');
  }
});

test('JPEG及PNG的物理分辨率正确换算成DPI', async () => {
  const [jpeg, png] = await analyzeFiles([fixtures.files.jpeg!, fixtures.files.png!]);
  assert.equal(get(jpeg!, 'image.dpiX').value, 300);
  assert.ok(Math.abs(Number(get(png!, 'image.dpiX').value) - 300) < 0.01);
  assert.equal(get(png!, 'image.dpiX').unit, 'dpi');
  const gif = await analyzeFile(fixtures.files.gif!);
  assert.equal(get(gif, 'image.dpiX').status, 'missing');
  assert.equal(get(gif, 'image.dpiX').value, null);
});

test('Office统计带来源，工作表和幻灯片数量来自实际结构', async () => {
  const [docx, xlsx, pptx] = await analyzeFiles(['docx', 'xlsx', 'pptx'].map(key => fixtures.files[key]!));
  assert.equal(get(docx!, 'office.pageCount').value, 1);
  assert.equal(get(docx!, 'office.wordCount').value, 3);
  assert.match(get(docx!, 'office.pageCount').note!, /保存|过时/);
  assert.equal(get(xlsx!, 'office.sheetCount').value, 2);
  assert.match(get(xlsx!, 'office.sheetCount').source, /workbook.xml/);
  assert.equal(get(pptx!, 'office.slideCount').value, 2);
  assert.match(get(pptx!, 'office.slideCount').source, /presentation.xml/);
  assert.equal(get(docx!, 'office.sheetCount').status, 'not_applicable');
  assert.notEqual(get(docx!, 'office.createdAt').source, 'filesystem');
});

test('未知格式和空文件仍返回准确基础信息', async () => {
  const [unknown, empty] = await analyzeFiles([fixtures.files.unknown!, fixtures.files.empty!]);
  assert.equal(unknown!.category, 'other');
  assert.equal(unknown!.status, 'ok');
  assert.equal(get(unknown!, 'file.mimeType').status, 'unknown');
  assert.equal(get(unknown!, 'file.analysisLevel').value, '基础文件信息');
  assert.equal(get(empty!, 'file.sizeBytes').value, 0);
  assert.equal(get(empty!, 'file.sizeBytes').status, 'present');
});

test('扩展名错误时按内容解析并提示', async () => {
  const result = await analyzeFile(fixtures.files.mismatched!);
  assert.equal(result.category, 'image');
  assert.equal(result.detectedType.ext, 'png');
  assert.equal(get(result, 'image.width').value, 80);
  assert.ok(result.issues.some(issue => issue.code === 'EXTENSION_MISMATCH'));
});

test('Opus-in-Ogg与APNG使用常见容器扩展名不误报', async () => {
  const ogg = join(fixtures.dir, 'opus-audio.ogg');
  await exec(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-v', 'error', '-i', fixtures.files.wav!, '-c:a', 'libopus', '-y', ogg]);
  const png = join(fixtures.dir, 'animated.png');
  await exec(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i',
    'testsrc=size=16x16:rate=2:duration=1', '-threads', '1', '-plays', '0', '-f', 'apng', '-y', png]);
  const results = await analyzeFiles([ogg, png]);
  for (const result of results) {
    assert.equal(result.status, 'ok', JSON.stringify(result.issues));
    assert.ok(!result.issues.some(issue => issue.code === 'EXTENSION_MISMATCH'));
  }
});

test('媒体内容引用网络地址时不会发出HTTP请求', async () => {
  let requests = 0;
  const server = createServer((_request, response) => { requests++; response.end('not media'); });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const path = join(fixtures.dir, 'network-reference.wav');
    await writeFile(path, `ffconcat version 1.0\nfile 'http://127.0.0.1:${address.port}/audio.wav'\n`);
    const result = await analyzeFile(path);
    assert.equal(result.status, 'partial');
    assert.ok(result.issues.some(issue => issue.code === 'TOOL_FAILED'));
    assert.equal(requests, 0);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('损坏文件返回部分成功与明确错误，并保留基础信息', async () => {
  for (const key of ['corrupt', 'corruptVideo']) {
    const result = await analyzeFile(fixtures.files[key]!);
    assert.equal(result.status, 'partial');
    assert.ok(result.issues.length > 0);
    assert.ok(Number(get(result, 'file.sizeBytes').value) > 0);
  }
});

test('头部有效但媒体数据截断的MP4保留参数并报告部分成功', async () => {
  const original = join(fixtures.dir, 'faststart.mp4');
  const truncated = join(fixtures.dir, 'truncated.mp4');
  await exec(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i',
    'testsrc2=size=160x90:rate=10:duration=2', '-c:v', 'libx264', '-preset', 'ultrafast',
    '-movflags', '+faststart', '-threads', '1', '-y', original]);
  const originalResult = await analyzeFile(original);
  assert.equal(originalResult.status, 'ok');
  const bytes = await readFile(original);
  const mediaData = bytes.indexOf(Buffer.from('mdat'));
  assert.ok(mediaData > 0 && mediaData + 20 < bytes.length);
  await writeFile(truncated, bytes.subarray(0, mediaData + 20));

  // FFprobe can exit successfully even when it reports damaged media data.
  const probe = await runTool('ffprobe', ['-v', 'error', '-show_error', '-show_format', '-show_streams',
    '-of', 'json', '-protocol_whitelist', 'file,pipe', '-i', truncated]);
  assert.ok(probe.stderr.trim());
  assert.ok(JSON.parse(probe.stdout).streams.length > 0);
  const result = await analyzeFile(truncated);
  assert.equal(result.status, 'partial');
  assert.equal(get(result, 'media.duration').value, 2);
  assert.equal(get(result, 'video.width').value, 160);
  assert.ok(result.issues.some(issue => issue.code === 'FFPROBE_DIAGNOSTIC' && issue.tool === 'ffprobe'));
  assert.ok(result.rawMetadata?.streams);

  const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
  await assert.rejects(exec(process.execPath, [cli, '--json', truncated]), (error: unknown) => {
    const failure = error as { code: number; stdout: string };
    assert.equal(failure.code, 1);
    assert.equal(JSON.parse(failure.stdout)[0].status, 'partial');
    return true;
  });
});

test('缺少工具时给出可操作提示，不丢失文件信息', async () => {
  const result = await analyzeFile(fixtures.files.wav!, { ffprobePath: join(fixtures.dir, 'missing-ffprobe') });
  assert.equal(result.status, 'partial');
  assert.ok(result.issues.some(issue => issue.code === 'TOOL_NOT_FOUND'));
  assert.equal(get(result, 'file.sizeBytes').status, 'present');
  assert.equal(get(result, 'analysis.details').status, 'error');
});

test('缺少ExifTool时Office仍能读取结构数量', async () => {
  const result = await analyzeFile(fixtures.files.xlsx!, { exiftoolPath: join(fixtures.dir, 'missing-exiftool') });
  assert.equal(result.status, 'partial');
  assert.ok(result.issues.some(issue => issue.code === 'TOOL_NOT_FOUND'));
  assert.equal(get(result, 'office.sheetCount').value, 2);
});

test('批量解析时不存在的文件或目录不影响后续文件', async () => {
  const results = await analyzeFiles([join(fixtures.dir, 'absent'), fixtures.dir, fixtures.files.wav!]);
  assert.equal(results[0]!.status, 'error');
  assert.equal(results[0]!.issues[0]!.code, 'FILE_NOT_FOUND');
  assert.equal(results[1]!.issues[0]!.code, 'NOT_A_FILE');
  assert.equal(results[2]!.status, 'ok');
});

test('空格、中文和shell字符文件名按原样传递给工具', async () => {
  const path = join(fixtures.dir, '中文 音频;$(unexpected).wav');
  await copyFile(fixtures.files.wav!, path);
  const result = await analyzeFile(path);
  assert.equal(result.status, 'ok');
  assert.equal(get(result, 'audio.sampleRate').value, 48000);
});

test('仅音频的MP4容器归类为audio', async () => {
  const path = join(fixtures.dir, 'audio-only.mp4');
  await exec(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-v', 'error', '-i', fixtures.files.wav!, '-c:a', 'aac', '-y', path]);
  const result = await analyzeFile(path);
  assert.equal(result.status, 'ok');
  assert.equal(result.category, 'audio');
});

test('CLI输出可读取JSON，且保留部分失败退出码', async () => {
  const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
  const success = await exec(process.execPath, [cli, '--json', fixtures.files.wav!]);
  const parsed = JSON.parse(success.stdout) as AnalysisResult[];
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]!.status, 'ok');
  await assert.rejects(exec(process.execPath, [cli, '--json', join(fixtures.dir, 'absent'), fixtures.files.wav!]),
    (error: unknown) => {
      const failure = error as { code: number; stdout: string };
      assert.equal(failure.code, 1);
      const results = JSON.parse(failure.stdout) as AnalysisResult[];
      assert.equal(results[0]!.status, 'error');
      assert.equal(results[1]!.status, 'ok');
      return true;
    });
});

test('CLI拒绝无效参数并能解析--后的文件名', async () => {
  const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
  for (const timeout of ['-1', '0', '0.5', '2147483648', 'Infinity', 'NaN']) {
    await assert.rejects(exec(process.execPath, [cli, '--timeout', timeout, fixtures.files.wav!]),
      (error: unknown) => (error as { code: number }).code === 2);
  }
  const path = join(fixtures.dir, '-filename.unknown');
  await writeFile(path, 'fixture');
  const result = await exec(process.execPath, [cli, '--json', '--', path]);
  assert.equal(JSON.parse(result.stdout)[0].status, 'ok');
});
