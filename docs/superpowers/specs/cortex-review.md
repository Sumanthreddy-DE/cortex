# Cortex — Full Review, Gaps & Recommendations
**Written:** 2026-04-25  
**Author:** Design review (post-conversation)  
**Purpose:** Everything I'd change, fix, add, or question — before you rewrite the spec.

Copy this file into `cortex/docs/superpowers/` alongside your spec and plan.

---

## 1. What I Liked ✅

These are genuinely well-designed. Don't second-guess them.

- **The priority promotion logic.** The midnight cron edge-case handling is thoughtful — "For Now never touched by cron", "pull 2 from This Week if Tomorrow is empty", idempotency via `meta` table. Most solo projects skip this entirely and end up with duplicate data bugs on restart.
- **Port 51204.** Boring and correct. The decision to centralise it in `src/shared/constants.ts` means you only ever need to change it in one place.
- **gws CLI for calendar instead of OAuth.** This removes 3–4 weeks of OAuth complexity. Smart shortcut for a personal tool.
- **SQLite FTS5 for search.** Right technology. No external search service, no Elasticsearch drama. Works offline, fast, single file.
- **Soft deletes (archived=1).** You will never regret this. Hard deletes always come back to haunt you.
- **The card hover spec (lift, not tilt).** The decision to disable tilt and do vertical lift only is more sophisticated than 3D tilt. Most devs do tilt because it's the tutorial example. Lift is harder to implement well and looks better.
- **TDD with unit → integration → E2E layering.** The discipline of writing failing tests before implementation is rare in personal projects. It will save you hours of debugging.
- **Phase ordering awareness.** Recognising that the Chrome extension should move to Phase 1b (before cron/notifications) shows real product thinking. The extension is the primary daily workflow — it needs to exist early.
- **"For Now never auto-cleared."** This is the right rule. It's the only column the user explicitly marked urgent by hand. Automatically touching it would break trust in the system.
- **Someday 30-day archive banner.** The subtle banner approach (not a modal, not a blocking alert) is the right balance between nudge and interruption.

---

## 2. What I Didn't Like ❌

These are things that need to change or were wrong design decisions.

### 2.1 WhatsApp bot (now resolved — moving to Telegram)
The original plan referenced WhatsApp. The official WhatsApp Business API requires Meta Business verification, takes 1–2 weeks, and costs money. Unofficial libraries (Baileys, WPPConnect) fake a phone session — WhatsApp bans numbers that do this. Your personal number would be at risk. **Telegram's Bot API is free, official, takes 10 minutes to set up, and does everything you need.** No reason to use WhatsApp for a personal bot.

### 2.2 No "Inbox" concept for phone-captured items
Items coming from your phone need a designated landing zone — not a priority, just "needs review." Without Inbox, bot-captured items have to go somewhere (Today? Someday?) and neither is right. The current schema doesn't support this. See Section 5 for the fix.

### 2.3 No per-card reminder system
The spec has calendar integration (gws CLI push) but nothing for a simple "remind me about this at 3pm" workflow. These are different things. Calendar = blocking time in your schedule. Reminder = a notification that says "hey, you wanted to do this." For a personal task manager, reminders are more useful day-to-day than calendar events. The fix is cheap: one `remind_at` DATETIME field in SQLite, one node-cron job that checks every minute. No external service, no cost. See Section 5.

### 2.4 Only one shortcut originally planned
The original Ctrl+Shift+S for everything meant the extension and Electron would fight over the same shortcut. Splitting into two (S for link capture, N for note capture) is cleaner, and the behaviour is meaningfully different enough to warrant two bindings.

### 2.5 Tag input is a bare text field with no memory
Tags are typed as comma-separated text in the modal. If you tag something "GitHub" today and "github" tomorrow, you have two separate tags. In Category view, they'll appear as separate groups. No autocomplete means no consistency. Phase 1 should at minimum show a dropdown of existing tags when the tag field is focused.

### 2.6 No keyboard navigation in the main views
The spec has Ctrl+K for search focus and Escape to close modals. But there's no arrow-key navigation between cards, no Enter-to-open, no J/K vim keys. For a tool you'll use 20× a day, mouse-only navigation is too slow. Even basic up/down arrow navigation within a column would help.

### 2.7 Morning digest time is hardcoded
`node-cron` schedule defaults to 8:00am with no way to change it in Phase 1. The spec mentions "user-configurable" but no UI for it exists in any task. Until Phase 4 ("Settings & Polish"), users are stuck with 8am. At minimum, store the preference in the `meta` table so Phase 4 can read/write it without a migration.

---

## 3. Things That Will Break — and How to Fix Them 🔴

These are bugs that will fail silently or crash the build. Fix before writing any code.

### 3.1 `app.isQuitting = true` — TypeScript build failure
**Where:** `src/main/index.ts`, Task 5 Step 3  
**Problem:** Electron's `app` object doesn't have an `isQuitting` property in its TypeScript types. The build will fail.  
**Fix:**
```typescript
// At the TOP of index.ts, before app.whenReady():
let isQuitting = false

// In the close event handler:
win.on('close', e => {
  if (!isQuitting) { e.preventDefault(); win.hide() }
})

// In before-quit:
app.on('before-quit', () => { isQuitting = true })
```

### 3.2 `jest.mock()` in a Vitest project — tests won't run
**Where:** `tests/integration/api.test.ts`, Task 3 Step 5  
**Problem:** The integration test uses `jest.mock(...)` but the test runner is Vitest. Jest and Vitest are not the same. The test file will throw `ReferenceError: jest is not defined`.  
**Fix:** Replace every `jest.mock(...)` with `vi.mock(...)` and add `import { vi } from 'vitest'` at the top.

```typescript
// WRONG (still in plan):
jest.mock('../../src/main/db/connection', () => { ... })

// CORRECT:
import { vi } from 'vitest'
vi.mock('../../src/main/db/connection', () => { ... })
```

Also note: `vi.mock()` is hoisted automatically by Vitest but the factory function runs at module load time, so the mock DB must be initialised inside the factory, not outside it.

### 3.3 `injectSpecular()` memory leak — thousands of orphaned style nodes
**Where:** `Card.tsx` and `IdeaCard.tsx`, Task 8  
**Problem:** The plan code creates a new `<style>` element in `<head>` on every `mousemove` event. With 20 cards and active mouse movement, this generates hundreds of style nodes per second. The browser will slow down and eventually crash the renderer.  
**Fix:** Delete `injectSpecular()` and `injectIdeaSpecular()` entirely. The `hover.css` file already reads `var(--mouse-x)` and `var(--mouse-y)` from the element's inline style. You only need:
```typescript
const onMouseMove = (e: React.MouseEvent) => {
  const el = ref.current; if (!el) return
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%')
  el.style.setProperty('--mouse-y', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%')
}
```
That's it. No style injection. The CSS handles the rest.

### 3.4 FTS5 search without prefix `*` — partial matches silently fail
**Where:** `src/main/api/search.ts`, Task 4  
**Problem:** Searching "make" will not find "makemore". FTS5 matches whole tokens by default. Without the `*` suffix, the search feels broken.  
**Fix:** Query format must be `"${sanitized}"*`:
```typescript
const rows = db.prepare(`
  SELECT items.* FROM items
  JOIN items_fts ON items.rowid = items_fts.rowid
  WHERE items_fts MATCH ? AND items.archived = 0
  ORDER BY rank LIMIT 50
`).all(`"${safe}"*`)  // ← the * is not optional
```

### 3.5 `meta` table missing from migrations — cron double-runs on restart
**Where:** `src/main/db/migrations.ts`, Task 2  
**Problem:** The spec defines an idempotency check using a `meta` table with `last_midnight_run`. The migration doesn't create this table. If Electron restarts at midnight, the cron fires again and double-promotes items.  
**Fix:** Add to the migration `db.exec()`:
```sql
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO meta VALUES ('last_midnight_run', '0');
INSERT OR IGNORE INTO meta VALUES ('morning_digest_time', '08:00');
```

### 3.6 `app.setLoginItemSettings` on non-Windows — crash
**Where:** `src/main/index.ts`, Task 5  
**Problem:** `setLoginItemSettings` behaves differently on macOS and is unsupported on Linux. Calling it unconditionally will crash on non-Windows.  
**Fix:** Wrap with platform guard:
```typescript
if (process.platform === 'win32') {
  app.setLoginItemSettings({ openAtLogin: true })
}
```

### 3.7 `getDb()` called at router instantiation — vi.mock() won't intercept
**Where:** `src/main/api/items.ts` and `search.ts`  
**Problem:** The `itemsRouter()` function calls `getDb()` at the top of its body, which runs at import time. By the time `vi.mock()` intercepts the module, `getDb()` has already been called with the real database path.  
**Fix:** Move `getDb()` calls inside each route handler, or pass the `db` instance into the router factory as a parameter:
```typescript
// Better pattern:
export function itemsRouter(db: Database.Database): Router {
  const router = Router()
  router.get('/', (_req, res) => { res.json(getAllItems(db)) })
  // ...
}
// In server.ts:
app.use('/api/items', itemsRouter(getDb()))
// In tests:
const testDb = new Database(':memory:')
runMigrations(testDb)
app.use('/api/items', itemsRouter(testDb))  // no mocking needed
```

### 3.8 Favicon `<img>` shows broken icon when Google API is unreachable
**Where:** `Card.tsx`, Task 8  
**Problem:** If the machine is offline or the domain is obscure, Google's favicon service returns a blank 16×16 pixel image (not a 404). The `onError` handler won't even fire. The UI shows a tiny grey square.  
**Fix:** Add both `onError` fallback AND detect blank favicons. Simpler approach: always render a letter-icon div, and overlay the favicon image on top of it. If the image loads, it covers the letter. If not, the letter shows through:
```tsx
<div style={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}>
  {/* Letter fallback — always rendered */}
  <div style={{
    width: 16, height: 16, borderRadius: 3,
    background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 9, fontWeight: 600, color: '#94a3b8', position: 'absolute', inset: 0
  }}>
    {(hostname[0] ?? '?').toUpperCase()}
  </div>
  {/* Favicon on top — hides letter if it loads */}
  <img
    src={faviconSrc}
    alt=""
    onError={e => { e.currentTarget.style.display = 'none' }}
    style={{ width: 16, height: 16, borderRadius: 3, position: 'absolute', inset: 0 }}
  />
</div>
```

### 3.9 CategoryView DnD removes wrong tag
**Where:** `CategoryView.tsx`, Task 11  
**Problem:** The original `onTagChange` implementation *adds* the new tag but doesn't remove the old one. Dragging "GitHub" card to "YouTube" column results in tags `["GitHub", "YouTube"]` instead of `["YouTube"]`.  
**Fix:** The drag handler must know both the source tag (the group the card came from) and the destination tag, and replace source with destination:
```typescript
// Track source tag, not just source item:
const [dragSource, setDragSource] = useState<{ item: Item; fromTag: string } | null>(null)

// On drop:
if (dragSource) {
  const newTags = dragSource.item.tags
    .filter(t => t !== dragSource.fromTag)  // remove source
    .concat(dropTag)                         // add destination
  onTagChange(dragSource.item, newTags)
}
```

### 3.10 Telegram bot has no offline queue
**Where:** New feature, not in spec yet  
**Problem:** If the Electron app is closed when you send a Telegram message, the webhook fires and the message is lost (or returns an error to Telegram).  
**Fix:** The Telegram bot should NOT write directly to SQLite via webhook. Instead: bot writes to a cloud-side queue (a free Supabase table or even a simple JSON in a free PlanetScale/Neon row). Electron polls this queue every 60 seconds when running and drains it into local SQLite. This means items captured on your phone always land somewhere safe, even when your laptop is off.

---

## 4. Things Working Fine — But Want Improvement 🟡

These aren't broken, but they'll feel rough in daily use.

### 4.1 The quick-capture popup needs its own window, not a modal
The spec describes the Ctrl+Shift+N window as "300×200px, centered, frameless, always-on-top." But there's no implementation task for it. This is the most-used interaction in the whole app and it has zero code. Add it as **Task 0 (before everything else)** — a Spotlight/Raycast-style floating input that appears over any application.

Visual spec for this window:
```
┌─────────────────────────────────┐
│  ⬡  Save to Cortex              │  ← no title bar, just a label
│  ─────────────────────────────  │
│  [                             ]│  ← auto-focused text input
│  Priority: [Today ▾]  Tags: [] │  ← inline, compact
│                    [Save] [Esc] │
└─────────────────────────────────┘
```
- Background: `#0f172a`, 1px border `#334155`, `border-radius: 12px`
- Box shadow: `0 24px 48px rgba(0,0,0,0.8)`
- Pressing Escape closes it. Pressing Enter saves and closes.
- The window is `frameless: true, alwaysOnTop: true, skipTaskbar: true` in Electron.

### 4.2 Loading state exists in hook but never shown
`useItems` returns `loading: boolean`. `App.tsx` ignores it. On startup, the user sees an empty kanban board for ~200ms before items load. This feels like a bug. Add skeleton rows to each column while loading — three grey rectangles of varying width, no shimmer needed.

### 4.3 For Now pinned strip has no task
Described in spec Section 5 but zero implementation in Task 10. This is a significant UX feature — the whole point of "For Now" is that it's inescapable. Add it to `PriorityView.tsx` as a sticky header that renders above the 6 columns:
```tsx
{forNowItems.length > 0 && (
  <div style={{
    position: 'sticky', top: 0, zIndex: 10,
    borderLeft: '2px solid #ef4444',
    background: 'rgba(239,68,68,0.06)',
    padding: '10px 16px', marginBottom: 20,
    display: 'flex', gap: 10, flexWrap: 'wrap'
  }}>
    {forNowItems.map(item => <Card key={item.id} item={item} onClick={onCardClick} />)}
  </div>
)}
```

### 4.4 Tag autocomplete would prevent duplicates
The single biggest data quality risk is inconsistent tag names ("github" vs "GitHub" vs "Github"). Adding a simple autocomplete dropdown on the tag field that shows existing tags would prevent this. Implementation: `GET /api/tags` endpoint that returns all distinct tags from the DB. Show as a datalist on the tag input. 10 lines of code, huge benefit.
```sql
SELECT DISTINCT json_each.value AS tag
FROM items, json_each(items.tags)
WHERE items.archived = 0
ORDER BY tag;
```

### 4.5 The Someday archive banner has no task
Spec Section 15 describes it. No code anywhere. Add a check in `PriorityView.tsx` when rendering the Someday column:
```typescript
const staleSomeday = someDayItems.filter(item => 
  Date.now() - item.created_at > 30 * 24 * 60 * 60 * 1000
)
// If staleSomeday.length > 0, show banner above the column
```

### 4.6 HTML5 DnD on Windows is janky
The HTML5 drag-and-drop API (`draggable`, `onDragStart`, `onDrop`) has a known issue on Windows: there's a visible ghost image that doesn't match your custom card styles, and the cursor changes to a system DnD cursor that looks dated. Consider using mouse events (`onMouseDown`, `onMouseMove`, `onMouseUp`) with a CSS `position: fixed` drag preview instead. More code, but looks significantly better.

---

## 5. New Things Not in Spec or Plan (Add These) 🆕

### 5.1 Inbox column — for all bot-captured and unreviewed items

Add `'inbox'` as a valid priority value in the DB schema:
```sql
priority TEXT NOT NULL CHECK(priority IN ('inbox','for-now','today','tomorrow','this-week','someday'))
```

The Inbox column in the UI:
- Leftmost column, before "For Now"
- Color: `#6b7280` (neutral gray)
- Label: "Inbox" with a badge count
- Items here have no time commitment — they just need to be reviewed
- When you drag an item out of Inbox into any priority column, it's "triaged"
- Items coming from Telegram bot default to `priority: 'inbox'`
- A "Review Inbox" indicator in the TopBar when count > 0

### 5.2 Per-card reminders — no external service, no cost

Add to schema (in migrations.ts):
```sql
remind_at INTEGER  -- Unix timestamp, nullable
```

New cron job (runs every minute: `* * * * *`):
```typescript
const dueItems = db.prepare(`
  SELECT * FROM items 
  WHERE remind_at IS NOT NULL 
    AND remind_at <= ? 
    AND archived = 0
`).all(Date.now())

dueItems.forEach(item => {
  new Notification({ title: 'Cortex Reminder', body: item.title }).show()
  db.prepare(`UPDATE items SET remind_at = NULL WHERE id = ?`).run(item.id)
})
```

In the Edit modal, add:
```tsx
<FieldLabel>Remind me</FieldLabel>
<input
  type="datetime-local"
  value={remindAt}
  onChange={e => setRemindAt(e.target.value)}
  style={inputStyle}
/>
```

This covers 80% of the calendar use case with zero external dependencies and zero cost.

### 5.3 Telegram bot architecture

**Components needed:**
1. A Telegram bot (created via @BotFather — takes 5 minutes)
2. A cloud sync queue — use a free Supabase table (free tier: 500MB, never expires)
3. A bot server — a tiny Node.js webhook handler deployed free on Railway or Render
4. Electron polling — every 60 seconds, drain the Supabase queue into local SQLite

**Flow:**
```
You (phone) → Telegram message → Bot webhook → Supabase queue table
                                                        ↓
Electron (polling every 60s) → drains queue → SQLite (priority: 'inbox')
                                                        ↓
You (laptop) → see new items in Inbox column → triage them
```

**What you can send:**
- Text → saved as Idea card to Inbox
- URL → saved as Link card to Inbox (bot auto-detects URLs)
- `/remind "thing" tomorrow 3pm` → saved with remind_at set
- `/today "thing"` → saved directly to Today instead of Inbox

**Cost: Zero.** Supabase free tier, Railway free tier (500 hours/month), Telegram Bot API is free forever.

**New file needed:** `cortex/docs/superpowers/plans/2026-XX-XX-cortex-phase2-telegram.md`

### 5.4 `src/shared/constants.ts` — missing creation task

Add as Task 0 in the plan:
```typescript
// src/shared/constants.ts
export const API_PORT = 51204
export const APP_NAME = 'Cortex'
export const DB_FILENAME = 'cortex.db'
export const REMINDER_CHECK_INTERVAL = '* * * * *'  // every minute
export const MIDNIGHT_CRON = '0 0 * * *'
export const DEFAULT_DIGEST_TIME = '0 8 * * *'      // 8:00am
```

Import `API_PORT` everywhere instead of hardcoding 51204. This is the single source of truth.

### 5.5 `/api/tags` endpoint — for autocomplete

Add to `search.ts` or create a new `tags.ts` route:
```typescript
router.get('/api/tags', (_req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT json_each.value AS tag
    FROM items, json_each(items.tags)
    WHERE items.archived = 0
    ORDER BY tag
  `).all()
  res.json(rows.map((r: any) => r.tag))
})
```

### 5.6 Keyboard navigation

In `App.tsx`, add a `keydown` listener:
- `/` → focus search (already in spec, good)
- `Escape` → clear search / close modal
- `n` (when no input focused) → open quick-add window
- `Arrow keys` (future) → navigate between cards

---

## 6. Specific Changes to Make in Existing Files

### In `cortex-design.md` (spec):

| Section | What to change |
|---|---|
| Section 2 (Architecture) | Add Telegram bot + Supabase queue to diagram |
| Section 5 (Views) | Add Inbox as 6th column, update column table |
| Section 9 (Quick Capture) | Clarify two-shortcut system: S=links (Chrome), N=notes (Electron global) |
| Section 11 (Search) | Add `/api/tags` endpoint spec |
| Section 12 (Cron) | Add per-minute reminder check cron job |
| Section 16 (Phases) | Phase 1b = Chrome extension, Phase 2 = Telegram bot, Phase 3 = Cron+Reminders |
| Section 18 (Tech notes) | Add: "Pass db as param to router factories — don't call getDb() at import time" |
| New section | Add Section 20: Telegram Bot Architecture |
| New section | Add Section 21: Reminder System |

### In `cortex-phase1.md` (plan):

| Task | What to change |
|---|---|
| Add Task 0 | Create `src/shared/constants.ts` with all constants |
| Task 2 | Add `inbox` to priority CHECK constraint, add `remind_at` field, add `meta` table |
| Task 3 | Change router factory signature to accept `db` param; fix `jest.mock` → `vi.mock` |
| Task 4 | Add `GET /api/tags` endpoint |
| Task 5 | Fix `app.isQuitting` → module-level boolean; add platform guard for `setLoginItemSettings` |
| Task 8 | Remove `injectSpecular()` entirely; add letter-icon favicon fallback |
| Task 10 | Add For Now pinned strip above kanban columns; add Inbox column |
| Task 11 | Fix DnD to pass source tag + destination tag; add `fromTag` to drag state |
| Task 12 | Replace emoji with Lucide icons; add `remind_at` datetime field |
| Add Task 15 | Global hotkey window (Ctrl+Shift+N floating note input) |
| Add Task 16 | Reminder cron (per-minute check for due `remind_at` items) |
| Add Task 17 | Tag autocomplete (fetch `/api/tags`, render as datalist) |
| Task 18 (was 16) | Archive view — already written, keep as-is |

---

## 7. Things I Would Do Differently If Building From Scratch

### 7.1 The quick-add flow is the core product — design it first
Everything else is secondary. The Chrome extension popup and the Ctrl+Shift+N floating window are the interactions you'll use most. I'd spend 80% of Phase 1 polish budget on these two surfaces and leave the main app views functional-but-rough.

### 7.2 Start with a list view, not kanban
Five-column kanban on a 1200px window is 1100px of content before padding. On a 1280px laptop (extremely common), that's no breathing room. I'd build Priority view as a **grouped list** first — each priority is a collapsible section with a row count. Visually cleaner, works at any window width, easier to scan quickly. Kanban stays as an optional toggle view.

### 7.3 The "Inbox" concept should have been in the spec from the start
Any system that accepts input from multiple sources (phone, extension, keyboard shortcut) needs an "unreviewed" bucket. Without Inbox, you're forced to assign a priority at capture time on mobile — which defeats the purpose of quick capture. "Save fast, categorize later" is the correct philosophy.

### 7.4 Reminders before calendar integration
Calendar events are scheduled blocks. Reminders are nudges. For a personal task manager, you want nudges far more than calendar events. The spec prioritised calendar (Phase 3) over reminders (not mentioned). It should be reversed.

### 7.5 Auto-tagging via URL domain is enough for Phase 1
The temptation to add LLM tagging is real. Resist it for now. The domain-based rules (github → GitHub, youtube → YouTube) cover 70% of daily use at zero cost. LLM tagging can come in Phase 5 if the rule-based system ever feels insufficient.

### 7.6 No paid APIs, ever, in this tool
Every feature should work offline with no external service dependency, except:
- Telegram bot (requires internet, but only for capture — app works offline after)
- Supabase sync queue (requires internet, but only for bot sync — local data always available)
- Google favicon API (graceful fallback if offline — letter icon)
- gws calendar (CLI already installed — no new dependencies)

This means no OpenAI API, no Claude API, no paid analytics, no crash reporting service. Zero ongoing costs.

---

## 8. Summary Priority List

If I had to tell you what to do in what order before writing a single line of code:

1. **Fix the 10 plan code bugs** listed in Section 3 — otherwise the build fails on day one
2. **Add Inbox to schema** — Telegram bot is useless without it
3. **Add `remind_at` to schema** — migrations are hard to change later
4. **Add `src/shared/constants.ts`** — port hardcoded in 6 places is a maintainability debt
5. **Write the floating quick-add window spec** — it's Phase 1 but has no task
6. **Write the Telegram bot plan** — it's a new plan file, not a task in the existing one
7. **Decide on list view vs kanban** — this affects how much CSS work Phase 1 is
8. **Rewrite the spec with all of the above** — then hand it to your coding agent

The spec is 90% there. It's unusually thorough for a solo project. The plan has good bones but the code blocks haven't caught up with the spec changes. Fix the code, add the missing tasks, and you'll have something you can hand to an agentic worker and trust.

---

*End of review. Questions? Update the spec, then share it back.*
