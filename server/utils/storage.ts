import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from "fs"
import { join } from "path"
import { isOssConfigured, ossUpload, ossDelete, ossGetUrl, ossRead } from "./oss"
import { getStorageEnvDir } from "./env"

const ENV_DIR = getStorageEnvDir()
const STORAGE_DIR = join(process.cwd(), "server", "storage", ENV_DIR)
let warned = false

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function logFallback() {
  if (!warned) {
    warned = true
    console.warn(
      "[storage] OSS not configured. Files will be stored locally as fallback. Set NUXT_OSS_ACCESS_KEY_ID, NUXT_OSS_ACCESS_KEY_SECRET, NUXT_OSS_BUCKET env vars for OSS storage."
    )
  }
}

export function initStorage() {
  ensureDir(STORAGE_DIR)
}

export async function saveFile(filename: string, buffer: Uint8Array, folder?: string): Promise<string> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`
  const key = folder ? `${folder}/${unique}` : unique
  if (isOssConfigured()) {
    await ossUpload(key, Buffer.from(buffer))
    return key
  }
  logFallback()
  const fullDir = folder ? join(STORAGE_DIR, folder) : STORAGE_DIR
  ensureDir(fullDir)
  writeFileSync(join(fullDir, unique), Buffer.from(buffer))
  return key
}

export function getFilePath(storedName: string): string {
  if (isOssConfigured()) {
    return ossGetUrl(storedName)
  }
  logFallback()
  return join(STORAGE_DIR, storedName)
}

export function getFileUrl(storedName: string): string {
  return getFilePath(storedName)
}

export async function deleteFile(storedName: string): Promise<void> {
  if (isOssConfigured()) {
    await ossDelete(storedName)
    return
  }
  logFallback()
  const filePath = join(STORAGE_DIR, storedName)
  if (existsSync(filePath)) unlinkSync(filePath)
}

export async function readFile(storedName: string): Promise<Buffer | null> {
  if (isOssConfigured()) {
    return await ossRead(storedName)
  }
  logFallback()
  const filePath = join(STORAGE_DIR, storedName)
  if (!existsSync(filePath)) return null
  return readFileSync(filePath)
}
