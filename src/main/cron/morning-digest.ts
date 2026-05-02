import Database from 'better-sqlite3'
import { Notification } from 'electron'
import { APP_NAME, DEFAULT_MORNING_DIGEST_TIME } from '../../shared/constants'

function toLocalDateString(date: Date): string {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function shouldFireDigest(db: Database.Database, now = new Date()): boolean {
  const configuredTime = (
    db.prepare(`SELECT value FROM meta WHERE key = 'morning_digest_time'`).get() as
      | { value: string }
      | undefined
  )?.value ?? DEFAULT_MORNING_DIGEST_TIME

  if (toHHMM(now) !== configuredTime) {
    return false
  }

  const lastDigestDate = (
    db.prepare(`SELECT value FROM meta WHERE key = 'last_digest_date'`).get() as
      | { value: string }
      | undefined
  )?.value ?? ''

  return lastDigestDate !== toLocalDateString(now)
}

export function recordDigestFired(db: Database.Database, now = new Date()): void {
  db.prepare(`UPDATE meta SET value = ? WHERE key = 'last_digest_date'`).run(toLocalDateString(now))
}

export function getDigestCounts(db: Database.Database): { todayCount: number } {
  const todayCount = (
    db.prepare(`SELECT COUNT(*) AS count FROM items WHERE priority = 'today' AND archived = 0`).get() as {
      count: number
    }
  ).count

  return { todayCount }
}

export function fireMorningDigest(db: Database.Database, now = new Date()): void {
  if (process.platform !== 'win32') {
    recordDigestFired(db, now)
    return
  }

  const { todayCount } = getDigestCounts(db)

  let body = 'Nothing on your plate today. Add something.'
  if (todayCount > 0) {
    body = `${todayCount} item${todayCount === 1 ? '' : 's'} due today`
  }

  new Notification({
    title: `Good morning - ${APP_NAME}`,
    body
  }).show()

  recordDigestFired(db, now)
}
