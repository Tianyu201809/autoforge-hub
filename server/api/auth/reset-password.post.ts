import bcrypt from 'bcryptjs'
import { getDb, saveDb } from '../../db/index'
import { signToken } from '../../utils/jwt'
import {
  RESET_MAX_ATTEMPTS,
  verifyResetCode,
} from '../../utils/password-reset'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = body?.email?.trim().toLowerCase()
  const code = String(body?.code ?? '').trim()
  const newPassword = String(body?.newPassword ?? '')

  if (!email || !code || !newPassword) {
    throw createError({ statusCode: 400, message: '请填写邮箱、验证码和新密码' })
  }
  if (newPassword.length < 8) {
    throw createError({ statusCode: 400, message: '密码至少需要 8 位' })
  }

  const db = await getDb()
  const codeStmt = db.prepare(
    'SELECT * FROM password_reset_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1'
  )
  codeStmt.bind([email])
  if (!codeStmt.step()) {
    codeStmt.free()
    throw createError({ statusCode: 400, message: '验证码无效或已过期' })
  }
  const codeRow = codeStmt.getAsObject() as any
  codeStmt.free()

  if (Date.parse(codeRow.expires_at) < Date.now()) {
    db.run('DELETE FROM password_reset_codes WHERE id = ?', [codeRow.id])
    saveDb()
    throw createError({ statusCode: 400, message: '验证码无效或已过期' })
  }

  if (Number(codeRow.attempts) >= RESET_MAX_ATTEMPTS) {
    db.run('DELETE FROM password_reset_codes WHERE id = ?', [codeRow.id])
    saveDb()
    throw createError({ statusCode: 400, message: '尝试次数过多，请重新获取' })
  }

  if (!verifyResetCode(code, codeRow.code_hash)) {
    const nextAttempts = Number(codeRow.attempts) + 1
    if (nextAttempts >= RESET_MAX_ATTEMPTS) {
      db.run('DELETE FROM password_reset_codes WHERE id = ?', [codeRow.id])
    } else {
      db.run('UPDATE password_reset_codes SET attempts = ? WHERE id = ?', [nextAttempts, codeRow.id])
    }
    saveDb()
    throw createError({ statusCode: 400, message: '验证码错误' })
  }

  const userStmt = db.prepare('SELECT * FROM users WHERE email = ?')
  userStmt.bind([email])
  if (!userStmt.step()) {
    userStmt.free()
    throw createError({ statusCode: 400, message: '验证码无效或已过期' })
  }
  const user = userStmt.getAsObject() as any
  userStmt.free()

  const passwordHash = await bcrypt.hash(newPassword, 10)
  const now = new Date().toISOString()
  const nextTv = Number(user.token_version ?? 0) + 1

  db.run(
    'UPDATE users SET password_hash = ?, token_version = ?, updated_at = ? WHERE id = ?',
    [passwordHash, nextTv, now, user.id]
  )
  db.run('DELETE FROM password_reset_codes WHERE email = ?', [email])
  saveDb()

  const token = signToken({ userId: user.id, email, tv: nextTv })
  return {
    ok: true,
    user: {
      id: user.id,
      email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url || '',
      teamCount: user.team_count,
      joinedTeamIds: JSON.parse(user.joined_team_ids || '[]'),
    },
    token,
  }
})
