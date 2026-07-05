import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'

const STORAGE_DIR = join(process.cwd(), 'server', 'storage')

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export function initStorage() {
  ensureDir(STORAGE_DIR)
}

export function saveFile(filename: string, buffer: Uint8Array): string {
  ensureDir(STORAGE_DIR)
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`
  const filePath = join(STORAGE_DIR, unique)
  writeFileSync(filePath, Buffer.from(buffer))
  return unique
}

export function getFilePath(storedName: string): string {
  return join(STORAGE_DIR, storedName)
}

export function deleteFile(storedName: string) {
  const filePath = join(STORAGE_DIR, storedName)
  if (existsSync(filePath)) unlinkSync(filePath)
}

export function readFile(storedName: string): Buffer | null {
  const filePath = join(STORAGE_DIR, storedName)
  if (!existsSync(filePath)) return null
  return readFileSync(filePath)
}
