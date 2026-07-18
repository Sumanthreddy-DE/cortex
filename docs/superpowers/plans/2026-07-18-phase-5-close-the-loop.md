# Phase 5 — Close the Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Cortex a loop, not a bucket: rapid keyboard triage for the 60-item inbox, morning digest delivered over Discord (replacing the never-working gws email), capture receipts so the phone knows a message landed, and removal of the dead Telegram pipeline.

**Architecture:** Triage mode is a full-screen React overlay driven off App-level state and the existing `useItems` mutation functions — no new IPC, no new DB queries. Discord digest and receipts reuse the already-configured bot token via plain `fetch` against the Discord REST API from the Electron main process (same pattern as `src/main/discord/poller.ts`). Telegram module is deleted outright — its Supabase backend no longer resolves in DNS.

**Tech Stack:** Electron, React 18, TypeScript, better-sqlite3, Discord REST API v10, Vitest, Playwright (e2e).

**Approved visual:** `mockups/triage-mode.png` — one centered card, keycap row below, progress bar on top. Match it.

## Global Constraints

- Typecheck must stay clean after every task: `npm run typecheck` — zero errors.
- Unit tests: `npm run test:unit`. WARNING: this rebuilds better-sqlite3 for the Node ABI. Before launching the app or running e2e afterwards, run `npm run native:electron`.
- E2E: `npm run build` then `npx playwright test`. The spec already isolates the DB per run via `CORTEX_DATA_DIR` — never remove that.
- No `Co-Authored-By` or any AI attribution in commits.
- Design system: cream paper background, serif display font, mono uppercase labels, coral/sage/butter accents. Reuse existing CSS variables in `src/renderer/styles/globals.css` (`--font-mono`, `--ink-stamp`, etc.) — do not invent new hex colors when a variable exists.
- Discord API base: `https://discord.com/api/v10`, auth header `Authorization: Bot <token>`, env vars `DISCORD_BOT_TOKEN` + `DISCORD_CHANNEL_ID` already live in `%APPDATA%\Cortex\.env` (loaded by `src/main/runtime-env.ts` at startup).
- Real user DB lives at `%APPDATA%\Cortex\cortex.db` — any manual app launch for testing must set `CORTEX_DATA_DIR` to a temp dir.

---

### Task 1: Triage session mode

**Files:**
- Create: `src/renderer/components/TriageMode.tsx`
- Modify: `src/renderer/App.tsx` (state + keyboard entry + render)
- Modify: `src/renderer/components/TopBar.tsx` (entry button)
- Modify: `src/renderer/styles/globals.css` (append `triage-*` styles)
- Test: `tests/e2e/app.spec.ts` (append one e2e test)

**Interfaces:**
- Consumes from `useItems()` (already in `App.tsx`): `update(id: string, patch: ItemPatch): Promise<Item>`, `archive(id: string): Promise<void>`, `complete(id: string): Promise<Item>`, `uncomplete(id: string): Promise<Item>`, `restore(id: string)` — check the exact restore name in `src/renderer/hooks/useItems.ts` return block (line ~148) before wiring undo for archive.
- Consumes: `getFixedBucketTag(tags: string[])` from `src/renderer/lib/**` (already imported in App.tsx — same filter as the `inboxCount` derivation at `App.tsx:86`).
- Produces: `<TriageMode items={...} onSetPriority={...} onArchive={...} onComplete={...} onUndo={...} onClose={...} />` — App owns open/close state.

- [ ] **Step 1: Create `TriageMode.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import type { Item } from '../lib/api'
import type { Priority } from '../../shared/constants'

interface TriageAction {
  itemId: string
  kind: 'priority' | 'archive' | 'complete'
}

interface Props {
  items: Item[]
  onSetPriority: (id: string, priority: Priority) => Promise<unknown>
  onArchive: (id: string) => Promise<unknown>
  onComplete: (id: string) => Promise<unknown>
  onUndoPriority: (id: string) => Promise<unknown>
  onUndoArchive: (id: string) => Promise<unknown>
  onUndoComplete: (id: string) => Promise<unknown>
  onClose: () => void
}

const KEY_TO_PRIORITY: Record<string, Priority> = {
  t: 'today',
  m: 'tomorrow',
  w: 'this-week',
  s: 'someday'
}

function ageInDays(createdAt: number): number {
  return Math.max(0, Math.floor((Date.now() - createdAt) / 86_400_000))
}

export function TriageMode({
  items,
  onSetPriority,
  onArchive,
  onComplete,
  onUndoPriority,
  onUndoArchive,
  onUndoComplete,
  onClose
}: Props) {
  // Snapshot ids at open so processed/skipped items don't reshuffle the deck
  const [queue, setQueue] = useState<string[]>(() => items.map((item) => item.id))
  const [index, setIndex] = useState(0)
  const [doneCount, setDoneCount] = useState(0)
  const [lastAction, setLastAction] = useState<TriageAction | null>(null)
  const [busy, setBusy] = useState(false)

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const current = index < queue.length ? byId.get(queue[index]) : undefined

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      event.stopPropagation()
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (busy) return

      const key = event.key.toLowerCase()

      if (key === 'u' && lastAction) {
        setBusy(true)
        const revert =
          lastAction.kind === 'priority'
            ? onUndoPriority(lastAction.itemId)
            : lastAction.kind === 'archive'
              ? onUndoArchive(lastAction.itemId)
              : onUndoComplete(lastAction.itemId)
        void revert.finally(() => {
          setLastAction(null)
          setDoneCount((count) => Math.max(0, count - 1))
          setIndex((value) => Math.max(0, value - 1))
          setBusy(false)
        })
        return
      }

      if (!current) return

      if (event.key === 'Enter') {
        setIndex((value) => value + 1)
        return
      }

      const priority = KEY_TO_PRIORITY[key]
      const run =
        priority ? onSetPriority(current.id, priority)
        : key === 'a' ? onArchive(current.id)
        : key === 'x' ? onComplete(current.id)
        : null
      if (!run) return

      const kind: TriageAction['kind'] = priority ? 'priority' : key === 'a' ? 'archive' : 'complete'
      setBusy(true)
      void run
        .then(() => {
          setLastAction({ itemId: current.id, kind })
          setDoneCount((count) => count + 1)
          setIndex((value) => value + 1)
        })
        .finally(() => setBusy(false))
    }

    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [busy, current, lastAction, onArchive, onClose, onComplete, onSetPriority, onUndoArchive, onUndoComplete, onUndoPriority])

  const remaining = queue.length - index

  return (
    <div className="triage-overlay">
      <div className="triage-progress">
        Triage · <b>{remaining}</b> of {queue.length} left
      </div>
      <div className="triage-bar">
        <div className="triage-bar-fill" style={{ width: `${queue.length === 0 ? 100 : (index / queue.length) * 100}%` }} />
      </div>

      {current ? (
        <div className="triage-card">
          <span className="triage-kind">{current.type}</span>
          <h1 className="triage-title">{current.title}</h1>
          <div className="triage-meta">
            captured <span className="triage-age">{ageInDays(current.created_at)} days ago</span>
            {current.url ? <> · <span className="triage-url">{new URL(current.url).hostname}</span></> : null}
          </div>
        </div>
      ) : (
        <div className="triage-card triage-done">
          <h1 className="triage-title">
            {doneCount === queue.length && queue.length > 0 ? 'Inbox zero. Go outside.' : `Done — ${doneCount} sorted, ${queue.length - doneCount} skipped.`}
          </h1>
          <div className="triage-meta">Esc to leave</div>
        </div>
      )}

      <div className="triage-keys">
        {[
          ['T', 'today', 'triage-key-today'],
          ['M', 'tomorrow', ''],
          ['W', 'this week', ''],
          ['S', 'someday', ''],
          ['X', 'done', 'triage-key-done'],
          ['A', 'archive', 'triage-key-archive'],
          ['↵', 'skip', '']
        ].map(([cap, label, extra]) => (
          <div key={label} className={`triage-key ${extra}`}>
            <div className="triage-keycap">{cap}</div>
            {label}
          </div>
        ))}
      </div>
      <div className="triage-hint">U undo last · ESC leave</div>
    </div>
  )
}
```

- [ ] **Step 2: Wire into `App.tsx`**

Add state near the other `useState` calls:

```tsx
const [triageOpen, setTriageOpen] = useState(false)
```

Add the inbox item list derivation next to `inboxCount` (App.tsx:86 uses the same filter — reuse it):

```tsx
const inboxItems = items.filter(
  (item) => item.priority === 'inbox' && !getFixedBucketTag(item.tags)
)
```

and change `inboxCount` to `inboxItems.length`.

In the `handleKeyDown` effect (App.tsx:91-128), add BEFORE the other bindings — and note the effect's dependency array must gain `triageOpen`:

```tsx
if (triageOpen) return // TriageMode owns the keyboard while open

if (lowerKey === 'g' && !event.ctrlKey && !event.metaKey && !isEditableTarget(event.target)) {
  event.preventDefault()
  if (inboxCount > 0) setTriageOpen(true)
  return
}
```

Render at the end of the JSX, above the EditModal render:

```tsx
{triageOpen ? (
  <TriageMode
    items={inboxItems}
    onSetPriority={(id, priority) => update(id, { priority })}
    onArchive={(id) => archive(id)}
    onComplete={(id) => complete(id)}
    onUndoPriority={(id) => update(id, { priority: 'inbox' })}
    onUndoArchive={(id) => restore(id)}
    onUndoComplete={(id) => uncomplete(id)}
    onClose={() => setTriageOpen(false)}
  />
) : null}
```

`update`, `archive`, `complete`, `uncomplete` come from the existing `useItems()` destructure at App.tsx:70-83 — add any that are missing there. For `restore`: check the `return {` block of `src/renderer/hooks/useItems.ts` (~line 148) for the un-archive function name; if none exists, add one that calls `api.restoreItem(id)` and re-inserts the item into `items` state (mirror the `uncomplete` implementation at useItems.ts:87-94).

- [ ] **Step 3: Entry button in `TopBar.tsx`**

Find where TopBar renders the view buttons. Add a triage chip that App controls via new props `inboxCount: number` and `onStartTriage: () => void`:

```tsx
{inboxCount > 0 ? (
  <button type="button" className="triage-launch" onClick={onStartTriage} title="Triage inbox (g)">
    Triage {inboxCount}
  </button>
) : null}
```

Pass both props from App.tsx where `<TopBar ... />` is rendered (`onStartTriage={() => setTriageOpen(true)}`).

- [ ] **Step 4: Append CSS to `globals.css`**

```css
/* ── Triage mode ── */
.triage-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: var(--paper, #f6f1e7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.triage-progress {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--ink-soft, #6b7280);
  margin-bottom: 10px;
}
.triage-progress b { color: #e2674e; }
.triage-bar {
  width: 420px;
  height: 4px;
  border-radius: 2px;
  background: rgba(31, 36, 48, 0.08);
  margin-bottom: 42px;
}
.triage-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: #e2674e;
  transition: width 120ms ease;
}
.triage-card {
  width: min(560px, 86vw);
  background: #fffdf8;
  border: 1px solid rgba(31, 36, 48, 0.12);
  border-radius: 14px;
  padding: 44px 48px 36px;
  box-shadow: 0 10px 30px rgba(31, 36, 48, 0.1);
  text-align: center;
}
.triage-kind {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--ink-stamp);
  background: rgba(61, 70, 145, 0.08);
  display: inline-block;
  padding: 3px 10px;
  border-radius: 9px;
  margin-bottom: 20px;
}
.triage-title {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.35;
  margin: 0 0 18px;
}
.triage-meta {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-soft, #6b7280);
}
.triage-age { color: #e2674e; }
.triage-keys {
  margin-top: 46px;
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
}
.triage-key {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-soft, #6b7280);
}
.triage-keycap {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid rgba(31, 36, 48, 0.22);
  border-bottom-width: 3px;
  background: #fffdf8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}
.triage-key-today .triage-keycap { border-color: #e2674e; color: #e2674e; }
.triage-key-done .triage-keycap { border-color: #7a9471; color: #7a9471; }
.triage-key-archive .triage-keycap { border-color: #e8c56a; color: #a8842a; }
.triage-hint {
  margin-top: 30px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--ink-soft, #6b7280);
}
.triage-launch {
  font-family: var(--font-mono);
  font-size: 12px;
  border: 1px solid #e2674e;
  color: #e2674e;
  background: transparent;
  border-radius: 10px;
  padding: 4px 12px;
  cursor: pointer;
}
```

If `--paper` / `--ink-soft` variables don't exist in `globals.css`, keep the hex fallbacks shown above (they match the app's existing palette).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: zero errors.

- [ ] **Step 6: Add e2e test**

Append inside the `test.describe` block of `tests/e2e/app.spec.ts`:

```ts
test('triage mode: g opens, t moves item to Today', async () => {
  const { app, page } = await launchApp()
  try {
    await page.waitForSelector('.buckets-bar', { timeout: 15_000 })
    await page.evaluate(async () => {
      // @ts-expect-error window.cortex injected by preload
      await window.cortex.data.createItem({ type: 'idea', title: 'Triage me', priority: 'inbox', tags: [] })
    })
    await page.reload()
    await page.waitForSelector('.buckets-bar', { timeout: 15_000 })

    await page.keyboard.press('g')
    await expect(page.locator('.triage-overlay')).toBeVisible({ timeout: 3_000 })
    await expect(page.locator('.triage-title')).toHaveText('Triage me')

    await page.keyboard.press('t')
    // Queue exhausted -> end card
    await expect(page.locator('.triage-done')).toBeVisible({ timeout: 3_000 })
    await page.keyboard.press('Escape')
    await expect(page.locator('.triage-overlay')).not.toBeVisible()

    // Item now lives in the Today column
    await expect(page.getByText('Triage me').first()).toBeVisible({ timeout: 3_000 })
  } finally {
    await app.close()
  }
})
```

- [ ] **Step 7: Build + run e2e**

Run: `npm run build` then `npx playwright test`
Expected: all tests pass including the new triage test. (If unit tests ran since the last build, run `npm run native:electron` first.)

- [ ] **Step 8: Commit**

```bash
git add src/renderer/components/TriageMode.tsx src/renderer/App.tsx src/renderer/components/TopBar.tsx src/renderer/styles/globals.css tests/e2e/app.spec.ts
git commit -m "feat: triage session mode - one-key inbox processing"
```

---

### Task 2: Morning digest over Discord

**Files:**
- Modify: `src/main/cron/morning-digest.ts`
- Test: `tests/unit/morning-digest.test.ts` (append)

**Interfaces:**
- Consumes: `getTodayItems(db)` already in the same file (returns `Array<{ title: string; tags: string }>`).
- Produces: `buildDigestMessage(items: Array<{ title: string; tags: string }>, now: Date): string` (exported, pure — Task 3 reuses it for the `?today` reply) and `sendDiscordMessage(content: string): Promise<boolean>` (exported).

- [ ] **Step 1: Write failing tests**

Append to `tests/unit/morning-digest.test.ts`:

```ts
import { buildDigestMessage } from '../../src/main/cron/morning-digest'

describe('buildDigestMessage', () => {
  it('lists items with tags and a count', () => {
    const message = buildDigestMessage(
      [
        { title: 'Ship phase 5', tags: '["cortex"]' },
        { title: 'Call the bank', tags: '[]' }
      ],
      new Date('2026-07-18T05:00:00')
    )
    expect(message).toContain('Ship phase 5 [cortex]')
    expect(message).toContain('Call the bank')
    expect(message).toContain('2 tasks')
  })

  it('has a friendly empty state', () => {
    const message = buildDigestMessage([], new Date('2026-07-18T05:00:00'))
    expect(message).toContain('Nothing on your plate')
  })

  it('stays under the 2000-char Discord limit', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ title: `Task number ${i} with a fairly long title`, tags: '[]' }))
    expect(buildDigestMessage(many, new Date()).length).toBeLessThanOrEqual(2000)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test:unit`
Expected: FAIL — `buildDigestMessage` is not exported.

- [ ] **Step 3: Implement in `morning-digest.ts`**

Replace the entire email block in `fireMorningDigest` (the `const today = ...` line down through the `spawnSync('gws', ...)` try/catch, lines ~80-118) and delete the `import { spawnSync } from 'node:child_process'` line. Add:

```ts
export function buildDigestMessage(items: Array<{ title: string; tags: string }>, now: Date): string {
  const today = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  if (items.length === 0) {
    return `**Cortex — ${today}**\nNothing on your plate today. Add something.`
  }
  const lines = items.map((item) => {
    let tagSuffix = ''
    try {
      const parsed = JSON.parse(item.tags) as string[]
      tagSuffix = parsed.length > 0 ? ` [${parsed.join(', ')}]` : ''
    } catch {
      // malformed tags JSON - show title without tags
    }
    return `• ${item.title}${tagSuffix}`
  })
  const header = `**Cortex — ${today}**\n`
  const footer = `\n${items.length} task${items.length === 1 ? '' : 's'} today.`
  let body = lines.join('\n')
  const budget = 2000 - header.length - footer.length - 20
  if (body.length > budget) {
    const kept: string[] = []
    let used = 0
    for (const line of lines) {
      if (used + line.length + 1 > budget) break
      kept.push(line)
      used += line.length + 1
    }
    body = kept.join('\n') + `\n… and ${lines.length - kept.length} more`
  }
  return header + body + footer
}

export async function sendDiscordMessage(content: string): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN
  const channelId = process.env.DISCORD_DIGEST_CHANNEL_ID ?? process.env.DISCORD_CHANNEL_ID
  if (!token || !channelId) {
    return false
  }
  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    if (!response.ok) {
      console.error(`[digest] Discord send failed ${response.status}: ${await response.text()}`)
      return false
    }
    return true
  } catch (error) {
    console.error('[digest] Discord send error:', error)
    return false
  }
}
```

At the end of `fireMorningDigest` (keep the existing `Notification` block and `recordDigestFired` call):

```ts
void sendDiscordMessage(buildDigestMessage(todayItems, now))
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test:unit`
Expected: all pass, including the 3 new ones.

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck` — zero errors. Then:

```bash
git add src/main/cron/morning-digest.ts tests/unit/morning-digest.test.ts
git commit -m "feat: morning digest posts to Discord, drop dead gws email path"
```

---

### Task 3: Discord receipts + ?today query

**Files:**
- Modify: `src/main/discord/poller.ts`
- Test: `tests/unit/discord-poller.test.ts` (append)

**Interfaces:**
- Consumes: `buildDigestMessage`, `sendDiscordMessage`, `getTodayItems` from `src/main/cron/morning-digest.ts` (Task 2), `getDb` NOT needed — poller already receives `db`.
- Produces: `isQueryMessage(content: string): boolean` (exported for tests).

**Setup note (user action, document in commit message if it blocks):** the bot invite only granted View Channels + Read Message History. Receipts need **Add Reactions**, replies need **Send Messages**. Fix in Discord: Server Settings → Roles → the bot's role → enable both permissions (or channel-level overrides on the capture channel).

- [ ] **Step 1: Write failing tests**

Append to `tests/unit/discord-poller.test.ts`:

```ts
import { isQueryMessage } from '../../src/main/discord/poller'

describe('isQueryMessage', () => {
  it('matches ?today and ?list with whitespace tolerance', () => {
    expect(isQueryMessage('?today')).toBe(true)
    expect(isQueryMessage('  ?list ')).toBe(true)
    expect(isQueryMessage('?TODAY')).toBe(true)
  })

  it('does not match capture messages', () => {
    expect(isQueryMessage('buy milk !today')).toBe(false)
    expect(isQueryMessage('what is ?today about')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test:unit`
Expected: FAIL — `isQueryMessage` is not exported.

- [ ] **Step 3: Implement in `poller.ts`**

Add imports at the top:

```ts
import { buildDigestMessage, sendDiscordMessage, getTodayItems } from '../cron/morning-digest'
```

Add the query matcher and a reaction helper:

```ts
export function isQueryMessage(content: string): boolean {
  return /^\s*\?(today|list)\s*$/i.test(content)
}

async function addReceiptReaction(token: string, channelId: string, messageId: string): Promise<void> {
  try {
    const response = await fetch(
      `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/%E2%9C%85/@me`,
      { method: 'PUT', headers: { Authorization: `Bot ${token}` } }
    )
    if (!response.ok && response.status !== 429) {
      console.error(`[discord] Receipt reaction failed ${response.status} (check Add Reactions permission)`)
    }
  } catch (error) {
    console.error('[discord] Receipt reaction error:', error)
  }
}
```

In `drainDiscordChannel`, inside the message loop after the bot/empty-content guards and BEFORE `parseCaptureMessage` runs, add the query branch:

```ts
if (isQueryMessage(rawText)) {
  void sendDiscordMessage(buildDigestMessage(getTodayItems(db), new Date()))
  continue // a query is not a capture
}
```

After a successful `createItem` (inside the `try`, right after `insertedCount += 1`):

```ts
void addReceiptReaction(token, channelId, message.id)
```

Note: `token` and `channelId` are read at the top of `drainDiscordChannel` and narrowed by the early return — TypeScript will see them as `string` at this point.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test:unit`
Expected: all pass.

- [ ] **Step 5: Typecheck + live check**

Run: `npm run typecheck` — zero errors.
Then `npm run native:electron && npm run build`, launch with a temp DB (`CORTEX_DATA_DIR`), send a message in the capture channel, confirm within 60s: ✅ reaction appears on the message; send `?today`, confirm the bot replies with the digest. If the reaction fails with 403, the role permission from the setup note is missing — tell the user, don't code around it.

- [ ] **Step 6: Commit**

```bash
git add src/main/discord/poller.ts tests/unit/discord-poller.test.ts
git commit -m "feat: Discord capture receipts and ?today query reply"
```

---

### Task 4: Delete the dead Telegram pipeline

**Files:**
- Delete: `src/main/telegram/poller.ts` (whole `src/main/telegram/` directory)
- Delete: `tests/unit/poller.test.ts` (only tests the Telegram drain)
- Modify: `src/main/index.ts` (remove import at line ~42, `stopTelegramPoller` declaration at ~47, the `startTelegramPoller(...)` call at ~366, and the `stopTelegramPoller()` in `will-quit`)
- Modify: `src/renderer/components/SettingsView.tsx` (remove the "Telegram queue config" stat row, lines ~147-152)
- Modify: `package.json` (drop `@supabase/supabase-js` dependency)

- [ ] **Step 1: Check nothing else uses Supabase**

Run: `grep -ri "supabase" src server-web.ts chrome-extension --include="*.ts" --include="*.js" -l`
Expected: only `src/main/telegram/poller.ts`. If anything else appears, STOP and report — do not delete the dependency.

- [ ] **Step 2: Delete module + test, remove wiring**

Remove the four `telegram` touchpoints in `src/main/index.ts` listed above, the SettingsView row, then:

```bash
git rm -r src/main/telegram tests/unit/poller.test.ts
npm uninstall @supabase/supabase-js
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck` — zero errors.
Run: `npm run test:unit` — all pass (poller.test.ts gone, discord tests remain).
Run: `npm run native:electron && npm run build && npx playwright test` — all e2e pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove dead Telegram/Supabase capture pipeline"
```

---

## Out of scope (stay out)

- Stale-item sweep (backlog item 9) and video-to-text (item 10) — separate phases.
- No new views (backlog item 11 constraint).
- `.env` changes: `DISCORD_DIGEST_CHANNEL_ID` is optional; digest falls back to the capture channel. Don't create new channels programmatically.
