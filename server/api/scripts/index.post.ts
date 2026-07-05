import { getDb, saveDb } from "../../db/index"
import { saveFile } from "../../utils/storage"
import { parseSettings, getTeamRole, checkMemberPermission } from "../../utils/team-permissions"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "Not logged in" })

  const formData = await readMultipartFormData(event)
  if (!formData) throw createError({ statusCode: 400, message: "Invalid upload data" })

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

  if (!title) throw createError({ statusCode: 400, message: "Please enter a script name" })
  if (!fileField || !fileField.data || !fileField.filename) {
    throw createError({ statusCode: 400, message: "Please select a .zip file" })
  }

  const filename = fileField.filename
  if (!filename.endsWith(".zip")) {
    throw createError({ statusCode: 400, message: "Only .zip format is supported" })
  }

  const userId = auth.user.userId

  // If uploading to a team, check permission
  if (teamId) {
    const db = await getDb()
    const teamStmt = db.prepare("SELECT * FROM teams WHERE id = ?")
    teamStmt.bind([teamId])
    if (!teamStmt.step()) { teamStmt.free(); throw createError({ statusCode: 404, message: "Team not found" }) }
    const team = teamStmt.getAsObject() as any
    teamStmt.free()
    const memberIds: string[] = JSON.parse(team.member_ids || "[]")
    if (team.owner_id !== userId && !memberIds.includes(userId)) {
      throw createError({ statusCode: 403, message: "你不是该团队成员" })
    }
    const teamSettings = parseSettings(team.settings)
    if (!checkMemberPermission(teamSettings, userId, team.owner_id, "upload")) {
      throw createError({ statusCode: 403, message: "没有上传脚本的权限" })
    }
  }

  const tags: string[] = tagsRaw ? JSON.parse(tagsRaw) : []
  const icon = getField("icon") || "file-archive"
  const folder = teamId ? `files/${teamId}` : `files/${userId}`
  const filePath = await saveFile(filename, fileField.data, folder)

  const db = await getDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  db.run(
    "INSERT INTO scripts (id, title, description, file_name, file_size, file_path, tags, icon, category, language, owner_id, team_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, title, description, filename, fileField.data.length, filePath, JSON.stringify(tags), icon, category, language, userId, teamId, now, now]
  )
  saveDb()

  return {
    ok: true,
    script: {
      id, title, description, zipName: filename, zipSize: fileField.data.length,
      icon, tags, category, language, ownerId: userId, teamId, createdAt: now, updatedAt: now
    }
  }
})
