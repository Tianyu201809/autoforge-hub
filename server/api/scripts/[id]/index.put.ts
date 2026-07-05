import { getDb, saveDb } from "../../../db/index"
import { parseSettings, getTeamRole, checkMemberPermission } from "../../../utils/team-permissions"

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

  const userId = auth.user.userId

  // Check permission
  if (row.team_id) {
    // Team script
    const teamStmt = db.prepare("SELECT * FROM teams WHERE id = ?")
    teamStmt.bind([row.team_id])
    if (!teamStmt.step()) { teamStmt.free(); throw createError({ statusCode: 404, message: "团队不存在" }) }
    const team = teamStmt.getAsObject() as any
    teamStmt.free()
    const teamSettings = parseSettings(team.settings)
    const role = getTeamRole(team.owner_id, teamSettings.adminIds, userId)

    if (role === "owner" || role === "admin") {
      // Owner/admin can edit any script
    } else if (row.owner_id === userId) {
      // Own script - check edit permission
      if (!checkMemberPermission(teamSettings, userId, team.owner_id, "edit")) {
        throw createError({ statusCode: 403, message: "没有编辑脚本的权限" })
      }
    } else {
      throw createError({ statusCode: 403, message: "无权编辑该脚本" })
    }
  } else {
    // Personal script - only owner
    if (row.owner_id !== userId) {
      throw createError({ statusCode: 403, message: "无权编辑该脚本" })
    }
  }

  const body = await readBody(event)
  const title = body?.title?.trim()
  const description = body?.description?.trim() || ""
  const tags = body?.tags || []
  const category = body?.category || ""
  const language = body?.language || ""
  const icon = body?.icon || "file-archive"

  if (!title) throw createError({ statusCode: 400, message: "请输入脚本名称" })

  const now = new Date().toISOString()
  db.run("UPDATE scripts SET title = ?, description = ?, tags = ?, icon = ?, category = ?, language = ?, updated_at = ? WHERE id = ?", [
    title, description, JSON.stringify(tags), icon, category, language, now, scriptId
  ])
  saveDb()

  return { ok: true, message: "脚本已更新" }
})
