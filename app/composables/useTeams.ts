import type { Team, TeamMessage } from "~/types/workspace"

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
    // Server already filters teams by membership
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
    if (!team) return false
    if (team.ownerId === userId) return true
    // Check if user is in the loaded team's member_ids (available after detail fetch)
    return false
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

  async function updateTeamSettings(
    teamId: string,
    memberPermissions: { upload: boolean; edit: boolean; delete: boolean; download: boolean },
  ): Promise<{ ok: true; settings: any } | { ok: false; error: string }> {
    try {
      const data = await apiFetch<{ ok: boolean; settings: any }>(`/teams/${teamId}/settings`, {
        method: "PUT",
        body: JSON.stringify({ memberPermissions }),
      })
      return { ok: true, settings: data.settings }
    } catch (err: any) {
      return { ok: false, error: err.message || "设置失败" }
    }
  }

  async function manageMember(
    teamId: string,
    action: "kick" | "setRole" | "approveJoin" | "rejectJoin",
    targetUserId: string,
    role?: "admin" | "member",
  ): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
    try {
      const data = await apiFetch<{ ok: boolean; message: string }>(`/teams/${teamId}/members`, {
        method: "PUT",
        body: JSON.stringify({ action, targetUserId, role }),
      })
      return { ok: true, message: data.message }
    } catch (err: any) {
      return { ok: false, error: err.message || "操作失败" }
    }
  }

  async function getJoinStatus(teamId: string): Promise<{ status: "none" | "pending" | "approved" | "rejected"; updatedAt?: string }> {
    return apiFetch(`/teams/${teamId}/join-status`)
  }

  function getTeamAvatarSrc(url?: string | null): string {
    if (!url) return ""
    const name = url.replace(/^team-avatars\//, "")
    if (!name) return ""
    return "/api/files/team-avatars/" + encodeURIComponent(name)
  }

  async function updateTeamIcon(
    teamId: string,
    payload: { mode: "icon"; icon: string; iconColor?: string | null } | FormData,
  ): Promise<{ ok: true; icon: string; iconColor: string | null; avatarUrl: string } | { ok: false; error: string }> {
    try {
      const token = import.meta.client ? localStorage.getItem("autoforge-token") : null
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`
      let body: BodyInit
      if (payload instanceof FormData) {
        body = payload
      } else {
        headers["Content-Type"] = "application/json"
        body = JSON.stringify(payload)
      }
      const res = await fetch(`${API_BASE}/teams/${teamId}/icon`, { method: "PUT", headers, body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "更新失败")
      const team = teams.value.find(t => t.id === teamId)
      if (team) {
        team.icon = data.icon
        team.iconColor = data.iconColor || undefined
        team.avatarUrl = data.avatarUrl || ""
      }
      return { ok: true, icon: data.icon, iconColor: data.iconColor ?? null, avatarUrl: data.avatarUrl || "" }
    } catch (err: any) {
      return { ok: false, error: err.message || "更新失败" }
    }
  }

  async function fetchTeamMessages(teamId: string, offset = 0, limit = 10) {
    return apiFetch<{ items: TeamMessage[]; total: number; hasMore: boolean }>(
      `/teams/${teamId}/messages?limit=${limit}&offset=${offset}`,
    )
  }

  async function postTeamMessage(teamId: string, content: string) {
    return apiFetch<{ ok: boolean; message: TeamMessage }>(`/teams/${teamId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    })
  }

  async function deleteTeamMessage(teamId: string, msgId: string) {
    return apiFetch<{ ok: boolean }>(`/teams/${teamId}/messages/${msgId}`, { method: "DELETE" })
  }

  return {
    teams, loaded, loadTeams, getTeamsForUser, getTeamById, getTeamDetail, getStoredTeamById,
    isTeamOwner, isTeamMember, createTeam, joinTeam, leaveTeam, deleteTeam,
    getTeamInviteCode, resolveInviteCode,
    updateTeamSettings, manageMember,
    getJoinStatus,
    getTeamAvatarSrc, updateTeamIcon, fetchTeamMessages, postTeamMessage, deleteTeamMessage,
  }
}
