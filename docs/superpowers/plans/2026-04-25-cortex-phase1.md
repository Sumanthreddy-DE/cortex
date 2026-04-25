# Cortex Phase 1 — Core App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Cortex desktop app — Electron shell with React frontend, SQLite database, Priority view (Kanban), Category view (drag-and-drop), Edit modal, full-text search, card hover effect, system tray, and archive.

**Architecture:** Electron main process hosts an embedded Express server (port 51204) and a better-sqlite3 database. The React renderer (Vite) communicates with the API via fetch. System tray lives in the main process. All data is local — one SQLite file on disk.

**Tech Stack:** Electron 28+, React 18, Vite, TypeScript, better-sqlite3, Express 4, Vitest, Supertest, Playwright, Lucide React, Inter (Google Fonts)

---

## File Map

```
cortex/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json                        # base tsconfig
├── tsconfig.node.json                   # main process
├── tsconfig.web.json                    # renderer
├── .gitignore
│
├── src/
│   ├── shared/
│   │   └── constants.ts                 # API_PORT and other shared constants
│   ├── main/
│   │   ├── index.ts                     # Electron entry — BrowserWindow, app lifecycle
│   │   ├── tray.ts                      # System tray icon + menu
│   │   ├── server.ts                    # Express app bootstrap + mount routes
│   │   ├── db/
│   │   │   ├── connection.ts            # SQLite singleton
│   │   │   └── migrations.ts            # Schema creation + FTS5 triggers
│   │   └── api/
│   │       ├── items.ts                 # CRUD routes: GET/POST/PATCH/DELETE /api/items
│   │       └── search.ts                # GET /api/search?q=
│   │
│   ├── preload/
│   │   └── index.ts                     # contextBridge (minimal — only exposes versions)
│   │
│   └── renderer/
│       ├── index.html
│       ├── main.tsx                     # React entry
│       ├── App.tsx                      # Root: view state, modal state
│       ├── styles/
│       │   ├── globals.css              # CSS variables, reset, Inter font
│       │   └── hover.css                # Card hover effect (specular + lift)
│       ├── components/
│       │   ├── TopBar.tsx               # Logo, Priority/Category toggle, search, +Add
│       │   ├── PriorityView.tsx         # 5-column kanban layout
│       │   ├── CategoryView.tsx         # Tag-grouped cards + HTML5 DnD
│       │   ├── Card.tsx                 # Link card (favicon + title)
│       │   ├── IdeaCard.tsx             # Idea card (orange border + note)
│       │   ├── EditModal.tsx            # Add/edit modal for both types
│       │   └── SearchResults.tsx        # Flat results list with highlight
│       ├── hooks/
│       │   ├── useItems.ts              # Fetch + mutate items, local state
│       │   └── useSearch.ts             # Debounced search query
│       └── lib/
│           └── api.ts                   # Typed fetch wrapper for all endpoints
│
├── resources/
│   └── tray-icon.png                    # 16x16 PNG for Windows tray
│
└── tests/
    ├── unit/
    │   ├── migrations.test.ts           # Schema setup, FTS triggers
    │   └── items-db.test.ts             # Direct DB queries (no HTTP)
    ├── integration/
    │   └── api.test.ts                  # Express routes via Supertest
    └── e2e/
        └── app.spec.ts                  # Playwright: priority view, category DnD, edit modal
```

---

## Task 1: Scaffold the Project

**Files:**
- Create: `cortex/` (new project root)
- Create: `package.json`, `electron.vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`, `.gitignore`

- [ ] **Step 1: Scaffold with electron-vite**

```bash
cd "C:/Users/suman/Desktop/Docs/Job/Projects"
npm create electron-vite@latest cortex -- --template react-ts
cd cortex
npm install
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install better-sqlite3 express cors nanoid node-cron lucide-react
npm install --save-dev @types/better-sqlite3 @types/express @types/cors @types/node-cron vitest supertest @types/supertest @playwright/test
```

- [ ] **Step 3: Install Inter font**

In `src/renderer/index.html`, add inside `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 4: Configure Vitest in `electron.vite.config.ts`**

```typescript
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: { rollupOptions: { external: ['better-sqlite3'] } }
  },
  preload: {},
  renderer: {
    plugins: [react()],
    test: {
      globals: true,
      environment: 'jsdom'
    }
  }
})
```

Add to `package.json` scripts:
```json
"test:unit": "vitest run tests/unit",
"test:integration": "vitest run tests/integration",
"test:e2e": "playwright test tests/e2e"
```

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```
Expected: Electron window opens with default Vite template page.

- [ ] **Step 6: Create `src/shared/constants.ts`**

```typescript
// src/shared/constants.ts
export const API_PORT = 51204
export const API_BASE = `http://127.0.0.1:${API_PORT}`
```

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold cortex with electron-vite react-ts template"
```

---

## Task 2: SQLite Schema + Migrations

**Files:**
- Create: `src/main/db/connection.ts`
- Create: `src/main/db/migrations.ts`
- Create: `tests/unit/migrations.test.ts`

- [ ] **Step 1: Write the failing migration test**

```typescript
// tests/unit/migrations.test.ts
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'

describe('migrations', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    runMigrations(db)
  })

  afterEach(() => db.close())

  it('creates items table with correct columns', () => {
    const row = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='items'
    `).get()
    expect(row).toBeDefined()
  })

  it('creates FTS5 virtual table', () => {
    const row = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='items_fts'
    `).get()
    expect(row).toBeDefined()
  })

  it('creates meta table with default values', () => {
    const row = db.prepare(`SELECT value FROM meta WHERE key='last_midnight_run'`).get() as any
    expect(row?.value).toBe('0')
    const digest = db.prepare(`SELECT value FROM meta WHERE key='morning_digest_time'`).get() as any
    expect(digest?.value).toBe('08:00')
  })

  it('items table has inbox and remind_at columns', () => {
    const info = db.prepare(`PRAGMA table_info(items)`).all() as Array<{ name: string }>
    const cols = info.map(c => c.name)
    expect(cols).toContain('remind_at')
    // inbox is a valid priority value
    expect(() => db.prepare(`
      INSERT INTO items (id,type,title,priority,tags,created_at,updated_at)
      VALUES ('x','idea','test','inbox','[]',1,1)
    `).run()).not.toThrow()
  })

  it('FTS index updates when item is inserted', () => {
    db.prepare(`
      INSERT INTO items (id,type,title,url,note,priority,tags,created_at,updated_at)
      VALUES ('1','link','Ollama repo','https://github.com/ollama/ollama','','today','[]',1,1)
    `).run()
    const result = db.prepare(`SELECT * FROM items_fts WHERE items_fts MATCH 'Ollama'`).all()
    expect(result.length).toBe(1)
  })

  it('FTS index updates when item is deleted', () => {
    db.prepare(`
      INSERT INTO items (id,type,title,url,note,priority,tags,created_at,updated_at)
      VALUES ('2','link','Ollama repo','https://github.com/ollama/ollama','','today','[]',1,1)
    `).run()
    db.prepare(`DELETE FROM items WHERE id='2'`).run()
    const result = db.prepare(`SELECT * FROM items_fts WHERE items_fts MATCH 'Ollama'`).all()
    expect(result.length).toBe(0)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test:unit -- migrations
```
Expected: FAIL — `runMigrations` not found

- [ ] **Step 3: Write `migrations.ts`**

```typescript
// src/main/db/migrations.ts
import Database from 'better-sqlite3'

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id          TEXT    PRIMARY KEY,
      type        TEXT    NOT NULL CHECK(type IN ('link','idea')),
      title       TEXT    NOT NULL,
      url         TEXT,
      note        TEXT,
      -- 'inbox' is the unreviewed landing zone for bot-captured and quick-add items
      priority    TEXT    NOT NULL CHECK(priority IN ('inbox','for-now','today','tomorrow','this-week','someday')),
      tags        TEXT    NOT NULL DEFAULT '[]',
      favicon_url TEXT,
      archived    INTEGER NOT NULL DEFAULT 0,
      -- remind_at: Unix ms timestamp, nullable. Per-minute cron fires notification when due.
      remind_at   INTEGER,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
      title, url, note,
      content='items',
      content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
      INSERT INTO items_fts(rowid,title,url,note)
      VALUES (new.rowid, new.title, COALESCE(new.url,''), COALESCE(new.note,''));
    END;

    CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
      INSERT INTO items_fts(items_fts,rowid,title,url,note)
      VALUES ('delete', old.rowid, old.title, COALESCE(old.url,''), COALESCE(old.note,''));
    END;

    CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
      INSERT INTO items_fts(items_fts,rowid,title,url,note)
      VALUES ('delete', old.rowid, old.title, COALESCE(old.url,''), COALESCE(old.note,''));
      INSERT INTO items_fts(rowid,title,url,note)
      VALUES (new.rowid, new.title, COALESCE(new.url,''), COALESCE(new.note,''));
    END;

    -- meta table: app-level key/value store for cron idempotency and user preferences
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO meta VALUES ('last_midnight_run', '0');
    INSERT OR IGNORE INTO meta VALUES ('morning_digest_time', '08:00');
  `)
}
```

- [ ] **Step 4: Write `connection.ts`**

```typescript
// src/main/db/connection.ts
import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { runMigrations } from './migrations'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db
  const dbPath = app
    ? path.join(app.getPath('userData'), 'cortex.db')
    : ':memory:'
  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  runMigrations(_db)
  return _db
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm run test:unit -- migrations
```
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/db/ tests/unit/migrations.test.ts
git commit -m "feat: sqlite schema with FTS5 full-text search"
```

---

## Task 3: Items API — CRUD Routes

**Files:**
- Create: `src/main/api/items.ts`
- Create: `src/main/server.ts`
- Create: `tests/unit/items-db.test.ts`
- Create: `tests/integration/api.test.ts`

- [ ] **Step 1: Write failing unit tests for DB layer**

```typescript
// tests/unit/items-db.test.ts
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import {
  createItem, getItemsByPriority, getItemsByTag,
  updateItem, softDeleteItem, restoreItem
} from '../../src/main/api/items'

let db: Database.Database
beforeEach(() => { db = new Database(':memory:'); runMigrations(db) })
afterEach(() => db.close())

const base = {
  id: 'abc123', type: 'link' as const, title: 'Ollama',
  url: 'https://github.com/ollama/ollama', note: '',
  priority: 'today' as const, tags: ['AI', 'GitHub'],
  favicon_url: null, archived: 0
}

it('createItem inserts and returns item', () => {
  const item = createItem(db, base)
  expect(item.id).toBe('abc123')
  expect(item.title).toBe('Ollama')
})

it('getItemsByPriority returns items for column', () => {
  createItem(db, base)
  const items = getItemsByPriority(db, 'today')
  expect(items.length).toBe(1)
  expect(items[0].tags).toEqual(['AI', 'GitHub'])
})

it('getItemsByTag returns items with matching tag', () => {
  createItem(db, base)
  createItem(db, { ...base, id: 'def456', tags: ['YouTube'] })
  const aiItems = getItemsByTag(db, 'AI')
  expect(aiItems.length).toBe(1)
})

it('updateItem changes title and priority', () => {
  createItem(db, base)
  updateItem(db, 'abc123', { title: 'Updated', priority: 'someday' })
  const items = getItemsByPriority(db, 'someday')
  expect(items[0].title).toBe('Updated')
})

it('softDeleteItem sets archived=1', () => {
  createItem(db, base)
  softDeleteItem(db, 'abc123')
  const items = getItemsByPriority(db, 'today')
  expect(items.length).toBe(0)
})

it('restoreItem sets archived=0', () => {
  createItem(db, base)
  softDeleteItem(db, 'abc123')
  restoreItem(db, 'abc123')
  const items = getItemsByPriority(db, 'today')
  expect(items.length).toBe(1)
})
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test:unit -- items-db
```
Expected: FAIL — functions not found

- [ ] **Step 3: Implement `src/main/api/items.ts`**

```typescript
// src/main/api/items.ts
import Database from 'better-sqlite3'
import { Router } from 'express'
import { nanoid } from 'nanoid'
import { getDb } from '../db/connection'

export type Priority = 'inbox' | 'for-now' | 'today' | 'tomorrow' | 'this-week' | 'someday'
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
  remind_at: number | null  // Unix ms timestamp — per-minute cron fires notification when due
  created_at: number
  updated_at: number
}

function deserialize(row: Record<string, unknown>): Item {
  return {
    ...row,
    tags: JSON.parse(row.tags as string),
    remind_at: (row.remind_at as number | null) ?? null
  } as Item
}

export function createItem(db: Database.Database, input: Omit<Item, 'created_at' | 'updated_at'>): Item {
  const now = Date.now()
  db.prepare(`
    INSERT INTO items (id,type,title,url,note,priority,tags,favicon_url,archived,remind_at,created_at,updated_at)
    VALUES (@id,@type,@title,@url,@note,@priority,@tags,@favicon_url,@archived,@remind_at,@created_at,@updated_at)
  `).run({
    ...input,
    tags: JSON.stringify(input.tags),
    favicon_url: input.favicon_url ?? null,
    url: input.url ?? null,
    note: input.note ?? null,
    archived: 0,
    remind_at: input.remind_at ?? null,
    created_at: now,
    updated_at: now
  })
  return getItemById(db, input.id)!
}

export function getItemById(db: Database.Database, id: string): Item | null {
  const row = db.prepare('SELECT * FROM items WHERE id=?').get(id) as Record<string, unknown> | undefined
  return row ? deserialize(row) : null
}

export function getItemsByPriority(db: Database.Database, priority: Priority): Item[] {
  const rows = db.prepare(
    'SELECT * FROM items WHERE priority=? AND archived=0 ORDER BY created_at ASC'
  ).all(priority) as Record<string, unknown>[]
  return rows.map(deserialize)
}

export function getItemsByTag(db: Database.Database, tag: string): Item[] {
  const rows = db.prepare(
    `SELECT * FROM items WHERE tags LIKE ? AND archived=0`
  ).all(`%"${tag}"%`) as Record<string, unknown>[]
  return rows.map(deserialize)
}

export function getAllItems(db: Database.Database): Item[] {
  const rows = db.prepare(
    'SELECT * FROM items WHERE archived=0 ORDER BY created_at ASC'
  ).all() as Record<string, unknown>[]
  return rows.map(deserialize)
}

export function updateItem(db: Database.Database, id: string, patch: Partial<Omit<Item, 'id'>>): Item {
  const current = getItemById(db, id)!
  const merged = { ...current, ...patch, updated_at: Date.now() }
  db.prepare(`
    UPDATE items SET type=@type,title=@title,url=@url,note=@note,
    priority=@priority,tags=@tags,favicon_url=@favicon_url,updated_at=@updated_at
    WHERE id=@id
  `).run({ ...merged, tags: JSON.stringify(merged.tags) })
  return getItemById(db, id)!
}

export function softDeleteItem(db: Database.Database, id: string): void {
  db.prepare('UPDATE items SET archived=1, updated_at=? WHERE id=?').run(Date.now(), id)
}

export function restoreItem(db: Database.Database, id: string): void {
  db.prepare('UPDATE items SET archived=0, updated_at=? WHERE id=?').run(Date.now(), id)
}

export function getArchivedItems(db: Database.Database): Item[] {
  const rows = db.prepare(
    'SELECT * FROM items WHERE archived=1 ORDER BY updated_at DESC'
  ).all() as Record<string, unknown>[]
  return rows.map(deserialize)
}

// ── Express router ──
// db is injected as a param — never call getDb() here at import time.
// This makes the router testable without mocking: just pass a test :memory: db.
export function itemsRouter(db: Database.Database): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(getAllItems(db))
  })

  router.get('/priority/:priority', (req, res) => {
    res.json(getItemsByPriority(db, req.params.priority as Priority))
  })

  router.get('/tag/:tag', (req, res) => {
    res.json(getItemsByTag(db, req.params.tag))
  })

  router.get('/archived', (_req, res) => {
    res.json(getArchivedItems(db))
  })

  router.post('/', (req, res) => {
    const { type, title, url, note, priority, tags, favicon_url, remind_at } = req.body
    const item = createItem(db, {
      id: nanoid(),
      type, title, url: url ?? null, note: note ?? null,
      priority: priority ?? 'inbox',  // default to Inbox for quick captures
      tags: tags ?? [],
      favicon_url: favicon_url ?? null,
      archived: 0,
      remind_at: remind_at ?? null
    })
    res.status(201).json(item)
  })

  router.patch('/:id', (req, res) => {
    const item = getItemById(db, req.params.id)
    if (!item) return res.status(404).json({ error: 'not found' })
    res.json(updateItem(db, req.params.id, req.body))
  })

  router.delete('/:id', (req, res) => {
    const item = getItemById(db, req.params.id)
    if (!item) return res.status(404).json({ error: 'not found' })
    softDeleteItem(db, req.params.id)
    res.status(204).end()
  })

  router.post('/:id/restore', (req, res) => {
    restoreItem(db, req.params.id)
    res.json(getItemById(db, req.params.id))
  })

  return router
}
```

- [ ] **Step 4: Run unit tests — verify pass**

```bash
npm run test:unit -- items-db
```
Expected: 6 tests PASS

- [ ] **Step 5: Write integration tests**

```typescript
// tests/integration/api.test.ts
// No mocking needed — routers accept db as a param, so we just pass an in-memory db directly.
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { itemsRouter, Item } from '../../src/main/api/items'
import { searchRouter } from '../../src/main/api/search'

let testDb: Database.Database

beforeAll(() => {
  testDb = new Database(':memory:')
  runMigrations(testDb)
})

const app = express()
app.use(express.json())
// Pass test db directly — no getDb() call, no vi.mock() needed
app.use('/api/items', itemsRouter(testDb))
app.use('/api/search', searchRouter(testDb))

describe('GET /api/items', () => {
  it('returns empty array initially', async () => {
    const res = await request(app).get('/api/items')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('POST /api/items', () => {
  it('creates a link item', async () => {
    const res = await request(app).post('/api/items').send({
      type: 'link', title: 'Ollama',
      url: 'https://github.com/ollama/ollama',
      priority: 'today', tags: ['AI', 'GitHub']
    })
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Ollama')
    expect(res.body.tags).toEqual(['AI', 'GitHub'])
  })
})

describe('PATCH /api/items/:id', () => {
  it('updates priority', async () => {
    const create = await request(app).post('/api/items').send({
      type: 'idea', title: 'My idea', priority: 'today', tags: []
    })
    const id = create.body.id
    const res = await request(app).patch(`/api/items/${id}`).send({ priority: 'someday' })
    expect(res.status).toBe(200)
    expect(res.body.priority).toBe('someday')
  })
})

describe('DELETE /api/items/:id', () => {
  it('soft deletes — item gone from list', async () => {
    const create = await request(app).post('/api/items').send({
      type: 'link', title: 'To delete', url: 'https://example.com',
      priority: 'today', tags: []
    })
    const id = create.body.id
    await request(app).delete(`/api/items/${id}`)
    const list = await request(app).get('/api/items')
    expect(list.body.find((i: Item) => i.id === id)).toBeUndefined()
  })
})
```

- [ ] **Step 6: Run integration tests**

```bash
npm run test:integration
```
Expected: 4 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/main/api/items.ts tests/unit/items-db.test.ts tests/integration/api.test.ts
git commit -m "feat: items CRUD API with SQLite backend"
```

---

## Task 4: Search API (FTS5)

**Files:**
- Create: `src/main/api/search.ts`
- Add test to: `tests/integration/api.test.ts`

- [ ] **Step 1: Add failing search test**

Append to `tests/integration/api.test.ts`:
```typescript
describe('GET /api/search', () => {
  it('finds items by title keyword', async () => {
    await request(app).post('/api/items').send({
      type: 'link', title: 'Karpathy makemore lecture',
      url: 'https://youtube.com/watch?v=123',
      priority: 'today', tags: ['YouTube']
    })
    const res = await request(app).get('/api/search?q=makemore')
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(1)
    expect(res.body[0].title).toContain('makemore')
  })

  it('returns empty array for no matches', async () => {
    const res = await request(app).get('/api/search?q=zzznomatch')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test:integration -- search
```
Expected: FAIL — route not found (404)

- [ ] **Step 3: Implement `src/main/api/search.ts`**

```typescript
// src/main/api/search.ts
import { Router } from 'express'
import Database from 'better-sqlite3'

// db injected as param — same pattern as itemsRouter for testability
export function searchRouter(db: Database.Database): Router {
  const router = Router()

  router.get('/', (req, res) => {
    const q = String(req.query.q ?? '').trim()
    if (!q) return res.json([])

    // FTS5 MATCH — sanitize by escaping quotes, add * for prefix matching
    // "make"* means "make" matches "makemore" — without * only exact tokens match
    const safe = q.replace(/"/g, '""')
    try {
      const rows = db.prepare(`
        SELECT items.* FROM items
        JOIN items_fts ON items.rowid = items_fts.rowid
        WHERE items_fts MATCH ? AND items.archived = 0
        ORDER BY rank
        LIMIT 50
      `).all(`"${safe}"*`)
      const results = (rows as Record<string, unknown>[]).map(r => ({
        ...r, tags: JSON.parse(r.tags as string)
      }))
      res.json(results)
    } catch {
      res.json([]) // malformed FTS query → return empty
    }
  })

  // /api/tags — all distinct tags for autocomplete datalist
  // Used by Edit modal and quick-add window to prevent "github" vs "GitHub" fragmentation
  router.get('/tags', (_req, res) => {
    try {
      const rows = db.prepare(`
        SELECT DISTINCT json_each.value AS tag
        FROM items, json_each(items.tags)
        WHERE items.archived = 0
        ORDER BY tag
      `).all() as Array<{ tag: string }>
      res.json(rows.map(r => r.tag))
    } catch {
      res.json([])
    }
  })

  return router
}
```

- [ ] **Step 4: Mount in `server.ts`**

```typescript
// src/main/server.ts
import express from 'express'
import cors from 'cors'
import { itemsRouter } from './api/items'
import { searchRouter } from './api/search'
import { getDb } from './db/connection'

export function createServer() {
  const app = express()
  const db = getDb()  // called once here — routers receive db as a param
  app.use(cors({ origin: '*' }))
  app.use(express.json())
  app.use('/api/items', itemsRouter(db))
  app.use('/api/search', searchRouter(db))  // also handles GET /api/search/tags
  return app
}
```

- [ ] **Step 5: Run integration tests — all pass**

```bash
npm run test:integration
```
Expected: 6 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/api/search.ts src/main/server.ts tests/integration/api.test.ts
git commit -m "feat: FTS5 full-text search endpoint"
```

---

## Task 5: Electron Main Process + System Tray

**Files:**
- Modify: `src/main/index.ts`
- Create: `src/main/tray.ts`
- Create: `resources/tray-icon.png` (16×16 blue square placeholder)

- [ ] **Step 1: Create tray icon placeholder**

```bash
# Use node to create a minimal PNG (16x16 solid blue square)
node -e "
const { createCanvas } = require('canvas');
// If canvas not available, just copy any 16x16 PNG to resources/tray-icon.png
// Fallback: use Electron's nativeImage.createFromDataURL
console.log('Create resources/tray-icon.png manually — any 16x16 PNG works for now')
"
```

Place any 16×16 PNG at `resources/tray-icon.png`. A solid blue square works.

- [ ] **Step 2: Write `src/main/tray.ts`**

```typescript
// src/main/tray.ts
import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron'
import path from 'path'

export function setupTray(win: BrowserWindow): Tray {
  const iconPath = path.join(__dirname, '../../resources/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  const tray = new Tray(icon)
  tray.setToolTip('Cortex')

  const updateMenu = () => {
    tray.setContextMenu(Menu.buildFromTemplate([
      {
        label: 'Open Cortex',
        click: () => { win.show(); win.focus() }
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]))
  }

  updateMenu()

  tray.on('click', () => {
    win.isVisible() ? win.hide() : win.show()
  })

  return tray
}
```

- [ ] **Step 3: Update `src/main/index.ts`**

```typescript
// src/main/index.ts
import { app, BrowserWindow, globalShortcut } from 'electron'
import { join } from 'path'
import { createServer } from './server'
import { setupTray } from './tray'
import { API_PORT } from '../shared/constants'

// Module-level quit flag — DO NOT write app.isQuitting = true, Electron's app
// object is not typed for custom properties and the build will fail.
let isQuitting = false
let tray: ReturnType<typeof setupTray> | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#020617',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // hide to tray instead of quit on close
  win.on('close', e => {
    if (!isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })

  return win
}

app.whenReady().then(() => {
  // Start Express API server
  const server = createServer()
  server.listen(API_PORT, '127.0.0.1', () => {
    console.log(`Cortex API running on http://127.0.0.1:${API_PORT}`)
  })

  const win = createWindow()
  tray = setupTray(win)

  // Register global shortcut for quick-add (works even when Cortex is in tray)
  globalShortcut.register('CmdOrCtrl+Shift+N', () => {
    win.show()
    win.focus()
    // TODO Phase 1: open floating quick-add window instead of main window
  })

  // Auto-start: Windows-only, user-configurable (default: enabled)
  // Guard required — setLoginItemSettings is not cross-platform safe
  if (process.platform === 'win32') {
    app.setLoginItemSettings({ openAtLogin: true })
  }
})

app.on('before-quit', () => { isQuitting = true })
app.on('window-all-closed', () => { /* keep alive in tray */ })
app.on('will-quit', () => { globalShortcut.unregisterAll() })
```

- [ ] **Step 4: Run dev — verify tray icon appears**

```bash
npm run dev
```
Expected: Electron opens, tray icon visible in Windows taskbar. Click it → window hides. Click again → window shows.

- [ ] **Step 5: Commit**

```bash
git add src/main/index.ts src/main/tray.ts resources/
git commit -m "feat: electron main process with system tray and API server"
```

---

## Task 6: Global CSS + Card Hover Effect

**Files:**
- Create: `src/renderer/styles/globals.css`
- Create: `src/renderer/styles/hover.css`

- [ ] **Step 1: Write `globals.css`**

```css
/* src/renderer/styles/globals.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:          #020617;
  --surface:     #0f172a;
  --surface2:    #1e293b;
  --border:      #334155;
  --border2:     #1e293b;
  --text:        #f8fafc;
  --text2:       #94a3b8;
  --text3:       #475569;
  --blue:        #2563eb;
  --blue-dim:    #1d3461;
  --blue-text:   #93c5fd;
  --orange:      #f97316;
  --orange-dim:  #431407;
  --orange-text: #fed7aa;
  --red:         #ef4444;
  --red-dim:     #450a0a;
  --red-text:    #fca5a5;
  --green-dim:   #052e16;
  --green-text:  #86efac;
}

html, body, #root {
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--surface2); border-radius: 2px; }
```

- [ ] **Step 2: Write `hover.css`**

```css
/* src/renderer/styles/hover.css */

/* ── Base card ── */
.cortex-card {
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: 10px;
  padding: 11px 12px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  /* lift via translateZ — no tilt */
  transform: perspective(700px) translateZ(0px);
  transition:
    transform 80ms ease,
    border-color 200ms ease,
    box-shadow 200ms ease;
  will-change: transform;
}

/* specular highlight — follows mouse */
.cortex-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: radial-gradient(
    circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(148, 198, 255, 0.03) 0%,
    rgba(37,  99,  235, 0.014) 16%,
    transparent 20%
  );
  opacity: 0;
  transition: opacity 200ms ease;
  pointer-events: none;
  z-index: 1;
}

/* edge rim glow */
.cortex-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 11px;
  background: linear-gradient(
    calc(var(--angle, 135deg)),
    rgba(148, 198, 255, 0.18),
    rgba(37,  99,  235, 0.10) 40%,
    rgba(249, 115,  22, 0.08) 70%,
    rgba(148, 198, 255, 0.16)
  );
  opacity: 0;
  transition: opacity 250ms ease;
  z-index: -1;
}

/* noise texture */
.cortex-card .card-noise {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
  background-size: 160px 160px;
  mix-blend-mode: overlay;
  opacity: 0;
  transition: opacity 250ms ease;
  pointer-events: none;
  z-index: 2;
}

/* hover state */
.cortex-card:hover {
  transform: perspective(700px) translateZ(8.5px);
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow:
    0 0 0 1px rgba(148, 198, 255, 0.15),
    0 8px 32px rgba(0, 0, 0, 0.45),
    0 0 20px rgba(37, 99, 235, 0.08);
}
.cortex-card:hover::after  { opacity: 1; }
.cortex-card:hover::before { opacity: 0.18; }
.cortex-card:hover .card-noise { opacity: 1; }

/* idea card variant — orange specular */
.cortex-card.idea-card {
  border-left: 2px solid var(--orange);
}
.cortex-card.idea-card::after {
  background: radial-gradient(
    circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(255, 180, 100, 0.03) 0%,
    rgba(249, 115,  22, 0.014) 16%,
    transparent 20%
  );
}
.cortex-card.idea-card:hover {
  border-color: rgba(249, 115, 22, 0.5);
  box-shadow:
    0 0 0 1px rgba(249, 115, 22, 0.2),
    0 8px 32px rgba(0, 0, 0, 0.45),
    0 0 20px rgba(249, 115, 22, 0.07);
}
```

- [ ] **Step 3: Import both in `src/renderer/main.tsx`**

```typescript
import './styles/globals.css'
import './styles/hover.css'
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/styles/ src/renderer/main.tsx
git commit -m "feat: design system CSS variables and card hover effect"
```

---

## Task 7: API Client + Data Hooks

**Files:**
- Create: `src/renderer/lib/api.ts`
- Create: `src/renderer/hooks/useItems.ts`
- Create: `src/renderer/hooks/useSearch.ts`

- [ ] **Step 1: Write `api.ts`**

```typescript
// src/renderer/lib/api.ts
import { API_BASE } from '../../shared/constants'
const BASE = API_BASE

export interface Item {
  id: string
  type: 'link' | 'idea'
  title: string
  url: string | null
  note: string | null
  priority: 'inbox' | 'for-now' | 'today' | 'tomorrow' | 'this-week' | 'someday'
  tags: string[]
  favicon_url: string | null
  archived: number
  remind_at: number | null
  created_at: number
  updated_at: number
}

export type CreateInput = Omit<Item, 'id' | 'archived' | 'created_at' | 'updated_at'>
export type UpdateInput = Partial<Omit<Item, 'id' | 'created_at' | 'updated_at'>>

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  getAllItems:          ()                    => req<Item[]>('GET', '/api/items'),
  getByPriority:       (p: Item['priority']) => req<Item[]>('GET', `/api/items/priority/${p}`),
  getByTag:            (tag: string)         => req<Item[]>('GET', `/api/items/tag/${encodeURIComponent(tag)}`),
  getArchived:         ()                    => req<Item[]>('GET', '/api/items/archived'),
  createItem:          (input: CreateInput)  => req<Item>('POST', '/api/items', input),
  updateItem:          (id: string, patch: UpdateInput) => req<Item>('PATCH', `/api/items/${id}`, patch),
  deleteItem:          (id: string)          => req<void>('DELETE', `/api/items/${id}`),
  restoreItem:         (id: string)          => req<Item>('POST', `/api/items/${id}/restore`),
  search:              (q: string)           => req<Item[]>('GET', `/api/search?q=${encodeURIComponent(q)}`),
  getTags:             ()                    => req<string[]>('GET', '/api/search/tags')
}
```

- [ ] **Step 2: Write `useItems.ts`**

```typescript
// src/renderer/hooks/useItems.ts
import { useState, useEffect, useCallback } from 'react'
import { api, Item, CreateInput, UpdateInput } from '../lib/api'

export function useItems() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = await api.getAllItems()
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const create = async (input: CreateInput) => {
    const item = await api.createItem(input)
    setItems(prev => [...prev, item])
    return item
  }

  const update = async (id: string, patch: UpdateInput) => {
    const updated = await api.updateItem(id, patch)
    setItems(prev => prev.map(i => i.id === id ? updated : i))
    return updated
  }

  const remove = async (id: string) => {
    await api.deleteItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return { items, loading, refresh, create, update, remove }
}
```

- [ ] **Step 3: Write `useSearch.ts`**

```typescript
// src/renderer/hooks/useSearch.ts
import { useState, useEffect } from 'react'
import { api, Item } from '../lib/api'

export function useSearch(query: string) {
  const [results, setResults] = useState<Item[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const data = await api.search(query)
      setResults(data)
      setSearching(false)
    }, 200) // 200ms debounce
    return () => clearTimeout(timer)
  }, [query])

  return { results, searching }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/lib/api.ts src/renderer/hooks/
git commit -m "feat: typed API client and React data hooks"
```

---

## Task 8: Card Components

**Files:**
- Create: `src/renderer/components/Card.tsx`
- Create: `src/renderer/components/IdeaCard.tsx`

- [ ] **Step 1: Write `Card.tsx`**

```tsx
// src/renderer/components/Card.tsx
import { useRef, useState } from 'react'
import type { Item } from '../lib/api'

interface Props {
  item: Item
  showTags?: boolean
  onClick: (item: Item) => void
}

export function Card({ item, showTags = false, onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [faviconError, setFaviconError] = useState(false)

  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return
    const r  = el.getBoundingClientRect()
    // Set CSS custom properties only — NO dynamic <style> injection.
    // hover.css reads var(--mouse-x)/var(--mouse-y) directly on the ::after pseudo-element.
    // Injecting a new <style> node per mousemove event creates thousands of DOM nodes.
    el.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width  * 100).toFixed(1) + '%')
    el.style.setProperty('--mouse-y', ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%')
    el.style.setProperty('--angle', (
      Math.atan2(
        (e.clientY - r.top)  / r.height - 0.5,
        (e.clientX - r.left) / r.width  - 0.5
      ) * 180 / Math.PI + 180
    ).toFixed(1) + 'deg')
  }

  const onMouseLeave = () => {
    const el = ref.current; if (!el) return
    el.style.setProperty('--mouse-x', '50%')
    el.style.setProperty('--mouse-y', '50%')
  }

  const hostname = (() => {
    try { return new URL(item.url ?? 'https://example.com').hostname } catch { return 'example.com' }
  })()
  const faviconSrc = item.favicon_url ?? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
  const firstLetter = hostname.charAt(0).toUpperCase()

  return (
    <div
      ref={ref}
      className="cortex-card"
      onClick={() => onClick(item)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="card-noise" />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {faviconError ? (
          /* Letter-icon fallback — shown when Google favicon API is unavailable */
          <div style={{
            width: 16, height: 16, borderRadius: 3, flexShrink: 0, marginTop: 1,
            background: 'var(--surface2)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 9, fontWeight: 600, color: 'var(--text3)'
          }}>{firstLetter}</div>
        ) : (
          <img
            src={faviconSrc}
            alt=""
            style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, marginTop: 1 }}
            onError={() => setFaviconError(true)}
          />
        )}
        <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4 }}>
          {item.title}
        </span>
      </div>
      {showTags && item.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
          {item.tags.map(tag => (
            <span key={tag} className="tag tag-slate">{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write `IdeaCard.tsx`**

```tsx
// src/renderer/components/IdeaCard.tsx
import { useRef } from 'react'
import { PenLine } from 'lucide-react'
import type { Item } from '../lib/api'

interface Props {
  item: Item
  showTags?: boolean
  onClick: (item: Item) => void
}

export function IdeaCard({ item, showTags = false, onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return
    const r  = el.getBoundingClientRect()
    // CSS custom properties only — no <style> injection
    el.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width  * 100).toFixed(1) + '%')
    el.style.setProperty('--mouse-y', ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%')
  }

  const onMouseLeave = () => {
    const el = ref.current; if (!el) return
    el.style.setProperty('--mouse-x', '50%')
    el.style.setProperty('--mouse-y', '50%')
  }

  return (
    <div
      ref={ref}
      className="cortex-card idea-card"
      onClick={() => onClick(item)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="card-noise" />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <PenLine size={14} color="var(--orange)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4 }}>
          {item.title}
        </span>
      </div>
      {item.note && (
        <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 5, lineHeight: 1.5 }}>
          {item.note}
        </p>
      )}
      {showTags && item.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
          {item.tags.map(tag => (
            <span key={tag} className="tag tag-orange">{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add tag CSS to `globals.css`**

```css
.tag { font-size: 10px; font-weight: 500; padding: 2px 7px; border-radius: 4px; }
.tag-slate  { background: var(--surface2);   color: var(--text2); }
.tag-blue   { background: var(--blue-dim);   color: var(--blue-text); }
.tag-orange { background: var(--orange-dim); color: var(--orange-text); }
.tag-green  { background: var(--green-dim);  color: var(--green-text); }
.tag-red    { background: var(--red-dim);    color: var(--red-text); }
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/Card.tsx src/renderer/components/IdeaCard.tsx src/renderer/styles/globals.css
git commit -m "feat: Card and IdeaCard components with hover effect"
```

---

## Task 9: TopBar Component

**Files:**
- Create: `src/renderer/components/TopBar.tsx`

- [ ] **Step 1: Write `TopBar.tsx`**

```tsx
// src/renderer/components/TopBar.tsx
import { Search, Plus } from 'lucide-react'

type View = 'priority' | 'category'

interface Props {
  view: View
  onViewChange: (v: View) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  onAddClick: () => void
}

export function TopBar({ view, onViewChange, searchQuery, onSearchChange, onAddClick }: Props) {
  return (
    <header style={{
      height: 48, background: 'var(--surface)', borderBottom: '1px solid var(--border2)',
      display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
      position: 'sticky', top: 0, zIndex: 100, flexShrink: 0
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginRight: 8 }}>
        <div style={{ width: 8, height: 8, background: 'var(--blue)', borderRadius: 2 }} />
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.3px' }}>Cortex</span>
      </div>

      {/* View toggle */}
      <div style={{
        display: 'flex', background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 6, overflow: 'hidden'
      }}>
        {(['priority', 'category'] as View[]).map(v => (
          <button key={v} onClick={() => onViewChange(v)} style={{
            padding: '5px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            border: 'none', fontFamily: 'Inter, sans-serif',
            background: view === v ? 'var(--blue)' : 'transparent',
            color: view === v ? '#fff' : 'var(--text3)',
            transition: 'all 150ms ease'
          }}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '5px 12px', width: 220
      }}>
        <Search size={12} color="var(--text3)" />
        <input
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search… (Ctrl+K)"
          style={{
            background: 'none', border: 'none', outline: 'none',
            fontSize: 12, color: 'var(--text)', fontFamily: 'Inter, sans-serif',
            width: '100%'
          }}
        />
      </div>

      {/* Add button */}
      <button onClick={onAddClick} style={{
        background: 'var(--blue)', color: '#fff', border: 'none',
        borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        display: 'flex', alignItems: 'center', gap: 5
      }}>
        <Plus size={14} /> Add
      </button>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/TopBar.tsx
git commit -m "feat: TopBar with view toggle and search input"
```

---

## Task 10: Priority View (Kanban)

**Files:**
- Create: `src/renderer/components/PriorityView.tsx`

- [ ] **Step 1: Write `PriorityView.tsx`**

```tsx
// src/renderer/components/PriorityView.tsx
import { Card } from './Card'
import { IdeaCard } from './IdeaCard'
import type { Item } from '../lib/api'

type Priority = Item['priority']

// Inbox is the unreviewed landing zone — leftmost, neutral gray
const COLUMNS: { id: Priority; label: string; color: string }[] = [
  { id: 'inbox',     label: 'Inbox',     color: '#6b7280' },
  { id: 'for-now',   label: 'For Now',   color: '#ef4444' },
  { id: 'today',     label: 'Today',     color: '#f97316' },
  { id: 'tomorrow',  label: 'Tomorrow',  color: '#6366f1' },
  { id: 'this-week', label: 'This Week', color: '#38bdf8' },
  { id: 'someday',   label: 'Someday',   color: '#475569' },
]

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

interface Props {
  items: Item[]
  onCardClick: (item: Item) => void
  onArchiveAll?: (ids: string[]) => void
}

function CardItem({ item, onClick }: { item: Item; onClick: (i: Item) => void }) {
  return item.type === 'idea'
    ? <IdeaCard item={item} onClick={onClick} />
    : <Card item={item} onClick={onClick} />
}

export function PriorityView({ items, onCardClick, onArchiveAll }: Props) {
  const forNowItems = items.filter(i => i.priority === 'for-now')

  return (
    <div style={{ padding: '0 0 20px', overflowX: 'auto' }}>
      {/* For Now pinned strip — sticky at top, always visible when For Now has items */}
      {forNowItems.length > 0 && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          borderLeft: '2px solid #ef4444',
          background: 'rgba(239,68,68,0.06)',
          borderBottom: '1px solid rgba(239,68,68,0.15)',
          padding: '10px 16px',
          display: 'flex', gap: 10, flexWrap: 'wrap',
          marginBottom: 0
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px', alignSelf: 'center', flexShrink: 0 }}>
            For Now
          </span>
          {forNowItems.map(item => <CardItem key={item.id} item={item} onClick={onCardClick} />)}
        </div>
      )}

      <div style={{ padding: '20px 16px' }}>
        <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
          {COLUMNS.map(col => {
            const colItems = items.filter(i => i.priority === col.id)

            // Someday: show archive banner if any items are 30+ days old
            const staleSomeday = col.id === 'someday'
              ? colItems.filter(i => Date.now() - i.created_at > THIRTY_DAYS_MS)
              : []

            return (
              <div key={col.id} style={{ width: 220, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, padding: '0 2px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text2)' }}>
                    {col.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
                    {colItems.length}
                  </span>
                </div>

                {/* Someday archive banner */}
                {staleSomeday.length > 0 && onArchiveAll && (
                  <div style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '7px 10px', marginBottom: 8,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8
                  }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                      {staleSomeday.length} item{staleSomeday.length > 1 ? 's' : ''} untouched 30+ days
                    </span>
                    <button
                      onClick={() => onArchiveAll(staleSomeday.map(i => i.id))}
                      style={{
                        background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                        padding: '3px 8px', fontSize: 10, color: 'var(--text2)', cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif', flexShrink: 0
                      }}
                    >Archive all</button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {colItems.length === 0 ? (
                    <div style={{
                      border: '1px dashed var(--border)', borderRadius: 8,
                      padding: '18px 12px', textAlign: 'center',
                      color: 'var(--text3)', fontSize: 11
                    }}>Nothing here</div>
                  ) : colItems.map(item => <CardItem key={item.id} item={item} onClick={onCardClick} />)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/PriorityView.tsx
git commit -m "feat: priority kanban view with 5 columns"
```

---

## Task 11: Category View (Drag-and-Drop)

**Files:**
- Create: `src/renderer/components/CategoryView.tsx`

- [ ] **Step 1: Write `CategoryView.tsx`**

```tsx
// src/renderer/components/CategoryView.tsx
import { useState } from 'react'
import type { Item } from '../lib/api'

interface Props {
  items: Item[]
  onTagChange: (item: Item, sourceTag: string, destTag: string) => void
  onCardClick: (item: Item) => void
}

export function CategoryView({ items, onTagChange, onCardClick }: Props) {
  const [dragItem, setDragItem] = useState<Item | null>(null)
  const [dragSourceTag, setDragSourceTag] = useState<string | null>(null)
  const [dragOverTag, setDragOverTag] = useState<string | null>(null)

  // Build tag → items map
  const tagMap = new Map<string, Item[]>()
  items.forEach(item => {
    if (item.tags.length === 0) {
      const list = tagMap.get('Untagged') ?? []
      tagMap.set('Untagged', [...list, item])
    } else {
      item.tags.forEach(tag => {
        const list = tagMap.get(tag) ?? []
        tagMap.set(tag, [...list, item])
      })
    }
  })
  const tags = Array.from(tagMap.keys()).sort()

  return (
    <div style={{ padding: '20px 16px' }}>
      <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14 }}>
        Category view — drag items between categories
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {tags.map(tag => {
          const tagItems = tagMap.get(tag) ?? []
          const isOver = dragOverTag === tag
          return (
            <div
              key={tag}
              onDragOver={e => { e.preventDefault(); setDragOverTag(tag) }}
              onDragLeave={() => setDragOverTag(null)}
              onDrop={() => {
                // Move semantics: replace the source group's tag with the destination tag.
                // dragSourceTag is removed, dragOverTag (destTag) is added. Other tags survive.
                if (dragItem && dragSourceTag && dragOverTag && dragSourceTag !== dragOverTag) {
                  onTagChange(dragItem, dragSourceTag, dragOverTag)
                }
                setDragItem(null); setDragSourceTag(null); setDragOverTag(null)
              }}
              style={{
                background: isOver ? 'var(--blue-dim)' : 'var(--surface)',
                border: `1px solid ${isOver ? 'var(--blue)' : 'var(--border2)'}`,
                borderRadius: 10, padding: 14, width: 200, minHeight: 80,
                transition: 'border-color 150ms, background 150ms'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{tag}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{tagItems.length}</span>
              </div>
              {tagItems.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => { setDragItem(item); setDragSourceTag(tag) }}
                  onClick={() => onCardClick(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    fontSize: 11, color: 'var(--text2)',
                    padding: '6px 8px', borderRadius: 5, marginBottom: 3,
                    cursor: 'grab', transition: 'background 150ms',
                    opacity: dragItem?.id === item.id ? 0.4 : 1
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {item.type === 'link' && item.url && (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=28`}
                      alt="" style={{ width: 14, height: 14, borderRadius: 2, flexShrink: 0 }}
                    />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/CategoryView.tsx
git commit -m "feat: category view with HTML5 drag-and-drop between groups"
```

---

## Task 12: Edit Modal

**Files:**
- Create: `src/renderer/components/EditModal.tsx`

- [ ] **Step 1: Write `EditModal.tsx`**

```tsx
// src/renderer/components/EditModal.tsx
import { useState, useEffect } from 'react'
import { X, Link2, PenLine } from 'lucide-react'
import { api } from '../lib/api'
import type { Item, CreateInput, UpdateInput } from '../lib/api'

type Priority = Item['priority']

interface Props {
  item: Item | null       // null = add mode
  onSave: (data: CreateInput | UpdateInput) => void
  onDelete?: () => void
  onClose: () => void
}

const PRIORITIES: Priority[] = ['inbox', 'for-now', 'today', 'tomorrow', 'this-week', 'someday']
const PRIORITY_LABELS: Record<Priority, string> = {
  'inbox': 'Inbox', 'for-now': 'For Now', 'today': 'Today', 'tomorrow': 'Tomorrow',
  'this-week': 'This Week', 'someday': 'Someday'
}

// Convert Unix ms to datetime-local input value (local time)
function msToDatetimeLocal(ms: number | null): string {
  if (!ms) return ''
  const d = new Date(ms)
  return d.toISOString().slice(0, 16)  // "YYYY-MM-DDTHH:MM"
}

// Convert datetime-local string to Unix ms
function datetimeLocalToMs(s: string): number | null {
  if (!s) return null
  return new Date(s).getTime()
}

export function EditModal({ item, onSave, onDelete, onClose }: Props) {
  const isAdd = item === null
  const [type, setType]       = useState<'link' | 'idea'>(item?.type ?? 'link')
  const [title, setTitle]     = useState(item?.title ?? '')
  const [url, setUrl]         = useState(item?.url ?? '')
  const [note, setNote]       = useState(item?.note ?? '')
  const [priority, setPri]    = useState<Priority>(item?.priority ?? 'inbox')
  const [tags, setTags]       = useState(item?.tags.join(', ') ?? '')
  const [remindAt, setRemindAt] = useState(msToDatetimeLocal(item?.remind_at ?? null))
  const [existingTags, setExistingTags] = useState<string[]>([])

  // Fetch existing tags for autocomplete datalist
  useEffect(() => {
    api.getTags().then(setExistingTags).catch(() => {})
  }, [])

  // Auto-detect type from URL
  useEffect(() => {
    if (isAdd && url && !url.startsWith('http')) return
    if (isAdd) setType('link')
  }, [url, isAdd])

  const handleSave = () => {
    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean)
    onSave({
      type, title, url: url || null, note: note || null,
      priority, tags: tagArr, favicon_url: null,
      remind_at: datetimeLocalToMs(remindAt)
    })
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 100, zIndex: 200
      }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 18, width: 440,
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {isAdd ? 'Add item' : (item.type === 'idea' ? 'Edit idea' : 'Edit link')}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Type toggle (add mode only) */}
        {isAdd && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {(['link', 'idea'] as const).map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border)',
                background: type === t ? 'var(--blue)' : 'none',
                color: type === t ? '#fff' : 'var(--text2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
              }}>
                {t === 'link' ? <><Link2 size={12} /> Link</> : <><PenLine size={12} /> Idea</>}
              </button>
            ))}
          </div>
        )}

        <FieldLabel>Title</FieldLabel>
        <Input value={title} onChange={setTitle} placeholder="Title…" />

        {type === 'link' && (
          <>
            <FieldLabel>URL</FieldLabel>
            <Input value={url} onChange={setUrl} placeholder="https://…" />
          </>
        )}

        {type === 'idea' && (
          <>
            <FieldLabel>Notes</FieldLabel>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Add a note…"
              style={inputStyle}
            />
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Priority</FieldLabel>
            <select value={priority} onChange={e => setPri(e.target.value as Priority)} style={inputStyle}>
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Tags</FieldLabel>
            {/* datalist provides autocomplete from existing tags — prevents "github" vs "GitHub" drift */}
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="AI, GitHub, …"
              list="cortex-tags-list"
              style={inputStyle}
            />
            <datalist id="cortex-tags-list">
              {existingTags.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
        </div>

        <FieldLabel>Remind me at</FieldLabel>
        <input
          type="datetime-local"
          value={remindAt}
          onChange={e => setRemindAt(e.target.value)}
          style={{ ...inputStyle, colorScheme: 'dark' }}
        />

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          {onDelete && !isAdd ? (
            <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Delete
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Cancel
            </button>
            <button onClick={handleSave} style={{ background: 'var(--blue)', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--text)',
  fontFamily: 'Inter, sans-serif', marginBottom: 12, outline: 'none', resize: 'vertical'
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5 }}>{children}</div>
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/EditModal.tsx
git commit -m "feat: edit/add modal for link and idea cards"
```

---

## Task 13: Search Results Component

**Files:**
- Create: `src/renderer/components/SearchResults.tsx`

- [ ] **Step 1: Write `SearchResults.tsx`**

```tsx
// src/renderer/components/SearchResults.tsx
import type { Item } from '../lib/api'

interface Props {
  query: string
  results: Item[]
  onCardClick: (item: Item) => void
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return <>
    {text.slice(0, idx)}
    <mark style={{ background: 'rgba(37,99,235,0.3)', color: 'var(--text)', borderRadius: 2 }}>
      {text.slice(idx, idx + query.length)}
    </mark>
    {text.slice(idx + query.length)}
  </>
}

export function SearchResults({ query, results, onCardClick }: Props) {
  return (
    <div style={{ padding: '20px 16px', maxWidth: 600 }}>
      <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14 }}>
        {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {results.map(item => (
          <div
            key={item.id}
            onClick={() => onCardClick(item)}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
              transition: 'border-color 150ms'
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
          >
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3 }}>
              {highlight(item.title, query)}
            </div>
            {item.note && (
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                {highlight(item.note, query)}
              </div>
            )}
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
              {item.priority} · {item.tags.join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/SearchResults.tsx
git commit -m "feat: search results with keyword highlighting"
```

---

## Task 14: Root App Component — Wire Everything Together

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Write `App.tsx`**

```tsx
// src/renderer/App.tsx
import { useState, useEffect } from 'react'
import { TopBar } from './components/TopBar'
import { PriorityView } from './components/PriorityView'
import { CategoryView } from './components/CategoryView'
import { EditModal } from './components/EditModal'
import { SearchResults } from './components/SearchResults'
import { useItems } from './hooks/useItems'
import { useSearch } from './hooks/useSearch'
import type { Item, CreateInput, UpdateInput } from './lib/api'

export default function App() {
  const [view, setView]             = useState<'priority' | 'category'>('priority')
  const [editItem, setEditItem]     = useState<Item | null | undefined>(undefined) // undefined = closed, null = add mode
  const [searchQuery, setSearch]    = useState('')
  const { items, loading, create, update, remove } = useItems()
  const { results, searching }      = useSearch(searchQuery)

  // Ctrl+K focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSave = async (data: CreateInput | UpdateInput) => {
    if (editItem === null) {
      // add mode
      await create(data as CreateInput)
    } else if (editItem) {
      await update(editItem.id, data as UpdateInput)
    }
    setEditItem(undefined)
  }

  const handleDelete = async () => {
    if (editItem) { await remove(editItem.id); setEditItem(undefined) }
  }

  // Category view DnD: MOVE semantics — replace the dragged-from tag with the dropped-to tag.
  // The sourceTag is the group the card was dragged from. All other tags are preserved.
  const handleTagChange = async (item: Item, sourceTag: string, destTag: string) => {
    const tags = item.tags.map(t => t === sourceTag ? destTag : t)
    // Deduplicate in case item is already tagged with destTag
    await update(item.id, { tags: Array.from(new Set(tags)) })
  }

  const showSearch = searchQuery.trim().length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar
        view={view}
        onViewChange={setView}
        searchQuery={searchQuery}
        onSearchChange={setSearch}
        onAddClick={() => setEditItem(null)}
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {showSearch ? (
          <SearchResults
            query={searchQuery}
            results={results}
            onCardClick={item => setEditItem(item)}
          />
        ) : loading ? (
          /* Skeleton shown while items load — prevents blank flash on startup */
          <div style={{ padding: '20px 16px', display: 'flex', gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ width: 220, flexShrink: 0 }}>
                <div style={{ height: 14, background: 'var(--surface2)', borderRadius: 4, marginBottom: 10, width: 80 }} />
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} style={{ height: 52, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 10, marginBottom: 7 }} />
                ))}
              </div>
            ))}
          </div>
        ) : view === 'priority' ? (
          <PriorityView
            items={items}
            onCardClick={item => setEditItem(item)}
          />
        ) : (
          <CategoryView
            items={items}
            onTagChange={handleTagChange}
            onCardClick={item => setEditItem(item)}
          />
        )}
      </div>

      {editItem !== undefined && (
        <EditModal
          item={editItem}
          onSave={handleSave}
          onDelete={editItem ? handleDelete : undefined}
          onClose={() => setEditItem(undefined)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify app renders**

```bash
npm run dev
```
Expected: Full Cortex UI — TopBar, 5 Kanban columns, toggle switches to Category view, +Add opens modal, search filters results live.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat: wire all components into App — full UI functional"
```

---

## Task 15: E2E Tests

**Files:**
- Create: `tests/e2e/app.spec.ts`

- [ ] **Step 1: Write E2E tests**

```typescript
// tests/e2e/app.spec.ts
import { test, expect } from '@playwright/test'

const URL = 'http://localhost:51204'

test.describe('Priority View', () => {
  test('shows 5 Kanban columns', async ({ page }) => {
    await page.goto(URL)
    for (const col of ['For Now', 'Today', 'Tomorrow', 'This Week', 'Someday']) {
      await expect(page.getByText(col.toUpperCase())).toBeVisible()
    }
  })

  test('add link card via modal', async ({ page }) => {
    await page.goto(URL)
    await page.click('button:has-text("Add")')
    await page.fill('input[placeholder="Title…"]', 'Test link')
    await page.fill('input[placeholder="https://…"]', 'https://github.com/test')
    await page.click('button:has-text("Save")')
    await expect(page.getByText('Test link')).toBeVisible()
  })

  test('click card opens edit modal', async ({ page }) => {
    await page.goto(URL)
    // Add a card first
    await page.click('button:has-text("Add")')
    await page.fill('input[placeholder="Title…"]', 'Edit me')
    await page.fill('input[placeholder="https://…"]', 'https://example.com')
    await page.click('button:has-text("Save")')
    // Click it
    await page.click('text=Edit me')
    await expect(page.getByText('Edit link')).toBeVisible()
  })
})

test.describe('Category View', () => {
  test('toggle switches to category view', async ({ page }) => {
    await page.goto(URL)
    await page.click('button:has-text("Category")')
    await expect(page.getByText('drag items between categories')).toBeVisible()
  })
})

test.describe('Search', () => {
  test('search returns matching results', async ({ page }) => {
    await page.goto(URL)
    // Add a card
    await page.click('button:has-text("Add")')
    await page.fill('input[placeholder="Title…"]', 'Karpathy makemore lecture')
    await page.fill('input[placeholder="https://…"]', 'https://youtube.com/watch?v=xyz')
    await page.click('button:has-text("Save")')
    // Search
    await page.fill('input[placeholder*="Search"]', 'makemore')
    await expect(page.getByText('Karpathy makemore lecture')).toBeVisible()
  })
})
```

- [ ] **Step 2: Configure Playwright**

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:51204' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:51204',
    reuseExistingServer: true
  }
})
```

- [ ] **Step 3: Run E2E tests**

```bash
npm run test:e2e
```
Expected: All tests PASS

- [ ] **Step 4: Final commit**

```bash
git add tests/e2e/ playwright.config.ts
git commit -m "test: E2E tests for priority view, category view, search"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Priority View (5 columns, favicon + title only) — Task 10
- ✅ Category View (tag groups, drag-and-drop) — Task 11
- ✅ Edit modal (link + idea, delete button) — Task 12
- ✅ Search (FTS5, Ctrl+K) — Tasks 4, 13, 14
- ✅ Card hover effect (lift + specular) — Tasks 6, 8
- ✅ SQLite + FTS5 — Tasks 2, 3, 4
- ✅ System tray + auto-start — Task 5
- ✅ Electron shell — Tasks 1, 5
- ✅ Archive (soft-delete) — API in Task 3, UI restore via modal Delete button
- ⚠️ Archive view (browse archived items) — not in a task. **Add Task 16 below.**
- ⚠️ "For Now" never auto-modified (cron) — Phase 3 plan. Correct.
- ⚠️ Tag CSS classes referenced in Card.tsx — defined in Task 8 Step 3. ✅

---

## Task 16: Archive View

**Files:**
- Create: `src/renderer/components/ArchiveView.tsx`
- Modify: `src/renderer/App.tsx` (add archive route)
- Modify: `src/renderer/components/TopBar.tsx` (add Archive link)

- [ ] **Step 1: Write `ArchiveView.tsx`**

```tsx
// src/renderer/components/ArchiveView.tsx
import { useState, useEffect } from 'react'
import { api, Item } from '../lib/api'
import { RotateCcw } from 'lucide-react'

interface Props {
  onRestore: (id: string) => void
}

export function ArchiveView({ onRestore }: Props) {
  const [archived, setArchived] = useState<Item[]>([])

  useEffect(() => {
    api.getArchived().then(setArchived)
  }, [])

  return (
    <div style={{ padding: '20px 16px', maxWidth: 600 }}>
      <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14 }}>
        Archived items — {archived.length} total
      </p>
      {archived.length === 0 && (
        <p style={{ color: 'var(--text3)', fontSize: 12 }}>Nothing archived yet.</p>
      )}
      {archived.map(item => (
        <div key={item.id} style={{
          background: 'var(--surface)', border: '1px solid var(--border2)',
          borderRadius: 8, padding: '10px 12px', marginBottom: 7,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>{item.title}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{item.priority} · {item.tags.join(', ')}</div>
          </div>
          <button
            onClick={async () => {
              await api.restoreItem(item.id)
              setArchived(prev => prev.filter(i => i.id !== item.id))
              onRestore(item.id)
            }}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'var(--text2)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Inter, sans-serif' }}
          >
            <RotateCcw size={12} /> Restore
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Add `archive` view to `App.tsx`**

Change view type to `'priority' | 'category' | 'archive'` and render `<ArchiveView>` when `view === 'archive'`.

- [ ] **Step 3: Add Archive button to `TopBar.tsx`**

Add a small text link "Archive" next to the view toggle, styled in `var(--text3)`.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/ArchiveView.tsx
git commit -m "feat: archive view with restore functionality"
```

---

---

## Task 17: Floating Quick-Add Window (Ctrl+Shift+N)

**Files:**
- Create: `src/main/quick-add-window.ts`
- Create: `src/renderer/QuickAdd.tsx` (separate renderer entry for this window)
- Modify: `src/main/index.ts` (register shortcut, open window)

- [ ] **Step 1: Write `quick-add-window.ts`**

```typescript
// src/main/quick-add-window.ts
import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { createServer } from './server'

let quickAddWin: BrowserWindow | null = null

export function openQuickAddWindow(): void {
  if (quickAddWin && !quickAddWin.isDestroyed()) {
    quickAddWin.focus()
    return
  }

  quickAddWin = new BrowserWindow({
    width: 340,
    height: 190,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    quickAddWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}quick-add.html`)
  } else {
    quickAddWin.loadFile(join(__dirname, '../renderer/quick-add.html'))
  }

  // Close on blur (user clicked elsewhere)
  quickAddWin.on('blur', () => quickAddWin?.close())
  quickAddWin.on('closed', () => { quickAddWin = null })
}

// IPC: renderer sends 'quick-add:close' when user saves or presses Escape
ipcMain.on('quick-add:close', () => quickAddWin?.close())
```

- [ ] **Step 2: Write `src/renderer/QuickAdd.tsx`**

```tsx
// src/renderer/QuickAdd.tsx
import { useState, useEffect, useRef } from 'react'
import { api } from './lib/api'

export default function QuickAdd() {
  const [title, setTitle]   = useState('')
  const [priority, setPri]  = useState<string>('inbox')
  const [tags, setTags]     = useState('')
  const [existingTags, setExistingTags] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    api.getTags().then(setExistingTags).catch(() => {})
  }, [])

  const close = () => {
    // @ts-ignore — contextBridge will expose this
    window.electron?.ipcRenderer.send('quick-add:close')
  }

  const save = async () => {
    if (!title.trim()) return
    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean)
    // Auto-detect type: if title starts with http, save as link
    const type = title.startsWith('http') ? 'link' : 'idea'
    const payload = type === 'link'
      ? { type: 'link' as const, title: 'Link', url: title, priority, tags: tagArr, favicon_url: null, remind_at: null }
      : { type: 'idea' as const, title, priority, tags: tagArr, favicon_url: null, remind_at: null }
    await api.createItem(payload)
    close()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') close()
  }

  return (
    <div onKeyDown={onKeyDown} style={{
      fontFamily: 'Inter, sans-serif', background: '#0f172a',
      border: '1px solid #334155', borderRadius: 12, padding: 16,
      height: '100vh', display: 'flex', flexDirection: 'column', gap: 10
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.5px' }}>
        SAVE TO CORTEX
      </div>
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Title or URL…"
        style={{
          background: '#020617', border: '1px solid #334155', borderRadius: 6,
          padding: '8px 12px', fontSize: 13, color: '#f8fafc',
          fontFamily: 'Inter, sans-serif', outline: 'none'
        }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          value={priority}
          onChange={e => setPri(e.target.value)}
          style={{ background: '#020617', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px', fontSize: 11, color: '#94a3b8', fontFamily: 'Inter, sans-serif', flex: 1 }}
        >
          {['inbox','for-now','today','tomorrow','this-week','someday'].map(p => (
            <option key={p} value={p}>{p.replace('-', ' ')}</option>
          ))}
        </select>
        <input
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="Tags…"
          list="qa-tags"
          style={{ background: '#020617', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px', fontSize: 11, color: '#94a3b8', fontFamily: 'Inter, sans-serif', flex: 1 }}
        />
        <datalist id="qa-tags">{existingTags.map(t => <option key={t} value={t} />)}</datalist>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={close} style={{ background: 'none', border: '1px solid #334155', borderRadius: 6, padding: '5px 14px', fontSize: 11, color: '#94a3b8', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
          Esc
        </button>
        <button onClick={save} style={{ background: '#2563eb', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 11, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
          Save
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `index.ts` global shortcut to call `openQuickAddWindow()`**

Replace the TODO comment in the globalShortcut handler:
```typescript
import { openQuickAddWindow } from './quick-add-window'

globalShortcut.register('CmdOrCtrl+Shift+N', () => {
  openQuickAddWindow()
})
```

- [ ] **Step 4: Verify shortcut works**

```bash
npm run dev
```
Expected: Pressing Ctrl+Shift+N from any app opens the floating 340×190 dark window. Enter saves and closes. Escape closes without saving.

- [ ] **Step 5: Commit**

```bash
git add src/main/quick-add-window.ts src/renderer/QuickAdd.tsx
git commit -m "feat: floating quick-add window for Ctrl+Shift+N global shortcut"
```

---

## Task 18: Per-Minute Reminder Cron

**Files:**
- Create: `src/main/cron/reminders.ts`
- Modify: `src/main/index.ts` (start cron on app ready)
- Create: `tests/unit/reminders.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/reminders.test.ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { checkReminders } from '../../src/main/cron/reminders'

// Mock Electron's Notification
vi.mock('electron', () => ({
  Notification: vi.fn().mockImplementation(() => ({ show: vi.fn() }))
}))

let db: Database.Database
beforeEach(() => { db = new Database(':memory:'); runMigrations(db) })
afterEach(() => db.close())

it('fires notification and clears remind_at for due items', () => {
  const pastTime = Date.now() - 60_000  // 1 minute ago — definitely due
  db.prepare(`
    INSERT INTO items (id,type,title,priority,tags,archived,remind_at,created_at,updated_at)
    VALUES ('r1','idea','Do the thing','today','[]',0,?,?,?)
  `).run(pastTime, pastTime, pastTime)

  checkReminders(db)

  const item = db.prepare('SELECT remind_at FROM items WHERE id=?').get('r1') as any
  expect(item.remind_at).toBeNull()  // cleared after firing
})

it('does not fire for future reminders', () => {
  const futureTime = Date.now() + 60_000  // 1 minute from now
  db.prepare(`
    INSERT INTO items (id,type,title,priority,tags,archived,remind_at,created_at,updated_at)
    VALUES ('r2','idea','Future thing','today','[]',0,?,?,?)
  `).run(futureTime, futureTime, futureTime)

  checkReminders(db)

  const item = db.prepare('SELECT remind_at FROM items WHERE id=?').get('r2') as any
  expect(item.remind_at).toBe(futureTime)  // unchanged
})
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test:unit -- reminders
```
Expected: FAIL — `checkReminders` not found

- [ ] **Step 3: Implement `src/main/cron/reminders.ts`**

```typescript
// src/main/cron/reminders.ts
import Database from 'better-sqlite3'
import { Notification } from 'electron'

export function checkReminders(db: Database.Database): void {
  const now = Date.now()
  const due = db.prepare(`
    SELECT id, title FROM items
    WHERE remind_at IS NOT NULL AND remind_at <= ? AND archived = 0
  `).all(now) as Array<{ id: string; title: string }>

  due.forEach(item => {
    if (process.platform === 'win32') {
      new Notification({ title: 'Cortex Reminder', body: item.title }).show()
    }
    // Clear remind_at after firing — one-shot reminder
    db.prepare('UPDATE items SET remind_at = NULL, updated_at = ? WHERE id = ?').run(now, item.id)
  })
}
```

- [ ] **Step 4: Wire cron into `index.ts`**

```typescript
import cron from 'node-cron'
import { checkReminders } from './cron/reminders'
import { getDb } from './db/connection'

app.whenReady().then(() => {
  // ... existing setup ...

  // Per-minute reminder check
  cron.schedule('* * * * *', () => {
    checkReminders(getDb())
  })
})
```

- [ ] **Step 5: Run tests — verify pass**

```bash
npm run test:unit -- reminders
```
Expected: 2 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/cron/reminders.ts tests/unit/reminders.test.ts
git commit -m "feat: per-minute reminder cron with native notifications"
```

---

## Task 19: Tag Autocomplete + Inbox Badge in TopBar

**Files:**
- Modify: `src/renderer/components/TopBar.tsx` (add Inbox badge)
- Modify: `src/renderer/App.tsx` (pass inboxCount, pass onArchiveAll)
- Test: already covered by `/api/tags` integration test added in Task 4

- [ ] **Step 1: Add Inbox badge to `TopBar.tsx`**

```tsx
// Add to Props interface:
interface Props {
  view: View
  onViewChange: (v: View) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  onAddClick: () => void
  inboxCount: number  // ← new
}

// Add after the view toggle buttons, before the flex spacer:
{inboxCount > 0 && (
  <button
    onClick={() => onViewChange('priority')}
    style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 500,
      cursor: 'pointer', color: 'var(--text2)', fontFamily: 'Inter, sans-serif',
      display: 'flex', alignItems: 'center', gap: 5
    }}
  >
    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6b7280' }} />
    Inbox ({inboxCount})
  </button>
)}
```

- [ ] **Step 2: Wire inboxCount in `App.tsx`**

```tsx
// After existing state declarations:
const inboxCount = items.filter(i => i.priority === 'inbox').length

// Pass to TopBar:
<TopBar
  view={view}
  onViewChange={setView}
  searchQuery={searchQuery}
  onSearchChange={setSearch}
  onAddClick={() => setEditItem(null)}
  inboxCount={inboxCount}
/>

// Pass onArchiveAll to PriorityView:
const handleArchiveAll = async (ids: string[]) => {
  await Promise.all(ids.map(id => remove(id)))
}

<PriorityView
  items={items}
  onCardClick={item => setEditItem(item)}
  onArchiveAll={handleArchiveAll}
/>
```

- [ ] **Step 3: Verify integration**

```bash
npm run dev
```
Expected: Inbox badge appears in TopBar when items exist with `priority='inbox'`. Clicking it switches to Priority view. Someday column shows archive banner for items 30+ days old.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/TopBar.tsx src/renderer/App.tsx
git commit -m "feat: inbox badge in TopBar and someday archive banner wired to App"
```

---

*Phase 1b (Chrome Extension), Phase 2 (Telegram Bot), Phase 3 (Cron + Notifications), and Phase 4 (Calendar) each get their own plan files when this phase ships.*
