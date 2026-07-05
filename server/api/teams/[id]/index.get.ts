import { getDb } from "../../../db/index"

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

  // Check if user is member
  if (row.owner_id !== userId && !memberIds.includes(userId)) {
    throw createError({ statusCode: 403, message: "你不是该团队成员" })
  }

  // Get member details
  const users = db.exec("SELECT id, email, display_name FROM users")[0]
  const members = users ? users.values
    .filter((r: any[]) => memberIds.includes(r[users.columns.indexOf("id")] as string))
    .map((r: any[]) => ({
      id: r[users.columns.indexOf("id")],
      email: r[users.columns.indexOf("email")],
      displayName: r[users.columns.indexOf("display_name")],
    })) : []

  // Get scripts count
  const scripts = db.exec("SELECT COUNT(*) as c FROM scripts WHERE team_id = ?")[0]
  const scriptCount = scripts ? (scripts.values[0]?.[0] || 0) : 0

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    memberCount: memberIds.length,
    members,
    scriptCount,
    createdAt: row.created_at,
  }
})
