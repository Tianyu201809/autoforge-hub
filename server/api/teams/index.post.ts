import { getDb, saveDb } from "../../db/index"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const body = await readBody(event)
  const name = body?.name?.trim()
  const description = body?.description?.trim() || ""

  if (!name) throw createError({ statusCode: 400, message: "请输入团队名称" })
  if (name.length > 30) throw createError({ statusCode: 400, message: "团队名称不能超过 30 个字符" })

  const db = await getDb()
  const userId = auth.user.userId

  // Check max teams per user
  const allTeams = db.exec("SELECT * FROM teams WHERE owner_id = ?")[0]
  const ownedCount = allTeams ? allTeams.values.filter((r: any[]) => r[0]).length : 0
  if (ownedCount >= 5) throw createError({ statusCode: 400, message: "每个用户最多创建 5 个团队" })

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const memberIds = JSON.stringify([userId])
  const defaultSettings = JSON.stringify({
    adminIds: [],
    memberPermissions: { upload: true, edit: true, delete: false, download: true }
  })

  db.run(
    "INSERT INTO teams (id, name, description, owner_id, member_ids, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, name, description, userId, memberIds, defaultSettings, now, now]
  )
  saveDb()

  return {
    ok: true,
    team: { id, name, description, ownerId: userId, memberCount: 1, settings: JSON.parse(defaultSettings), createdAt: now }
  }
})
