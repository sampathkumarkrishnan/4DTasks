import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'delegations.db');

let db = null;

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS delegations (
      id TEXT PRIMARY KEY,
      fromUserEmail TEXT NOT NULL,
      toEmail TEXT NOT NULL,
      taskPayload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      sourceListId TEXT,
      sourceTaskId TEXT,
      parentDelegationId TEXT,
      assigneeTaskId TEXT,
      assigneeListId TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      acceptedAt TEXT,
      completedAt TEXT,
      declinedAt TEXT,
      FOREIGN KEY (parentDelegationId) REFERENCES delegations(id)
    );
    CREATE INDEX IF NOT EXISTS idx_delegations_toEmail ON delegations(toEmail);
    CREATE INDEX IF NOT EXISTS idx_delegations_fromUserEmail ON delegations(fromUserEmail);
    CREATE INDEX IF NOT EXISTS idx_delegations_status ON delegations(status);
  `);
}

export function getDb() {
  if (db) return db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(DB_PATH);
  initSchema(db);
  return db;
}
