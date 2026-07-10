import { getDb } from "../db/index"

const DAILY_LIMIT = 50

// In-memory quota cache
// Key: `${userId}:${YYYY-MM-DD}`
// Value: today's download count
const quotaCache = new Map<string, number>()

function getTodayDateStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Check if the user has remaining download quota for today.
 * Returns ok:true if quota is available, or ok:false with usage info if exceeded.
 */
export async function checkDownloadQuota(
  userId: string
): Promise<{ ok: true } | { ok: false; used: number; limit: number }> {
  const key = `${userId}:${getTodayDateStr()}`

  let count = quotaCache.get(key)
  if (count === undefined) {
    // Cache miss — query DB
    const db = await getDb()
    const today = getTodayDateStr()
    const stmt = db.prepare(
      "SELECT COUNT(*) AS cnt FROM download_logs WHERE user_id = ? AND downloaded_at >= ?"
    )
    stmt.bind([userId, today])
    if (stmt.step()) {
      count = (stmt.getAsObject() as any).cnt as number
    } else {
      count = 0
    }
    stmt.free()
    quotaCache.set(key, count)
  }

  if (count >= DAILY_LIMIT) {
    return { ok: false, used: count, limit: DAILY_LIMIT }
  }

  return { ok: true }
}

/**
 * Record a successful download and update the quota cache.
 */
export async function incrementDownloadQuota(
  userId: string,
  scriptId: string
): Promise<number> {
  const key = `${userId}:${getTodayDateStr()}`
  const db = await getDb()
  db.run(
    "INSERT INTO download_logs (id, user_id, script_id, downloaded_at) VALUES (?, ?, ?, ?)",
    [crypto.randomUUID(), userId, scriptId, new Date().toISOString()]
  )
  const current = (quotaCache.get(key) ?? 0) + 1
  quotaCache.set(key, current)
  return DAILY_LIMIT - current // remaining
}
