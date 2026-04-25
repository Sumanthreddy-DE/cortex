# Cortex Phase 5 — Settings & Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Settings view accessible from TopBar, containing: auto-start toggle (Windows), configurable morning digest time, Telegram bot status / Supabase config, and a port display. Wire all settings to the existing `meta` table and Electron's `loginItemSettings`.

**Architecture:** Settings view is a new `View` type (`'settings'`) rendered in `App.tsx`. All settings are read/written via the existing `/api/items`-style Express server — new endpoint `/api/settings` (GET + PATCH). Settings are stored in the `meta` table. Auto-start calls `ipcMain` → `app.setLoginItemSettings`. No new DB migrations needed (all keys pre-inserted in Phase 1 + 3).

**Tech Stack:** Express (new `/api/settings` endpoint), React (new `SettingsView` component), Electron IPC for `app.getLoginItemSettings` / `app.setLoginItemSettings`, Lucide icons, existing `meta` table.

---

## File Map

```
cortex/src/
├── shared/
│   └── constants.ts                # MODIFY — add 'settings' to View type
├── main/
│   ├── api/
│   │   └── settings.ts             # NEW — GET + PATCH /api/settings
│   ├── server.ts                   # MODIFY — mount settings router
│   └── index.ts                    # MODIFY — IPC handler for auto-start toggle
├── renderer/
│   ├── App.tsx                     # MODIFY — add settings view, gear icon in TopBar
│   ├── components/
│   │   ├── TopBar.tsx              # MODIFY — gear icon navigates to settings
│   │   └── SettingsView.tsx        # NEW — settings page component
│   └── lib/
│       └── api.ts                  # MODIFY — add getSettings, updateSettings, setAutoStart
└── tests/
    ├── unit/
    │   └── settings-db.test.ts     # NEW
    └── integration/
        └── settings-api.test.ts    # NEW
```

---

## Task 1: Settings API Endpoint

**Files:**
- Create: `cortex/src/main/api/settings.ts`
- Modify: `cortex/src/main/server.ts`

- [ ] **Step 1: Write failing tests**

Create `cortex/tests/unit/settings-db.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { getSettings, patchSettings } from '../../src/main/api/settings'

describe('getSettings', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    runMigrations(db)
  })

  afterEach(() => { db.close() })

  it('returns all settings with defaults', () => {
    const settings = getSettings(db)
    expect(settings.morning_digest_time).toBe('08:00')
    expect(settings.last_midnight_run).toBe('0')
    expect(typeof settings.morning_digest_time).toBe('string')
  })

  it('patchSettings updates a key', () => {
    patchSettings(db, { morning_digest_time: '09:30' })
    const settings = getSettings(db)
    expect(settings.morning_digest_time).toBe('09:30')
  })

  it('patchSettings ignores unknown keys', () => {
    patchSettings(db, { unknown_key: 'value' } as any)
    const settings = getSettings(db)
    expect(Object.keys(settings)).not.toContain('unknown_key')
  })
})
```

Run: `npx vitest run tests/unit/settings-db.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 2: Write settings.ts**

```typescript
// cortex/src/main/api/settings.ts
import type Database from 'better-sqlite3'
import { Router } from 'express'

// Keys that can be read and patched via the API.
// last_midnight_run and last_digest_date are read-only from API perspective.
const READABLE_KEYS = [
  'morning_digest_time',
  'last_midnight_run',
  'last_digest_date',
] as const

const WRITABLE_KEYS = ['morning_digest_time'] as const
type WritableKey = (typeof WRITABLE_KEYS)[number]

export interface Settings {
  morning_digest_time: string
  last_midnight_run: string
  last_digest_date: string
}

export function getSettings(db: Database.Database): Settings {
  const rows = db
    .prepare(`SELECT key, value FROM meta WHERE key IN (${READABLE_KEYS.map(() => '?').join(',')})`)
    .all(...READABLE_KEYS) as { key: string; value: string }[]

  const result: Record<string, string> = {}
  for (const key of READABLE_KEYS) {
    result[key] = ''
  }
  for (const row of rows) {
    result[row.key] = row.value
  }

  return result as Settings
}

// Hoisted — prepared once at module load, not re-compiled per call
const updateMetaStmt = (db: Database.Database) =>
  db.prepare("UPDATE meta SET value=? WHERE key=?")

export function patchSettings(db: Database.Database, patch: Partial<Record<WritableKey, string>>): void {
  const update = updateMetaStmt(db)
  for (const key of WRITABLE_KEYS) {
    if (patch[key] !== undefined) {
      update.run(patch[key], key)
    }
  }
}

export function settingsRouter(db: Database.Database): Router {
  const router = Router()

  // GET /api/settings
  router.get('/', (_req, res) => {
    try {
      const settings = getSettings(db)
      res.json(settings)
    } catch (err) {
      res.status(500).json({ error: 'Failed to read settings' })
    }
  })

  // PATCH /api/settings
  router.patch('/', (req, res) => {
    const { morning_digest_time } = req.body as Record<string, unknown>

    const patch: Partial<Record<WritableKey, string>> = {}

    if (morning_digest_time !== undefined) {
      if (typeof morning_digest_time !== 'string') {
        return res.status(400).json({ error: 'morning_digest_time must be a string' })
      }
      // Validate HH:MM format
      if (!/^\d{2}:\d{2}$/.test(morning_digest_time)) {
        return res.status(400).json({ error: 'morning_digest_time must be HH:MM format' })
      }
      patch.morning_digest_time = morning_digest_time
    }

    try {
      patchSettings(db, patch)
      res.json(getSettings(db))
    } catch (err) {
      res.status(500).json({ error: 'Failed to update settings' })
    }
  })

  return router
}
```

- [ ] **Step 3: Mount settings router in server.ts**

In `cortex/src/main/server.ts`, add:

```typescript
import { settingsRouter } from './api/settings'

// In createApiApp(), add alongside the existing routes:
app.use('/api/settings', settingsRouter(db))
```

- [ ] **Step 4: Write integration tests**

Create `cortex/tests/integration/settings-api.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import Database from 'better-sqlite3'
import express from 'express'
import { runMigrations } from '../../src/main/db/migrations'
import { settingsRouter } from '../../src/main/api/settings'

describe('GET /api/settings', () => {
  let app: express.Express
  let db: Database.Database

  beforeAll(() => {
    db = new Database(':memory:')
    runMigrations(db)
    app = express()
    app.use(express.json())
    app.use('/api/settings', settingsRouter(db))
  })

  afterAll(() => db.close())

  it('returns default settings', async () => {
    const res = await request(app).get('/api/settings')
    expect(res.status).toBe(200)
    expect(res.body.morning_digest_time).toBe('08:00')
  })

  it('PATCH updates morning_digest_time', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .send({ morning_digest_time: '07:30' })
    expect(res.status).toBe(200)
    expect(res.body.morning_digest_time).toBe('07:30')
  })

  it('PATCH rejects invalid time format', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .send({ morning_digest_time: '7:30am' })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (26 from Phase 3 + 3 settings-db + 3 settings-api = 32).

- [ ] **Step 6: Commit**

```bash
git add src/main/api/settings.ts src/main/server.ts tests/unit/settings-db.test.ts tests/integration/settings-api.test.ts
git commit -m "feat: settings api endpoint — GET/PATCH /api/settings backed by meta table"
```

---

## Task 2: Auto-Start IPC

**Files:**
- Modify: `cortex/src/main/index.ts`
- Modify: `cortex/src/preload/index.ts`
- Modify: `cortex/src/renderer/electron.d.ts`

- [ ] **Step 1: Add IPC handlers in index.ts**

In `src/main/index.ts`, add `ipcMain` handlers (add near the existing `calendar:add` handler):

```typescript
// Auto-start IPC handlers
ipcMain.handle('autostart:get', () => {
  if (process.platform !== 'win32') return false
  return app.getLoginItemSettings().openAtLogin
})

ipcMain.handle('autostart:set', (_event, enabled: boolean) => {
  if (process.platform !== 'win32') return
  app.setLoginItemSettings({ openAtLogin: enabled })
})
```

- [ ] **Step 2: Extend preload/index.ts**

```typescript
contextBridge.exposeInMainWorld('electron', {
  versions: { /* existing */ },
  addToCalendar: /* existing */,
  autostart: {
    get: () => ipcRenderer.invoke('autostart:get') as Promise<boolean>,
    set: (enabled: boolean) => ipcRenderer.invoke('autostart:set', enabled) as Promise<void>,
  },
})
```

- [ ] **Step 3: Extend electron.d.ts**

```typescript
interface Window {
  electron: {
    versions: { node: () => string; chrome: () => string; electron: () => string }
    addToCalendar: (title: string, priority: string, date?: string) => Promise<{ ok: boolean; error?: string }>
    autostart: {
      get: () => Promise<boolean>
      set: (enabled: boolean) => Promise<void>
    }
  }
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.node.json
npx tsc --noEmit -p tsconfig.web.json
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/main/index.ts src/preload/index.ts src/renderer/electron.d.ts
git commit -m "feat: autostart ipc — get/set login item settings via electron ipc"
```

---

## Task 3: Settings View Component

**Files:**
- Create: `cortex/src/renderer/components/SettingsView.tsx`

- [ ] **Step 1: Write SettingsView.tsx**

Add `getSettings` and `updateSettings` to `src/renderer/lib/api.ts` (the file that owns all HTTP calls):

```typescript
// In api.ts — add alongside existing fetch wrappers
export interface Settings {
  morning_digest_time: string
  last_midnight_run: string
  last_digest_date: string
}

export const api = {
  // ... existing methods ...
  getSettings: (): Promise<Settings> =>
    fetch(`${API_BASE}/api/settings`).then((r) => r.json()),
  updateSettings: (patch: Partial<Settings>): Promise<Settings> =>
    fetch(`${API_BASE}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then((r) => r.json()),
}
```

Then write `SettingsView.tsx` importing from `api.ts`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { API_PORT } from '../../../shared/constants'
import { api, type Settings } from '../lib/api'

export function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [autoStart, setAutoStart] = useState(false)
  const [digestTime, setDigestTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [error, setError] = useState('')
  const isWindows = navigator.platform.toLowerCase().includes('win')

  useEffect(() => {
    // Both calls are independent — run in parallel
    Promise.all([
      api.getSettings(),
      window.electron?.autostart?.get() ?? Promise.resolve(false),
    ])
      .then(([s, autoStartVal]) => {
        setSettings(s)
        setDigestTime(s.morning_digest_time)
        setAutoStart(autoStartVal)
      })
      .catch(() => setError('Failed to load settings'))
  }, [])

  async function handleAutoStartChange(enabled: boolean) {
    setAutoStart(enabled)
    await window.electron?.autostart?.set(enabled)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSavedMsg('')
    try {
      const updated = await api.updateSettings({ morning_digest_time: digestTime })
      setSettings(updated)
      setDigestTime(updated.morning_digest_time)
      setSavedMsg('Saved')
      setTimeout(() => setSavedMsg(''), 2000)
    } catch {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const lastMidnight = settings?.last_midnight_run
    ? settings.last_midnight_run === '0'
      ? 'Never'
      : new Date(parseInt(settings.last_midnight_run, 10)).toLocaleString()
    : '—'

  const lastDigest = settings?.last_digest_date || 'Never'

  return (
    <div className="content-panel">
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, color: '#f8fafc' }}>
        Settings
      </h2>

      {error && (
        <div className="status-banner" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Startup */}
      <section className="settings-section">
        <h3 className="settings-heading">Startup</h3>

        {isWindows ? (
          <label className="settings-row">
            <span className="settings-label">Launch at Windows login</span>
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => handleAutoStartChange(e.target.checked)}
              className="settings-checkbox"
            />
          </label>
        ) : (
          <p className="card-meta">Auto-start is only supported on Windows.</p>
        )}
      </section>

      {/* Notifications */}
      <section className="settings-section">
        <h3 className="settings-heading">Notifications</h3>

        <div className="settings-row">
          <label className="settings-label" htmlFor="digest-time">
            Morning digest time
            <span className="settings-sublabel">Daily summary of Today + For Now items</span>
          </label>
          <input
            id="digest-time"
            type="time"
            value={digestTime}
            onChange={(e) => setDigestTime(e.target.value)}
            className="input"
            style={{ width: 110 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: 80 }}
          >
            {saving ? 'Saving…' : savedMsg || 'Save'}
          </button>
        </div>
      </section>

      {/* Status */}
      <section className="settings-section">
        <h3 className="settings-heading">Status</h3>

        <div className="settings-stat-row">
          <span className="card-meta">API port</span>
          <span className="settings-stat-value">{API_PORT}</span>
        </div>

        <div className="settings-stat-row">
          <span className="card-meta">Last midnight promotion</span>
          <span className="settings-stat-value">{lastMidnight}</span>
        </div>

        <div className="settings-stat-row">
          <span className="card-meta">Last morning digest</span>
          <span className="settings-stat-value">{lastDigest}</span>
        </div>
      </section>
    </div>
  )
}

export default SettingsView
```

- [ ] **Step 2: Add settings styles to globals.css**

In `cortex/src/renderer/styles/globals.css`:

```css
.settings-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #1e293b;
}

.settings-section:last-child {
  border-bottom: none;
}

.settings-heading {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
  margin-bottom: 16px;
}

.settings-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
}

.settings-label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 14px;
  color: #f8fafc;
  cursor: pointer;
}

.settings-sublabel {
  font-size: 12px;
  color: #475569;
  font-weight: 400;
}

.settings-checkbox {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  cursor: pointer;
  accent-color: #2563eb;
}

.settings-stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #0f172a;
}

.settings-stat-value {
  font-size: 13px;
  color: #94a3b8;
  font-family: 'Courier New', monospace;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/SettingsView.tsx src/renderer/styles/globals.css
git commit -m "feat: settings view component — auto-start, digest time, status"
```

---

## Task 4: Wire Settings into App + TopBar

**Files:**
- Modify: `cortex/src/shared/constants.ts`
- Modify: `cortex/src/renderer/App.tsx`
- Modify: `cortex/src/renderer/components/TopBar.tsx`

- [ ] **Step 1: Verify View type already includes 'settings'**

Check `cortex/src/shared/constants.ts` — `View` already has `'settings'` as of Phase 1. No change needed. Proceed to Step 2.

- [ ] **Step 2: Import and render SettingsView in App.tsx**

In `cortex/src/renderer/App.tsx`:

Add import:
```typescript
import SettingsView from './components/SettingsView'
```

In the view rendering block, add settings case:
```tsx
) : view === 'archive' ? (
  <ArchiveView ... />
) : view === 'settings' ? (
  <SettingsView />
) : null}
```

Replace the existing `view === 'archive'` fallback (`else`) with the explicit check above.

- [ ] **Step 3: Add gear icon to TopBar**

In `cortex/src/renderer/components/TopBar.tsx`:

Add `Settings` icon import from Lucide:
```typescript
import { Plus, Search, Settings } from 'lucide-react'
```

In the `TopBar` component, find the `+` (Add) button and add a gear icon before it:

```tsx
<button
  type="button"
  className={`btn-icon ${view === 'settings' ? 'btn-icon-active' : ''}`}
  onClick={() => onViewChange('settings')}
  title="Settings"
>
  <Settings size={16} />
</button>
```

Add to `TopBar` props interface:
```typescript
interface Props {
  // ... existing
  view: View
  onViewChange: (view: View) => void
}
```

(These should already exist — verify the prop signature matches.)

- [ ] **Step 4: Add btn-icon-active style**

In `globals.css`:
```css
.btn-icon-active {
  background: #1e293b;
  color: #f8fafc;
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.web.json
```

Expected: clean.

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

Expected: All 32 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/shared/constants.ts src/renderer/App.tsx src/renderer/components/TopBar.tsx src/renderer/styles/globals.css
git commit -m "feat: wire settings view into app — gear icon in topbar navigates to settings"
```

---

## Task 5: Manual Verification

- [ ] **Step 1: Launch and navigate to Settings**

Start Cortex: `npm run dev`

Click the gear icon in TopBar → Settings view opens.

Verify:
- Morning digest time shows `08:00` default
- API port shows `51204`
- Last midnight promotion shows "Never" (or last run time)
- On Windows: "Launch at Windows login" checkbox appears

- [ ] **Step 2: Change digest time**

Change from `08:00` to `07:30` → click Save → "Saved" flash → reload settings → time persists.

Verify via SQLite:
```bash
sqlite3 "%APPDATA%\cortex\cortex.db" "SELECT * FROM meta;"
```
Expected: `morning_digest_time = 07:30`

- [ ] **Step 3: Auto-start toggle (Windows)**

Toggle "Launch at Windows login" → check Task Manager → Startup apps → Cortex should appear/disappear.

- [ ] **Step 4: Settings persist across restart**

Change digest time to `09:15`. Quit Cortex. Restart. Open Settings → time still shows `09:15`.
