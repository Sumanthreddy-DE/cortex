import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { runMidnightPromotion } from '../../src/main/cron/midnight'

function seed(
  db: Database.Database,
  items: Array<{ priority: string; title: string; created_at?: number }>
) {
  const insert = db.prepare(`
    INSERT INTO items (id, title, url, type, priority, tags, archived, created_at, updated_at)
    VALUES (lower(hex(randomblob(8))), ?, NULL, 'idea', ?, '[]', 0, ?, ?)
  `)

  for (const item of items) {
    const createdAt = item.created_at ?? Date.now()
    insert.run(item.title, item.priority, createdAt, createdAt)
  }
}

describe('runMidnightPromotion', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    runMigrations(db)
  })

  afterEach(() => {
    db.close()
  })

  it('moves all tomorrow items to today', () => {
    seed(db, [
      { priority: 'tomorrow', title: 'Item A' },
      { priority: 'tomorrow', title: 'Item B' }
    ])

    const result = runMidnightPromotion(db)

    expect(result.action).toBe('promoted-tomorrow')
    expect(result.count).toBe(2)
    expect(db.prepare(`SELECT * FROM items WHERE priority = 'today'`).all()).toHaveLength(2)
    expect(db.prepare(`SELECT * FROM items WHERE priority = 'tomorrow'`).all()).toHaveLength(0)
  })

  it('surfaces the oldest 2 this-week items when tomorrow is empty', () => {
    const base = Date.now()
    seed(db, [
      { priority: 'this-week', title: 'Old A', created_at: base - 2_000 },
      { priority: 'this-week', title: 'Older B', created_at: base - 3_000 },
      { priority: 'this-week', title: 'Newest C', created_at: base }
    ])

    const result = runMidnightPromotion(db)

    expect(result.action).toBe('surfaced-this-week')
    expect(result.count).toBe(2)

    const todayTitles = (
      db.prepare(`SELECT title FROM items WHERE priority = 'today' ORDER BY title ASC`).all() as Array<{
        title: string
      }>
    ).map((item) => item.title)

    expect(todayTitles).toEqual(['Old A', 'Older B'].sort())
    expect(db.prepare(`SELECT * FROM items WHERE priority = 'this-week'`).all()).toHaveLength(1)
  })

  it('skips when the cron already ran within the idempotency window', () => {
    seed(db, [{ priority: 'tomorrow', title: 'Item A' }])
    db.prepare(`UPDATE meta SET value = ? WHERE key = 'last_midnight_run'`).run(String(Date.now() - 3_600_000))

    const result = runMidnightPromotion(db)

    expect(result.action).toBe('skipped')
    expect(db.prepare(`SELECT * FROM items WHERE priority = 'tomorrow'`).all()).toHaveLength(1)
  })

  it('returns clean-slate when all columns are empty', () => {
    expect(runMidnightPromotion(db)).toEqual({ action: 'clean-slate', count: 0 })
  })

  it('returns a today warning when only today has items', () => {
    seed(db, [{ priority: 'today', title: 'Leftover' }])

    expect(runMidnightPromotion(db)).toEqual({ action: 'today-warning', count: 1 })
  })
})
