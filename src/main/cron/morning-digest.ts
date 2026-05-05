import Database from 'better-sqlite3'
import { spawnSync } from 'node:child_process'
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

export function getTodayItems(db: Database.Database): Array<{ title: string; tags: string }> {
  return db
    .prepare(`
      SELECT title, tags
      FROM items
      WHERE (priority = 'today' OR priority = 'for-now')
        AND archived = 0
        AND completed_at IS NULL
      ORDER BY created_at ASC
    `)
    .all() as Array<{ title: string; tags: string }>
}

export function fireMorningDigest(db: Database.Database, now = new Date()): void {
  const { todayCount } = getDigestCounts(db)
  const todayItems = getTodayItems(db)

  let body = 'Nothing on your plate today. Add something.'
  if (todayCount > 0) {
    body = `${todayCount} item${todayCount === 1 ? '' : 's'} due today`
  }

  if (process.platform === 'win32') {
    new Notification({
      title: `Good morning - ${APP_NAME}`,
      body
    }).show()
  }

  const today = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  let emailBody: string
  if (todayItems.length === 0) {
    emailBody = `Good morning!\n\nNothing on your plate today. Add something to Cortex.\n\n- Cortex`
  } else {
    const taskLines = todayItems.map((item) => {
      const tags = (() => {
        try {
          const parsed = JSON.parse(item.tags) as string[]
          return parsed.length > 0 ? ` [${parsed.join(', ')}]` : ''
        } catch {
          return ''
        }
      })()
      return `• ${item.title}${tags}`
    }).join('\n')
    emailBody = `Good morning!\n\nYour tasks for ${today}:\n\n${taskLines}\n\n${todayItems.length} task${todayItems.length === 1 ? '' : 's'} total.\n\n- Cortex`
  }

  const subject = `Cortex - Today's tasks (${today})`

  try {
    spawnSync(
      'gws',
      [
        'gmail',
        '+send',
        '--to',
        'sumanthreddy.settipalli@fau.de',
        '--subject',
        subject,
        '--body',
        emailBody
      ],
      { timeout: 15_000, stdio: 'ignore' }
    )
  } catch {
    // Email send failed silently - don't crash the app
  }

  recordDigestFired(db, now)
}
