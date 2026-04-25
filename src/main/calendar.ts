import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { Priority } from '../shared/constants'

const execFileAsync = promisify(execFile)

export interface AddToCalendarOptions {
  title: string
  priority: Priority
  date?: string
}

export interface AddToCalendarResult {
  ok: boolean
  error?: string
}

export function inferCalendarDate(priority: Priority, now = new Date()): string {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const offsets: Record<Priority, number> = {
    inbox: 0,
    'for-now': 0,
    today: 0,
    tomorrow: 1,
    'this-week': 3,
    someday: 7
  }

  base.setDate(base.getDate() + offsets[priority])
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
}

export async function addToCalendar(options: AddToCalendarOptions): Promise<AddToCalendarResult> {
  const title = options.title.trim().replace(/["']/g, '')
  const date = options.date ?? inferCalendarDate(options.priority)

  if (!title) {
    return { ok: false, error: 'Add a title before sending this to calendar.' }
  }

  try {
    await execFileAsync('gws', ['calendar', 'insert', '--title', title, '--date', date], {
      timeout: 10_000
    })
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('ENOENT') || message.includes('not found')) {
      return { ok: false, error: 'gws CLI not found. Install it and run: gws auth login' }
    }
    if (message.toLowerCase().includes('auth') || message.includes('401') || message.includes('403')) {
      return { ok: false, error: 'gws is not authenticated. Run: gws auth login' }
    }
    return { ok: false, error: message }
  }
}
