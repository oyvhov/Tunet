import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(__dirname, '..');

const sourceFiles = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(jsx|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
};

describe('accessible names in source', () => {
  it('passes a translated ariaLabel to every M3Slider', () => {
    const missing: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/<M3Slider\b[\s\S]*?\/>/g)) {
        if (!/ariaLabel=/.test(match[0])) {
          const line = source.slice(0, match.index).split('\n').length;
          missing.push(`${path.relative(SRC, file)}:${line}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
