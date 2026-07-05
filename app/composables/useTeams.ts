import type { Team } from "~/types/workspace"

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

export function useTeams() {
  const teams = useState<Team[]>("workspace-teams", () => [])
  const loaded = useState("teams-loaded", () => false)

  async function loadTeams(): Promise<Team[]> {
    try {
      const data = await apiFetch<any[]>("/teams")
      teams.value = data
      loaded.value = true
      return data
    } catch {
      teams.value = []
      loaded.value = true
      return []
    }
  }

  function getTeamsForUser(_userId: string): Team[] {
    return teams.value
  }

  function getTeamById(teamId: string): Team | undefined {
    return teams.value.find(t => t.id === teamId)
  }

  function getStoredTeamById(teamId: string): Team | undefined {
    return getTeamById(teamId)
  }

  async function getTeamDetail(teamId: string): Promise<any> {
    return apiFetch(`/teams/${teamId}`)
  }

  function isTeamOwner(teamId: string, userId: string): boolean {
    const team = teams.value.find(t => t.id === teamId)
    return team?.ownerId === userId
  }

  function isTeamMember(teamId: string, userId: string): boolean {
    const team = teams.value.find(t => t.id === teamId)
    return team?.ownerId === userId || false
  }

  async function createTeam(name: string, description: string): Promise<{ ok: true; team: Team } | { ok: false; error: string }> {
    try {
      const data = await apiFetch<{ ok: boolean; team: Team }>("/teams", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      })
      teams.value.push(data.team)
      return { ok: true, team: data.team }
    } catch (err: any) {
      return { ok: false, error: err.message || "创建失败" }
    }
  }

  async function joinTeam(teamId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await apiFetch(`/teams/${teamId}/join`, { method: "POST" })
      await loadTeams()
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message || "加入失败" }
    }
  }

  async function leaveTeam(teamId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await apiFetch(`/teams/${teamId}/leave`, { method: "POST" })
      await loadTeams()
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message || "退出失败" }
    }
  }

  async function deleteTeam(teamId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await apiFetch(`/teams/${teamId}`, { method: "DELETE" })
      teams.value = teams.value.filter(t => t.id !== teamId)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message || "删除失败" }
    }
  }

  function getTeamInviteCode(teamId: string): string {
    return btoa(`autoforge-join:${teamId}`)
  }

  function resolveInviteCode(code: string): string | null {
    try {
      const decoded = atob(code)
      const prefix = "autoforge-join:"
      if (!decoded.startsWith(prefix)) return null
      return decoded.slice(prefix.length)
    } catch { return null }
  }

  return {
    teams, loaded, loadTeams, getTeamsForUser, getTeamById, getTeamDetail, getStoredTeamById,
    isTeamOwner, isTeamMember, createTeam, joinTeam, leaveTeam, deleteTeam,
    getTeamInviteCode, resolveInviteCode,
  }
}
