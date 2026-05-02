# Cortex

Your links have a brain now.

Local-first desktop app for saving links, ideas, and notes — organized by time priority and category. Always available in the system tray. Zero cloud required.

---

## What It Does

- **Priority Kanban** — Six columns: Inbox → For Now → Today → Tomorrow → This Week → Someday
- **Category View** — Items grouped by tag. Drag between groups to re-tag.
- **Global Quick-Add** — `Ctrl+Shift+N` from any app opens a floating capture window
- **Chrome Extension** — `Ctrl+Shift+S` from any tab captures URL + title to Inbox
- **Reminders** — Per-item `remind_at` field fires a native Windows notification at the set time
- **Midnight Promotion** — Items auto-advance at midnight (Tomorrow → Today, etc.)
- **Morning Digest** — Daily summary notification at your configured time
- **Telegram Capture** — Send messages to your bot on phone → appear in Inbox within 60s
- **Calendar** — "Add to Calendar" in edit modal shells out to `gws calendar insert`
- **System Tray** — Always running; tooltip shows Today + For Now item count

---

## Running Locally

```bash
npm install
npm run dev
```

App starts at `localhost:51204` (embedded Express). Electron window opens automatically.

### Browser Preview

If you want to test the board in Chrome before packaging or reinstalling:

```bash
npm run web:dev
```

Then open [http://127.0.0.1:5173](http://127.0.0.1:5173) in Chrome.

On Windows, you can also just double-click:
- [Start-Cortex-Preview.cmd](./Start-Cortex-Preview.cmd)
- [Stop-Cortex-Preview.cmd](./Stop-Cortex-Preview.cmd)

If you need to clear the preview servers and start fresh:

```bash
npm run web:stop
```

This preview mode uses a local SQLite database inside:

```text
.cortex-local/cortex.db
```

So it will not interfere with your installed app data unless you explicitly point `CORTEX_DATA_DIR` somewhere else.

What works in browser preview:
- board views
- add/edit/archive/delete
- tags and search
- settings stored in the local preview database

What stays desktop-only:
- system tray
- global shortcuts
- Windows auto-start
- quick-add floating window
- calendar button via Electron IPC

### All Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Electron + Vite in dev mode with hot reload |
| `npm run web:dev` | Start local API + Chrome-friendly Vite UI for browser testing |
| `npm run web:build` | Build the browser preview bundle |
| `npm run build` | Build for production |
| `npm run pack:win` | Build an unpacked Windows app folder for packaging smoke tests |
| `npm run dist:win` | Build a Windows installer plus a portable `Cortex.exe` |
| `npm run typecheck` | TypeScript check (both main + renderer tsconfigs) |
| `npm test` | Unit + integration tests |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests only |
| `npm run test:e2e` | Playwright E2E tests |

---

## Key Reference

| Thing | Value |
|-------|-------|
| API port | `51204` |
| DB location (Windows) | `%APPDATA%\cortex\cortex.db` |
| Global shortcut | `Ctrl+Shift+N` — floating quick-add |
| Extension shortcut | `Ctrl+Shift+S` — capture current tab |
| Search shortcut | `/` or `Ctrl+K` |
| Priority columns | `inbox` `for-now` `today` `tomorrow` `this-week` `someday` |
| Reminder cron | Every minute (`* * * * *`) |
| Midnight promotion cron | `0 0 * * *` |
| Morning digest | Configurable in Settings (default `08:00`) |

### In-App Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` or `Ctrl+K` | Focus search bar |
| `n` (no input focused) | Open add-item modal |
| `Escape` | Close modal / clear search |
| `Ctrl+Shift+N` | Global floating quick-add (works from any app) |
| `Ctrl+Shift+S` | Chrome extension capture (browser only) |

---

## Project Structure

```
cortex/
├── src/
│   ├── shared/
│   │   └── constants.ts          # API_PORT, PRIORITIES, colors, labels — one source of truth
│   ├── main/                     # Electron main process
│   │   ├── index.ts              # App entry — BrowserWindow, tray, crons, IPC handlers
│   │   ├── server.ts             # Express bootstrap — mounts all routers
│   │   ├── tray.ts               # System tray icon + context menu
│   │   ├── calendar.ts           # gws CLI subprocess + date inference  (Phase 4)
│   │   ├── db/
│   │   │   ├── connection.ts     # SQLite singleton (better-sqlite3)
│   │   │   └── migrations.ts     # Schema: items, meta, FTS5 virtual table + triggers
│   │   ├── api/
│   │   │   ├── items.ts          # GET/POST/PATCH/DELETE /api/items + /api/tags
│   │   │   ├── search.ts         # GET /api/search?q= (FTS5 prefix search)
│   │   │   └── settings.ts       # GET/PATCH /api/settings  (Phase 5)
│   │   ├── cron/
│   │   │   ├── reminders.ts      # Per-minute: fire remind_at notifications
│   │   │   ├── midnight.ts       # Midnight: promote items forward  (Phase 3)
│   │   │   └── morning-digest.ts # Once/day: summary notification  (Phase 3)
│   │   └── telegram/
│   │       └── poller.ts         # Poll Supabase every 60s, drain to SQLite  (Phase 2)
│   ├── preload/
│   │   └── index.ts              # contextBridge — exposes addToCalendar, autostart to renderer
│   └── renderer/                 # React frontend (Vite)
│       ├── App.tsx               # Root — view switching, modal state, keyboard shortcuts
│       ├── components/
│       │   ├── TopBar.tsx        # Logo, view tabs, search bar, + button, gear icon
│       │   ├── PriorityView.tsx  # Kanban + For Now pinned strip + Someday archive banner
│       │   ├── CategoryView.tsx  # Tag groups + HTML5 drag-and-drop
│       │   ├── Card.tsx          # Link card (favicon-stack + title)
│       │   ├── IdeaCard.tsx      # Idea card (orange border + PenLine icon)
│       │   ├── EditModal.tsx     # Add/edit modal — all fields, remind_at, calendar button
│       │   ├── SearchResults.tsx # Flat results list
│       │   ├── ArchiveView.tsx   # Archived items with restore
│       │   └── SettingsView.tsx  # Settings page  (Phase 5)
│       ├── hooks/
│       │   ├── useItems.ts       # Fetch + mutate items
│       │   └── useSearch.ts      # Debounced FTS search
│       └── lib/
│           └── api.ts            # Typed fetch wrapper for all endpoints
│
├── cortex-extension/             # Chrome extension  (Phase 1b)
│   ├── manifest.json             # MV3 — permissions, commands (Ctrl+Shift+S)
│   ├── popup.html / popup.js / popup.css
│   ├── auto-tag.js               # Domain → tag rules (GitHub, YouTube, etc.)
│   └── background.js             # Service worker
│
├── cortex-webhook/               # Telegram webhook server  (Phase 2)
│   ├── server.js                 # Express: Telegram → Supabase queue insert
│   └── package.json              # Deployed to Railway
│
├── tests/
│   ├── unit/                     # Vitest — DB layer, cron logic, pure functions
│   ├── integration/              # Supertest + Vitest — Express routes with test DB
│   └── e2e/                      # Playwright — critical user flows
│
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-04-24-cortex-design.md   # Full design spec
        ├── plans/
        │   ├── 2026-04-25-cortex-phase1.md
        │   ├── 2026-04-25-cortex-phase1b-chrome-extension.md
        │   ├── 2026-04-25-cortex-phase2-telegram-bot.md
        │   ├── 2026-04-25-cortex-phase3-cron-notifications.md
        │   ├── 2026-04-25-cortex-phase4-calendar.md
        │   └── 2026-04-25-cortex-phase5-settings.md
        └── BACKLOG.md                        # Future feature ideas
```

---

## Phases

| Phase | Feature | Status | Plan |
|-------|---------|--------|------|
| **1** | Core app — Electron + React + SQLite + Kanban + Edit modal + Search + Quick-add + Tray + Reminders | ✅ Done | `plans/phase1.md` |
| **1b** | Chrome Extension — `Ctrl+Shift+S` popup + auto-tag detection | 📋 Next | `plans/phase1b.md` |
| **2** | Telegram Bot — mobile capture via Supabase queue | 📋 Planned | `plans/phase2.md` |
| **3** | Cron + Notifications — midnight promotion + morning digest | 📋 Planned | `plans/phase3.md` |
| **4** | Calendar Integration — "Add to Calendar" via `gws` CLI | 📋 Planned | `plans/phase4.md` |
| **5** | Settings & Polish — auto-start toggle, digest time, Telegram config | 📋 Planned | `plans/phase5.md` |
| **6+** | Future features | 💡 Backlog | `BACKLOG.md` |

---

## How to Add a New Feature

1. Write the idea in `docs/superpowers/BACKLOG.md` — use the template already there
2. When ready to build, open a new Claude Code session and say:
   > *"Let's build [feature name] from the Cortex backlog"*
3. Claude will read the spec + backlog, run brainstorming, produce a design doc, and write a plan
4. Execute the plan using the `executing-plans` or `subagent-driven-development` skill

---

## Optional Integrations

### Telegram Bot (Phase 2)

1. Create a bot via Telegram `@BotFather` → save the token
2. Create a free [Supabase](https://supabase.com) project → run the SQL from the Phase 2 plan
3. Deploy `cortex-webhook/` to [Railway](https://railway.app) (free tier)
4. Register the webhook:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<RAILWAY_URL>/webhook/<TOKEN>"
   ```
5. Add `.env` to the cortex root:
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   ```
6. Restart Cortex. Items appear in Inbox within 60 seconds.

For packaged Windows builds, the desktop app also checks:
- a `.env` file next to the portable `Cortex.exe`
- `%APPDATA%\cortex\.env` for the installed app

**Bot commands:**
- Any text → Inbox idea
- Any URL → Inbox link
- `/today finish the report` → Today column
- `/now call back client` → For Now column
- `/remind buy groceries tomorrow 6pm` → Inbox with reminder set

### Calendar Integration (Phase 4)

Requires `gws` CLI authenticated:

```bash
gws auth login -s calendar
```

After that the "Add to Calendar" button in any card's edit modal works immediately. Cortex never touches OAuth — `gws` handles it.

---

## Environment Variables

```bash
# .env  (only needed for Telegram bot — Phase 2)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

For packaged Windows builds, place the same file either next to `Cortex.exe` or in `%APPDATA%\cortex\.env`.

All other features work without any environment variables.

---

## Design Decisions Worth Knowing

- **Port 51204** — obscure, avoids conflicts with React (3000), Vite (5173), Rails (3000). Defined once in `src/shared/constants.ts`.
- **Inbox column** — landing zone for all unreviewed items. Bot captures, quick-adds, and extension captures all go here by default. Triaging = dragging to another column.
- **Tags are facets** — an item can belong to multiple categories. Drag-and-drop in Category view *replaces* the source tag (doesn't add).
- **No dynamic style injection** — card hover effect uses CSS custom props `--mouse-x` / `--mouse-y` set via `el.style.setProperty()`. No `<style>` elements injected per mousemove.
- **Router db-injection** — all Express router factories take `db` as a parameter. Never call `getDb()` at module import time (breaks Vitest).
- **FTS5 prefix search** — query format: `"${safe}"*`. The trailing `*` is mandatory for prefix matching.
- **`isQuitting` module-level** — `let isQuitting = false` in `index.ts`. Never `app.isQuitting = true` — TypeScript will reject it.
