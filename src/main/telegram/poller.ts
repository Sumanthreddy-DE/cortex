import Database from 'better-sqlite3'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { PRIORITIES, type Priority } from '../../shared/constants'
import { getDomainTag } from '../../shared/domain-rules'
import { fetchAndUpdateLinkTitle } from '../api/link-fetch'
import { createItem } from '../api/items'

interface BotQueueRow {
  id: number
  chat_id: string
  message_text: string
  parsed_priority: string
  parsed_remind_at: number | null
  created_at: string
  processed_at: string | null
}

let supabaseClient: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    return null
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, key)
  }

  return supabaseClient
}

function isPriority(value: string): value is Priority {
  return PRIORITIES.includes(value as Priority)
}

function extractUrl(value: string): string | null {
  const match = value.match(/https?:\/\/\S+/i)
  return match?.[0] ?? null
}

export async function drainBotQueue(db: Database.Database): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) {
    return 0
  }

  const { data, error } = await supabase
    .from('bot_queue')
    .select('*')
    .is('processed_at', null)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[telegram] Supabase fetch error:', error.message)
    return 0
  }

  if (!data || data.length === 0) {
    return 0
  }

  let insertedCount = 0
  for (const row of data as BotQueueRow[]) {
    const url = extractUrl(row.message_text)
    const priority = isPriority(row.parsed_priority) ? row.parsed_priority : 'inbox'

    // Mark processed FIRST so re-polls on network failure don't duplicate
    const { error: markError } = await supabase
      .from('bot_queue')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('processed_at', null)

    if (markError) {
      console.error('[telegram] Failed to mark row processed, skipping to avoid duplicate:', row.id, markError.message)
      continue
    }

    try {
      const domainTag = url ? getDomainTag(url) : null
      const autoTags = domainTag ? [domainTag] : []
      const created = createItem(db, {
        id: nanoid(),
        type: url ? 'link' : 'idea',
        title: row.message_text,
        url,
        note: null,
        priority,
        tags: autoTags,
        favicon_url: null,
        remind_at: row.parsed_remind_at ?? null
      })

      if (url) {
        void fetchAndUpdateLinkTitle(db, created.id, url)
      }
      insertedCount += 1
    } catch (insertError) {
      console.error('[telegram] Failed to insert queue row into SQLite:', row.id, insertError)
    }
  }

  if (insertedCount > 0) {
    console.log(`[telegram] Drained ${insertedCount} item(s) from bot queue`)
  }

  return insertedCount
}

export function startTelegramPoller(
  db: Database.Database,
  onItemsAdded?: (count: number) => void,
  intervalMs = 60_000
): () => void {
  if (!getSupabase()) {
    console.log('[telegram] SUPABASE_URL/SUPABASE_ANON_KEY not set - telegram polling disabled')
    return () => {}
  }

  const poll = async () => {
    try {
      const count = await drainBotQueue(db)
      if (count > 0) {
        onItemsAdded?.(count)
      }
    } catch (error) {
      console.error('[telegram] Poll error:', error)
    }
  }

  void poll()
  const intervalId = setInterval(() => {
    void poll()
  }, intervalMs)

  return () => clearInterval(intervalId)
}
