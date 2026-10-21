import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execute, projectRoot, targetFromArguments } from './packaging/tools.mjs';
import { verifyElectronRuntime } from './packaging/electron.mjs';

process.on('uncaughtExceptionMonitor', error => {
  if (process.env.GITHUB_ACTIONS === 'true') {
    const message = error.message.slice(-12_000).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    console.error(`::error title=Electron runtime preparation::${message}`);
  }
});

const target = targetFromArguments();
const directory = join(projectRoot, 'node_modules', 'electron');
const { devDependencies } = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'));
const pkg = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
if (pkg.version !== devDependencies.electron) throw new Error('Installed Electron differs from the pinned version; run npm ci.');

// Electron 44 exposes install-electron instead of downloading through npm postinstall.
// Use its checksum-verified installer for this native target, preserving proxy/cache configuration.
const env = { ...process.env, ELECTRON_INSTALL_PLATFORM: target.platform, ELECTRON_INSTALL_ARCH: target.arch };
delete env.ELECTRON_OVERRIDE_DIST_PATH;
delete env.electron_use_remote_checksums;
delete env.npm_config_electron_use_remote_checksums;
await execute(process.execPath, [join(directory, 'install.js')], {
  cwd: projectRoot, env, timeout: 300_000, windowsHide: true, maxBuffer: 4 * 1024 * 1024,
});
const runtime = await verifyElectronRuntime(directory, target, devDependencies.electron);
console.log(`Verified Electron ${runtime.version} native runtime: ${target.platform}-${target.arch}`);
