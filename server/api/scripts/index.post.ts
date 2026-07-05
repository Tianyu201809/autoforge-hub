import { getDb, saveDb } from "../../db/index"
import { saveFile } from "../../utils/storage"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const formData = await readMultipartFormData(event)
  if (!formData) throw createError({ statusCode: 400, message: "无效的上传数据" })

  const getField = (name: string): string => {
    const field = formData.find(f => f.name === name)
    if (!field || !field.data) return ""
    return Buffer.from(field.data).toString("utf-8")
  }

  const title = getField("title").trim()
  const description = getField("description").trim()
  const tagsRaw = getField("tags")
  const category = getField("category") || ""
  const language = getField("language") || ""
  const teamId = getField("teamId") || null
  const fileField = formData.find(f => f.name === "file")

  if (!title) throw createError({ statusCode: 400, message: "请输入脚本名称" })
  if (!fileField || !fileField.data || !fileField.filename) {
    throw createError({ statusCode: 400, message: "请选择要上传的 .zip 文件" })
  }

  const filename = fileField.filename
  if (!filename.endsWith(".zip")) {
    throw createError({ statusCode: 400, message: "仅支持 .zip 格式的脚本包" })
  }

  const tags: string[] = tagsRaw ? JSON.parse(tagsRaw) : []
  const filePath = saveFile(filename, fileField.data)
  const userId = auth.user.userId

  const db = await getDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  db.run(
    "INSERT INTO scripts (id, title, description, file_name, file_size, file_path, tags, owner_id, team_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    "INSERT INTO scripts (id, title, description, file_name, file_size, file_path, tags, category, language, owner_id, team_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, title, description, filename, fileField.data.length, filePath, JSON.stringify(tags), category, language, userId, teamId, now, now]
  )
  saveDb()

  return {
    ok: true,
    script: {
      id, title, description, zipName: filename, zipSize: fileField.data.length,
      tags, category, language, ownerId: userId, teamId, createdAt: now, updatedAt: now
    }
  }
})
