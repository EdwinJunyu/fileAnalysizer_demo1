import { readFile, mkdir, copyFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { build } from 'esbuild';

const source = await readFile(new URL('../DESIGN.md', import.meta.url), 'utf8');
const header = source.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/);
if (!header) throw new Error('DESIGN.md must contain token frontmatter');
const tokens = parse(header[1]);
const lines = [];
for (const [name, value] of Object.entries(tokens.colors)) lines.push(`  --color-${name}: ${value};`);
for (const [name, value] of Object.entries(tokens.typography)) {
  lines.push(`  --font-${name}: ${value.fontFamily};`, `  --text-${name}: ${value.fontSize};`, `  --leading-${name}: ${value.lineHeight};`);
}
for (const [name, value] of Object.entries(tokens.rounded)) lines.push(`  --radius-${name}: ${value};`);
for (const [name, value] of Object.entries(tokens.spacing)) lines.push(`  --space-${name}: ${value};`);
for (const [name, values] of Object.entries(tokens.components)) {
  for (const [property, value] of Object.entries(values)) lines.push(`  --component-${name}-${property}: ${value};`);
}
const css = `/* Generated from DESIGN.md by scripts/build-ui.mjs. */\n:root {\n${lines.join('\n')}\n}\n`;
const directory = new URL('../dist/ui/', import.meta.url);
if (process.argv.includes('--check')) {
  if (await readFile(new URL('tokens.css', directory), 'utf8') !== css) throw new Error('Design tokens are out of date; run npm run build.');
  console.log('DESIGN.md tokens match runtime CSS.');
} else {
  await mkdir(directory, { recursive: true });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(new URL('tokens.css', directory), css);
  for (const name of ['index.html', 'styles.css']) await copyFile(new URL(`../src/ui/${name}`, import.meta.url), new URL(name, directory));
  await build({ entryPoints: ['src/ui/app.ts'], bundle: true, format: 'esm', platform: 'browser', target: 'es2022', outfile: 'dist/ui/app.js' });
}
