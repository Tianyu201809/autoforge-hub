# Team Icon & Message Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let team owner/admin set a custom team icon (preset Lucide+color or uploaded image, mutually exclusive), and let all members use a right-side chat-style message drawer (post many, delete own; owner/admin delete any; page size 10).

**Architecture:** Extend `teams` with `icon` / `icon_color` / `avatar_url`; store uploads under `team-avatars/`. New `team_messages` table + REST under `/api/teams/:id/messages`. Frontend: `WsTeamIconModal` for icon settings; `WsTeamMessageDrawer` (bottom composer + bubbles) opened from the team detail toolbar.

**Tech Stack:** Nuxt 4 / Nitro, sql.js SQLite, Vue 3 Composition API, existing `WsIconPicker` + `saveFile` / `readFile`, `getTeamRole`.

**Spec:** `docs/superpowers/specs/2026-07-11-team-icon-and-message-board-design.md`

**Note:** Repo has no automated test runner. Verification uses `curl` against `pnpm dev` / `npm run dev` (`http://localhost:9876`). Set `BASE=http://localhost:9876` and `TOKEN=<jwt>` from login.

## Global Constraints

- Icon modes are mutually exclusive: avatar clears icon to `users` + `icon_color` null; preset icon clears `avatar_url` to `''`
- Only owner/admin change icon; any member posts messages; author or owner/admin deletes
- Messages: max 500 chars, page `limit=10`, order `created_at DESC`
- No message edit/reply/@; no icon at create-team; no audit log for messages
- Drawer UI: scheme A (bottom input + bubbles); desktop ~400–440px; mobile full width

---

## File map

| File | Responsibility |
|------|----------------|
| `server/db/index.ts` | Migrate team icon columns + create `team_messages` |
| `server/db/schema.ts` | Drizzle: `teams` icon fields + `teamMessages` |
| `app/types/workspace.ts` | `Team` icon fields + `TeamMessage` |
| `server/api/teams/index.get.ts` | Return icon fields on list |
| `server/api/teams/index.post.ts` | Defaults on create response |
| `server/api/teams/[id]/index.get.ts` | Return icon fields on detail |
| `server/api/teams/[id]/index.delete.ts` | Cascade delete messages |
| `server/api/teams/[id]/icon.put.ts` | Set preset icon or upload avatar |
| `server/api/files/team-avatars/[filename].get.ts` | Serve team avatar bytes |
| `server/middleware/auth.ts` | Public allow `/api/files/team-avatars/` |
| `server/api/teams/[id]/messages/index.get.ts` | Paginated list |
| `server/api/teams/[id]/messages/index.post.ts` | Create message |
| `server/api/teams/[id]/messages/[msgId].delete.ts` | Delete message |
| `app/composables/useTeams.ts` | `updateTeamIcon`, message CRUD helpers, `getTeamAvatarSrc` |
| `app/components/workspace/WsTeamIconModal.vue` | Icon settings modal |
| `app/components/workspace/WsTeamCard.vue` | Show team icon/avatar |
| `app/components/workspace/WsTeamMessageDrawer.vue` | Right drawer message board |
| `app/pages/workspace/teams/[id]/index.vue` | Wire modal + drawer + header icon |
| `app/components/workspace/WsIconPicker.vue` | Add `users` to icon list (team default) |

---

### Task 1: DB migration + types

**Files:**
- Modify: `server/db/index.ts`
- Modify: `server/db/schema.ts`
- Modify: `app/types/workspace.ts`

**Interfaces:**
- Produces: DB columns `teams.icon`, `teams.icon_color`, `teams.avatar_url`; table `team_messages`; TS `Team` icon fields + `TeamMessage`

- [ ] **Step 1: Add migrations in `server/db/index.ts`**

Before `return _sqlDb`, after the `password_reset_codes` block, insert:

```ts
  // Migration: team custom icon
  try { _sqlDb.run("ALTER TABLE teams ADD COLUMN icon TEXT NOT NULL DEFAULT 'users'") } catch (e) {}
  try { _sqlDb.run("ALTER TABLE teams ADD COLUMN icon_color TEXT DEFAULT NULL") } catch (e) {}
  try { _sqlDb.run("ALTER TABLE teams ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''") } catch (e) {}

  _sqlDb.run(`
    CREATE TABLE IF NOT EXISTS team_messages (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id),
      author_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)
  _sqlDb.run(`
    CREATE INDEX IF NOT EXISTS idx_team_messages_team_created
    ON team_messages(team_id, created_at DESC)
  `)
  saveDb()
```

- [ ] **Step 2: Extend `server/db/schema.ts`**

Append (keep existing tables):

```ts
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
```

- [ ] **Step 3: Extend `app/types/workspace.ts` `Team` and add `TeamMessage`**

Replace the `Team` interface and add after it:

```ts
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
```

- [ ] **Step 4: Commit**

```bash
git add server/db/index.ts server/db/schema.ts app/types/workspace.ts
git commit -m "feat(db): add team icon columns and team_messages"
```

---

### Task 2: Return icon fields from team list/detail/create + cascade delete

**Files:**
- Modify: `server/api/teams/index.get.ts`
- Modify: `server/api/teams/index.post.ts`
- Modify: `server/api/teams/[id]/index.get.ts`
- Modify: `server/api/teams/[id]/index.delete.ts`

**Interfaces:**
- Consumes: DB columns from Task 1
- Produces: API payloads include `icon`, `iconColor`, `avatarUrl`

- [ ] **Step 1: Update list mapper in `index.get.ts`**

In the `.map` return object, add:

```ts
        icon: (row[columns.indexOf("icon")] as string) || "users",
        iconColor: (row[columns.indexOf("icon_color")] as string) || undefined,
        avatarUrl: (row[columns.indexOf("avatar_url")] as string) || "",
```

- [ ] **Step 2: Update create response in `index.post.ts`**

Change returned `team` to include defaults:

```ts
    team: {
      id,
      name,
      description,
      ownerId: userId,
      memberCount: 1,
      settings: JSON.parse(defaultSettings),
      icon: "users",
      iconColor: undefined,
      avatarUrl: "",
      createdAt: now,
    }
```

(INSERT can omit new columns — SQLite defaults apply after migration.)

- [ ] **Step 3: Update detail return in `[id]/index.get.ts`**

Add to the return object:

```ts
    icon: row.icon || "users",
    iconColor: row.icon_color || undefined,
    avatarUrl: row.avatar_url || "",
```

- [ ] **Step 4: Cascade messages on team delete in `[id]/index.delete.ts`**

Before `DELETE FROM scripts`, add:

```ts
  db.run("DELETE FROM team_messages WHERE team_id = ?", [teamId])
```

- [ ] **Step 5: Verify list returns icon fields**

With server running and a valid token for a user who owns/joined a team:

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/teams" | head -c 500
```

Expected: JSON array items include `"icon":"users"` (or set value) and `"avatarUrl"`.

- [ ] **Step 6: Commit**

```bash
git add server/api/teams/index.get.ts server/api/teams/index.post.ts "server/api/teams/[id]/index.get.ts" "server/api/teams/[id]/index.delete.ts"
git commit -m "feat(teams): expose icon fields and cascade message delete"
```

---

### Task 3: Team icon API + static file route

**Files:**
- Create: `server/api/teams/[id]/icon.put.ts`
- Create: `server/api/files/team-avatars/[filename].get.ts`
- Modify: `server/middleware/auth.ts`

**Interfaces:**
- Consumes: `getTeamRole`, `parseSettings`, `saveFile`
- Produces: `PUT /api/teams/:id/icon` → `{ ok, icon, iconColor, avatarUrl }`; `GET /api/files/team-avatars/:filename`

- [ ] **Step 1: Create `server/api/teams/[id]/icon.put.ts`**

```ts
import { getDb, saveDb } from "../../../db/index"
import { parseSettings, getTeamRole } from "../../../utils/team-permissions"
import { saveFile } from "../../../utils/storage"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const teamId = getRouterParam(event, "id")
  if (!teamId) throw createError({ statusCode: 400, message: "缺少团队 ID" })

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM teams WHERE id = ?")
  stmt.bind([teamId])
  if (!stmt.step()) { stmt.free(); throw createError({ statusCode: 404, message: "团队不存在" }) }
  const row = stmt.getAsObject() as any
  stmt.free()

  const memberIds: string[] = JSON.parse(row.member_ids || "[]")
  const userId = auth.user.userId
  if (row.owner_id !== userId && !memberIds.includes(userId)) {
    throw createError({ statusCode: 403, message: "你不是该团队成员" })
  }

  const settings = parseSettings(row.settings)
  const role = getTeamRole(row.owner_id, settings.adminIds, userId)
  if (role !== "owner" && role !== "admin") {
    throw createError({ statusCode: 403, message: "只有创建者或管理员可以修改团队图标" })
  }

  const contentType = getHeader(event, "content-type") || ""
  const now = new Date().toISOString()

  if (contentType.includes("multipart/form-data")) {
    const formData = await readMultipartFormData(event)
    if (!formData) throw createError({ statusCode: 400, message: "无效的上传" })
    const fileField = formData.find(f => f.name === "file")
    if (!fileField || !fileField.data || !fileField.filename) {
      throw createError({ statusCode: 400, message: "请选择图片" })
    }
    const allowed = ["png", "jpg", "jpeg", "gif", "webp"]
    const ext = (fileField.filename.split(".").pop() || "").toLowerCase()
    if (!allowed.includes(ext)) {
      throw createError({ statusCode: 400, message: "仅支持 png / jpg / gif / webp" })
    }
    const storedName = await saveFile("team-" + fileField.filename, fileField.data, "team-avatars")
    db.run(
      "UPDATE teams SET avatar_url = ?, icon = ?, icon_color = NULL, updated_at = ? WHERE id = ?",
      [storedName, "users", now, teamId],
    )
    saveDb()
    return { ok: true, icon: "users", iconColor: null, avatarUrl: storedName }
  }

  const body = await readBody(event)
  const mode = body?.mode
  if (mode !== "icon") {
    throw createError({ statusCode: 400, message: "请提供 mode=icon 或上传文件" })
  }
  const icon = typeof body.icon === "string" && body.icon.trim() ? body.icon.trim() : "users"
  const iconColor = body.iconColor == null || body.iconColor === ""
    ? null
    : String(body.iconColor)

  db.run(
    "UPDATE teams SET icon = ?, icon_color = ?, avatar_url = ?, updated_at = ? WHERE id = ?",
    [icon, iconColor, "", now, teamId],
  )
  saveDb()
  return { ok: true, icon, iconColor, avatarUrl: "" }
})
```

- [ ] **Step 2: Create `server/api/files/team-avatars/[filename].get.ts`**

```ts
import { readFile } from "../../../utils/storage"

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, "filename")
  if (!raw) throw createError({ statusCode: 400, message: "Missing filename" })
  const name = decodeURIComponent(raw).replace(/^team-avatars\//, "")
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    throw createError({ statusCode: 400, message: "Invalid filename" })
  }
  const storedName = `team-avatars/${name}`
  const data = await readFile(storedName)
  if (!data) throw createError({ statusCode: 404, message: "File not found" })
  const ext = name.split(".").pop()?.toLowerCase() || ""
  const mimes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
  }
  setHeader(event, "Content-Type", mimes[ext] || "application/octet-stream")
  setHeader(event, "Cache-Control", "public, max-age=31536000")
  return new Uint8Array(data)
})
```

- [ ] **Step 3: Whitelist in `server/middleware/auth.ts`**

Add next to the avatars line:

```ts
    url.startsWith('/api/files/team-avatars/') ||
```

- [ ] **Step 4: Verify preset icon update**

```bash
curl -s -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"mode\":\"icon\",\"icon\":\"zap\",\"iconColor\":\"#3b82f6\"}" \
  "$BASE/api/teams/$TEAM_ID/icon"
```

Expected: `{"ok":true,"icon":"zap","iconColor":"#3b82f6","avatarUrl":""}`

Member (non-admin) should get 403.

- [ ] **Step 5: Commit**

```bash
git add "server/api/teams/[id]/icon.put.ts" "server/api/files/team-avatars/[filename].get.ts" server/middleware/auth.ts
git commit -m "feat(teams): add icon update API and team-avatar file route"
```

---

### Task 4: Team messages API

**Files:**
- Create: `server/api/teams/[id]/messages/index.get.ts`
- Create: `server/api/teams/[id]/messages/index.post.ts`
- Create: `server/api/teams/[id]/messages/[msgId].delete.ts`

**Interfaces:**
- Produces:
  - `GET` → `{ items: TeamMessage[], total, hasMore }`
  - `POST` → `{ ok: true, message: TeamMessage }`
  - `DELETE` → `{ ok: true }`

- [ ] **Step 1: Create GET `server/api/teams/[id]/messages/index.get.ts`**

Use `prepare`/`bind`/`step` (sql.js-safe), not `exec` with bind params:

```ts
import { getDb } from "../../../../db/index"
import { parseSettings, getTeamRole } from "../../../../utils/team-permissions"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const teamId = getRouterParam(event, "id")
  if (!teamId) throw createError({ statusCode: 400, message: "缺少团队 ID" })

  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50)
  const offset = Math.max(Number(query.offset) || 0, 0)

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM teams WHERE id = ?")
  stmt.bind([teamId])
  if (!stmt.step()) { stmt.free(); throw createError({ statusCode: 404, message: "团队不存在" }) }
  const team = stmt.getAsObject() as any
  stmt.free()

  const memberIds: string[] = JSON.parse(team.member_ids || "[]")
  const userId = auth.user.userId
  if (team.owner_id !== userId && !memberIds.includes(userId)) {
    throw createError({ statusCode: 403, message: "你不是该团队成员" })
  }

  const settings = parseSettings(team.settings)
  const currentRole = getTeamRole(team.owner_id, settings.adminIds, userId)
  const canModerate = currentRole === "owner" || currentRole === "admin"

  const countStmt = db.prepare("SELECT COUNT(*) AS c FROM team_messages WHERE team_id = ?")
  countStmt.bind([teamId])
  countStmt.step()
  const total = Number((countStmt.getAsObject() as any).c || 0)
  countStmt.free()

  const usersRes = db.exec("SELECT id, display_name, avatar_url FROM users")[0]
  const userMap = new Map<string, { displayName: string; avatarUrl: string }>()
  if (usersRes) {
    for (const r of usersRes.values) {
      userMap.set(r[0] as string, {
        displayName: (r[1] as string) || "",
        avatarUrl: (r[2] as string) || "",
      })
    }
  }

  const listStmt = db.prepare(
    "SELECT id, team_id, author_id, content, created_at FROM team_messages WHERE team_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
  )
  listStmt.bind([teamId, limit, offset])
  const items: any[] = []
  while (listStmt.step()) {
    const r = listStmt.getAsObject() as any
    const authorId = r.author_id as string
    const u = userMap.get(authorId)
    const authorRole = getTeamRole(team.owner_id, settings.adminIds, authorId)
    items.push({
      id: r.id,
      teamId: r.team_id,
      authorId,
      authorDisplayName: u?.displayName || "未知用户",
      authorAvatarUrl: u?.avatarUrl || "",
      authorRole,
      content: r.content,
      createdAt: r.created_at,
      canDelete: canModerate || authorId === userId,
    })
  }
  listStmt.free()

  return {
    items,
    total,
    hasMore: offset + items.length < total,
  }
})
```

- [ ] **Step 2: Create POST `server/api/teams/[id]/messages/index.post.ts`**

```ts
import { getDb, saveDb } from "../../../../db/index"
import { parseSettings, getTeamRole } from "../../../../utils/team-permissions"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const teamId = getRouterParam(event, "id")
  if (!teamId) throw createError({ statusCode: 400, message: "缺少团队 ID" })

  const body = await readBody(event)
  const content = typeof body?.content === "string" ? body.content.trim() : ""
  if (!content) throw createError({ statusCode: 400, message: "留言不能为空" })
  if (content.length > 500) throw createError({ statusCode: 400, message: "留言不能超过 500 字" })

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM teams WHERE id = ?")
  stmt.bind([teamId])
  if (!stmt.step()) { stmt.free(); throw createError({ statusCode: 404, message: "团队不存在" }) }
  const team = stmt.getAsObject() as any
  stmt.free()

  const memberIds: string[] = JSON.parse(team.member_ids || "[]")
  const userId = auth.user.userId
  if (team.owner_id !== userId && !memberIds.includes(userId)) {
    throw createError({ statusCode: 403, message: "你不是该团队成员" })
  }

  const settings = parseSettings(team.settings)
  const authorRole = getTeamRole(team.owner_id, settings.adminIds, userId)

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.run(
    "INSERT INTO team_messages (id, team_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, teamId, userId, content, now],
  )
  saveDb()

  const uStmt = db.prepare("SELECT display_name, avatar_url FROM users WHERE id = ?")
  uStmt.bind([userId])
  uStmt.step()
  const u = uStmt.getAsObject() as any
  uStmt.free()

  return {
    ok: true,
    message: {
      id,
      teamId,
      authorId: userId,
      authorDisplayName: u.display_name || "",
      authorAvatarUrl: u.avatar_url || "",
      authorRole,
      content,
      createdAt: now,
      canDelete: true,
    },
  }
})
```

- [ ] **Step 3: Create DELETE `server/api/teams/[id]/messages/[msgId].delete.ts`**

```ts
import { getDb, saveDb } from "../../../../../db/index"
import { parseSettings, getTeamRole } from "../../../../../utils/team-permissions"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const teamId = getRouterParam(event, "id")
  const msgId = getRouterParam(event, "msgId")
  if (!teamId || !msgId) throw createError({ statusCode: 400, message: "缺少参数" })

  const db = await getDb()
  const tStmt = db.prepare("SELECT * FROM teams WHERE id = ?")
  tStmt.bind([teamId])
  if (!tStmt.step()) { tStmt.free(); throw createError({ statusCode: 404, message: "团队不存在" }) }
  const team = tStmt.getAsObject() as any
  tStmt.free()

  const memberIds: string[] = JSON.parse(team.member_ids || "[]")
  const userId = auth.user.userId
  if (team.owner_id !== userId && !memberIds.includes(userId)) {
    throw createError({ statusCode: 403, message: "你不是该团队成员" })
  }

  const mStmt = db.prepare("SELECT * FROM team_messages WHERE id = ? AND team_id = ?")
  mStmt.bind([msgId, teamId])
  if (!mStmt.step()) { mStmt.free(); throw createError({ statusCode: 404, message: "留言不存在" }) }
  const msg = mStmt.getAsObject() as any
  mStmt.free()

  const settings = parseSettings(team.settings)
  const role = getTeamRole(team.owner_id, settings.adminIds, userId)
  const canModerate = role === "owner" || role === "admin"
  if (msg.author_id !== userId && !canModerate) {
    throw createError({ statusCode: 403, message: "只能删除自己的留言" })
  }

  db.run("DELETE FROM team_messages WHERE id = ?", [msgId])
  saveDb()
  return { ok: true }
})
```

- [ ] **Step 4: Verify post + list + delete**

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"content":"hello board"}' "$BASE/api/teams/$TEAM_ID/messages"

curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/teams/$TEAM_ID/messages?limit=10&offset=0"

curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/teams/$TEAM_ID/messages/$MSG_ID"
```

Expected: post returns message; list has items; delete `{ok:true}`; empty content → 400; >500 chars → 400.

- [ ] **Step 5: Commit**

```bash
git add "server/api/teams/[id]/messages"
git commit -m "feat(teams): add message board list/create/delete APIs"
```

---

### Task 5: useTeams helpers

**Files:**
- Modify: `app/composables/useTeams.ts`

**Interfaces:**
- Produces: `getTeamAvatarSrc`, `updateTeamIcon`, `fetchTeamMessages`, `postTeamMessage`, `deleteTeamMessage`

- [ ] **Step 1: Add helpers to `useTeams.ts`**

Import `TeamMessage` from `~/types/workspace`.

Add inside `useTeams()` before `return`:

```ts
  function getTeamAvatarSrc(url?: string | null): string {
    if (!url) return ""
    const name = url.replace(/^team-avatars\//, "")
    if (!name) return ""
    return "/api/files/team-avatars/" + encodeURIComponent(name)
  }

  async function updateTeamIcon(
    teamId: string,
    payload: { mode: "icon"; icon: string; iconColor?: string | null } | FormData,
  ): Promise<{ ok: true; icon: string; iconColor: string | null; avatarUrl: string } | { ok: false; error: string }> {
    try {
      const token = import.meta.client ? localStorage.getItem("autoforge-token") : null
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`
      let body: BodyInit
      if (payload instanceof FormData) {
        body = payload
      } else {
        headers["Content-Type"] = "application/json"
        body = JSON.stringify(payload)
      }
      const res = await fetch(`${API_BASE}/teams/${teamId}/icon`, { method: "PUT", headers, body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "更新失败")
      const team = teams.value.find(t => t.id === teamId)
      if (team) {
        team.icon = data.icon
        team.iconColor = data.iconColor || undefined
        team.avatarUrl = data.avatarUrl || ""
      }
      return { ok: true, icon: data.icon, iconColor: data.iconColor ?? null, avatarUrl: data.avatarUrl || "" }
    } catch (err: any) {
      return { ok: false, error: err.message || "更新失败" }
    }
  }

  async function fetchTeamMessages(teamId: string, offset = 0, limit = 10) {
    return apiFetch<{ items: TeamMessage[]; total: number; hasMore: boolean }>(
      `/teams/${teamId}/messages?limit=${limit}&offset=${offset}`,
    )
  }

  async function postTeamMessage(teamId: string, content: string) {
    return apiFetch<{ ok: boolean; message: TeamMessage }>(`/teams/${teamId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    })
  }

  async function deleteTeamMessage(teamId: string, msgId: string) {
    return apiFetch<{ ok: boolean }>(`/teams/${teamId}/messages/${msgId}`, { method: "DELETE" })
  }
```

Export them from the `return { ... }` object.

- [ ] **Step 2: Commit**

```bash
git add app/composables/useTeams.ts
git commit -m "feat(teams): composable helpers for icon and messages"
```

---

### Task 6: Icon UI (modal + cards + header)

**Files:**
- Create: `app/components/workspace/WsTeamIconModal.vue`
- Modify: `app/components/workspace/WsTeamCard.vue`
- Modify: `app/components/workspace/WsIconPicker.vue`
- Modify: `app/pages/workspace/teams/[id]/index.vue`

**Interfaces:**
- Consumes: `updateTeamIcon`, `getTeamAvatarSrc`, `WsIconPicker`

- [ ] **Step 1: Add `users` to `WsIconPicker` ICONS array** as first entry:

```ts
  { id: 'users', label: '团队' },
```

- [ ] **Step 2: Create `WsTeamIconModal.vue`**

Props: `teamId`, `initialIcon`, `initialIconColor?`, `initialAvatarUrl?`  
Emits: `close`, `saved` with `{ icon, iconColor?, avatarUrl }`

- Tabs: `icon` | `avatar` (mutually exclusive)
- Icon tab: `WorkspaceWsIconPicker` + Save → `updateTeamIcon(teamId, { mode: 'icon', icon, iconColor })`
- Avatar tab: file input `accept="image/png,image/jpeg,image/gif,image/webp"`, preview, Save → `FormData` with `file`
- Match modal chrome from `WsCreateTeamModal.vue`

Core script:

```vue
<script setup lang="ts">
const props = defineProps<{
  teamId: string
  initialIcon?: string
  initialIconColor?: string
  initialAvatarUrl?: string
}>()
const emit = defineEmits<{
  close: []
  saved: [payload: { icon: string; iconColor?: string; avatarUrl: string }]
}>()
const { updateTeamIcon, getTeamAvatarSrc } = useTeams()
const tab = ref<'icon' | 'avatar'>(props.initialAvatarUrl ? 'avatar' : 'icon')
const icon = ref(props.initialIcon || 'users')
const iconColor = ref<string | undefined>(props.initialIconColor)
const file = ref<File | null>(null)
const preview = ref(props.initialAvatarUrl ? getTeamAvatarSrc(props.initialAvatarUrl) : '')
const saving = ref(false)
const error = ref('')

function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  file.value = f
  preview.value = URL.createObjectURL(f)
}

async function save() {
  saving.value = true
  error.value = ''
  let result
  if (tab.value === 'icon') {
    result = await updateTeamIcon(props.teamId, {
      mode: 'icon',
      icon: icon.value,
      iconColor: iconColor.value ?? null,
    })
  } else {
    if (!file.value) {
      error.value = '请选择图片'
      saving.value = false
      return
    }
    const fd = new FormData()
    fd.append('file', file.value)
    result = await updateTeamIcon(props.teamId, fd)
  }
  saving.value = false
  if (!result.ok) { error.value = result.error; return }
  emit('saved', {
    icon: result.icon,
    iconColor: result.iconColor || undefined,
    avatarUrl: result.avatarUrl,
  })
  emit('close')
}
</script>
```

Implement full template/styles consistent with other workspace modals.

- [ ] **Step 3: Update `WsTeamCard.vue` icon area**

```vue
      <div class="team-card__icon">
        <img
          v-if="team.avatarUrl"
          :src="getTeamAvatarSrc(team.avatarUrl)"
          alt=""
          class="team-card__avatar-img"
        >
        <Icon
          v-else
          :name="`lucide:${team.icon || 'users'}`"
          size="24"
          class="team-card__users-icon"
          :style="team.iconColor ? { color: team.iconColor } : undefined"
        />
      </div>
```

`const { getTeamAvatarSrc } = useTeams()`  
CSS: avatar img fills the icon box with `object-fit: cover`.

- [ ] **Step 4: Wire header + modal on team detail page**

- `canEditIcon` when `currentUserRole` is `owner` or `admin`
- Clickable header icon opens modal
- On `@saved`, patch local `team` / `teamDetail` icon fields
- Mount `WorkspaceWsTeamIconModal` when `showIconModal`

- [ ] **Step 5: Manual UI check**

Default users icon → set zap+#3b82f6 → reload persists → upload image → list shows image → member has no edit control.

- [ ] **Step 6: Commit**

```bash
git add app/components/workspace/WsTeamIconModal.vue app/components/workspace/WsTeamCard.vue app/components/workspace/WsIconPicker.vue "app/pages/workspace/teams/[id]/index.vue"
git commit -m "feat(teams): custom team icon modal and display"
```

---

### Task 7: Message drawer UI

**Files:**
- Create: `app/components/workspace/WsTeamMessageDrawer.vue`
- Modify: `app/pages/workspace/teams/[id]/index.vue`

**Interfaces:**
- Consumes: `fetchTeamMessages`, `postTeamMessage`, `deleteTeamMessage`, `getAvatarSrc`

- [ ] **Step 1: Create `WsTeamMessageDrawer.vue`**

Props: `teamId: string`, `open: boolean`  
Emits: `close`, optional `total-change` with number

Behavior per spec scheme A:
- Watch `open` → reset + load page 0
- Load more appends (`offset = items.length`)
- Post: unshift, `total++`, clear input, scroll top
- Delete: `confirm(...)`, splice, `total--`
- Esc / overlay / × close; lock `document.body.style.overflow` while open
- Empty state + bubbles (own = accent soft, others = muted)
- Composer: `n / 500`, publish disabled when empty

Relative time:

```ts
function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} 天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}
```

Drawer CSS tokens: `width: min(420px, 100vw)`, `z-index` above page chrome, `border-left: 1px solid var(--border-accent)`, flex column with fixed composer at bottom.

- [ ] **Step 2: Wire on team detail page**

Toolbar button「留言板」(+ optional total badge). Prefetch total via `fetchTeamMessages(teamId, 0, 1)` after detail load.

```vue
<WorkspaceWsTeamMessageDrawer
  :team-id="teamId"
  :open="showMessages"
  @close="showMessages = false"
  @total-change="messageTotal = $event"
/>
```

- [ ] **Step 3: End-to-end UI verification**

Empty → post → orange self bubble → 11+ msgs load more → delete own → admin deletes other → member cannot → Esc/overlay close restores scroll.

- [ ] **Step 4: Commit**

```bash
git add app/components/workspace/WsTeamMessageDrawer.vue "app/pages/workspace/teams/[id]/index.vue"
git commit -m "feat(teams): message board right drawer"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| teams icon / icon_color / avatar_url | 1–3 |
| Mutual exclusion write rules | 3 |
| team_messages + index | 1 |
| PUT icon JSON + multipart | 3 |
| Messages GET/POST/DELETE + page 10 | 4 |
| canDelete server-side | 4 |
| Cascade delete on team delete | 2 |
| team-avatars route + auth allow | 3 |
| Icon modal + display | 6 |
| Drawer scheme A | 7 |
| Permission matrix | 3, 4, 6, 7 |

---

## Self-review notes

- No unit test runner in repo — curl + manual UI (same as other Hub plans)
- Prefer sql.js `prepare`/`step` for bound queries
- User avatars: `getAvatarSrc`; team avatars: `getTeamAvatarSrc`
- Drawer replaces earlier sidebar placement from brainstorm
