import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf-8');

describe('service worker cache versioning', () => {
  it('derives the shell cache name from the build-time version placeholder', () => {
    expect(source).toContain("const CACHE_VERSION = '__APP_VERSION__'");
    expect(source).toContain('const SHELL_CACHE_NAME = `tunet-shell-${CACHE_VERSION}`');
  });

  it('does not hardcode a shell cache name', () => {
    expect(source).not.toMatch(/tunet-shell-v\d/);
  });
});
