import { getDb, saveDb } from "../../../../db/index"
import { parseSettings, getTeamRole } from "../../../../utils/team-permissions"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const teamId = getRouterParam(event, "id")
  const msgId = getRouterParam(event, "msgId")
  if (!teamId || !msgId) throw createError({ statusCode: 400, message: "缺少参数" })

  const db = await getDb()
  const tStmt = db.prepare("SELECT * FROM teams WHERE id = ?")
  tStmt.bind([teamId])
  if (!tStmt.step()) { tStmt.free(); throw createError({ statusCode: 404, message: "团队不存在" }) }
  const team = tStmt.getAsObject() as any
  tStmt.free()

  const memberIds: string[] = JSON.parse(team.member_ids || "[]")
  const userId = auth.user.userId
  if (team.owner_id !== userId && !memberIds.includes(userId)) {
    throw createError({ statusCode: 403, message: "你不是该团队成员" })
  }

  const mStmt = db.prepare("SELECT * FROM team_messages WHERE id = ? AND team_id = ?")
  mStmt.bind([msgId, teamId])
  if (!mStmt.step()) { mStmt.free(); throw createError({ statusCode: 404, message: "留言不存在" }) }
  const msg = mStmt.getAsObject() as any
  mStmt.free()

  const settings = parseSettings(team.settings)
  const role = getTeamRole(team.owner_id, settings.adminIds, userId)
  const canModerate = role === "owner" || role === "admin"
  if (msg.author_id !== userId && !canModerate) {
    throw createError({ statusCode: 403, message: "只能删除自己的留言" })
  }

  db.run("DELETE FROM team_messages WHERE id = ?", [msgId])
  saveDb()
  return { ok: true }
})
