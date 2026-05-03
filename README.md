# Cortex

Your links have a brain now.

Local-first desktop app for saving links, ideas, and notes. Organized by time priority and by category. Lives in your system tray. No cloud account required.

---

## What It Does

- **Priority Kanban** — Six columns: Inbox → For Now → Today → Tomorrow → This Week → Someday. Drag items between columns to reprioritize.
- **Category View** — Items grouped by tag. Use slash-tags like `github/tools` to create subfolders. Drag items between groups to re-tag.
- **Fixed Buckets** — Drop zone for Ideas, Daily, Groceries, and Tools. These sit below the kanban and hold things that don't fit a timeline.
- **Inline Add** — Every lane and bucket has a quick-add input. Type a URL and it saves as a link; type anything else and it saves as an idea.
- **Idea Merge** — Select two or more ideas in a bucket, merge them into a single combined idea, then drag it into a lane.
- **Global Quick-Add** — `Ctrl+Shift+N` from any app opens a floating capture window.
- **Chrome Extension** — `Ctrl+Shift+S` from any tab captures the current URL + title straight to Inbox.
- **Reminders** — Set a `remind_at` time on any item; a native Windows notification fires at the right time.
- **Midnight Promotion** — Items auto-advance at midnight (Tomorrow → Today, This Week → Tomorrow, etc.).
- **Morning Digest** — Daily summary notification at whatever time you configure.
- **Telegram Capture** — Send a message to your bot on your phone and it shows up in Inbox within about a minute.
- **System Tray** — Always running; tooltip shows Today + For Now count.

---

## Running Locally

```bash
npm install
npm run dev
```

Electron window opens automatically. The embedded Express server runs on port `51204`.

### Browser Preview

To test in Chrome without running Electron:

```bash
npm run web:dev
```

Then open `http://127.0.0.1:5000` in Chrome. This mode uses a local SQLite database at `.cortex-local/cortex.db` and has no effect on your installed app data.

What works in browser preview: board views, add/edit/archive/delete, tags, search, settings.

What stays desktop-only: system tray, global shortcuts (`Ctrl+Shift+N`), Windows auto-start, quick-add floating window.

### All Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Electron + Vite in dev mode with hot reload |
| `npm run web:dev` | Start local API + Chrome-friendly Vite UI for browser testing |
| `npm run web:build` | Build the browser preview bundle |
| `npm run build` | Build for production |
| `npm run pack:win` | Build an unpacked Windows app folder |
| `npm run dist:win` | Build a Windows installer + portable `Cortex.exe` |
| `npm run typecheck` | TypeScript check (main + renderer) |
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
| Fixed buckets | `#ideas` `#daily` `#groceries` `#tools` |

### In-App Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` or `Ctrl+K` | Focus search |
| `n` (no input focused) | Open add-item modal |
| `Escape` | Close modal / clear search |
| `Ctrl+Shift+N` | Global quick-add (works from any app) |
| `Ctrl+Shift+S` | Chrome extension capture |

---

## Project Structure

```
cortex/
├── src/
│   ├── shared/
│   │   └── constants.ts          # API_PORT, priorities, colors, labels
│   ├── main/                     # Electron main process
│   │   ├── index.ts              # App entry — BrowserWindow, tray, crons, IPC
│   │   ├── server.ts             # Express bootstrap — mounts all routers
│   │   ├── tray.ts               # System tray icon + context menu
│   │   ├── calendar.ts           # gws CLI integration
│   │   ├── db/
│   │   │   ├── connection.ts     # SQLite singleton (better-sqlite3)
│   │   │   └── migrations.ts     # Schema: items, meta, FTS5 virtual table + triggers
│   │   ├── api/
│   │   │   ├── items.ts          # GET/POST/PATCH/DELETE /api/items + /api/tags
│   │   │   ├── search.ts         # GET /api/search?q= (FTS5 prefix search)
│   │   │   └── settings.ts       # GET/PATCH /api/settings
│   │   ├── cron/
│   │   │   ├── reminders.ts      # Per-minute: fire remind_at notifications
│   │   │   ├── midnight.ts       # Midnight: promote items forward
│   │   │   └── morning-digest.ts # Once/day: summary notification
│   │   └── telegram/
│   │       └── poller.ts         # Poll Supabase every 60s, drain to SQLite
│   ├── preload/
│   │   └── index.ts              # contextBridge — exposes IPC to renderer
│   └── renderer/                 # React frontend (Vite)
│       ├── App.tsx               # Root — view switching, modal state, keyboard shortcuts
│       ├── components/
│       │   ├── TopBar.tsx        # Logo, view tabs, search bar, + button
│       │   ├── PriorityView.tsx  # Kanban + buckets bar + inline add + idea merge
│       │   ├── CategoryView.tsx  # Tag groups + subfolder drill-down + drag-and-drop
│       │   ├── Card.tsx          # Link card (favicon + title)
│       │   ├── IdeaCard.tsx      # Idea card (orange border)
│       │   ├── EditModal.tsx     # Add/edit modal — all fields, remind_at, calendar
│       │   ├── SearchResults.tsx # Flat results list
│       │   ├── ArchiveView.tsx   # Archived items with restore
│       │   ├── CompletedView.tsx # Completed items
│       │   ├── SpacesView.tsx    # Pinned collections
│       │   └── SettingsView.tsx  # Settings page
│       ├── hooks/
│       │   ├── useItems.ts       # Fetch + mutate items
│       │   └── useSearch.ts      # Debounced FTS search
│       └── lib/
│           └── api.ts            # Typed fetch wrapper
│
├── chrome-extension/             # Chrome extension (MV3)
│   ├── manifest.json             # Permissions + Ctrl+Shift+S shortcut
│   ├── popup.html / popup.js
│   └── background.js             # Service worker
│
├── tests/
│   ├── unit/                     # Vitest — DB layer, cron logic, pure functions
│   ├── integration/              # Supertest + Vitest — Express routes with test DB
│   └── e2e/                      # Playwright — critical user flows
│
└── docs/
    └── superpowers/
        ├── plans/                # Phase implementation plans
        └── BACKLOG.md            # Future feature ideas
```

---

## Phases

| Phase | Feature | Status |
|-------|---------|--------|
| **1** | Core app — Electron + React + SQLite + Kanban + Edit modal + Search + Quick-add + Tray + Reminders | ✅ Done |
| **1b** | Chrome Extension — `Ctrl+Shift+S` + auto-tag detection | ✅ Done |
| **2** | Telegram Bot — mobile capture via Supabase queue | 📋 Planned |
| **3** | Cron + Notifications — midnight promotion + morning digest | 📋 Planned |
| **4** | Calendar Integration — "Add to Calendar" via `gws` CLI | 📋 Planned |
| **5** | Settings & Polish — auto-start toggle, digest time, Telegram config | 📋 Planned |

---

## Design Decisions Worth Knowing

- **Port 51204** — avoids conflicts with React (3000), Vite (5173), Rails (3000). Defined once in `src/shared/constants.ts`.
- **Inbox as landing zone** — bot captures, quick-adds, and extension captures all land here. Triaging = dragging to another column.
- **Tags are facets** — an item can have multiple tags. Drag-and-drop in Category view *replaces* the source tag (doesn't add).
- **Fixed buckets vs priority lanes** — buckets (Ideas, Daily, Groceries, Tools) are tag-based groups inside Inbox. They live below the kanban, not as separate columns.
- **Router db-injection** — all Express router factories take `db` as a parameter. Never call `getDb()` at import time (breaks Vitest).
- **FTS5 prefix search** — query format: `"${safe}"*`. The trailing `*` is mandatory for prefix matching.

---

## Optional: Telegram Integration

1. Create a bot via `@BotFather` → save the token
2. Create a free [Supabase](https://supabase.com) project → run the SQL from `docs/superpowers/plans/phase2.md`
3. Deploy the webhook server to [Railway](https://railway.app) (free tier is fine)
4. Register the webhook URL with Telegram
5. Add to `.env` in the cortex root:
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   ```

Bot commands:
- Any text → Inbox idea
- Any URL → Inbox link
- `/today finish the report` → Today column
- `/now call back client` → For Now column
- `/remind buy groceries tomorrow 6pm` → Inbox with reminder set

---

## Optional: Calendar Integration

Requires `gws` CLI authenticated:

```bash
gws auth login -s calendar
```

After that the "Add to Calendar" button in any card's edit modal works.
