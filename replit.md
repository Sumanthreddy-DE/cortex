# Cortex

A local-first desktop command center for managing links, ideas, and notes. Features a Kanban-style organization system with time-based priorities (Inbox, Today, Tomorrow, This Week, Someday) and category views.

## Architecture

- **Frontend**: React 18 + TypeScript, served by Vite dev server on port 5000
- **Backend**: Express.js REST API on port 8000 (IPv4 `127.0.0.1`)
- **Database**: SQLite via `better-sqlite3` with FTS5 full-text search
- **Runtime**: Node.js 20 with `tsx` for TypeScript execution
- **Original target**: Electron desktop app — adapted for web/browser mode

## Project Structure

```
src/
  main/           # Express API + SQLite backend
    api/          # REST route handlers (items, search, settings, spaces)
    db/           # SQLite connection, migrations, path resolution
    cron/         # Background tasks (midnight promotion)
  renderer/       # React frontend
    components/   # UI components (PriorityView, CategoryView, etc.)
    hooks/        # useItems, useSearch
    lib/          # API client (api.ts), desktop bridge detection
  shared/         # Constants and domain rules shared between main/renderer
  preload/        # Electron preload scripts (not used in web mode)
cortex-extension/ # Chrome extension (Manifest V3)
cortex-webhook/   # Standalone Telegram webhook microservice
```

## Web Mode Setup (Replit)

The original project was Electron-based. For Replit, it runs in web mode:

1. **`server-web.ts`** — Standalone Express server entry point (no Electron dependencies), runs on `127.0.0.1:8000`
2. **`vite.web.config.ts`** — Vite config for web-only mode: serves renderer on port 5000, proxies `/api` and `/health` to port 8000
3. **`start-web.sh`** — Startup script: launches API backend first, waits for readiness, then starts Vite

### Key modifications from original:
- `src/renderer/lib/api.ts`: Added `getApiBase()` function that returns `''` (relative URL) when no desktop bridge is present, so API calls go through the Vite proxy
- `server-web.ts`: Explicitly binds to `127.0.0.1` (not `localhost`/`::1`) to ensure Vite proxy can connect

## Workflows

- **Start application** (`bash start-web.sh`) — combined workflow on port 5000 (webview)

## Data Storage

SQLite database stored in `.cortex-local/cortex.db` (relative to project root in web mode, via `CORTEX_DATA_DIR` env override or the `getDataDirectory()` fallback).

## Key Features

- Priority board (Inbox, Today, Tomorrow, This Week, Someday)
- Category view by tags
- Full-text search (SQLite FTS5)
- Spaces (curated collections)
- Archive and completed views
- Browser preview mode banner (desktop-only features disabled)

## npm Scripts

- `npm run web:api` — start Express API only
- `npm run web:frontend` — start Vite dev server only
- `npm run web:start` — start both via `start-web.sh`
- `npm run native:node` — rebuild `better-sqlite3` for Node.js
- `npm test` — run unit + integration tests
