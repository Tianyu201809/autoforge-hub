import { getDb } from "../../../db/index"
import { isPublicScript } from "../../../utils/script-access"

function mapScriptRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    readme: row.readme || "",
    zipName: row.file_name,
    zipSize: row.file_size,
    filePath: row.file_path,
    icon: row.icon || "file-archive",
    iconColor: row.icon_color || undefined,
    tags: JSON.parse(row.tags || "[]"),
    category: row.category || "",
    language: row.language || "",
    ownerId: row.owner_id,
    teamId: row.team_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by || row.owner_id || undefined,
    visibility: row.visibility || "private",
    publishedAt: row.published_at || undefined,
    installCount: Number(row.install_count || 0),
    githubUrl: row.github_url || undefined,
    ownerDisplayName: row.owner_display_name || "未知用户",
    ownerAvatarUrl: row.owner_avatar_url || "",
    updaterDisplayName: row.updater_display_name || row.owner_display_name || "未知用户",
    updaterAvatarUrl: row.updater_avatar_url || row.owner_avatar_url || "",
  }
}

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const scriptId = getRouterParam(event, "id")
  if (!scriptId) throw createError({ statusCode: 400, message: "缺少脚本 ID" })

  const db = await getDb()
  const stmt = db.prepare(
    `SELECT s.*,
            u.display_name AS owner_display_name,
            u.avatar_url AS owner_avatar_url,
            uu.display_name AS updater_display_name,
            uu.avatar_url AS updater_avatar_url
     FROM scripts s
     LEFT JOIN users u ON u.id = s.owner_id
     LEFT JOIN users uu ON uu.id = COALESCE(NULLIF(s.updated_by, ''), s.owner_id)
     WHERE s.id = ?`
  )
  stmt.bind([scriptId])
  if (!stmt.step()) {
    stmt.free()
    throw createError({ statusCode: 404, message: "脚本不存在" })
  }
  const row = stmt.getAsObject() as any
  stmt.free()

  const userId = auth.user.userId
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
      throw createError({ statusCode: 403, message: "无权查看该脚本" })
    }
  } else if (!isPublicScript(row) && row.owner_id !== userId) {
    throw createError({ statusCode: 403, message: "无权查看该脚本" })
  }

  return mapScriptRow(row)
})
