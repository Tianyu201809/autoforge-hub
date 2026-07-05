export interface Script {
  id: string
  title: string
  description: string
  zipName: string
  zipSize: number
  filePath: string
  tags: string[]
  category: string
  language: string
  createdAt: string
  updatedAt: string
  ownerId: string
  teamId?: string
}

export interface StoredScript {
  id: string
  title: string
  description: string
  zipName: string
  zipSize: number
  filePath: string
  tags: string[]
  category: string
  language: string
  createdAt: string
  updatedAt: string
  ownerId: string
  teamId?: string
}

export interface Team {
  id: string
  name: string
  description: string
  createdAt: string
  ownerId: string
  memberCount: number
}

export interface StoredTeam {
  id: string
  name: string
  description: string
  createdAt: string
  ownerId: string
  memberIds: string[]
}

export type WorkspaceTab = 'personal' | 'teams'
export type ScriptSort = 'newest' | 'oldest' | 'name'

export const SCRIPT_CATEGORIES = [
  '数据处理', '自动化', 'DevOps', 'Web 开发', 'AI/ML',
  '数据库', '监控', '安全', '测试', '其他'
] as const

export const SCRIPT_LANGUAGES = [
  'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust',
  'Bash', 'PowerShell', 'Java', 'Ruby', '其他'
] as const

export type ScriptCategory = (typeof SCRIPT_CATEGORIES)[number]
export type ScriptLanguage = (typeof SCRIPT_LANGUAGES)[number]
