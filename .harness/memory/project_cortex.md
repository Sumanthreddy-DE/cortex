---
name: project_cortex
description: Cortex — Electron+React+SQLite personal link/idea manager. Cleaned repo, inline add + idea merge shipped as of 2026-05-03.
type: project
originSessionId: dcf1ea5b-27c7-40d0-9d0d-01f78330d443
---
Cortex is a local-first personal link/idea manager running on Electron + React + TypeScript + better-sqlite3.

**Why:** User loses Chrome tabs across 4 profiles, CPU overload, no single place for links + ideas.

**Repo:** `https://github.com/Sumanthreddy-DE/cortex` (main branch, latest commit `dc2b248` 2026-05-03)

**Project root:** `C:\Users\suman\Desktop\Docs\Job\Projects\cortex`

---

## Design System

- **Background:** `#020617` (dark navy), paper tone `#f7f1e6`
- **Accent:** blue `#2563eb`, orange `#f97316`
- **No purple/violet**
- **Font:** Inter sans-serif
- **Lane colors (Kanban):** coral, teal, butter, sage, violet-slate
- **CSS transitions:** accordion via `grid-template-rows: 0fr → 1fr`

---

## Key Files

| File | Purpose |
|------|---------|
| `src/main/index.ts` | Electron main: IPC handlers, cron jobs, startup backfill |
| `src/main/api/items.ts` | SQLite CRUD for items |
| `src/main/api/link-fetch.ts` | og:title background fetch (fires on create + startup backfill) |
| `src/main/api/search.ts` | FTS5 full-text search |
| `src/main/api/settings.ts` | Settings table |
| `src/main/api/spaces.ts` | Spaces feature |
| `src/main/cron/midnight.ts` | Midnight promotion: Tomorrow→Today |
| `src/main/cron/morning-digest.ts` | Morning notification at user-set time |
| `src/main/cron/reminders.ts` | remind_at check |
| `src/main/telegram/poller.ts` | Telegram bot → SQLite. Mark-first idempotency. Domain auto-tag. |
| `src/main/server.ts` | Local HTTP API server |
| `src/shared/domain-rules.ts` | hostname → category name (domain auto-tag) |
| `src/shared/constants.ts` | Priorities, cron schedules, fixed bucket tags |
| `src/renderer/components/PriorityView.tsx` | Kanban + fixed buckets bar + inline add + idea merge |
| `src/renderer/components/CategoryView.tsx` | Accordion category view with subfolder columns |
| `src/renderer/components/EditModal.tsx` | Edit/create modal. Tags use TagAutocomplete. |
| `src/renderer/components/TagAutocomplete.tsx` | #-triggered tag dropdown with keyboard nav |
| `src/renderer/components/CompletedView.tsx` | Completed items, time-grouped, prose summary header |
| `src/renderer/styles/globals.css` | All styles. Cat-*, lane-*, bucket-* classes. |
| `src/preload/index.ts` | contextBridge: window.cortex.data.* |
| `chrome-extension/` | MV3 Chrome extension — Ctrl+Shift+S captures current tab to Inbox |

---

## What's Built (as of 2026-05-03)

- **Kanban board** — 6 priority lanes (Inbox / For Now / Today / Tomorrow / This Week / Someday), drag-drop
- **Fixed bucket bar** — Ideas / Daily / Groceries / Tools as drop-target pills below kanban (tag-based, `#ideas` etc.)
- **Inline add** — every priority lane AND every fixed bucket has a quick-add input (URL → link, text → idea)
- **Idea merge** — select 2+ ideas in a bucket → merge button combines titles/notes into one idea
- **Category view** — vertical accordion, subfolder columns (slash tags `Parent/Child`), inline quick-add, "+ sub" button, priority dots, favicon display, domain label, pending-subfolder drop target
- **Link title fetch** — og:title background fetch on create + startup backfill for stale rows
- **Domain auto-tag** — URL pasted in QuickAdd or via Telegram → auto-fills category from hostname
- **Hashtag autocomplete** — `#` in any tag field triggers dropdown of existing tags
- **Edit modal** — full edit with TagAutocomplete for tags field
- **Completed view** — time-grouped list, prose header (today/week/all-time counts), restore button
- **Search** — FTS5 full-text search
- **Spaces** — workspace grouping
- **Telegram bot** — polls Supabase bot_queue → creates items locally
- **Chrome extension** — MV3, Ctrl+Shift+S captures URL+title to Inbox (at `chrome-extension/`)
- **Midnight cron** — auto-promotes Tomorrow→Today at midnight
- **Morning digest** — configurable Electron notification
- **Reminders** — remind_at field, notification check every minute
- **System tray** — today count badge, quick-add shortcut
- **Quick Add window** — Ctrl+Shift+S/N, clipboard URL pre-fill
- **Calendar** — Add to Calendar via gws CLI
- **Autostart** — Windows login item setting

---

## Pending / Future

- **v3 visual redesign** — plan at `docs/superpowers/plans/2026-05-01-cortex-design-phase2-priority-view.md`. Written, NOT executed. Fraunces font, paper tokens, hero Today column. See `project_phase-2-priority-view.md`.
- **Archive view overhaul** — not touched, may need stat-card cleanup
- **Spaces UX** — backend exists, UI is minimal
- **Bulk tag operations** — no UI for retag-many
- **YouTube distiller integration** — branch `youtube-distiller` kept alive for future connection to Cortex

---

## Repo State (2026-05-03)

Cleaned in commit `dc2b248`:
- Removed: `artifacts/`, `attached_assets/`, `cortex-extension/`, `cortex-webhook/`, `AGENTS.md`, `CLAUDE.md`, `.replit`, `replit.md`
- Kept: `chrome-extension/`, `docs/superpowers/plans/`, `mockups/` (design HTML/PNG)
- `.gitignore` covers: `.claude/`, `.codex/`, `graphify-out/`, `DESIGN.json`, AI configs, Replit files, dev screenshots

---

## Known Gotchas

- `npx tsc --noEmit` shows errors (JSX flag, electron/nanoid module resolution) — pre-existing, irrelevant. Build with `npx electron-vite build` instead.
- better-sqlite3 NODE_MODULE_VERSION mismatch: Electron 37 = v136, plain Node 22 = v127. Never run DB scripts with plain node. Use Python sqlite3 for DB maintenance.
- DB path: `C:\Users\suman\AppData\Roaming\Cortex\cortex.db`
- Web preview: `:5173` = electron-vite renderer (no API proxy, no data). `:5000` = correct web preview (proxy to Express on `:8000`). Use `npm run web:dev` to start the `:5000` preview.
