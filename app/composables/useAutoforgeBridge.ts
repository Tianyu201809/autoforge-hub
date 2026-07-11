const BRIDGE_BASE = "http://127.0.0.1:19276"
const HEALTH_TIMEOUT_MS = 1000

export type BridgeInstallResult =
  | { ok: true; scriptId: string; name: string }
  | { ok: false; status?: number; error?: string; message: string }

export function useAutoforgeBridge() {
  async function checkHealth(): Promise<boolean> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
    try {
      const res = await fetch(`${BRIDGE_BASE}/health`, {
        method: "GET",
        signal: controller.signal,
      })
      if (!res.ok) return false
      const data = await res.json().catch(() => null)
      return !!(data && data.ok === true)
    } catch {
      return false
    } finally {
      clearTimeout(timer)
    }
  }

  async function installScript(body: {
    zipUrl: string
    scriptName?: string
    hubScriptId?: string
  }): Promise<BridgeInstallResult> {
    try {
      const res = await fetch(`${BRIDGE_BASE}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({} as any))
      if (res.ok && data?.ok) {
        return {
          ok: true,
          scriptId: data.scriptId as string,
          name: (data.name as string) || body.scriptName || "",
        }
      }
      return {
        ok: false,
        status: res.status,
        error: data?.error as string | undefined,
        message: mapInstallError(res.status, data),
      }
    } catch {
      return { ok: false, message: "添加失败，请重试" }
    }
  }

  return { checkHealth, installScript }
}

function mapInstallError(status: number, data: any): string {
  if (typeof data?.message === "string" && data.message) return data.message
  if (status === 409 || data?.error === "busy") return "正在安装，请稍候"
  if (status === 502 || data?.error === "download_failed") return "下载失败，请重试"
  if (status === 400 || data?.error === "invalid_package") {
    return "不是有效的 Autoforge 脚本包"
  }
  return "添加失败，请重试"
}
