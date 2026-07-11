export const INSTALL_TOKEN_TTL_MS = 120_000

interface InstallTokenEntry {
  scriptId: string
  userId: string
  expiresAt: number
}

const store = new Map<string, InstallTokenEntry>()

const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupExpired() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [token, entry] of store) {
    if (entry.expiresAt < now) store.delete(token)
  }
}

export function createInstallToken(
  scriptId: string,
  userId: string
): { token: string; expiresIn: number } {
  cleanupExpired()
  const token = crypto.randomUUID()
  store.set(token, {
    scriptId,
    userId,
    expiresAt: Date.now() + INSTALL_TOKEN_TTL_MS,
  })
  return { token, expiresIn: Math.floor(INSTALL_TOKEN_TTL_MS / 1000) }
}

/**
 * One-shot consume. Deletes the token whether valid or not once looked up.
 * Returns null if missing, expired, or scriptId mismatch.
 */
export function consumeInstallToken(
  token: string,
  scriptId: string
): { userId: string } | null {
  cleanupExpired()
  const entry = store.get(token)
  if (!entry) return null
  store.delete(token)
  if (entry.expiresAt < Date.now()) return null
  if (entry.scriptId !== scriptId) return null
  return { userId: entry.userId }
}
