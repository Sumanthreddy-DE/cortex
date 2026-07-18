# Issues + Research Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new item types (`issue`, `company`) and two new nav tabs (Issues, Research) so the user can capture friction/bugs and interesting companies separately from their ideas and links.

**Architecture:** Expand the `ItemType` union in both backend and frontend. Add a DB migration that recreates the `items` table with an expanded CHECK constraint. Add two view components (`IssuesView`, `ResearchView`) following the same pattern as `CompletedView`. Update `TopBar` with two new tabs. Update `App.tsx` to render the new views. Update `EditModal` so the type picker includes the new types. Issues and companies are filtered OUT of `PriorityView` column rendering so they only appear in their own tabs.

**Tech Stack:** SQLite (better-sqlite3), Express, React, TypeScript

---

### Task 1: Expand the DB type constraint

**Files:**
- Modify: `src/main/db/migrations.ts`

The current schema has `CHECK(type IN ('link','idea'))`. SQLite does not support `ALTER TABLE ... MODIFY CONSTRAINT`, so we recreate the table.

- [ ] **Step 1: Add a helper to detect whether migration is needed**

At the top of `runMigrations` in `src/main/db/migrations.ts`, after the initial `db.exec(...)` block, add:

```typescript
// Expand type CHECK constraint to include 'issue' and 'company'
const tableRow = db
  .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='items'`)
  .get() as { sql: string } | undefined

const needsTypeExpansion = tableRow && !tableRow.sql.includes("'issue'")

if (needsTypeExpansion) {
  db.exec(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE items_new (
      id           TEXT PRIMARY KEY,
      type         TEXT NOT NULL CHECK(type IN ('link','idea','issue','company')),
      title        TEXT NOT NULL,
      url          TEXT,
      note         TEXT,
      priority     TEXT NOT NULL CHECK(priority IN ('inbox','for-now','today','tomorrow','this-week','someday')),
      tags         TEXT NOT NULL DEFAULT '[]',
      favicon_url  TEXT,
      archived     INTEGER NOT NULL DEFAULT 0,
      remind_at    INTEGER,
      completed_at INTEGER,
      last_opened_at INTEGER,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    INSERT INTO items_new SELECT * FROM items;

    DROP TRIGGER IF EXISTS items_ai;
    DROP TRIGGER IF EXISTS items_ad;
    DROP TRIGGER IF EXISTS items_au;

    DROP TABLE items;
    ALTER TABLE items_new RENAME TO items;

    CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
      INSERT INTO items_fts(rowid, title, url, note)
      VALUES (new.rowid, new.title, COALESCE(new.url, ''), COALESCE(new.note, ''));
    END;

    CREATE TRIGGER items_ad AFTER DELETE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, title, url, note)
      VALUES ('delete', old.rowid, old.title, COALESCE(old.url, ''), COALESCE(old.note, ''));
    END;

    CREATE TRIGGER items_au AFTER UPDATE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, title, url, note)
      VALUES ('delete', old.rowid, old.title, COALESCE(old.url, ''), COALESCE(old.note, ''));
      INSERT INTO items_fts(rowid, title, url, note)
      VALUES (new.rowid, new.title, COALESCE(new.url, ''), COALESCE(new.note, ''));
    END;

    INSERT INTO items_fts(items_fts) VALUES ('rebuild');

    PRAGMA foreign_keys = ON;
  `)
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Start app briefly to confirm migration runs without crash**

```bash
npm run dev
```

Check the terminal for errors. If the app opens without crashing, the migration ran. Close the app.

- [ ] **Step 4: Commit**

```bash
git add src/main/db/migrations.ts
git commit -m "feat: expand items type constraint to include issue and company"
```

---

### Task 2: Update ItemType in backend and frontend

**Files:**
- Modify: `src/main/api/items.ts:5` (backend ItemType)
- Modify: `src/main/api/items.ts:604-616` (POST validation)
- Modify: `src/main/api/items.ts:640` (PATCH validation)
- Modify: `src/main/api/items.ts:463` (updateItem deriveIdeaFields guard)
- Modify: `src/renderer/lib/api.ts:11` (frontend ItemType)

- [ ] **Step 1: Update backend ItemType**

In `src/main/api/items.ts` line 5, change:

```typescript
export type ItemType = 'link' | 'idea'
```

to:

```typescript
export type ItemType = 'link' | 'idea' | 'issue' | 'company'
```

- [ ] **Step 2: Update POST validation in `itemsRouter`**

In `src/main/api/items.ts` around line 604, find:

```typescript
if (
  (type !== 'link' && type !== 'idea') ||
  (type === 'idea' && !hasIdeaContent) ||
  (type === 'link' && !hasLinkContent)
) {
  res.status(400).json({ error: 'Invalid item payload' })
  return
}
```

Replace with:

```typescript
const validTypes: ItemType[] = ['link', 'idea', 'issue', 'company']
const requiresUrl = type === 'link' || type === 'company'
const requiresTitle = type === 'idea' || type === 'issue'

if (
  !validTypes.includes(type as ItemType) ||
  (requiresUrl && !hasLinkContent) ||
  (requiresTitle && !hasIdeaContent)
) {
  res.status(400).json({ error: 'Invalid item payload' })
  return
}
```

- [ ] **Step 3: Update PATCH type validation**

In `src/main/api/items.ts` around line 640, find:

```typescript
if (type === 'link' || type === 'idea') {
  patch.type = type
}
```

Replace with:

```typescript
if (type === 'link' || type === 'idea' || type === 'issue' || type === 'company') {
  patch.type = type
}
```

- [ ] **Step 4: Guard `deriveIdeaFields` and `appendItemNote` for new types**

In `createItem` (around line 311) find:

```typescript
const nextFields =
  input.type === 'idea'
    ? deriveIdeaFields(input.title, nextNote)
    : { title: deriveLinkTitle(input.title, nextUrl), note: nextNote }
```

Change to:

```typescript
const nextFields =
  input.type === 'idea' || input.type === 'issue'
    ? deriveIdeaFields(input.title, nextNote)
    : { title: deriveLinkTitle(input.title, nextUrl), note: nextNote }
```

Do the same in `updateItem` (around line 463):

```typescript
const nextFields =
  nextType === 'idea' || nextType === 'issue'
    ? deriveIdeaFields(patch.title ?? current.title, nextNote)
    : { title: deriveLinkTitle(patch.title ?? current.title, nextUrl), note: nextNote }
```

In `appendItemNote` (around line 500), the guard `current.type !== 'idea'` should also allow `'issue'`:

```typescript
if (!current || (current.type !== 'idea' && current.type !== 'issue') || !trimmed) {
  return null
}
```

- [ ] **Step 5: Update frontend ItemType**

In `src/renderer/lib/api.ts` line 11, change:

```typescript
export type ItemType = 'link' | 'idea'
```

to:

```typescript
export type ItemType = 'link' | 'idea' | 'issue' | 'company'
```

- [ ] **Step 6: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/main/api/items.ts src/renderer/lib/api.ts
git commit -m "feat: add issue and company to ItemType, update validation"
```

---

### Task 3: Add `issues` and `research` to View type and filter PriorityView

**Files:**
- Modify: `src/shared/constants.ts:42`
- Modify: `src/renderer/components/PriorityView.tsx` (filter out issue/company from columns)

- [ ] **Step 1: Expand the View type**

In `src/shared/constants.ts` line 42, change:

```typescript
export type View = 'priority' | 'category' | 'completed' | 'spaces' | 'archive' | 'settings'
```

to:

```typescript
export type View = 'priority' | 'category' | 'completed' | 'spaces' | 'archive' | 'settings' | 'issues' | 'research'
```

- [ ] **Step 2: Filter issues and companies out of PriorityView columns**

In `src/renderer/components/PriorityView.tsx`, the `sortedItems` is derived at line 201:

```typescript
const sortedItems = [...items].sort((left, right) => left.created_at - right.created_at)
```

Change to:

```typescript
const sortedItems = [...items]
  .filter((item) => item.type !== 'issue' && item.type !== 'company')
  .sort((left, right) => left.created_at - right.created_at)
```

This ensures issues and companies added via inbox never appear in the priority board columns.

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/constants.ts src/renderer/components/PriorityView.tsx
git commit -m "feat: add issues/research views, filter new types from priority board"
```

---

### Task 4: Add Issues and Research nav tabs to TopBar

**Files:**
- Modify: `src/renderer/components/TopBar.tsx`

- [ ] **Step 1: Add two buttons to the segmented nav in TopBar**

In `src/renderer/components/TopBar.tsx`, inside the `<div className="segmented">` block, after the Archive button, add:

```tsx
<button type="button" data-active={view === 'issues'} onClick={() => onViewChange('issues')}>
  Issues
</button>
<button type="button" data-active={view === 'research'} onClick={() => onViewChange('research')}>
  Research
</button>
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/TopBar.tsx
git commit -m "feat: add Issues and Research tabs to TopBar"
```

---

### Task 5: Create IssuesView component

**Files:**
- Create: `src/renderer/components/IssuesView.tsx`

Issues are items with `type === 'issue'`. Show them as a simple list grouped by priority (Inbox first, then Today, This Week, Someday). Each row shows title, priority badge, and a complete button.

- [ ] **Step 1: Create `IssuesView.tsx`**

```tsx
import { Check } from 'lucide-react'
import type { Item } from '../lib/api'
import { PRIORITIES, type Priority } from '../../shared/constants'

interface Props {
  items: Item[]
  onCardClick: (item: Item) => void
  onComplete: (item: Item) => void
}

const ISSUE_PRIORITY_LABELS: Record<Priority, string> = {
  inbox: 'Inbox',
  'for-now': 'Today',
  today: 'Today',
  tomorrow: 'Tomorrow',
  'this-week': 'This Week',
  someday: 'Someday'
}

const DISPLAY_PRIORITIES: Priority[] = ['inbox', 'today', 'tomorrow', 'this-week', 'someday']

export function IssuesView({ items, onCardClick, onComplete }: Props) {
  const issueItems = items.filter((item) => item.type === 'issue')

  return (
    <div className="content-panel issues-view">
      <header className="issues-header">
        <h1>Issues</h1>
        <p>Friction, bugs, and blockers — captured fast, resolved over time.</p>
      </header>

      {issueItems.length === 0 ? (
        <div className="empty-state">No issues captured yet. Add one with the + Add button.</div>
      ) : (
        <div className="issues-groups">
          {DISPLAY_PRIORITIES.map((priority) => {
            const group = issueItems.filter(
              (item) => (item.priority === priority || (priority === 'today' && item.priority === 'for-now'))
            )
            if (group.length === 0) return null
            return (
              <section key={priority} className="issues-group">
                <h3 className="issues-group-label">{ISSUE_PRIORITY_LABELS[priority]}</h3>
                {group.map((item) => (
                  <div key={item.id} className="issue-row" onClick={() => onCardClick(item)}>
                    <span className="issue-row-title">{item.title}</span>
                    {item.tags.length > 0 ? (
                      <span className="issue-row-tags">
                        {item.tags.map((tag) => (
                          <span key={tag} className="issue-row-tag">{tag}</span>
                        ))}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="button-icon issue-complete-btn"
                      title="Mark resolved"
                      onClick={(e) => { e.stopPropagation(); onComplete(item) }}
                    >
                      <Check size={13} />
                    </button>
                  </div>
                ))}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default IssuesView
```

- [ ] **Step 2: Add CSS for IssuesView to globals.css**

Append to `src/renderer/styles/globals.css`:

```css
/* ── Issues view ── */
.issues-view { padding: 28px 32px; }
.issues-header { margin-bottom: 24px; }
.issues-header h1 { font-family: var(--font-display); font-size: 24px; font-weight: 500; margin-bottom: 4px; }
.issues-header p { font-size: 13px; color: var(--ink-soft); }

.issues-groups { display: flex; flex-direction: column; gap: 20px; }
.issues-group-label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-dim);
  margin-bottom: 6px;
}

.issue-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--paper-raised);
  border: 1px solid var(--rule);
  border-radius: 6px;
  margin-bottom: 5px;
  cursor: pointer;
  transition: border-color 0.1s;
}
.issue-row:hover { border-color: var(--ink-dim); }
.issue-row-title { flex: 1; font-size: 13px; color: var(--ink); }
.issue-row-tags { display: flex; gap: 4px; }
.issue-row-tag {
  font-size: 10px;
  font-family: var(--font-mono);
  padding: 1px 6px;
  background: var(--paper-deep);
  border-radius: 8px;
  color: var(--ink-dim);
}
.issue-complete-btn { opacity: 0; }
.issue-row:hover .issue-complete-btn { opacity: 1; }
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/IssuesView.tsx src/renderer/styles/globals.css
git commit -m "feat: add IssuesView component and styles"
```

---

### Task 6: Create ResearchView component

**Files:**
- Create: `src/renderer/components/ResearchView.tsx`

Research items are companies (`type === 'company'`). Each has a URL (company website or job posting), title (company name), and note (description/niches). Show as cards with favicon, title, URL hostname, and truncated note.

- [ ] **Step 1: Create `ResearchView.tsx`**

```tsx
import { ExternalLink } from 'lucide-react'
import type { Item } from '../lib/api'

interface Props {
  items: Item[]
  onCardClick: (item: Item) => void
}

function getHostname(url: string | null): string {
  if (!url) return ''
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function getFavicon(item: Item): string | null {
  if (!item.url) return null
  return item.favicon_url ?? `https://www.google.com/s2/favicons?domain=${getHostname(item.url)}&sz=32`
}

export function ResearchView({ items, onCardClick }: Props) {
  const companies = items.filter((item) => item.type === 'company')

  return (
    <div className="content-panel research-view">
      <header className="research-header">
        <h1>Research</h1>
        <p>Companies and opportunities worth tracking.</p>
      </header>

      {companies.length === 0 ? (
        <div className="empty-state">No companies saved yet. Add one with the + Add button.</div>
      ) : (
        <div className="research-grid">
          {companies.map((item) => {
            const favicon = getFavicon(item)
            const hostname = getHostname(item.url)
            return (
              <div key={item.id} className="research-card" onClick={() => onCardClick(item)}>
                <div className="research-card-top">
                  <span className="research-favicon">
                    {favicon ? (
                      <img
                        src={favicon}
                        alt=""
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      <span className="research-favicon-letter">
                        {item.title[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                  </span>
                  <div className="research-card-meta">
                    <span className="research-card-title">{item.title}</span>
                    {hostname ? (
                      <span className="research-card-host">{hostname}</span>
                    ) : null}
                  </div>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button-icon research-link-btn"
                      title="Open"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={12} />
                    </a>
                  ) : null}
                </div>
                {item.note ? (
                  <p className="research-card-note">{item.note}</p>
                ) : null}
                {item.tags.length > 0 ? (
                  <div className="research-card-tags">
                    {item.tags.map((tag) => (
                      <span key={tag} className="research-card-tag">{tag}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ResearchView
```

- [ ] **Step 2: Add CSS for ResearchView to globals.css**

Append to `src/renderer/styles/globals.css`:

```css
/* ── Research view ── */
.research-view { padding: 28px 32px; }
.research-header { margin-bottom: 24px; }
.research-header h1 { font-family: var(--font-display); font-size: 24px; font-weight: 500; margin-bottom: 4px; }
.research-header p { font-size: 13px; color: var(--ink-soft); }

.research-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.research-card {
  background: var(--paper-raised);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color 0.1s, box-shadow 0.1s;
}
.research-card:hover {
  border-color: var(--ink-dim);
  box-shadow: 0 2px 8px rgba(42,36,29,0.06);
}

.research-card-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.research-favicon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.research-favicon img { width: 20px; height: 20px; border-radius: 3px; }
.research-favicon-letter {
  width: 24px;
  height: 24px;
  background: var(--paper-deep);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-soft);
}

.research-card-meta { flex: 1; min-width: 0; }
.research-card-title {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.research-card-host {
  display: block;
  font-size: 11px;
  color: var(--ink-dim);
  font-family: var(--font-mono);
}

.research-link-btn { opacity: 0; }
.research-card:hover .research-link-btn { opacity: 1; }

.research-card-note {
  font-size: 12px;
  color: var(--ink-soft);
  line-height: 1.5;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.research-card-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.research-card-tag {
  font-size: 10px;
  font-family: var(--font-mono);
  padding: 1px 6px;
  background: var(--paper-deep);
  border-radius: 8px;
  color: var(--ink-dim);
}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/ResearchView.tsx src/renderer/styles/globals.css
git commit -m "feat: add ResearchView component and styles"
```

---

### Task 7: Wire both views into App.tsx

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Import the two new views**

In `src/renderer/App.tsx`, after the existing view imports, add:

```tsx
import IssuesView from './components/IssuesView'
import ResearchView from './components/ResearchView'
```

- [ ] **Step 2: Add view rendering in the JSX conditional chain**

In `App.tsx`, find the `view === 'spaces'` block (around line 289). After the closing `)` of that block and before `: view === 'settings'`, add:

```tsx
) : view === 'issues' ? (
  <IssuesView
    items={items}
    onCardClick={handleCardClick}
    onComplete={handleComplete}
  />
) : view === 'research' ? (
  <ResearchView
    items={items}
    onCardClick={handleCardClick}
  />
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat: wire IssuesView and ResearchView into App"
```

---

### Task 8: Add Issue and Company type override to EditModal

**Files:**
- Modify: `src/renderer/components/EditModal.tsx`

The current EditModal has NO type picker — type is auto-derived: URL present → `link`, no URL → `idea` (line 99 and 124). There is no `useState` for type. We add a `typeOverride` state that forces `issue` or `company` when set, bypassing the auto-derive.

- [ ] **Step 1: Import `ItemType` at the top of EditModal**

In `src/renderer/components/EditModal.tsx` line 5, change:

```tsx
import { api, Item, ItemPayload } from '../lib/api'
```

to:

```tsx
import { api, type Item, type ItemPayload, type ItemType } from '../lib/api'
```

- [ ] **Step 2: Add `typeOverride` state**

In `EditModal`, after the existing `useState` declarations (after line 93 `const [calendarError, setCalendarError] = useState('')`), add:

```tsx
const [typeOverride, setTypeOverride] = useState<'issue' | 'company' | null>(null)
```

- [ ] **Step 3: Initialize `typeOverride` from the item being edited**

In the first `useEffect` (line 102), after `setDeleteConfirm(false)`, add:

```tsx
setTypeOverride(
  item?.type === 'issue' || item?.type === 'company' ? item.type : null
)
```

The full useEffect becomes:

```tsx
useEffect(() => {
  setTitle(item?.title ?? '')
  setUrl(item?.url ?? '')
  setNote(item?.note ?? '')
  setPriority(item?.priority ?? 'inbox')
  setTagsInput(item?.tags.join(', ') ?? '')
  setRemindAt(toLocalInputValue(item?.remind_at ?? null))
  setDeleteConfirm(false)
  setTypeOverride(
    item?.type === 'issue' || item?.type === 'company' ? item.type : null
  )
}, [item])
```

- [ ] **Step 4: Update `resolvedType` to respect `typeOverride`**

Line 99 currently reads:

```tsx
const resolvedType = url.trim() ? 'link' : 'idea'
```

Replace with:

```tsx
const resolvedType: ItemType = typeOverride ?? (url.trim() ? 'link' : 'idea')
```

- [ ] **Step 5: Update `handleSubmit` to use `resolvedType`**

In `handleSubmit` (around line 124), change:

```typescript
const nextType = normalizedUrl ? 'link' : 'idea'
const normalizedTitle =
  nextType === 'link' ? title.trim() || normalizedUrl.replace(/^https?:\/\//i, '') : ideaDraft.title
```

to:

```typescript
const nextType: ItemType = typeOverride ?? (normalizedUrl ? 'link' : 'idea')
const normalizedTitle =
  nextType === 'link' || nextType === 'company'
    ? title.trim() || normalizedUrl.replace(/^https?:\/\//i, '')
    : ideaDraft.title
```

Also update the `note` field in the `onSave` call — change `nextType === 'idea'` to allow issue notes too:

```typescript
note: nextType === 'idea' || nextType === 'issue' ? ideaDraft.note : note.trim() || null,
```

- [ ] **Step 6: Add type override buttons to the modal body JSX**

In the modal body, after the URL `<label>` field (after the `<input ... placeholder="https://example.com" />` closing tag and its wrapping `</label>`), add:

```tsx
<div className="field-group">
  <span className="field-label">Type</span>
  <div className="type-override-row">
    <button
      type="button"
      className={`type-override-btn${typeOverride === null ? ' active' : ''}`}
      onClick={() => setTypeOverride(null)}
    >
      Auto
    </button>
    <button
      type="button"
      className={`type-override-btn${typeOverride === 'issue' ? ' active' : ''}`}
      onClick={() => setTypeOverride(typeOverride === 'issue' ? null : 'issue')}
    >
      Issue
    </button>
    <button
      type="button"
      className={`type-override-btn${typeOverride === 'company' ? ' active' : ''}`}
      onClick={() => setTypeOverride(typeOverride === 'company' ? null : 'company')}
    >
      Company
    </button>
  </div>
</div>
```

- [ ] **Step 7: Update the auto-type hint message**

The existing `<div className="card-meta">` hint (after the Notes field) reads:

```tsx
<div className="card-meta">
  {resolvedType === 'link'
    ? 'This will save as a link card because a URL is present.'
    : 'No URL yet, so this will save as an idea card.'}
</div>
```

Replace with:

```tsx
<div className="card-meta">
  {typeOverride === 'issue'
    ? 'Saving as an issue — will appear in the Issues tab.'
    : typeOverride === 'company'
    ? 'Saving as a company — will appear in the Research tab.'
    : resolvedType === 'link'
    ? 'This will save as a link card because a URL is present.'
    : 'No URL yet, so this will save as an idea card.'}
</div>
```

- [ ] **Step 8: Add CSS for the type override row**

Append to `src/renderer/styles/globals.css`:

```css
/* ── EditModal type override ── */
.type-override-row {
  display: flex;
  gap: 6px;
}
.type-override-btn {
  padding: 4px 12px;
  border: 1px solid var(--rule);
  border-radius: 5px;
  background: var(--paper-raised);
  color: var(--ink-soft);
  font-size: 12px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: border-color 0.1s, background 0.1s;
}
.type-override-btn:hover {
  border-color: var(--ink-dim);
  color: var(--ink);
}
.type-override-btn.active {
  border-color: var(--ink-stamp);
  background: rgba(61, 70, 145, 0.08);
  color: var(--ink-stamp);
  font-weight: 500;
}
```

- [ ] **Step 9: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 10: Start the app and test the full flow**

```bash
npm run dev
```

Test:
1. Click `+ Add` → Type row shows "Auto / Issue / Company" buttons, Auto active by default
2. Click Issue → hint says "Saving as an issue", enter title, save → item does NOT appear in priority board columns → click Issues tab → appears there
3. Click `+ Add` again → Click Company → enter name + URL → save → click Research tab → company card appears with favicon
4. Open an existing idea → Type row shows "Auto" active. No change to existing ideas.
5. Open an existing issue (if any) → Type row shows "Issue" active.

- [ ] **Step 11: Commit**

```bash
git add src/renderer/components/EditModal.tsx src/renderer/styles/globals.css
git commit -m "feat: add Issue and Company type override to EditModal"
```
