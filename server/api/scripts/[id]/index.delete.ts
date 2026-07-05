import { getDb, saveDb } from "../../../db/index"
import { deleteFile } from "../../../utils/storage"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "Not logged in" })

  const scriptId = getRouterParam(event, "id")
  if (!scriptId) throw createError({ statusCode: 400, message: "Missing script ID" })

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM scripts WHERE id = ?")
  stmt.bind([scriptId])
  if (!stmt.step()) { stmt.free(); throw createError({ statusCode: 404, message: "Script not found" }) }
  const row = stmt.getAsObject() as any
  stmt.free()

  if (row.owner_id !== auth.user.userId) {
    const teamStmt = db.prepare("SELECT owner_id FROM teams WHERE id = ?")
    teamStmt.bind([row.team_id])
    const isTeamOwner = teamStmt.step() && (teamStmt.getAsObject() as any).owner_id === auth.user.userId
    teamStmt.free()
    if (!isTeamOwner) throw createError({ statusCode: 403, message: "No permission to delete" })
  }

  if (row.file_path) await deleteFile(row.file_path)

  db.run("DELETE FROM scripts WHERE id = ?", [scriptId])
  saveDb()

  return { ok: true, message: "Script deleted" }
})