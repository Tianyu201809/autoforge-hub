import { getDb } from "../../../db/index"
import { MARKETPLACE_CATEGORIES } from "../../../utils/marketplace-categories"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const db = await getDb()
  const totalStmt = db.prepare(
    "SELECT COUNT(*) AS c FROM scripts WHERE visibility = 'public' AND team_id IS NULL"
  )
  totalStmt.step()
  const total = Number((totalStmt.getAsObject() as any).c || 0)
  totalStmt.free()

  const counts: Record<string, number> = {}
  for (const cat of MARKETPLACE_CATEGORIES) {
    const st = db.prepare(
      "SELECT COUNT(*) AS c FROM scripts WHERE visibility = 'public' AND team_id IS NULL AND category = ?"
    )
    st.bind([cat])
    st.step()
    counts[cat] = Number((st.getAsObject() as any).c || 0)
    st.free()
  }

  return { total, counts }
})
