import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
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

const ensureColumn = (tableName, columnName, columnSql) => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = Array.isArray(columns) && columns.some((col) => col.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnSql}`);
  }
};

ensureColumn('current_settings', 'device_label', 'TEXT');
ensureColumn('profiles', 'data_enc', 'TEXT');
ensureColumn('current_settings', 'data_enc', 'TEXT');
ensureColumn('current_settings_history', 'data_enc', 'TEXT');

export default db;
