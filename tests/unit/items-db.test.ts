import Database from 'better-sqlite3'
import {
  createItem,
  getArchivedItems,
  getDistinctTags,
  getItemsByPriority,
  getItemsByTag,
  updateItem,
  softDeleteItem,
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

    expect(softDeleteItem(db, 'abc123')).toBe(true)
    expect(getItemsByPriority(db, 'today')).toHaveLength(0)
    expect(getArchivedItems(db)).toHaveLength(1)

    expect(restoreItem(db, 'abc123')).toBe(true)
    expect(getItemsByPriority(db, 'today')).toHaveLength(1)
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
