import Database from 'better-sqlite3'
import { Router } from 'express'
import { nanoid } from 'nanoid'

export interface Space {
  id: string
  name: string
  position: number
  created_at: number
}

export function getSpaces(db: Database.Database): Space[] {
  return db
    .prepare('SELECT id, name, position, created_at FROM spaces ORDER BY position ASC, created_at ASC')
    .all() as Space[]
}

export function createSpace(db: Database.Database, name: string): Space {
  const cleanName = name.trim()
  if (!cleanName) {
    throw new Error('Space name is required')
  }

  const row = db.prepare('SELECT COALESCE(MAX(position), -1) AS max FROM spaces').get() as { max: number }
  const now = Date.now()
  const space = {
    id: nanoid(),
    name: cleanName,
    position: row.max + 1,
    created_at: now
  }

  db.prepare('INSERT INTO spaces (id, name, position, created_at) VALUES (?, ?, ?, ?)').run(
    space.id,
    space.name,
    space.position,
    space.created_at
  )

  return space
}

export function addItemToSpace(
  db: Database.Database,
  spaceId: string,
  itemId: string,
  pinned = false
): boolean {
  const result = db
    .prepare(`
      INSERT OR REPLACE INTO space_items (space_id, item_id, pinned, added_at)
      VALUES (?, ?, ?, ?)
    `)
    .run(spaceId, itemId, pinned ? 1 : 0, Date.now())

  return result.changes > 0
}

export function removeItemFromSpace(db: Database.Database, spaceId: string, itemId: string): boolean {
  const result = db.prepare('DELETE FROM space_items WHERE space_id = ? AND item_id = ?').run(spaceId, itemId)
  return result.changes > 0
}

export function setSpaceItemPinned(
  db: Database.Database,
  spaceId: string,
  itemId: string,
  pinned: boolean
): boolean {
  const result = db
    .prepare('UPDATE space_items SET pinned = ? WHERE space_id = ? AND item_id = ?')
    .run(pinned ? 1 : 0, spaceId, itemId)

  return result.changes > 0
}

export function spacesRouter(db: Database.Database): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(getSpaces(db))
  })

  router.post('/', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name : ''
    try {
      res.status(201).json(createSpace(db, name))
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid space' })
    }
  })

  router.post('/:spaceId/items', (req, res) => {
    const itemId = typeof req.body?.itemId === 'string' ? req.body.itemId : ''
    if (!itemId) {
      res.status(400).json({ error: 'itemId is required' })
      return
    }

    addItemToSpace(db, req.params.spaceId, itemId, Boolean(req.body?.pinned))
    res.json({ ok: true })
  })

  router.delete('/:spaceId/items/:itemId', (req, res) => {
    removeItemFromSpace(db, req.params.spaceId, req.params.itemId)
    res.json({ ok: true })
  })

  router.patch('/:spaceId/items/:itemId/pin', (req, res) => {
    setSpaceItemPinned(db, req.params.spaceId, req.params.itemId, Boolean(req.body?.pinned))
    res.json({ ok: true })
  })

  return router
}
