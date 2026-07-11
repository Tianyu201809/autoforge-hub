import bcrypt from 'bcryptjs'
import { getDb, saveDb } from '../../db/index'
import { signToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.user) throw createError({ statusCode: 401, message: '未登录，请先登录' })

  const body = await readBody(event)
  const oldPassword = body?.oldPassword
  const newPassword = String(body?.newPassword ?? '')

  if (!oldPassword || !newPassword) {
    throw createError({ statusCode: 400, message: '请填写旧密码和新密码' })
  }
  if (newPassword.length < 8) {
    throw createError({ statusCode: 400, message: '密码至少需要 8 位' })
  }
  if (oldPassword === newPassword) {
    throw createError({ statusCode: 400, message: '新密码不能与旧密码相同' })
  }

  const db = await getDb()
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
  stmt.bind([auth.user.userId])
  if (!stmt.step()) {
    stmt.free()
    throw createError({ statusCode: 401, message: '登录已过期，请重新登录' })
  }
  const user = stmt.getAsObject() as any
  stmt.free()

  const valid = await bcrypt.compare(oldPassword, user.password_hash)
  if (!valid) throw createError({ statusCode: 400, message: '旧密码不正确' })

  const passwordHash = await bcrypt.hash(newPassword, 10)
  const now = new Date().toISOString()
  const nextTv = Number(user.token_version ?? 0) + 1

  db.run(
    'UPDATE users SET password_hash = ?, token_version = ?, updated_at = ? WHERE id = ?',
    [passwordHash, nextTv, now, user.id]
  )
  db.run('DELETE FROM password_reset_codes WHERE email = ?', [user.email])
  saveDb()

  const token = signToken({ userId: user.id, email: user.email, tv: nextTv })
  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url || '',
      teamCount: user.team_count,
      joinedTeamIds: JSON.parse(user.joined_team_ids || '[]'),
    },
    token,
  }
})
