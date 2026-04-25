import Database from 'better-sqlite3'
import { DEFAULT_MORNING_DIGEST_TIME } from '../../shared/constants'

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

    INSERT OR IGNORE INTO meta(key, value) VALUES ('last_midnight_run', '0');
    INSERT OR IGNORE INTO meta(key, value) VALUES ('morning_digest_time', '${DEFAULT_MORNING_DIGEST_TIME}');
    INSERT OR IGNORE INTO meta(key, value) VALUES ('last_digest_date', '');
  `)

  db.prepare(`INSERT INTO items_fts(items_fts) VALUES ('rebuild')`).run()
}
