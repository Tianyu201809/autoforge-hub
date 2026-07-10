import { getDb, saveDb } from "../../../db/index"
import { parseSettings, getTeamRole, checkMemberPermission } from "../../../utils/team-permissions"
import { createAuditLog } from "../../../utils/audit-log"

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
  const iconColor = body?.iconColor ?? null

  if (!title) throw createError({ statusCode: 400, message: "请输入脚本名称" })

  const now = new Date().toISOString()
  db.run("UPDATE scripts SET title = ?, description = ?, tags = ?, icon = ?, icon_color = ?, category = ?, language = ?, updated_at = ? WHERE id = ?", [
    title, description, JSON.stringify(tags), icon, iconColor, category, language, now, scriptId
  ])
  saveDb()

  // Write audit log for team script edit
  if (row.team_id) {
    const userStmt = db.prepare("SELECT display_name FROM users WHERE id = ?")
    userStmt.bind([userId])
    if (userStmt.step()) {
      const userRow = userStmt.getAsObject() as any
      createAuditLog(db, {
        teamId: row.team_id,
        userId,
        userName: userRow.display_name || auth.user.email,
        actionType: "edit",
        scriptId,
        scriptName: title,
        details: {
          title_old: row.title,
          title_new: title,
          changes: (() => {
            const c: string[] = []
            if (row.title !== title) c.push("title")
            if ((row.description || "") !== description) c.push("description")
            if (JSON.stringify(JSON.parse(row.tags || "[]")) !== JSON.stringify(tags)) c.push("tags")
            if ((row.icon || "") !== icon) c.push("icon")
            return c
          })(),
        },
      })
      saveDb()
    }
    userStmt.free()
  }

  return { ok: true, message: "脚本已更新" }
})
