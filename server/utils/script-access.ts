export function isPublicScript(row: { visibility?: string | null }) {
  return (row.visibility || 'private') === 'public'
}

/** View: public OR owner (team membership checked by caller). */
export function canViewPersonalOrPublic(
  row: { visibility?: string | null; owner_id: string; team_id?: string | null },
  userId: string
) {
  if (isPublicScript(row)) return true
  if (!row.team_id && row.owner_id === userId) return true
  return false
}

/** Download/install same as view for personal+public; team path stays in route handlers. */
export function canDownloadPersonalOrPublic(
  row: { visibility?: string | null; owner_id: string; team_id?: string | null },
  userId: string
) {
  return canViewPersonalOrPublic(row, userId)
}
