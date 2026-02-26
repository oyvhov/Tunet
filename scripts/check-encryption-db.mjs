import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { join } from 'path';

await import('../server/db.js');

const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data');
const dbPath = join(dataDir, 'tunet.db');

if (!existsSync(dbPath)) {
  console.log(JSON.stringify({
    ok: false,
    message: `Database not found at ${dbPath}`,
  }, null, 2));
  process.exit(0);
}

const db = new Database(dbPath, { readonly: true });

const hasColumn = (tableName, columnName) => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return Array.isArray(columns) && columns.some((column) => column.name === columnName);
};

const tables = [
  { name: 'profiles', plain: 'data', enc: 'data_enc' },
  { name: 'current_settings', plain: 'data', enc: 'data_enc' },
  { name: 'current_settings_history', plain: 'data', enc: 'data_enc' },
];

const summary = {
  ok: true,
  dbPath,
  encryptionMode: process.env.TUNET_ENCRYPTION_MODE || 'off',
  results: {},
};

for (const table of tables) {
  const plainExists = hasColumn(table.name, table.plain);
  const encExists = hasColumn(table.name, table.enc);

  if (!plainExists) {
    summary.results[table.name] = {
      plainColumn: false,
      encryptedColumn: encExists,
      rows: 0,
      plaintextRows: 0,
      encryptedRows: 0,
    };
    continue;
  }

  const query = encExists
    ? `SELECT COUNT(*) AS rows,
              SUM(CASE WHEN ${table.plain} IS NOT NULL AND LENGTH(${table.plain}) > 0 THEN 1 ELSE 0 END) AS plaintextRows,
              SUM(CASE WHEN ${table.enc} IS NOT NULL AND LENGTH(${table.enc}) > 0 THEN 1 ELSE 0 END) AS encryptedRows
       FROM ${table.name}`
    : `SELECT COUNT(*) AS rows,
              SUM(CASE WHEN ${table.plain} IS NOT NULL AND LENGTH(${table.plain}) > 0 THEN 1 ELSE 0 END) AS plaintextRows,
              0 AS encryptedRows
       FROM ${table.name}`;

  const row = db.prepare(query).get();

  summary.results[table.name] = {
    plainColumn: plainExists,
    encryptedColumn: encExists,
    rows: Number(row?.rows || 0),
    plaintextRows: Number(row?.plaintextRows || 0),
    encryptedRows: Number(row?.encryptedRows || 0),
  };
}

console.log(JSON.stringify(summary, null, 2));
