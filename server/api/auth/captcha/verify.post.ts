import { verifyCaptchaToken } from "./generate.post"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = body?.token
  const position = body?.position

  if (!token || typeof token !== "string") {
    throw createError({ statusCode: 400, message: "缺少验证码标识" })
  }
  if (typeof position !== "number" || position < 0 || position > 100) {
    throw createError({ statusCode: 400, message: "验证码位置无效" })
  }

  const result = verifyCaptchaToken(token, position)
  if (!result.ok) {
    const messages: Record<string, string> = {
      invalid_or_expired: "验证码已失效，请重新验证",
      expired: "验证码已过期，请重新验证",
      position_mismatch: "验证未通过，请重新拖动滑块",
    }
    throw createError({ statusCode: 400, message: messages[result.reason ?? ""] ?? "验证失败" })
  }

  return { ok: true }
})
