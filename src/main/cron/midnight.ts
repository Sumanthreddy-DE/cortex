import Database from 'better-sqlite3'
import { Notification } from 'electron'
import { APP_NAME } from '../../shared/constants'

const IDEMPOTENCY_WINDOW_MS = 20 * 60 * 60 * 1000

export type MidnightResult =
  | { action: 'skipped'; count: 0 }
  | { action: 'promoted-tomorrow'; count: number }
  | { action: 'surfaced-this-week'; count: number }
  | { action: 'today-warning'; count: number }
  | { action: 'clean-slate'; count: 0 }

export function runMidnightPromotion(db: Database.Database): MidnightResult {
  const metaRow = db
    .prepare(`SELECT value FROM meta WHERE key = 'last_midnight_run'`)
    .get() as { value: string } | undefined

  if (metaRow) {
    const lastRun = Number.parseInt(metaRow.value, 10)
    if (!Number.isNaN(lastRun) && Date.now() - lastRun < IDEMPOTENCY_WINDOW_MS) {
      return { action: 'skipped', count: 0 }
    }
  }

  const now = Date.now()
  const result = db.transaction((): MidnightResult => {
    const tomorrowItems = db
      .prepare(`SELECT id FROM items WHERE priority = 'tomorrow' AND archived = 0`)
      .all() as Array<{ id: string }>

    if (tomorrowItems.length > 0) {
      db.prepare(`
        UPDATE items
        SET priority = 'today', updated_at = ?
        WHERE priority = 'tomorrow' AND archived = 0
      `).run(now)
      return { action: 'promoted-tomorrow', count: tomorrowItems.length }
    }

    const thisWeekItems = db
      .prepare(`
        SELECT id
        FROM items
        WHERE priority = 'this-week' AND archived = 0
        ORDER BY created_at ASC
        LIMIT 2
      `)
      .all() as Array<{ id: string }>

    if (thisWeekItems.length > 0) {
      const placeholders = thisWeekItems.map(() => '?').join(', ')
      db.prepare(`
        UPDATE items
        SET priority = 'today', updated_at = ?
        WHERE id IN (${placeholders})
      `).run(now, ...thisWeekItems.map((item) => item.id))
      return { action: 'surfaced-this-week', count: thisWeekItems.length }
    }

    const todayCount = (
      db.prepare(`SELECT COUNT(*) AS count FROM items WHERE priority = 'today' AND archived = 0`).get() as {
        count: number
      }
    ).count

    if (todayCount > 0) {
      return { action: 'today-warning', count: todayCount }
    }

    return { action: 'clean-slate', count: 0 }
  })()

  db.prepare(`UPDATE meta SET value = ? WHERE key = 'last_midnight_run'`).run(String(now))
  return result
}

export function notifyMidnight(result: MidnightResult): void {
  if (process.platform !== 'win32' || result.action === 'skipped') {
    return
  }

  const messages: Record<Exclude<MidnightResult['action'], 'skipped'>, string> = {
    'promoted-tomorrow': `${result.count} item${result.count === 1 ? '' : 's'} moved to Today`,
    'surfaced-this-week': `Nothing due tomorrow - pulled ${result.count} from This Week`,
    'today-warning': `Still ${result.count} thing${result.count === 1 ? '' : 's'} from today - clear them first`,
    'clean-slate': 'Clean slate. Add something to Cortex.'
  }

  new Notification({
    title: APP_NAME,
    body: messages[result.action]
  }).show()
}
