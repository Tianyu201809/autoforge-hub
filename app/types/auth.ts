export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  teamCount: number
  joinedTeamIds: string[]
}

export interface AuthSession {
  token: string
  user: User
  expiresAt: number
}

export interface StoredUserRecord {
  id: string
  email: string
  password: string
  displayName: string
  teamCount: number
  joinedTeamIds: string[]
}

export type AuthTab = 'login' | 'register'

export type AuthView = AuthTab | 'forgot-email' | 'forgot-reset'
