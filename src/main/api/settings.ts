import Database from 'better-sqlite3'
import { Router } from 'express'
import { DEFAULT_MORNING_DIGEST_TIME } from '../../shared/constants'

const READABLE_KEYS = ['morning_digest_time', 'last_midnight_run', 'last_digest_date'] as const
const WRITABLE_KEYS = ['morning_digest_time'] as const

type WritableKey = (typeof WRITABLE_KEYS)[number]

export interface Settings {
  morning_digest_time: string
  last_midnight_run: string
  last_digest_date: string
}

export function getSettings(db: Database.Database): Settings {
  const rows = db
    .prepare(`SELECT key, value FROM meta WHERE key IN (${READABLE_KEYS.map(() => '?').join(', ')})`)
    .all(...READABLE_KEYS) as Array<{ key: string; value: string }>

  const settings: Settings = {
    morning_digest_time: DEFAULT_MORNING_DIGEST_TIME,
    last_midnight_run: '0',
    last_digest_date: ''
  }

  for (const row of rows) {
    if (row.key in settings) {
      settings[row.key as keyof Settings] = row.value
    }
  }

  return settings
}

export function patchSettings(
  db: Database.Database,
  patch: Partial<Record<WritableKey, string>>
): Settings {
  const updateStatement = db.prepare('UPDATE meta SET value = ? WHERE key = ?')

  for (const key of WRITABLE_KEYS) {
    const value = patch[key]
    if (value !== undefined) {
      updateStatement.run(value, key)
    }
  }

  return getSettings(db)
}

export function settingsRouter(db: Database.Database): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(getSettings(db))
  })

  router.patch('/', (req, res) => {
    const patch: Partial<Record<WritableKey, string>> = {}
    const { morning_digest_time } = req.body ?? {}

    if (morning_digest_time !== undefined) {
      if (typeof morning_digest_time !== 'string' || !/^\d{2}:\d{2}$/.test(morning_digest_time)) {
        res.status(400).json({ error: 'morning_digest_time must be HH:MM format' })
        return
      }

      patch.morning_digest_time = morning_digest_time
    }

    res.json(patchSettings(db, patch))
  })

  return router
}
