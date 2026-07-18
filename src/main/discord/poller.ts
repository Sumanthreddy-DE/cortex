import Database from 'better-sqlite3'
import { nanoid } from 'nanoid'
import { type Priority } from '../../shared/constants'
import { getDomainTag } from '../../shared/domain-rules'
import { fetchAndUpdateLinkTitle } from '../api/link-fetch'
import { createItem } from '../api/items'

const DISCORD_API = 'https://discord.com/api/v10'
const WATERMARK_KEY = 'discord_last_message_id'

interface DiscordAuthor {
  id: string
  bot?: boolean
}

interface DiscordMessage {
  id: string
  content: string
  author: DiscordAuthor
  attachments: Array<{ url: string; filename: string }>
}

const PRIORITY_TOKENS: Record<string, Priority> = {
  inbox: 'inbox',
  now: 'for-now',
  today: 'today',
  tomorrow: 'tomorrow',
  week: 'this-week',
  'this-week': 'this-week',
  someday: 'someday'
}

export interface ParsedMessage {
  title: string
  url: string | null
  priority: Priority
}

export function parseCaptureMessage(content: string): ParsedMessage {
  let priority: Priority = 'inbox'
  const title = content
    .replace(/(?:^|\s)!([a-z-]+)\b/gi, (match, token: string) => {
      const mapped = PRIORITY_TOKENS[token.toLowerCase()]
      if (mapped) {
        priority = mapped
        return ''
      }
      return match
    })
    .trim()

  const url = title.match(/https?:\/\/\S+/i)?.[0] ?? null
  return { title, url, priority }
}

function getWatermark(db: Database.Database): string | null {
  const row = db.prepare(`SELECT value FROM meta WHERE key = ?`).get(WATERMARK_KEY) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

function setWatermark(db: Database.Database, messageId: string): void {
  db.prepare(`INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)`).run(WATERMARK_KEY, messageId)
}

async function fetchMessages(
  token: string,
  channelId: string,
  query: string
): Promise<DiscordMessage[] | null> {
  const response = await fetch(`${DISCORD_API}/channels/${channelId}/messages?${query}`, {
    headers: { Authorization: `Bot ${token}` }
  })

  if (!response.ok) {
    console.error(`[discord] API error ${response.status}: ${await response.text()}`)
    return null
  }

  return (await response.json()) as DiscordMessage[]
}

export async function drainDiscordChannel(db: Database.Database): Promise<number> {
  const token = process.env.DISCORD_BOT_TOKEN
  const channelId = process.env.DISCORD_CHANNEL_ID

  if (!token || !channelId) {
    return 0
  }

  const watermark = getWatermark(db)

  // First run: set watermark to the newest message without ingesting history,
  // so enabling the poller doesn't flood the inbox with old chatter.
  if (!watermark) {
    const latest = await fetchMessages(token, channelId, 'limit=1')
    if (latest === null) {
      return 0
    }
    setWatermark(db, latest[0]?.id ?? '0')
    console.log('[discord] Watermark initialized - capturing messages from now on')
    return 0
  }

  const messages = await fetchMessages(token, channelId, `after=${watermark}&limit=100`)
  if (messages === null || messages.length === 0) {
    return 0
  }

  // Discord returns newest first; process oldest first so the watermark
  // advances in order (snowflake ids are numeric strings, compare as BigInt)
  const ascending = [...messages].sort((left, right) =>
    BigInt(left.id) < BigInt(right.id) ? -1 : 1
  )

  let insertedCount = 0
  for (const message of ascending) {
    // Advance watermark FIRST so a failing row is skipped, never duplicated
    setWatermark(db, message.id)

    if (message.author.bot) {
      continue
    }

    const attachmentUrl = message.attachments[0]?.url ?? null
    const rawText = message.content.trim() || message.attachments[0]?.filename || ''
    if (!rawText && !attachmentUrl) {
      continue
    }

    const parsed = parseCaptureMessage(rawText)
    const url = parsed.url ?? attachmentUrl

    try {
      const domainTag = url ? getDomainTag(url) : null
      const created = createItem(db, {
        id: nanoid(),
        type: url ? 'link' : 'idea',
        title: parsed.title || url || 'Untitled capture',
        url,
        note: null,
        priority: parsed.priority,
        tags: domainTag ? [domainTag] : [],
        favicon_url: null,
        remind_at: null
      })

      if (url) {
        void fetchAndUpdateLinkTitle(db, created.id, url)
      }
      insertedCount += 1
    } catch (insertError) {
      console.error('[discord] Failed to insert message into SQLite:', message.id, insertError)
    }
  }

  if (insertedCount > 0) {
    console.log(`[discord] Captured ${insertedCount} item(s) from Discord`)
  }

  return insertedCount
}

export function startDiscordPoller(
  db: Database.Database,
  onItemsAdded?: (count: number) => void,
  intervalMs = 60_000
): () => void {
  if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_CHANNEL_ID) {
    console.log('[discord] DISCORD_BOT_TOKEN/DISCORD_CHANNEL_ID not set - discord polling disabled')
    return () => {}
  }

  const poll = async () => {
    try {
      const count = await drainDiscordChannel(db)
      if (count > 0) {
        onItemsAdded?.(count)
      }
    } catch (error) {
      console.error('[discord] Poll error:', error)
    }
  }

  void poll()
  const intervalId = setInterval(() => {
    void poll()
  }, intervalMs)

  return () => clearInterval(intervalId)
}
