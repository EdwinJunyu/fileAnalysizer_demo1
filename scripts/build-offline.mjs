import { spawn } from 'node:child_process';
import { appendFile, copyFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { projectRoot, targetFromArguments } from './packaging/tools.mjs';
import { writeReleaseReport } from './packaging/release-report.mjs';

// Developers run this command online. Everything needed at runtime is bundled.
const args = process.argv.slice(2);
if (args.some(argument => argument !== '--development-linux')) {
  throw new Error('Usage: npm run package:offline [-- --development-linux]');
}
const target = targetFromArguments(args);
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this build with npm run package:offline.');

async function run(executable, arguments_, stage = arguments_[0]) {
  console.log(`Offline package stage: ${stage}`);
  await new Promise((resolve, reject) => {
    let tail = '';
    const child = spawn(executable, arguments_, { cwd: projectRoot, stdio: ['inherit', 'pipe', 'pipe'], env: process.env });
    for (const [source, destination] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
      source.on('data', chunk => {
        destination.write(chunk);
        tail = (tail + chunk.toString()).slice(-12_000);
      });
    }
    const fail = error => {
      if (process.env.GITHUB_ACTIONS === 'true') {
        const message = `${stage}: ${error.message}\n${tail}`.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
        console.error(`::error title=Offline package build::${message}`);
      }
      reject(error);
    };
    child.once('error', fail);
    // close waits for all captured output, including the last compiler/test error.
    child.once('close', (code, signal) => code === 0 ? resolve() : fail(
      new Error(`Offline package build stopped: ${stage} (${signal ?? code}).`),
    ));
  });
}

const npm = (...arguments_) => run(process.execPath, [npmCli, ...arguments_], `npm ${arguments_.join(' ')}`);
const script = (name, ...arguments_) => run(process.execPath, [join(projectRoot, 'scripts', name), ...arguments_], name);
const nativeFlags = target.platform === 'linux' ? ['--development-linux'] : [];

await npm('run', 'test:packaging');
await script('prepare-tools.mjs', ...nativeFlags);
await npm('run', 'build');
await script('package-app.mjs', '--dir', ...nativeFlags);
await script('smoke-package.mjs', ...nativeFlags);

if (target.platform === 'linux') {
  console.log('Development Linux directory passed offline smoke tests. Windows/macOS installers require their native build hosts.');
} else {
  await script('package-app.mjs');
  const { version } = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'));
  const filename = target.platform === 'win32'
    ? `File-Analyzer-${version}-win-${target.arch}.exe`
    : `File-Analyzer-${version}-mac-${target.arch}.dmg`;
  const artifact = join(projectRoot, 'release', filename);
  let installedSmoke = 'not-recorded';
  if (target.platform === 'win32') {
    // Allow this repository-owned check in the child process without changing machine policy.
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File',
      join(projectRoot, 'scripts', 'test-windows-installer.ps1'),
      '-Installer', artifact, '-NodeExecutable', process.execPath]);
    installedSmoke = 'passed';
    await copyFile(join(projectRoot, 'docs', 'WINDOWS_OFFLINE_README.txt'),
      join(projectRoot, 'release', 'README.zh-CN.txt'));
  }
  const report = await writeReleaseReport({ projectDirectory: projectRoot, platform: target.platform, arch: target.arch,
    artifacts: [artifact], validation: { smoke: 'passed', installedSmoke } });
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, [
      '## Complete offline package', '',
      ...report.artifacts.map(item => `- ${item.file}: **${item.decimalMB} MB**, SHA-256: \`${item.sha256}\``),
      `- Unpacked application: ${report.unpacked.decimalMB} MB`,
      `- Offline application smoke: ${report.validation.smoke}`,
      `- Installed application smoke: ${report.validation.installedSmoke}`, '',
    ].join('\n'));
  }
  console.log(`Complete offline package: ${artifact}`);
}
