import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build, Platform, Arch } from 'electron-builder';
import { inventory, projectRoot, targetFromArguments, verifyTools } from './packaging/tools.mjs';
import { collectRuntimeLicenses } from './packaging/licenses.mjs';

const target = targetFromArguments();
const tools = join(projectRoot, '.tools', 'packaging', `${target.platform}-${target.arch}`, 'tools');
await verifyTools(tools, target);
const temporaryNotices = await mkdtemp(join(tools, '..', 'javascript-notices-'));
try {
  await collectRuntimeLicenses(projectRoot, temporaryNotices);
  await rm(join(tools, 'licenses', 'javascript'), { recursive: true, force: true });
  await cp(temporaryNotices, join(tools, 'licenses', 'javascript'), { recursive: true });
} finally { await rm(temporaryNotices, { recursive: true, force: true }); }
const manifest = JSON.parse(await readFile(join(tools, 'manifest.json'), 'utf8'));
manifest.files = await inventory(tools);
await writeFile(join(tools, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await verifyTools(tools, target);

process.env.FILE_ANALYZER_PACKAGING_TOOLS = tools;
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
const { default: config } = await import('../electron-builder.config.cjs');
const platform = target.platform === 'win32' ? Platform.WINDOWS : target.platform === 'darwin' ? Platform.MAC : Platform.LINUX;
const arch = target.arch === 'arm64' ? Arch.arm64 : Arch.x64;
const format = process.argv.includes('--dir') || target.platform === 'linux' ? 'dir' : target.platform === 'win32' ? 'nsis' : 'dmg';
await build({ targets: platform.createTarget(format, arch), config, publish: 'never' });
