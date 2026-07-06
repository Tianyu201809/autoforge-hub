import type { SqlJsDbType } from "../db/index"

export interface CreateAuditLogInput {
  teamId: string
  userId: string
  userName: string
  actionType: "upload" | "edit" | "delete" | "copy"
  scriptId?: string
  scriptName: string
  details?: Record<string, any>
}

export function createAuditLog(db: SqlJsDbType, input: CreateAuditLogInput): void {
  try {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    db.run(
      "INSERT INTO audit_logs (id, team_id, user_id, user_name, action_type, script_id, script_name, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        input.teamId,
        input.userId,
        input.userName,
        input.actionType,
        input.scriptId || null,
        input.scriptName,
        JSON.stringify(input.details || {}),
        now,
      ]
    )
  } catch (err) {
    // Log write failure must NOT affect the main business logic
    console.error("[audit-log] failed to write log:", err)
  }
}
