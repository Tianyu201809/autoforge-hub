import { readFile } from "../../../utils/storage"

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, "filename")
  if (!raw) throw createError({ statusCode: 400, message: "Missing filename" })
  const name = decodeURIComponent(raw).replace(/^team-avatars\//, "")
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    throw createError({ statusCode: 400, message: "Invalid filename" })
  }
  const storedName = `team-avatars/${name}`
  const data = await readFile(storedName)
  if (!data) throw createError({ statusCode: 404, message: "File not found" })
  const ext = name.split(".").pop()?.toLowerCase() || ""
  const mimes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
  }
  setHeader(event, "Content-Type", mimes[ext] || "application/octet-stream")
  setHeader(event, "Cache-Control", "public, max-age=31536000")
  return new Uint8Array(data)
})
