// @vitest-environment node

import Database from 'better-sqlite3';
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

const createTestDb = () => {
  const database = new Database(':memory:');
  database.exec(`
    CREATE TABLE profiles (
      id TEXT PRIMARY KEY,
      ha_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      device_label TEXT,
      data TEXT NOT NULL,
      data_enc TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_profiles_ha_user_id ON profiles(ha_user_id);

    CREATE TABLE current_settings (
      ha_user_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      device_label TEXT,
      data TEXT NOT NULL,
      data_enc TEXT,
      revision INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (ha_user_id, device_id)
    );

    CREATE INDEX idx_current_settings_ha_user_id ON current_settings(ha_user_id);

    CREATE TABLE current_settings_history (
      ha_user_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      data TEXT NOT NULL,
      data_enc TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (ha_user_id, device_id, revision)
    );

    CREATE INDEX idx_current_settings_history_lookup
      ON current_settings_history(ha_user_id, device_id, revision DESC);
  `);
  return database;
};

const openHarnesses = [];

const closeServer = async (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const startRouterHarness = async (routerImportPath, routeBase) => {
  const database = createTestDb();

  vi.resetModules();
  vi.doMock('../db.js', () => ({ default: database }));

  const { default: router } = await import(routerImportPath);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.get('x-test-user-id');
    if (userId) {
      req.authenticatedHaUser = { id: userId };
    }
    next();
  });
  app.use(routeBase, router);

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  openHarnesses.push({ server, database });

  return {
    database,
    async request(path, options = {}) {
      const address = server.address();
      const url = `http://127.0.0.1:${address.port}${routeBase}${path}`;
      const headers = new Headers(options.headers || {});
      if (options.body !== undefined && !headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }

      return fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body,
      });
    },
  };
};

afterEach(async () => {
  vi.doUnmock('../db.js');
  vi.resetModules();

  while (openHarnesses.length > 0) {
    const { server, database } = openHarnesses.pop();
    await closeServer(server);
    database.close();
  }
});

describe('settings route auth', () => {
  it('rejects unauthenticated writes to current settings', async () => {
    const harness = await startRouterHarness('../routes/settings.js', '/api/settings');

    const response = await harness.request('/current', {
      method: 'PUT',
      body: JSON.stringify({
        ha_user_id: 'user-1',
        device_id: 'device-1',
        data: { version: 1 },
      }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Missing authenticated Home Assistant user',
    });
  });

  it('rejects mismatched users when publishing settings', async () => {
    const harness = await startRouterHarness('../routes/settings.js', '/api/settings');
    harness.database
      .prepare(
        `INSERT INTO current_settings (ha_user_id, device_id, data, data_enc, revision, updated_at)
         VALUES (?, ?, ?, ?, 1, ?)`
      )
      .run(
        'user-1',
        'device-1',
        JSON.stringify({ version: 1 }),
        null,
        '2026-03-08T12:00:00.000Z'
      );

    const response = await harness.request('/publish', {
      method: 'POST',
      headers: { 'x-test-user-id': 'user-2' },
      body: JSON.stringify({
        ha_user_id: 'user-1',
        source_device_id: 'device-1',
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden: user mismatch' });
  });

  it('publishes source settings to all other devices', async () => {
    const harness = await startRouterHarness('../routes/settings.js', '/api/settings');
    const sourceSnapshot = JSON.stringify({ version: 2, layout: {}, appearance: {} });

    harness.database
      .prepare(
        `INSERT INTO current_settings (ha_user_id, device_id, data, data_enc, revision, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run('user-1', 'device-1', sourceSnapshot, null, 1, '2026-03-08T12:00:00.000Z');
    harness.database
      .prepare(
        `INSERT INTO current_settings (ha_user_id, device_id, data, data_enc, revision, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run('user-1', 'device-2', JSON.stringify({ version: 0 }), null, 1, '2026-03-08T12:00:00.000Z');
    harness.database
      .prepare(
        `INSERT INTO current_settings (ha_user_id, device_id, data, data_enc, revision, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run('user-1', 'device-3', JSON.stringify({ version: 0 }), null, 1, '2026-03-08T12:00:00.000Z');

    const response = await harness.request('/publish', {
      method: 'POST',
      headers: { 'x-test-user-id': 'user-1' },
      body: JSON.stringify({
        ha_user_id: 'user-1',
        source_device_id: 'device-1',
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, affected: 2 });

    const targets = harness.database
      .prepare(
        `SELECT device_id, data, revision
         FROM current_settings
         WHERE ha_user_id = ? AND device_id IN (?, ?)
         ORDER BY device_id ASC`
      )
      .all('user-1', 'device-2', 'device-3');

    expect(targets).toEqual([
      { device_id: 'device-2', data: sourceSnapshot, revision: 2 },
      { device_id: 'device-3', data: sourceSnapshot, revision: 2 },
    ]);
  });

  it('rolls back publish changes when one target write fails', async () => {
    const harness = await startRouterHarness('../routes/settings.js', '/api/settings');
    const sourceSnapshot = JSON.stringify({ version: 2, layout: {}, appearance: {} });

    harness.database
      .prepare(
        `INSERT INTO current_settings (ha_user_id, device_id, data, data_enc, revision, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run('user-1', 'device-1', sourceSnapshot, null, 1, '2026-03-08T12:00:00.000Z');
    harness.database
      .prepare(
        `INSERT INTO current_settings (ha_user_id, device_id, data, data_enc, revision, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run('user-1', 'device-2', JSON.stringify({ version: 0 }), null, 1, '2026-03-08T12:00:00.000Z');
    harness.database
      .prepare(
        `INSERT INTO current_settings (ha_user_id, device_id, data, data_enc, revision, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run('user-1', 'device-3', JSON.stringify({ version: -1 }), null, 1, '2026-03-08T12:00:00.000Z');

    harness.database.exec(`
      CREATE TRIGGER abort_publish_history
      BEFORE INSERT ON current_settings_history
      WHEN NEW.device_id = 'device-3'
      BEGIN
        SELECT RAISE(ABORT, 'forced publish failure');
      END;
    `);

    const response = await harness.request('/publish', {
      method: 'POST',
      headers: { 'x-test-user-id': 'user-1' },
      body: JSON.stringify({
        ha_user_id: 'user-1',
        source_device_id: 'device-1',
      }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to publish settings to target devices',
    });

    const targets = harness.database
      .prepare(
        `SELECT device_id, data, revision
         FROM current_settings
         WHERE ha_user_id = ? AND device_id IN (?, ?)
         ORDER BY device_id ASC`
      )
      .all('user-1', 'device-2', 'device-3');

    expect(targets).toEqual([
      { device_id: 'device-2', data: JSON.stringify({ version: 0 }), revision: 1 },
      { device_id: 'device-3', data: JSON.stringify({ version: -1 }), revision: 1 },
    ]);

    const historyRows = harness.database
      .prepare(
        `SELECT device_id, revision
         FROM current_settings_history
         WHERE ha_user_id = ? AND device_id IN (?, ?)`
      )
      .all('user-1', 'device-2', 'device-3');

    expect(historyRows).toEqual([]);
  });
});

describe('profiles route auth', () => {
  it('rejects unauthenticated profile listing', async () => {
    const harness = await startRouterHarness('../routes/profiles.js', '/api/profiles');

    const response = await harness.request('/?ha_user_id=user-1');

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Missing authenticated Home Assistant user',
    });
  });

  it('rejects mismatched users when creating profiles', async () => {
    const harness = await startRouterHarness('../routes/profiles.js', '/api/profiles');

    const response = await harness.request('/', {
      method: 'POST',
      headers: { 'x-test-user-id': 'user-2' },
      body: JSON.stringify({
        ha_user_id: 'user-1',
        name: 'Tablet',
        data: { version: 1 },
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden: user mismatch' });
  });

  it('preserves stored profile data during metadata-only updates', async () => {
    const harness = await startRouterHarness('../routes/profiles.js', '/api/profiles');
    const snapshot = { version: 1, layout: {}, appearance: {} };

    harness.database
      .prepare(
        `INSERT INTO profiles (id, ha_user_id, name, device_label, data, data_enc, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'profile-1',
        'user-1',
        'Original',
        'Tablet',
        JSON.stringify(snapshot),
        null,
        '2026-03-08T12:00:00.000Z',
        '2026-03-08T12:00:00.000Z'
      );

    const response = await harness.request('/profile-1', {
      method: 'PUT',
      headers: { 'x-test-user-id': 'user-1' },
      body: JSON.stringify({
        ha_user_id: 'user-1',
        name: 'Renamed',
        device_label: 'Wall Tablet',
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'profile-1',
      ha_user_id: 'user-1',
      name: 'Renamed',
      device_label: 'Wall Tablet',
      data: snapshot,
    });

    const stored = harness.database
      .prepare('SELECT data FROM profiles WHERE id = ? AND ha_user_id = ?')
      .get('profile-1', 'user-1');

    expect(JSON.parse(stored.data)).toEqual(snapshot);
  });

  it('rejects null data payloads during profile updates', async () => {
    const harness = await startRouterHarness('../routes/profiles.js', '/api/profiles');

    harness.database
      .prepare(
        `INSERT INTO profiles (id, ha_user_id, name, device_label, data, data_enc, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'profile-1',
        'user-1',
        'Original',
        'Tablet',
        JSON.stringify({ version: 1, layout: {}, appearance: {} }),
        null,
        '2026-03-08T12:00:00.000Z',
        '2026-03-08T12:00:00.000Z'
      );

    const response = await harness.request('/profile-1', {
      method: 'PUT',
      headers: { 'x-test-user-id': 'user-1' },
      body: JSON.stringify({
        ha_user_id: 'user-1',
        name: 'Renamed',
        data: null,
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'data must be an object when provided',
    });
  });
});