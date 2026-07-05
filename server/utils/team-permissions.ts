export type TeamRole = "owner" | "admin" | "member"

export interface TeamSettings {
  adminIds: string[]
  memberPermissions: {
    upload: boolean
    edit: boolean
    delete: boolean
    download: boolean
  }
}

const DEFAULT_SETTINGS: TeamSettings = {
  adminIds: [],
  memberPermissions: { upload: true, edit: true, delete: false, download: true },
}

export function parseSettings(raw: string | undefined | null): TeamSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw || "{}") }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function getTeamRole(
  ownerId: string,
  adminIds: string[],
  userId: string,
): TeamRole {
  if (userId === ownerId) return "owner"
  if (adminIds.includes(userId)) return "admin"
  return "member"
}

export function checkMemberPermission(
  settings: TeamSettings,
  userId: string,
  ownerId: string,
  permission: keyof TeamSettings["memberPermissions"],
): boolean {
  const role = getTeamRole(ownerId, settings.adminIds, userId)
  if (role === "owner" || role === "admin") return true
  return settings.memberPermissions[permission]
}
