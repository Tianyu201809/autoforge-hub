import { getDb, saveDb } from "../../../db/index"
import { parseSettings } from "../../../utils/team-permissions"

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

  // Only owner can change settings
  if (row.owner_id !== auth.user.userId) {
    throw createError({ statusCode: 403, message: "只有创建者可以修改团队设置" })
  }

  const body = await readBody(event)
  const memberPermissions = body?.memberPermissions

  if (!memberPermissions || typeof memberPermissions !== "object") {
    throw createError({ statusCode: 400, message: "请提供 memberPermissions" })
  }

  const currentSettings = parseSettings(row.settings)
  const newSettings = {
    ...currentSettings,
    memberPermissions: {
      upload: typeof memberPermissions.upload === "boolean" ? memberPermissions.upload : currentSettings.memberPermissions.upload,
      edit: typeof memberPermissions.edit === "boolean" ? memberPermissions.edit : currentSettings.memberPermissions.edit,
      delete: typeof memberPermissions.delete === "boolean" ? memberPermissions.delete : currentSettings.memberPermissions.delete,
      download: typeof memberPermissions.download === "boolean" ? memberPermissions.download : currentSettings.memberPermissions.download,
    },
  }

  const now = new Date().toISOString()
  db.run("UPDATE teams SET settings = ?, updated_at = ? WHERE id = ?", [
    JSON.stringify(newSettings), now, teamId,
  ])
  saveDb()

  return { ok: true, settings: newSettings }
})
