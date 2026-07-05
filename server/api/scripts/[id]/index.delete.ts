import { getDb, saveDb } from "../../../db/index"
import { deleteFile, getFilePath } from "../../../utils/storage"
import { existsSync, unlinkSync } from "fs"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const scriptId = getRouterParam(event, "id")
  if (!scriptId) throw createError({ statusCode: 400, message: "缺少脚本 ID" })

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM scripts WHERE id = ?")
  stmt.bind([scriptId])
  if (!stmt.step()) { stmt.free(); throw createError({ statusCode: 404, message: "脚本不存在" }) }
  const row = stmt.getAsObject() as any
  stmt.free()

  if (row.owner_id !== auth.user.userId) {
    // Also allow team owner to delete
    const teamStmt = db.prepare("SELECT owner_id FROM teams WHERE id = ?")
    teamStmt.bind([row.team_id])
    const isTeamOwner = teamStmt.step() && (teamStmt.getAsObject() as any).owner_id === auth.user.userId
    teamStmt.free()
    if (!isTeamOwner) throw createError({ statusCode: 403, message: "无权删除该脚本" })
  }

  // Delete file
  if (row.file_path) deleteFile(row.file_path)

  db.run("DELETE FROM scripts WHERE id = ?", [scriptId])
  saveDb()

  return { ok: true, message: "脚本已删除" }
})
