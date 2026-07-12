import { getDb, saveDb } from "../../../db/index"
import { readFile, saveFile } from "../../../utils/storage"
import { createAuditLog } from "../../../utils/audit-log"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const scriptId = getRouterParam(event, "id")
  if (!scriptId) throw createError({ statusCode: 400, message: "缺少脚本 ID" })

  const userId = auth.user.userId
  const db = await getDb()

  // 1. Get source script
  const stmt = db.prepare("SELECT * FROM scripts WHERE id = ?")
  stmt.bind([scriptId])
  if (!stmt.step()) {
    stmt.free()
    throw createError({ statusCode: 404, message: "脚本不存在" })
  }
  const source = stmt.getAsObject() as any
  stmt.free()

  // 2. Must be a team script
  if (!source.team_id) {
    throw createError({ statusCode: 400, message: "只能复制团队空间的脚本" })
  }

  // 3. Verify user is a member of the source team
  const teamStmt = db.prepare("SELECT * FROM teams WHERE id = ?")
  teamStmt.bind([source.team_id])
  if (!teamStmt.step()) {
    teamStmt.free()
    throw createError({ statusCode: 404, message: "团队不存在" })
  }
  const team = teamStmt.getAsObject() as any
  teamStmt.free()
  const memberIds: string[] = JSON.parse(team.member_ids || "[]")
  if (team.owner_id !== userId && !memberIds.includes(userId)) {
    throw createError({ statusCode: 403, message: "你不是该团队成员" })
  }

  // 4. Check user doesn't already have a script with the same title in personal space
  const dupStmt = db.prepare("SELECT id FROM scripts WHERE owner_id = ? AND team_id IS NULL AND title = ?")
  dupStmt.bind([userId, source.title])
  if (dupStmt.step()) {
    dupStmt.free()
    throw createError({ statusCode: 409, message: `个人空间中已存在同名脚本「${source.title}」` })
  }
  dupStmt.free()

  // 5. Read the source file
  const fileBuffer = await readFile(source.file_path)
  if (!fileBuffer) {
    throw createError({ statusCode: 500, message: "无法读取源文件" })
  }

  // 6. Save file to user's personal storage
  const folder = `files/${userId}`
  const filePath = await saveFile(source.file_name, fileBuffer, folder)

  // 7. Create new script record (personal, no teamId)
  const newId = crypto.randomUUID()
  const now = new Date().toISOString()
  db.run(
    `INSERT INTO scripts (id, title, description, readme, file_name, file_size, file_path, tags, icon, icon_color, category, language, owner_id, team_id, created_at, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
    [
      newId,
      source.title,
      source.description,
      source.readme || "",
      source.file_name,
      source.file_size,
      filePath,
      source.tags,
      source.icon || "file-archive",
      source.icon_color,
      source.category || "",
      source.language || "",
      userId,
      now,
      now,
      userId,
    ]
  )
  saveDb()

  // 8. Write audit log
  const userStmt = db.prepare("SELECT display_name FROM users WHERE id = ?")
  userStmt.bind([userId])
  if (userStmt.step()) {
    const userRow = userStmt.getAsObject() as any
    createAuditLog(db, {
      teamId: source.team_id,
      userId,
      userName: userRow.display_name || auth.user.email,
      actionType: "copy",
      scriptId: newId,
      scriptName: source.title,
      details: { sourceScriptId: scriptId, action: "copy_to_personal" },
    })
    saveDb()
  }
  userStmt.free()

  return {
    ok: true,
    script: {
      id: newId,
      title: source.title,
      description: source.description,
      readme: source.readme || "",
      zipName: source.file_name,
      zipSize: source.file_size,
      icon: source.icon || "file-archive",
      tags: JSON.parse(source.tags || "[]"),
      category: source.category || "",
      language: source.language || "",
      ownerId: userId,
      teamId: null,
      createdAt: now,
      updatedAt: now,
    },
  }
})
