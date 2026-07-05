import { getDb, saveDb } from "../../db/index"
import { saveFile } from "../../utils/storage"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "Not logged in" })
  const formData = await readMultipartFormData(event)
  if (!formData) throw createError({ statusCode: 400, message: "Invalid upload" })
  const fileField = formData.find(f => f.name === "file")
  if (!fileField || !fileField.data || !fileField.filename) {
    throw createError({ statusCode: 400, message: "Please select an image" })
  }
  const allowed = ["png", "jpg", "jpeg", "gif", "webp"]
  const ext = (fileField.filename.split(".").pop() || "").toLowerCase()
  if (!allowed.includes(ext)) throw createError({ statusCode: 400 })
  const storedName = await saveFile("avatar-" + fileField.filename, fileField.data, "avatars")
  const db = await getDb()
  const now = new Date().toISOString()
  db.run("UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?", [storedName, now, auth.user.userId])
  saveDb()
  return { ok: true, avatarUrl: storedName }
})
