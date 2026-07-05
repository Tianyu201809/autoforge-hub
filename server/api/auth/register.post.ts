import { getDb, saveDb } from "../../db/index"
import { signToken } from "../../utils/jwt"
import bcrypt from "bcryptjs"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = body?.email?.trim().toLowerCase()
  const password = body?.password

  if (!email || !password) throw createError({ statusCode: 400, message: "请填写邮箱和密码" })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw createError({ statusCode: 400, message: "邮箱格式不正确" })
  if (password.length < 8) throw createError({ statusCode: 400, message: "密码至少需要 8 位" })

  const db = await getDb()
  const existingStmt = db.prepare("SELECT id FROM users WHERE email = ?")
  existingStmt.bind([email])
  const exists = existingStmt.step()
  existingStmt.free()
  if (exists) {
    throw createError({ statusCode: 409, message: "该邮箱已被注册" })
  }

  const id = crypto.randomUUID()
  const passwordHash = await bcrypt.hash(password, 10)
  const now = new Date().toISOString()
  const displayName = email.split("@")[0] || "User"

  db.run(
    "INSERT INTO users (id, email, password_hash, display_name, team_count, joined_team_ids, created_at, updated_at) VALUES (?, ?, ?, ?, 0, '[]', ?, ?)",
    [id, email, passwordHash, displayName, now, now]
  )
  saveDb()

  const token = signToken({ userId: id, email })
  return { ok: true, user: { id, email, displayName, teamCount: 0, joinedTeamIds: [] }, token }
})
