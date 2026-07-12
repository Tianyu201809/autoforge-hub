# Script Card Grid & Server Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace team and personal script lists with a 3-column card grid, server-paginated at 30 items per request, with auto load-more on scroll.

**Architecture:** Extend `GET /api/scripts` to accept `page` / `pageSize` / `q` / `sort` and return `{ items, total, page, pageSize, hasMore }`. Rewrite `useScripts` for reset + append loading. Redesign `WsScriptCard` as a vertical card (reference layout, dark workspace tokens). Convert both list pages to CSS grid + `IntersectionObserver` sentinel; remove script-list `WsPagination`.

**Tech Stack:** Nuxt 4 / Nitro, sql.js SQLite, Vue 3 Composition API, existing workspace CSS variables.

**Spec:** `docs/superpowers/specs/2026-07-12-script-card-grid-pagination-design.md`

**Note:** Repo has no automated test runner for this feature. Verification uses browser + optional `curl` against `pnpm dev` / `npm run dev`. Default port if used elsewhere: `9876`. Set `BASE` and `TOKEN` from login when curling.

## Global Constraints

- `pageSize` default 30, clamp 1–100
- Search `q` matches title, description, tags (case-insensitive)
- Sort: `newest` | `oldest` | `name`
- Filter change → reset to page 1 (replace list, not append)
- Scroll near bottom → auto `loadMoreScripts` when `hasMore`
- Scope: team detail + personal pages; dashboard preload updated to new signature
- Do not keep dual card components; redesign `WsScriptCard` in place
- Keep download / install / delete-modal / captcha behavior

---

## File map

| File | Responsibility |
|------|----------------|
| `app/types/workspace.ts` | `ScriptListQuery`, `ScriptListResult` types |
| `server/api/scripts/index.get.ts` | Paginated list + search + sort |
| `app/composables/useScripts.ts` | `loadScripts` / `loadMoreScripts` + list state |
| `app/components/workspace/WsScriptCard.vue` | Vertical grid card UI |
| `app/pages/workspace/teams/[id]/index.vue` | Grid, query-driven load, infinite scroll |
| `app/pages/workspace/personal.vue` | Same as team list path |
| `app/pages/workspace/index.vue` | Fix `loadScripts` call site |

---

### Task 1: Types

**Files:**
- Modify: `app/types/workspace.ts`

- [ ] **Step 1: Append list query/result types after `ScriptSort`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add app/types/workspace.ts
git commit -m "feat(scripts): add paginated list query types"
```

---

### Task 2: Server pagination API

**Files:**
- Modify: `server/api/scripts/index.get.ts` (replace handler body)

- [ ] **Step 1: Replace `server/api/scripts/index.get.ts` with paginated handler**

```ts
import { getDb } from "../../db/index"

function mapRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
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
  }
}

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const query = getQuery(event)
  const scope = (query.scope as string) || "personal"
  const teamId = (query.teamId as string) || ""
  const category = (query.category as string) || ""
  const language = (query.language as string) || ""
  const q = ((query.q as string) || "").trim().toLowerCase()
  const sort = (query.sort as string) || "newest"
  const page = Math.max(1, parseInt(String(query.page || "1"), 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(String(query.pageSize || "30"), 10) || 30))
  const userId = auth.user.userId
  const db = await getDb()

  let where = "WHERE"
  const params: any[] = []

  if (teamId) {
    where += " team_id = ?"
    params.push(teamId)
  } else if (scope === "personal") {
    where += " owner_id = ? AND team_id IS NULL"
    params.push(userId)
  } else {
    where += " 1=1"
  }

  if (category) {
    where += " AND category = ?"
    params.push(category)
  }
  if (language) {
    where += " AND language = ?"
    params.push(language)
  }
  if (q) {
    where += " AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags) LIKE ?)"
    const like = `%${q}%`
    params.push(like, like, like)
  }

  let orderBy = "ORDER BY created_at DESC"
  if (sort === "oldest") orderBy = "ORDER BY created_at ASC"
  else if (sort === "name") orderBy = "ORDER BY title COLLATE NOCASE ASC"

  const countStmt = db.prepare(`SELECT COUNT(*) AS c FROM scripts ${where}`)
  countStmt.bind(params)
  countStmt.step()
  const total = Number((countStmt.getAsObject() as any).c || 0)
  countStmt.free()

  const offset = (page - 1) * pageSize
  const listStmt = db.prepare(
    `SELECT * FROM scripts ${where} ${orderBy} LIMIT ? OFFSET ?`
  )
  listStmt.bind([...params, pageSize, offset])
  const items: any[] = []
  while (listStmt.step()) {
    items.push(mapRow(listStmt.getAsObject()))
  }
  listStmt.free()

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  }
})
```

- [ ] **Step 2: Manual verify with curl (dev server running, valid JWT)**

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/scripts?scope=personal&page=1&pageSize=30" | head -c 500
```

Expected: JSON with `items`, `total`, `page`, `pageSize`, `hasMore` (not a bare array).

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/scripts?scope=personal&page=1&pageSize=2&sort=name&q=test"
```

Expected: at most 2 items; titles filtered by `q` when matches exist.

- [ ] **Step 3: Commit**

```bash
git add server/api/scripts/index.get.ts
git commit -m "feat(api): paginate scripts list with search and sort"
```

---

### Task 3: Rewrite `useScripts` list loading

**Files:**
- Modify: `app/composables/useScripts.ts`

- [ ] **Step 1: Replace composable list API**

Keep `apiFetch`, `toScript`, `addScript` FormData upload, `deleteScript` network call. Replace state + load helpers as follows.

At top of `useScripts()`:

```ts
import type { Script, ScriptSort, ScriptListQuery, ScriptListResult } from "~/types/workspace"

const PAGE_SIZE_DEFAULT = 30

export function useScripts() {
  const scripts = useState<Script[]>("workspace-scripts", () => [])
  const total = useState<number>("workspace-scripts-total", () => 0)
  const hasMore = useState<boolean>("workspace-scripts-has-more", () => false)
  const listLoading = useState<boolean>("workspace-scripts-loading", () => false)
  const listLoadingMore = useState<boolean>("workspace-scripts-loading-more", () => false)
  const listError = useState<string>("workspace-scripts-error", () => "")
  const currentQuery = useState<ScriptListQuery>("workspace-scripts-query", () => ({}))
  const currentPage = useState<number>("workspace-scripts-page", () => 0)

  function buildQueryString(query: ScriptListQuery, page: number): string {
    const params = new URLSearchParams()
    if (query.teamId) params.set("teamId", query.teamId)
    else params.set("scope", query.scope || "personal")
    params.set("page", String(page))
    params.set("pageSize", String(query.pageSize || PAGE_SIZE_DEFAULT))
    if (query.q?.trim()) params.set("q", query.q.trim())
    if (query.category) params.set("category", query.category)
    if (query.language) params.set("language", query.language)
    if (query.sort) params.set("sort", query.sort)
    return `?${params.toString()}`
  }

  async function loadScripts(query: ScriptListQuery = {}): Promise<void> {
    listLoading.value = true
    listError.value = ""
    currentQuery.value = { ...query }
    currentPage.value = 1
    try {
      const data = await apiFetch<ScriptListResult>(
        `/scripts${buildQueryString(query, 1)}`
      )
      scripts.value = (data.items || []).map(toScript)
      total.value = data.total
      hasMore.value = data.hasMore
      currentPage.value = data.page
    } catch (err: any) {
      console.error("[useScripts] loadScripts error:", err)
      scripts.value = []
      total.value = 0
      hasMore.value = false
      listError.value = err?.message || "加载失败"
    } finally {
      listLoading.value = false
    }
  }

  async function loadMoreScripts(): Promise<void> {
    if (!hasMore.value || listLoading.value || listLoadingMore.value) return
    listLoadingMore.value = true
    listError.value = ""
    const nextPage = currentPage.value + 1
    try {
      const data = await apiFetch<ScriptListResult>(
        `/scripts${buildQueryString(currentQuery.value, nextPage)}`
      )
      const mapped = (data.items || []).map(toScript)
      scripts.value = [...scripts.value, ...mapped]
      total.value = data.total
      hasMore.value = data.hasMore
      currentPage.value = data.page
    } catch (err: any) {
      console.error("[useScripts] loadMoreScripts error:", err)
      listError.value = err?.message || "加载更多失败"
    } finally {
      listLoadingMore.value = false
    }
  }

  function patchScript(id: string, patch: Partial<Script>) {
    const idx = scripts.value.findIndex(s => s.id === id)
    if (idx >= 0) {
      scripts.value[idx] = { ...scripts.value[idx], ...patch }
    }
  }

  function removeScriptLocal(id: string) {
    const before = scripts.value.length
    scripts.value = scripts.value.filter(s => s.id !== id)
    if (scripts.value.length < before) {
      total.value = Math.max(0, total.value - 1)
      hasMore.value = scripts.value.length < total.value
    }
  }
```

Update `addScript`: after successful upload, **do not** `unshift`; return mapped script and let callers call `loadScripts(currentQuery)` (or return script only). Remove optimistic unshift:

```ts
      if (data.script) {
        return toScript(data.script)
      }
      return null
```

Update `deleteScript`:

```ts
  function deleteScript(id: string) {
    const token = localStorage.getItem("autoforge-token")
    fetch(`/api/scripts/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {})
    removeScriptLocal(id)
  }
```

Keep `getPersonalScripts` / `getTeamScripts` / `searchScripts` / `sortScripts` temporarily for any leftover callers, or remove if unused after page updates (Task 5–6 will stop using them).

Return:

```ts
  return {
    scripts,
    total,
    hasMore,
    listLoading,
    listLoadingMore,
    listError,
    currentQuery,
    loadScripts,
    loadMoreScripts,
    getPersonalScripts,
    getTeamScripts,
    addScript,
    deleteScript,
    patchScript,
    searchScripts,
    sortScripts,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/composables/useScripts.ts
git commit -m "feat(scripts): server-driven load and load-more in useScripts"
```

---

### Task 4: Redesign `WsScriptCard` as vertical grid card

**Files:**
- Modify: `app/components/workspace/WsScriptCard.vue`

- [ ] **Step 1: Replace `<template>` card markup (keep delete modal + captcha)**

Keep all `<script setup>` logic. Replace the outer card structure:

```vue
<template>
  <div class="script-card">
    <div class="script-card__header">
      <div class="script-card__heading">
        <h3 class="script-card__title" :title="script.title">{{ script.title }}</h3>
        <p v-if="script.description" class="script-card__desc">{{ script.description }}</p>
      </div>
      <div class="script-card__icon" aria-hidden="true">
        <Icon
          :name="`lucide:${script.icon || 'file-archive'}`"
          size="22"
          class="script-card__archive-icon"
          :style="script.iconColor ? { color: script.iconColor } : undefined"
        />
      </div>
    </div>

    <div class="script-card__meta-row">
      <span v-if="script.category" class="script-card__cat-badge">{{ script.category }}</span>
      <span v-if="script.language" class="script-card__lang-badge">{{ script.language }}</span>
      <span class="script-card__meta-item">
        <Icon name="lucide:hard-drive" size="12" />
        {{ formatSize(script.zipSize) }}
      </span>
    </div>

    <div v-if="script.tags.length" class="script-card__tags">
      <span v-for="tag in script.tags.slice(0, 4)" :key="tag" class="script-card__tag">{{ tag }}</span>
      <span v-if="script.tags.length > 4" class="script-card__tag script-card__tag--more">+{{ script.tags.length - 4 }}</span>
    </div>

    <div class="script-card__footer">
      <span class="script-card__time">
        <Icon name="lucide:clock" size="12" />
        {{ formatDate(script.updatedAt || script.createdAt) }}
      </span>
      <div v-if="deletable || editable || copyable || shareable" class="script-card__actions">
        <button v-if="shareable" type="button" class="script-card__share" title="分享到团队" @click="emit('share', script)">
          <Icon name="lucide:share-2" size="14" />
        </button>
        <button v-if="copyable" type="button" class="script-card__copy" title="复制到我的空间" @click="emit('copy', script)">
          <Icon name="lucide:copy-plus" size="14" />
        </button>
        <button v-if="editable" type="button" class="script-card__edit" title="编辑脚本" @click="emit('edit', script)">
          <Icon name="lucide:pencil" size="14" />
        </button>
        <button v-if="deletable" type="button" class="script-card__delete" title="删除脚本" @click="handleDelete">
          <Icon name="lucide:trash-2" size="14" />
        </button>
      </div>
    </div>

    <div v-if="downloadable !== false" class="script-card__cta">
      <button
        type="button"
        class="script-card__download"
        :disabled="downloading || installing"
        title="下载脚本"
        @click="handleDownload"
      >
        <Icon :name="downloading ? 'lucide:loader-circle' : 'lucide:download'" size="14" :class="{ 'script-card__spin': downloading }" />
        {{ downloading ? '下载中...' : '下载' }}
      </button>
      <button
        type="button"
        class="script-card__add-local"
        :class="{ 'script-card__add-local--loading': installing }"
        :disabled="installing || downloading"
        :aria-busy="installing"
        title="添加到本地 Autoforge"
        @click="onAddToLocalClick"
      >
        <span class="script-card__add-local-shine" aria-hidden="true" />
        <span class="script-card__add-local-inner">
          <Icon
            :name="installing ? 'lucide:loader-circle' : 'lucide:monitor-down'"
            size="14"
            :class="{ 'script-card__spin': installing }"
          />
          <span class="script-card__add-local-label">
            {{ installing ? '添加中…' : '添加到本地' }}
          </span>
        </span>
      </button>
    </div>

    <p v-if="quotaError" class="script-card__quota-error">{{ quotaError }}</p>
    <p
      v-if="installMessage"
      class="script-card__install-msg"
      :class="{ 'script-card__install-msg--error': installMessageIsError }"
      role="status"
    >
      {{ installMessage }}
    </p>
  </div>

  <!-- keep existing Teleport delete modal + DownloadCaptchaModal unchanged -->
</template>
```

- [ ] **Step 2: Replace card layout CSS (keep modal / captcha / spin styles)**

Replace `.script-card` through tag/meta styles with vertical card layout:

```css
.script-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-card);
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
  animation: cardReveal 0.35s ease both;
}

.script-card:hover {
  border-color: var(--border-accent);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}

.script-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.script-card__heading {
  min-width: 0;
  flex: 1;
}

.script-card__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.script-card__desc {
  margin: 6px 0 0;
  font-size: var(--text-sm);
  line-height: 1.45;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.script-card__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  border: 1px solid var(--border);
}

.script-card__archive-icon {
  color: var(--accent);
  filter: var(--icon-accent-filter);
}

.script-card__meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.script-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 4px;
}

.script-card__time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.script-card__cta {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.script-card__download,
.script-card__add-local {
  width: 100%;
  justify-content: center;
}
```

Retain existing badge / tag / action button / add-local shine / modal styles; adjust `.script-card__add-local-label` if needed for shorter “添加到本地” text.

- [ ] **Step 3: Visual check on either list page after Task 5/6** (card alone can be committed first)

- [ ] **Step 4: Commit**

```bash
git add app/components/workspace/WsScriptCard.vue
git commit -m "feat(ui): redesign script card for grid layout"
```

---

### Task 5: Team page — grid + infinite scroll

**Files:**
- Modify: `app/pages/workspace/teams/[id]/index.vue`

- [ ] **Step 1: Replace script list data plumbing in `<script setup>`**

Remove: `PAGE_SIZE`, `currentPage`, `totalPages`, `pagedScripts`, client filter/sort `teamScripts` computed that filters `getTeamScripts`.

Change destructuring:

```ts
const {
  scripts,
  total,
  hasMore,
  listLoading,
  listLoadingMore,
  listError,
  addScript,
  deleteScript,
  loadScripts,
  loadMoreScripts,
} = useScripts()
```

Add:

```ts
const PAGE_SIZE = 30
const loadMoreSentinel = ref<HTMLElement | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

function currentListQuery() {
  return {
    teamId: teamId.value,
    pageSize: PAGE_SIZE,
    q: searchQuery.value,
    category: filterCategory.value,
    language: filterLanguage.value,
    sort: sortBy.value,
  }
}

function refreshScriptList() {
  return loadScripts(currentListQuery())
}

onMounted(() => {
  loadTeams()
  refreshScriptList()
  refreshDetail()
})

watch(teamId, () => {
  refreshScriptList()
})

watch([sortBy, filterCategory, filterLanguage], () => {
  refreshScriptList()
})

watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    refreshScriptList()
  }, 300)
})

onMounted(() => {
  const el = loadMoreSentinel
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some(e => e.isIntersecting)) {
        void loadMoreScripts()
      }
    },
    { root: null, rootMargin: "200px", threshold: 0 }
  )
  watch(loadMoreSentinel, (node, _, onCleanup) => {
    if (node) io.observe(node)
    onCleanup(() => {
      io.disconnect()
    })
  }, { immediate: true })
  onBeforeUnmount(() => io.disconnect())
})
```

Prefer a single `onMounted` / `onBeforeUnmount` block — merge observers carefully to avoid double `onMounted`. Recommended pattern:

```ts
let io: IntersectionObserver | null = null

onMounted(() => {
  loadTeams()
  refreshScriptList()
  refreshDetail()

  io = new IntersectionObserver(
    (entries) => {
      if (entries.some(e => e.isIntersecting)) void loadMoreScripts()
    },
    { rootMargin: "200px" }
  )
  if (loadMoreSentinel.value) io.observe(loadMoreSentinel.value)
})

watch(loadMoreSentinel, (node, prev) => {
  if (!io) return
  if (prev) io.unobserve(prev)
  if (node) io.observe(node)
})

onBeforeUnmount(() => {
  io?.disconnect()
  if (searchTimer) clearTimeout(searchTimer)
})
```

Update upload / edit save to `await refreshScriptList()` instead of `loadScripts("team", teamId.value)`.

Template list section: use `scripts` instead of `pagedScripts` / filtered `teamScripts`. Empty state when `!listLoading && scripts.length === 0`. Show loading when `listLoading && scripts.length === 0`.

- [ ] **Step 2: Update template list + footer**

Replace scripts list block:

```vue
        <div v-if="listLoading && scripts.length === 0" class="ws-empty">
          <p class="ws-empty__text">加载中…</p>
        </div>

        <div v-else-if="scripts.length > 0" class="ws-script-list">
          <WorkspaceWsScriptCard
            v-for="script in scripts"
            :key="script.id"
            :script="script"
            :deletable="canDeleteScript(script)"
            :editable="canEditScript(script)"
            :downloadable="canDownload"
            :copyable="true"
            @edit="handleEditScript"
            @delete="handleDeleteScript"
            @copy="handleCopyScript"
          />
        </div>

        <div v-else class="ws-empty">
          <Icon name="lucide:package" size="48" class="ws-empty__icon" />
          <h2 class="ws-empty__title">{{ searchQuery ? '没有匹配的脚本' : '团队还没有脚本' }}</h2>
          <p class="ws-empty__text">
            {{ searchQuery ? '试试其他关键词' : '上传第一个 .zip 脚本包，与团队成员共享' }}
          </p>
          <button v-if="!searchQuery && canUpload" type="button" class="ws-empty__btn" @click="showUpload = true">
            <Icon name="lucide:upload" size="16" />
            上传第一个脚本
          </button>
        </div>

        <div v-if="scripts.length > 0" class="ws-load-more">
          <div ref="loadMoreSentinel" class="ws-load-more__sentinel" aria-hidden="true" />
          <p v-if="listLoadingMore" class="ws-load-more__text">加载中…</p>
          <p v-else-if="!hasMore" class="ws-load-more__text">没有更多了</p>
          <p v-else-if="listError" class="ws-load-more__text ws-load-more__text--error">{{ listError }}</p>
        </div>
```

Remove `<WorkspaceWsPagination ... />` from this page.

Optional: show `共 {{ total }} 个脚本` near toolbar if useful (not required).

- [ ] **Step 3: Grid CSS**

Replace `.ws-script-list` and add load-more styles:

```css
.ws-script-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 1100px) {
  .ws-script-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .ws-script-list {
    grid-template-columns: 1fr;
  }
}

.ws-load-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 0 8px;
}

.ws-load-more__sentinel {
  width: 100%;
  height: 1px;
}

.ws-load-more__text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.ws-load-more__text--error {
  color: var(--danger);
}
```

- [ ] **Step 4: Browser verify**

- Open a team with scripts: 3 columns on wide screens
- Change search/sort/filter: list resets, network shows `page=1`
- If >30 scripts (seed or upload): scroll bottom triggers `page=2`, items append, then「没有更多了」

- [ ] **Step 5: Commit**

```bash
git add app/pages/workspace/teams/[id]/index.vue
git commit -m "feat(teams): script grid with infinite scroll pagination"
```

---

### Task 6: Personal page — same grid + infinite scroll

**Files:**
- Modify: `app/pages/workspace/personal.vue`

- [ ] **Step 1: Mirror Task 5 data plumbing**

Destructure same list state from `useScripts`. Remove `PAGE_SIZE=5`, `pagedScripts`, `personalScripts` client filter computed, `searchScripts`/`sortScripts` usage.

```ts
function currentListQuery() {
  return {
    scope: 'personal' as const,
    pageSize: 30,
    q: searchQuery.value,
    category: filterCategory.value,
    language: filterLanguage.value,
    sort: sortBy.value,
  }
}

function refreshScriptList() {
  return loadScripts(currentListQuery())
}
```

Wire watchers, IntersectionObserver, upload/edit → `refreshScriptList()` same as team page.

- [ ] **Step 2: Template + CSS**

Same grid / sentinel / remove `WorkspaceWsPagination` as Task 5. Cards use personal props (`shareable`, no `copyable` unless already present).

- [ ] **Step 3: Browser verify personal space** (3 columns, search debounce, load more)

- [ ] **Step 4: Commit**

```bash
git add app/pages/workspace/personal.vue
git commit -m "feat(personal): script grid with infinite scroll pagination"
```

---

### Task 7: Fix dashboard `loadScripts` call

**Files:**
- Modify: `app/pages/workspace/index.vue`

- [ ] **Step 1: Update preload call**

Either remove unused preload:

```ts
onMounted(() => {
  loadTeams()
})
```

and drop unused `loadScripts` import — **preferred** (dashboard does not render script list).

Or keep warm cache:

```ts
onMounted(() => {
  loadScripts({ scope: 'personal' })
  loadTeams()
})
```

- [ ] **Step 2: Grep for stale call sites**

```bash
rg "loadScripts\(" app
```

Expected: only new object-form calls / `refreshScriptList`. No `loadScripts("team", id)` or bare reliance on array response.

- [ ] **Step 3: Commit**

```bash
git add app/pages/workspace/index.vue
git commit -m "fix(workspace): align dashboard with paginated loadScripts"
```

---

### Task 8: End-to-end polish

- [ ] **Step 1: Remove dead helpers if unused**

If `getTeamScripts` / `getPersonalScripts` / `searchScripts` / `sortScripts` have no remaining references, remove them from `useScripts.ts` return and definitions. Keep if still referenced.

```bash
rg "getTeamScripts|getPersonalScripts|searchScripts|sortScripts" app
```

- [ ] **Step 2: Full UI pass**

| Case | Expected |
|------|----------|
| Empty team / personal | Empty state, no「没有更多了」spam |
| ≤30 items | One request, footer「没有更多了」 |
| >30 items | Append on scroll |
| Search no match | Empty +「没有匹配的脚本」 |
| Upload | Reloads page 1 with new item |
| Delete | Item disappears; total decrements |
| Narrow viewport | 2 then 1 column |

- [ ] **Step 3: Final commit if polish changes remain**

```bash
git add -A
git commit -m "chore(scripts): clean up unused list helpers after pagination"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| API page/pageSize/q/sort + new response shape | 2 |
| Types | 1 |
| useScripts reset + append | 3 |
| Vertical card mapped from reference | 4 |
| 3-column grid responsive | 5, 6 |
| Auto load more + footer text | 5, 6 |
| Team + personal scope | 5, 6 |
| Upload/delete refresh consistency | 3, 5, 6 |
| Dashboard call site | 7 |

## Self-review notes

- No TBD placeholders
- Response type consistently `ScriptListResult` across API, composable, pages
- `WsPagination` left intact for audit logs
- sql.js `LIKE` on `tags` JSON text is acceptable for Hub scale
