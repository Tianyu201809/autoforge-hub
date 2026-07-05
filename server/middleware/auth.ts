import { verifyToken, type JwtPayload } from '../utils/jwt'

export interface AuthenticatedEvent {
  user: JwtPayload
}

export default defineEventHandler(async (event) => {
  // Skip auth for non-API routes and auth endpoints
  const url = getRequestURL(event).pathname
  if (!url.startsWith('/api/')) return
  if (url === '/api/auth/login' || url === '/api/auth/register') return

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: '未登录，请先登录' })
  }

  const token = authHeader.slice(7)
  const payload = verifyToken(token)
  if (!payload) {
    throw createError({ statusCode: 401, message: '登录已过期，请重新登录' })
  }

  event.context.auth = { user: payload }
})
