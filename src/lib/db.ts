import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "appingles.db");

declare global {
  // eslint-disable-next-line no-var
  var __appinglesDb: Database.Database | undefined;
}

export const db = global.__appinglesDb ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") global.__appinglesDb = db;

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL,
  translation TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days REAL NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  due_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS phrase_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  phrase TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
