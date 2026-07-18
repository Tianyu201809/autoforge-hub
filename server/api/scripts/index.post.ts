import { getDb, saveDb } from "../../db/index"
import { saveFile } from "../../utils/storage"
import { parseSettings, checkMemberPermission } from "../../utils/team-permissions"
import { createAuditLog } from "../../utils/audit-log"
import { extractRootReadme } from "#shared/utils/zip-readme"

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
  let readme = getField("readme")
  const tagsRaw = getField("tags")
  const category = getField("category") || ""
  const language = getField("language") || ""
  const teamId = getField("teamId") || null
  const fileField = formData.find(f => f.name === "file")

  if (!title) throw createError({ statusCode: 400, message: "Please enter a script name" })
  if (readme.length > 50000) {
    throw createError({ statusCode: 400, message: "说明书过长（最多 50000 字符）" })
  }
  if (!fileField || !fileField.data || !fileField.filename) {
    throw createError({ statusCode: 400, message: "Please select a .zip file" })
  }

  const filename = fileField.filename
  if (!filename.endsWith(".zip")) {
    throw createError({ statusCode: 400, message: "Only .zip format is supported" })
  }

  if (!readme.trim()) {
    try {
      readme = extractRootReadme(fileField.data) || ""
    } catch (error) {
      console.warn("[scripts] failed to extract root README.md:", error)
    }
  }
  if (readme.length > 50000) {
    throw createError({ statusCode: 400, message: "README is too long (maximum 50000 characters)" })
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
  const iconColor = getField("iconColor") || null
  const folder = teamId ? `files/${teamId}` : `files/${userId}`
  const filePath = await saveFile(filename, fileField.data, folder)

  const db = await getDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  db.run(
    "INSERT INTO scripts (id, title, description, readme, file_name, file_size, file_path, tags, icon, icon_color, category, language, owner_id, team_id, created_at, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, title, description, readme, filename, fileField.data.length, filePath, JSON.stringify(tags), icon, iconColor, category, language, userId, teamId, now, now, userId]
  )
  saveDb()

  // Write audit log for team upload
  if (teamId) {
    const userStmt = db.prepare("SELECT display_name FROM users WHERE id = ?")
    userStmt.bind([userId])
    if (userStmt.step()) {
      const userRow = userStmt.getAsObject() as any
      createAuditLog(db, {
        teamId,
        userId,
        userName: userRow.display_name || auth.user.email,
        actionType: "upload",
        scriptId: id,
        scriptName: title,
      })
      saveDb()
    }
    userStmt.free()
  }

  return {
    ok: true,
    script: {
      id, title, description, zipName: filename, zipSize: fileField.data.length,
      icon, iconColor, tags, category, language, ownerId: userId, teamId, createdAt: now, updatedAt: now, readme
    }
  }
})
