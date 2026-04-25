import Database from 'better-sqlite3'
import { Router } from 'express'
import { nanoid } from 'nanoid'
import { PRIORITIES, type Priority } from '../../shared/constants'
export type ItemType = 'link' | 'idea'

export interface Item {
  id: string
  type: ItemType
  title: string
  url: string | null
  note: string | null
  priority: Priority
  tags: string[]
  favicon_url: string | null
  archived: number
  remind_at: number | null
  created_at: number
  updated_at: number
}

export interface ItemMutationInput {
  id: string
  type: ItemType
  title: string
  url?: string | null
  note?: string | null
  priority: Priority
  tags: string[]
  favicon_url?: string | null
  remind_at?: number | null
}

export interface ItemsRouterOptions {
  onItemsChanged?: () => void
}

function deserialize(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    type: row.type as ItemType,
    title: row.title as string,
    url: (row.url as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    priority: row.priority as Priority,
    tags: JSON.parse((row.tags as string) ?? '[]'),
    favicon_url: (row.favicon_url as string | null) ?? null,
    archived: Number(row.archived ?? 0),
    remind_at: row.remind_at == null ? null : Number(row.remind_at),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at)
  }
}

function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && PRIORITIES.includes(value as Priority)
}

function normalizeTags(db: Database.Database, tags: string[], existing: string[] = []): string[] {
  const knownTags = [...getDistinctTags(db), ...existing]
  const canonical = new Map<string, string>()
  const result: string[] = []

  for (const tag of knownTags) {
    const trimmed = tag.trim()
    if (!trimmed) {
      continue
    }
    canonical.set(trimmed.toLowerCase(), trimmed)
  }

  for (const rawTag of tags) {
    const trimmed = rawTag.trim()
    if (!trimmed) {
      continue
    }
    const lower = trimmed.toLowerCase()
    const value = canonical.get(lower) ?? trimmed

    if (result.some((tag) => tag.toLowerCase() === lower)) {
      continue
    }

    canonical.set(lower, value)
    result.push(value)
  }

  return result
}

function coerceNullableText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function coerceNullableNumber(value: unknown): number | null {
  if (value == null || value === '') {
    return null
  }

  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function deriveFaviconUrl(url: string | null, existing?: string | null): string | null {
  if (existing) {
    return existing
  }

  if (!url) {
    return null
  }

  try {
    const parsed = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`
  } catch {
    return null
  }
}

function readItemRow(db: Database.Database, id: string): Record<string, unknown> | undefined {
  return db
    .prepare('SELECT * FROM items WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined
}

export function getItemById(db: Database.Database, id: string): Item | null {
  const row = readItemRow(db, id)
  return row ? deserialize(row) : null
}

export function getDistinctTags(db: Database.Database): string[] {
  const rows = db
    .prepare(`
      SELECT DISTINCT json_each.value AS tag
      FROM items, json_each(items.tags)
      WHERE items.archived = 0
      ORDER BY LOWER(tag) ASC
    `)
    .all() as Array<{ tag: string }>

  return rows.map((row) => row.tag)
}

export function createItem(db: Database.Database, input: ItemMutationInput): Item {
  const now = Date.now()
  const tags = normalizeTags(db, input.tags)

  db.prepare(`
    INSERT INTO items (
      id,
      type,
      title,
      url,
      note,
      priority,
      tags,
      favicon_url,
      archived,
      remind_at,
      created_at,
      updated_at
    )
    VALUES (
      @id,
      @type,
      @title,
      @url,
      @note,
      @priority,
      @tags,
      @favicon_url,
      0,
      @remind_at,
      @created_at,
      @updated_at
    )
  `).run({
    id: input.id,
    type: input.type,
    title: input.title.trim(),
    url: coerceNullableText(input.url),
    note: coerceNullableText(input.note),
    priority: input.priority,
    tags: JSON.stringify(tags),
    favicon_url: deriveFaviconUrl(coerceNullableText(input.url), input.favicon_url),
    remind_at: input.remind_at ?? null,
    created_at: now,
    updated_at: now
  })

  return getItemById(db, input.id)!
}

export function getAllItems(db: Database.Database): Item[] {
  const rows = db
    .prepare('SELECT * FROM items WHERE archived = 0 ORDER BY updated_at DESC, created_at DESC')
    .all() as Record<string, unknown>[]

  return rows.map(deserialize)
}

export function getItemsByPriority(db: Database.Database, priority: Priority): Item[] {
  const rows = db
    .prepare(`
      SELECT *
      FROM items
      WHERE priority = ? AND archived = 0
      ORDER BY created_at ASC
    `)
    .all(priority) as Record<string, unknown>[]

  return rows.map(deserialize)
}

export function getItemsByTag(db: Database.Database, tag: string): Item[] {
  const rows = db
    .prepare(`
      SELECT *
      FROM items
      WHERE archived = 0
        AND EXISTS (
          SELECT 1
          FROM json_each(items.tags)
          WHERE LOWER(json_each.value) = LOWER(?)
        )
      ORDER BY updated_at DESC, created_at DESC
    `)
    .all(tag) as Record<string, unknown>[]

  return rows.map(deserialize)
}

export function getArchivedItems(db: Database.Database): Item[] {
  const rows = db
    .prepare('SELECT * FROM items WHERE archived = 1 ORDER BY updated_at DESC')
    .all() as Record<string, unknown>[]

  return rows.map(deserialize)
}

export function updateItem(
  db: Database.Database,
  id: string,
  patch: Partial<Omit<ItemMutationInput, 'id'>>
): Item | null {
  const current = getItemById(db, id)
  if (!current) {
    return null
  }

  const nextUrl = patch.url !== undefined ? coerceNullableText(patch.url) : current.url
  const nextNote = patch.note !== undefined ? coerceNullableText(patch.note) : current.note
  const nextTags = patch.tags ? normalizeTags(db, patch.tags, current.tags) : current.tags
  const nextRemindAt =
    patch.remind_at !== undefined ? coerceNullableNumber(patch.remind_at) : current.remind_at
  const now = Date.now()

  db.prepare(`
    UPDATE items
    SET
      type = @type,
      title = @title,
      url = @url,
      note = @note,
      priority = @priority,
      tags = @tags,
      favicon_url = @favicon_url,
      remind_at = @remind_at,
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id,
    type: patch.type ?? current.type,
    title: patch.title?.trim() || current.title,
    url: nextUrl,
    note: nextNote,
    priority: patch.priority ?? current.priority,
    tags: JSON.stringify(nextTags),
    favicon_url: deriveFaviconUrl(nextUrl, patch.favicon_url ?? current.favicon_url),
    remind_at: nextRemindAt,
    updated_at: now
  })

  return getItemById(db, id)
}

export function softDeleteItem(db: Database.Database, id: string): boolean {
  const result = db
    .prepare('UPDATE items SET archived = 1, updated_at = ? WHERE id = ?')
    .run(Date.now(), id)

  return result.changes > 0
}

export function restoreItem(db: Database.Database, id: string): boolean {
  const result = db
    .prepare('UPDATE items SET archived = 0, updated_at = ? WHERE id = ?')
    .run(Date.now(), id)

  return result.changes > 0
}

export function itemsRouter(db: Database.Database, options: ItemsRouterOptions = {}): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(getAllItems(db))
  })

  router.get('/priority/:priority', (req, res) => {
    const priority = req.params.priority
    if (!isPriority(priority)) {
      res.status(400).json({ error: 'Invalid priority' })
      return
    }

    res.json(getItemsByPriority(db, priority))
  })

  router.get('/tag/:tag', (req, res) => {
    res.json(getItemsByTag(db, req.params.tag))
  })

  router.get('/archived', (_req, res) => {
    res.json(getArchivedItems(db))
  })

  router.post('/', (req, res) => {
    const { type, title, url, note, priority, tags, favicon_url, remind_at } = req.body ?? {}

    if ((type !== 'link' && type !== 'idea') || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Invalid item payload' })
      return
    }

    const item = createItem(db, {
      id: nanoid(),
      type,
      title,
      url,
      note,
      priority: isPriority(priority) ? priority : 'inbox',
      tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [],
      favicon_url: typeof favicon_url === 'string' ? favicon_url : null,
      remind_at: coerceNullableNumber(remind_at)
    })

    options.onItemsChanged?.()
    res.status(201).json(item)
  })

  router.patch('/:id', (req, res) => {
    const { type, title, url, note, priority, tags, favicon_url, remind_at } = req.body ?? {}
    const patch: Partial<Omit<ItemMutationInput, 'id'>> = {}

    if (type === 'link' || type === 'idea') {
      patch.type = type
    }
    if (typeof title === 'string') {
      patch.title = title
    }
    if (url !== undefined) {
      patch.url = url
    }
    if (note !== undefined) {
      patch.note = note
    }
    if (priority !== undefined) {
      if (!isPriority(priority)) {
        res.status(400).json({ error: 'Invalid priority' })
        return
      }
      patch.priority = priority
    }
    if (Array.isArray(tags)) {
      patch.tags = tags.filter((tag): tag is string => typeof tag === 'string')
    }
    if (favicon_url !== undefined) {
      patch.favicon_url = typeof favicon_url === 'string' ? favicon_url : null
    }
    if (remind_at !== undefined) {
      patch.remind_at = coerceNullableNumber(remind_at)
    }

    const item = updateItem(db, req.params.id, patch)
    if (!item) {
      res.status(404).json({ error: 'Item not found' })
      return
    }

    options.onItemsChanged?.()
    res.json(item)
  })

  router.delete('/:id', (req, res) => {
    const deleted = softDeleteItem(db, req.params.id)
    if (!deleted) {
      res.status(404).json({ error: 'Item not found' })
      return
    }

    options.onItemsChanged?.()
    res.status(204).send()
  })

  router.post('/:id/restore', (req, res) => {
    const restored = restoreItem(db, req.params.id)
    if (!restored) {
      res.status(404).json({ error: 'Item not found' })
      return
    }

    options.onItemsChanged?.()
    res.status(204).send()
  })

  return router
}
