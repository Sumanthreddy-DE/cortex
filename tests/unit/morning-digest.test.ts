import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { recordDigestFired, shouldFireDigest } from '../../src/main/cron/morning-digest'

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
