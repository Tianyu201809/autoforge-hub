# Password Reset & Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Resend-based 6-digit OTP password reset on the login page, logged-in password change on the profile page, and invalidate all old JWTs via `token_version` after either succeeds.

**Architecture:** Persist OTP hashes in `password_reset_codes`; bump `users.token_version` on password change/reset; embed `tv` in JWT and verify it in auth middleware. Send codes through Resend REST API (`server/utils/email.ts`). Frontend: multi-step forgot flow on `login.vue` + change-password block on `profile.vue`, wired through `useAuth`.

**Tech Stack:** Nuxt 4 / Nitro, sql.js SQLite, jsonwebtoken, bcryptjs, Resend HTTP API (`fetch`), Vue 3 Composition API.

**Spec:** `docs/superpowers/specs/2026-07-11-password-reset-and-change-design.md`

**Note:** Repo has no automated test runner. Verification steps use `curl` against `pnpm dev` (default `http://localhost:9876` if configured, else `http://localhost:3000`). Adjust `BASE` accordingly.

---

## File map

| File | Responsibility |
|------|----------------|
| `server/db/index.ts` | Migration: `token_version`, `password_reset_codes` |
| `server/db/schema.ts` | Drizzle definitions aligned with runtime schema |
| `server/utils/jwt.ts` | `tv` on payload; export `getJwtSecret()` |
| `server/utils/password-reset.ts` | OTP generate / hash / constants |
| `server/utils/email.ts` | Resend send helper |
| `server/middleware/auth.ts` | Public whitelist + `tv` DB check |
| `server/api/auth/login.post.ts` | Sign JWT with `tv` |
| `server/api/auth/register.post.ts` | Sign JWT with `tv` |
| `server/api/auth/forgot-password.post.ts` | Send OTP |
| `server/api/auth/reset-password.post.ts` | Verify OTP, reset, new JWT |
| `server/api/auth/password.put.ts` | Change password, new JWT |
| `app/types/auth.ts` | `AuthView` for login page steps |
| `app/composables/useAuth.ts` | `forgotPassword` / `resetPassword` / `changePassword` |
| `app/pages/login.vue` | Forgot-password UI steps |
| `app/pages/workspace/profile.vue` | Change-password form |

---

### Task 1: DB migration + Drizzle schema

**Files:**
- Modify: `server/db/index.ts`
- Modify: `server/db/schema.ts`

- [ ] **Step 1: Add migrations in `getDb()` after existing migrations (before `return _sqlDb`)**

In `server/db/index.ts`, after the `download_logs` block and before `return _sqlDb`, insert:

```ts
  // Migration: token_version for JWT invalidation
  try { _sqlDb.run("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0") } catch (e) {}

  // password_reset_codes table
  _sqlDb.run(`
    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `)
  saveDb()
```

- [ ] **Step 2: Update Drizzle schema**

Replace `server/db/schema.ts` contents with:

```ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const downloadLogs = sqliteTable('download_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  scriptId: text('script_id').notNull(),
  downloadedAt: text('downloaded_at').notNull(),
})

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull().default(''),
  teamCount: integer('team_count').notNull().default(0),
  joinedTeamIds: text('joined_team_ids').notNull().default('[]'),
  avatarUrl: text('avatar_url').notNull().default(''),
  tokenVersion: integer('token_version').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const passwordResetCodes = sqliteTable('password_reset_codes', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  createdAt: text('created_at').notNull(),
})
```

- [ ] **Step 3: Commit**

```bash
git add server/db/index.ts server/db/schema.ts
git commit -m "feat(db): add token_version and password_reset_codes"
```

---

### Task 2: JWT `tv` + password-reset helpers + email util

**Files:**
- Modify: `server/utils/jwt.ts`
- Create: `server/utils/password-reset.ts`
- Create: `server/utils/email.ts`

- [ ] **Step 1: Update `server/utils/jwt.ts`**

Replace file with:

```ts
import jwt from 'jsonwebtoken'
import { isProduction, getEnv } from './env'

const ENV = getEnv()

export function getJwtSecret(): string {
  const explicit = process.env.JWT_SECRET
  if (explicit) return explicit

  switch (ENV) {
    case "production":
      console.error(
        "[jwt] FATAL: JWT_SECRET is not configured in production! " +
        "Set the JWT_SECRET environment variable to a strong, unique value."
      )
      process.exit(1)
    case "staging":
      return "autoforge-hub-staging-secret-key"
    case "development":
    default:
      return "autoforge-hub-dev-secret-key"
  }
}

const JWT_SECRET = getJwtSecret()
const JWT_EXPIRES_IN = '7d'

export interface JwtPayload {
  userId: string
  email: string
  tv: number
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    if (typeof decoded.tv !== 'number') return null
    return decoded
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Create `server/utils/password-reset.ts`**

```ts
import { createHash, randomInt } from 'crypto'
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
  return hashResetCode(code) === codeHash
}
```

- [ ] **Step 3: Create `server/utils/email.ts`**

```ts
export async function sendPasswordResetCode(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM?.trim()

  if (!apiKey || !from) {
    throw createError({
      statusCode: 500,
      message: '邮件服务未配置，请设置 RESEND_API_KEY 与 RESEND_FROM',
    })
  }

  const subject = 'Autoforge Hub 密码重置验证码'
  const text = `你的密码重置验证码是：${code}\n\n验证码 10 分钟内有效。如非本人操作，请忽略此邮件。`
  const html = `<p>你的密码重置验证码是：</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>验证码 <strong>10 分钟</strong>内有效。如非本人操作，请忽略此邮件。</p>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [email], subject, text, html }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[email] Resend failed:', res.status, body)
    throw createError({ statusCode: 502, message: '发送失败，请稍后重试' })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add server/utils/jwt.ts server/utils/password-reset.ts server/utils/email.ts
git commit -m "feat(auth): add JWT tv, reset-code helpers, and Resend email"
```

---

### Task 3: Auth middleware + login/register sign with `tv`

**Files:**
- Modify: `server/middleware/auth.ts`
- Modify: `server/api/auth/login.post.ts`
- Modify: `server/api/auth/register.post.ts`

- [ ] **Step 1: Update `server/middleware/auth.ts`**

```ts
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
```

- [ ] **Step 2: Update login to include `tv`**

In `server/api/auth/login.post.ts`, change the `signToken` call:

```ts
  const token = signToken({
    userId: row.id,
    email,
    tv: Number(row.token_version ?? 0),
  })
```

- [ ] **Step 3: Update register to include `tv`**

In `server/api/auth/register.post.ts`, change the `signToken` call to:

```ts
  const token = signToken({ userId: id, email, tv: 0 })
```

(New users start at `token_version` default 0.)

- [ ] **Step 4: Verify manually**

Start (or restart) `pnpm dev`. Log in with an existing account:

```bash
# Set BASE to your dev URL, e.g. http://localhost:9876
curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"YOUR_EMAIL\",\"password\":\"YOUR_PASSWORD\"}"
```

Expected: JSON with `token`. Decode JWT payload (jwt.io or node) — must contain `"tv":0` (or current version).

Call `/api/auth/me` with that token — Expected: 200.

- [ ] **Step 5: Commit**

```bash
git add server/middleware/auth.ts server/api/auth/login.post.ts server/api/auth/register.post.ts
git commit -m "feat(auth): verify token_version on protected API routes"
```

---

### Task 4: `forgot-password` API

**Files:**
- Create: `server/api/auth/forgot-password.post.ts`

- [ ] **Step 1: Create the handler**

```ts
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
```

- [ ] **Step 2: Verify**

With `RESEND_API_KEY` and `RESEND_FROM` set in the environment:

```bash
curl -s -X POST "$BASE/api/auth/forgot-password" -H "Content-Type: application/json" -d "{\"email\":\"unknown@example.com\"}"
# Expected: {"ok":true,"message":"若该邮箱已注册，将收到验证码"}

curl -s -X POST "$BASE/api/auth/forgot-password" -H "Content-Type: application/json" -d "{\"email\":\"YOUR_REAL_EMAIL\"}"
# Expected: same message; inbox receives 6-digit code

curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/forgot-password" -H "Content-Type: application/json" -d "{\"email\":\"YOUR_REAL_EMAIL\"}"
# Expected within 60s: 429
```

Without Resend env vars, registered email path should return 500 with 邮件服务未配置.

- [ ] **Step 3: Commit**

```bash
git add server/api/auth/forgot-password.post.ts
git commit -m "feat(auth): add forgot-password endpoint with Resend OTP"
```

---

### Task 5: `reset-password` + `change-password` APIs

**Files:**
- Create: `server/api/auth/reset-password.post.ts`
- Create: `server/api/auth/password.put.ts`

- [ ] **Step 1: Create `server/api/auth/reset-password.post.ts`**

```ts
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
  const newPassword = body?.newPassword

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
```

- [ ] **Step 2: Create `server/api/auth/password.put.ts`**

```ts
import bcrypt from 'bcryptjs'
import { getDb, saveDb } from '../../db/index'
import { signToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.user) throw createError({ statusCode: 401, message: '未登录，请先登录' })

  const body = await readBody(event)
  const oldPassword = body?.oldPassword
  const newPassword = body?.newPassword

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
```

- [ ] **Step 3: Verify end-to-end with curl**

```bash
# 1) Request code (check email for CODE)
curl -s -X POST "$BASE/api/auth/forgot-password" -H "Content-Type: application/json" -d "{\"email\":\"YOUR_EMAIL\"}"

# 2) Reset
OLD_TOKEN="<token from earlier login>"
curl -s -X POST "$BASE/api/auth/reset-password" -H "Content-Type: application/json" \
  -d "{\"email\":\"YOUR_EMAIL\",\"code\":\"CODE\",\"newPassword\":\"newpass123\"}"
# Expected: ok + new token

# 3) Old token must fail
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/auth/me" -H "Authorization: Bearer $OLD_TOKEN"
# Expected: 401

# 4) Change password with new token
NEW_TOKEN="<token from reset>"
curl -s -X PUT "$BASE/api/auth/password" -H "Authorization: Bearer $NEW_TOKEN" -H "Content-Type: application/json" \
  -d "{\"oldPassword\":\"newpass123\",\"newPassword\":\"newerpass123\"}"
# Expected: ok + another new token
```

- [ ] **Step 4: Commit**

```bash
git add server/api/auth/reset-password.post.ts server/api/auth/password.put.ts
git commit -m "feat(auth): add reset-password and change-password endpoints"
```

---

### Task 6: `useAuth` + types

**Files:**
- Modify: `app/types/auth.ts`
- Modify: `app/composables/useAuth.ts`

- [ ] **Step 1: Extend types**

In `app/types/auth.ts`, change:

```ts
export type AuthTab = 'login' | 'register'
```

to:

```ts
export type AuthTab = 'login' | 'register'
export type AuthView = AuthTab | 'forgot-email' | 'forgot-reset'
```

- [ ] **Step 2: Add helpers and methods in `useAuth.ts`**

Add a private helper next to `writeSession`:

```ts
function applyAuthResponse(data: { user: any; token: string }) {
  const expiresAt = Date.now() + SESSION_TTL_MS
  const newSession: AuthSession = { token: data.token, user: toUser(data.user), expiresAt }
  return newSession
}
```

Refactor `register` / `login` success paths to use `applyAuthResponse` (optional but preferred).

Add these methods inside `useAuth()` before the `return`:

```ts
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
```

Update the return statement:

```ts
  return {
    session, user, isAuthenticated, hydrated,
    loadSession, register, login, logout, updateUser,
    getUserInitials, getAvatarSrc,
    forgotPassword, resetPassword, changePassword,
  }
```

Also update `login` / `register` to build session via `applyAuthResponse` so token refresh stays consistent:

```ts
      const newSession = applyAuthResponse(data)
      session.value = newSession
      writeSession(newSession)
```

- [ ] **Step 3: Commit**

```bash
git add app/types/auth.ts app/composables/useAuth.ts
git commit -m "feat(auth): expose forgot/reset/change password in useAuth"
```

---

### Task 7: Login page forgot-password UI

**Files:**
- Modify: `app/pages/login.vue`

- [ ] **Step 1: Script changes**

1. Import / use `AuthView` instead of only `AuthTab` for the main view state:

```ts
import type { AuthTab, AuthView } from '~/types/auth'

const { login, register, forgotPassword, resetPassword } = useAuth()

const view = ref<AuthView>('login')
const activeTab = computed({
  get: () => (view.value === 'register' ? 'register' : 'login') as AuthTab,
  set: (tab: AuthTab) => { view.value = tab },
})
```

Alternatively keep `activeTab` and add `view` that overrides when in forgot steps — pick one approach and stay consistent. Recommended: single `view` ref of type `AuthView`.

2. Add state:

```ts
const resetCode = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const resendCooldown = ref(0)
let resendTimer: ReturnType<typeof setInterval> | null = null

function startResendCooldown(seconds = 60) {
  resendCooldown.value = seconds
  if (resendTimer) clearInterval(resendTimer)
  resendTimer = setInterval(() => {
    resendCooldown.value -= 1
    if (resendCooldown.value <= 0 && resendTimer) {
      clearInterval(resendTimer)
      resendTimer = null
    }
  }, 1000)
}

onBeforeUnmount(() => {
  if (resendTimer) clearInterval(resendTimer)
})
```

3. Update `headerTitle` / `headerSubtitle` / `submitLabel` for forgot views:

```ts
const headerTitle = computed(() => {
  if (view.value === 'forgot-email') return '找回密码'
  if (view.value === 'forgot-reset') return '设置新密码'
  return view.value === 'login' ? '欢迎回来' : '创建新档案'
})
const headerSubtitle = computed(() => {
  if (view.value === 'forgot-email') return '输入注册邮箱，我们将发送验证码'
  if (view.value === 'forgot-reset') return '输入验证码并设置新密码'
  return view.value === 'login'
    ? '登录以管理你的脚本与团队空间'
    : '填写基本信息，开始你的旅程'
})
const submitLabel = computed(() => {
  if (loading.value) return '处理中...'
  if (view.value === 'forgot-email') return '发送验证码'
  if (view.value === 'forgot-reset') return '重置密码'
  return view.value === 'login' ? '登录' : '创建账号'
})
```

4. Handlers:

```ts
function openForgot() {
  view.value = 'forgot-email'
  formError.value = ''
  successMessage.value = ''
  fieldErrors.value = {}
}

function backToLogin() {
  view.value = 'login'
  resetCode.value = ''
  newPassword.value = ''
  confirmNewPassword.value = ''
  formError.value = ''
  successMessage.value = ''
  fieldErrors.value = {}
}

async function onForgotEmailSubmit() {
  formError.value = ''
  fieldErrors.value = {}
  if (!email.value.trim()) {
    fieldErrors.value = { email: '请输入邮箱' }
    return
  }
  loading.value = true
  const result = await forgotPassword(email.value)
  loading.value = false
  if (!result.ok) {
    formError.value = result.error
    return
  }
  successMessage.value = result.message
  view.value = 'forgot-reset'
  startResendCooldown(60)
}

async function onForgotResetSubmit() {
  formError.value = ''
  const errors: Record<string, string> = {}
  if (!resetCode.value.trim()) errors.code = '请输入验证码'
  if (!newPassword.value || newPassword.value.length < 8) errors.newPassword = '密码至少需要 8 位'
  if (newPassword.value !== confirmNewPassword.value) errors.confirmNewPassword = '两次输入的密码不一致'
  if (Object.keys(errors).length) {
    fieldErrors.value = errors
    return
  }
  loading.value = true
  const result = await resetPassword(email.value, resetCode.value.trim(), newPassword.value)
  loading.value = false
  if (!result.ok) {
    formError.value = result.error
    return
  }
  await navigateTo('/workspace')
}

async function onResendCode() {
  if (resendCooldown.value > 0 || loading.value) return
  formError.value = ''
  loading.value = true
  const result = await forgotPassword(email.value)
  loading.value = false
  if (!result.ok) {
    formError.value = result.error
    return
  }
  successMessage.value = result.message
  startResendCooldown(60)
}

function onSubmit() {
  if (view.value === 'forgot-email') return onForgotEmailSubmit()
  if (view.value === 'forgot-reset') return onForgotResetSubmit()
  // existing login/register branch — replace activeTab checks to use view.value === 'login' | 'register'
  ...
}

function switchTab(tab: AuthTab) {
  view.value = tab
  // existing reset logic
}
```

Wire existing `watch(activeTab, ...)` to `watch(view, ...)` so switching clears fields appropriately (skip clearing email when moving forgot-email → forgot-reset).

- [ ] **Step 2: Template changes**

Inside the login form panel:

1. On login view only, under the password field / near remember-me, add:

```vue
<button
  v-if="view === 'login'"
  type="button"
  class="login-form__forgot"
  :disabled="loading"
  @click="openForgot"
>
  忘记密码？
</button>
```

2. Conditionally show fields by `view`:

- `forgot-email`: only email + submit
- `forgot-reset`: code, newPassword, confirmNewPassword + submit + resend + back
- `login` / `register`: existing fields

Example forgot-reset extras:

```vue
<template v-if="view === 'forgot-reset'">
  <AuthInputGroup
    v-model="resetCode"
    label="验证码"
    type="text"
    placeholder="6 位数字"
    autocomplete="one-time-code"
    :error="fieldErrors.code"
    :disabled="loading"
  />
  <AuthInputGroup
    v-model="newPassword"
    label="新密码"
    type="password"
    placeholder="至少 8 位"
    autocomplete="new-password"
    :error="fieldErrors.newPassword"
    :disabled="loading"
  />
  <AuthInputGroup
    v-model="confirmNewPassword"
    label="确认新密码"
    type="password"
    placeholder="再次输入新密码"
    autocomplete="new-password"
    :error="fieldErrors.confirmNewPassword"
    :disabled="loading"
  />
  <div class="login-form__forgot-actions">
    <button type="button" class="login-form-panel__link" :disabled="loading || resendCooldown > 0" @click="onResendCode">
      {{ resendCooldown > 0 ? `重新发送 (${resendCooldown}s)` : '重新发送' }}
    </button>
    <button type="button" class="login-form-panel__link" :disabled="loading" @click="backToLogin">
      返回登录
    </button>
  </div>
</template>
```

3. Hide social/divider/tabs/remember-me/footer register links when `view` starts with `forgot`. Show a simple「返回登录」in footer for forgot-email.

4. Add minimal CSS:

```css
.login-form__forgot {
  align-self: flex-end;
  margin-top: -8px;
  border: none;
  background: none;
  padding: 0;
  font-size: var(--text-sm);
  color: var(--accent);
  cursor: pointer;
}
.login-form__forgot:hover { text-decoration: underline; }
.login-form__forgot-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
```

- [ ] **Step 3: Manual UI check**

1. Open `/login` → click 忘记密码 → enter email → receive code  
2. Enter code + new password → land on `/workspace`  
3. Wrong code 5 times → message asks to re-request  

- [ ] **Step 4: Commit**

```bash
git add app/pages/login.vue
git commit -m "feat(auth): add forgot-password flow on login page"
```

---

### Task 8: Profile change-password UI

**Files:**
- Modify: `app/pages/workspace/profile.vue`

- [ ] **Step 1: Script**

```ts
const { user, updateUser, getAvatarSrc, changePassword } = useAuth()

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const pwdSaving = ref(false)
const pwdMessage = ref('')
const pwdError = ref('')

async function savePassword() {
  pwdSaving.value = true
  pwdMessage.value = ''
  pwdError.value = ''
  if (!oldPassword.value || !newPassword.value) {
    pwdError.value = '请填写旧密码和新密码'
    pwdSaving.value = false
    return
  }
  if (newPassword.value.length < 8) {
    pwdError.value = '密码至少需要 8 位'
    pwdSaving.value = false
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    pwdError.value = '两次输入的新密码不一致'
    pwdSaving.value = false
    return
  }
  const result = await changePassword(oldPassword.value, newPassword.value)
  if (!result.ok) {
    pwdError.value = result.error
  } else {
    pwdMessage.value = '密码已更新'
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  }
  pwdSaving.value = false
}
```

- [ ] **Step 2: Template — second card after profile card**

```vue
      <div class="profile-card profile-card--password">
        <h2 class="profile-card__heading">修改密码</h2>
        <div class="profile-form">
          <div class="profile-form__field">
            <label class="profile-form__label">旧密码</label>
            <input v-model="oldPassword" type="password" class="profile-form__input" autocomplete="current-password" :disabled="pwdSaving">
          </div>
          <div class="profile-form__field">
            <label class="profile-form__label">新密码</label>
            <input v-model="newPassword" type="password" class="profile-form__input" placeholder="至少 8 位" autocomplete="new-password" :disabled="pwdSaving">
          </div>
          <div class="profile-form__field">
            <label class="profile-form__label">确认新密码</label>
            <input v-model="confirmPassword" type="password" class="profile-form__input" autocomplete="new-password" :disabled="pwdSaving">
          </div>
          <div v-if="pwdMessage" class="profile-form__msg profile-form__msg--success">{{ pwdMessage }}</div>
          <div v-if="pwdError" class="profile-form__msg profile-form__msg--error">{{ pwdError }}</div>
          <button type="button" class="profile-form__submit" :disabled="pwdSaving" @click="savePassword">
            <Icon v-if="pwdSaving" name="lucide:loader-circle" size="16" class="profile-form__spinner" />
            {{ pwdSaving ? '更新中...' : '更新密码' }}
          </button>
        </div>
      </div>
```

Add CSS:

```css
.profile-card--password { margin-top: 20px; }
.profile-card__heading {
  margin: 0;
  padding: 20px 24px 0;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text);
}
```

- [ ] **Step 3: Manual check**

1. Logged in → `/workspace/profile` → change password → see「密码已更新」  
2. Other browser/tab with old token → next API call → 401 / forced re-login  
3. Current tab still works  

- [ ] **Step 4: Commit**

```bash
git add app/pages/workspace/profile.vue
git commit -m "feat(auth): add change-password form on profile page"
```

---

### Task 9: Final integration check + env note

- [ ] **Step 1: Confirm env vars documented for deploy**

Ensure operators know to set:

```
RESEND_API_KEY=re_xxx
RESEND_FROM=Autoforge Hub <noreply@your-verified-domain.com>
```

(Do **not** commit secrets. Optional: add a one-line mention in an existing deploy doc only if one already lists env vars — otherwise skip docs; docs refactor is a later project.)

- [ ] **Step 2: Full smoke checklist**

| # | Check | Expected |
|---|--------|----------|
| 1 | Forgot unknown email | Same success message, no email |
| 2 | Forgot real email | Email with 6-digit code |
| 3 | Resend within 60s | 429 / 「请稍后再试」 |
| 4 | Wrong code | 「验证码错误」 |
| 5 | Reset success | Auto login to workspace |
| 6 | Old JWT → `/api/auth/me` | 401 |
| 7 | Profile change password | Success + stay logged in |
| 8 | Password &lt; 8 chars | Rejected |
| 9 | Missing Resend config | Clear config error on send |

- [ ] **Step 3: Commit only if any small fixes were needed; otherwise done**

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| `token_version` + `password_reset_codes` | Task 1 |
| Resend email util + env | Task 2 |
| JWT `tv` + middleware check + whitelist | Tasks 2–3 |
| login/register sign with `tv` | Task 3 |
| forgot-password (anti-enum, 60s, Resend) | Task 4 |
| reset-password (attempts, expiry, bump tv) | Task 5 |
| change-password (old≠new, bump tv) | Task 5 |
| useAuth methods | Task 6 |
| Login multi-step UI | Task 7 |
| Profile change UI | Task 8 |
| Out of scope: remember-me, docs | Explicitly excluded |

**Placeholder scan:** none intentional.  
**Type consistency:** `tv` / `token_version` / `AuthView` / API field names `oldPassword` `newPassword` `code` aligned across tasks.
