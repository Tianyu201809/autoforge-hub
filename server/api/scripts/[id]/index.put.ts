import { getDb, saveDb } from "../../../db/index"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const scriptId = getRouterParam(event, "id")
  if (!scriptId) throw createError({ statusCode: 400, message: "缺少脚本 ID" })

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM scripts WHERE id = ?")
  stmt.bind([scriptId])
  if (!stmt.step()) { stmt.free(); throw createError({ statusCode: 404, message: "脚本不存在" }) }
  const row = stmt.getAsObject() as any
  stmt.free()

  if (row.owner_id !== auth.user.userId) {
    const teamStmt = db.prepare("SELECT owner_id FROM teams WHERE id = ?")
    teamStmt.bind([row.team_id])
    const isTeamOwner = teamStmt.step() && (teamStmt.getAsObject() as any).owner_id === auth.user.userId
    teamStmt.free()
    if (!isTeamOwner) throw createError({ statusCode: 403, message: "无权编辑该脚本" })
  }

  const body = await readBody(event)
  const title = body?.title?.trim()
  const description = body?.description?.trim() || ""
  const tags = body?.tags || []
  const category = body?.category || ""
  const language = body?.language || ""

  if (!title) throw createError({ statusCode: 400, message: "请输入脚本名称" })

  const now = new Date().toISOString()
  db.run("UPDATE scripts SET title = ?, description = ?, tags = ?, category = ?, language = ?, updated_at = ? WHERE id = ?", [
    title, description, JSON.stringify(tags), category, language, now, scriptId
  ])
  saveDb()

  return { ok: true, message: "脚本已更新" }
})
