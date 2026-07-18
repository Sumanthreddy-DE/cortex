import Database from 'better-sqlite3'
import { drainDiscordChannel, parseCaptureMessage } from '../../src/main/discord/poller'
import { runMigrations } from '../../src/main/db/migrations'

describe('parseCaptureMessage', () => {
  it('defaults to inbox priority with no token', () => {
    expect(parseCaptureMessage('buy milk')).toEqual({ title: 'buy milk', url: null, priority: 'inbox' })
  })

  it('extracts a priority token and strips it from the title', () => {
    expect(parseCaptureMessage('buy milk !today')).toEqual({
      title: 'buy milk',
      url: null,
      priority: 'today'
    })
  })

  it('maps !week to this-week and !now to for-now', () => {
    expect(parseCaptureMessage('plan trip !week').priority).toBe('this-week')
    expect(parseCaptureMessage('call mom !now').priority).toBe('for-now')
  })

  it('leaves unknown tokens in the title', () => {
    expect(parseCaptureMessage('review !important doc')).toEqual({
      title: 'review !important doc',
      url: null,
      priority: 'inbox'
    })
  })

  it('extracts a URL', () => {
    const parsed = parseCaptureMessage('https://example.com/article !tomorrow')
    expect(parsed.url).toBe('https://example.com/article')
    expect(parsed.priority).toBe('tomorrow')
  })
})

describe('drainDiscordChannel', () => {
  it('returns 0 when discord env vars are absent', async () => {
    delete process.env.DISCORD_BOT_TOKEN
    delete process.env.DISCORD_CHANNEL_ID

    const db = new Database(':memory:')
    runMigrations(db)

    await expect(drainDiscordChannel(db)).resolves.toBe(0)

    db.close()
  })
})
