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

const openingTagEnd = (source: string, start: number) => {
  let depth = 0;
  let quote = '';
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (char === quote && source[i - 1] !== '\\') quote = '';
    } else if (char === '"' || ((char === "'" || char === '`') && depth > 0)) {
      quote = char;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
    } else if (char === '>' && depth === 0) {
      return i;
    }
  }
  return source.length;
};

const hasVisibleText = (body: string) => {
  const rest = body
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<[A-Za-z][^<>]*?\/>/gs, ' ')
    .replace(/<\/?[a-z][^<>]*>/gs, ' ');
  if (/\b(t|translate)\(|\{\s*[a-zA-Z_.]+\s*\}/.test(rest)) return true;
  return /[\p{L}\p{N}]/u.test(rest.replace(/\{[\s\S]*?\}/g, ''));
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

  it('names every icon-only button on cards and in the climate modal', () => {
    const files = [
      ...sourceFiles(path.join(SRC, 'components/cards')),
      path.join(SRC, 'modals/GenericClimateModal.jsx'),
    ];
    const unnamed: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/<button\b/g)) {
        const end = openingTagEnd(source, match.index);
        const attrs = source.slice(match.index, end);
        if (/aria-label(ledby)?=|\btitle=|\.\.\.[a-zA-Z]/.test(attrs)) continue;
        const body = source.slice(end + 1, source.indexOf('</button>', end));
        if (!hasVisibleText(body)) {
          const line = source.slice(0, match.index).split('\n').length;
          unnamed.push(`${path.relative(SRC, file)}:${line}`);
        }
      }
    }
    expect(unnamed).toEqual([]);
  });

  it('exposes hand-rolled toggles as switches', () => {
    const notSwitches: string[] = [];
    for (const name of ['modals/EditCardModal.jsx', 'modals/ConfigModal.jsx']) {
      const source = fs.readFileSync(path.join(SRC, name), 'utf8');
      for (const match of source.matchAll(/<button\b/g)) {
        const end = openingTagEnd(source, match.index);
        const body = source.slice(end + 1, source.indexOf('</button>', end));
        const isToggle = /rounded-full/.test(body) && /(left-|translate-x)/.test(body);
        if (!isToggle) continue;
        const attrs = source.slice(match.index, end);
        if (!/role="switch"/.test(attrs) || !/aria-checked=/.test(attrs)) {
          notSwitches.push(`${name}:${source.slice(0, match.index).split('\n').length}`);
        }
      }
    }
    expect(notSwitches).toEqual([]);
  });
});
