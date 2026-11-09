// @vitest-environment node

import Database from 'better-sqlite3';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runBackup, runBackupIfDue, startBackupSchedule } from '../db.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const NOW = Date.parse('2026-11-09T12:00:00.000Z');

const backupNameAt = (ms) => `tunet-${new Date(ms).toISOString().replace(/[:.]/g, '-')}.db`;

describe('database backups', () => {
  let tempDir;
  let backupDir;
  let errorSpy;

  const seedBackup = (ms) => {
    const name = backupNameAt(ms);
    writeFileSync(join(backupDir, name), 'seed');
    return name;
  };

  const fakeDatabase = () => ({
    backup: vi.fn(async (path) => {
      writeFileSync(path, 'copy');
    }),
  });

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tunet-backup-'));
    backupDir = join(tempDir, 'backups');
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    errorSpy.mockRestore();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('runBackup', () => {
    it('writes a readable copy of a live WAL database into the injected folder', async () => {
      const database = new Database(join(tempDir, 'live.db'));
      database.pragma('journal_mode = WAL');
      database.exec("CREATE TABLE t (v TEXT); INSERT INTO t VALUES ('kept')");

      const path = await runBackup({ database, backupDir, now: () => NOW });
      database.close();

      expect(path).toBe(join(backupDir, backupNameAt(NOW)));
      expect(readdirSync(backupDir)).toEqual([backupNameAt(NOW)]);
      const copy = new Database(path, { readonly: true });
      expect(copy.prepare('SELECT v FROM t').get()).toEqual({ v: 'kept' });
      copy.close();
    });

    it('keeps only the seven newest backups', async () => {
      await runBackup({ database: fakeDatabase(), backupDir, now: () => NOW - 100 * DAY_MS });
      const names = Array.from({ length: 8 }, (_, day) => seedBackup(NOW - (day + 1) * DAY_MS));

      await runBackup({ database: fakeDatabase(), backupDir, now: () => NOW });

      expect(readdirSync(backupDir).sort().reverse()).toEqual([
        backupNameAt(NOW),
        ...names.slice(0, 6),
      ]);
    });

    it('leaves files that are not backups alone', async () => {
      await runBackup({ database: fakeDatabase(), backupDir, now: () => NOW });
      writeFileSync(join(backupDir, 'keep-me.txt'), 'mine');

      await runBackup({ database: fakeDatabase(), backupDir, now: () => NOW + DAY_MS });

      expect(existsSync(join(backupDir, 'keep-me.txt'))).toBe(true);
    });

    it('logs a failure, resolves null and leaves no partial file', async () => {
      const database = {
        backup: vi.fn(async (path) => {
          writeFileSync(path, 'partial');
          throw new Error('disk full');
        }),
      };

      await expect(runBackup({ database, backupDir, now: () => NOW })).resolves.toBeNull();

      expect(readdirSync(backupDir)).toEqual([]);
      expect(errorSpy).toHaveBeenCalledOnce();
      expect(String(errorSpy.mock.calls[0])).toContain('disk full');
    });

    it('does not reject when the folder cannot be created', async () => {
      const blocker = join(tempDir, 'file');
      writeFileSync(blocker, 'in the way');

      await expect(
        runBackup({ database: fakeDatabase(), backupDir: join(blocker, 'backups') })
      ).resolves.toBeNull();

      expect(errorSpy).toHaveBeenCalledOnce();
    });

    it('removes a temp file left behind by an interrupted backup', async () => {
      await runBackup({ database: fakeDatabase(), backupDir, now: () => NOW });
      const stale = join(backupDir, `${backupNameAt(NOW - DAY_MS)}.tmp`);
      writeFileSync(stale, 'interrupted');

      await runBackup({ database: fakeDatabase(), backupDir, now: () => NOW + DAY_MS });

      expect(existsSync(stale)).toBe(false);
    });
  });

  describe('runBackupIfDue', () => {
    it('backs up when there are no backups yet', async () => {
      const database = fakeDatabase();

      await runBackupIfDue({ database, backupDir, now: () => NOW });

      expect(database.backup).toHaveBeenCalledOnce();
    });

    it('backs up when the newest backup is older than a day', async () => {
      const database = fakeDatabase();
      await runBackup({ database: fakeDatabase(), backupDir, now: () => NOW - DAY_MS });

      await runBackupIfDue({ database, backupDir, now: () => NOW });

      expect(database.backup).toHaveBeenCalledOnce();
    });

    it('skips when the newest backup is less than a day old', async () => {
      const database = fakeDatabase();
      await runBackup({ database: fakeDatabase(), backupDir, now: () => NOW - DAY_MS + 1 });

      await expect(runBackupIfDue({ database, backupDir, now: () => NOW })).resolves.toBeNull();

      expect(database.backup).not.toHaveBeenCalled();
    });

    it('does not reject when the backup folder is unreadable', async () => {
      const blocker = join(tempDir, 'file');
      writeFileSync(blocker, 'in the way');

      await expect(
        runBackupIfDue({ database: fakeDatabase(), backupDir: blocker, now: () => NOW })
      ).resolves.toBeNull();

      expect(errorSpy).toHaveBeenCalledOnce();
    });
  });

  describe('startBackupSchedule', () => {
    it('backs up at startup and again once a day until stopped', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      let current = NOW;
      const database = fakeDatabase();

      const stop = startBackupSchedule({ database, backupDir, now: () => current });
      await vi.waitFor(() => expect(database.backup).toHaveBeenCalledTimes(1));

      current += 2 * HOUR_MS;
      await vi.advanceTimersByTimeAsync(2 * HOUR_MS);
      expect(database.backup).toHaveBeenCalledTimes(1);

      current += DAY_MS;
      await vi.advanceTimersByTimeAsync(HOUR_MS);
      await vi.waitFor(() => expect(database.backup).toHaveBeenCalledTimes(2));

      stop();
      current += 2 * DAY_MS;
      await vi.advanceTimersByTimeAsync(2 * DAY_MS);
      expect(database.backup).toHaveBeenCalledTimes(2);
    });

    it('skips the startup backup when a recent one exists', async () => {
      await runBackup({ database: fakeDatabase(), backupDir, now: () => NOW - HOUR_MS });
      const database = fakeDatabase();

      const stop = startBackupSchedule({ database, backupDir, now: () => NOW });
      await new Promise((resolve) => setTimeout(resolve, 20));
      stop();

      expect(database.backup).not.toHaveBeenCalled();
    });
  });
});
