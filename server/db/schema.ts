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
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
