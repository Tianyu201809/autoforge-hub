import { getDb } from "../../db/index"
import { signToken } from "../../utils/jwt"
import bcrypt from "bcryptjs"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = body?.email?.trim().toLowerCase()
  const password = body?.password

  if (!email || !password) throw createError({ statusCode: 400, message: "请填写邮箱和密码" })

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM users WHERE email = ?")
  stmt.bind([email])
  const found = stmt.step()
  if (!found) {
    stmt.free()
    throw createError({ statusCode: 401, message: "邮箱或密码不正确" })
  }
  const row = stmt.getAsObject() as any
  stmt.free()

  const valid = await bcrypt.compare(password, row.password_hash)
  if (!valid) throw createError({ statusCode: 401, message: "邮箱或密码不正确" })

  const token = signToken({ userId: row.id, email })
  return {
    ok: true,
    user: {
      id: row.id,
      email,
      displayName: row.display_name,
      teamCount: row.team_count,
      joinedTeamIds: JSON.parse(row.joined_team_ids || "[]"),
    },
    token,
  }
})
