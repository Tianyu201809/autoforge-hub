import { getDb } from "../../db/index"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const db = await getDb()

  // Teams where user is owner or member
  const allTeams = db.exec("SELECT * FROM teams ORDER BY created_at DESC")[0]
  if (!allTeams) return []
  
  const userId = auth.user.userId
  const teams = allTeams.values
    .filter((row: any[]) => {
      const columns = allTeams.columns
      const ownerId = row[columns.indexOf("owner_id")]
      const memberIds = JSON.parse(row[columns.indexOf("member_ids")] || "[]")
      return ownerId === userId || memberIds.includes(userId)
    })
    .map((row: any[]) => {
      const columns = allTeams.columns
      const memberIds = JSON.parse(row[columns.indexOf("member_ids")] || "[]")
      return {
        id: row[columns.indexOf("id")],
        name: row[columns.indexOf("name")],
        description: row[columns.indexOf("description")],
        ownerId: row[columns.indexOf("owner_id")],
        memberCount: memberIds.length,
        icon: (row[columns.indexOf("icon")] as string) || "users",
        iconColor: (row[columns.indexOf("icon_color")] as string) || undefined,
        avatarUrl: (row[columns.indexOf("avatar_url")] as string) || "",
        createdAt: row[columns.indexOf("created_at")],
      }
    })

  return teams
})
