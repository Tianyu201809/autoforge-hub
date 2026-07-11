import type { AuthSession, User } from '~/types/auth'

const AUTH_KEY = 'autoforge-auth'
const AUTH_HINT_COOKIE = 'autoforge-auth'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function clearAuthStorage() {
  if (!import.meta.client) return
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem('autoforge-token')
  writeAuthHintCookie(null)
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = import.meta.client ? localStorage.getItem('autoforge-token') : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, { ...options, headers })
  const data = await res.json()
  if (res.status === 401) {
    clearAuthStorage()
    if (import.meta.client && window.location.pathname !== '/login') {
      navigateTo('/login')
    }
  }
  if (!res.ok) throw new Error(data.message || '请求失败')
  return data
}

/** Lightweight cookie so SSR can avoid rendering protected layouts for guests. */
function writeAuthHintCookie(expiresAt: number | null) {
  if (!import.meta.client) return
  if (expiresAt && expiresAt > Date.now()) {
    const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
    document.cookie = `${AUTH_HINT_COOKIE}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax`
  } else {
    document.cookie = `${AUTH_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
  }
}

function readSession(): AuthSession | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (session.expiresAt < Date.now()) {
      clearAuthStorage()
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
    writeAuthHintCookie(session.expiresAt)
  } else {
    clearAuthStorage()
  }
}

function applyAuthResponse(data: { user: any; token: string }) {
  const expiresAt = Date.now() + SESSION_TTL_MS
  const newSession: AuthSession = { token: data.token, user: toUser(data.user), expiresAt }
  return newSession
}

function toUser(data: any): User {
  return {
    id: data.id,
    email: data.email,
    displayName: data.displayName || data.email?.split('@')[0] || 'User',
    avatarUrl: data.avatarUrl || data.avatar_url || '',
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
    writeAuthHintCookie(session.value?.expiresAt ?? null)
    hydrated.value = true
  }

  async function register(
    email: string,
    password: string,
    captchaToken?: string,
    captchaPosition?: number
  ): Promise<{ ok: true } | { ok: false; error: string; captchaError?: boolean }> {
    try {
      const body: Record<string, any> = { email, password }
      if (captchaToken) body.captchaToken = captchaToken
      if (captchaPosition !== undefined) body.captchaPosition = captchaPosition
      const data = await apiFetch<{ ok: boolean; user: any; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body)
      })
      const newSession = applyAuthResponse(data)
      session.value = newSession
      writeSession(newSession)
      return { ok: true }
    } catch (err: any) {
      const isCaptchaError = err.message?.includes('验证码')
      return { ok: false, error: err.message || '注册失败', captchaError: isCaptchaError }
    }
  }

  async function login(email: string, password: string, _remember = false): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const data = await apiFetch<{ ok: boolean; user: any; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      const newSession = applyAuthResponse(data)
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

  function updateUser(partial: Partial<User>) {
    if (!session.value) return
    const next: AuthSession = {
      ...session.value,
      user: { ...session.value.user, ...partial },
    }
    session.value = next
    writeSession(next)
  }

  function getUserInitials(u: User): string {
    const name = u.displayName || u.email
    return name.slice(0, 2).toUpperCase()
  }

  /** Resolve stored avatar key (e.g. avatars/xxx.webp) to a serveable URL. */
  function getAvatarSrc(url?: string | null): string {
    if (!url) return ''
    const name = url.replace(/^avatars\//, '')
    if (!name) return ''
    return '/api/files/avatars/' + encodeURIComponent(name)
  }

  async function forgotPassword(email: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
    try {
      const data = await apiFetch<{ ok: boolean; message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      return { ok: true, message: data.message || '若该邮箱已注册，将收到验证码' }
    } catch (err: any) {
      return { ok: false, error: err.message || '发送失败' }
    }
  }

  async function resetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const data = await apiFetch<{ ok: boolean; user: any; token: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword }),
      })
      const newSession = applyAuthResponse(data)
      session.value = newSession
      writeSession(newSession)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message || '重置失败' }
    }
  }

  async function changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const data = await apiFetch<{ ok: boolean; user: any; token: string }>('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      const newSession = applyAuthResponse(data)
      session.value = newSession
      writeSession(newSession)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message || '修改失败' }
    }
  }

  return { session, user, isAuthenticated, hydrated, loadSession, register, login, logout, updateUser, getUserInitials, getAvatarSrc, forgotPassword, resetPassword, changePassword }
}
