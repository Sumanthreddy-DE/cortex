import Database from 'better-sqlite3'
import express from 'express'
import request from 'supertest'
import { runMigrations } from '../../src/main/db/migrations'
import { settingsRouter } from '../../src/main/api/settings'

describe('settings api', () => {
  let db: Database.Database
  let app: express.Express

  beforeEach(() => {
    db = new Database(':memory:')
    runMigrations(db)
    app = express()
    app.use(express.json())
    app.use('/api/settings', settingsRouter(db))
  })

  afterEach(() => {
    db.close()
  })

  it('returns default settings', async () => {
    const response = await request(app).get('/api/settings')
    expect(response.status).toBe(200)
    expect(response.body.morning_digest_time).toBe('08:00')
  })

  it('updates the digest time', async () => {
    const response = await request(app)
      .patch('/api/settings')
      .send({ morning_digest_time: '07:30' })

    expect(response.status).toBe(200)
    expect(response.body.morning_digest_time).toBe('07:30')
  })

  it('rejects invalid digest time formats', async () => {
    const response = await request(app)
      .patch('/api/settings')
      .send({ morning_digest_time: '7:30am' })

    expect(response.status).toBe(400)
  })
})
