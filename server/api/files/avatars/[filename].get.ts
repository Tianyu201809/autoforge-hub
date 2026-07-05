import { getFilePath } from "../../../utils/storage"
import { readFileSync, existsSync } from "fs"

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, "filename")
  if (!filename) throw createError({ statusCode: 400, message: "Missing filename" })
  const filePath = getFilePath(filename)
  if (!existsSync(filePath)) throw createError({ statusCode: 404, message: "File not found" })
  const data = readFileSync(filePath)
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  const mimes = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" }
  setHeader(event, "Content-Type", mimes[ext] || "application/octet-stream")
  setHeader(event, "Cache-Control", "public, max-age=31536000")
  return new Uint8Array(data)
})
