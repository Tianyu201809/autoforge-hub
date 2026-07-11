import { getDb, saveDb } from "../../../../db/index"
import { parseSettings, getTeamRole } from "../../../../utils/team-permissions"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const teamId = getRouterParam(event, "id")
  if (!teamId) throw createError({ statusCode: 400, message: "缺少团队 ID" })

  const body = await readBody(event)
  const content = typeof body?.content === "string" ? body.content.trim() : ""
  if (!content) throw createError({ statusCode: 400, message: "留言不能为空" })
  if (content.length > 500) throw createError({ statusCode: 400, message: "留言不能超过 500 字" })

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
  const authorRole = getTeamRole(team.owner_id, settings.adminIds, userId)

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.run(
    "INSERT INTO team_messages (id, team_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, teamId, userId, content, now],
  )
  saveDb()

  const uStmt = db.prepare("SELECT display_name, avatar_url FROM users WHERE id = ?")
  uStmt.bind([userId])
  uStmt.step()
  const u = uStmt.getAsObject() as any
  uStmt.free()

  return {
    ok: true,
    message: {
      id,
      teamId,
      authorId: userId,
      authorDisplayName: u.display_name || "",
      authorAvatarUrl: u.avatar_url || "",
      authorRole,
      content,
      createdAt: now,
      canDelete: true,
    },
  }
})
