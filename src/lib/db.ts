import { createClient, type Client } from "@libsql/client";

declare global {
  // eslint-disable-next-line no-var
  var __appinglesDb: Client | undefined;
  // eslint-disable-next-line no-var
  var __appinglesSchemaReady: Promise<void> | undefined;
}

export const db: Client =
  global.__appinglesDb ??
  createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:./data/appingles.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

if (process.env.NODE_ENV !== "production") global.__appinglesDb = db;

async function ensureSchema() {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term TEXT NOT NULL,
        translation TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
        ease_factor REAL NOT NULL DEFAULT 2.5,
        interval_days REAL NOT NULL DEFAULT 0,
        repetitions INTEGER NOT NULL DEFAULT 0,
        due_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_reviewed_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS phrase_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
        phrase TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ],
    "write"
  );
}

export function withSchema(): Promise<void> {
  if (!global.__appinglesSchemaReady) {
    global.__appinglesSchemaReady = ensureSchema();
  }
  return global.__appinglesSchemaReady;
}
