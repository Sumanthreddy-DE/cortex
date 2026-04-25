import { join } from 'node:path'
import Database from 'better-sqlite3'
import { app } from 'electron'
import { DB_FILENAME } from '../../shared/constants'
import { runMigrations } from './migrations'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) {
    return db
  }

  const dbPath = join(app.getPath('userData'), DB_FILENAME)
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  return db
}
