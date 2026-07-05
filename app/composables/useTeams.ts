import type { Team, StoredTeam } from '~/types/workspace'

const TEAMS_KEY = 'autoforge-teams'
const MAX_TEAMS_PER_USER = 5

function generateId(): string {
  return crypto.randomUUID()
}

function readTeams(): StoredTeam[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(TEAMS_KEY)
    return raw ? (JSON.parse(raw) as StoredTeam[]) : []
  } catch {
    return []
  }
}

function writeTeams(teams: StoredTeam[]) {
  if (!import.meta.client) return
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams))
}

function toTeam(t: StoredTeam): Team {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    createdAt: t.createdAt,
    ownerId: t.ownerId,
    memberCount: t.memberIds.length
  }
}

export function useTeams() {
  const teams = useState<Team[]>('workspace-teams', () => [])
  const storedTeams = useState<StoredTeam[]>('workspace-stored-teams', () => [])
  const hydrated = useState('teams-hydrated', () => false)

  function loadTeams() {
    if (!import.meta.client) return
    const stored = readTeams()
    storedTeams.value = stored
    teams.value = stored.map(toTeam)
    hydrated.value = true
  }

  function getTeamsForUser(userId: string): Team[] {
    return teams.value.filter(
      t => t.ownerId === userId || storedTeams.value.find(st => st.id === t.id)?.memberIds.includes(userId)
    )
  }

  function getTeamById(teamId: string): Team | undefined {
    return teams.value.find(t => t.id === teamId)
  }

  function getStoredTeamById(teamId: string): StoredTeam | undefined {
    return storedTeams.value.find(t => t.id === teamId)
  }

  function isTeamOwner(teamId: string, userId: string): boolean {
    const team = storedTeams.value.find(t => t.id === teamId)
    return team?.ownerId === userId
  }

  function isTeamMember(teamId: string, userId: string): boolean {
    const team = storedTeams.value.find(t => t.id === teamId)
    return team?.memberIds.includes(userId) ?? false
  }

  function createTeam(
    name: string,
    description: string,
    ownerId: string
  ): { ok: true; team: Team } | { ok: false; error: string } {
    const ownedTeams = teams.value.filter(t => t.ownerId === ownerId)
    if (ownedTeams.length >= MAX_TEAMS_PER_USER) {
      return { ok: false, error: `每个用户最多创建 ${MAX_TEAMS_PER_USER} 个团队` }
    }

    const now = new Date().toISOString()
    const stored: StoredTeam = {
      id: generateId(),
      name: name.trim(),
      description: description.trim(),
      createdAt: now,
      ownerId,
      memberIds: [ownerId]
    }

    const all = readTeams()
    all.push(stored)
    writeTeams(all)
    storedTeams.value.push(stored)

    const team = toTeam(stored)
    teams.value.push(team)

    // Update user's teamCount
    const users = JSON.parse(localStorage.getItem('autoforge-users') || '[]') as any[]
    const userIdx = users.findIndex((u: any) => u.id === ownerId)
    if (userIdx >= 0) {
      users[userIdx].teamCount = teams.value.filter(t => t.ownerId === ownerId).length
      localStorage.setItem('autoforge-users', JSON.stringify(users))
    }

    return { ok: true, team }
  }

  function joinTeam(
    teamId: string,
    userId: string
  ): { ok: true } | { ok: false; error: string } {
    const all = readTeams()
    const idx = all.findIndex(t => t.id === teamId)
    if (idx < 0) return { ok: false, error: '团队不存在' }

    if (all[idx].memberIds.includes(userId)) {
      return { ok: false, error: '你已是该团队成员' }
    }

    all[idx].memberIds.push(userId)
    writeTeams(all)
    storedTeams.value = all
    teams.value = all.map(toTeam)

    // Update user's joinedTeamIds
    const users = JSON.parse(localStorage.getItem('autoforge-users') || '[]') as any[]
    const userIdx = users.findIndex((u: any) => u.id === userId)
    if (userIdx >= 0) {
      users[userIdx].joinedTeamIds = all
        .filter(t => t.memberIds.includes(userId))
        .map(t => t.id)
      localStorage.setItem('autoforge-users', JSON.stringify(users))
    }

    return { ok: true }
  }

  function leaveTeam(
    teamId: string,
    userId: string
  ): { ok: true } | { ok: false; error: string } {
    const all = readTeams()
    const idx = all.findIndex(t => t.id === teamId)
    if (idx < 0) return { ok: false, error: '团队不存在' }

    if (all[idx].ownerId === userId) {
      return { ok: false, error: '创建者不能退出自己的团队' }
    }

    all[idx].memberIds = all[idx].memberIds.filter(id => id !== userId)
    writeTeams(all)
    storedTeams.value = all
    teams.value = all.map(toTeam)

    // Update user's joinedTeamIds
    const users = JSON.parse(localStorage.getItem('autoforge-users') || '[]') as any[]
    const userIdx = users.findIndex((u: any) => u.id === userId)
    if (userIdx >= 0) {
      users[userIdx].joinedTeamIds = all
        .filter(t => t.memberIds.includes(userId))
        .map(t => t.id)
      localStorage.setItem('autoforge-users', JSON.stringify(users))
    }

    return { ok: true }
  }

  function deleteTeam(teamId: string, userId: string): { ok: true } | { ok: false; error: string } {
    const all = readTeams()
    const idx = all.findIndex(t => t.id === teamId)
    if (idx < 0) return { ok: false, error: '团队不存在' }
    if (all[idx].ownerId !== userId) return { ok: false, error: '只有创建者可以删除团队' }

    all.splice(idx, 1)
    writeTeams(all)
    storedTeams.value = all
    teams.value = all.map(toTeam)

    return { ok: true }
  }

  function getTeamInviteCode(teamId: string): string {
    return btoa(`autoforge-join:${teamId}`)
  }

  function resolveInviteCode(code: string): string | null {
    try {
      const decoded = atob(code)
      const prefix = 'autoforge-join:'
      if (!decoded.startsWith(prefix)) return null
      return decoded.slice(prefix.length)
    } catch {
      return null
    }
  }

  return {
    teams,
    hydrated,
    loadTeams,
    getTeamsForUser,
    getTeamById,
    getStoredTeamById,
    isTeamOwner,
    isTeamMember,
    createTeam,
    joinTeam,
    leaveTeam,
    deleteTeam,
    getTeamInviteCode,
    resolveInviteCode
  }
}
