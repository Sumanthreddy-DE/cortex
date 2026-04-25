import 'dotenv/config'
import express from 'express'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(express.json())

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const PORT = Number(process.env.PORT ?? 3000)

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    : null

export function parseRemindAt(dayWord, timeStr) {
  const now = new Date()
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (dayWord === 'tomorrow') {
    base.setDate(base.getDate() + 1)
  }

  const timeMatch = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!timeMatch) {
    base.setHours(9, 0, 0, 0)
    return base.getTime()
  }

  let hours = Number.parseInt(timeMatch[1], 10)
  const minutes = timeMatch[2] ? Number.parseInt(timeMatch[2], 10) : 0
  const meridiem = timeMatch[3]?.toLowerCase()

  if (meridiem === 'pm' && hours < 12) {
    hours += 12
  }
  if (meridiem === 'am' && hours === 12) {
    hours = 0
  }

  base.setHours(hours, minutes, 0, 0)
  return base.getTime()
}

export function parseMessage(text) {
  const trimmed = text.trim()

  const todayMatch = trimmed.match(/^\/today\s+(.+)$/i)
  if (todayMatch) {
    return { messageText: todayMatch[1].trim(), parsedPriority: 'today', parsedRemindAt: null }
  }

  const tomorrowMatch = trimmed.match(/^\/tomorrow\s+(.+)$/i)
  if (tomorrowMatch) {
    return { messageText: tomorrowMatch[1].trim(), parsedPriority: 'tomorrow', parsedRemindAt: null }
  }

  const nowMatch = trimmed.match(/^\/now\s+(.+)$/i)
  if (nowMatch) {
    return { messageText: nowMatch[1].trim(), parsedPriority: 'for-now', parsedRemindAt: null }
  }

  const remindMatch = trimmed.match(
    /^\/remind\s+(.+?)\s+(tomorrow|today)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*$/i
  )
  if (remindMatch) {
    return {
      messageText: remindMatch[1].trim(),
      parsedPriority: 'inbox',
      parsedRemindAt: parseRemindAt(remindMatch[2].toLowerCase(), remindMatch[3].trim())
    }
  }

  return { messageText: trimmed, parsedPriority: 'inbox', parsedRemindAt: null }
}

app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  try {
    const { message } = req.body ?? {}
    if (!message?.text || !supabase) {
      res.sendStatus(200)
      return
    }

    if (message.text === '/start' || message.text === '/help') {
      res.sendStatus(200)
      return
    }

    const parsed = parseMessage(message.text)
    const { error } = await supabase.from('bot_queue').insert({
      chat_id: String(message.chat.id),
      message_text: parsed.messageText,
      parsed_priority: parsed.parsedPriority,
      parsed_remind_at: parsed.parsedRemindAt
    })

    if (error) {
      console.error('Supabase insert error:', error)
      res.sendStatus(500)
      return
    }

    res.sendStatus(200)
  } catch (error) {
    console.error('Webhook error:', error)
    res.sendStatus(500)
  }
})

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Cortex webhook server listening on :${PORT}`)
})
