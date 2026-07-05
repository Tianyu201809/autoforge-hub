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

  const userId = auth.user.userId
  if (row.owner_id === userId) {
    throw createError({ statusCode: 400, message: "创建者不能退出自己的团队" })
  }

  const memberIds: string[] = JSON.parse(row.member_ids || "[]")
  if (!memberIds.includes(userId)) {
    throw createError({ statusCode: 400, message: "你不是该团队成员" })
  }

  const updated = memberIds.filter((id: string) => id !== userId)
  db.run("UPDATE teams SET member_ids = ?, updated_at = ? WHERE id = ?", [
    JSON.stringify(updated), new Date().toISOString(), teamId
  ])
  saveDb()

  return { ok: true, message: "已退出团队" }
})
