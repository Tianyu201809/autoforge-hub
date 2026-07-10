import initSqlJs from "sql.js"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { resolve, dirname } from "path"
import { getDatabasePath, getEnv } from "../utils/env"

export type SqlJsDbType = Awaited<ReturnType<typeof initSqlJs>> extends { Database: infer D } ? InstanceType<D & { new(...args: any[]): any }> : never

const DB_PATH = getDatabasePath()

let _sqlDb: SqlJsDbType | null = null

export async function getDb(): Promise<SqlJsDbType> {
  if (_sqlDb) return _sqlDb

  // Provide locateFile to help sql.js find its WASM binary in both dev and production builds
  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      // Try multiple possible locations for the WASM file
      const candidates = [
        // Production build: .output/server/node_modules/sql.js/dist/
        resolve(process.cwd(), '.output/server/node_modules/sql.js/dist', file),
        // Development: root node_modules
        resolve(process.cwd(), 'node_modules/sql.js/dist', file),
        // Relative to this source file (dev mode via nuxi dev)
        resolve(process.cwd(), 'node_modules/sql.js/dist', file),
      ]
      for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate
      }
      // Fallback: return the first candidate (will error with a clear message)
      return candidates[0]
    },
  })
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
      icon TEXT NOT NULL DEFAULT 'file-archive',
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

  // Migration: add icon to scripts
  try { _sqlDb.run("ALTER TABLE scripts ADD COLUMN icon TEXT NOT NULL DEFAULT 'file-archive'") } catch (e) {}

  // Migration: add icon_color to scripts
  try { _sqlDb.run("ALTER TABLE scripts ADD COLUMN icon_color TEXT DEFAULT NULL") } catch (e) {}

  // audit_logs table
  _sqlDb.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL DEFAULT '',
      action_type TEXT NOT NULL,
      script_id TEXT,
      script_name TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    )
  `)
  saveDb()

  // download_logs table
  _sqlDb.run(`
    CREATE TABLE IF NOT EXISTS download_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      script_id TEXT NOT NULL,
      downloaded_at TEXT NOT NULL
    )
  `)
  saveDb()

  return _sqlDb
}

export function saveDb() {
  if (_sqlDb) {
    const data = (_sqlDb as any).export() as Uint8Array
    writeFileSync(DB_PATH, Buffer.from(data))
  }
}
