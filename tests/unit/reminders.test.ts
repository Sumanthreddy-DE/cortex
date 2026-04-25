import Database from 'better-sqlite3'
import { vi } from 'vitest'
import { checkReminders } from '../../src/main/cron/reminders'
import { runMigrations } from '../../src/main/db/migrations'

const { show, NotificationMock } = vi.hoisted(() => {
  const show = vi.fn()
  const NotificationMock = vi.fn().mockImplementation(() => ({ show }))

  return { show, NotificationMock }
})

vi.mock('electron', () => ({
  Notification: NotificationMock
}))

describe('checkReminders', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    runMigrations(db)
    show.mockReset()
    NotificationMock.mockClear()
  })

  afterEach(() => {
    db.close()
  })

  it('clears due reminders after checking', () => {
    const pastTime = Date.now() - 60_000
    db.prepare(`
      INSERT INTO items (id, type, title, priority, tags, archived, remind_at, created_at, updated_at)
      VALUES ('r1', 'idea', 'Do the thing', 'today', '[]', 0, ?, ?, ?)
    `).run(pastTime, pastTime, pastTime)

    checkReminders(db)

    const item = db.prepare(`SELECT remind_at FROM items WHERE id = 'r1'`).get() as
      | { remind_at: number | null }
      | undefined
    expect(item?.remind_at).toBeNull()
  })

  it('leaves future reminders untouched', () => {
    const futureTime = Date.now() + 60_000
    db.prepare(`
      INSERT INTO items (id, type, title, priority, tags, archived, remind_at, created_at, updated_at)
      VALUES ('r2', 'idea', 'Future thing', 'today', '[]', 0, ?, ?, ?)
    `).run(futureTime, futureTime, futureTime)

    checkReminders(db)

    const item = db.prepare(`SELECT remind_at FROM items WHERE id = 'r2'`).get() as
      | { remind_at: number | null }
      | undefined
    expect(item?.remind_at).toBe(futureTime)
  })
})
