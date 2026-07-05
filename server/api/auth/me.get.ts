import { getDb } from "../../db/index"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "Not logged in" })
  const db = await getDb()

  const teamStmt = db.prepare("SELECT COUNT(*) as c FROM teams WHERE owner_id = ?")
  teamStmt.bind([auth.user.userId])
  teamStmt.step()
  const teamRow = teamStmt.getAsObject() as any
  const teams = teamRow.c
  teamStmt.free()

  const scriptStmt = db.prepare("SELECT COUNT(*) as c FROM scripts WHERE owner_id = ?")
  scriptStmt.bind([auth.user.userId])
  scriptStmt.step()
  const scriptRow = scriptStmt.getAsObject() as any
  const scripts = scriptRow.c
  scriptStmt.free()

  const stmt = db.prepare("SELECT id, email, display_name, avatar_url, team_count FROM users WHERE id = ?")
  stmt.bind([auth.user.userId])
  stmt.step()
  const row = stmt.getAsObject() as any
  stmt.free()

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || "",
    teamCount: teams,
    scriptCount: scripts,
  }
})
