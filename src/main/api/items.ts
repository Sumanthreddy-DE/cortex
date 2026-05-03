import Database from 'better-sqlite3'
import { Router } from 'express'
import { nanoid } from 'nanoid'
import { normalizePriority, PRIORITIES, type Priority } from '../../shared/constants'
export type ItemType = 'link' | 'idea'

export interface ItemNoteEntry {
  id: string
  item_id: string
  content: string
  created_at: number
  updated_at: number
}

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
  completed_at: number | null
  last_opened_at: number | null
  spaces: string[]
  space_pinned: Record<string, boolean>
  created_at: number
  updated_at: number
  note_entries: ItemNoteEntry[]
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
  onInboxItem?: (title: string) => void
}

function deserialize(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    type: row.type as ItemType,
    title: row.title as string,
    url: (row.url as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    priority: normalizePriority(row.priority as Priority),
    tags: JSON.parse((row.tags as string) ?? '[]'),
    favicon_url: (row.favicon_url as string | null) ?? null,
    archived: Number(row.archived ?? 0),
    remind_at: row.remind_at == null ? null : Number(row.remind_at),
    completed_at: row.completed_at == null ? null : Number(row.completed_at),
    last_opened_at: row.last_opened_at == null ? null : Number(row.last_opened_at),
    spaces: [],
    space_pinned: {},
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
    note_entries: []
  }
}

function deserializeNoteEntry(row: Record<string, unknown>): ItemNoteEntry {
  return {
    id: row.id as string,
    item_id: row.item_id as string,
    content: row.content as string,
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

function deriveIdeaFields(title: string, note: string | null): { title: string; note: string | null } {
  const cleanTitle = title.trim()
  const cleanNote = note?.trim() ?? ''

  if (cleanTitle) {
    return {
      title: cleanTitle,
      note: cleanNote || null
    }
  }

  if (!cleanNote) {
    return {
      title: '',
      note: null
    }
  }

  const lines = cleanNote
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const derivedTitle = (lines[0] ?? cleanNote).slice(0, 120)
  const remainingNote = lines.slice(1).join('\n').trim()

  return {
    title: derivedTitle,
    note: remainingNote || null
  }
}

function deriveLinkTitle(title: string, url: string | null): string {
  const cleanTitle = title.trim()
  if (cleanTitle) {
    return cleanTitle
  }

  return url?.replace(/^https?:\/\//i, '') ?? ''
}

function attachNoteEntries(db: Database.Database, items: Item[]): Item[] {
  if (items.length === 0) {
    return items
  }

  const placeholders = items.map(() => '?').join(', ')
  const rows = db
    .prepare(`
      SELECT id, item_id, content, created_at, updated_at
      FROM item_notes
      WHERE item_id IN (${placeholders})
      ORDER BY created_at ASC, updated_at ASC
    `)
    .all(...items.map((item) => item.id)) as Record<string, unknown>[]

  const entriesByItemId = new Map<string, ItemNoteEntry[]>()
  for (const row of rows) {
    const entry = deserializeNoteEntry(row)
    entriesByItemId.set(entry.item_id, [...(entriesByItemId.get(entry.item_id) ?? []), entry])
  }

  return attachSpaceEntries(db, items.map((item) => ({
    ...item,
    note_entries: entriesByItemId.get(item.id) ?? []
  })))
}

function attachSpaceEntries(db: Database.Database, items: Item[]): Item[] {
  if (items.length === 0) {
    return items
  }

  const placeholders = items.map(() => '?').join(', ')
  const rows = db
    .prepare(`
      SELECT space_id, item_id, pinned
      FROM space_items
      WHERE item_id IN (${placeholders})
      ORDER BY added_at ASC
    `)
    .all(...items.map((item) => item.id)) as Array<{
      space_id: string
      item_id: string
      pinned: number
    }>

  const byItemId = new Map<string, Array<{ space_id: string; pinned: number }>>()
  for (const row of rows) {
    byItemId.set(row.item_id, [...(byItemId.get(row.item_id) ?? []), row])
  }

  return items.map((item) => {
    const spaces = byItemId.get(item.id) ?? []
    return {
      ...item,
      spaces: spaces.map((entry) => entry.space_id),
      space_pinned: Object.fromEntries(spaces.map((entry) => [entry.space_id, entry.pinned === 1]))
    }
  })
}

function appendInitialIdeaNote(
  db: Database.Database,
  itemId: string,
  content: string | null | undefined,
  timestamp: number
): void {
  const trimmed = content?.trim()
  if (!trimmed) {
    return
  }

  db.prepare(`
    INSERT INTO item_notes (id, item_id, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(nanoid(), itemId, trimmed, timestamp, timestamp)
}

function readItemRow(db: Database.Database, id: string): Record<string, unknown> | undefined {
  return db
    .prepare('SELECT * FROM items WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined
}

export function getItemById(db: Database.Database, id: string): Item | null {
  const row = readItemRow(db, id)
  return row ? attachNoteEntries(db, [deserialize(row)])[0] ?? null : null
}

export function getDistinctTags(db: Database.Database): string[] {
  const rows = db
    .prepare(`
      SELECT DISTINCT json_each.value AS tag
      FROM items, json_each(items.tags)
      WHERE items.archived = 0
        AND items.completed_at IS NULL
      ORDER BY LOWER(tag) ASC
    `)
    .all() as Array<{ tag: string }>

  return rows.map((row) => row.tag)
}

export function updateItemTitle(db: Database.Database, id: string, title: string): void {
  db.prepare('UPDATE items SET title = ?, updated_at = ? WHERE id = ?')
    .run(title.slice(0, 200), Date.now(), id)
}

export function createItem(db: Database.Database, input: ItemMutationInput): Item {
  const now = Date.now()
  const tags = normalizeTags(db, input.tags)
  const nextUrl = coerceNullableText(input.url)
  const nextNote = coerceNullableText(input.note)
  const nextPriority = normalizePriority(input.priority)
  const nextFields =
    input.type === 'idea'
      ? deriveIdeaFields(input.title, nextNote)
      : { title: deriveLinkTitle(input.title, nextUrl), note: nextNote }

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
      completed_at,
      last_opened_at,
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
      NULL,
      NULL,
      @created_at,
      @updated_at
    )
  `).run({
    id: input.id,
    type: input.type,
    title: nextFields.title,
    url: nextUrl,
    note: nextFields.note,
    priority: nextPriority,
    tags: JSON.stringify(tags),
    favicon_url: deriveFaviconUrl(nextUrl, input.favicon_url),
    remind_at: input.remind_at ?? null,
    created_at: now,
    updated_at: now
  })

  if (input.type === 'idea') {
    appendInitialIdeaNote(db, input.id, input.note, now)
  }

  return getItemById(db, input.id)!
}

export function getAllItems(db: Database.Database): Item[] {
  const rows = db
    .prepare(`
      SELECT *
      FROM items
      WHERE archived = 0
        AND completed_at IS NULL
      ORDER BY updated_at DESC, created_at DESC
    `)
    .all() as Record<string, unknown>[]

  return attachNoteEntries(db, rows.map(deserialize))
}

export function getCompletedItems(db: Database.Database): Item[] {
  const rows = db
    .prepare(`
      SELECT *
      FROM items
      WHERE completed_at IS NOT NULL
      ORDER BY completed_at DESC, updated_at DESC
    `)
    .all() as Record<string, unknown>[]

  return attachNoteEntries(db, rows.map(deserialize))
}

export function getItemsByPriority(db: Database.Database, priority: Priority): Item[] {
  const rows = db
    .prepare(`
      SELECT *
      FROM items
      WHERE priority = ?
        AND archived = 0
        AND completed_at IS NULL
      ORDER BY created_at ASC
    `)
    .all(priority) as Record<string, unknown>[]

  return attachNoteEntries(db, rows.map(deserialize))
}

export function getItemsByTag(db: Database.Database, tag: string): Item[] {
  const rows = db
    .prepare(`
      SELECT *
      FROM items
      WHERE archived = 0
        AND completed_at IS NULL
        AND EXISTS (
          SELECT 1
          FROM json_each(items.tags)
          WHERE LOWER(json_each.value) = LOWER(?)
        )
      ORDER BY updated_at DESC, created_at DESC
    `)
    .all(tag) as Record<string, unknown>[]

  return attachNoteEntries(db, rows.map(deserialize))
}

export function getArchivedItems(db: Database.Database): Item[] {
  const rows = db
    .prepare(`
      SELECT *
      FROM items
      WHERE archived = 1
        AND completed_at IS NULL
      ORDER BY updated_at DESC
    `)
    .all() as Record<string, unknown>[]

  return attachNoteEntries(db, rows.map(deserialize))
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

  const nextType = patch.type ?? current.type
  const nextUrl = patch.url !== undefined ? coerceNullableText(patch.url) : current.url
  const nextNote = patch.note !== undefined ? coerceNullableText(patch.note) : current.note
  const nextTags = patch.tags ? normalizeTags(db, patch.tags, current.tags) : current.tags
  const nextRemindAt =
    patch.remind_at !== undefined ? coerceNullableNumber(patch.remind_at) : current.remind_at
  const nextPriority =
    patch.priority !== undefined ? normalizePriority(patch.priority) : normalizePriority(current.priority)
  const nextFields =
    nextType === 'idea'
      ? deriveIdeaFields(patch.title ?? current.title, nextNote)
      : { title: deriveLinkTitle(patch.title ?? current.title, nextUrl), note: nextNote }
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
    type: nextType,
    title: nextFields.title,
    url: nextUrl,
    note: nextFields.note,
    priority: nextPriority,
    tags: JSON.stringify(nextTags),
    favicon_url: deriveFaviconUrl(nextUrl, patch.favicon_url ?? current.favicon_url),
    remind_at: nextRemindAt,
    updated_at: now
  })

  return getItemById(db, id)
}

export function appendItemNote(db: Database.Database, id: string, content: string): Item | null {
  const current = getItemById(db, id)
  const trimmed = content.trim()

  if (!current || current.type !== 'idea' || !trimmed) {
    return null
  }

  const now = Date.now()

  db.prepare(`
    INSERT INTO item_notes (id, item_id, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(nanoid(), id, trimmed, now, now)

  db.prepare(`
    UPDATE items
    SET note = ?, updated_at = ?
    WHERE id = ?
  `).run(trimmed, now, id)

  return getItemById(db, id)
}

export function archiveItem(db: Database.Database, id: string): boolean {
  const result = db
    .prepare('UPDATE items SET archived = 1, updated_at = ? WHERE id = ?')
    .run(Date.now(), id)

  return result.changes > 0
}

export function deleteItemPermanently(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM items WHERE id = ?').run(id)
  return result.changes > 0
}

export function restoreItem(db: Database.Database, id: string): boolean {
  const result = db
    .prepare('UPDATE items SET archived = 0, updated_at = ? WHERE id = ?')
    .run(Date.now(), id)

  return result.changes > 0
}

export function touchItem(db: Database.Database, id: string): Item | null {
  const now = Date.now()
  const result = db
    .prepare('UPDATE items SET last_opened_at = ?, updated_at = ? WHERE id = ?')
    .run(now, now, id)

  return result.changes > 0 ? getItemById(db, id) : null
}

export function completeItem(db: Database.Database, id: string): Item | null {
  const now = Date.now()
  const result = db
    .prepare('UPDATE items SET completed_at = ?, updated_at = ? WHERE id = ?')
    .run(now, now, id)

  return result.changes > 0 ? getItemById(db, id) : null
}

export function uncompleteItem(db: Database.Database, id: string): Item | null {
  const now = Date.now()
  const result = db
    .prepare('UPDATE items SET completed_at = NULL, updated_at = ? WHERE id = ?')
    .run(now, id)

  return result.changes > 0 ? getItemById(db, id) : null
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

  router.get('/completed', (_req, res) => {
    res.json(getCompletedItems(db))
  })

  router.post('/', (req, res) => {
    const { type, title, url, note, priority, tags, favicon_url, remind_at } = req.body ?? {}

    const titleValue = typeof title === 'string' ? title : ''
    const urlValue = typeof url === 'string' ? url : ''
    const noteValue = typeof note === 'string' ? note : ''
    const hasIdeaContent = titleValue.trim() || noteValue.trim()
    const hasLinkContent = titleValue.trim() || urlValue.trim()

    if (
      (type !== 'link' && type !== 'idea') ||
      (type === 'idea' && !hasIdeaContent) ||
      (type === 'link' && !hasLinkContent)
    ) {
      res.status(400).json({ error: 'Invalid item payload' })
      return
    }

    const resolvedPriority = isPriority(priority) ? priority : 'inbox'
    const item = createItem(db, {
      id: nanoid(),
      type,
      title: titleValue,
      url,
      note: noteValue,
      priority: resolvedPriority,
      tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [],
      favicon_url: typeof favicon_url === 'string' ? favicon_url : null,
      remind_at: coerceNullableNumber(remind_at)
    })

    options.onItemsChanged?.()
    if (resolvedPriority === 'inbox') {
      options.onInboxItem?.(item.title)
    }
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

  router.post('/:id/notes', (req, res) => {
    const { content } = req.body ?? {}

    if (typeof content !== 'string' || !content.trim()) {
      res.status(400).json({ error: 'content is required' })
      return
    }

    const item = appendItemNote(db, req.params.id, content)
    if (!item) {
      res.status(404).json({ error: 'Idea not found' })
      return
    }

    options.onItemsChanged?.()
    res.status(201).json(item)
  })

  router.post('/:id/archive', (req, res) => {
    const archived = archiveItem(db, req.params.id)
    if (!archived) {
      res.status(404).json({ error: 'Item not found' })
      return
    }

    options.onItemsChanged?.()
    res.status(204).send()
  })

  router.post('/:id/complete', (req, res) => {
    const item = completeItem(db, req.params.id)
    if (!item) {
      res.status(404).json({ error: 'Item not found' })
      return
    }

    options.onItemsChanged?.()
    res.json(item)
  })

  router.post('/:id/uncomplete', (req, res) => {
    const item = uncompleteItem(db, req.params.id)
    if (!item) {
      res.status(404).json({ error: 'Item not found' })
      return
    }

    options.onItemsChanged?.()
    res.json(item)
  })

  router.delete('/:id', (req, res) => {
    const deleted = deleteItemPermanently(db, req.params.id)
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

  router.post('/:id/touch', (req, res) => {
    const item = touchItem(db, req.params.id)
    if (!item) {
      res.status(404).json({ error: 'Item not found' })
      return
    }

    res.json(item)
  })

  return router
}
