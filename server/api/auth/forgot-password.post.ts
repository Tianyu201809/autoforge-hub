import { randomUUID } from 'crypto'
import { getDb, saveDb } from '../../db/index'
import { sendPasswordResetCode } from '../../utils/email'
import {
  RESET_CODE_TTL_MS,
  RESET_RESEND_COOLDOWN_MS,
  generateResetCode,
  hashResetCode,
} from '../../utils/password-reset'

const SUCCESS_MESSAGE = '若该邮箱已注册，将收到验证码'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = body?.email?.trim().toLowerCase()
  if (!email) throw createError({ statusCode: 400, message: '请填写邮箱' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, message: '邮箱格式不正确' })
  }

  const db = await getDb()
  const userStmt = db.prepare('SELECT id FROM users WHERE email = ?')
  userStmt.bind([email])
  const userExists = userStmt.step()
  userStmt.free()

  if (!userExists) {
    return { ok: true, message: SUCCESS_MESSAGE }
  }

  const latestStmt = db.prepare(
    'SELECT created_at FROM password_reset_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1'
  )
  latestStmt.bind([email])
  if (latestStmt.step()) {
    const latest = latestStmt.getAsObject() as { created_at: string }
    const createdMs = Date.parse(latest.created_at)
    if (!Number.isNaN(createdMs) && Date.now() - createdMs < RESET_RESEND_COOLDOWN_MS) {
      latestStmt.free()
      throw createError({ statusCode: 429, message: '请稍后再试' })
    }
  }
  latestStmt.free()

  const code = generateResetCode()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + RESET_CODE_TTL_MS).toISOString()
  const createdAt = now.toISOString()

  db.run('DELETE FROM password_reset_codes WHERE email = ?', [email])
  db.run(
    'INSERT INTO password_reset_codes (id, email, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, ?, 0, ?)',
    [randomUUID(), email, hashResetCode(code), expiresAt, createdAt]
  )
  saveDb()

  try {
    await sendPasswordResetCode(email, code)
  } catch (err: any) {
    db.run('DELETE FROM password_reset_codes WHERE email = ?', [email])
    saveDb()
    if (err?.statusCode) throw err
    console.error('[forgot-password] send failed:', err)
    throw createError({ statusCode: 502, message: '发送失败，请稍后重试' })
  }

  return { ok: true, message: SUCCESS_MESSAGE }
})
