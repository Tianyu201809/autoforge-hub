import { getDb, saveDb } from "../../../db/index"
import { parseSettings, getTeamRole } from "../../../utils/team-permissions"
import { saveFile } from "../../../utils/storage"

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
  if (row.owner_id !== userId && !memberIds.includes(userId)) {
    throw createError({ statusCode: 403, message: "你不是该团队成员" })
  }

  const settings = parseSettings(row.settings)
  const role = getTeamRole(row.owner_id, settings.adminIds, userId)
  if (role !== "owner" && role !== "admin") {
    throw createError({ statusCode: 403, message: "只有创建者或管理员可以修改团队图标" })
  }

  const contentType = getHeader(event, "content-type") || ""
  const now = new Date().toISOString()

  if (contentType.includes("multipart/form-data")) {
    const formData = await readMultipartFormData(event)
    if (!formData) throw createError({ statusCode: 400, message: "无效的上传" })
    const fileField = formData.find(f => f.name === "file")
    if (!fileField || !fileField.data || !fileField.filename) {
      throw createError({ statusCode: 400, message: "请选择图片" })
    }
    const allowed = ["png", "jpg", "jpeg", "gif", "webp"]
    const ext = (fileField.filename.split(".").pop() || "").toLowerCase()
    if (!allowed.includes(ext)) {
      throw createError({ statusCode: 400, message: "仅支持 png / jpg / gif / webp" })
    }
    const storedName = await saveFile("team-" + fileField.filename, fileField.data, "team-avatars")
    db.run(
      "UPDATE teams SET avatar_url = ?, icon = ?, icon_color = NULL, updated_at = ? WHERE id = ?",
      [storedName, "users", now, teamId],
    )
    saveDb()
    return { ok: true, icon: "users", iconColor: null, avatarUrl: storedName }
  }

  const body = await readBody(event)
  const mode = body?.mode
  if (mode !== "icon") {
    throw createError({ statusCode: 400, message: "请提供 mode=icon 或上传文件" })
  }
  const icon = typeof body.icon === "string" && body.icon.trim() ? body.icon.trim() : "users"
  const iconColor = body.iconColor == null || body.iconColor === ""
    ? null
    : String(body.iconColor)

  db.run(
    "UPDATE teams SET icon = ?, icon_color = ?, avatar_url = ?, updated_at = ? WHERE id = ?",
    [icon, iconColor, "", now, teamId],
  )
  saveDb()
  return { ok: true, icon, iconColor, avatarUrl: "" }
})
