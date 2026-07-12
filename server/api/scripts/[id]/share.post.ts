import { getDb, saveDb } from "../../../db/index"
import { readFile, saveFile } from "../../../utils/storage"
import { createAuditLog } from "../../../utils/audit-log"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const scriptId = getRouterParam(event, "id")
  if (!scriptId) throw createError({ statusCode: 400, message: "缺少脚本 ID" })

  const body = await readBody(event)
  const teamId = body?.teamId as string | undefined
  if (!teamId) throw createError({ statusCode: 400, message: "请选择目标团队" })

  const userId = auth.user.userId
  const db = await getDb()

  // 1. Get source script (must be personal: team_id IS NULL, owned by user)
  const stmt = db.prepare("SELECT * FROM scripts WHERE id = ? AND team_id IS NULL")
  stmt.bind([scriptId])
  if (!stmt.step()) {
    stmt.free()
    throw createError({ statusCode: 400, message: "只能分享个人空间的脚本" })
  }
  const source = stmt.getAsObject() as any
  stmt.free()

  if (source.owner_id !== userId) {
    throw createError({ statusCode: 403, message: "无权操作此脚本" })
  }

  // 2. Verify target team exists and user is a member
  const teamStmt = db.prepare("SELECT * FROM teams WHERE id = ?")
  teamStmt.bind([teamId])
  if (!teamStmt.step()) {
    teamStmt.free()
    throw createError({ statusCode: 404, message: "目标团队不存在" })
  }
  const team = teamStmt.getAsObject() as any
  teamStmt.free()
  const memberIds: string[] = JSON.parse(team.member_ids || "[]")
  if (team.owner_id !== userId && !memberIds.includes(userId)) {
    throw createError({ statusCode: 403, message: "你不是目标团队成员" })
  }

  // 3. Check for duplicate title in target team
  const dupStmt = db.prepare("SELECT id FROM scripts WHERE team_id = ? AND title = ?")
  dupStmt.bind([teamId, source.title])
  if (dupStmt.step()) {
    dupStmt.free()
    throw createError({ statusCode: 409, message: `团队「${team.name}」中已存在同名脚本「${source.title}」` })
  }
  dupStmt.free()

  // 4. Read source file and save to team storage
  const fileBuffer = await readFile(source.file_path)
  if (!fileBuffer) {
    throw createError({ statusCode: 500, message: "无法读取源文件" })
  }
  const folder = `files/${teamId}`
  const filePath = await saveFile(source.file_name, fileBuffer, folder)

  // 5. Create new script record (team script)
  const newId = crypto.randomUUID()
  const now = new Date().toISOString()
  db.run(
    `INSERT INTO scripts (id, title, description, readme, file_name, file_size, file_path, tags, icon, icon_color, category, language, owner_id, team_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      teamId,
      now,
      now,
    ]
  )
  saveDb()

  // 6. Write audit log
  const userStmt = db.prepare("SELECT display_name FROM users WHERE id = ?")
  userStmt.bind([userId])
  if (userStmt.step()) {
    const userRow = userStmt.getAsObject() as any
    createAuditLog(db, {
      teamId,
      userId,
      userName: userRow.display_name || auth.user.email || "Unknown",
      actionType: "upload",
      scriptId: newId,
      scriptName: source.title,
      details: { sourceScriptId: scriptId, action: "share_from_personal" },
    })
  }
  userStmt.free()

  return { ok: true, script: { id: newId, title: source.title } }
})
