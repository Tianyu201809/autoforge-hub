import { checkDownloadQuota } from "../../utils/download-quota"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const result = await checkDownloadQuota(auth.user.userId)
  return { ok: true, used: result.used, limit: result.limit }
})
