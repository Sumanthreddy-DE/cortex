# Phase 4 — UX Fixes + Morning Email Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five independent tasks. Execute them in order. Each has its own commit. All tasks are in the same repo at `C:\Users\suman\Desktop\Docs\Job\Projects\cortex`. Use worktree `feature/phase-4`.

**Status:** DONE — all 5 tasks committed (9727fec, 028c18d, 6d50ce8, abe6894, 7716b88). Tasks 1-4 runtime-verified 2026-07-18. Task 5 email path depends on gws CLI — see STATE.md.

**Tech stack:** Electron, React, TypeScript, SQLite (better-sqlite3), Node.js cron.

**Typecheck command:** `npm run typecheck` (runs `tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json`). Run after every task. Zero errors expected.

**IMPORTANT context before starting:**
- The app has a `midnight.ts` cron that already auto-promotes tomorrow → today at midnight. This is already working and does NOT need to be changed.
- The morning digest cron already exists in `src/main/cron/morning-digest.ts` and fires at 08:00. It currently sends only a Windows desktop notification with a count. This plan changes it to also send a Gmail email with the full task list, and changes the default time to 05:00.
- The `gws` CLI is a command-line tool available at `gws` (global install). Sending mail: `gws gmail +send --to <email> --subject "<subject>" --body "<body>"`. Assume it is authenticated.

---

## Task 1: Ideas dual display — Ideas items appear in priority columns

**Files to modify:**
- `src/renderer/components/PriorityView.tsx`

**What the bug is:**
Currently, `sortedItems` filters out items that have any fixed-bucket tag (`Daily`, `Groceries`, `Tools`, `Ideas`). This means an idea tagged `Ideas` with priority `today` never appears in the Today column — it only shows in the Ideas bucket. The user wants ideas to appear in BOTH their bucket AND the matching priority column simultaneously.

**Exact change needed:**

In `PriorityView.tsx`, find the `sortedItems` derivation. It currently looks like this (exact text may vary slightly):
```typescript
const sortedItems = [...items]
  .filter((item) => item.type !== 'issue' && item.type !== 'company')
  .sort((left, right) => left.created_at - right.created_at)
```

There is also a `getFixedBucketTag` helper (or inline logic) that determines whether an item is in a fixed bucket. Find where `columnItems` is derived. It filters `sortedItems` to exclude bucket items. It looks something like:
```typescript
const columnItems = sortedItems.filter((item) => !getFixedBucketTag(item.tags))
```

Change `columnItems` so that items tagged `Ideas` are NOT excluded if their priority is not `inbox`:
```typescript
const columnItems = sortedItems.filter((item) => {
  const bucketTag = getFixedBucketTag(item.tags)
  if (!bucketTag) return true
  // Ideas items with a non-inbox priority appear in columns AND bucket (dual display)
  return bucketTag === 'Ideas' && item.priority !== 'inbox'
})
```

If `getFixedBucketTag` does not exist and the filtering is done inline, adapt accordingly — the logic is: include the item in columns if it has no bucket tag, OR if its bucket tag is `Ideas` and priority is not `inbox`.

**Visual indicator (add to the card rendering):**
When rendering a card in the priority columns, if the item has an `Ideas` tag, add a small badge. Find where `renderCard` is called inside the column `.map()` loop. Wrap the card with a div that adds a `data-from-ideas` attribute, or alternatively pass a prop if `renderCard` supports it. The simplest approach: after rendering the card, overlay a small badge. Actually the simplest approach that requires no changes to the card component: just add the class or data attribute to the wrapper div and add CSS. Add this CSS to `src/renderer/styles/globals.css`:

```css
/* ── Ideas dual-display badge ── */
[data-from-ideas] .card-type-tag,
[data-from-ideas]::after {
  /* handled by wrapper */
}
.from-ideas-wrap { position: relative; }
.from-ideas-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--ink-stamp);
  background: rgba(61,70,145,0.08);
  border-radius: 8px;
  padding: 1px 6px;
  margin-top: 4px;
}
.from-ideas-badge::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ink-stamp);
  display: inline-block;
}
```

In the column card render, wrap each card with:
```tsx
{item.tags.includes('Ideas') ? (
  <div className="from-ideas-wrap">
    {renderCard(...)}
    <div className="from-ideas-badge">from Ideas</div>
  </div>
) : renderCard(...)}
```

NOTE: If the column card render is complex (drag-and-drop wrappers, etc.), just add the badge inside the existing wrapper div — do not restructure the drag logic.

- [x] Make the `columnItems` change
- [x] Add the `from-ideas-badge` CSS and badge rendering in columns
- [x] Run `npm run typecheck` — zero errors
- [x] Run `npm test` — all pass
- [x] Commit: `git add src/renderer/components/PriorityView.tsx src/renderer/styles/globals.css && git commit -m "feat: Ideas items with non-inbox priority appear in priority columns (dual display)"`

---

## Task 2: Hide Inbox column when empty

**Files to modify:**
- `src/renderer/components/PriorityView.tsx`

**What to do:**
The Inbox column (the leftmost priority column, `priority = 'inbox'`) should not render at all when zero items have priority=inbox (excluding fixed-bucket items, since those don't appear in columns).

Find where the priority columns are rendered. There is an array of priority values like `['inbox', 'today', 'tomorrow', 'this-week', 'someday']` (or `COLUMN_PRIORITIES` or similar constant) that drives the column render loop.

Count inbox column items before rendering:
```typescript
const inboxColumnItems = columnItems.filter((item) => item.priority === 'inbox' || item.priority === 'for-now')
// Only include 'inbox' in the rendered columns if there are items
const visibleColumnPriorities = COLUMN_PRIORITIES.filter(
  (p) => p !== 'inbox' || inboxColumnItems.length > 0
)
```

Then render using `visibleColumnPriorities` instead of `COLUMN_PRIORITIES`.

If the columns are not rendered from an array but hardcoded as JSX blocks, wrap the Inbox block with `{inboxColumnItems.length > 0 ? ( ...inbox column JSX... ) : null}`.

- [x] Find the column rendering logic
- [x] Add the conditional so Inbox column only renders when it has items
- [x] Run `npm run typecheck` — zero errors
- [x] Commit: `git add src/renderer/components/PriorityView.tsx && git commit -m "feat: hide inbox column when empty"`

---

## Task 3: Enter key saves and closes EditModal

**Files to modify:**
- `src/renderer/components/EditModal.tsx`

**What to do:**
When the user presses Enter anywhere inside the modal, it should trigger `handleSubmit()` and close the modal (save). Exception: if the focused element is a `<textarea>` or `<select>`, do nothing (Enter = newline in textarea, selection in select).

In `EditModal.tsx`, find the `<div className="modal-panel">` element. Add an `onKeyDown` handler:

```tsx
<div
  className="modal-panel"
  onClick={(event) => event.stopPropagation()}
  onKeyDown={(event) => {
    if (event.key !== 'Enter') return
    const tag = (event.target as HTMLElement).tagName.toLowerCase()
    if (tag === 'textarea' || tag === 'select') return
    event.preventDefault()
    if (canSave && !saving) {
      void handleSubmit()
    }
  }}
>
```

`canSave` and `saving` are already defined in the component — use them to guard the handler.

- [x] Add the `onKeyDown` handler to `.modal-panel`
- [x] Run `npm run typecheck` — zero errors
- [x] Manual test: open EditModal, type title, press Enter → should save and close. Open modal with Notes focused, press Enter → should add a newline, NOT close.
- [x] Commit: `git add src/renderer/components/EditModal.tsx && git commit -m "feat: Enter key saves and closes EditModal"`

---

## Task 4: Categories — all collapsed by default, independent toggle

**Files to modify:**
- `src/renderer/components/CategoryView.tsx`

**What the current bug is:**
Line 220: `const [openCategory, setOpenCategory] = useState<string | null>(null)`

This is a single string — only one category can be open at a time. Opening one closes the other. Also, when the view loads, `openCategory` is set to the first category automatically (via a `useEffect` around line 285). User wants: all collapsed by default, each toggles independently.

**Change 1 — Replace single-string state with a Set:**
```typescript
// REMOVE:
const [openCategory, setOpenCategory] = useState<string | null>(null)

// ADD:
const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
```

**Change 2 — Remove or fix the useEffect that auto-opens a category:**
Around line 285 there is a `useEffect` that sets `openCategory` when `parentTags` changes:
```typescript
useEffect(() => {
  if (!openCategory || !parentTags.includes(openCategory)) {
    // sets openCategory to first item
  }
}, [openCategory, parentTags])
```
Remove this `useEffect` entirely. With a Set default of `new Set()`, all categories start collapsed.

**Change 3 — Update the toggle handler:**
Find where `setOpenCategory` is called (in the category header click handler). Replace:
```typescript
setOpenCategory(isOpen ? null : parent)
```
with:
```typescript
setOpenCategories((prev) => {
  const next = new Set(prev)
  if (next.has(parent)) next.delete(parent)
  else next.add(parent)
  return next
})
```

**Change 4 — Update `isOpen` derivation:**
```typescript
// REMOVE:
const isOpen = openCategory === parent

// ADD:
const isOpen = openCategories.has(parent)
```

Do a global search for any other references to `openCategory` in this file and update them to use `openCategories` with `.has()`.

- [x] Replace state type and name
- [x] Remove the auto-open useEffect
- [x] Update toggle handler
- [x] Update `isOpen` derivation
- [x] Check for any other `openCategory` references and update
- [x] Run `npm run typecheck` — zero errors
- [x] Commit: `git add src/renderer/components/CategoryView.tsx && git commit -m "feat: categories all collapsed by default, independent toggle"`

---

## Task 5: Morning email — 5am digest with today's full task list

**Files to modify:**
- `src/main/cron/morning-digest.ts`
- `src/shared/constants.ts` (change default time from `'08:00'` to `'05:00'`)

**Context:**
- `midnight.ts` already promotes tomorrow → today at midnight. By 5am, today's list already includes what was in tomorrow.
- `morning-digest.ts` already has the scaffold: `shouldFireDigest()`, `recordDigestFired()`, `fireMorningDigest()`. It currently only sends a Windows desktop notification with a count.
- The `gws` CLI is installed globally. Send email with: `gws gmail +send --to "sumanthreddy.settipalli@fau.de" --subject "..." --body "..."`
- Use Node's `child_process.execSync` or `spawnSync` to call `gws`. Import from `'node:child_process'`.

**Change 1 — Default time to 05:00:**
In `src/shared/constants.ts`, change:
```typescript
export const DEFAULT_MORNING_DIGEST_TIME = '08:00'
```
to:
```typescript
export const DEFAULT_MORNING_DIGEST_TIME = '05:00'
```

**Change 2 — Add function to get today's items (not just count):**
In `morning-digest.ts`, add a new function:
```typescript
export function getTodayItems(db: Database.Database): Array<{ title: string; tags: string }> {
  return db
    .prepare(`
      SELECT title, tags
      FROM items
      WHERE (priority = 'today' OR priority = 'for-now')
        AND archived = 0
        AND completed_at IS NULL
      ORDER BY created_at ASC
    `)
    .all() as Array<{ title: string; tags: string }>
}
```

**Change 3 — Send Gmail email in `fireMorningDigest`:**
Update `fireMorningDigest` to call `gws gmail +send` after the existing notification logic. Add this after the `new Notification(...).show()` call (keep the notification, just also send the email):

```typescript
import { execSync } from 'node:child_process'

// Inside fireMorningDigest, after getDigestCounts:
const todayItems = getTodayItems(db)

// Build email body
const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
let emailBody: string
if (todayItems.length === 0) {
  emailBody = `Good morning!\n\nNothing on your plate today. Add something to Cortex.\n\n— Cortex`
} else {
  const taskLines = todayItems.map((item) => {
    const tags = (() => {
      try {
        const parsed = JSON.parse(item.tags) as string[]
        return parsed.length > 0 ? ` [${parsed.join(', ')}]` : ''
      } catch {
        return ''
      }
    })()
    return `• ${item.title}${tags}`
  }).join('\n')
  emailBody = `Good morning!\n\nYour tasks for ${today}:\n\n${taskLines}\n\n${todayItems.length} task${todayItems.length === 1 ? '' : 's'} total.\n\n— Cortex`
}

const subject = `Cortex — Today's tasks (${today})`

try {
  execSync(
    `gws gmail +send --to "sumanthreddy.settipalli@fau.de" --subject "${subject.replace(/"/g, '\\"')}" --body "${emailBody.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
    { timeout: 15_000 }
  )
} catch {
  // Email send failed silently — don't crash the app
}
```

NOTE: If the `gws gmail +send` command does not support `--body` as a flag (check `gws gmail +send --help` first by running it), adapt the call. Alternative: write body to a temp file and pass `--body-file /tmp/cortex-digest.txt`.

- [x] Change default time to `'05:00'` in `constants.ts`
- [x] Add `getTodayItems` function
- [x] Update `fireMorningDigest` to send email via `gws gmail +send`
- [x] Run `npm run typecheck` — zero errors
- [x] Run `npm test` — all pass (unit tests for morning digest exist in `tests/unit/morning-digest.test.ts` — check they still pass; they test `shouldFireDigest` and `getDigestCounts`, not the email send, so they should be fine)
- [x] Commit: `git add src/main/cron/morning-digest.ts src/shared/constants.ts && git commit -m "feat: morning digest at 5am sends Gmail with today's full task list"`
