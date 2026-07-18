import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const downloadLogs = sqliteTable('download_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  scriptId: text('script_id').notNull(),
  downloadedAt: text('downloaded_at').notNull(),
})

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull().default(''),
  teamCount: integer('team_count').notNull().default(0),
  joinedTeamIds: text('joined_team_ids').notNull().default('[]'),
  avatarUrl: text('avatar_url').notNull().default(''),
  tokenVersion: integer('token_version').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const passwordResetCodes = sqliteTable('password_reset_codes', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  createdAt: text('created_at').notNull(),
})

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  ownerId: text('owner_id').notNull(),
  memberIds: text('member_ids').notNull().default('[]'),
  settings: text('settings').notNull().default('{}'),
  icon: text('icon').notNull().default('users'),
  iconColor: text('icon_color'),
  avatarUrl: text('avatar_url').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const teamMessages = sqliteTable('team_messages', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  authorId: text('author_id').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
})

export const teamJoinRequests = sqliteTable('team_join_requests', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  userId: text('user_id').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
