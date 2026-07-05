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

  const memberIds: string[] = JSON.parse(row.member_ids || "[]")
  const userId = auth.user.userId

  if (memberIds.includes(userId)) {
    throw createError({ statusCode: 400, message: "你已是该团队成员" })
  }

  memberIds.push(userId)
  db.run("UPDATE teams SET member_ids = ?, updated_at = ? WHERE id = ?", [
    JSON.stringify(memberIds), new Date().toISOString(), teamId
  ])
  saveDb()

  return { ok: true, message: "已成功加入团队" }
})
