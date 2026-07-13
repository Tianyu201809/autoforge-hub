import { getDb } from "../../../db/index"
import { parseSettings, checkMemberPermission } from "../../../utils/team-permissions"
import { checkDownloadQuota } from "../../../utils/download-quota"
import { createInstallToken } from "../../../utils/install-token"
import { isPublicScript } from "../../../utils/script-access"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const scriptId = getRouterParam(event, "id")
  if (!scriptId) throw createError({ statusCode: 400, message: "缺少脚本 ID" })

  const userId = auth.user.userId
  const db = await getDb()

  const stmt = db.prepare("SELECT * FROM scripts WHERE id = ?")
  stmt.bind([scriptId])
  if (!stmt.step()) {
    stmt.free()
    throw createError({ statusCode: 404, message: "脚本不存在" })
  }
  const row = stmt.getAsObject() as any
  stmt.free()

  if (row.team_id) {
    const teamStmt = db.prepare("SELECT * FROM teams WHERE id = ?")
    teamStmt.bind([row.team_id])
    if (!teamStmt.step()) {
      teamStmt.free()
      throw createError({ statusCode: 404, message: "团队不存在" })
    }
    const team = teamStmt.getAsObject() as any
    teamStmt.free()
    const memberIds: string[] = JSON.parse(team.member_ids || "[]")
    if (team.owner_id !== userId && !memberIds.includes(userId)) {
      throw createError({ statusCode: 403, message: "你不是该团队成员" })
    }
    const teamSettings = parseSettings(team.settings)
    if (!checkMemberPermission(teamSettings, userId, team.owner_id, "download")) {
      throw createError({ statusCode: 403, message: "没有下载权限" })
    }
  } else if (!isPublicScript(row) && row.owner_id !== userId) {
    throw createError({ statusCode: 403, message: "无权限下载" })
  }

  const quota = await checkDownloadQuota(userId)
  if (!quota.ok) {
    throw createError({
      statusCode: 429,
      message: `今日下载次数已达上限（${quota.used}/${quota.limit}）`,
      data: { used: quota.used, limit: quota.limit },
    })
  }

  const { token, expiresIn } = createInstallToken(scriptId, userId)
  const origin = getRequestURL(event).origin
  const zipUrl = `${origin}/api/scripts/${scriptId}/download?installToken=${encodeURIComponent(token)}`

  return {
    ok: true,
    zipUrl,
    scriptName: row.title as string,
    hubScriptId: scriptId,
    expiresIn,
  }
})
