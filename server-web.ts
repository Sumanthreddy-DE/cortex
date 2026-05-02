import express from 'express'
import cors from 'cors'
import { getDb } from './src/main/db/connection.ts'
import { itemsRouter } from './src/main/api/items.ts'
import { searchRouter } from './src/main/api/search.ts'
import { settingsRouter } from './src/main/api/settings.ts'
import { spacesRouter } from './src/main/api/spaces.ts'

const db = getDb()
const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/items', itemsRouter(db))
app.use('/api/settings', settingsRouter(db))
app.use('/api/spaces', spacesRouter(db))
app.use('/api', searchRouter(db))

const PORT = 8000
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Cortex API server running on http://127.0.0.1:${PORT}`)
})
