import Database from 'better-sqlite3'
import { drainBotQueue } from '../../src/main/telegram/poller'
import { runMigrations } from '../../src/main/db/migrations'

describe('drainBotQueue', () => {
  it('returns 0 when supabase env vars are absent', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY

    const db = new Database(':memory:')
    runMigrations(db)

    await expect(drainBotQueue(db)).resolves.toBe(0)

    db.close()
  })
})
