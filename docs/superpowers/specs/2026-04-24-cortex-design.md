# Cortex — Design Spec
**Tagline:** Your links have a brain now.  
**Date:** 2026-04-24  
**Revised:** 2026-04-25 (post-review hardening)  
**Status:** Spec hardened — ready for implementation

---

## 1. What It Is

Cortex is a local-first personal command center for saving links, ideas, and notes — organized by time priority and category. It replaces the chaos of Chrome tabs across multiple profiles with a single always-available desktop app.

Core pain it solves: links get saved and never acted on. Cortex forces a priority decision at save time (For Now / Today / Tomorrow / This Week / Someday) and automatically promotes items forward as time passes.

---

## 2. Architecture

```
┌─────────────────────────────────────────┐
│           Electron Shell                │
│  ┌──────────────────────────────────┐   │
│  │   React Frontend (localhost:51204)│   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │   Express API (embedded)         │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │   SQLite DB (FTS5)               │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │   node-cron (scheduled jobs)     │   │
│  └──────────────────────────────────┘   │
└────────────────────┬────────────────────┘
                     │ localhost:51204
          ┌──────────▼──────────┐
          │  Chrome Extension   │
          │  (Manifest V3)      │
          │  Ctrl+Shift+S       │
          └─────────────────────┘
                     │ gws CLI subprocess
          ┌──────────▼──────────┐
          │  Google Calendar    │
          │  (opt-in per card)  │
          └─────────────────────┘
```

**Port: 51204** — chosen to avoid conflicts with common dev tools (React default 3000, Rails 3000, Vite 5173, etc.). Not user-configurable in Phase 1 but port constant is defined in one place (`src/shared/constants.ts`) so it can be changed without hunting.

**Electron** gives system tray presence, auto-start on Windows login, and native desktop notifications — same pattern as Wispr Flow.

---

## 3. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Desktop shell | Electron | System tray, auto-start, notifications, localhost server |
| Frontend | React + Vite | Modern, fast, component-based |
| Local API | Express (embedded in Electron) | Simple REST endpoints for extension ↔ app |
| Database | SQLite via `better-sqlite3` | Single file, FTS5 full-text search, no server needed |
| Scheduled jobs | `node-cron` | Midnight promotion, morning digest |
| Chrome extension | Manifest V3 | Quick capture from any Chrome tab / any profile |
| Calendar integration | `gws` CLI (subprocess) | Auth already handled, no OAuth code in app |
| Icons | Lucide React | Consistent SVG, **no emojis anywhere** |
| Font | Inter | Clean, professional, readable |
| E2E testing | Playwright CLI | Already installed on machine |

---

## 4. Design System

- **Background:** `#020617` (dark navy)
- **Surface:** `#0f172a` / `#1e293b`
- **Border:** `#334155` (subtle) / `#1e293b` (dim)
- **Text:** `#f8fafc` / `#94a3b8` (secondary) / `#475569` (muted)
- **Primary:** `#2563eb` (blue)
- **Accent:** `#f97316` (orange) — idea cards, CTA
- **Style:** Flat design — no gradients, no shadows, **no purple/violet**
- **Font:** Inter 300/400/500/600/700
- **Icons:** Lucide React (SVG, consistent stroke) — **zero emoji in the UI**
- **Dark-only for Phase 1–4.** Light mode deferred to Phase 5.

### Card Hover Effect
No 3D tilt — card lifts vertically toward the user with a soft specular highlight and rim glow that react to mouse position. Idea cards use orange specular; link cards use blue.

| Property | Value |
|----------|-------|
| Tilt | `0°` (disabled — lift only) |
| Lift height | `8.5px` (`translateZ`) |
| Specular size | `20%` radius |
| Specular brightness | `0.03` opacity |
| Rim glow | `0.18` opacity |
| Noise texture | `0.035` opacity, `160px` tile, `mix-blend-mode: overlay` |
| Transition | `80ms ease` on transform, `200ms ease` on border/glow |

**Implementation:** CSS custom properties `--mouse-x` / `--mouse-y` updated via `mousemove`. Specular injected as `::after` pseudo-element. Rim as `::before`. **No dynamic `<style>` element injection** — CSS in `hover.css` reads `var(--mouse-x)` / `var(--mouse-y)` directly. Injecting per-card `<style>` elements on every `mousemove` leaks thousands of DOM nodes. Set properties on `el.style` only.

---

## 5. Two Views

### Priority View (Kanban)
Six fixed columns in this order:

| Column | Dot Color | Auto-promoted from | Notes |
|--------|-----------|-------------------|-------|
| Inbox | `#6b7280` gray | Never auto-promoted | Bot-captured + unreviewed items |
| For Now | `#ef4444` red | Manual only — never auto-cleared | Pinned strip also shown above all columns |
| Today | `#f97316` orange | ← Tomorrow at midnight | |
| Tomorrow | `#6366f1` indigo | ← This Week (oldest 2, if Tomorrow empty) | |
| This Week | `#38bdf8` blue | Manual | |
| Someday | `#475569` slate | Manual — archive candidates | 30-day banner triggers archive |

**Inbox column:** The landing zone for all items that haven't been triaged yet — Telegram-captured items, quick-adds when you're in a hurry, anything captured without a time commitment. No deadline implied. The TopBar shows a badge count when Inbox is non-empty: `"Inbox (3)"`. Dragging an item out of Inbox into any other column is "triaging" it. `priority = 'inbox'` is a valid DB value.

**"For Now" pinned strip:** Items in the For Now column also appear as a persistent sticky strip at the top of the Priority view, above the kanban columns. This strip is always visible regardless of scroll position. Cards in the strip are identical to column cards. Strip disappears when For Now is empty. This makes urgency visceral — you can't scroll past it.

**Kanban layout:** Six 220px columns. Priority view is horizontally scrollable (`overflow-x: auto`). A gradient fade mask (`rgba(2,6,23,0)` → `rgba(2,6,23,1)`) on the right edge hints at more content. Columns do not clip — minimum column width 200px.

Cards in this view show: **favicon + title only**. No tags, no URL text.

### Category View
Items grouped by tag. All tags visible. Drag-and-drop between category groups — counts update live. Same data, different lens.

---

## 6. Tag System

Tags are **facets** — an item can belong to multiple categories simultaneously (a YouTube video about GitHub can be tagged `["GitHub", "YouTube"]`). This is the explicit design decision.

**Category view drag-and-drop semantics:** When a user drags a card from group A to group B, the intent is **move** (replace), not **add**. The implementation must:
1. Remove the source group's tag from the item's tags array
2. Add the destination group's tag
3. All other tags on the item are preserved

Example: card tagged `["GitHub", "AI Tools"]` dragged from GitHub group to YouTube group → result: `["AI Tools", "YouTube"]`. The "GitHub" tag is replaced by "YouTube"; "AI Tools" survives.

If an item belongs to multiple groups simultaneously, it appears in **each** of those groups in Category view. This is correct and expected behavior.

**Tag input:** Comma-separated string in edit modal, stored as JSON array in SQLite. Tag autocomplete is Phase 1 — see Section 11 for `/api/tags` endpoint. Without autocomplete, "GitHub" and "github" become two separate categories. The autocomplete datalist prevents this.

**Tag consistency rule:** Tags are case-preserving but case-insensitive for deduplication. When saving an item, normalize tags: trim whitespace, de-duplicate, preserve the casing of the first occurrence. "github" entered when "GitHub" already exists → stored as "GitHub".

---

## 7. Card Types

### Link Card
- Favicon auto-fetched from Google Favicon API (`/s2/favicons?domain=X&sz=32`)
- **Favicon fallback:** If the `<img>` `onError` fires (API down, unknown domain, offline), render a letter-icon placeholder: a `24×24` div with `background: #1e293b`, the domain's first letter in `#94a3b8`, `border-radius: 4px`. Never show a broken image icon.
- Title (auto-filled from page `<title>` when captured via extension)
- Tags stored but hidden in Priority view, visible in Category view
- No URL text shown — favicon is the visual indicator

### Idea / Note Card
- Orange left border (`2px solid #f97316`)
- Lucide `PenLine` icon as placeholder (16×16, `#f97316`) — **no pencil emoji**
- Title + optional note text (visible in Priority view)
- Same tag/priority system

### Reminder Field (both card types)
Both link and idea cards have an optional `remind_at` field (Unix timestamp, nullable). When set, a per-minute cron checks for due reminders and fires a native Electron notification.

- Stored as: `remind_at INTEGER` in the `items` table (nullable, default NULL)
- UI: datetime-local input in Edit modal, optional, labeled "Remind me at"
- After firing: `remind_at` is cleared (set to NULL) — one-shot reminder only
- Date inference: if priority is Today/Tomorrow, the datetime picker defaults to today/tomorrow at 9:00am
- This covers 80% of the Google Calendar use case with zero external dependencies

---

## 8. Loading & Empty States

**App startup:** `useItems` returns `{ items, loading, error }`. While `loading === true`, Priority view renders five columns with 2–3 skeleton card placeholders per column (gray `#1e293b` rounded rectangles, no shimmer animation needed). Once loaded, skeleton replaced by real cards.

**Empty column:** Show a muted dashed-border placeholder: `border: 1px dashed #334155`, `color: #475569`, text: `"Nothing here"`, centered vertically in the column. No icons, no call-to-action.

**Empty search results:** Full-width centered message: `"No results for "query""` in `#475569`.

**Empty Category view:** `"No items yet — press Ctrl+Shift+S to save your first link."` centered.

---

## 9. Quick Capture

### Chrome Extension (Ctrl+Shift+S)
1. User presses `Ctrl+Shift+S` from any Chrome tab (any profile)
2. Extension popup opens in Chrome toolbar
3. Current tab URL + page title auto-filled
4. Auto-detection suggests tags: `github.com/*` → GitHub, `youtube.com/*` → YouTube, `linkedin.com/jobs/*` → Full-time, etc.
5. User selects priority column + confirms/edits tags
6. POST to `localhost:51204/api/items` → saved to SQLite
7. Popup closes

Extension requires local server to be running. If server is unreachable, show: *"Cortex isn't running — launch it from the system tray."*

### Global Quick-Add Shortcut (Ctrl+Shift+N)
**Phase 1 feature.** A global keyboard shortcut registered via Electron's `globalShortcut` API. Works even when Cortex is minimized to tray. Opens a dedicated floating BrowserWindow:

```
┌─────────────────────────────────┐
│  ⬡  Save to Cortex              │  ← no title bar, just a label
│  ─────────────────────────────  │
│  [                             ]│  ← auto-focused text input
│  Priority: [Today ▾]  Tags: [] │  ← inline, compact
│                    [Save] [Esc] │
└─────────────────────────────────┘
```

Window spec: `width: 340, height: 180, frameless: true, alwaysOnTop: true, skipTaskbar: true, backgroundColor: '#0f172a'`, `border-radius: 12px` via CSS, `box-shadow: 0 24px 48px rgba(0,0,0,0.8)`.

- Title field is auto-focused on open
- Enter key → saves and closes
- Escape key → closes without saving
- Saves as Idea card by default (no URL). If title starts with `http`, type defaults to Link.
- Priority defaults to Inbox (save-fast-triage-later philosophy)

This is the most-used interaction in the app. Two shortcuts serve different capture contexts:
- **Ctrl+Shift+S** = from Chrome (link capture, URL auto-filled by extension)
- **Ctrl+Shift+N** = from anywhere (note/idea capture, no URL needed)

### In-App Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `/` or `Ctrl+K` | Focus search bar |
| `Escape` | Close modal / clear search |
| `n` (no input focused) | Open quick-add modal inside app |
| `Ctrl+Shift+N` | Global floating quick-add window (works from any app) |
| `Ctrl+Shift+S` | Chrome extension capture (browser only) |

---

## 10. Edit Modal

Triggered by clicking any card in either view.

**Link card fields:** Title, URL, Priority (dropdown), Tags (with autocomplete datalist), Remind me (datetime-local, optional), "Add to Calendar" button  
**Idea card fields:** Title, Notes (textarea), Priority (dropdown), Tags (with autocomplete datalist), Remind me (datetime-local, optional), "Add to Calendar" button  
**Footer:** Delete (red, left-aligned, with Lucide `Trash2` icon) | Cancel | Save

**No emoji in this modal.** Card type indicator uses Lucide `Link2` (link) or `PenLine` (idea) icon, `14px`, inline with the modal title.

### "Add to Calendar" (opt-in)
- Clicking the button shells out: `gws calendar insert --title "..." --date "..."`
- Uses the card's priority to infer a date (Today → today's date, Tomorrow → tomorrow, etc.)
- No OAuth in Cortex — gws CLI handles all Google auth
- Button shows Lucide `Check` icon + "Added" after success

---

## 11. Search

- Search bar in top nav, keyboard shortcut `/` or `Ctrl+K` to focus
- Full-text search using SQLite FTS5 across: title, URL, note text
- **FTS5 query:** Wrap user input in `"${safe}"*` — the trailing `*` enables prefix matching so "make" finds "makemore". Without it, FTS5 only matches whole tokens.
- Results shown in a flat list with matching text highlighted
- Filter by tag possible from Category view header clicks

### `/api/tags` Endpoint
Returns all distinct tags from non-archived items, ordered alphabetically. Used by the tag autocomplete datalist in the Edit modal and quick-add window.

```sql
SELECT DISTINCT json_each.value AS tag
FROM items, json_each(items.tags)
WHERE items.archived = 0
ORDER BY tag
```

Response: `string[]` — e.g. `["AI Tools", "GitHub", "YouTube"]`

The autocomplete is implemented as a native HTML `<datalist>` on the tag `<input>` — no library needed. This prevents "github" / "GitHub" / "Github" fragmentation that would create phantom duplicate categories in Category view.

---

## 12. Cron Jobs & Notifications

### Midnight Promotion (node-cron: `0 0 * * *`)
```
If Tomorrow column has items:
  → Move all to Today
  → Fire notification: "X items moved to Today"

Else if This Week has items:
  → Surface oldest 2 to Today
  → Notify: "Nothing due tomorrow — pulled 2 from This Week"

Else if Today has items:
  → Notify: "Still X things from today — clear them first"

Else (everything empty):
  → Notify: "Clean slate. Add something to Cortex."

For Now column: NEVER auto-modified by cron
```

**Idempotency:** The DB has a `meta` table with a `last_midnight_run` timestamp (Unix ms). Before running promotion, cron checks: `now - last_midnight_run > 20 hours`. If already ran today, skip. This prevents double-promotion if Electron crashes and restarts at midnight.

```sql
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO meta VALUES ('last_midnight_run', '0');
INSERT OR IGNORE INTO meta VALUES ('morning_digest_time', '08:00');
```

`morning_digest_time` is stored here so Phase 4 settings UI can read/write it without a DB migration. Format: `"HH:MM"` 24-hour string.

### Per-Minute Reminder Check (node-cron: `* * * * *`)
```
SELECT items WHERE remind_at IS NOT NULL AND remind_at <= now AND archived = 0
For each: fire Electron notification "Cortex Reminder: {title}"
Then:      SET remind_at = NULL (one-shot — fires once, clears itself)
```

This runs every minute. On Windows: `new Notification({ title: 'Cortex Reminder', body: item.title }).show()`. This is guarded with `process.platform === 'win32'` like all native notifications.

### Morning Digest (user-configurable time, default 8:00am)
- Windows native notification via Electron (guarded: `process.platform === 'win32'`)
- Lists count of Today + For Now items
- Click → opens Cortex to Priority view

---

## 13. System Tray

- **Badge / tooltip:** Tray icon tooltip shows count of Today + For Now items: `"Cortex — 5 items today"`. No icon badge (Windows tray doesn't support badge counts natively in Phase 1).
- **Context menu:** Show App | Quick Add (opens Ctrl+Shift+N window) | Quit
- **Auto-start:** `app.setLoginItemSettings({ openAtLogin: true })` is only called when `process.platform === 'win32'`. It is **user-configurable** via a Settings toggle (Phase 1), not forced on every start. Default: enabled on first launch, respects user preference thereafter.
- **app.isQuitting:** Use a module-level `let isQuitting = false` boolean in `index.ts`. Do **not** write `app.isQuitting = true` — Electron's `app` object is not typed for custom properties and the build will fail.

---

## 14. Google Calendar Integration

- Opt-in per card via "Add to Calendar" button in edit modal
- Shells out to `gws calendar insert` with title + inferred date
- gws CLI already installed and authenticated on machine
- Phase 1: push only (Cortex → Calendar)
- Phase 2: pull calendar events into Cortex view

---

## 15. Archive

- Someday column shows a **subtle banner** at the top of the column when any item has been in Someday for 30+ days: `"X items untouched for 30+ days"` with an "Archive all" button. Banner only appears when threshold is met. Items are soft-deleted (hidden, not removed from DB). Can restore from Archive view.
- Archive view accessible from sidebar / settings
- Archived items show full details — title, tags, date archived, restore button

---

## 16. Phases

### Phase 1 — Core App + Global Hotkey
Electron shell + React frontend + SQLite + **Inbox column** + Priority view (with For Now strip + Someday banner) + Category view (with correct DnD semantics) + Edit modal (with `remind_at`) + Search + `/api/tags` + Tag autocomplete + System tray + **Ctrl+Shift+N floating quick-add window** + Per-minute reminder cron

### Phase 1b — Chrome Extension *(ship before Phase 2)*
Manifest V3 extension + quick capture popup + auto-tag detection + localhost:51204 API. Moved earlier because the extension is the primary daily-use capture path — without it users manually copy URLs, which is worse than bookmarks. Items captured from extension go to Inbox by default.

### Phase 2 — Telegram Bot *(mobile capture)*
Bot via @BotFather → Supabase queue table (free tier) → Electron polls every 60s → drains into local SQLite as Inbox items. Cost: zero. Commands: plain text → Idea, URL → Link, `/today "thing"` → skips Inbox, `/remind "thing" tomorrow 3pm` → sets `remind_at`.

Architecture: bot webhook (Railway free) → Supabase table → Electron polling. This decouples the phone from needing the laptop to be on. Captured items always land in Supabase first, then sync when Electron is running.

### Phase 3 — Cron + Advanced Notifications
Midnight promotion logic (with idempotency) + morning digest + Windows notifications + Someday archive banner (if not already in Phase 1)

### Phase 4 — Calendar Integration
"Add to Calendar" button + gws CLI integration

### Phase 5 — Settings & Polish
Auto-start toggle, configurable morning digest time, port display in settings, Telegram bot configuration UI

### Phase 6 (future)
Custom columns, mobile PWA, import from Chrome bookmarks, bulk tag editing, light mode, LLM auto-tagging

---

## 17. Testing Strategy

| Type | Tool | Coverage target |
|------|------|----------------|
| Unit | Vitest | DB layer, cron logic, auto-tag detection, tag replace logic |
| Integration | Supertest + Vitest | Express API endpoints — use `vi.mock()` not `jest.mock()` |
| E2E | Playwright CLI | Priority view, Category view, Quick capture, Edit modal, Global hotkey |
| Security | `security-scan` skill | API endpoints, file access, no secrets in code |

**Testing notes:**
- All mocks use `vi.mock()` — this is a Vitest project, not Jest
- `getDb()` is called at module import time; mocks must be hoisted with `vi.mock` at the top of test files
- Favicon fallback must be tested: mock `onError` to verify letter-icon renders

Approach: TDD. Tests written before implementation for all core logic.

---

## 18. Technical Implementation Notes

These are implementation constraints that must be followed — not suggestions:

1. **No dynamic `<style>` injection in card hover.** Set `el.style.setProperty('--mouse-x', x)` only. The `hover.css` pseudo-elements already read these vars. Injecting a new `<style>` node per `mousemove` event creates thousands of orphaned DOM nodes.

2. **Module-level quit flag.** Use `let isQuitting = false` at module level in `index.ts`. Never assign custom properties to Electron's `app` object — TypeScript will reject it at build time.

3. **FTS5 prefix search.** Query format: `"${sanitized}"*` — the `*` is mandatory. Without it, "mak" will not match "makemore". Sanitize input by replacing `"` with `""` before interpolating.

4. **Platform guards.** Wrap all Windows-specific code: `if (process.platform === 'win32') { ... }`. This includes: `app.setLoginItemSettings`, Windows notification API, any tray behavior that differs on macOS/Linux.

5. **Favicon fallback.** Every `<img>` for a favicon must have `onError` that hides the img and shows a letter-icon div. Never show a broken image placeholder.

6. **Port constant.** Define `export const API_PORT = 51204` in `src/shared/constants.ts` and import it everywhere. Never hardcode 51204 in multiple files.

7. **Pass `db` into router factories as a parameter.** Never call `getDb()` at the top of a router factory body — it runs at import time, before `vi.mock()` can intercept it, breaking all integration tests. Correct pattern:
```typescript
// items.ts
export function itemsRouter(db: Database.Database): Router { ... }

// server.ts
app.use('/api/items', itemsRouter(getDb()))

// api.test.ts (no mock needed — just pass a test db directly)
const testDb = new Database(':memory:')
runMigrations(testDb)
app.use('/api/items', itemsRouter(testDb))
```

---

## 19. Open Questions — All Answered

| Question | Decision |
|----------|----------|
| What port? | **51204** — obscure, avoids all common dev tool conflicts |
| System tray badge count? | **Tooltip only** showing Today + For Now count. No icon badge. |
| Light mode in Phase 1? | **No** — dark-only through Phase 4. Light mode in Phase 5. |
| Chrome bookmarks import? | **No** — Phase 5 backlog. |
| Tags: facets or buckets? | **Facets** — multiple tags per item. DnD = move (replace source tag). |
| Global quick-add shortcut? | **Yes** — Ctrl+Shift+N, Phase 1, opens floating mini-input window. |
| Inbox column? | **Yes** — leftmost, `priority='inbox'`, all bot/quick captures land here. |
| Per-card reminders? | **Yes** — `remind_at` field + per-minute cron. No external service. |
| Tag autocomplete? | **Yes** — `/api/tags` endpoint + HTML datalist. Phase 1. |
| Telegram bot? | **Phase 2** — free (Supabase + Railway). Requires internet only for capture. |
| List view vs kanban? | **Kanban** — approved design. Can add list toggle in Phase 5. |
| Kanban or list for mobile? | Deferred — PWA in Phase 6. |
