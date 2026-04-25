import Database from 'better-sqlite3'
import { Notification } from 'electron'
import { APP_NAME } from '../../shared/constants'

export function checkReminders(db: Database.Database): void {
  const now = Date.now()
  const due = db
    .prepare(`
      SELECT id, title
      FROM items
      WHERE archived = 0
        AND remind_at IS NOT NULL
        AND remind_at <= ?
    `)
    .all(now) as Array<{ id: string; title: string }>

  for (const item of due) {
    if (process.platform === 'win32') {
      new Notification({
        title: `${APP_NAME} Reminder`,
        body: item.title
      }).show()
    }

    db.prepare(`
      UPDATE items
      SET remind_at = NULL, updated_at = ?
      WHERE id = ?
    `).run(now, item.id)
  }
}
