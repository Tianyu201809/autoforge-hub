export async function sendPasswordResetCode(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM?.trim()

  if (!apiKey || !from) {
    throw createError({
      statusCode: 500,
      message: '邮件服务未配置，请设置 RESEND_API_KEY 与 RESEND_FROM',
    })
  }

  const subject = 'Autoforge Hub 密码重置验证码'
  const text = `你的密码重置验证码是：${code}\n\n验证码 10 分钟内有效。如非本人操作，请忽略此邮件。`
  const html = `<p>你的密码重置验证码是：</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>验证码 <strong>10 分钟</strong>内有效。如非本人操作，请忽略此邮件。</p>`

  let res: Response
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [email], subject, text, html }),
    })
  } catch (err) {
    console.error('[email] Resend fetch failed:', err)
    throw createError({ statusCode: 502, message: '发送失败，请稍后重试' })
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[email] Resend failed:', res.status, body)
    throw createError({ statusCode: 502, message: '发送失败，请稍后重试' })
  }
}
