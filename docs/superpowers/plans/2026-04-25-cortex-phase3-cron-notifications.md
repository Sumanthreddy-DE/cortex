# Cortex Phase 3 — Cron + Advanced Notifications

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the midnight priority promotion cron (with idempotency), the configurable morning digest notification, and wire both to the existing `meta` table. All notifications are Windows-native via Electron's `Notification` API, platform-guarded.

**Architecture:** Two node-cron jobs in Electron main process. Midnight cron (`0 0 * * *`) promotes items and writes `last_midnight_run` to the meta table. Morning digest cron runs every minute, checks `morning_digest_time` from meta, and fires exactly once per day. Both write to SQLite synchronously via better-sqlite3.

**Tech Stack:** node-cron (already installed), better-sqlite3, Electron Notification API, existing `meta` table from Phase 1 migrations.

**Prerequisites:** Phase 1 complete. `meta` table exists with `last_midnight_run` and `morning_digest_time` keys.

---

## File Map

```
cortex/src/main/
├── cron/
│   ├── reminders.ts        # EXISTS (Phase 1) — per-minute reminder check
│   ├── midnight.ts         # NEW — midnight promotion logic
│   └── morning-digest.ts   # NEW — morning digest notification
└── index.ts                # MODIFY — wire new cron jobs

cortex/tests/unit/
├── reminders.test.ts       # EXISTS — keep passing
├── midnight.test.ts        # NEW
└── morning-digest.test.ts  # NEW
```

---

## Task 1: Midnight Promotion Logic

**Files:**
- Create: `cortex/src/main/cron/midnight.ts`
- Create: `cortex/tests/unit/midnight.test.ts`

The midnight cron:
1. Checks `meta.last_midnight_run` — skip if < 20 hours ago (idempotency)
2. Checks `tomorrow` column → move all to `today`
3. Else checks `this-week` → surface oldest 2 to `today`
4. Fires appropriate Windows notification
5. Updates `meta.last_midnight_run = Date.now()`

- [ ] **Step 1: Write failing tests**

```typescript
// cortex/tests/unit/midnight.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { runMidnightPromotion } from '../../src/main/cron/midnight'

function seed(db: Database.Database, items: Array<{ priority: string; title: string; created_at?: number }>) {
  const insert = db.prepare(
    `INSERT INTO items (id, title, url, type, priority, tags, created_at, archived)
     VALUES (lower(hex(randomblob(8))), ?, NULL, 'idea', ?, '[]', ?, 0)`
  )
  for (const item of items) {
    insert.run(item.title, item.priority, item.created_at ?? Date.now())
  }
}

describe('runMidnightPromotion', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    runMigrations(db)
  })

  it('moves all tomorrow items to today', () => {
    seed(db, [
      { priority: 'tomorrow', title: 'Item A' },
      { priority: 'tomorrow', title: 'Item B' },
    ])

    const result = runMidnightPromotion(db)

    expect(result.action).toBe('promoted-tomorrow')
    expect(result.count).toBe(2)

    const todayItems = db.prepare("SELECT * FROM items WHERE priority='today'").all()
    expect(todayItems).toHaveLength(2)

    const tomorrowItems = db.prepare("SELECT * FROM items WHERE priority='tomorrow'").all()
    expect(tomorrowItems).toHaveLength(0)
  })

  it('surfaces oldest 2 from this-week when tomorrow is empty', () => {
    const old = Date.now() - 2 * 24 * 60 * 60 * 1000
    const older = Date.now() - 3 * 24 * 60 * 60 * 1000
    seed(db, [
      { priority: 'this-week', title: 'Old A', created_at: old },
      { priority: 'this-week', title: 'Older B', created_at: older },
      { priority: 'this-week', title: 'Newest C', created_at: Date.now() },
    ])

    const result = runMidnightPromotion(db)

    expect(result.action).toBe('surfaced-this-week')
    expect(result.count).toBe(2)

    const todayItems = db.prepare("SELECT * FROM items WHERE priority='today'").all() as any[]
    expect(todayItems).toHaveLength(2)
    // The two oldest should have moved to today
    const todayTitles = todayItems.map(i => i.title).sort()
    expect(todayTitles).toEqual(['Old A', 'Older B'].sort())

    const thisWeekItems = db.prepare("SELECT * FROM items WHERE priority='this-week'").all()
    expect(thisWeekItems).toHaveLength(1)
  })

  it('skips when already ran today (idempotency)', () => {
    seed(db, [{ priority: 'tomorrow', title: 'Item A' }])

    // Set last_midnight_run to 1 hour ago
    const oneHourAgo = Date.now() - 1 * 60 * 60 * 1000
    db.prepare("UPDATE meta SET value=? WHERE key='last_midnight_run'").run(String(oneHourAgo))

    const result = runMidnightPromotion(db)

    expect(result.action).toBe('skipped')
    // Tomorrow item should still be in tomorrow
    const tomorrowItems = db.prepare("SELECT * FROM items WHERE priority='tomorrow'").all()
    expect(tomorrowItems).toHaveLength(1)
  })

  it('returns clean-slate when all columns empty', () => {
    const result = runMidnightPromotion(db)
    expect(result.action).toBe('clean-slate')
    expect(result.count).toBe(0)
  })

  it('returns today-warning when today has items and tomorrow is empty', () => {
    seed(db, [{ priority: 'today', title: 'Leftover' }])

    const result = runMidnightPromotion(db)
    expect(result.action).toBe('today-warning')
    expect(result.count).toBe(1)
  })
})
```

Run: `npx vitest run tests/unit/midnight.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 2: Implement midnight.ts**

```typescript
// cortex/src/main/cron/midnight.ts
import { Notification } from 'electron'
import type Database from 'better-sqlite3'

export type MidnightResult =
  | { action: 'skipped'; count: 0 }
  | { action: 'promoted-tomorrow'; count: number }
  | { action: 'surfaced-this-week'; count: number }
  | { action: 'today-warning'; count: number }
  | { action: 'clean-slate'; count: 0 }

const IDEMPOTENCY_WINDOW_MS = 20 * 60 * 60 * 1000 // 20 hours

// Hoisted prepared statements — compiled once at module load
const stmts = {
  getLastRun: null as ReturnType<Database.Database['prepare']> | null,
}

export function runMidnightPromotion(db: Database.Database): MidnightResult {
  const metaRow = db
    .prepare("SELECT value FROM meta WHERE key='last_midnight_run'")
    .get() as { value: string } | undefined

  const lastRun = parseInt(metaRow?.value ?? '0', 10)
  if (!isNaN(lastRun) && Date.now() - lastRun < IDEMPOTENCY_WINDOW_MS) {
    return { action: 'skipped', count: 0 }
  }

  // Idempotency timestamp update is inside the transaction so it's atomic
  // with item updates — prevents double-promotion if app crashes mid-run
  const result = db.transaction((): MidnightResult => {
    db.prepare("UPDATE meta SET value=? WHERE key='last_midnight_run'").run(String(Date.now()))

    // tomorrow → today: use .changes to get count without a prior SELECT
    const tomorrowChanges = db
      .prepare("UPDATE items SET priority='today' WHERE priority='tomorrow' AND archived=0")
      .run().changes
    if (tomorrowChanges > 0) {
      return { action: 'promoted-tomorrow', count: tomorrowChanges }
    }

    // oldest 2 from this-week → today
    const thisWeekItems = db
      .prepare(
        "SELECT id FROM items WHERE priority='this-week' AND archived=0 ORDER BY created_at ASC LIMIT 2"
      )
      .all() as { id: string }[]

    if (thisWeekItems.length > 0) {
      const ids = thisWeekItems.map((r) => r.id)
      const placeholders = ids.map(() => '?').join(', ')
      db.prepare(`UPDATE items SET priority='today' WHERE id IN (${placeholders})`).run(...ids)
      return { action: 'surfaced-this-week', count: thisWeekItems.length }
    }

    const todayCount = (
      db.prepare("SELECT COUNT(*) as count FROM items WHERE priority='today' AND archived=0").get() as {
        count: number
      }
    ).count

    if (todayCount > 0) {
      return { action: 'today-warning', count: todayCount }
    }

    return { action: 'clean-slate', count: 0 }
  })()

  return result
}

// Typed record — TypeScript enforces all MidnightResult actions are covered
const MIDNIGHT_MESSAGES: Record<
  Exclude<MidnightResult['action'], 'skipped'>,
  (count: number) => string
> = {
  'promoted-tomorrow': (n) => `${n} item${n === 1 ? '' : 's'} moved to Today`,
  'surfaced-this-week': (n) => `Nothing due tomorrow — pulled ${n} from This Week`,
  'today-warning': (n) => `Still ${n} thing${n === 1 ? '' : 's'} from today — clear them first`,
  'clean-slate': () => 'Clean slate. Add something to Cortex.',
}

export function notifyMidnight(result: MidnightResult): void {
  if (process.platform !== 'win32' || result.action === 'skipped') return
  const body = MIDNIGHT_MESSAGES[result.action](result.count)
  new Notification({ title: 'Cortex', body }).show()
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/unit/midnight.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/main/cron/midnight.ts tests/unit/midnight.test.ts
git commit -m "feat: midnight promotion cron with idempotency"
```

---

## Task 2: Morning Digest

**Files:**
- Create: `cortex/src/main/cron/morning-digest.ts`
- Create: `cortex/tests/unit/morning-digest.test.ts`

The morning digest fires once per day at the user-configured time (`meta.morning_digest_time`, default `"08:00"`). The cron runs every minute and checks if the current time matches the configured time and the digest hasn't already fired today.

- [ ] **Step 1: Write failing tests**

```typescript
// cortex/tests/unit/morning-digest.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { shouldFireDigest, recordDigestFired } from '../../src/main/cron/morning-digest'

describe('shouldFireDigest', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    runMigrations(db)
    // Set digest time to 08:00
    db.prepare("UPDATE meta SET value='08:00' WHERE key='morning_digest_time'").run()
  })

  afterEach(() => {
    db.close()
  })

  it('returns true when current time matches digest time and not yet fired today', () => {
    // Mock current time to 08:00
    const date = new Date('2026-04-25T08:00:00')
    const result = shouldFireDigest(db, date)
    expect(result).toBe(true)
  })

  it('returns false when current time does not match digest time', () => {
    const date = new Date('2026-04-25T09:00:00')
    const result = shouldFireDigest(db, date)
    expect(result).toBe(false)
  })

  it('returns false after digest has already fired today', () => {
    const date = new Date('2026-04-25T08:00:00')
    // Record it already fired
    recordDigestFired(db, date)
    // Check again
    const result = shouldFireDigest(db, date)
    expect(result).toBe(false)
  })

  it('returns true again the next day', () => {
    const today = new Date('2026-04-25T08:00:00')
    recordDigestFired(db, today)

    const tomorrow = new Date('2026-04-26T08:00:00')
    const result = shouldFireDigest(db, tomorrow)
    expect(result).toBe(true)
  })
})
```

Run: `npx vitest run tests/unit/morning-digest.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 2: Verify last_digest_date is already in migrations**

`last_digest_date` is already seeded by Phase 1 migrations with `INSERT OR IGNORE INTO meta VALUES ('last_digest_date', '')`. No migration change needed — skip this step.

- [ ] **Step 3: Implement morning-digest.ts**

```typescript
// cortex/src/main/cron/morning-digest.ts
import { Notification } from 'electron'
import type Database from 'better-sqlite3'
import { DEFAULT_MORNING_DIGEST_TIME } from '../../shared/constants'

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function shouldFireDigest(db: Database.Database, now = new Date()): boolean {
  const timeRow = db
    .prepare("SELECT value FROM meta WHERE key='morning_digest_time'")
    .get() as { value: string } | undefined

  if (toHHMM(now) !== (timeRow?.value ?? DEFAULT_MORNING_DIGEST_TIME)) return false

  const dateRow = db
    .prepare("SELECT value FROM meta WHERE key='last_digest_date'")
    .get() as { value: string } | undefined

  return (dateRow?.value ?? '') !== toDateString(now)
}

export function recordDigestFired(db: Database.Database, now = new Date()): void {
  db.prepare("UPDATE meta SET value=? WHERE key='last_digest_date'").run(toDateString(now))
}

export function getDigestCounts(db: Database.Database): { todayCount: number; forNowCount: number } {
  // One query with GROUP BY instead of two separate COUNT queries
  const rows = db
    .prepare(
      "SELECT priority, COUNT(*) as count FROM items WHERE priority IN ('today','for-now') AND archived=0 GROUP BY priority"
    )
    .all() as { priority: string; count: number }[]

  const todayCount = rows.find((r) => r.priority === 'today')?.count ?? 0
  const forNowCount = rows.find((r) => r.priority === 'for-now')?.count ?? 0
  return { todayCount, forNowCount }
}

export function fireMorningDigest(db: Database.Database): void {
  if (process.platform !== 'win32') return

  const { todayCount, forNowCount } = getDigestCounts(db)
  const total = todayCount + forNowCount

  let body: string
  if (total === 0) {
    body = 'Nothing on your plate today. Add something.'
  } else if (forNowCount > 0 && todayCount > 0) {
    body = `${forNowCount} for now · ${todayCount} today`
  } else if (forNowCount > 0) {
    body = `${forNowCount} item${forNowCount === 1 ? '' : 's'} need your attention now`
  } else {
    body = `${todayCount} item${todayCount === 1 ? '' : 's'} due today`
  }

  new Notification({ title: 'Good morning — Cortex', body }).show()
  recordDigestFired(db)
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/unit/morning-digest.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/cron/morning-digest.ts src/main/db/migrations.ts tests/unit/morning-digest.test.ts
git commit -m "feat: morning digest cron — fires once per day at configured time"
```

---

## Task 3: Wire Cron Jobs into index.ts

**Files:**
- Modify: `cortex/src/main/index.ts`

The midnight and morning digest crons need to be scheduled from the Electron main process.

- [ ] **Step 1: Read current index.ts**

Current cron section in `src/main/index.ts`:
```typescript
cron.schedule(REMINDER_CHECK_CRON, () => {
  checkReminders(getDb())
  updateTrayCounts()
})
```

- [ ] **Step 2: Add new cron imports and schedules**

Add imports at top of `src/main/index.ts`:
```typescript
import { runMidnightPromotion, notifyMidnight } from './cron/midnight'
import { shouldFireDigest, fireMorningDigest } from './cron/morning-digest'
```

Add imports at top of `src/main/index.ts`:
```typescript
import { REMINDER_CHECK_CRON, MIDNIGHT_CRON } from '../shared/constants'
import { runMidnightPromotion, notifyMidnight } from './cron/midnight'
import { shouldFireDigest, fireMorningDigest } from './cron/morning-digest'
```

Add new cron schedules after the existing reminder cron:
```typescript
cron.schedule(MIDNIGHT_CRON, () => {
  const result = runMidnightPromotion(getDb())
  notifyMidnight(result)
  updateTrayCounts()
})

// Reuses per-minute cron — digest check is cheap (2 SQL reads)
cron.schedule(REMINDER_CHECK_CRON, () => {
  const db = getDb()
  if (shouldFireDigest(db)) fireMorningDigest(db)
})
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS (17 original + 5 midnight + 4 morning-digest = 26).

```bash
npx tsc --noEmit -p tsconfig.node.json
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: wire midnight + morning digest crons to electron main process"
```

---

## Task 4: Manual Smoke Tests

- [ ] **Step 1: Test midnight promotion manually**

Start Cortex (`npm run dev`). In the Cortex UI, add 2 items to the Tomorrow column.

Open DevTools (Ctrl+Shift+I on the main window) → Console → Electron main process:
```javascript
// In main process console (Menu → View → Toggle Developer Tools for main process)
// or test via a helper script
```

Alternatively, test via the DB directly:
```bash
# In SQLite (replace path with actual DB location)
sqlite3 "%APPDATA%\cortex\cortex.db" "UPDATE meta SET value='0' WHERE key='last_midnight_run';"
```

Then trigger midnight cron manually by changing its schedule to `* * * * *` temporarily → restart → wait a minute → check that Tomorrow items moved to Today.

- [ ] **Step 2: Test morning digest manually**

```bash
sqlite3 "%APPDATA%\cortex\cortex.db" \
  "UPDATE meta SET value='HH:MM' WHERE key='morning_digest_time';" \
  "UPDATE meta SET value='' WHERE key='last_digest_date';"
```

Replace `HH:MM` with 1 minute from now (e.g. `09:45`). Wait 1 minute → Windows notification "Good morning — Cortex" should appear. Check `last_digest_date` updated to today.

- [ ] **Step 3: Verify idempotency**

Wait another minute → notification should NOT fire again (same day).
