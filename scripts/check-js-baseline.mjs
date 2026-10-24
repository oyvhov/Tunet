// TypeScript migration guard: new source files in src/ must be .ts/.tsx.
// scripts/js-baseline.txt lists the JavaScript files that still exist; remove
// a line when its file is converted. Run with --update to rewrite the list.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const baselinePath = path.join(root, 'scripts', 'js-baseline.txt');
const JS_FILE = /\.(js|jsx)$/;

async function listJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      files.push(...(await listJsFiles(fullPath)));
    } else if (JS_FILE.test(entry.name)) {
      files.push(path.relative(root, fullPath).replace(/\\/g, '/'));
    }
  }
  return files;
}

const current = (await listJsFiles(srcDir)).sort();

if (process.argv.includes('--update')) {
  await writeFile(baselinePath, `${current.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${current.length} files to scripts/js-baseline.txt.`);
  process.exit(0);
}

const baseline = new Set(
  (await readFile(baselinePath, 'utf8'))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
);

const added = current.filter((file) => !baseline.has(file));
const removed = [...baseline].filter((file) => !current.includes(file));

if (added.length) {
  console.error('New JavaScript files in src/ must be written in TypeScript (.ts/.tsx):');
  added.forEach((file) => console.error(`  - ${file}`));
}
if (removed.length) {
  console.error('These files are no longer JavaScript; remove them from scripts/js-baseline.txt:');
  removed.forEach((file) => console.error(`  - ${file}`));
}
if (added.length || removed.length) process.exit(1);

console.log(`JS baseline check passed (${current.length} JavaScript files left in src/).`);
