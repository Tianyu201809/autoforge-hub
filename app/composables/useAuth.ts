import type { AuthSession, StoredUserRecord, User } from '~/types/auth'

const AUTH_KEY = 'autoforge-auth'
const USERS_KEY = 'autoforge-users'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function generateId(): string {
  return crypto.randomUUID()
}

function generateToken(): string {
  return crypto.randomUUID()
}

function toUser(record: StoredUserRecord): User {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    teamCount: record.teamCount,
    joinedTeamIds: record.joinedTeamIds
  }
}

function readUsers(): StoredUserRecord[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as StoredUserRecord[]) : []
  } catch {
    return []
  }
}

function writeUsers(users: StoredUserRecord[]) {
  if (!import.meta.client) return
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function readSession(): AuthSession | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (session.expiresAt < Date.now()) {
      localStorage.removeItem(AUTH_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

function writeSession(session: AuthSession | null) {
  if (!import.meta.client) return
  if (session) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(AUTH_KEY)
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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
    const normalizedEmail = email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      return { ok: false, error: '请输入有效的邮箱地址' }
    }
    if (password.length < 8) {
      return { ok: false, error: '密码至少需要 8 位' }
    }

    await new Promise(resolve => setTimeout(resolve, 400))

    const users = readUsers()
    if (users.some(u => u.email === normalizedEmail)) {
      return { ok: false, error: '该邮箱已被注册' }
    }

    const displayName = normalizedEmail.split('@')[0] ?? 'User'
    users.push({
      id: generateId(),
      email: normalizedEmail,
      password,
      displayName,
      teamCount: 0,
      joinedTeamIds: []
    })
    writeUsers(users)

    return { ok: true }
  }

  async function login(
    email: string,
    password: string,
    remember = false
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const normalizedEmail = email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      return { ok: false, error: '请输入有效的邮箱地址' }
    }
    if (password.length < 8) {
      return { ok: false, error: '密码至少需要 8 位' }
    }

    await new Promise(resolve => setTimeout(resolve, 400))

    const users = readUsers()
    const record = users.find(u => u.email === normalizedEmail)

    if (!record || record.password !== password) {
      return { ok: false, error: '邮箱或密码不正确' }
    }

    const ttl = remember ? SESSION_TTL_MS * 4 : SESSION_TTL_MS
    const newSession: AuthSession = {
      token: generateToken(),
      user: toUser(record),
      expiresAt: Date.now() + ttl
    }

    session.value = newSession
    writeSession(newSession)

    return { ok: true }
  }

  function logout() {
    session.value = null
    writeSession(null)
  }

  function getUserInitials(u: User): string {
    const name = u.displayName || u.email
    return name.slice(0, 2).toUpperCase()
  }

  return {
    session,
    user,
    isAuthenticated,
    hydrated,
    loadSession,
    register,
    login,
    logout,
    getUserInitials
  }
}
