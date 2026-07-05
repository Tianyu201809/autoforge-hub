import { getDb } from "../../../db/index"
import { getFilePath } from "../../../utils/storage"
import { readFileSync, existsSync } from "fs"
import { parseSettings, getTeamRole, checkMemberPermission } from "../../../utils/team-permissions"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const scriptId = getRouterParam(event, "id")
  if (!scriptId) throw createError({ statusCode: 400, message: "缺少脚本 ID" })

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM scripts WHERE id = ?")
  stmt.bind([scriptId])
  if (!stmt.step()) {
    stmt.free()
    throw createError({ statusCode: 404, message: "脚本不存在" })
  }
  const row = stmt.getAsObject() as any
  stmt.free()

  const userId = auth.user.userId

  // Check access
  if (row.team_id) {
    // Team script
    const teamStmt = db.prepare("SELECT * FROM teams WHERE id = ?")
    teamStmt.bind([row.team_id])
    if (!teamStmt.step()) { teamStmt.free(); throw createError({ statusCode: 404, message: "团队不存在" }) }
    const team = teamStmt.getAsObject() as any
    teamStmt.free()
    const memberIds: string[] = JSON.parse(team.member_ids || "[]")

    // Must be a member
    if (team.owner_id !== userId && !memberIds.includes(userId)) {
      throw createError({ statusCode: 403, message: "你不是该团队成员" })
    }

    const teamSettings = parseSettings(team.settings)
    if (!checkMemberPermission(teamSettings, userId, team.owner_id, "download")) {
      throw createError({ statusCode: 403, message: "没有下载权限" })
    }
  } else {
    // Personal script - only owner
    if (row.owner_id !== userId) {
      throw createError({ statusCode: 403, message: "无权限下载" })
    }
  }

  const filePath = getFilePath(row.file_path)
  if (filePath.startsWith("http")) {
    return sendRedirect(event, filePath, 302)
  }

  if (!existsSync(filePath)) throw createError({ statusCode: 404, message: "文件不存在" })
  const data = readFileSync(filePath)
  const filename = row.file_name || "script.zip"
  setHeader(event, "Content-Type", "application/zip")
  setHeader(event, "Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`)
  setHeader(event, "Cache-Control", "public, max-age=31536000")
  return new Uint8Array(data)
})
