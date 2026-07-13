import { getDb, saveDb } from "../../../db/index"
import { getFilePath, readFile } from "../../../utils/storage"
import { readFileSync, existsSync } from "fs"
import { parseSettings, checkMemberPermission } from "../../../utils/team-permissions"
import { verifyCaptchaToken } from "../../auth/captcha/generate.post"
import { checkDownloadQuota, incrementDownloadQuota } from "../../../utils/download-quota"
import { peekInstallToken, consumeInstallToken } from "../../../utils/install-token"
import { isPublicScript } from "../../../utils/script-access"

export default defineEventHandler(async (event) => {
  try {
    return await handleDownload(event)
  } catch (err: any) {
    console.error('[download-server]', err)
    // Re-throw known H3 errors as-is
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: err.message || '下载失败' })
  }
})

async function handleDownload(event: any) {
  const scriptId = getRouterParam(event, "id")
  if (!scriptId) throw createError({ statusCode: 400, message: "缺少脚本 ID" })

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM scripts WHERE id = ?")
  stmt.bind([scriptId])
  if (!stmt.step()) {
    stmt.free()
    throw createError({ statusCode: 404, message: "脚本不存在" })
  }
  const row = stmt.getAsObject() as any
  stmt.free()

  const query = getQuery(event)
  const installToken = query.installToken as string | undefined

  let userId: string

  if (installToken) {
    const peeked = peekInstallToken(installToken, scriptId)
    if (!peeked) {
      throw createError({ statusCode: 401, message: "安装链接无效或已过期" })
    }
    userId = peeked.userId

    const quota = await checkDownloadQuota(userId)
    if (!quota.ok) {
      throw createError({
        statusCode: 429,
        message: `今日下载次数已达上限（${quota.used}/${quota.limit}）`,
        data: { used: quota.used, limit: quota.limit },
      })
    }

    const consumed = consumeInstallToken(installToken, scriptId)
    if (!consumed) {
      throw createError({ statusCode: 401, message: "安装链接无效或已过期" })
    }

    db.run(
      "UPDATE scripts SET install_count = COALESCE(install_count, 0) + 1 WHERE id = ?",
      [scriptId]
    )
    saveDb()

    const remaining = await incrementDownloadQuota(userId, scriptId)
    // Proxy bytes through Hub — do not 302 to OSS (private bucket / Referer anti-leech → 403 for Autoforge)
    return await serveScriptFile(event, row, remaining, {
      cacheControl: "private, no-store",
      proxy: true,
    })
  }

  // ── Existing authenticated + captcha path ──
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })
  userId = auth.user.userId

  // Check access
  if (row.team_id) {
    // Team script
    const teamStmt = db.prepare("SELECT * FROM teams WHERE id = ?")
    teamStmt.bind([row.team_id])
    if (!teamStmt.step()) { teamStmt.free(); throw createError({ statusCode: 404, message: "团队不存在" }) }
    const team = teamStmt.getAsObject() as any
    teamStmt.free()
    const memberIds: string[] = JSON.parse(team.member_ids || "[]")

    // Must be a member
    if (team.owner_id !== userId && !memberIds.includes(userId)) {
      throw createError({ statusCode: 403, message: "你不是该团队成员" })
    }

    const teamSettings = parseSettings(team.settings)
    if (!checkMemberPermission(teamSettings, userId, team.owner_id, "download")) {
      throw createError({ statusCode: 403, message: "没有下载权限" })
    }
  } else if (!isPublicScript(row) && row.owner_id !== userId) {
    throw createError({ statusCode: 403, message: "无权限下载" })
  }

  // ── Captcha verification ──
  const captchaToken = query.captchaToken as string | undefined
  const captchaPosition = query.captchaPosition as string | undefined

  if (!captchaToken || captchaPosition === undefined) {
    throw createError({ statusCode: 400, message: "请完成安全验证" })
  }

  const captchaResult = verifyCaptchaToken(captchaToken, Number(captchaPosition))
  if (!captchaResult.ok) {
    const messages: Record<string, string> = {
      invalid_or_expired: "验证已失效，请重新验证",
      expired: "验证已过期，请重新验证",
      position_mismatch: "验证失败，请重试",
    }
    throw createError({
      statusCode: 400,
      message: messages[captchaResult.reason ?? ""] ?? "安全验证失败",
    })
  }

  // ── Download quota check ──
  const quota = await checkDownloadQuota(userId)
  if (!quota.ok) {
    throw createError({
      statusCode: 429,
      message: `今日下载次数已达上限（${quota.used}/${quota.limit}）`,
      data: { used: quota.used, limit: quota.limit },
    })
  }

  // ── Record download & serve file ──
  const remaining = await incrementDownloadQuota(userId, scriptId)
  return await serveScriptFile(event, row, remaining)
}

async function serveScriptFile(
  event: any,
  row: any,
  remaining: number,
  options: { cacheControl?: string; proxy?: boolean } = {}
) {
  const cacheControl = options.cacheControl ?? "public, max-age=31536000"
  const filename = row.file_name || "script.zip"

  // Autoforge (and other non-browser clients) must receive the zip body from Hub.
  // Redirecting to a raw OSS URL often yields HTTP 403 (private ACL / Referer hotlink rules).
  if (options.proxy) {
    const data = await readFile(row.file_path)
    if (!data) throw createError({ statusCode: 404, message: "文件不存在" })
    setHeader(event, "Content-Type", "application/zip")
    setHeader(event, "Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`)
    setHeader(event, "Cache-Control", cacheControl)
    setHeader(event, "X-Remaining-Downloads", String(remaining))
    return new Uint8Array(data)
  }

  const filePath = getFilePath(row.file_path)
  if (filePath.startsWith("http")) {
    return sendRedirect(event, filePath, 302)
  }

  if (!existsSync(filePath)) throw createError({ statusCode: 404, message: "文件不存在" })
  const data = readFileSync(filePath)
  setHeader(event, "Content-Type", "application/zip")
  setHeader(event, "Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`)
  setHeader(event, "Cache-Control", cacheControl)
  setHeader(event, "X-Remaining-Downloads", String(remaining))
  return new Uint8Array(data)
}

