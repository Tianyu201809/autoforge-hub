import { getDb, type SqlJsDbType } from "../../db/index"

type DistributionKind = "category" | "language"

type WhereOptions = {
  teamId: string
  isMarketplace: boolean
  scope: string
  userId: string
  category: string
  language: string
  q: string
  ignore?: DistributionKind
}

function buildWhere(options: WhereOptions) {
  let where = "WHERE"
  const params: string[] = []

  if (options.teamId) {
    where += " s.team_id = ?"
    params.push(options.teamId)
  } else if (options.isMarketplace) {
    where += " s.visibility = 'public' AND s.team_id IS NULL"
  } else if (options.scope === "personal") {
    where += " s.owner_id = ? AND s.team_id IS NULL"
    params.push(options.userId)
  } else {
    where += " 1=1"
  }

  if (options.category && options.ignore !== "category") {
    where += " AND s.category = ?"
    params.push(options.category)
  }
  if (options.language && options.ignore !== "language") {
    where += " AND s.language = ?"
    params.push(options.language)
  }
  if (options.q) {
    where += " AND (LOWER(s.title) LIKE ? OR LOWER(s.description) LIKE ? OR LOWER(s.tags) LIKE ?)"
    const like = `%${options.q}%`
    params.push(like, like, like)
  }

  return { where, params }
}

function readDistribution(db: SqlJsDbType, column: DistributionKind, where: string, params: string[]) {
  const statement = db.prepare(
    `SELECT s.${column} AS value, COUNT(*) AS count
FROM scripts s
${where} AND COALESCE(s.${column}, '') <> ''
GROUP BY s.${column}`
  )
  statement.bind(params)
  const result: Record<string, number> = {}
  while (statement.step()) {
    const row = statement.getAsObject() as { value?: string; count?: number }
    if (row.value) result[row.value] = Number(row.count || 0)
  }
  statement.free()
  return result
}

function mapRow(row: any, opts: { includeReadme?: boolean } = {}) {
  const includeReadme = opts.includeReadme !== false
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
    readme: includeReadme ? (row.readme || "") : "",
    visibility: row.visibility || "private",
    publishedAt: row.published_at || undefined,
    installCount: Number(row.install_count || 0),
    githubUrl: row.github_url || undefined,
    ownerDisplayName: row.owner_display_name || "未知用户",
    ownerAvatarUrl: row.owner_avatar_url || "",
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
  const isMarketplace = scope === "marketplace"
  const whereOptions = { teamId, isMarketplace, scope, userId, category, language, q }
  const { where, params } = buildWhere(whereOptions)

  let orderBy = "ORDER BY s.created_at DESC"
  if (isMarketplace) {
    if (sort === "installs") orderBy = "ORDER BY s.install_count DESC, s.published_at DESC"
    else if (sort === "updated") orderBy = "ORDER BY s.updated_at DESC"
    else orderBy = "ORDER BY COALESCE(s.published_at, s.created_at) DESC"
  } else {
    if (sort === "oldest") orderBy = "ORDER BY s.created_at ASC"
    else if (sort === "name") orderBy = "ORDER BY s.title COLLATE NOCASE ASC"
  }

  const countStmt = db.prepare(`SELECT COUNT(*) AS c FROM scripts s ${where}`)
  countStmt.bind(params)
  countStmt.step()
  const total = Number((countStmt.getAsObject() as any).c || 0)
  countStmt.free()

  const offset = (page - 1) * pageSize
  const selectCols = isMarketplace
    ? `s.id, s.title, s.description, s.file_name, s.file_size, s.file_path, s.tags, s.icon, s.icon_color,
       s.category, s.language, s.owner_id, s.team_id, s.created_at, s.updated_at, s.visibility, s.published_at,
       s.install_count, s.github_url, '' AS readme, u.display_name AS owner_display_name, u.avatar_url AS owner_avatar_url`
    : `s.*, u.display_name AS owner_display_name, u.avatar_url AS owner_avatar_url`

  const listStmt = db.prepare(
    `SELECT ${selectCols}
FROM scripts s
LEFT JOIN users u ON u.id = s.owner_id
${where} ${orderBy} LIMIT ? OFFSET ?`
  )
  listStmt.bind([...params, pageSize, offset])
  const items: any[] = []
  while (listStmt.step()) {
    items.push(mapRow(listStmt.getAsObject(), { includeReadme: !isMarketplace }))
  }
  listStmt.free()

  const categoryWhere = buildWhere({ ...whereOptions, ignore: "category" })
  const languageWhere = buildWhere({ ...whereOptions, ignore: "language" })

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
    distributions: {
      category: readDistribution(db, "category", categoryWhere.where, categoryWhere.params),
      language: readDistribution(db, "language", languageWhere.where, languageWhere.params),
    },
  }
})
