import initSqlJs from "sql.js"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { dirname } from "path"

export type SqlJsDbType = Awaited<ReturnType<typeof initSqlJs>> extends { Database: infer D } ? InstanceType<D & { new(...args: any[]): any }> : never

const DB_PATH = process.env.DATABASE_URL || "./server/db/autoforge.db"

let _sqlDb: SqlJsDbType | null = null

export async function getDb(): Promise<SqlJsDbType> {
  if (_sqlDb) return _sqlDb

  const SQL = await initSqlJs()
  const dir = dirname(DB_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH)
    _sqlDb = new SQL.Database(buffer) as unknown as SqlJsDbType
  } else {
    _sqlDb = new SQL.Database() as unknown as SqlJsDbType
  }

  _sqlDb.run("PRAGMA foreign_keys = ON")
  _sqlDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      team_count INTEGER NOT NULL DEFAULT 0,
      joined_team_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  _sqlDb.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      owner_id TEXT NOT NULL REFERENCES users(id),
      member_ids TEXT NOT NULL DEFAULT '[]',
      settings TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  _sqlDb.run(`
    CREATE TABLE IF NOT EXISTS scripts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      file_path TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      owner_id TEXT NOT NULL REFERENCES users(id),
      team_id TEXT REFERENCES teams(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  saveDb()

  // Migration: add avatar_url if not exists
  try { _sqlDb.run("ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''") } catch (e) {}

  // Migration: add category and language to scripts
  try { _sqlDb.run("ALTER TABLE scripts ADD COLUMN category TEXT NOT NULL DEFAULT ''") } catch (e) {}
  try { _sqlDb.run("ALTER TABLE scripts ADD COLUMN language TEXT NOT NULL DEFAULT ''") } catch (e) {}

  // Migration: add settings to teams
  try { _sqlDb.run("ALTER TABLE teams ADD COLUMN settings TEXT NOT NULL DEFAULT '{}'") } catch (e) {}

  return _sqlDb
}

export function saveDb() {
  if (_sqlDb) {
    const data = (_sqlDb as any).export() as Uint8Array
    writeFileSync(DB_PATH, Buffer.from(data))
  }
}
