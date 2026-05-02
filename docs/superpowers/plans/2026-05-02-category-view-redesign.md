# Category View Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the horizontal-column category view with a vertical accordion, add background link title fetching, domain auto-tagging, priority dots, inline quick-add per category, duplicate URL detection, and hashtag autocomplete for tag inputs.

**Architecture:** Nine features organized into eight tasks. Tasks 1-3 are backend-only (no UI changes). Tasks 4-6 are the CategoryView rewrite. Tasks 7-8 add QuickAdd enhancements. Each task commits independently and leaves the app in a working state.

**Tech Stack:** Electron 37, React 18, TypeScript, better-sqlite3, electron-vite

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/shared/domain-rules.ts` | `getDomainTag(url)` — hostname → category name mapping |
| Create | `src/main/api/link-fetch.ts` | `fetchAndUpdateLinkTitle(db, id, url)` — og:title background fetch |
| Modify | `src/main/api/items.ts` | Export `updateItemTitle(db, id, title)` |
| Modify | `src/main/index.ts` | IPC `data:create-item` fires title fetch; add `data:fetch-link-title` handler |
| Modify | `src/main/telegram/poller.ts` | Domain auto-tag + title fetch after createItem |
| Modify | `src/renderer/styles/globals.css` | Add `.cat-*` accordion classes; remove old `.category-grid` rules |
| Modify | `src/renderer/components/CategoryView.tsx` | Full rewrite: accordion layout, item rows, subfolder columns, inline add, priority dots |
| Modify | `src/renderer/App.tsx` | Pass `onCreate` prop to CategoryView |
| Modify | `src/renderer/QuickAdd.tsx` | Domain auto-tag pre-fill when URL detected |
| Create | `src/renderer/components/TagAutocomplete.tsx` | `#`-triggered tag dropdown component |

---

## Task 1: Domain Rules Utility

**Files:**
- Create: `src/shared/domain-rules.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/shared/domain-rules.ts

const DOMAIN_MAP: Record<string, string> = {
  'reddit.com': 'Reddit',
  'old.reddit.com': 'Reddit',
  'github.com': 'GitHub',
  'gist.github.com': 'GitHub',
  'x.com': 'X',
  'twitter.com': 'X',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'linkedin.com': 'LinkedIn',
  'news.ycombinator.com': 'HackerNews',
  'medium.com': 'Medium',
  'producthunt.com': 'ProductHunt',
  'stackoverflow.com': 'StackOverflow',
  'dev.to': 'DevTo',
  'substack.com': 'Substack',
}

export function getDomainTag(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return DOMAIN_MAP[hostname] ?? null
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Verify it compiles**

```powershell
cd "C:\Users\suman\Desktop\Docs\Job\Projects\cortex"
npx tsc --noEmit --skipLibCheck
```

Expected: no errors related to `domain-rules.ts`

- [ ] **Step 3: Commit**

```bash
git add src/shared/domain-rules.ts
git commit -m "feat: add domain-rules utility for hostname-to-tag mapping"
```

---

## Task 2: Link Title Fetching (Background)

**Files:**
- Create: `src/main/api/link-fetch.ts`
- Modify: `src/main/api/items.ts` (add `updateItemTitle`)
- Modify: `src/main/index.ts` (trigger fetch on create)

- [ ] **Step 1: Add `updateItemTitle` to items.ts**

Add this export after the `getDistinctTags` function (around line 296):

```typescript
export function updateItemTitle(db: Database.Database, id: string, title: string): void {
  db.prepare('UPDATE items SET title = ?, updated_at = ? WHERE id = ?')
    .run(title.slice(0, 200), Date.now(), id)
}
```

- [ ] **Step 2: Create `src/main/api/link-fetch.ts`**

```typescript
// src/main/api/link-fetch.ts
import Database from 'better-sqlite3'
import { updateItemTitle } from './items'

export async function fetchAndUpdateLinkTitle(
  db: Database.Database,
  id: string,
  url: string
): Promise<void> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Cortex/1.0)' }
    })
    if (!res.ok) return
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return

    const html = await res.text()

    const ogTitle =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]

    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]

    const title = (ogTitle ?? titleTag ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')

    if (title) {
      updateItemTitle(db, id, title)
    }
  } catch {
    // silent — title stays as URL hostname
  }
}
```

- [ ] **Step 3: Update the `data:create-item` IPC handler in `src/main/index.ts`**

Add the import at the top of `index.ts` (after existing imports):

```typescript
import { fetchAndUpdateLinkTitle } from './api/link-fetch'
```

Find the `ipcMain.handle('data:create-item', ...)` block and replace just the body so that a background title fetch fires after creation:

```typescript
ipcMain.removeHandler('data:create-item')
ipcMain.handle('data:create-item', (_event, payload: any) => {
  const db = getDb()
  const item = createItem(db, {
    id: nanoid(),
    type: payload?.type === 'link' ? 'link' : 'idea',
    title: typeof payload?.title === 'string' ? payload.title : '',
    url: typeof payload?.url === 'string' ? payload.url : null,
    note: typeof payload?.note === 'string' ? payload.note : null,
    priority:
      typeof payload?.priority === 'string' &&
      ['inbox', 'today', 'tomorrow', 'this-week', 'someday'].includes(payload.priority)
        ? payload.priority
        : 'inbox',
    tags: Array.isArray(payload?.tags)
      ? payload.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
      : [],
    favicon_url: typeof payload?.favicon_url === 'string' ? payload.favicon_url : null,
    remind_at: typeof payload?.remind_at === 'number' ? payload.remind_at : null
  })
  if (item.type === 'link' && item.url) {
    void fetchAndUpdateLinkTitle(db, item.id, item.url)
  }
  updateTrayCounts()
  return item
})
```

- [ ] **Step 4: Verify build**

```powershell
npx tsc --noEmit --skipLibCheck
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/main/api/link-fetch.ts src/main/api/items.ts src/main/index.ts
git commit -m "feat: background og:title fetch on link item creation"
```

---

## Task 3: Domain Auto-Tagging in Poller

**Files:**
- Modify: `src/main/telegram/poller.ts`

When a Telegram message contains a URL, this task auto-adds the matching domain tag (e.g., Reddit) and fires a background title fetch.

- [ ] **Step 1: Update `src/main/telegram/poller.ts`**

Add the import at the top (after existing imports):

```typescript
import { getDomainTag } from '../../shared/domain-rules'
import { fetchAndUpdateLinkTitle } from '../api/link-fetch'
```

Inside `drainBotQueue`, find the block that calls `createItem` and replace it with:

```typescript
    try {
      const domainTag = url ? getDomainTag(url) : null
      const autoTags = domainTag ? [domainTag] : []

      const created = createItem(db, {
        id: nanoid(),
        type: url ? 'link' : 'idea',
        title: row.message_text,
        url,
        note: null,
        priority,
        tags: autoTags,
        favicon_url: null,
        remind_at: row.parsed_remind_at ?? null
      })

      if (url) {
        void fetchAndUpdateLinkTitle(db, created.id, url)
      }

      insertedCount += 1
    } catch (insertError) {
      console.error('[telegram] Failed to insert queue row into SQLite:', row.id, insertError)
    }
```

- [ ] **Step 2: Verify build**

```powershell
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 3: Commit**

```bash
git add src/main/telegram/poller.ts
git commit -m "feat: auto-tag Telegram links by domain (Reddit, GitHub, YouTube etc.)"
```

---

## Task 4: Category Accordion CSS

**Files:**
- Modify: `src/renderer/styles/globals.css`

Add these new CSS rules. Do **not** remove existing `.category-grid` rules yet — wait until Task 5 replaces the component (existing rules just become dead CSS until then).

- [ ] **Step 1: Append new category CSS to globals.css**

Find the end of the file and add:

```css
/* ─── Category Accordion ────────────────────────────────────── */

.cat-accordion {
  display: flex;
  flex-direction: column;
}

.cat-section {
  border-bottom: 1px solid var(--rule);
}

.cat-section:first-child {
  border-top: 1px solid var(--rule);
}

.cat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 0;
  cursor: pointer;
  user-select: none;
}

.cat-header:hover .cat-header-name {
  color: var(--ink);
}

.cat-chevron {
  width: 16px;
  height: 16px;
  color: var(--ink-dim);
  flex-shrink: 0;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.cat-chevron[data-open='true'] {
  transform: rotate(90deg);
}

.cat-header-name {
  font-family: 'Fraunces', 'Iowan Old Style', Georgia, serif;
  font-size: 17px;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.cat-header-count {
  font-size: 12px;
  color: var(--ink-dim);
  font-variant-numeric: tabular-nums;
}

.cat-header-sub-count {
  font-size: 11px;
  color: var(--ink-dim);
  margin-left: 2px;
}

.cat-header-spacer {
  flex: 1;
}

.cat-content-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.cat-content-wrap[data-open='true'] {
  grid-template-rows: 1fr;
}

.cat-content-inner {
  overflow: hidden;
}

.cat-content {
  padding-bottom: 14px;
}

/* Subfolder grid */

.cat-subfolder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.cat-subfolder-col {
  background: var(--paper-raised);
  border: 1px solid var(--rule);
  border-radius: 10px;
  padding: 10px 12px;
}

.cat-subfolder-header {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--ink-soft);
  text-transform: uppercase;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cat-subfolder-count {
  font-weight: 400;
  color: var(--ink-dim);
}

/* Item rows */

.cat-direct-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--ink-dim);
  text-transform: uppercase;
  margin: 10px 0 6px;
}

.cat-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
}

.cat-item-row:hover {
  background: var(--paper-deep);
}

.cat-item-row:hover .cat-item-complete {
  opacity: 1;
}

.cat-item-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cat-item-favicon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border-radius: 2px;
}

.cat-item-idea-mark {
  font-size: 16px;
  color: var(--idea-warm);
  line-height: 1;
  flex-shrink: 0;
}

.cat-item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-item-domain {
  font-size: 11px;
  color: var(--ink-dim);
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
}

.cat-item-complete {
  opacity: 0;
  background: none;
  border: none;
  font-size: 12px;
  color: var(--ink-dim);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  flex-shrink: 0;
  transition: opacity 120ms ease;
}

.cat-item-complete:hover {
  color: var(--teal);
  background: var(--paper-deep);
}

/* Inline add */

.cat-inline-add {
  margin-top: 6px;
  padding: 0 8px;
}

.cat-inline-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--rule);
  border-radius: 0;
  padding: 6px 0;
  font-size: 13px;
  color: var(--ink);
  font-family: inherit;
  outline: none;
}

.cat-inline-input::placeholder {
  color: var(--ink-dim);
  font-style: italic;
}

.cat-inline-input:focus {
  border-bottom-color: var(--ink-stamp);
}

.cat-inline-error {
  font-size: 11px;
  color: var(--flag-red);
  display: block;
  margin-top: 3px;
  padding: 0 0;
}

/* Untagged section */

.cat-section[data-untagged='true'] .cat-header-name {
  color: var(--ink-dim);
  font-style: italic;
}

.cat-section[data-untagged='true'] .cat-content {
  background: var(--paper-deep);
  border-radius: 6px;
  padding: 8px 10px 10px;
  margin-bottom: 4px;
}

.cat-untagged-hint {
  font-size: 11px;
  color: var(--ink-dim);
  margin-bottom: 8px;
}

/* Drop target highlight */

.cat-section[data-drop='true'] .cat-header {
  background: oklch(40% 0.13 260 / 0.05);
  border-radius: 6px;
}

/* ─── TagAutocomplete ────────────────────────────────────────── */

.tag-autocomplete-wrap {
  position: relative;
}

.tag-autocomplete-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 200px;
  max-height: 200px;
  overflow-y: auto;
  background: var(--paper-raised);
  border: 1px solid var(--rule);
  border-radius: 8px;
  box-shadow: 0 8px 24px oklch(22% 0.015 60 / 0.12);
  z-index: 100;
  padding: 4px;
}

.tag-autocomplete-item {
  padding: 7px 10px;
  font-size: 13px;
  color: var(--ink);
  border-radius: 5px;
  cursor: pointer;
}

.tag-autocomplete-item:hover,
.tag-autocomplete-item[data-active='true'] {
  background: var(--paper-deep);
}

.tag-autocomplete-match {
  font-weight: 600;
  color: var(--ink-stamp);
}

.tag-autocomplete-new {
  font-size: 11px;
  color: var(--ink-dim);
  padding: 5px 10px;
  border-top: 1px solid var(--rule);
  margin-top: 4px;
}
```

- [ ] **Step 2: Verify app still loads (no CSS parse error)**

```powershell
npm run dev
```

Open the Category tab. Still shows old horizontal layout (CategoryView.tsx not changed yet). No visual regressions on Priority tab.

- [ ] **Step 3: Kill dev server (`Ctrl+C`), commit**

```bash
git add src/renderer/styles/globals.css
git commit -m "feat: add category accordion CSS classes"
```

---

## Task 5: CategoryView Full Rewrite

**Files:**
- Modify: `src/renderer/components/CategoryView.tsx` (full replacement)

This replaces the horizontal grid with a vertical accordion. Preserves drag-and-drop (drop onto section header). Removes idea note thread (plain text rows instead). Adds: priority dots, inline add, subfolder columns, Untagged pinned last.

- [ ] **Step 1: Replace the entire contents of `CategoryView.tsx`**

```typescript
import { useMemo, useRef, useState } from 'react'
import type { Item, ItemPayload } from '../lib/api'
import { parseTag } from '../lib/utils'

interface Props {
  items: Item[]
  onTagChange: (item: Item, nextTags: string[]) => Promise<void> | void
  onComplete: (item: Item) => Promise<void> | void
  onCardClick: (item: Item) => void
  onCreate: (payload: ItemPayload) => Promise<void>
}

type DragSource = { item: Item; fromTag: string } | null

interface TagBucket {
  tag: string
  items: Item[]
}

const PRIORITY_DOT_COLOR: Record<string, string> = {
  'for-now': 'var(--lane-coral)',
  today: 'var(--lane-teal)',
  tomorrow: 'var(--lane-butter)',
  'this-week': 'var(--lane-sage)',
  someday: 'var(--lane-violet)',
  inbox: 'var(--ink-dim)'
}

function getDomain(url: string | null): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

// ─── CategoryItemRow ──────────────────────────────────────────

function CategoryItemRow({
  item,
  onCardClick,
  onComplete,
  onDragStart,
  onDragEnd
}: {
  item: Item
  onCardClick: (item: Item) => void
  onComplete: (item: Item) => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const domain = getDomain(item.url)

  return (
    <div
      className="cat-item-row"
      onClick={() => onCardClick(item)}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onCardClick(item) }}
    >
      <span
        className="cat-item-dot"
        style={{ background: PRIORITY_DOT_COLOR[item.priority] ?? 'var(--ink-dim)' }}
      />
      {item.type === 'link' && item.favicon_url ? (
        <img src={item.favicon_url} className="cat-item-favicon" alt="" width={14} height={14} />
      ) : item.type === 'link' ? (
        <span className="cat-item-idea-mark" style={{ color: 'var(--ink-dim)', fontSize: 13 }}>⬡</span>
      ) : (
        <span className="cat-item-idea-mark">•</span>
      )}
      <span className="cat-item-title">{item.title}</span>
      {domain ? <span className="cat-item-domain">{domain}</span> : null}
      <button
        type="button"
        className="cat-item-complete"
        onClick={(e) => { e.stopPropagation(); onComplete(item) }}
        title="Mark complete"
      >
        ✓
      </button>
    </div>
  )
}

// ─── CategoryInlineAdd ────────────────────────────────────────

function CategoryInlineAdd({
  category,
  allItems,
  onCreate
}: {
  category: string
  allItems: Item[]
  onCreate: (payload: ItemPayload) => Promise<void>
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const trimmed = value.trim()
    if (!trimmed) return

    const url = isUrl(trimmed) ? trimmed : null

    if (url) {
      const isDupe = allItems.some(
        (item) =>
          item.url === url &&
          item.tags.some((t) => parseTag(t).parent === category)
      )
      if (isDupe) {
        setError('Already saved in this category.')
        return
      }
    }

    try {
      await onCreate({
        type: url ? 'link' : 'idea',
        title: url ? url.replace(/^https?:\/\//, '') : trimmed,
        url: url ?? undefined,
        note: null,
        priority: 'inbox',
        tags: [category],
        remind_at: null
      })
      setValue('')
      setError(null)
    } catch {
      setError('Could not save.')
    }
  }

  return (
    <div className="cat-inline-add">
      <input
        ref={inputRef}
        className="cat-inline-input"
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(null) }}
        onKeyDown={handleKeyDown}
        placeholder={`Add to ${category}...`}
      />
      {error ? <span className="cat-inline-error">{error}</span> : null}
    </div>
  )
}

// ─── ItemList ─────────────────────────────────────────────────
// Renders a flat list of items (used for direct items and subfolder items)

function ItemList({
  items: listItems,
  onCardClick,
  onComplete,
  onDragStart,
  onDragEnd
}: {
  items: Item[]
  onCardClick: (item: Item) => void
  onComplete: (item: Item) => void
  onDragStart: (item: Item, fromTag: string) => void
  onDragEnd: () => void
}) {
  return (
    <>
      {listItems.map((item) => (
        <CategoryItemRow
          key={item.id}
          item={item}
          onCardClick={onCardClick}
          onComplete={onComplete}
          onDragStart={() => onDragStart(item, item.tags[0] ?? 'Untagged')}
          onDragEnd={onDragEnd}
        />
      ))}
    </>
  )
}

// ─── CategoryView ─────────────────────────────────────────────

export function CategoryView({ items, onTagChange, onComplete, onCardClick, onCreate }: Props) {
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [dragSource, setDragSource] = useState<DragSource>(null)
  const [dropTag, setDropTag] = useState<string | null>(null)

  // Build the same tree as before — Map<parent, Map<child|null, TagBucket>>
  const tree = useMemo(() => {
    const nextTree = new Map<string, Map<string | null, TagBucket>>()
    const seen = new Set<string>()
    const sortedItems = [...items].sort((a, b) => a.title.localeCompare(b.title))

    for (const item of sortedItems) {
      if (item.tags.length === 0) {
        if (!nextTree.has('Untagged')) {
          nextTree.set('Untagged', new Map([[null, { tag: 'Untagged', items: [] }]]))
        }
        nextTree.get('Untagged')?.get(null)?.items.push(item)
        continue
      }

      for (const tag of item.tags) {
        const { parent, child, raw } = parseTag(tag)
        if (!parent) continue

        if (!nextTree.has(parent)) nextTree.set(parent, new Map())
        const childBuckets = nextTree.get(parent)!
        if (!childBuckets.has(child)) childBuckets.set(child, { tag: raw, items: [] })

        const key = `${parent}|${child ?? ''}|${item.id}`
        if (!seen.has(key)) {
          childBuckets.get(child)?.items.push(item)
          seen.add(key)
        }
      }
    }

    return nextTree
  }, [items])

  const parentTags = Array.from(tree.keys()).sort((a, b) => {
    if (a === 'Untagged') return 1
    if (b === 'Untagged') return -1
    return a.localeCompare(b)
  })

  async function handleDrop(targetTag: string) {
    if (!dragSource || targetTag === 'Untagged' || targetTag === dragSource.fromTag) {
      setDragSource(null)
      setDropTag(null)
      return
    }

    const nextTags =
      dragSource.fromTag === 'Untagged'
        ? [...dragSource.item.tags, targetTag]
        : dragSource.item.tags
            .filter((t) => t.toLowerCase() !== dragSource.fromTag.toLowerCase())
            .concat(
              dragSource.item.tags.some((t) => t.toLowerCase() === targetTag.toLowerCase())
                ? []
                : [targetTag]
            )

    await onTagChange(dragSource.item, nextTags)
    setDragSource(null)
    setDropTag(null)
  }

  function toggleCategory(parent: string) {
    setOpenCategory((current) => (current === parent ? null : parent))
  }

  if (parentTags.length === 0) {
    return (
      <div className="content-panel">
        <div className="empty-state">
          No items yet. Press <strong>Ctrl+Shift+N</strong> or <strong>n</strong> to capture.
        </div>
      </div>
    )
  }

  return (
    <div className="content-panel">
      <div className="cat-accordion">
        {parentTags.map((parent) => {
          const childBuckets = tree.get(parent)!
          const isOpen = openCategory === parent
          const isUntagged = parent === 'Untagged'
          const canDrop = !isUntagged
          const totalCount = Array.from(childBuckets.values()).reduce(
            (s, b) => s + b.items.length,
            0
          )

          // Split into direct items (child === null) and subfolder buckets
          const directBucket = childBuckets.get(null)
          const subfolders = Array.from(childBuckets.entries())
            .filter(([child]) => child !== null)
            .sort(([a], [b]) => (a ?? '').localeCompare(b ?? ''))

          const subfolderCount = subfolders.length

          return (
            <section
              key={parent}
              className="cat-section"
              data-untagged={isUntagged || undefined}
              data-drop={dropTag === parent || undefined}
              onDragOver={(e) => {
                if (!canDrop || !dragSource) return
                e.preventDefault()
                setDropTag(parent)
              }}
              onDragLeave={() => {
                if (dropTag === parent) setDropTag(null)
              }}
              onDrop={async (e) => {
                e.preventDefault()
                await handleDrop(parent)
              }}
            >
              {/* Header row */}
              <div
                className="cat-header"
                onClick={() => toggleCategory(parent)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCategory(parent) }}
                aria-expanded={isOpen}
              >
                <svg
                  className="cat-chevron"
                  data-open={isOpen || undefined}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 4 10 8 6 12" />
                </svg>

                <span className="cat-header-name">{parent}</span>
                <span className="cat-header-count">
                  {totalCount} {totalCount === 1 ? 'item' : 'items'}
                </span>
                {subfolderCount > 0 ? (
                  <span className="cat-header-sub-count">
                    · {subfolderCount} {subfolderCount === 1 ? 'subfolder' : 'subfolders'}
                  </span>
                ) : null}
                <span className="cat-header-spacer" />
              </div>

              {/* Collapsible content */}
              <div className="cat-content-wrap" data-open={isOpen || undefined}>
                <div className="cat-content-inner">
                  <div className={`cat-content${isUntagged ? '' : ''}`}>

                    {isUntagged ? (
                      <p className="cat-untagged-hint">These have not been filed yet.</p>
                    ) : null}

                    {/* Subfolder columns (if any) */}
                    {subfolders.length > 0 ? (
                      <div className="cat-subfolder-grid">
                        {subfolders.map(([child, bucket]) => (
                          <div
                            key={child}
                            className="cat-subfolder-col"
                            data-drop={dropTag === bucket.tag || undefined}
                            onDragOver={(e) => {
                              if (!dragSource) return
                              e.preventDefault()
                              e.stopPropagation()
                              setDropTag(bucket.tag)
                            }}
                            onDragLeave={() => {
                              if (dropTag === bucket.tag) setDropTag(null)
                            }}
                            onDrop={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              await handleDrop(bucket.tag)
                            }}
                          >
                            <div className="cat-subfolder-header">
                              <span>{child}</span>
                              <span className="cat-subfolder-count">{bucket.items.length}</span>
                            </div>
                            <ItemList
                              items={bucket.items}
                              onCardClick={onCardClick}
                              onComplete={onComplete}
                              onDragStart={(item) => setDragSource({ item, fromTag: bucket.tag })}
                              onDragEnd={() => { setDragSource(null); setDropTag(null) }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Direct items (child === null) */}
                    {directBucket && directBucket.items.length > 0 ? (
                      <>
                        {subfolders.length > 0 ? (
                          <div className="cat-direct-label">Direct in {parent}</div>
                        ) : null}
                        <ItemList
                          items={directBucket.items}
                          onCardClick={onCardClick}
                          onComplete={onComplete}
                          onDragStart={(item) => setDragSource({ item, fromTag: parent })}
                          onDragEnd={() => { setDragSource(null); setDropTag(null) }}
                        />
                      </>
                    ) : null}

                    {/* Inline add */}
                    {!isUntagged ? (
                      <CategoryInlineAdd
                        category={parent}
                        allItems={items}
                        onCreate={onCreate}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default CategoryView
```

- [ ] **Step 2: Verify TypeScript**

```powershell
npx tsc --noEmit --skipLibCheck
```

Expected: error about `onCreate` prop missing on the `<CategoryView>` call in `App.tsx`. Fix in the next task.

- [ ] **Step 3: Do NOT commit yet — wait for Task 6 to fix the App.tsx error**

---

## Task 6: Pass `onCreate` from App.tsx to CategoryView

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Update the CategoryView JSX in App.tsx**

Find this block in App.tsx (around line 249):

```tsx
      ) : view === 'category' ? (
        <CategoryView
          items={items}
          onTagChange={handleTagChange}
          onComplete={handleComplete}
          onAppendNote={async (item, content) => {
            await appendNote(item.id, content)
          }}
          onCardClick={handleCardClick}
        />
```

Replace with:

```tsx
      ) : view === 'category' ? (
        <CategoryView
          items={items}
          onTagChange={handleTagChange}
          onComplete={handleComplete}
          onCardClick={handleCardClick}
          onCreate={create}
        />
```

Note: `onAppendNote` is removed — the new CategoryView no longer shows note threads.

- [ ] **Step 2: Verify build**

```powershell
npx tsc --noEmit --skipLibCheck
```

Expected: no errors.

- [ ] **Step 3: Run the app and test the accordion**

```powershell
npm run dev
```

Verify:
- Category tab shows vertical accordion, not horizontal columns
- Click a category header → it expands, others collapse
- Chevron rotates on expand
- Link items show favicon + title + domain
- Idea items show bullet + title (no note textarea)
- Priority dot appears on each item
- "Untagged" always at bottom, italic header
- Inline add input at bottom of each expanded section
- Type a URL in inline add + Enter → item appears, auto-tagged to that category
- Type a duplicate URL → "Already saved in this category." error appears
- Type a non-URL + Enter → idea item created
- Drag item between categories still works

- [ ] **Step 4: Kill dev server, commit both Task 5 and 6**

```bash
git add src/renderer/components/CategoryView.tsx src/renderer/App.tsx
git commit -m "feat: category accordion layout with inline add, priority dots, subfolder columns"
```

---

## Task 7: Domain Auto-Tag in QuickAdd

**Files:**
- Modify: `src/renderer/QuickAdd.tsx`

When a URL is pasted into QuickAdd and a domain tag is detected, pre-populate the tags field with that domain tag. User can remove it before saving.

- [ ] **Step 1: Add the import and auto-tag logic to QuickAdd.tsx**

Add import at the top (after existing imports):

```typescript
import { getDomainTag } from '../shared/domain-rules'
```

Find the `onChange` handler on the main input (around line 127):

```tsx
            onChange={(event) => {
              setValue(event.target.value)
              setError(null)
            }}
```

Replace with:

```tsx
            onChange={(event) => {
              const next = event.target.value
              setValue(next)
              setError(null)

              // Auto-fill domain tag when URL is detected
              if (isUrl(next.trim()) && !tags.trim()) {
                const domainTag = getDomainTag(next.trim())
                if (domainTag) {
                  setTags(domainTag)
                  setExpanded(true)
                }
              }
            }}
```

- [ ] **Step 2: Verify build**

```powershell
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 3: Run the app and test**

```powershell
npm run dev
```

Open QuickAdd (`n` key or Add button). Paste `https://www.reddit.com/r/Germany_Jobs/s/...`. Expected: tags field auto-fills with `Reddit`, expanded section opens automatically.

Paste a GitHub URL → `GitHub` appears. Paste a non-recognized URL → tags stays empty.

- [ ] **Step 4: Kill dev server, commit**

```bash
git add src/renderer/QuickAdd.tsx
git commit -m "feat: auto-fill domain tag in QuickAdd when URL is pasted"
```

---

## Task 8: TagAutocomplete Component

**Files:**
- Create: `src/renderer/components/TagAutocomplete.tsx`
- Modify: `src/renderer/QuickAdd.tsx` (wire in)

This component wraps a text input and shows a `#`-triggered dropdown of existing tags. When the user types `#g`, it shows matching tags starting with `g`.

- [ ] **Step 1: Create `src/renderer/components/TagAutocomplete.tsx`**

```typescript
import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  existingTags: string[]
  placeholder?: string
  className?: string
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function TagAutocomplete({ value, onChange, existingTags, placeholder, className }: Props) {
  const [dropdownQuery, setDropdownQuery] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Detect "#word" at the end of the input
  function getHashQuery(text: string): string | null {
    const match = text.match(/#(\w*)$/)
    return match ? match[1] : null
  }

  const suggestions = dropdownQuery !== null
    ? existingTags
        .filter((t) => t.toLowerCase().startsWith(dropdownQuery.toLowerCase()))
        .slice(0, 8)
    : []

  useEffect(() => {
    setActiveIndex(0)
  }, [dropdownQuery])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    onChange(next)
    const query = getHashQuery(next)
    setDropdownQuery(query)
  }

  function selectTag(tag: string) {
    // Replace the trailing "#word" with the selected tag
    const next = value.replace(/#\w*$/, tag)
    onChange(next)
    setDropdownQuery(null)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (dropdownQuery === null || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      const chosen = suggestions[activeIndex]
      if (chosen) {
        e.preventDefault()
        selectTag(chosen)
      }
    } else if (e.key === 'Escape') {
      setDropdownQuery(null)
    }
  }

  function highlightMatch(tag: string, query: string): React.ReactNode {
    if (!query) return tag
    const re = new RegExp(`^(${escapeRegex(query)})(.*)$`, 'i')
    const match = tag.match(re)
    if (!match) return tag
    return (
      <>
        <span className="tag-autocomplete-match">{match[1]}</span>
        {match[2]}
      </>
    )
  }

  return (
    <div className="tag-autocomplete-wrap">
      <input
        ref={inputRef}
        className={className}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Delay so click on dropdown item registers first
          setTimeout(() => setDropdownQuery(null), 150)
        }}
        placeholder={placeholder}
      />

      {dropdownQuery !== null && suggestions.length > 0 ? (
        <div ref={dropdownRef} className="tag-autocomplete-dropdown" role="listbox">
          {suggestions.map((tag, i) => (
            <div
              key={tag}
              className="tag-autocomplete-item"
              data-active={i === activeIndex || undefined}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault() // Prevent blur firing before click
                selectTag(tag)
              }}
            >
              {highlightMatch(tag, dropdownQuery)}
            </div>
          ))}
          {dropdownQuery && !existingTags.some((t) => t.toLowerCase() === dropdownQuery.toLowerCase()) ? (
            <div className="tag-autocomplete-new">
              Press Enter to create "{dropdownQuery}"
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default TagAutocomplete
```

- [ ] **Step 2: Wire TagAutocomplete into QuickAdd.tsx**

Add import at the top of `QuickAdd.tsx`:

```typescript
import { useEffect, useState as useStateAlias } from 'react' // already imported
import { TagAutocomplete } from './components/TagAutocomplete'
```

(Just add the TagAutocomplete import — `useEffect` and other imports already exist.)

```typescript
import { TagAutocomplete } from './components/TagAutocomplete'
```

Find the section where `existingTags` / `api.getTags()` is used. QuickAdd currently does **not** fetch existing tags. Add this after the spaces fetch in `useEffect`:

```typescript
  const [existingTags, setExistingTags] = useState<string[]>([])

  useEffect(() => {
    document.body.classList.add('quick-add-body')
    inputRef.current?.focus()
    inputRef.current?.select()
    void api.getSpaces().then(setSpaces).catch(() => setSpaces([]))
    void api.getTags().then(setExistingTags).catch(() => setExistingTags([]))

    return () => {
      document.body.classList.remove('quick-add-body')
    }
  }, [])
```

Then find the tags input in the expanded section (around line 155):

```tsx
            <input
              className="text-input"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="Tags (comma-separated, e.g. GitHub/Codex, AI)"
            />
```

Replace with:

```tsx
            <TagAutocomplete
              value={tags}
              onChange={setTags}
              existingTags={existingTags}
              placeholder="Tags — type # to search (comma-separated)"
              className="text-input"
            />
```

- [ ] **Step 3: Verify TypeScript**

```powershell
npx tsc --noEmit --skipLibCheck
```

Expected: no errors.

- [ ] **Step 4: Run the app and test**

```powershell
npm run dev
```

Open QuickAdd. Click `+ Tags / Spaces`. In the tags field, type `#`. Expected: dropdown appears with all existing tags. Type `#g` → shows only `GitHub` (if it exists). Press Enter → `GitHub` fills into the field. Type `#red` → `Reddit` shows. Arrow keys navigate. Escape closes without selecting.

Test: tags with comma separation still works (`GitHub, AI`).

- [ ] **Step 5: Kill dev server, commit**

```bash
git add src/renderer/components/TagAutocomplete.tsx src/renderer/QuickAdd.tsx
git commit -m "feat: hashtag autocomplete for tag input in QuickAdd"
```

---

## Self-Review

### Spec Coverage Check

| Feature | Task |
|---|---|
| 1. Category layout (accordion + subfolder columns) | Task 5, 6 |
| 2. Link title fetching (og:title) | Task 2 |
| 3. Subfolder columns inside expanded section | Task 5 |
| 4. Priority dot on category items | Task 5 |
| 5. Inline quick-add in expanded section (auto-fill tag) | Task 5 |
| 6. Untagged pinned last with "needs filing" treatment | Task 5 |
| 7. Duplicate URL detection on add | Task 5 |
| 8. Domain auto-tagging (Telegram + QuickAdd) | Task 3, 7 |
| 9. Hashtag `#` autocomplete | Task 8 |

All 9 features covered. ✓

### Placeholder Scan

- No TBDs or TODOs in task code blocks (one `// TODO` comment about title fetch ID in CategoryInlineAdd is intentional: title fetch is handled by the IPC handler in Task 2, not the renderer).
- All types used (`Item`, `ItemPayload`, `TagBucket`) defined in their respective tasks or imported from established files.
- `getDomainTag` defined in Task 1, used in Tasks 3 and 7. ✓
- `fetchAndUpdateLinkTitle` defined in Task 2, used in Tasks 2 and 3. ✓
- `updateItemTitle` defined in Task 2 (items.ts), called by `link-fetch.ts`. ✓

### Type Consistency

- `CategoryView` Props: `onCreate: (payload: ItemPayload) => Promise<void>`. In App.tsx, `create` from `useItems` returns `Promise<void>`. ✓
- `CategoryInlineAdd` calls `onCreate` with `ItemPayload` (no `id` field — correct, id is generated in main process). ✓
- `TagAutocomplete` props: `value: string`, `onChange: (value: string) => void` — matches QuickAdd's `tags` state and `setTags`. ✓

### Gap Check

One gap: `link-fetch.ts` uses global `fetch`. If running in a Node.js environment older than v18, this fails. Electron 37 ships with Node.js 22, so global `fetch` is available. No fix needed.

One gap: `CategoryInlineAdd` does not trigger title fetch for manually added links (only the IPC handler in `data:create-item` does it). This is intentional — the IPC handler covers all creation paths.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-02-category-view-redesign.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks. Use `superpowers:subagent-driven-development`.

**2. Inline Execution** — Execute tasks in this session. Use `superpowers:executing-plans`.

**Which approach?**
