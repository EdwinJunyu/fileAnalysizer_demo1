import { access, copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, parse } from 'node:path';
import { sha256 } from './tools.mjs';

const provenance = JSON.parse(await readFile(new URL('./notices/provenance.json', import.meta.url), 'utf8'));

async function dependencyDirectory(name, from) {
  let folder = from;
  while (true) {
    const candidate = join(folder, 'node_modules', name);
    try { await access(join(candidate, 'package.json')); return candidate; } catch {}
    if (folder === parse(folder).root) throw new Error(`Missing installed production dependency: ${name}`);
    folder = dirname(folder);
  }
}

/** Preserve version-specific license texts for the complete production dependency graph. */
export async function collectRuntimeLicenses(root, output) {
  const app = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const visited = new Set();
  const packages = [];
  async function visit(name, from) {
    const directory = await dependencyDirectory(name, from);
    if (visited.has(directory)) return;
    visited.add(directory);
    const pkg = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    const destination = join(output, `${pkg.name.replaceAll('/', '__')}@${pkg.version}`);
    await mkdir(destination, { recursive: true });
    const listing = await readdir(directory);
    const notices = listing.filter(file => /^(?:licen[cs]e|copying|notice|copyright)(?:[.-]|$)/i.test(file));
    // Some packages put their complete license (including copyright) in README.
    if (!notices.length) for (const file of listing.filter(file => /^readme(?:[.-]|$)/i.test(file))) {
      const content = await readFile(join(directory, file), 'utf8');
      if (/Copyright\s+(?:\(c\)|©)/i.test(content)
        && /Permission is hereby granted, free of charge/.test(content)
        && /copyright notice and this permission notice shall be included/i.test(content)
        && /THE SOFTWARE IS PROVIDED ["']AS IS["']/.test(content)) notices.push(file);
    }
    for (const file of notices) await copyFile(join(directory, file), join(destination, file));
    let supplementalLicense;
    if (!notices.length) {
      supplementalLicense = provenance[`${pkg.name}@${pkg.version}`];
      if (!supplementalLicense) throw new Error(`No license text found for ${pkg.name}@${pkg.version}; review it before distributing.`);
      const vendored = new URL(`./notices/${supplementalLicense.file}`, import.meta.url);
      if (await sha256(vendored) !== supplementalLicense.sha256) throw new Error(`Supplemental license checksum mismatch: ${pkg.name}`);
      await copyFile(vendored, join(destination, 'LICENSE.upstream'));
      notices.push('LICENSE.upstream');
    }
    packages.push({ name: pkg.name, version: pkg.version, license: pkg.license, repository: pkg.repository, notices, supplementalLicense });
    for (const dependency of Object.keys(pkg.dependencies ?? {})) await visit(dependency, directory);
  }
  for (const name of Object.keys(app.dependencies ?? {})) await visit(name, root);
  await writeFile(join(output, 'dependencies.json'), JSON.stringify(packages.sort((a, b) => a.name.localeCompare(b.name)), null, 2) + '\n');
  return packages;
}
