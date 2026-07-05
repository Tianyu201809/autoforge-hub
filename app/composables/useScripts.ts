import type { Script, ScriptSort } from "~/types/workspace"

const API_BASE = "/api"

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
    throw new Error(data.message || "请求失败")
  }
  const data = await res.json()
  return data
}

export function useScripts() {
  const scripts = useState<Script[]>("workspace-scripts", () => [])

  async function loadScripts(scope = "personal", teamId?: string) {
    try {
      const query = teamId ? `?teamId=${teamId}` : `?scope=${scope}`
      const data = await apiFetch<any[]>(`/scripts${query}`)
      scripts.value = data.map(toScript)
    } catch {
      scripts.value = []
    }
  }

  function getPersonalScripts(userId: string): Script[] {
    return scripts.value.filter(s => s.ownerId === userId && !s.teamId)
  }

  function getTeamScripts(teamId: string): Script[] {
    return scripts.value.filter(s => s.teamId === teamId)
  }

  async function addScript(
    title: string,
    description: string,
    _zipName: string,
    _zipSize: number,
    tags: string[],
    ownerId: string,
    teamId?: string,
    file?: File,
  ): Promise<Script | null> {
    try {
      const formData = new FormData()
      formData.append("title", title)
      formData.append("description", description)
      formData.append("tags", JSON.stringify(tags))
      if (teamId) formData.append("teamId", teamId)
      if (file) formData.append("file", file)

      const token = localStorage.getItem("autoforge-token")
      const res = await fetch("/api/scripts", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "上传失败")

      if (data.script) {
        scripts.value.unshift(data.script)
        return data.script
      }
      return null
    } catch (err: any) {
      console.error("Upload error:", err)
      return null
    }
  }

  function deleteScript(id: string) {
    const token = localStorage.getItem("autoforge-token")
    fetch(`/api/scripts/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {})
    scripts.value = scripts.value.filter(s => s.id !== id)
  }

  function searchScripts(userId: string, query: string): Script[] {
    const personal = getPersonalScripts(userId)
    if (!query.trim()) return personal
    const q = query.trim().toLowerCase()
    return personal.filter(
      s => s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  function sortScripts(list: Script[], sort: ScriptSort): Script[] {
    const sorted = [...list]
    switch (sort) {
      case "newest": return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      case "oldest": return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      case "name": return sorted.sort((a, b) => a.title.localeCompare(b.title))
    }
  }

  function toScript(data: any): Script {
    return {
      id: data.id,
      title: data.title,
      description: data.description || "",
      zipName: data.zipName || data.file_name || "",
      zipSize: data.zipSize || data.file_size || 0,
      tags: data.tags || [],
      createdAt: data.createdAt || data.created_at || "",
      updatedAt: data.updatedAt || data.updated_at || "",
      ownerId: data.ownerId || data.owner_id || "",
      teamId: data.teamId || data.team_id || undefined,
    }
  }

  return {
    scripts, loadScripts, getPersonalScripts, getTeamScripts,
    addScript, deleteScript, searchScripts, sortScripts,
  }
}
