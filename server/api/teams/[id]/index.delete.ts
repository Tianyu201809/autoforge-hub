import { getDb, saveDb } from "../../../db/index"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const teamId = getRouterParam(event, "id")
  if (!teamId) throw createError({ statusCode: 400, message: "缺少团队 ID" })

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM teams WHERE id = ?")
  stmt.bind([teamId])
  if (!stmt.step()) { stmt.free(); throw createError({ statusCode: 404, message: "团队不存在" }) }
  const row = stmt.getAsObject() as any
  stmt.free()

  if (row.owner_id !== auth.user.userId) {
    throw createError({ statusCode: 403, message: "只有创建者可以删除团队" })
  }

  // Delete team scripts
  db.run("DELETE FROM scripts WHERE team_id = ?", [teamId])
  // Delete team
  db.run("DELETE FROM teams WHERE id = ?", [teamId])
  saveDb()

  return { ok: true, message: "团队已删除" }
})
