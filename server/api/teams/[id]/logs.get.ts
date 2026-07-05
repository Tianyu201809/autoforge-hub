import { getDb } from "../../../db/index"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const teamId = getRouterParam(event, "id")
  if (!teamId) throw createError({ statusCode: 400, message: "缺少团队 ID" })

  const query = getQuery(event)
  const page = Math.max(1, parseInt(query.page as string) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string) || 20))
  const actionType = (query.action_type as string) || ""

  const db = await getDb()

  // Verify user is a team member
  const teamStmt = db.prepare("SELECT * FROM teams WHERE id = ?")
  teamStmt.bind([teamId])
  if (!teamStmt.step()) { teamStmt.free(); throw createError({ statusCode: 404, message: "团队不存在" }) }
  const team = teamStmt.getAsObject() as any
  teamStmt.free()

  const memberIds: string[] = JSON.parse(team.member_ids || "[]")
  const userId = auth.user.userId
  if (team.owner_id !== userId && !memberIds.includes(userId)) {
    throw createError({ statusCode: 403, message: "你不是该团队成员" })
  }

  // Build query
  let whereClause = "WHERE team_id = ?"
  const params: any[] = [teamId]

  if (actionType && ["upload", "edit", "delete"].includes(actionType)) {
    whereClause += " AND action_type = ?"
    params.push(actionType)
  }

  // Count total
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`)
  countStmt.bind(params)
  countStmt.step()
  const countRow = countStmt.getAsObject() as any
  countStmt.free()
  const total = countRow.total || 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const offset = (page - 1) * pageSize

  // Fetch logs
  const logStmt = db.prepare(
    `SELECT id, team_id, user_id, user_name, action_type, script_id, script_name, details, created_at FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
  logStmt.bind([...params, pageSize, offset])
  const logs: any[] = []
  while (logStmt.step()) {
    const row = logStmt.getAsObject() as any
    logs.push({
      id: row.id,
      teamId: row.team_id,
      userId: row.user_id,
      userName: row.user_name,
      actionType: row.action_type,
      scriptId: row.script_id || undefined,
      scriptName: row.script_name,
      details: (() => { try { return JSON.parse(row.details || "{}") } catch { return {} } })(),
      createdAt: row.created_at,
    })
  }
  logStmt.free()

  return {
    ok: true,
    logs,
    total,
    page,
    pageSize,
    totalPages,
  }
})
