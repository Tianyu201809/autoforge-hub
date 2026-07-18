import { getDb, saveDb } from "../../../db/index"
import { randomUUID } from "crypto"

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

  const existing = db.prepare("SELECT id, status FROM team_join_requests WHERE team_id = ? AND user_id = ?")
  existing.bind([teamId, userId])
  const now = new Date().toISOString()
  if (existing.step()) {
    const request = existing.getAsObject() as any
    existing.free()
    if (request.status === "pending") return { ok: true, status: "pending", message: "申请已提交，等待管理员审批" }
    db.run("UPDATE team_join_requests SET status = 'pending', updated_at = ? WHERE id = ?", [now, request.id])
  } else {
    existing.free()
    db.run("INSERT INTO team_join_requests (id, team_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?)", [
      randomUUID(), teamId, userId, now, now,
    ])
  }
  saveDb()

  return { ok: true, status: "pending", message: "申请已提交，等待管理员审批" }
})
