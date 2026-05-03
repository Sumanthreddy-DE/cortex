import Database from 'better-sqlite3'
import { DEFAULT_MORNING_DIGEST_TIME } from '../../shared/constants'

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  return columns.some((entry) => entry.name === column)
}

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id          TEXT PRIMARY KEY,
      type        TEXT NOT NULL CHECK(type IN ('link','idea')),
      title       TEXT NOT NULL,
      url         TEXT,
      note        TEXT,
      priority    TEXT NOT NULL CHECK(priority IN ('inbox','for-now','today','tomorrow','this-week','someday')),
      tags        TEXT NOT NULL DEFAULT '[]',
      favicon_url TEXT,
      archived    INTEGER NOT NULL DEFAULT 0,
      remind_at   INTEGER,
      completed_at INTEGER,
      last_opened_at INTEGER,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
      title,
      url,
      note,
      content='items',
      content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
      INSERT INTO items_fts(rowid, title, url, note)
      VALUES (new.rowid, new.title, COALESCE(new.url, ''), COALESCE(new.note, ''));
    END;

    CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, title, url, note)
      VALUES ('delete', old.rowid, old.title, COALESCE(old.url, ''), COALESCE(old.note, ''));
    END;

    CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, title, url, note)
      VALUES ('delete', old.rowid, old.title, COALESCE(old.url, ''), COALESCE(old.note, ''));
      INSERT INTO items_fts(rowid, title, url, note)
      VALUES (new.rowid, new.title, COALESCE(new.url, ''), COALESCE(new.note, ''));
    END;

    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS item_notes (
      id         TEXT PRIMARY KEY,
      item_id    TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      content    TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS spaces (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS space_items (
      space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      item_id  TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      pinned   INTEGER NOT NULL DEFAULT 0,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (space_id, item_id)
    );

    INSERT OR IGNORE INTO meta(key, value) VALUES ('last_midnight_run', '0');
    INSERT OR IGNORE INTO meta(key, value) VALUES ('morning_digest_time', '${DEFAULT_MORNING_DIGEST_TIME}');
    INSERT OR IGNORE INTO meta(key, value) VALUES ('last_digest_date', '');
  `)

  if (!hasColumn(db, 'items', 'completed_at')) {
    db.prepare(`ALTER TABLE items ADD COLUMN completed_at INTEGER`).run()
  }
  if (!hasColumn(db, 'items', 'last_opened_at')) {
    db.prepare(`ALTER TABLE items ADD COLUMN last_opened_at INTEGER`).run()
  }

  const now = Date.now()
  db.prepare(`
    INSERT OR IGNORE INTO spaces (id, name, position, created_at)
    VALUES
      ('daily', 'Daily', 0, ?),
      ('groceries', 'Groceries', 1, ?),
      ('ai-tools', 'AI Tools', 2, ?),
      ('ideas', 'Ideas', 3, ?)
  `).run(now, now, now, now)

  db.prepare(`
    INSERT INTO item_notes (id, item_id, content, created_at, updated_at)
    SELECT
      'legacy-' || items.id,
      items.id,
      items.note,
      items.created_at,
      items.updated_at
    FROM items
    WHERE items.type = 'idea'
      AND items.note IS NOT NULL
      AND TRIM(items.note) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM item_notes WHERE item_notes.item_id = items.id
      )
  `).run()

  db.prepare(`UPDATE items SET priority = 'today' WHERE priority = 'for-now'`).run()
  db.prepare(`INSERT INTO items_fts(items_fts) VALUES ('rebuild')`).run()
}
