import Database from 'better-sqlite3'
import { Router } from 'express'
import { getDistinctTags, Item } from './items'

function deserialize(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    type: row.type as 'link' | 'idea',
    title: row.title as string,
    url: (row.url as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    priority: row.priority as Item['priority'],
    tags: JSON.parse((row.tags as string) ?? '[]'),
    favicon_url: (row.favicon_url as string | null) ?? null,
    archived: Number(row.archived ?? 0),
    remind_at: row.remind_at == null ? null : Number(row.remind_at),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at)
  }
}

export function searchItems(db: Database.Database, query: string): Item[] {
  const safe = query.trim().replace(/"/g, '""')
  if (!safe) {
    return []
  }

  const rows = db
    .prepare(`
      SELECT items.*
      FROM items
      JOIN items_fts ON items.rowid = items_fts.rowid
      WHERE items.archived = 0
        AND items_fts MATCH ?
      ORDER BY bm25(items_fts), items.updated_at DESC
      LIMIT 50
    `)
    .all(`"${safe}"*`) as Record<string, unknown>[]

  return rows.map(deserialize)
}

export function searchRouter(db: Database.Database): Router {
  const router = Router()

  router.get('/search', (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q : ''
    res.json(searchItems(db, query))
  })

  router.get('/tags', (_req, res) => {
    res.json(getDistinctTags(db))
  })

  return router
}
