import Database from 'better-sqlite3'
import { Router } from 'express'
import webpush from 'web-push'
import { nanoid } from 'nanoid'

export const VAPID_PUBLIC_KEY = 'BPRlN_jtT2E0REPr697O6O9_8jrH6THI2xhT7DQEhfnmE4GFa3ZCWZqPANj0YHsD25mAcqyLboIRGsODFpByb2s'
const VAPID_PRIVATE_KEY = 'RXjGjNCw9db5iUS_pkVnMe6DwwZZMYZDZv5PdfBohrs'

webpush.setVapidDetails(
  'mailto:cortex@localhost',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: number
}

export function sendPushToAll(db: Database.Database, title: string, body: string): void {
  const subs = db
    .prepare('SELECT * FROM push_subscriptions')
    .all() as PushSubscriptionRow[]

  for (const sub of subs) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    }
    webpush
      .sendNotification(subscription, JSON.stringify({ title, body, url: '/' }))
      .catch((err: { statusCode?: number }) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint)
        }
      })
  }
}

export function pushRouter(db: Database.Database): Router {
  const router = Router()

  router.get('/vapid-key', (_req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY })
  })

  router.post('/subscribe', (req, res) => {
    const { endpoint, keys } = req.body ?? {}
    if (
      typeof endpoint !== 'string' ||
      typeof keys?.p256dh !== 'string' ||
      typeof keys?.auth !== 'string'
    ) {
      res.status(400).json({ error: 'Invalid subscription payload' })
      return
    }

    db.prepare(`
      INSERT OR REPLACE INTO push_subscriptions (id, endpoint, p256dh, auth, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(nanoid(), endpoint, keys.p256dh, keys.auth, Date.now())

    res.status(201).json({ ok: true })
  })

  router.delete('/subscribe', (req, res) => {
    const { endpoint } = req.body ?? {}
    if (typeof endpoint !== 'string') {
      res.status(400).json({ error: 'endpoint required' })
      return
    }
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint)
    res.status(204).send()
  })

  return router
}
