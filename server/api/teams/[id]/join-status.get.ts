import { getDb } from "../../../db/index"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })
  const teamId = getRouterParam(event, "id")
  if (!teamId) throw createError({ statusCode: 400, message: "缺少团队 ID" })
  const db = await getDb()
  const team = db.prepare("SELECT id FROM teams WHERE id = ?")
  team.bind([teamId])
  if (!team.step()) { team.free(); throw createError({ statusCode: 404, message: "团队不存在" }) }
  team.free()
  const stmt = db.prepare("SELECT status, updated_at FROM team_join_requests WHERE team_id = ? AND user_id = ?")
  stmt.bind([teamId, auth.user.userId])
  if (!stmt.step()) { stmt.free(); return { status: "none" } }
  const row = stmt.getAsObject() as any
  stmt.free()
  return { status: row.status, updatedAt: row.updated_at }
})
