import { getDb, saveDb } from "../../../db/index"
import { deleteFile } from "../../../utils/storage"
import { parseSettings, getTeamRole, checkMemberPermission } from "../../../utils/team-permissions"

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

  const userId = auth.user.userId

  // Check permission
  if (row.team_id) {
    // Team script
    const teamStmt = db.prepare("SELECT * FROM teams WHERE id = ?")
    teamStmt.bind([row.team_id])
    if (!teamStmt.step()) { teamStmt.free(); throw createError({ statusCode: 404, message: "Team not found" }) }
    const team = teamStmt.getAsObject() as any
    teamStmt.free()
    const teamSettings = parseSettings(team.settings)
    const role = getTeamRole(team.owner_id, teamSettings.adminIds, userId)

    if (role === "owner" || role === "admin") {
      // Owner/admin can delete any script
    } else if (row.owner_id === userId) {
      // Own script - check delete permission
      if (!checkMemberPermission(teamSettings, userId, team.owner_id, "delete")) {
        throw createError({ statusCode: 403, message: "No permission to delete" })
      }
    } else {
      throw createError({ statusCode: 403, message: "No permission to delete" })
    }
  } else {
    // Personal script - only owner
    if (row.owner_id !== userId) {
      throw createError({ statusCode: 403, message: "No permission to delete" })
    }
  }

  if (row.file_path) await deleteFile(row.file_path)

  db.run("DELETE FROM scripts WHERE id = ?", [scriptId])
  saveDb()

  return { ok: true, message: "Script deleted" }
})
