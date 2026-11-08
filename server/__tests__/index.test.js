// @vitest-environment node

import Database from 'better-sqlite3';
import { EventEmitter } from 'events';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { createServer } from 'http';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, installShutdownHandlers } from '../index.js';

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

  it.each(['js', 'css'])(
    'answers a missing hashed %s asset with a plain 404, not the newest build',
    async (ext) => {
      const distPath = createDistFixture();
      writeFileSync(join(distPath, 'assets', `index-NEWHASH.${ext}`), 'new', 'utf8');
      const harness = await startHarness(
        createApp({ appVersion: 'test-version', distPath, isProduction: true })
      );

      const stale = await harness.request(`/assets/index-OLDHASH.${ext}`);

      expect(stale.status).toBe(404);
      expect(stale.headers.get('x-tunet-asset-fallback')).toBeNull();
      expect(stale.headers.get('cache-control') ?? '').not.toContain('immutable');
      await expect(stale.text()).resolves.not.toBe('new');

      const current = await harness.request(`/assets/index-NEWHASH.${ext}`);

      expect(current.status).toBe(200);
      expect(current.headers.get('cache-control')).toContain('immutable');
    }
  );
});

describe('/api/health', () => {
  it('reports ok when SQLite answers', async () => {
    const database = new Database(':memory:');
    const harness = await startHarness(createApp({ appVersion: 'test-version', database }));

    const response = await harness.request('/api/health');
    database.close();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok', version: 'test-version' });
  });

  it('returns 503 when SQLite fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const database = new Database(':memory:');
    database.close();
    const harness = await startHarness(createApp({ appVersion: 'test-version', database }));

    const response = await harness.request('/api/health');
    const logged = errorSpy.mock.calls.length;
    errorSpy.mockRestore();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: 'error', version: 'test-version' });
    expect(logged).toBe(1);
  });
});

describe('installShutdownHandlers', () => {
  const listen = async (handler = (_req, res) => res.end('ok')) => {
    const server = createServer(handler);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    return server;
  };

  const install = (server, overrides = {}) => {
    const signalSource = new EventEmitter();
    const database = { close: vi.fn() };
    const stopBackups = vi.fn();
    const exit = vi.fn();
    installShutdownHandlers({ server, database, stopBackups, exit, signalSource, ...overrides });
    return { signalSource, database, stopBackups, exit };
  };

  it.each(['SIGTERM', 'SIGINT'])(
    'closes the HTTP server and the database on %s, then exits 0',
    async (signal) => {
      const server = await listen();
      const { signalSource, database, stopBackups, exit } = install(server);

      signalSource.emit(signal);
      await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));

      expect(server.listening).toBe(false);
      expect(database.close).toHaveBeenCalledOnce();
      expect(stopBackups).toHaveBeenCalledOnce();
    }
  );

  it('closes the database only after in-flight requests finish', async () => {
    let requestArrived;
    const received = new Promise((resolve) => {
      requestArrived = resolve;
    });
    let pendingResponse;
    const server = await listen((_req, res) => {
      pendingResponse = res;
      requestArrived();
    });
    const { signalSource, database, exit } = install(server);
    const { port } = server.address();
    const request = fetch(`http://127.0.0.1:${port}/`);
    await received;

    signalSource.emit('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(database.close).not.toHaveBeenCalled();

    pendingResponse.end('done');
    await request;
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    expect(database.close).toHaveBeenCalledOnce();
  });

  it('forces connections closed and exits 1 when requests outlast the timeout', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let requestArrived;
    const received = new Promise((resolve) => {
      requestArrived = resolve;
    });
    const server = await listen(() => requestArrived());
    const { signalSource, database, exit } = install(server, { timeoutMs: 20 });
    const { port } = server.address();
    const request = fetch(`http://127.0.0.1:${port}/`).catch(() => null);
    await received;

    signalSource.emit('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
    await request;
    warnSpy.mockRestore();

    expect(exit).toHaveBeenCalledOnce();
    expect(database.close).toHaveBeenCalledOnce();
  });

  it('shuts down once when a second signal arrives', async () => {
    const server = await listen();
    const { signalSource, database, exit } = install(server);

    signalSource.emit('SIGTERM');
    signalSource.emit('SIGTERM');
    signalSource.emit('SIGINT');
    await vi.waitFor(() => expect(exit).toHaveBeenCalled());

    expect(exit).toHaveBeenCalledOnce();
    expect(database.close).toHaveBeenCalledOnce();
  });

  it('still exits when closing the database throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const server = await listen();
    const database = {
      close: vi.fn(() => {
        throw new Error('busy');
      }),
    };
    const { signalSource, exit } = install(server, { database });

    signalSource.emit('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
    errorSpy.mockRestore();
  });
});
