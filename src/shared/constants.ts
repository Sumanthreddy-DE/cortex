export const APP_NAME = 'Cortex'
export const API_PORT = 51204
export const API_BASE = `http://127.0.0.1:${API_PORT}`
export const DB_FILENAME = 'cortex.db'
export const REMINDER_CHECK_CRON = '* * * * *'
export const MIDNIGHT_CRON = '0 0 * * *'
export const DEFAULT_MORNING_DIGEST_TIME = '08:00'

export const PRIORITIES = [
  'inbox',
  'for-now',
  'today',
  'tomorrow',
  'this-week',
  'someday'
] as const

export const PRIORITY_LABELS: Record<(typeof PRIORITIES)[number], string> = {
  inbox: 'Inbox',
  'for-now': 'For Now',
  today: 'Today',
  tomorrow: 'Tomorrow',
  'this-week': 'This Week',
  someday: 'Someday'
}

export const PRIORITY_COLORS: Record<(typeof PRIORITIES)[number], string> = {
  inbox: '#6b7280',
  'for-now': '#ef4444',
  today: '#f97316',
  tomorrow: '#6366f1',
  'this-week': '#38bdf8',
  someday: '#475569'
}

export type Priority = (typeof PRIORITIES)[number]
export type View = 'priority' | 'category' | 'archive' | 'settings'
