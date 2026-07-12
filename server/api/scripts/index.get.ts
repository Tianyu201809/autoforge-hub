import { getDb } from "../../db/index"

function mapRow(row: any) {
  return {
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
  }
}

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const query = getQuery(event)
  const scope = (query.scope as string) || "personal"
  const teamId = (query.teamId as string) || ""
  const category = (query.category as string) || ""
  const language = (query.language as string) || ""
  const q = ((query.q as string) || "").trim().toLowerCase()
  const sort = (query.sort as string) || "newest"
  const page = Math.max(1, parseInt(String(query.page || "1"), 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(String(query.pageSize || "30"), 10) || 30))
  const userId = auth.user.userId
  const db = await getDb()

  let where = "WHERE"
  const params: any[] = []

  if (teamId) {
    where += " team_id = ?"
    params.push(teamId)
  } else if (scope === "personal") {
    where += " owner_id = ? AND team_id IS NULL"
    params.push(userId)
  } else {
    where += " 1=1"
  }

  if (category) {
    where += " AND category = ?"
    params.push(category)
  }
  if (language) {
    where += " AND language = ?"
    params.push(language)
  }
  if (q) {
    where += " AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags) LIKE ?)"
    const like = `%${q}%`
    params.push(like, like, like)
  }

  let orderBy = "ORDER BY created_at DESC"
  if (sort === "oldest") orderBy = "ORDER BY created_at ASC"
  else if (sort === "name") orderBy = "ORDER BY title COLLATE NOCASE ASC"

  const countStmt = db.prepare(`SELECT COUNT(*) AS c FROM scripts ${where}`)
  countStmt.bind(params)
  countStmt.step()
  const total = Number((countStmt.getAsObject() as any).c || 0)
  countStmt.free()

  const offset = (page - 1) * pageSize
  const listStmt = db.prepare(
    `SELECT * FROM scripts ${where} ${orderBy} LIMIT ? OFFSET ?`
  )
  listStmt.bind([...params, pageSize, offset])
  const items: any[] = []
  while (listStmt.step()) {
    items.push(mapRow(listStmt.getAsObject()))
  }
  listStmt.free()

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  }
})
