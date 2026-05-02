# Cortex — Consolidated Spec & Status

**Last updated:** 2026-04-28
**Replaces:** `2026-04-24-cortex-design.md`, `cortex-review.md`, `cortex-redesign-spec.md`

Single source of truth: original goal, what shipped, what remains, what was removed, current state, current phase.

---

## 1. Original Goal

Local-first personal command center for links, ideas, notes — organized by time priority and category. Replaces Chrome-tab chaos with always-available desktop app. Forces a priority decision at save time (Inbox / For Now / Today / Tomorrow / This Week / Someday) and auto-promotes items at midnight.

**Tagline:** Your links have a brain now.

**Core constraint:** zero ongoing cost. No paid APIs ever (no OpenAI, no Claude API, no analytics). Local SQLite, free Telegram + Supabase tier only for mobile capture.

---

## 2. Architecture (current)

```
Electron shell
  ├─ React frontend (Vite, localhost:51204)
  ├─ Express API (embedded)
  ├─ SQLite (better-sqlite3, FTS5)
  └─ node-cron (midnight, morning digest, per-minute reminders)
       │
       ├── Chrome extension (Manifest V3, Ctrl+Shift+S)
       └── gws CLI subprocess → Google Calendar (opt-in)
```

**Port:** 51204 (centralised in `src/shared/constants.ts`).
**Stack:** Electron + React + Vite + Express + better-sqlite3 + node-cron + Lucide React + Inter.
**Design:** dark-only (`#020617` bg, `#2563eb` primary, `#f97316` accent). No emoji in UI — Lucide icons only.

---

## 3. Current State (what is there right now)

### Database (`src/main/db/migrations.ts`)
- `items` — id, type, title, url, notes, priority, tags(JSON), archived, archived_at, created_at, updated_at, remind_at, completed_at, last_opened_at
- `meta` — key/value (last_midnight_run, morning_digest_time)
- `item_notes`
- `spaces`, `space_items` (many-to-many, pinned flag)
- Priority CHECK includes `inbox`

### Renderer components (`src/renderer/components/`)
TopBar · PriorityView · CategoryView · CompletedView · SpacesView · ArchiveView · SearchResults · SettingsView · Card · IdeaCard · TagPill · EditModal

### Main process
- `index.ts` — windows, globalShortcut (Ctrl+Shift+N), IPC
- `quick-add-window.ts` — frameless floating capture window
- `tray.ts` — system tray menu
- `cron/midnight.ts`, `cron/morning-digest.ts`, `cron/reminders.ts`
- `runtime-env.ts`, `db/paths.ts`

### Extension
`cortex-extension/` — Manifest V3 popup (Ctrl+Shift+S), POSTs to `localhost:51204/api/items`.

### Tests
Unit (Vitest) + integration (Supertest) + E2E (Playwright). All `vi.mock`.

### Recent commits (redesign delivery)
```
054d82b simplify quick capture
8741e74 add persistent spaces
3271383 add completed workflow
5f27d9d add nested tag shelves
5928e45 polish cortex visual system
```

---

## 4. Implemented (Phase 1 + redesign)

| Feature | Status |
|---|---|
| Electron shell + React frontend + SQLite + Express | done |
| Inbox column + 6-column priority view | done |
| Category view with **nested tags** (`Parent/Child` tree) | done |
| Archive view + Someday 30-day banner | done |
| Edit modal (link + idea) with `remind_at` | done |
| Search with FTS5 prefix (`"x"*`) | done |
| `/api/tags` endpoint + autocomplete datalist | done |
| Tag normalization (case-preserve, dedupe) | done |
| Per-minute reminder cron + Electron notifications | done |
| Midnight promotion cron with idempotency (`meta.last_midnight_run`) | done |
| Morning digest cron | done |
| System tray + auto-start (win32-guarded) | done |
| Global Ctrl+Shift+N quick-add floating window | done |
| Chrome extension (Ctrl+Shift+S, Manifest V3) | done |
| `src/shared/constants.ts` (port, intervals) | done |
| **Visual redesign:** 48px topbar, tinted tabs, colored bar headers, priority left-border, hash-colored tag pills, normalized radii | done |
| **Completed workflow:** `completed_at` column, CompletedView with time-bucket groups, hover checkbox, restore | done |
| **Persistent Spaces:** `spaces` + `space_items` tables, SpacesView with pinned + recent, `last_opened_at` touch | done |
| **Simplified Quick Add:** 2-field form, expandable tags, URL/idea auto-detect | done |
| Card hover (lift, no tilt) via CSS custom props (no `<style>` injection) | done |
| Favicon letter-icon fallback | done |
| Router factories accept `db` param (testable) | done |

---

## 5. Not Yet Implemented

### Phase 2 — Telegram bot (mobile capture)
- @BotFather bot
- Supabase queue table (free tier)
- Webhook server (Railway/Render free tier)
- Electron 60s poller draining queue → SQLite as `priority='inbox'`
- Commands: plain text → idea, URL → link, `/today "x"`, `/remind "x" tomorrow 3pm`
- No plan file written yet (`plans/2026-XX-XX-cortex-phase2-telegram.md`)

### Phase 4 — Calendar integration
- "Add to Calendar" button in EditModal → `gws calendar insert ...`
- Date inferred from priority
- Push only (Phase 4); pull events deferred

### Phase 5 — Settings & polish
- Auto-start toggle (settings UI)
- Configurable morning digest time (read/write `meta.morning_digest_time`)
- Telegram bot config UI
- Light mode

### Phase 6 — backlog
Custom columns, mobile PWA, Chrome bookmarks import, bulk tag editing, LLM auto-tagging.

### Smaller gaps (from review, not yet addressed)
- Arrow-key / J-K navigation between cards
- Drag-and-drop replacement for HTML5 DnD on Windows (mouse-event based)
- Keyboard shortcut: Cmd+Enter to mark complete
- Search results showing "completed" badge for completed items

---

## 6. Removed / Rejected

| Item | Why |
|---|---|
| **WhatsApp bot** | Official API needs Meta verification + cost; unofficial libs get numbers banned. Replaced with Telegram. |
| **3D card tilt** | Replaced with vertical lift + specular/rim glow (better UX, less gimmicky). |
| **Dynamic `<style>` injection per mousemove** | Memory leak (thousands of orphan nodes). Replaced with `el.style.setProperty('--mouse-x', ...)`. |
| **`app.isQuitting = true`** | TS build failure. Replaced with module-level `let isQuitting = false` in `index.ts`. |
| **`jest.mock(...)`** | Not Jest — Vitest. All replaced with `vi.mock`. |
| **`getDb()` at router-factory top** | Ran at import time, bypassed `vi.mock`. Replaced with `db` param injection. |
| **Hardcoded port 51204** | Now in `src/shared/constants.ts`. |
| **Bare favicon `<img>` (no fallback)** | Replaced with letter-icon underlay. |
| **Add-tag-only DnD in CategoryView** | Replaced with replace-tag semantics (track `fromTag`, swap to `dropTag`). |

---

## 7. Current Phase

**Phase 1 + redesign: shipped** (5 commits on `main`).

**Next decision point:** pick Phase 2 (Telegram) or Phase 4 (Calendar) or Phase 5 (Settings UI). Phase 2 unlocks mobile capture (highest leverage). Phase 4 is the smallest (one button + subprocess). Phase 5 is purely polish.

---

## 8. Working Tree (uncommitted, unrelated to redesign)

These files are modified/untracked but **not part of** the redesign commits — preserve or commit separately:

- `M README.md`, `M package.json`, `M package-lock.json`, `M electron.vite.config.ts`, `M .gitignore`
- `M src/main/cron/morning-digest.ts`, `M src/main/db/connection.ts`, `M src/main/quick-add-window.ts`, `M src/main/tray.ts`
- `M src/renderer/quick-add.html`, `M src/renderer/components/{ArchiveView,SearchResults,SettingsView}.tsx`
- `M tests/{e2e/app.spec.ts, integration/api.test.ts, unit/items-db.test.ts, unit/migrations.test.ts}`
- `?? Start-Cortex-Preview.cmd`, `?? Stop-Cortex-Preview.cmd`, `?? scripts/`
- `?? src/main/db/paths.ts`, `?? src/main/runtime-env.ts`, `?? src/renderer/lib/desktop.ts`
- `?? cortex-extension/`
- `?? docs/superpowers/FUTURE-IMPROVEMENTS.md`

Verify intent before staging — likely tooling/preview-script work in progress.

---

## 9. Hard Rules (non-negotiable, carried from original spec)

1. No emoji in UI — Lucide React only.
2. Dark-only through Phase 4. Light mode in Phase 5.
3. No paid APIs ever. Telegram + Supabase free tiers only.
4. All Windows-specific code wrapped: `if (process.platform === 'win32') { ... }`.
5. Port `51204` — only via `API_PORT` from `src/shared/constants.ts`.
6. FTS5 query format: `"${sanitized}"*` (prefix match mandatory).
7. Pass `db` into router factories as a param. Never call `getDb()` at module top.
8. All mocks: `vi.mock`. Never `jest.mock`.
9. Card hover: set CSS custom props on `el.style` only. No dynamic `<style>` injection.
10. Soft delete only (`archived = 1`). Never hard delete.

---

## 10. Open Questions (for next brainstorm)

1. Phase 2 vs Phase 4 first?
2. Spaces seed data — keep hardcoded `Daily/Groceries/AI Tools` or empty by default?
3. Search scope — include completed items (with badge)?
4. Cmd+Enter to mark complete — global or modal-only?
5. Mouse-event DnD rewrite — Phase 1 polish or defer to Phase 5?

---

**End of consolidated spec.**
