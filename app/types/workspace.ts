export interface Script {
  id: string
  title: string
  description: string
  zipName: string
  zipSize: number
  tags: string[]
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
  tags: string[]
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
