import { getDb, saveDb } from "../../../db/index"
import { isPublicScript } from "../../../utils/script-access"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const scriptId = getRouterParam(event, "id")
  if (!scriptId) throw createError({ statusCode: 400, message: "缺少脚本 ID" })

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM scripts WHERE id = ?")
  stmt.bind([scriptId])
  if (!stmt.step()) {
    stmt.free()
    throw createError({ statusCode: 404, message: "脚本不存在" })
  }
  const row = stmt.getAsObject() as any
  stmt.free()

  if (row.owner_id !== auth.user.userId) {
    throw createError({ statusCode: 403, message: "只能下架自己的插件" })
  }
  if (!isPublicScript(row)) {
    return { ok: true, id: scriptId, alreadyPrivate: true }
  }

  const now = new Date().toISOString()
  db.run(
    "UPDATE scripts SET visibility = 'private', published_at = NULL, updated_at = ?, updated_by = ? WHERE id = ?",
    [now, auth.user.userId, scriptId]
  )
  saveDb()
  return { ok: true, id: scriptId }
})
