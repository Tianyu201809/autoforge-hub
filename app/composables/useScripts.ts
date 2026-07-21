import type { Script, ScriptDistributions, ScriptListQuery, ScriptListResult } from "~/types/workspace"

const API_BASE = "/api"
const PAGE_SIZE_DEFAULT = 30

function emptyDistributions(): ScriptDistributions {
  return { category: {}, language: {} }
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = import.meta.client ? localStorage.getItem("autoforge-token") : null
  const headers: Record<string, string> = {}
  if (options?.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json"
  }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error(data.message || "请求失败"), { statusCode: res.status, data })
  }
  const data = await res.json()
  return data
}

function toScript(data: any): Script {
  return {
    id: data.id,
    title: data.title,
    description: data.description || "",
    readme: data.readme || "",
    category: data.category || "",
    language: data.language || "",
    zipName: data.zipName ?? data.file_name ?? "",
    zipSize: (typeof data.zipSize === "number" ? data.zipSize : (typeof data.file_size === "number" ? data.file_size : 0)),
    filePath: data.filePath ?? data.file_path ?? "",
    icon: data.icon || "file-archive",
    iconColor: data.iconColor ?? data.icon_color ?? undefined,
    tags: (Array.isArray(data.tags) ? data.tags : []),
    createdAt: data.createdAt ?? data.created_at ?? "",
    updatedAt: data.updatedAt ?? data.updated_at ?? "",
    ownerId: data.ownerId ?? data.owner_id ?? "",
    teamId: data.teamId ?? data.team_id ?? undefined,
    ownerDisplayName: data.ownerDisplayName ?? data.owner_display_name ?? undefined,
    ownerAvatarUrl: data.ownerAvatarUrl ?? data.owner_avatar_url ?? undefined,
    githubUrl: data.githubUrl ?? data.github_url ?? undefined,
    updatedBy: data.updatedBy ?? data.updated_by ?? undefined,
    updaterDisplayName: data.updaterDisplayName ?? data.updater_display_name ?? undefined,
    updaterAvatarUrl: data.updaterAvatarUrl ?? data.updater_avatar_url ?? undefined,
    visibility: data.visibility || "private",
    publishedAt: data.publishedAt ?? data.published_at ?? undefined,
    installCount: Number(data.installCount ?? data.install_count ?? 0),
  }
}

export function useScripts() {
  const scripts = useState<Script[]>("workspace-scripts", () => [])
  const total = useState<number>("workspace-scripts-total", () => 0)
  const hasMore = useState<boolean>("workspace-scripts-has-more", () => false)
  const distributions = useState<ScriptDistributions>("workspace-script-distributions", emptyDistributions)
  const listLoading = useState<boolean>("workspace-scripts-loading", () => false)
  const listLoadingMore = useState<boolean>("workspace-scripts-loading-more", () => false)
  const listError = useState<string>("workspace-scripts-error", () => "")
  const currentQuery = useState<ScriptListQuery>("workspace-scripts-query", () => ({}))
  const currentPage = useState<number>("workspace-scripts-page", () => 0)

  function buildQueryString(query: ScriptListQuery, page: number): string {
    const params = new URLSearchParams()
    if (query.teamId) params.set("teamId", query.teamId)
    else params.set("scope", query.scope || "personal")
    params.set("page", String(page))
    params.set("pageSize", String(query.pageSize || PAGE_SIZE_DEFAULT))
    if (query.q?.trim()) params.set("q", query.q.trim())
    if (query.category) params.set("category", query.category)
    if (query.language) params.set("language", query.language)
    if (query.sort) params.set("sort", query.sort)
    return `?${params.toString()}`
  }

  async function loadScripts(query: ScriptListQuery = {}): Promise<void> {
    listLoading.value = true
    listError.value = ""
    currentQuery.value = { ...query }
    currentPage.value = 1
    try {
      const data = await apiFetch<ScriptListResult>(
        `/scripts${buildQueryString(query, 1)}`
      )
      scripts.value = (data.items || []).map(toScript)
      total.value = data.total
      hasMore.value = data.hasMore
      distributions.value = data.distributions || emptyDistributions()
      currentPage.value = data.page
    } catch (err: any) {
      console.error("[useScripts] loadScripts error:", err)
      scripts.value = []
      total.value = 0
      hasMore.value = false
      distributions.value = emptyDistributions()
      listError.value = err?.message || "加载失败"
    } finally {
      listLoading.value = false
    }
  }

  async function loadMoreScripts(): Promise<void> {
    if (!hasMore.value || listLoading.value || listLoadingMore.value) return
    listLoadingMore.value = true
    listError.value = ""
    const nextPage = currentPage.value + 1
    try {
      const data = await apiFetch<ScriptListResult>(
        `/scripts${buildQueryString(currentQuery.value, nextPage)}`
      )
      const mapped = (data.items || []).map(toScript)
      scripts.value = [...scripts.value, ...mapped]
      total.value = data.total
      hasMore.value = data.hasMore
      distributions.value = data.distributions || emptyDistributions()
      currentPage.value = data.page
    } catch (err: any) {
      console.error("[useScripts] loadMoreScripts error:", err)
      listError.value = err?.message || "加载更多失败"
    } finally {
      listLoadingMore.value = false
    }
  }

  function patchScript(id: string, patch: Partial<Script>) {
    const idx = scripts.value.findIndex(s => s.id === id)
    if (idx >= 0) {
      scripts.value[idx] = { ...scripts.value[idx], ...patch }
    }
  }

  function removeScriptLocal(id: string) {
    const removedScript = scripts.value.find(script => script.id === id)
    const before = scripts.value.length
    scripts.value = scripts.value.filter(s => s.id !== id)
    if (scripts.value.length < before) {
      total.value = Math.max(0, total.value - 1)
      hasMore.value = scripts.value.length < total.value

      if (removedScript) {
        const nextDistributions = {
          category: { ...distributions.value.category },
          language: { ...distributions.value.language },
        }
        for (const kind of ["category", "language"] as const) {
          const value = removedScript[kind]
          if (!value || !nextDistributions[kind][value]) continue
          const nextCount = nextDistributions[kind][value] - 1
          if (nextCount > 0) nextDistributions[kind][value] = nextCount
          else delete nextDistributions[kind][value]
        }
        distributions.value = nextDistributions
      }
    }
  }

  async function addScript(
    title: string,
    description: string,
    tags: string[],
    category: string,
    language: string,
    icon: string,
    zipFile: File,
    teamId?: string,
    iconColor?: string,
    readme = "",
  ): Promise<Script | null> {
    try {
      const formData = new FormData()
      formData.append("title", title)
      formData.append("description", description)
      formData.append("readme", readme)
      formData.append("tags", JSON.stringify(tags))
      formData.append("category", category)
      formData.append("language", language)
      formData.append("icon", icon)
      if (iconColor) formData.append("iconColor", iconColor)
      if (teamId) formData.append("teamId", teamId)
      formData.append("file", zipFile)

      const token = localStorage.getItem("autoforge-token")
      const res = await fetch("/api/scripts", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "上传失败")

      if (data.script) {
        return toScript(data.script)
      }
      return null
    } catch (err: any) {
      console.error("Upload error:", err)
      return null
    }
  }

  async function fetchScript(id: string): Promise<Script> {
    const data = await apiFetch<any>(`/scripts/${id}`)
    return toScript(data)
  }

  function deleteScript(id: string) {
    const token = localStorage.getItem("autoforge-token")
    fetch(`/api/scripts/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {})
    removeScriptLocal(id)
  }

  return {
    scripts,
    total,
    hasMore,
    distributions,
    listLoading,
    listLoadingMore,
    listError,
    currentQuery,
    loadScripts,
    loadMoreScripts,
    addScript,
    deleteScript,
    patchScript,
    fetchScript,
  }
}
