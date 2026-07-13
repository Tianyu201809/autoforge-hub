import type { MarketplaceSort, Script, ScriptListResult } from "~/types/workspace"

const PAGE_SIZE_DEFAULT = 30

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = import.meta.client ? localStorage.getItem("autoforge-token") : null
  const headers: Record<string, string> = {}
  if (options?.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json"
  }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`/api${url}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error((data as any).message || "请求失败"), {
      statusCode: res.status,
      data,
    })
  }
  return data as T
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
    zipSize: typeof data.zipSize === "number" ? data.zipSize : (typeof data.file_size === "number" ? data.file_size : 0),
    filePath: data.filePath ?? data.file_path ?? "",
    icon: data.icon || "file-archive",
    iconColor: data.iconColor ?? data.icon_color ?? undefined,
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: data.createdAt ?? data.created_at ?? "",
    updatedAt: data.updatedAt ?? data.updated_at ?? "",
    ownerId: data.ownerId ?? data.owner_id ?? "",
    teamId: data.teamId ?? data.team_id ?? undefined,
    ownerDisplayName: data.ownerDisplayName ?? data.owner_display_name ?? undefined,
    ownerAvatarUrl: data.ownerAvatarUrl ?? data.owner_avatar_url ?? undefined,
    visibility: data.visibility || "private",
    publishedAt: data.publishedAt ?? data.published_at ?? undefined,
    installCount: Number(data.installCount ?? data.install_count ?? 0),
  }
}

export function useMarketplace() {
  const items = useState<Script[]>("marketplace-items", () => [])
  const total = useState("marketplace-total", () => 0)
  const hasMore = useState("marketplace-has-more", () => false)
  const loading = useState("marketplace-loading", () => false)
  const loadingMore = useState("marketplace-loading-more", () => false)
  const error = useState("marketplace-error", () => "")
  const categoryTotal = useState("marketplace-cat-total", () => 0)
  const categoryCounts = useState<Record<string, number>>("marketplace-cat-counts", () => ({}))
  const page = useState("marketplace-page", () => 0)
  const query = useState<{ q: string; category: string; sort: MarketplaceSort }>(
    "marketplace-query",
    () => ({ q: "", category: "", sort: "newest" })
  )

  function qs(p: number) {
    const params = new URLSearchParams()
    params.set("scope", "marketplace")
    params.set("page", String(p))
    params.set("pageSize", String(PAGE_SIZE_DEFAULT))
    if (query.value.q.trim()) params.set("q", query.value.q.trim())
    if (query.value.category) params.set("category", query.value.category)
    params.set("sort", query.value.sort)
    return `?${params}`
  }

  async function loadCategories() {
    const data = await apiFetch<{ total: number; counts: Record<string, number> }>(
      "/scripts/marketplace/categories"
    )
    categoryTotal.value = data.total
    categoryCounts.value = data.counts || {}
  }

  async function loadList(next?: Partial<{ q: string; category: string; sort: MarketplaceSort }>) {
    query.value = { ...query.value, ...next }
    loading.value = true
    error.value = ""
    page.value = 1
    try {
      const data = await apiFetch<ScriptListResult>(`/scripts${qs(1)}`)
      items.value = (data.items || []).map(toScript)
      total.value = data.total
      hasMore.value = data.hasMore
      page.value = data.page
    } catch (e: any) {
      items.value = []
      error.value = e?.message || "加载失败"
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (!hasMore.value || loading.value || loadingMore.value) return
    loadingMore.value = true
    try {
      const nextPage = page.value + 1
      const data = await apiFetch<ScriptListResult>(`/scripts${qs(nextPage)}`)
      items.value = [...items.value, ...(data.items || []).map(toScript)]
      hasMore.value = data.hasMore
      page.value = data.page
    } catch (e: any) {
      error.value = e?.message || "加载失败"
    } finally {
      loadingMore.value = false
    }
  }

  async function publish(body: Record<string, unknown>) {
    return apiFetch<{ ok: boolean; id: string }>("/scripts/marketplace/publish", {
      method: "POST",
      body: JSON.stringify(body),
    })
  }

  async function unpublish(id: string) {
    return apiFetch<{ ok: boolean }>(`/scripts/${id}/unpublish`, { method: "POST" })
  }

  return {
    items,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    categoryTotal,
    categoryCounts,
    query,
    loadCategories,
    loadList,
    loadMore,
    publish,
    unpublish,
  }
}
