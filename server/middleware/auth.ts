import { verifyToken, type JwtPayload } from '../utils/jwt'
import { getDb } from '../db/index'

export interface AuthenticatedEvent {
  user: JwtPayload
}

export default defineEventHandler(async (event) => {
  const url = event.path
  if (!url.startsWith('/api/')) return
  if (
    url === '/api/auth/login' ||
    url === '/api/auth/register' ||
    url === '/api/auth/captcha/generate' ||
    url === '/api/auth/captcha/verify' ||
    url === '/api/auth/forgot-password' ||
    url === '/api/auth/reset-password' ||
    url.startsWith('/api/files/avatars/') ||
    url.startsWith('/api/_nuxt_icon')
  ) return

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: '未登录，请先登录' })
  }

  const token = authHeader.slice(7)
  const payload = verifyToken(token)
  if (!payload) {
    throw createError({ statusCode: 401, message: '登录已过期，请重新登录' })
  }

  const db = await getDb()
  const stmt = db.prepare('SELECT token_version FROM users WHERE id = ?')
  stmt.bind([payload.userId])
  const found = stmt.step()
  if (!found) {
    stmt.free()
    throw createError({ statusCode: 401, message: '登录已过期，请重新登录' })
  }
  const row = stmt.getAsObject() as { token_version: number }
  stmt.free()

  if (Number(row.token_version) !== payload.tv) {
    throw createError({ statusCode: 401, message: '登录已过期，请重新登录' })
  }

  event.context.auth = { user: payload }
})
