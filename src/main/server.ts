import type { Server } from 'node:http'
import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { API_PORT } from '../shared/constants'
import { itemsRouter, ItemsRouterOptions } from './api/items'
import { searchRouter } from './api/search'
import { settingsRouter } from './api/settings'
import { spacesRouter } from './api/spaces'
import { getDb } from './db/connection'

let activeServer: Server | null = null

export function createApiApp(db: Database.Database, options: ItemsRouterOptions = {}) {
  const app = express()

  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          origin.startsWith('chrome-extension://') ||
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      },
      credentials: true
    })
  )
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use('/api/items', itemsRouter(db, options))
  app.use('/api/settings', settingsRouter(db))
  app.use('/api/spaces', spacesRouter(db))
  app.use('/api', searchRouter(db))

  return app
}

export function startServer(db: Database.Database = getDb(), options: ItemsRouterOptions = {}): Server {
  if (activeServer) {
    return activeServer
  }

  const app = createApiApp(db, options)
  activeServer = app.listen(API_PORT, '127.0.0.1')
  return activeServer
}

export function stopServer(): void {
  activeServer?.close()
  activeServer = null
}
