import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(
  import.meta.dirname,
  "..",
  "..",
  "data",
  "monitor.db"
);

let db: Database;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  migrate(db);
  return db;
}

export function saveDb(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

function migrate(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'html' CHECK(type IN ('html', 'rss')),
      interval_minutes INTEGER NOT NULL DEFAULT 5,
      selectors TEXT DEFAULT '{}',
      keywords TEXT DEFAULT '[]',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      external_id TEXT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      author TEXT,
      content TEXT,
      summary TEXT,
      detected_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
      UNIQUE(source_id, url)
    )
  `);

  // Add external_id column if missing (migration for existing DBs)
  try {
    db.exec("SELECT external_id FROM posts LIMIT 0");
  } catch {
    db.run("ALTER TABLE posts ADD COLUMN external_id TEXT");
  }

  // Index for fast external_id lookups
  db.run("CREATE INDEX IF NOT EXISTS idx_posts_external_id ON posts(source_id, external_id)");

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      channel TEXT NOT NULL CHECK(channel IN ('imessage', 'email', 'slack')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
      error_message TEXT,
      sent_at TEXT,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL UNIQUE CHECK(channel IN ('imessage', 'email', 'slack')),
      config TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS crawl_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('success', 'error')),
      total_found INTEGER NOT NULL DEFAULT 0,
      new_posts INTEGER NOT NULL DEFAULT 0,
      matched_posts INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      crawled_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    )
  `);

  // Seed default notification settings if empty
  const count = db.exec(
    "SELECT COUNT(*) as cnt FROM notification_settings"
  )[0]?.values[0]?.[0] as number;
  if (count === 0) {
    db.run(
      `INSERT INTO notification_settings (channel, config, enabled) VALUES ('imessage', '{}', 0)`
    );
    db.run(
      `INSERT INTO notification_settings (channel, config, enabled) VALUES ('email', '{}', 0)`
    );
    db.run(
      `INSERT INTO notification_settings (channel, config, enabled) VALUES ('slack', '{}', 0)`
    );
  }

  saveDb();
}
