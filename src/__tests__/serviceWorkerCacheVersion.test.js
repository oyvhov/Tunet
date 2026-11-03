import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { versionServiceWorker } from '../../vite.config.js';

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

describe('version-service-worker build plugin', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'tunet-sw-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const build = (outDir, swSource) => {
    mkdirSync(join(root, outDir));
    writeFileSync(join(root, outDir, 'sw.js'), swSource);
    const plugin = versionServiceWorker('9.9.9');
    plugin.configResolved({ root, build: { outDir } });
    plugin.closeBundle();
    return readFileSync(join(root, outDir, 'sw.js'), 'utf-8');
  };

  it('writes the version into the sw.js of the configured outDir', () => {
    const built = build('custom-out', source);
    expect(built).toContain("const CACHE_VERSION = '9.9.9'");
    expect(built).not.toContain('__APP_VERSION__');
  });

  it('fails the build when the output has no placeholder left to replace', () => {
    expect(() => build('dist', "const CACHE_VERSION = '1.0.0';")).toThrow(/__APP_VERSION__/);
  });
});
