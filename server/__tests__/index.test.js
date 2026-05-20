// @vitest-environment node

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../index.js';

const openServers = [];
const tempDirs = [];

const closeServer = async (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const createDistFixture = () => {
  const distPath = mkdtempSync(join(tmpdir(), 'tunet-server-dist-'));
  mkdirSync(join(distPath, 'assets'));
  writeFileSync(
    join(distPath, 'index.html'),
    '<!doctype html><html><head><title>Tunet Test</title></head><body><div id="root"></div></body></html>',
    'utf8'
  );
  tempDirs.push(distPath);
  return distPath;
};

const startHarness = async (app) => {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  openServers.push(server);

  return {
    async request(path) {
      const address = server.address();
      return fetch(`http://127.0.0.1:${address.port}${path}`);
    },
  };
};

afterEach(async () => {
  while (openServers.length > 0) {
    await closeServer(openServers.pop());
  }

  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('createApp SPA fallback', () => {
  it('serves the SPA shell for the production root path', async () => {
    const harness = await startHarness(
      createApp({
        appVersion: 'test-version',
        distPath: createDistFixture(),
        isProduction: true,
      })
    );

    const response = await harness.request('/');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    await expect(response.text()).resolves.toContain('<title>Tunet Test</title>');
  });

  it('does not rewrite missing API routes to the SPA shell', async () => {
    const harness = await startHarness(
      createApp({
        appVersion: 'test-version',
        distPath: createDistFixture(),
        isProduction: true,
      })
    );

    const response = await harness.request('/api/does-not-exist');

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.not.toContain('Tunet Test');
  });
});