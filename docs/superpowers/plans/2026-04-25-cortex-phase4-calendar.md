# Cortex Phase 4 — Calendar Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Add to Calendar" button to the Edit modal. Clicking it shells out to `gws calendar insert` with the item title and a date inferred from its priority. No OAuth in Cortex — `gws` CLI handles all Google auth. Button shows "Added ✓" after success.

**Architecture:** Pure UI addition. No new backend routes, no new DB columns. The Edit modal calls a preload-exposed `shell.exec` via Electron's IPC, or more correctly: the main process exposes an `addToCalendar` handler via `ipcMain`. The renderer calls it via `window.electron.addToCalendar(title, date)`. Preload bridges IPC.

**Tech Stack:** Electron IPC (`ipcMain` / `ipcRenderer`), Node.js `child_process.execFile`, `gws` CLI (already installed + authenticated), Lucide `CalendarPlus` + `Check` icons.

**Prerequisites:** Phase 1 complete. `gws` CLI installed and authenticated (`gws auth login`).

---

## File Map

```
cortex/src/
├── preload/
│   └── index.ts              # MODIFY — expose addToCalendar via contextBridge
├── main/
│   └── calendar.ts           # NEW — IPC handler + gws CLI subprocess
└── renderer/
    └── components/
        └── EditModal.tsx     # MODIFY — add "Add to Calendar" button + state
```

---

## Task 1: Calendar Subprocess Helper

**Files:**
- Create: `cortex/src/main/calendar.ts`

This module runs `gws calendar insert` as a child process and returns success/failure.

- [ ] **Step 1: Write failing test**

Create `cortex/tests/unit/calendar.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { inferCalendarDate } from '../../src/main/calendar'

describe('inferCalendarDate', () => {
  it('returns today for for-now priority', () => {
    const today = new Date()
    const result = inferCalendarDate('for-now', today)
    expect(result).toBe(today.toISOString().slice(0, 10))
  })

  it('returns today for today priority', () => {
    const today = new Date('2026-04-25')
    expect(inferCalendarDate('today', today)).toBe('2026-04-25')
  })

  it('returns tomorrow for tomorrow priority', () => {
    const today = new Date('2026-04-25')
    expect(inferCalendarDate('tomorrow', today)).toBe('2026-04-26')
  })

  it('returns 3 days from now for this-week priority', () => {
    const today = new Date('2026-04-25')
    expect(inferCalendarDate('this-week', today)).toBe('2026-04-28')
  })

  it('returns 7 days from now for someday priority', () => {
    const today = new Date('2026-04-25')
    expect(inferCalendarDate('someday', today)).toBe('2026-05-02')
  })

  it('returns today for inbox priority', () => {
    const today = new Date('2026-04-25')
    expect(inferCalendarDate('inbox', today)).toBe('2026-04-25')
  })
})
```

Run: `npx vitest run tests/unit/calendar.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 2: Write calendar.ts**

```typescript
// cortex/src/main/calendar.ts
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { type Priority } from '../shared/constants'

const execFileAsync = promisify(execFile)

export function inferCalendarDate(priority: Priority, now = new Date()): string {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const offsetDays: Record<Priority, number> = {
    inbox: 0,
    'for-now': 0,
    today: 0,
    tomorrow: 1,
    'this-week': 3,
    someday: 7,
  }

  base.setDate(base.getDate() + (offsetDays[priority] ?? 0))
  return base.toISOString().slice(0, 10)
}

export interface AddToCalendarOptions {
  title: string
  priority: Priority
  /** Optional explicit date override (YYYY-MM-DD). If omitted, inferred from priority. */
  date?: string
}

export interface AddToCalendarResult {
  ok: boolean
  error?: string
}

/**
 * Shell out to `gws calendar insert` to add an event.
 * Requires gws CLI to be installed and authenticated.
 */
export async function addToCalendar(options: AddToCalendarOptions): Promise<AddToCalendarResult> {
  const date = options.date ?? inferCalendarDate(options.priority)

  // Sanitize title — strip quotes to prevent shell injection
  const safeTitle = options.title.replace(/"/g, '').replace(/'/g, '')

  try {
    await execFileAsync('gws', ['calendar', 'insert', '--title', safeTitle, '--date', date], {
      timeout: 10_000,
    })
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)

    // gws not installed or not authenticated
    if (message.includes('ENOENT') || message.includes('not found')) {
      return {
        ok: false,
        error: 'gws CLI not found. Install it and run: gws auth login',
      }
    }

    if (message.includes('auth') || message.includes('401') || message.includes('403')) {
      return {
        ok: false,
        error: 'gws not authenticated. Run: gws auth login',
      }
    }

    return { ok: false, error: message }
  }
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/unit/calendar.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/main/calendar.ts tests/unit/calendar.test.ts
git commit -m "feat: calendar helper — infer date from priority, shell to gws cli"
```

---

## Task 2: IPC Bridge (main + preload)

**Files:**
- Modify: `cortex/src/main/index.ts`
- Modify: `cortex/src/preload/index.ts`

- [ ] **Step 1: Read current preload/index.ts**

```typescript
// Current content — minimal contextBridge
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
  },
})
```

- [ ] **Step 2: Extend preload to expose addToCalendar**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
  },
  addToCalendar: (title: string, priority: string, date?: string) =>
    ipcRenderer.invoke('calendar:add', { title, priority, date }),
})
```

- [ ] **Step 3: Register IPC handler in main process**

In `src/main/index.ts`, add the import and handler:

```typescript
import { ipcMain } from 'electron'
import { addToCalendar } from './calendar'
```

Inside `app.whenReady().then(...)`, after `createMainWindow()`:

```typescript
ipcMain.handle('calendar:add', async (_event, options) => {
  return addToCalendar(options)
})
```

- [ ] **Step 4: Add TypeScript type declaration for window.electron**

Create `cortex/src/renderer/electron.d.ts`:

```typescript
interface Window {
  electron: {
    versions: {
      node: () => string
      chrome: () => string
      electron: () => string
    }
    addToCalendar: (
      title: string,
      priority: string,
      date?: string
    ) => Promise<{ ok: boolean; error?: string }>
  }
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.node.json
npx tsc --noEmit -p tsconfig.web.json
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/main/index.ts src/preload/index.ts src/renderer/electron.d.ts
git commit -m "feat: ipc bridge for calendar:add — preload exposes addToCalendar to renderer"
```

---

## Task 3: Edit Modal — "Add to Calendar" Button

**Files:**
- Modify: `cortex/src/renderer/components/EditModal.tsx`

The button appears in the modal footer (between Delete and Save). State machine:
- `idle` → button shows `CalendarPlus` + "Add to Calendar"
- `loading` → button shows spinner + "Adding…" (disabled)
- `success` → button shows `Check` + "Added" (green, disabled for 3s then resets to idle)
- `error` → button shows `X` + error message in small text below

- [ ] **Step 1: Read current EditModal.tsx footer**

The current footer has:
```tsx
<div className="modal-footer">
  {item && (
    <button type="button" className="btn-danger" onClick={handleDelete}>
      <Trash2 size={14} /> Delete
    </button>
  )}
  <div style={{ flex: 1 }} />
  <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
  <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
    {saving ? 'Saving…' : 'Save'}
  </button>
</div>
```

- [ ] **Step 2: Add calendar state to EditModal component**

The state is unified: `'idle' | 'loading' | 'success' | { error: string }` — no separate error string state that must be kept in sync.

Add to the existing state declarations in `EditModal.tsx`:

```typescript
type CalendarState = 'idle' | 'loading' | 'success' | { error: string }
const [calendarState, setCalendarState] = useState<CalendarState>('idle')
const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
```

Add the handler before the return:

```typescript
function resetCalendar(delayMs: number) {
  if (resetTimer.current) clearTimeout(resetTimer.current)
  resetTimer.current = setTimeout(() => setCalendarState('idle'), delayMs)
}

// Clean up timer if modal unmounts before it fires
useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current) }, [])

async function handleAddToCalendar() {
  if (!window.electron?.addToCalendar) return
  setCalendarState('loading')

  try {
    const result = await window.electron.addToCalendar(title, priority)
    if (result.ok) {
      setCalendarState('success')
      resetCalendar(3000)
    } else {
      setCalendarState({ error: result.error ?? 'Failed to add to calendar' })
      resetCalendar(5000)
    }
  } catch {
    setCalendarState({ error: 'Unexpected error — is gws installed?' })
    resetCalendar(5000)
  }
}
```

- [ ] **Step 3: Add Lucide icons**

In the import line at the top of `EditModal.tsx`, add `CalendarPlus` and `Check`:

```typescript
import { Link2, PenLine, Trash2, X, CalendarPlus, Check } from 'lucide-react'
```

- [ ] **Step 4: Add button to modal footer**

Replace the existing `modal-footer` div with:

```tsx
<div className="modal-footer">
  {item && (
    <button type="button" className="btn-danger" onClick={handleDelete} disabled={saving}>
      <Trash2 size={14} /> Delete
    </button>
  )}

  <div style={{ flex: 1 }} />

  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        type="button"
        className={`btn-secondary ${calendarState === 'success' ? 'btn-success' : ''}`}
        onClick={handleAddToCalendar}
        disabled={calendarState === 'loading' || calendarState === 'success'}
        title="Add to Google Calendar via gws CLI"
      >
        {calendarState === 'success' ? (
          <><Check size={14} style={{ color: '#86efac' }} /> Added</>
        ) : calendarState === 'loading' ? (
          'Adding…'
        ) : (
          <><CalendarPlus size={14} /> Add to Calendar</>
        )}
      </button>

      <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
      <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>

    {typeof calendarState === 'object' && calendarState.error && (
      <div style={{ fontSize: 11, color: '#f87171', maxWidth: 280, textAlign: 'right' }}>
        {calendarState.error}
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 5: Add btn-success style**

In `cortex/src/renderer/styles/globals.css`, add:

```css
.btn-success {
  border-color: #166534;
  color: #86efac;
}
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.web.json
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/EditModal.tsx src/renderer/styles/globals.css
git commit -m "feat: add to calendar button in edit modal — shells to gws cli"
```

---

## Task 4: Manual Verification

- [ ] **Step 1: Verify gws is authenticated**

```bash
gws calendar insert --title "Cortex test event" --date "2026-04-26"
```

Expected: Event appears in Google Calendar. If not: run `gws auth login -s calendar`.

- [ ] **Step 2: Test from Edit modal**

1. Start Cortex: `npm run dev`
2. Add an item to Today column
3. Click the card → Edit modal opens
4. Click "Add to Calendar"
5. Button shows "Adding…" briefly then "Added ✓" in green
6. Check Google Calendar → event appears on today's date with the item's title

- [ ] **Step 3: Test with Tomorrow priority**

Add an item to Tomorrow column. Open edit → Add to Calendar.
Event should appear in Google Calendar on tomorrow's date.

- [ ] **Step 4: Test error state**

Temporarily rename `gws` binary or pass invalid args to trigger error state.
Button should show error message in small red text below the footer for 5 seconds then reset.
