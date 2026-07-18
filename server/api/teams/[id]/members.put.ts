import { getDb, saveDb } from "../../../db/index"
import { parseSettings, getTeamRole } from "../../../utils/team-permissions"

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

  const settings = parseSettings(row.settings)
  const userId = auth.user.userId
  const callerRole = getTeamRole(row.owner_id, settings.adminIds, userId)

  if (callerRole !== "owner" && callerRole !== "admin") {
    throw createError({ statusCode: 403, message: "无权限管理成员" })
  }

  const body = await readBody(event)
  const { action, targetUserId, role } = body || {}

  if (!action || !targetUserId) {
    throw createError({ statusCode: 400, message: "请提供 action 和 targetUserId" })
  }

  const memberIds: string[] = JSON.parse(row.member_ids || "[]")

  if (action === "approveJoin" || action === "rejectJoin") {
    const requestStmt = db.prepare("SELECT id, status FROM team_join_requests WHERE id = ? AND team_id = ?")
    requestStmt.bind([targetUserId, teamId])
    if (!requestStmt.step()) { requestStmt.free(); throw createError({ statusCode: 404, message: "加入申请不存在" }) }
    const request = requestStmt.getAsObject() as any
    requestStmt.free()
    if (request.status !== "pending") throw createError({ statusCode: 400, message: "该申请已处理" })
    const now = new Date().toISOString()
    if (action === "approveJoin") {
      const targetStmt = db.prepare("SELECT user_id FROM team_join_requests WHERE id = ?")
      targetStmt.bind([targetUserId]); targetStmt.step(); const target = targetStmt.getAsObject() as any; targetStmt.free()
      if (!memberIds.includes(target.user_id)) memberIds.push(target.user_id)
      db.run("UPDATE teams SET member_ids = ?, updated_at = ? WHERE id = ?", [JSON.stringify(memberIds), now, teamId])
      db.run("UPDATE team_join_requests SET status = 'approved', updated_at = ? WHERE id = ?", [now, targetUserId])
      saveDb()
      return { ok: true, message: "申请已批准" }
    }
    db.run("UPDATE team_join_requests SET status = 'rejected', updated_at = ? WHERE id = ?", [now, targetUserId])
    saveDb()
    return { ok: true, message: "申请已拒绝" }
  }

  if (action === "kick") {
    // Cannot kick owner
    if (targetUserId === row.owner_id) {
      throw createError({ statusCode: 400, message: "不能踢出创建者" })
    }
    // Admin cannot kick other admins
    if (callerRole === "admin" && settings.adminIds.includes(targetUserId)) {
      throw createError({ statusCode: 403, message: "管理员不能踢出其他管理员" })
    }
    const updated = memberIds.filter((id: string) => id !== targetUserId)
    // Remove from admin list too
    const updatedAdminIds = settings.adminIds.filter((id: string) => id !== targetUserId)
    const newSettings = { ...settings, adminIds: updatedAdminIds }
    db.run("UPDATE teams SET member_ids = ?, settings = ?, updated_at = ? WHERE id = ?", [
      JSON.stringify(updated), JSON.stringify(newSettings), new Date().toISOString(), teamId,
    ])
    saveDb()
    return { ok: true, message: "成员已移除" }
  }

  if (action === "setRole") {
    // Only owner can change roles
    if (callerRole !== "owner") {
      throw createError({ statusCode: 403, message: "只有创建者可以修改成员角色" })
    }
    if (!memberIds.includes(targetUserId)) {
      throw createError({ statusCode: 400, message: "该用户不是团队成员" })
    }
    if (targetUserId === row.owner_id) {
      throw createError({ statusCode: 400, message: "不能修改创建者的角色" })
    }

    if (role === "admin") {
      if (!settings.adminIds.includes(targetUserId)) {
        settings.adminIds.push(targetUserId)
      }
    } else if (role === "member") {
      settings.adminIds = settings.adminIds.filter((id: string) => id !== targetUserId)
    } else {
      throw createError({ statusCode: 400, message: "无效的角色，仅支持 admin/member" })
    }

    db.run("UPDATE teams SET settings = ?, updated_at = ? WHERE id = ?", [
      JSON.stringify(settings), new Date().toISOString(), teamId,
    ])
    saveDb()
    return { ok: true, message: role === "admin" ? "已提升为管理员" : "已撤销管理员" }
  }

  throw createError({ statusCode: 400, message: "无效的 action，仅支持 kick/setRole" })
})
