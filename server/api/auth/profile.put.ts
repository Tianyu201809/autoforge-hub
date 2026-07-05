import { getDb, saveDb } from "../../db/index"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const body = await readBody(event)
  const displayName = body?.displayName?.trim()
  if (!displayName) throw createError({ statusCode: 400, message: "请输入显示名称" })
  if (displayName.length > 30) throw createError({ statusCode: 400, message: "显示名称不能超过 30 个字符" })

  const db = await getDb()
  const now = new Date().toISOString()
  db.run("UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?", [displayName, now, auth.user.userId])
  saveDb()

  return { ok: true, displayName }
})
