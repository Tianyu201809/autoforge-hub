import type { AuditLog } from "~/types/workspace"

const API_BASE = "/api"

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = import.meta.client ? localStorage.getItem("autoforge-token") : null
  const headers: Record<string, string> = {}
  if (options?.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json"
  }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || "请求失败")
  return data
}

export function useAuditLogs() {
  const logs = useState<AuditLog[]>("team-audit-logs", () => [])
  const loading = ref(false)
  const total = ref(0)
  const totalPages = ref(1)
  const currentPage = ref(1)

  const PAGE_SIZE = 20

  async function loadLogs(teamId: string, options?: {
    page?: number
    actionType?: string
  }) {
    loading.value = true
    try {
      const page = options?.page || currentPage.value
      const actionType = options?.actionType || ""
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      })
      if (actionType) query.set("action_type", actionType)

      const data = await apiFetch<{
        ok: boolean
        logs: AuditLog[]
        total: number
        page: number
        totalPages: number
      }>(`/teams/${teamId}/logs?${query}`)

      logs.value = data.logs
      total.value = data.total
      totalPages.value = data.totalPages
      currentPage.value = data.page
    } catch (err) {
      console.error("[useAuditLogs] loadLogs error:", err)
      logs.value = []
      total.value = 0
      totalPages.value = 1
    } finally {
      loading.value = false
    }
  }

  function setPage(page: number) {
    currentPage.value = page
  }

  return {
    logs,
    loading,
    total,
    totalPages,
    currentPage,
    PAGE_SIZE,
    loadLogs,
    setPage,
  }
}
