import type { AuthSession, User } from '~/types/auth'

const AUTH_KEY = 'autoforge-auth'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = import.meta.client ? localStorage.getItem('autoforge-token') : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || '请求失败')
  return data
}

function readSession(): AuthSession | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (session.expiresAt < Date.now()) {
      localStorage.removeItem(AUTH_KEY)
      localStorage.removeItem('autoforge-token')
      return null
    }
    return session
  } catch { return null }
}

function writeSession(session: AuthSession | null) {
  if (!import.meta.client) return
  if (session) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(session))
    localStorage.setItem('autoforge-token', session.token)
  } else {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem('autoforge-token')
  }
}

function toUser(data: any): User {
  return {
    id: data.id,
    email: data.email,
    displayName: data.displayName || data.email?.split('@')[0] || 'User',
    teamCount: data.teamCount ?? 0,
    joinedTeamIds: data.joinedTeamIds ?? []
  }
}

export function useAuth() {
  const session = useState<AuthSession | null>('auth-session', () => null)
  const hydrated = useState('auth-hydrated', () => false)

  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => session.value !== null)

  function loadSession() {
    if (!import.meta.client) return
    session.value = readSession()
    hydrated.value = true
  }

  async function register(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const data = await apiFetch<{ ok: boolean; user: any; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      const expiresAt = Date.now() + SESSION_TTL_MS
      const newSession: AuthSession = { token: data.token, user: toUser(data.user), expiresAt }
      session.value = newSession
      writeSession(newSession)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message || '注册失败' }
    }
  }

  async function login(email: string, password: string, _remember = false): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const data = await apiFetch<{ ok: boolean; user: any; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      const expiresAt = Date.now() + SESSION_TTL_MS
      const newSession: AuthSession = { token: data.token, user: toUser(data.user), expiresAt }
      session.value = newSession
      writeSession(newSession)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message || '登录失败' }
    }
  }

  function logout() {
    session.value = null
    writeSession(null)
  }

  function getUserInitials(u: User): string {
    const name = u.displayName || u.email
    return name.slice(0, 2).toUpperCase()
  }

  return { session, user, isAuthenticated, hydrated, loadSession, register, login, logout, getUserInitials }
}
