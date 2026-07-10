import { getDb } from "../../db/index"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const query = getQuery(event)
  const scope = query.scope as string || "personal"
  const teamId = query.teamId as string || ""
  const category = query.category as string || ""
  const language = query.language as string || ""
  const userId = auth.user.userId
  const db = await getDb()

  let sql = "SELECT * FROM scripts WHERE"
  const params: any[] = []

  if (teamId) {
    sql += " team_id = ?"
    params.push(teamId)
  } else if (scope === "personal") {
    sql += " owner_id = ? AND team_id IS NULL"
    params.push(userId)
  } else {
    sql += " 1=1"
  }

  if (category) { sql += " AND category = ?"; params.push(category) }
  if (language) { sql += " AND language = ?"; params.push(language) }

  sql += " ORDER BY created_at DESC"

  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results: any[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject() as any
    results.push({
      id: row.id,
      title: row.title,
      description: row.description,
      zipName: row.file_name,
      zipSize: row.file_size,
      filePath: row.file_path,
      icon: row.icon || "file-archive",
      iconColor: row.icon_color || undefined,
      tags: JSON.parse(row.tags || "[]"),
      category: row.category || "",
      language: row.language || "",
      ownerId: row.owner_id,
      teamId: row.team_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  }
  stmt.free()

  return results
})
