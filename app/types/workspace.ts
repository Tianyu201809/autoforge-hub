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
  updatedBy?: string
  updaterDisplayName?: string
  updaterAvatarUrl?: string
  teamId?: string
  readme: string
  visibility?: 'private' | 'public'
  publishedAt?: string
  installCount?: number
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
  updatedBy?: string
  updaterDisplayName?: string
  updaterAvatarUrl?: string
  visibility?: 'private' | 'public'
  publishedAt?: string
  installCount?: number
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
export type MarketplaceSort = 'newest' | 'installs' | 'updated'

export type ScriptListQuery = {
  scope?: 'personal' | 'marketplace'
  teamId?: string
  page?: number
  pageSize?: number
  q?: string
  category?: string
  language?: string
  sort?: ScriptSort | MarketplaceSort
}

export type ScriptListResult = {
  items: Script[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export const MARKETPLACE_CATEGORIES = [
  '实用工具', '自动化', '数据处理', '数据爬取',
  'DevOps', 'Web 开发', 'AI/ML',
  '数据库', '监控', '安全', '测试', '其他',
] as const

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number]
export const SCRIPT_CATEGORIES = MARKETPLACE_CATEGORIES

export const SCRIPT_LANGUAGES = [
  'Python', 'JavaScript'
] as const

export type ScriptCategory = (typeof SCRIPT_CATEGORIES)[number]
export type ScriptLanguage = (typeof SCRIPT_LANGUAGES)[number]
