import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'

describe('runMigrations', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    runMigrations(db)
  })

  afterEach(() => {
    db.close()
  })

  it('creates the items table', () => {
    const row = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'items'`)
      .get()

    expect(row).toBeDefined()
  })

  it('creates the FTS table', () => {
    const row = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'items_fts'`)
      .get()

    expect(row).toBeDefined()
  })

  it('creates the meta table defaults', () => {
    const midnight = db.prepare(`SELECT value FROM meta WHERE key = 'last_midnight_run'`).get() as
      | { value: string }
      | undefined
    const digest = db.prepare(`SELECT value FROM meta WHERE key = 'morning_digest_time'`).get() as
      | { value: string }
      | undefined

    expect(midnight?.value).toBe('0')
    expect(digest?.value).toBe('08:00')
  })

  it('accepts inbox priority and remind_at column', () => {
    const columns = db.prepare(`PRAGMA table_info(items)`).all() as Array<{ name: string }>
    expect(columns.map((column) => column.name)).toContain('remind_at')

    expect(() =>
      db
        .prepare(`
          INSERT INTO items (id, type, title, priority, tags, remind_at, created_at, updated_at)
          VALUES ('x', 'idea', 'Test', 'inbox', '[]', NULL, 1, 1)
        `)
        .run()
    ).not.toThrow()
  })

  it('updates the fts index when an item is inserted', () => {
    db.prepare(`
      INSERT INTO items (id, type, title, url, note, priority, tags, created_at, updated_at)
      VALUES ('1', 'link', 'Makemore', 'https://example.com', '', 'today', '[]', 1, 1)
    `).run()

    const results = db.prepare(`SELECT rowid FROM items_fts WHERE items_fts MATCH 'Makemore'`).all()
    expect(results).toHaveLength(1)
  })

  it('updates the fts index when an item is deleted', () => {
    db.prepare(`
      INSERT INTO items (id, type, title, url, note, priority, tags, created_at, updated_at)
      VALUES ('2', 'link', 'Makemore', 'https://example.com', '', 'today', '[]', 1, 1)
    `).run()
    db.prepare(`DELETE FROM items WHERE id = '2'`).run()

    const results = db.prepare(`SELECT rowid FROM items_fts WHERE items_fts MATCH 'Makemore'`).all()
    expect(results).toHaveLength(0)
  })
})
