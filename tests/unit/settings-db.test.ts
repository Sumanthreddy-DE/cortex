import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { getSettings, patchSettings } from '../../src/main/api/settings'

describe('settings db helpers', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    runMigrations(db)
  })

  afterEach(() => {
    db.close()
  })

  it('returns defaults', () => {
    const settings = getSettings(db)
    expect(settings.morning_digest_time).toBe('05:00')
    expect(settings.last_midnight_run).toBe('0')
    expect(settings.last_digest_date).toBe('')
  })

  it('patches writable settings', () => {
    patchSettings(db, { morning_digest_time: '09:30' })
    expect(getSettings(db).morning_digest_time).toBe('09:30')
  })

  it('ignores unknown keys', () => {
    patchSettings(db, { unknown_key: 'value' } as never)
    expect(Object.keys(getSettings(db))).not.toContain('unknown_key')
  })
})
