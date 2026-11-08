import Database from 'better-sqlite3';
import { verifyStoredEncryption } from './utils/dataCrypto.js';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'fs';
import { join, dirname } from 'path';

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = join(DATA_DIR, 'tunet.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    ha_user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    device_label TEXT,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_profiles_ha_user_id ON profiles(ha_user_id);

  CREATE TABLE IF NOT EXISTS current_settings (
    ha_user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_label TEXT,
    data TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (ha_user_id, device_id)
  );

  CREATE INDEX IF NOT EXISTS idx_current_settings_ha_user_id ON current_settings(ha_user_id);

  CREATE TABLE IF NOT EXISTS current_settings_history (
    ha_user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    revision INTEGER NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (ha_user_id, device_id, revision)
  );

  CREATE INDEX IF NOT EXISTS idx_current_settings_history_lookup
    ON current_settings_history(ha_user_id, device_id, revision DESC);
`);

/**
 * @param {string} tableName
 * @param {string} columnName
 * @param {string} columnSql
 */
const ensureColumn = (tableName, columnName, columnSql) => {
  const columns = /** @type {{ name: string }[]} */ (
    db.prepare(`PRAGMA table_info(${tableName})`).all()
  );
  const exists = Array.isArray(columns) && columns.some((col) => col.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnSql}`);
  }
};

ensureColumn('current_settings', 'device_label', 'TEXT');
ensureColumn('profiles', 'data_enc', 'TEXT');
ensureColumn('current_settings', 'data_enc', 'TEXT');
ensureColumn('current_settings_history', 'data_enc', 'TEXT');

verifyStoredEncryption(db);

const BACKUP_KEEP_COUNT = 7;
const BACKUP_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// Checking hourly keeps backups daily even when restarts would keep resetting a 24 h timer.
const BACKUP_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const BACKUP_NAME_PATTERN = /^tunet-(\d{4}-\d{2}-\d{2}T)(\d{2})-(\d{2})-(\d{2})-(\d{3}Z)\.db$/;
const DEFAULT_BACKUP_DIR = join(DATA_DIR, 'backups');

/**
 * @typedef {object} BackupOptions
 * @property {Pick<import('better-sqlite3').Database, 'backup'>} [database]
 * @property {string} [backupDir]
 * @property {() => number} [now]
 */

/**
 * @param {string} backupDir
 * @returns {string[]} backup file names, newest first
 */
const listBackups = (backupDir) =>
  existsSync(backupDir)
    ? readdirSync(backupDir)
        .filter((name) => BACKUP_NAME_PATTERN.test(name))
        .sort()
        .reverse()
    : [];

/** @param {string} name */
const getBackupTime = (name) => Date.parse(name.replace(BACKUP_NAME_PATTERN, '$1$2:$3:$4.$5'));

/** @param {string} backupDir */
const pruneBackups = (backupDir) => {
  const staleTempFiles = readdirSync(backupDir).filter((name) => name.includes('.db.tmp'));
  for (const name of [...listBackups(backupDir).slice(BACKUP_KEEP_COUNT), ...staleTempFiles]) {
    rmSync(join(backupDir, name), { force: true });
  }
};

/**
 * Copies the database with SQLite's online backup, which is safe while the server writes to it.
 * The copy is renamed into place when complete, so a partial file never replaces a good backup.
 * Never rejects: a failed backup must not take the dashboard down.
 * @param {BackupOptions} [options]
 * @returns {Promise<string | null>} path of the new backup, or null if it failed
 */
export const runBackup = async ({
  database = db,
  backupDir = DEFAULT_BACKUP_DIR,
  now = Date.now,
} = {}) => {
  const stamp = new Date(now()).toISOString().replace(/[:.]/g, '-');
  const backupPath = join(backupDir, `tunet-${stamp}.db`);
  const tempPath = `${backupPath}.tmp`;

  try {
    mkdirSync(backupDir, { recursive: true });
    await database.backup(tempPath);
    renameSync(tempPath, backupPath);
    pruneBackups(backupDir);
    return backupPath;
  } catch (error) {
    console.error('[backup] Database backup failed:', error);
    try {
      rmSync(tempPath, { force: true });
    } catch {
      // The next successful backup removes it.
    }
    return null;
  }
};

/**
 * @param {BackupOptions} [options]
 * @returns {Promise<string | null>} path of the new backup, or null if none was written
 */
export const runBackupIfDue = async (options = {}) => {
  const { backupDir = DEFAULT_BACKUP_DIR, now = Date.now } = options;
  try {
    const [newest] = listBackups(backupDir);
    if (newest && now() - getBackupTime(newest) < BACKUP_MAX_AGE_MS) return null;
  } catch {
    // An unreadable folder is logged by the backup attempt below.
  }
  return runBackup(options);
};

/**
 * Backs up at startup if the newest backup is over a day old, then once a day.
 * @param {BackupOptions} [options]
 * @returns {() => void} stops the schedule
 */
export const startBackupSchedule = (options = {}) => {
  const check = () => void runBackupIfDue(options);
  check();
  const timer = setInterval(check, BACKUP_CHECK_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
};

export default db;
