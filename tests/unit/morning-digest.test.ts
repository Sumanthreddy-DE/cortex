import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { getTodayItems, recordDigestFired, shouldFireDigest } from '../../src/main/cron/morning-digest'

describe('shouldFireDigest', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    runMigrations(db)
    db.prepare(`UPDATE meta SET value = '08:00' WHERE key = 'morning_digest_time'`).run()
  })

  afterEach(() => {
    db.close()
  })

  it('returns true when current time matches and it has not fired today', () => {
    expect(shouldFireDigest(db, new Date('2026-04-25T08:00:00'))).toBe(true)
  })

  it('returns false when current time does not match the configured time', () => {
    expect(shouldFireDigest(db, new Date('2026-04-25T09:00:00'))).toBe(false)
  })

  it('returns false after it already fired today', () => {
    const now = new Date('2026-04-25T08:00:00')
    recordDigestFired(db, now)
    expect(shouldFireDigest(db, now)).toBe(false)
  })

  it('returns true again on the next day', () => {
    recordDigestFired(db, new Date('2026-04-25T08:00:00'))
    expect(shouldFireDigest(db, new Date('2026-04-26T08:00:00'))).toBe(true)
  })
})

describe('getTodayItems', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    runMigrations(db)
  })

  afterEach(() => {
    db.close()
  })

  it('returns only active today and for-now items ordered by creation time', () => {
    db.prepare(`
      INSERT INTO items (id, type, title, priority, tags, archived, completed_at, created_at, updated_at)
      VALUES
        ('a', 'idea', 'First', 'today', '["Ideas"]', 0, NULL, 10, 10),
        ('b', 'idea', 'Second', 'for-now', '["Daily"]', 0, NULL, 20, 20),
        ('c', 'idea', 'Archived', 'today', '[]', 1, NULL, 30, 30),
        ('d', 'idea', 'Done', 'today', '[]', 0, 40, 40, 40),
        ('e', 'idea', 'Tomorrow', 'tomorrow', '[]', 0, NULL, 50, 50)
    `).run()

    expect(getTodayItems(db)).toEqual([
      { title: 'First', tags: '["Ideas"]' },
      { title: 'Second', tags: '["Daily"]' }
    ])
  })
})
