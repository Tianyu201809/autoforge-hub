export interface Script {
  id: string
  title: string
  description: string
  zipName: string
  zipSize: number
  filePath: string
  icon: string
  iconColor?: string
  tags: string[]
  category: string
  language: string
  createdAt: string
  updatedAt: string
  ownerId: string
  ownerDisplayName?: string
  ownerAvatarUrl?: string
  teamId?: string
  readme: string
}

export interface StoredScript {
  id: string
  title: string
  description: string
  zipName: string
  zipSize: number
  filePath: string
  icon: string
  iconColor?: string
  tags: string[]
  category: string
  language: string
  createdAt: string
  updatedAt: string
  ownerId: string
  teamId?: string
  readme: string
  ownerDisplayName?: string
  ownerAvatarUrl?: string
}

export interface Team {
  id: string
  name: string
  description: string
  createdAt: string
  ownerId: string
  memberCount: number
  icon?: string
  iconColor?: string
  avatarUrl?: string
}

export interface TeamMessage {
  id: string
  teamId: string
  authorId: string
  authorDisplayName: string
  authorAvatarUrl: string
  authorRole: 'owner' | 'admin' | 'member'
  content: string
  createdAt: string
  canDelete: boolean
}

export interface StoredTeam {
  id: string
  name: string
  description: string
  createdAt: string
  ownerId: string
  memberIds: string[]
}

export interface AuditLog {
  id: string
  teamId: string
  userId: string
  userName: string
  actionType: 'upload' | 'edit' | 'delete' | 'copy'
  scriptId?: string
  scriptName: string
  details: Record<string, any>
  createdAt: string
}

export type WorkspaceTab = 'personal' | 'teams'
export type ScriptSort = 'newest' | 'oldest' | 'name'

export type ScriptListQuery = {
  scope?: 'personal'
  teamId?: string
  page?: number
  pageSize?: number
  q?: string
  category?: string
  language?: string
  sort?: ScriptSort
}

export type ScriptListResult = {
  items: Script[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export const SCRIPT_CATEGORIES = [
  '数据处理', '自动化', 'DevOps', 'Web 开发', 'AI/ML',
  '数据库', '监控', '安全', '测试', '其他'
] as const

export const SCRIPT_LANGUAGES = [
  'Python', 'JavaScript'
] as const

export type ScriptCategory = (typeof SCRIPT_CATEGORIES)[number]
export type ScriptLanguage = (typeof SCRIPT_LANGUAGES)[number]
