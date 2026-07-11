import { getDb } from "../../../../db/index"
import { parseSettings, getTeamRole } from "../../../../utils/team-permissions"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const teamId = getRouterParam(event, "id")
  if (!teamId) throw createError({ statusCode: 400, message: "缺少团队 ID" })

  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50)
  const offset = Math.max(Number(query.offset) || 0, 0)

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM teams WHERE id = ?")
  stmt.bind([teamId])
  if (!stmt.step()) { stmt.free(); throw createError({ statusCode: 404, message: "团队不存在" }) }
  const team = stmt.getAsObject() as any
  stmt.free()

  const memberIds: string[] = JSON.parse(team.member_ids || "[]")
  const userId = auth.user.userId
  if (team.owner_id !== userId && !memberIds.includes(userId)) {
    throw createError({ statusCode: 403, message: "你不是该团队成员" })
  }

  const settings = parseSettings(team.settings)
  const currentRole = getTeamRole(team.owner_id, settings.adminIds, userId)
  const canModerate = currentRole === "owner" || currentRole === "admin"

  const countStmt = db.prepare("SELECT COUNT(*) AS c FROM team_messages WHERE team_id = ?")
  countStmt.bind([teamId])
  countStmt.step()
  const total = Number((countStmt.getAsObject() as any).c || 0)
  countStmt.free()

  const usersRes = db.exec("SELECT id, display_name, avatar_url FROM users")[0]
  const userMap = new Map<string, { displayName: string; avatarUrl: string }>()
  if (usersRes) {
    for (const r of usersRes.values) {
      userMap.set(r[0] as string, {
        displayName: (r[1] as string) || "",
        avatarUrl: (r[2] as string) || "",
      })
    }
  }

  const listStmt = db.prepare(
    "SELECT id, team_id, author_id, content, created_at FROM team_messages WHERE team_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
  )
  listStmt.bind([teamId, limit, offset])
  const items: any[] = []
  while (listStmt.step()) {
    const r = listStmt.getAsObject() as any
    const authorId = r.author_id as string
    const u = userMap.get(authorId)
    const authorRole = getTeamRole(team.owner_id, settings.adminIds, authorId)
    items.push({
      id: r.id,
      teamId: r.team_id,
      authorId,
      authorDisplayName: u?.displayName || "未知用户",
      authorAvatarUrl: u?.avatarUrl || "",
      authorRole,
      content: r.content,
      createdAt: r.created_at,
      canDelete: canModerate || authorId === userId,
    })
  }
  listStmt.free()

  return {
    items,
    total,
    hasMore: offset + items.length < total,
  }
})
