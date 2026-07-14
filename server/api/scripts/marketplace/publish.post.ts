import { getDb, saveDb } from "../../../db/index"
import { MARKETPLACE_CATEGORIES } from "../../../utils/marketplace-categories"

function normalizeGithubUrl(value: unknown) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw createError({ statusCode: 400, message: "请输入有效的 GitHub 地址" })
  }
  const hostname = parsed.hostname.toLowerCase()
  if (!["github.com", "www.github.com"].includes(hostname) || !["http:", "https:"].includes(parsed.protocol)) {
    throw createError({ statusCode: 400, message: "请输入 github.com 的 http(s) 地址" })
  }
  const pathname = parsed.pathname.replace(/\/+$/, "")
  if (!pathname || pathname === "/") {
    throw createError({ statusCode: 400, message: "GitHub 地址需要包含仓库路径" })
  }
  return `${parsed.protocol}//${hostname}${pathname}`
}

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const body = await readBody(event)
  const scriptId = String(body?.scriptId || "")
  if (!scriptId) throw createError({ statusCode: 400, message: "缺少 scriptId" })

  const category = String(body?.category || "").trim()
  if (!category || !(MARKETPLACE_CATEGORIES as readonly string[]).includes(category)) {
    throw createError({ statusCode: 400, message: "请选择有效分类" })
  }

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM scripts WHERE id = ?")
  stmt.bind([scriptId])
  if (!stmt.step()) {
    stmt.free()
    throw createError({ statusCode: 404, message: "脚本不存在" })
  }
  const row = stmt.getAsObject() as any
  stmt.free()

  if (row.team_id) {
    throw createError({ statusCode: 400, message: "团队脚本不能直接上架，请使用个人空间脚本" })
  }
  if (row.owner_id !== auth.user.userId) {
    throw createError({ statusCode: 403, message: "只能上架自己的脚本" })
  }
  if ((row.visibility || "private") === "public") {
    throw createError({ statusCode: 409, message: "已在集市中", data: { scriptId } })
  }

  const title = String(body?.title ?? row.title).trim()
  const description = String(body?.description ?? row.description ?? "").trim()
  const readme = String(body?.readme ?? row.readme ?? "")
  if (!title) throw createError({ statusCode: 400, message: "标题不能为空" })
  if (!row.file_path) throw createError({ statusCode: 400, message: "脚本缺少安装包" })

  const tags = Array.isArray(body?.tags) ? body.tags : JSON.parse(row.tags || "[]")
  const icon = body?.icon || row.icon || "file-archive"
  const iconColor = body?.iconColor ?? row.icon_color ?? null
  const language = String(body?.language ?? row.language ?? "").trim()
  const githubUrl = normalizeGithubUrl(body?.githubUrl ?? row.github_url ?? "")
  const now = new Date().toISOString()

  db.run(
    `UPDATE scripts SET title = ?, description = ?, readme = ?, tags = ?, icon = ?, icon_color = ?,
      category = ?, language = ?, github_url = ?, visibility = 'public', published_at = ?, updated_at = ?, updated_by = ?
     WHERE id = ?`,
    [
      title, description, readme, JSON.stringify(tags), icon, iconColor,
      category, language, githubUrl, now, now, auth.user.userId, scriptId,
    ]
  )
  saveDb()

  return { ok: true, id: scriptId }
})
