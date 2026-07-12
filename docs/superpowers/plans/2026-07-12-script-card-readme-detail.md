# Script Card Readme & Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich script cards (size, uploader, created/updated dates, Details CTA), add editable Markdown `readme`, widen upload/edit dialogs into a two-column form+readme layout, and add a read-only detail page at `/workspace/scripts/:id`.

**Architecture:** Migrate `scripts.readme`; JOIN `users` on list/detail for owner display fields; new `GET /api/scripts/:id`. Shared Markdown renderer (`marked` + DOMPurify). Widen `WsUploadModal` / `WsEditModal` with left form / right readme edit-preview. Card links to detail page; edit still opens the wide modal.

**Tech Stack:** Nuxt 4 / Vue 3, sql.js, `marked`, `dompurify` (+ `@types/dompurify` if needed).

**Spec:** `docs/superpowers/specs/2026-07-12-script-card-readme-detail-design.md`

**Note:** No automated test runner for this feature. Verify with browser + optional `curl` against `pnpm dev`.

## Global Constraints

- Keep `description` (≤150 UI) separate from `readme` (≤50000 server)
- Detail page is read-only; edit via wide modal
- List returns full `readme` + `ownerDisplayName` + `ownerAvatarUrl`
- Narrow screens: dialog stacks form above readme; both scrollable
- Sanitize Markdown HTML before `v-html`

---

## File map

| File | Responsibility |
|------|----------------|
| `server/db/index.ts` | `readme` migration |
| `app/types/workspace.ts` | `readme`, owner display fields |
| `server/api/scripts/index.get.ts` | JOIN users + readme |
| `server/api/scripts/index.post.ts` | Persist readme |
| `server/api/scripts/[id]/index.get.ts` | Detail endpoint |
| `server/api/scripts/[id]/index.put.ts` | Update readme |
| `server/api/scripts/[id]/copy.post.ts` | Copy readme |
| `server/api/scripts/[id]/share.post.ts` | Share copy readme |
| `app/composables/useScripts.ts` | Map new fields; `fetchScript` |
| `package.json` | `marked`, `dompurify` |
| `app/components/workspace/WsMarkdown.vue` | Safe Markdown render |
| `app/components/workspace/WsScriptCard.vue` | Owner/dates/详情 |
| `app/components/workspace/WsUploadModal.vue` | Wide two-column + readme |
| `app/components/workspace/WsEditModal.vue` | Wide two-column + readme |
| `app/pages/workspace/scripts/[id].vue` | Detail page |
| `app/pages/workspace/personal.vue` | Pass readme on upload/edit |
| `app/pages/workspace/teams/[id]/index.vue` | Pass readme on upload/edit |

---

### Task 1: DB migration + types

**Files:**
- Modify: `server/db/index.ts`
- Modify: `app/types/workspace.ts`

- [ ] **Step 1: Add migration after icon_color block in `server/db/index.ts`**

```ts
  // Migration: script readme (Markdown docs)
  try { _sqlDb.run("ALTER TABLE scripts ADD COLUMN readme TEXT NOT NULL DEFAULT ''") } catch (e) {}
```

- [ ] **Step 2: Extend `Script` and `StoredScript` in `app/types/workspace.ts`**

```ts
export interface Script {
  id: string
  title: string
  description: string
  readme: string
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
  ownerDisplayName?: string
  ownerAvatarUrl?: string
}
```

Mirror the same fields on `StoredScript`.

- [ ] **Step 3: Commit**

```bash
git add server/db/index.ts app/types/workspace.ts
git commit -m "feat(scripts): add readme column and owner display types"
```

---

### Task 2: List API — JOIN users + readme

**Files:**
- Modify: `server/api/scripts/index.get.ts`

- [ ] **Step 1: Update `mapRow` and SELECT to include owner + readme**

Replace `mapRow` and the list query so rows come from a JOIN:

```ts
function mapRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    readme: row.readme || "",
    zipName: row.file_name,
    zipSize: row.file_size,
    filePath: row.file_path,
    icon: row.icon || "file-archive",
    iconColor: row.icon_color || undefined,
    tags: JSON.parse(row.tags || "[]"),
    category: row.category || "",
    language: row.language || "",
    ownerId: row.owner_id,
    teamId: row.team_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerDisplayName: row.owner_display_name || "未知用户",
    ownerAvatarUrl: row.owner_avatar_url || "",
  }
}
```

Change count SQL to still use `FROM scripts` with the same `where` (no join needed for count).

Change list SQL to:

```ts
  const listStmt = db.prepare(
    `SELECT s.*, u.display_name AS owner_display_name, u.avatar_url AS owner_avatar_url
     FROM scripts s
     LEFT JOIN users u ON u.id = s.owner_id
     ${where.replace(/^WHERE/, "WHERE")} 
     ${orderBy.replace(/created_at/g, "s.created_at").replace(/title/g, "s.title")}
     LIMIT ? OFFSET ?`
  )
```

**Important:** Prefix columns in `where` / `orderBy` with `s.` when using JOIN. Refactor the handler so `where` is built as `WHERE s.team_id = ?` etc., and `orderBy` uses `s.created_at` / `s.title`.

Example where builder:

```ts
  let where = "WHERE"
  // ...
  if (teamId) { where += " s.team_id = ?"; params.push(teamId) }
  else if (scope === "personal") { where += " s.owner_id = ? AND s.team_id IS NULL"; params.push(userId) }
  else { where += " 1=1" }
  if (category) { where += " AND s.category = ?"; params.push(category) }
  if (language) { where += " AND s.language = ?"; params.push(language) }
  if (q) {
    where += " AND (LOWER(s.title) LIKE ? OR LOWER(s.description) LIKE ? OR LOWER(s.tags) LIKE ?)"
    const like = `%${q}%`
    params.push(like, like, like)
  }

  let orderBy = "ORDER BY s.created_at DESC"
  if (sort === "oldest") orderBy = "ORDER BY s.created_at ASC"
  else if (sort === "name") orderBy = "ORDER BY s.title COLLATE NOCASE ASC"

  const countStmt = db.prepare(`SELECT COUNT(*) AS c FROM scripts s ${where}`)
  // ...
  const listStmt = db.prepare(
    `SELECT s.*, u.display_name AS owner_display_name, u.avatar_url AS owner_avatar_url
     FROM scripts s
     LEFT JOIN users u ON u.id = s.owner_id
     ${where} ${orderBy} LIMIT ? OFFSET ?`
  )
```

When mapping, `listStmt.getAsObject()` fields: sql.js may flatten `s.*` without table prefix — `readme`, `file_name`, etc. remain as today; alias columns are `owner_display_name` / `owner_avatar_url`.

- [ ] **Step 2: Commit**

```bash
git add server/api/scripts/index.get.ts
git commit -m "feat(api): include readme and owner display on script list"
```

---

### Task 3: Detail GET + upload/update/copy/share readme

**Files:**
- Create: `server/api/scripts/[id]/index.get.ts`
- Modify: `server/api/scripts/index.post.ts`
- Modify: `server/api/scripts/[id]/index.put.ts`
- Modify: `server/api/scripts/[id]/copy.post.ts`
- Modify: `server/api/scripts/[id]/share.post.ts`

- [ ] **Step 1: Create detail handler `server/api/scripts/[id]/index.get.ts`**

```ts
import { getDb } from "../../../db/index"
import { parseSettings } from "../../../utils/team-permissions"

const README_MAX = 50000

function mapScriptRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    readme: row.readme || "",
    zipName: row.file_name,
    zipSize: row.file_size,
    filePath: row.file_path,
    icon: row.icon || "file-archive",
    iconColor: row.icon_color || undefined,
    tags: JSON.parse(row.tags || "[]"),
    category: row.category || "",
    language: row.language || "",
    ownerId: row.owner_id,
    teamId: row.team_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerDisplayName: row.owner_display_name || "未知用户",
    ownerAvatarUrl: row.owner_avatar_url || "",
  }
}

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const scriptId = getRouterParam(event, "id")
  if (!scriptId) throw createError({ statusCode: 400, message: "缺少脚本 ID" })

  const db = await getDb()
  const stmt = db.prepare(
    `SELECT s.*, u.display_name AS owner_display_name, u.avatar_url AS owner_avatar_url
     FROM scripts s
     LEFT JOIN users u ON u.id = s.owner_id
     WHERE s.id = ?`
  )
  stmt.bind([scriptId])
  if (!stmt.step()) {
    stmt.free()
    throw createError({ statusCode: 404, message: "脚本不存在" })
  }
  const row = stmt.getAsObject() as any
  stmt.free()

  const userId = auth.user.userId
  if (row.team_id) {
    const teamStmt = db.prepare("SELECT * FROM teams WHERE id = ?")
    teamStmt.bind([row.team_id])
    if (!teamStmt.step()) {
      teamStmt.free()
      throw createError({ statusCode: 404, message: "团队不存在" })
    }
    const team = teamStmt.getAsObject() as any
    teamStmt.free()
    const memberIds: string[] = JSON.parse(team.member_ids || "[]")
    if (team.owner_id !== userId && !memberIds.includes(userId)) {
      throw createError({ statusCode: 403, message: "无权查看该脚本" })
    }
  } else if (row.owner_id !== userId) {
    throw createError({ statusCode: 403, message: "无权查看该脚本" })
  }

  return mapScriptRow(row)
})
```

(Remove unused `README_MAX` / `parseSettings` if not used in this file — keep file clean.)

- [ ] **Step 2: Upload — read `readme`, validate length, INSERT**

In `index.post.ts`:

```ts
  const readme = getField("readme")
  if (readme.length > 50000) {
    throw createError({ statusCode: 400, message: "说明书过长（最多 50000 字符）" })
  }
```

Update INSERT to include `readme`:

```ts
  db.run(
    "INSERT INTO scripts (id, title, description, readme, file_name, file_size, file_path, tags, icon, icon_color, category, language, owner_id, team_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, title, description, readme, filename, fileField.data.length, filePath, JSON.stringify(tags), icon, iconColor, category, language, userId, teamId, now, now]
  )
```

Return `readme` in response `script` object.

- [ ] **Step 3: PUT — accept `readme`**

```ts
  const readme = typeof body?.readme === "string" ? body.readme : ""
  if (readme.length > 50000) {
    throw createError({ statusCode: 400, message: "说明书过长（最多 50000 字符）" })
  }

  db.run(
    "UPDATE scripts SET title = ?, description = ?, readme = ?, tags = ?, icon = ?, icon_color = ?, category = ?, language = ?, updated_at = ? WHERE id = ?",
    [title, description, readme, JSON.stringify(tags), icon, iconColor, category, language, now, scriptId]
  )
```

- [ ] **Step 4: copy.post.ts — include readme in INSERT**

Read `source.readme || ""` and add column to INSERT list/values (same pattern as other columns). Include `readme` in JSON response if present.

- [ ] **Step 5: share.post.ts — same for INSERT**

- [ ] **Step 6: Commit**

```bash
git add server/api/scripts/index.post.ts server/api/scripts/[id]/index.get.ts server/api/scripts/[id]/index.put.ts server/api/scripts/[id]/copy.post.ts server/api/scripts/[id]/share.post.ts
git commit -m "feat(api): script detail endpoint and readme persistence"
```

---

### Task 4: useScripts mapping + fetchScript

**Files:**
- Modify: `app/composables/useScripts.ts`

- [ ] **Step 1: Extend `toScript`**

```ts
function toScript(data: any): Script {
  return {
    id: data.id,
    title: data.title,
    description: data.description || "",
    readme: data.readme || "",
    category: data.category || "",
    language: data.language || "",
    zipName: data.zipName ?? data.file_name ?? "",
    zipSize: (typeof data.zipSize === "number" ? data.zipSize : (typeof data.file_size === "number" ? data.file_size : 0)),
    filePath: data.filePath ?? data.file_path ?? "",
    icon: data.icon || "file-archive",
    iconColor: data.iconColor ?? data.icon_color ?? undefined,
    tags: (Array.isArray(data.tags) ? data.tags : []),
    createdAt: data.createdAt ?? data.created_at ?? "",
    updatedAt: data.updatedAt ?? data.updated_at ?? "",
    ownerId: data.ownerId ?? data.owner_id ?? "",
    teamId: data.teamId ?? data.team_id ?? undefined,
    ownerDisplayName: data.ownerDisplayName ?? data.owner_display_name ?? undefined,
    ownerAvatarUrl: data.ownerAvatarUrl ?? data.owner_avatar_url ?? undefined,
  }
}
```

- [ ] **Step 2: `addScript` FormData append readme**

Add parameter `readme = ""` and:

```ts
formData.append("readme", readme)
```

Update call sites in personal/team pages in Task 7.

- [ ] **Step 3: Add `fetchScript`**

```ts
  async function fetchScript(id: string): Promise<Script | null> {
    try {
      const data = await apiFetch<any>(`/scripts/${id}`)
      return toScript(data)
    } catch (err: any) {
      console.error("[useScripts] fetchScript error:", err)
      throw err
    }
  }
```

Return `fetchScript` from the composable.

- [ ] **Step 4: Commit**

```bash
git add app/composables/useScripts.ts
git commit -m "feat(scripts): map readme/owner fields and fetchScript"
```

---

### Task 5: Install marked + DOMPurify; WsMarkdown

**Files:**
- Modify: `package.json` (via pnpm/npm)
- Create: `app/components/workspace/WsMarkdown.vue`

- [ ] **Step 1: Install deps**

```bash
pnpm add marked dompurify
pnpm add -D @types/dompurify
```

(If project uses npm: `npm install marked dompurify` and `@types/dompurify`.)

- [ ] **Step 2: Create `WsMarkdown.vue`**

```vue
<script setup lang="ts">
import { marked } from "marked"
import DOMPurify from "dompurify"

const props = defineProps<{ source: string }>()

const html = computed(() => {
  const raw = marked.parse(props.source || "", { async: false }) as string
  if (!import.meta.client) {
    // SSR: strip tags lightly — prefer empty on server or purify if window exists
    return ""
  }
  return DOMPurify.sanitize(raw)
})
</script>

<template>
  <div class="md-body" v-html="html" />
</template>

<style scoped>
.md-body {
  font-size: var(--text-sm);
  line-height: 1.65;
  color: var(--text);
  word-break: break-word;
}
.md-body :deep(h1),
.md-body :deep(h2),
.md-body :deep(h3) {
  margin: 1em 0 0.4em;
  font-weight: 700;
  color: var(--text);
}
.md-body :deep(p),
.md-body :deep(ul),
.md-body :deep(ol) {
  margin: 0.5em 0;
}
.md-body :deep(a) {
  color: var(--accent);
}
.md-body :deep(code) {
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: var(--bg-muted);
  font-size: 0.9em;
}
.md-body :deep(pre) {
  padding: 12px;
  overflow: auto;
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  border: 1px solid var(--border);
}
.md-body :deep(pre code) {
  padding: 0;
  background: transparent;
}
.md-body :deep(blockquote) {
  margin: 0.5em 0;
  padding-left: 12px;
  border-left: 3px solid var(--border-strong);
  color: var(--text-muted);
}
</style>
```

For SSR safety: only render `v-html` when `html` is non-empty on client; use `<ClientOnly>` wrapper in parents if needed:

```vue
<ClientOnly>
  <WorkspaceWsMarkdown :source="readme" />
</ClientOnly>
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml package-lock.json app/components/workspace/WsMarkdown.vue
git commit -m "feat(ui): add safe Markdown renderer for script readme"
```

(Commit whichever lockfile the repo uses.)

---

### Task 6: Enrich WsScriptCard

**Files:**
- Modify: `app/components/workspace/WsScriptCard.vue`

- [ ] **Step 1: Add auth helper for avatar**

In script setup:

```ts
const { getAvatarSrc, getUserInitials } = useAuth()

function ownerName(script: Script) {
  return script.ownerDisplayName || "未知用户"
}

function ownerAvatar(script: Script) {
  return getAvatarSrc(script.ownerAvatarUrl)
}
```

Import `Script` type if needed. `getUserInitials` may need a display name string — check `useAuth`; if it only uses current user, implement local initials:

```ts
function initials(name: string) {
  const t = name.trim()
  return t ? t.slice(0, 1).toUpperCase() : "?"
}
```

- [ ] **Step 2: Template — owner row, dual dates, 详情 button**

After meta-row (size already there), add:

```vue
    <div class="script-card__owner">
      <img
        v-if="script.ownerAvatarUrl"
        :src="ownerAvatar(script)"
        alt=""
        class="script-card__owner-avatar"
      >
      <span v-else class="script-card__owner-fallback">{{ initials(ownerName(script)) }}</span>
      <span class="script-card__owner-name">{{ ownerName(script) }}</span>
    </div>

    <div class="script-card__dates">
      <span title="上传日期">
        <Icon name="lucide:upload" size="12" />
        {{ formatDate(script.createdAt) }}
      </span>
      <span title="最近修改">
        <Icon name="lucide:pencil" size="12" />
        {{ formatDate(script.updatedAt || script.createdAt) }}
      </span>
    </div>
```

Replace footer time-only block: keep actions; add Details:

```vue
    <div class="script-card__cta">
      <NuxtLink :to="`/workspace/scripts/${script.id}`" class="script-card__detail">
        <Icon name="lucide:panel-right" size="14" />
        详情
      </NuxtLink>
      <!-- existing download + add-local; adjust grid to 3 cols or put 详情 as full-width link above CTA -->
    </div>
```

Preferred CTA layout:

```css
.script-card__cta {
  display: grid;
  grid-template-columns: auto 1fr 1.2fr;
  gap: 8px;
}
.script-card__detail {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 28px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 600;
  text-decoration: none;
}
.script-card__detail:hover {
  border-color: var(--accent-border);
  color: var(--accent);
}
.script-card__owner {
  display: flex;
  align-items: center;
  gap: 8px;
}
.script-card__owner-avatar,
.script-card__owner-fallback {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
}
.script-card__owner-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-muted);
  border: 1px solid var(--border);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
}
.script-card__owner-name {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.script-card__dates {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}
.script-card__dates span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
```

Remove the old single `script-card__time` if superseded by dates row.

- [ ] **Step 3: Commit**

```bash
git add app/components/workspace/WsScriptCard.vue
git commit -m "feat(ui): show owner, dates, and details link on script card"
```

---

### Task 7: Wide upload & edit dialogs

**Files:**
- Modify: `app/components/workspace/WsUploadModal.vue`
- Modify: `app/components/workspace/WsEditModal.vue`
- Modify: `app/pages/workspace/personal.vue`
- Modify: `app/pages/workspace/teams/[id]/index.vue`
- Modify: `app/composables/useScripts.ts` (addScript signature if not done)

- [ ] **Step 1: Upload modal — state + emit readme**

```ts
const readme = ref('')
const readmeTab = ref<'edit' | 'preview'>('edit')
```

Add `readme` to emit payload type and `onSubmit` payload.

Modal shell CSS:

```css
.upload-modal {
  width: min(960px, calc(100vw - 32px));
  max-height: min(88vh, 720px);
  display: flex;
  flex-direction: column;
  /* keep existing border/bg */
}
.upload-modal__body {
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: 0;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
.upload-modal__form-pane,
.upload-modal__docs-pane {
  overflow: auto;
  padding: 20px 22px;
  min-height: 0;
}
.upload-modal__docs-pane {
  border-left: 1px solid var(--border);
  background: var(--bg-muted);
}
@media (max-width: 800px) {
  .upload-modal__body {
    grid-template-columns: 1fr;
  }
  .upload-modal__docs-pane {
    border-left: none;
    border-top: 1px solid var(--border);
    max-height: 40vh;
  }
}
```

Right pane UI:

```vue
<div class="upload-modal__docs-pane">
  <div class="upload-docs__tabs">
    <button type="button" :class="{ active: readmeTab === 'edit' }" @click="readmeTab = 'edit'">编辑</button>
    <button type="button" :class="{ active: readmeTab === 'preview' }" @click="readmeTab = 'preview'">预览</button>
  </div>
  <textarea
    v-if="readmeTab === 'edit'"
    v-model="readme"
    class="upload-docs__editor"
    placeholder="产品说明书（Markdown）…"
    maxlength="50000"
    rows="16"
  />
  <ClientOnly v-else>
    <WorkspaceWsMarkdown :source="readme" />
  </ClientOnly>
</div>
```

Restructure template: header → `.upload-modal__body` (left existing form fields without outer narrow width) → footer actions.

- [ ] **Step 2: Edit modal — same layout; seed `readme` from `props.script.readme`**

Emit `readme` in `saved` payload.

- [ ] **Step 3: Wire pages + addScript**

`addScript(..., readme)` and PUT body include `readme: payload.readme`.

Personal `handleUpload` / `handleEditSave` and team equivalents.

- [ ] **Step 4: Commit**

```bash
git add app/components/workspace/WsUploadModal.vue app/components/workspace/WsEditModal.vue app/pages/workspace/personal.vue "app/pages/workspace/teams/[id]/index.vue" app/composables/useScripts.ts
git commit -m "feat(ui): wide upload/edit dialogs with markdown readme pane"
```

---

### Task 8: Detail page

**Files:**
- Create: `app/pages/workspace/scripts/[id].vue`

- [ ] **Step 1: Create page**

```vue
<script setup lang="ts">
import type { Script } from "~/types/workspace"

definePageMeta({ layout: "default" })

const route = useRoute()
const id = computed(() => route.params.id as string)
const { user, getAvatarSrc } = useAuth()
const { fetchScript, deleteScript } = useScripts()

const script = ref<Script | null>(null)
const loading = ref(true)
const error = ref("")
const showEdit = ref(false)

async function load() {
  loading.value = true
  error.value = ""
  try {
    script.value = await fetchScript(id.value)
  } catch (e: any) {
    script.value = null
    error.value = e?.message || "加载失败"
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(id, load)

const canEdit = computed(() => {
  if (!user.value || !script.value) return false
  if (!script.value.teamId) return script.value.ownerId === user.value.id
  // Team: optimistic — allow if owner; finer team role needs team detail.
  // Minimal: allow edit button; PUT enforces real permission.
  return true
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

async function onEditSaved(payload: any) {
  const token = localStorage.getItem("autoforge-token")
  await fetch("/api/scripts/" + payload.id, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      readme: payload.readme,
      tags: payload.tags,
      icon: payload.icon,
      iconColor: payload.iconColor,
      category: payload.category,
      language: payload.language,
    }),
  })
  showEdit.value = false
  await load()
}
</script>

<template>
  <div class="ws-page">
    <WorkspaceWsHeader />
    <div class="ws-page__body script-detail">
      <button type="button" class="script-detail__back" @click="$router.back()">
        <Icon name="lucide:arrow-left" size="16" />
        返回
      </button>

      <div v-if="loading" class="script-detail__status">加载中…</div>
      <div v-else-if="error" class="script-detail__status script-detail__status--error">{{ error }}</div>

      <div v-else-if="script" class="script-detail__layout">
        <aside class="script-detail__aside">
          <div class="script-detail__icon">
            <Icon :name="`lucide:${script.icon || 'file-archive'}`" size="28" :style="script.iconColor ? { color: script.iconColor } : undefined" />
          </div>
          <h1 class="script-detail__title">{{ script.title }}</h1>
          <p v-if="script.description" class="script-detail__desc">{{ script.description }}</p>

          <dl class="script-detail__meta">
            <div><dt>分类</dt><dd>{{ script.category || '—' }}</dd></div>
            <div><dt>语言</dt><dd>{{ script.language || '—' }}</dd></div>
            <div><dt>大小</dt><dd>{{ formatSize(script.zipSize) }}</dd></div>
            <div>
              <dt>上传者</dt>
              <dd class="script-detail__owner">
                <img v-if="script.ownerAvatarUrl" :src="getAvatarSrc(script.ownerAvatarUrl)" alt="" class="script-detail__avatar">
                <span>{{ script.ownerDisplayName || '未知用户' }}</span>
              </dd>
            </div>
            <div><dt>上传日期</dt><dd>{{ formatDate(script.createdAt) }}</dd></div>
            <div><dt>最近修改</dt><dd>{{ formatDate(script.updatedAt) }}</dd></div>
          </dl>

          <div v-if="script.tags.length" class="script-detail__tags">
            <span v-for="t in script.tags" :key="t">{{ t }}</span>
          </div>

          <div class="script-detail__actions">
            <button v-if="canEdit" type="button" class="script-detail__edit" @click="showEdit = true">
              <Icon name="lucide:pencil" size="14" />
              编辑
            </button>
            <!-- Reuse card CTAs optionally via embedding WsScriptCard actions or duplicate download later; minimum: Edit + back -->
          </div>
        </aside>

        <section class="script-detail__docs">
          <h2>产品说明书</h2>
          <ClientOnly>
            <WorkspaceWsMarkdown v-if="script.readme" :source="script.readme" />
            <p v-else class="script-detail__empty">暂无说明书</p>
          </ClientOnly>
        </section>
      </div>
    </div>

    <Teleport to="body">
      <WorkspaceWsEditModal
        v-if="showEdit && script"
        :script="script"
        @close="showEdit = false"
        @saved="onEditSaved"
      />
    </Teleport>
  </div>
</template>
```

Add scoped styles for two-column detail layout matching dialog aesthetics (dark tokens, aside ~360px, docs flex 1).

**Improve canEdit (recommended):** On team scripts, fetch team detail or pass query `?from=team` — simplest solid approach: if `!teamId`, owner only; if `teamId`, show Edit always and rely on PUT 403 + toast. Optionally hide Edit when PUT would fail by loading team role — out of scope unless easy.

- [ ] **Step 2: Commit**

```bash
git add app/pages/workspace/scripts/[id].vue
git commit -m "feat(scripts): add read-only script detail page with readme"
```

---

### Task 9: Polish + verify

- [ ] **Step 1: Grep stale INSERT without readme**

```bash
rg "INSERT INTO scripts" server
```

All inserts must include `readme`.

- [ ] **Step 2: Manual UI checklist**

| Case | Expected |
|------|----------|
| Upload with readme | List card shows owner; detail shows rendered MD |
| Edit readme | Detail updates after save |
| Card dates | Both created + updated visible |
| 详情 | Navigates to `/workspace/scripts/:id` |
| Wide dialog | ~960px, left form / right MD tabs |
| Mobile dialog | Stacked panes |
| XSS attempt in readme | Stripped in preview/detail |

- [ ] **Step 3: Final commit if needed**

```bash
git add -A
git commit -m "chore(scripts): polish readme detail flows"
```

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| `readme` column + types | 1 |
| List JOIN owner + readme | 2 |
| Detail GET; POST/PUT/copy/share | 3 |
| Composable mapping / fetchScript | 4 |
| Markdown renderer | 5 |
| Card size/owner/dates/详情 | 6 |
| Wide upload/edit dialogs | 7 |
| Detail page read-only + edit modal | 8 |

## Self-review notes

- No TBD placeholders
- `readme` / owner field names consistent across API and `toScript`
- Detail edit uses same `WsEditModal` after Task 7 emits `readme`
