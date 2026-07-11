import { createHash, randomInt, timingSafeEqual } from 'crypto'
import { getJwtSecret } from './jwt'

export const RESET_CODE_TTL_MS = 10 * 60 * 1000
export const RESET_RESEND_COOLDOWN_MS = 60 * 1000
export const RESET_MAX_ATTEMPTS = 5

export function generateResetCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashResetCode(code: string): string {
  return createHash('sha256').update(code + getJwtSecret()).digest('hex')
}

export function verifyResetCode(code: string, codeHash: string): boolean {
  const digest = hashResetCode(code)
  const a = Buffer.from(digest, 'hex')
  const b = Buffer.from(codeHash, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
