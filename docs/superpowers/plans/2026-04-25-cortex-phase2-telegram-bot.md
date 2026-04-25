# Cortex Phase 2 — Telegram Bot (Mobile Capture)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable mobile capture via Telegram. Anything sent to the Cortex bot on phone lands in a Supabase queue table. Electron polls every 60 seconds, drains the queue into SQLite as Inbox items. Zero cost, works even when laptop is off — items wait in Supabase until Electron next runs.

**Architecture:**
- Telegram bot (BotFather) → Railway webhook server (Node.js) → Supabase `bot_queue` table
- Electron main process → polls Supabase every 60s → drains to SQLite Inbox
- No polling from phone. No persistent websocket. Supabase is the buffer.

**Tech Stack:** Telegram Bot API, Supabase (free tier, Postgres), Railway (free tier, Node webhook), `node-fetch` or built-in `fetch` in Electron for polling, `@supabase/supabase-js` for Supabase client

---

## File Map

```
cortex/
└── src/
    └── main/
        ├── telegram/
        │   └── poller.ts          # Polls Supabase every 60s, drains queue to SQLite
        └── index.ts               # Add telegram poller to app startup

cortex-webhook/                    # Separate Railway-deployed project
├── package.json
├── server.js                      # Express webhook for Telegram → Supabase
└── .env.example
```

The webhook server is a separate small Node project (`cortex-webhook/`) deployed to Railway. It has no UI.

---

## Task 1: Supabase Setup

**External steps — no code files yet.**

- [ ] **Step 1: Create Supabase project**

1. Go to https://supabase.com → New project
2. Name: `cortex`
3. Region: EU (Frankfurt) or US East — whichever is closer
4. Save the project URL and anon key (will be needed in Tasks 2 and 3)

- [ ] **Step 2: Create bot_queue table**

In Supabase SQL Editor, run:

```sql
CREATE TABLE bot_queue (
  id BIGSERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  parsed_priority TEXT NOT NULL DEFAULT 'inbox',
  parsed_remind_at BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Allow anon insert (webhook will use anon key to insert)
ALTER TABLE bot_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow anon insert"
  ON bot_queue FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "allow anon select unprocessed"
  ON bot_queue FOR SELECT TO anon
  USING (processed_at IS NULL);

CREATE POLICY "allow anon update processed"
  ON bot_queue FOR UPDATE TO anon
  USING (processed_at IS NULL);
```

- [ ] **Step 3: Verify table exists**

In Supabase Table Editor → confirm `bot_queue` appears with the correct columns.

---

## Task 2: Telegram Bot Setup

**External steps — no code files yet.**

- [ ] **Step 1: Create bot via BotFather**

1. Open Telegram → search `@BotFather` → `/newbot`
2. Name: `Cortex`
3. Username: `cortex_capture_bot` (or any available username)
4. BotFather replies with a bot token — save it (`TELEGRAM_BOT_TOKEN`)

- [ ] **Step 2: Disable bot privacy mode (important)**

Send `/setprivacy` to BotFather → Select your bot → Disable.
Without this, the bot only receives messages when mentioned in groups.

- [ ] **Step 3: Test bot is alive**

Open your bot in Telegram → send `/start`. No reply expected yet (webhook not wired up). This just confirms the bot exists.

---

## Task 3: Webhook Server (Railway)

**Files:**
- Create: `cortex-webhook/package.json`
- Create: `cortex-webhook/server.js`
- Create: `cortex-webhook/.env.example`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "cortex-webhook",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "@supabase/supabase-js": "^2.38.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

- [ ] **Step 2: Write .env.example**

```
TELEGRAM_BOT_TOKEN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
PORT=3000
```

- [ ] **Step 3: Write message parser**

Add to `server.js` first as a pure function (easy to test):

```javascript
/**
 * @param {string} text
 * @returns {{ messageText: string, parsedPriority: string, parsedRemindAt: number | null }}
 */
function parseMessage(text) {
  const trimmed = text.trim()

  // Simple command → priority mapping (replaces three near-identical if blocks)
  const COMMAND_MAP = [
    { re: /^\/today\s+(.+)$/i, priority: 'today' },
    { re: /^\/tomorrow\s+(.+)$/i, priority: 'tomorrow' },
    { re: /^\/now\s+(.+)$/i, priority: 'for-now' },
  ]
  for (const { re, priority } of COMMAND_MAP) {
    const m = trimmed.match(re)
    if (m) return { messageText: m[1].trim(), parsedPriority: priority, parsedRemindAt: null }
  }

  // /remind "thing" tomorrow 3pm → parse time as best-effort
  const remindMatch = trimmed.match(/^\/remind\s+(.+?)\s+(tomorrow|today)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*$/i)
  if (remindMatch) {
    const itemText = remindMatch[1].trim()
    const dayWord = remindMatch[2].toLowerCase()
    const timeStr = remindMatch[3].trim()
    const remindAt = parseRemindAt(dayWord, timeStr)
    return { messageText: itemText, parsedPriority: 'inbox', parsedRemindAt: remindAt }
  }

  return { messageText: trimmed, parsedPriority: 'inbox', parsedRemindAt: null }
}

/**
 * @param {'today'|'tomorrow'} dayWord
 * @param {string} timeStr  e.g. "3pm", "9:30am", "14:00"
 * @returns {number} Unix ms timestamp
 */
function parseRemindAt(dayWord, timeStr) {
  const now = new Date()
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (dayWord === 'tomorrow') base.setDate(base.getDate() + 1)

  // Parse time
  const timeMatch = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!timeMatch) return base.getTime() + 9 * 3600 * 1000 // fallback 9am

  let hours = parseInt(timeMatch[1], 10)
  const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0
  const meridiem = timeMatch[3]?.toLowerCase()

  if (meridiem === 'pm' && hours < 12) hours += 12
  if (meridiem === 'am' && hours === 12) hours = 0

  base.setHours(hours, minutes, 0, 0)
  return base.getTime()
}
```

- [ ] **Step 4: Write full server.js**

```javascript
import express from 'express'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(express.json())

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const PORT = process.env.PORT ?? 3000

// Telegram webhook endpoint — Telegram POSTs updates here
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  try {
    const { message } = req.body

    // Ignore non-message updates (e.g. edited messages, reactions)
    if (!message?.text) {
      return res.sendStatus(200)
    }

    // Ignore bot commands we don't support — /start, /help
    if (message.text === '/start' || message.text === '/help') {
      return res.sendStatus(200)
    }

    const chatId = String(message.chat.id)
    const { messageText, parsedPriority, parsedRemindAt } = parseMessage(message.text)

    const { error } = await supabase.from('bot_queue').insert({
      chat_id: chatId,
      message_text: messageText,
      parsed_priority: parsedPriority,
      parsed_remind_at: parsedRemindAt ?? null,
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return res.sendStatus(500)
    }

    res.sendStatus(200)
  } catch (err) {
    console.error('Webhook error:', err)
    res.sendStatus(500)
  }
})

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Cortex webhook server listening on :${PORT}`)
})

// Paste parseMessage + parseRemindAt functions here (from Step 3)
```

Replace the comment with the actual `parseMessage` and `parseRemindAt` functions from Step 3.

- [ ] **Step 5: Test locally**

```bash
cd cortex-webhook
npm install
TELEGRAM_BOT_TOKEN=test SUPABASE_URL=test SUPABASE_ANON_KEY=test node server.js
```

Expected output: `Cortex webhook server listening on :3000`

Test health endpoint:
```bash
curl http://localhost:3000/health
```
Expected: `{"ok":true}`

- [ ] **Step 6: Commit webhook server**

```bash
cd cortex-webhook
git init
git add .
git commit -m "feat: telegram webhook server for cortex bot queue"
```

---

## Task 4: Deploy Webhook to Railway

**External steps + environment config.**

- [ ] **Step 1: Create Railway project**

1. Go to https://railway.app → New Project → Deploy from GitHub repo
2. Connect `cortex-webhook` repo (push it to GitHub first if needed)
3. Railway auto-detects Node → sets `npm run start` as start command

- [ ] **Step 2: Set environment variables in Railway**

In Railway project → Variables:
```
TELEGRAM_BOT_TOKEN=<from BotFather>
SUPABASE_URL=<from Supabase project settings>
SUPABASE_ANON_KEY=<from Supabase project settings → API>
```

- [ ] **Step 3: Get Railway public URL**

Railway provides a URL like `https://cortex-webhook-production.up.railway.app`. Copy it.

- [ ] **Step 4: Register webhook with Telegram**

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://cortex-webhook-production.up.railway.app/webhook/<TOKEN>"
```

Expected response:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

- [ ] **Step 5: Verify webhook is registered**

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

Expected: `"url": "https://cortex-webhook-production.up.railway.app/webhook/<TOKEN>"` and `"pending_update_count": 0`

- [ ] **Step 6: End-to-end smoke test**

1. Send "test message from phone" to your bot in Telegram
2. Check Supabase Table Editor → `bot_queue` → should show a row with `message_text = "test message from phone"`, `parsed_priority = "inbox"`, `processed_at = null`

---

## Task 5: Electron Poller

**Files:**
- Create: `cortex/src/main/telegram/poller.ts`
- Modify: `cortex/src/main/index.ts`

- [ ] **Step 1: Write failing test**

Create `cortex/tests/unit/poller.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the pure drain logic by mocking supabase client
describe('drainBotQueue', () => {
  it('inserts items into SQLite and marks queue rows processed', async () => {
    // This test is an integration test — see Task 5 Step 3 for the actual test
    // Here we confirm the shape of what we expect
    expect(true).toBe(true) // placeholder — real test in Step 3
  })
})
```

Run: `npx vitest run tests/unit/poller.test.ts`
Expected: PASS (placeholder)

- [ ] **Step 2: Write poller.ts**

```typescript
import type Database from 'better-sqlite3'
import { nanoid } from 'nanoid'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createItem } from '../api/items'
import { type Priority, PRIORITIES } from '../../shared/constants'

interface BotQueueRow {
  id: number
  message_text: string
  parsed_priority: string
  parsed_remind_at: number | null
}

let supabaseClient: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  if (!supabaseClient) {
    supabaseClient = createClient(url, key)
  }
  return supabaseClient
}

export async function drainBotQueue(db: Database.Database): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) return 0

  // Only fetch columns we use — avoids SELECT *
  const { data, error } = await supabase
    .from('bot_queue')
    .select('id, message_text, parsed_priority, parsed_remind_at')
    .is('processed_at', null)
    .order('id', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[telegram] Supabase fetch error:', error.message)
    return 0
  }

  if (!data || data.length === 0) return 0

  const rows = data as BotQueueRow[]
  const successIds: number[] = []

  for (const row of rows) {
    // Validate priority before inserting — reject bad values from the queue
    const priority: Priority = PRIORITIES.includes(row.parsed_priority as Priority)
      ? (row.parsed_priority as Priority)
      : 'inbox'

    const isUrl = row.message_text.startsWith('http://') || row.message_text.startsWith('https://')

    try {
      createItem(db, {
        id: nanoid(),
        title: row.message_text,
        url: isUrl ? row.message_text : null,
        type: isUrl ? 'link' : 'idea',
        priority,
        tags: [],
        note: null,
        remind_at: row.parsed_remind_at ?? null,
      })
      successIds.push(row.id)
    } catch (err) {
      console.error('[telegram] Failed to insert item:', err)
    }
  }

  // Batch-mark all successfully inserted rows — one round-trip instead of N
  if (successIds.length > 0) {
    await supabase
      .from('bot_queue')
      .update({ processed_at: new Date().toISOString() })
      .in('id', successIds)

    console.log(`[telegram] Drained ${successIds.length} item(s) from bot queue`)
  }

  return successIds.length
}

export function startTelegramPoller(
  db: Database.Database,
  onItemsAdded?: (count: number) => void,
  intervalMs = 60_000
): () => void {
  if (!getSupabase()) {
    console.log('[telegram] SUPABASE_URL/SUPABASE_ANON_KEY not set — telegram polling disabled')
    return () => {}
  }

  const poll = async () => {
    try {
      const count = await drainBotQueue(db)
      if (count > 0) onItemsAdded?.(count)
    } catch (err) {
      console.error('[telegram] Poll error:', err)
    }
  }

  void poll()
  const handle = setInterval(() => void poll(), intervalMs)
  return () => clearInterval(handle)
}
```

- [ ] **Step 3: Write real unit test**

Update `cortex/tests/unit/poller.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { drainBotQueue } from '../../src/main/telegram/poller'

// We can't test the real Supabase in unit tests.
// Instead, test that drainBotQueue returns 0 when env vars are absent
// (which they are in test environment).

describe('drainBotQueue', () => {
  it('returns 0 when SUPABASE_URL is not set', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY

    const db = new Database(':memory:')
    runMigrations(db)

    const count = await drainBotQueue(db)
    expect(count).toBe(0)

    db.close()
  })
})
```

Run: `npx vitest run tests/unit/poller.test.ts`
Expected: PASS

- [ ] **Step 4: Wire poller into index.ts**

In `cortex/src/main/index.ts`, import and start the poller:

```typescript
import { startTelegramPoller } from './telegram/poller'

// Add after startServer() call inside app.whenReady():
const stopPoller = startTelegramPoller(getDb(), (count) => {
  updateTrayCounts()
  console.log(`[telegram] ${count} new item(s) from Telegram`)
})

// Clean up on quit:
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  trayController?.destroy()
  stopPoller()
})
```

- [ ] **Step 5: Add @supabase/supabase-js to Cortex**

```bash
cd cortex
npm install @supabase/supabase-js
```

- [ ] **Step 6: Run all tests to verify nothing broke**

```bash
npx vitest run
```

Expected: All tests pass (original 17 + 1 new poller test = 18).

```bash
npx tsc --noEmit -p tsconfig.node.json
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/main/telegram/ src/main/index.ts tests/unit/poller.test.ts package.json package-lock.json
git commit -m "feat: telegram bot polling — drains supabase queue every 60s into inbox"
```

---

## Task 6: Environment Config

**Files:**
- Create: `cortex/.env.example`
- Modify: `cortex/src/main/index.ts` (ensure env is loaded before poller)

- [ ] **Step 1: Create .env.example**

```bash
# Telegram Bot Integration (Phase 2)
# Get these from https://supabase.com after creating a project
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- [ ] **Step 2: Document setup in README**

Add to `cortex/README.md` (or create if absent) under a "Telegram Bot" section:

```markdown
## Telegram Bot (Phase 2 — optional)

1. Create a Telegram bot via @BotFather → save token
2. Deploy `cortex-webhook/` to Railway
3. Register webhook: `curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<RAILWAY_URL>/webhook/<TOKEN>"`
4. Create a free Supabase project → run SQL from `cortex-webhook/schema.sql`
5. Add `.env` to cortex app:
   ```
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   ```
6. Restart Cortex. Items sent to your bot appear in Inbox within 60 seconds.
```

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: telegram bot setup instructions"
```

---

## Task 7: Manual End-to-End Test

- [ ] **Step 1: Full flow test**

1. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env` (loaded via `electron-vite` — add `dotenv` config if needed)
2. Start Cortex: `npm run dev`
3. Send a message to your bot: "Check out this article https://example.com"
4. Wait up to 60 seconds
5. Open Cortex → Inbox should show a new Link card: "Check out this article https://example.com"

- [ ] **Step 2: Command test**

Send `/today finish the cortex phase 2 plan` to bot.
Wait 60s → Cortex Today column shows the new item.

- [ ] **Step 3: Remind command test**

Send `/remind buy groceries tomorrow 6pm` to bot.
Wait 60s → Cortex Inbox shows item with `remind_at` set to tomorrow at 6pm.
Verify in Edit modal: "Remind me at" field shows the correct datetime.
