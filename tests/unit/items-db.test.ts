import Database from 'better-sqlite3'
import {
  appendItemNote,
  archiveItem,
  createItem,
  deleteItemPermanently,
  getArchivedItems,
  getDistinctTags,
  getItemsByPriority,
  getItemsByTag,
  updateItem,
  restoreItem
} from '../../src/main/api/items'
import { runMigrations } from '../../src/main/db/migrations'

describe('items db helpers', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    runMigrations(db)
  })

  afterEach(() => {
    db.close()
  })

  const base = {
    id: 'abc123',
    type: 'link' as const,
    title: 'Ollama',
    url: 'https://github.com/ollama/ollama',
    note: '',
    priority: 'today' as const,
    tags: ['GitHub', 'AI'],
    favicon_url: null,
    remind_at: null
  }

  it('createItem inserts and returns an item', () => {
    const item = createItem(db, base)

    expect(item.id).toBe('abc123')
    expect(item.title).toBe('Ollama')
    expect(item.favicon_url).toContain('google.com')
  })

  it('normalizes legacy for-now items into today', () => {
    const item = createItem(db, {
      ...base,
      id: 'legacy-now',
      priority: 'for-now'
    })

    expect(item.priority).toBe('today')
    expect(getItemsByPriority(db, 'today')).toHaveLength(1)
  })

  it('derives an idea title from notes when title is blank', () => {
    const item = createItem(db, {
      ...base,
      id: 'note-only',
      type: 'idea',
      title: '',
      note: 'Buy fruit\nMilk\nEggs',
      url: null,
      priority: 'inbox',
      tags: []
    })

    expect(item.title).toBe('Buy fruit')
    expect(item.note).toBe('Milk\nEggs')
  })

  it('stores initial idea note history and appends new notes', () => {
    const item = createItem(db, {
      ...base,
      id: 'threaded-idea',
      type: 'idea',
      title: 'New workflow',
      note: 'Initial thought',
      url: null,
      priority: 'today',
      tags: ['Roadmap']
    })

    expect(item.note_entries).toHaveLength(1)
    expect(item.note_entries[0].content).toBe('Initial thought')

    const updated = appendItemNote(db, 'threaded-idea', 'Second note')

    expect(updated?.note).toBe('Second note')
    expect(updated?.note_entries).toHaveLength(2)
    expect(updated?.note_entries[1].content).toBe('Second note')
  })

  it('getItemsByPriority returns matching non-archived items', () => {
    createItem(db, base)

    const items = getItemsByPriority(db, 'today')
    expect(items).toHaveLength(1)
    expect(items[0].tags).toEqual(['GitHub', 'AI'])
  })

  it('getItemsByTag is case insensitive', () => {
    createItem(db, base)
    createItem(db, {
      ...base,
      id: 'def456',
      title: 'Another',
      tags: ['youtube']
    })

    expect(getItemsByTag(db, 'github')).toHaveLength(1)
    expect(getItemsByTag(db, 'YouTube')).toHaveLength(1)
  })

  it('updateItem changes fields and normalizes tags', () => {
    createItem(db, base)
    const updated = updateItem(db, 'abc123', {
      title: 'Updated',
      priority: 'someday',
      tags: ['github', 'Research', 'research']
    })

    expect(updated?.title).toBe('Updated')
    expect(updated?.priority).toBe('someday')
    expect(updated?.tags).toEqual(['GitHub', 'Research'])
  })

  it('soft deletes and restores items', () => {
    createItem(db, base)

    expect(archiveItem(db, 'abc123')).toBe(true)
    expect(getItemsByPriority(db, 'today')).toHaveLength(0)
    expect(getArchivedItems(db)).toHaveLength(1)

    expect(restoreItem(db, 'abc123')).toBe(true)
    expect(getItemsByPriority(db, 'today')).toHaveLength(1)
  })

  it('permanently deletes items', () => {
    createItem(db, base)

    expect(deleteItemPermanently(db, 'abc123')).toBe(true)
    expect(getItemsByPriority(db, 'today')).toHaveLength(0)
    expect(getArchivedItems(db)).toHaveLength(0)
  })

  it('getDistinctTags returns normalized tag names', () => {
    createItem(db, base)
    createItem(db, {
      ...base,
      id: 'ghi789',
      title: 'More',
      tags: ['github', 'Notes']
    })

    expect(getDistinctTags(db)).toEqual(['AI', 'GitHub', 'Notes'])
  })
})
