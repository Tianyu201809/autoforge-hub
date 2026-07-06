import { createError } from "h3"

// In-memory captcha store
// Token -> { position: number (0-100), expiresAt: number }
const captchaStore = new Map<string, { position: number; expiresAt: number }>()

// Periodic cleanup every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupExpired() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [token, entry] of captchaStore) {
    if (entry.expiresAt < now) captchaStore.delete(token)
  }
}

export function generateCaptcha(): { token: string; position: number } {
  cleanupExpired()
  const token = crypto.randomUUID()
  // Random position between 20% and 80% of the slider track
  const position = Math.floor(Math.random() * 61) + 20
  captchaStore.set(token, {
    position,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
  })
  return { token, position }
}

export function verifyCaptchaToken(
  token: string,
  submittedPosition: number,
  tolerance = 5
): { ok: boolean; reason?: string } {
  const entry = captchaStore.get(token)
  if (!entry) return { ok: false, reason: "invalid_or_expired" }
  // One-time use: delete regardless of outcome
  captchaStore.delete(token)
  if (entry.expiresAt < Date.now()) return { ok: false, reason: "expired" }
  const diff = Math.abs(submittedPosition - entry.position)
  if (diff > tolerance) return { ok: false, reason: "position_mismatch" }
  return { ok: true }
}

export default defineEventHandler(async () => {
  const { token, position } = generateCaptcha()
  return { ok: true, token, position }
})
