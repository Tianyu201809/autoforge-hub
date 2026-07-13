# Plugin Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a full plugin marketplace: browse/filter/search public scripts, detail with install/download, and a submit/unpublish flow—matching Autoforge Hub theme with GSAP motion.

**Architecture:** Extend `scripts` with `visibility` / `published_at` / `install_count`. Add `scope=marketplace` list + category counts + publish/unpublish APIs. Allow any logged-in user to read/install/download **public** scripts (today personal scripts are owner-only). Frontend is an independent `/workspace/marketplace` domain with compact cards, hero+README detail, and a 3-step submit wizard.

**Tech Stack:** Nuxt 4 / Nitro, sql.js SQLite, Vue 3 Composition API, GSAP 3 (+ ScrollTrigger), existing workspace CSS tokens.

**Spec:** `docs/superpowers/specs/2026-07-13-plugin-marketplace-design.md`

**Note:** Repo has no automated test runner for this feature. Verify with `npm run dev` + browser, and optional `curl` (set `BASE` / `TOKEN` after login). Default port if used elsewhere: `9876`.

## Global Constraints

- Login required for all marketplace routes (existing auth middleware)
- Marketplace list: only `visibility = 'public'`
- Sort: `newest` (`published_at DESC`) | `installs` (`install_count DESC`) | `updated` (`updated_at DESC`)
- `pageSize` default 30, clamp 1–100
- List responses omit `readme` (detail fetches full row)
- `install_count` increments only on successful **installToken** download path (添加到本地), not captcha ZIP download
- `prefers-reduced-motion: reduce` → no translate/stagger
- Do not restyle personal/team `WsScriptCard`

---

## File map

| File | Responsibility |
|------|----------------|
| `app/types/workspace.ts` | `visibility`, marketplace sorts/categories, query types |
| `server/db/index.ts` | ALTER columns for visibility / published_at / install_count |
| `server/utils/script-access.ts` | Shared can-view / can-download helpers |
| `server/api/scripts/index.get.ts` | `scope=marketplace` + marketplace sorts; map new fields |
| `server/api/scripts/marketplace/categories.get.ts` | Per-category public counts |
| `server/api/scripts/[id]/index.get.ts` | Allow public read |
| `server/api/scripts/[id]/install-token.post.ts` | Allow public install token |
| `server/api/scripts/[id]/download.get.ts` | Allow public download; bump install_count on installToken |
| `server/api/scripts/marketplace/publish.post.ts` | Publish personal script |
| `server/api/scripts/[id]/unpublish.post.ts` | Author unpublish |
| `app/composables/useMarketplace.ts` | List / categories / publish / unpublish |
| `app/components/workspace/WsHeader.vue` | Nav link left of 个人空间 |
| `app/components/marketplace/MpCategorySidebar.vue` | Category filter + counts |
| `app/components/marketplace/MpPluginCard.vue` | Compact horizontal card |
| `app/pages/workspace/marketplace/index.vue` | List layout B + GSAP |
| `app/pages/workspace/marketplace/[id].vue` | Hero + README detail + install |
| `app/pages/workspace/marketplace/submit.vue` | 3-step publish wizard + GSAP |

---

### Task 1: Types & category constants

**Files:**
- Modify: `app/types/workspace.ts`

- [ ] **Step 1: Extend `Script` / `StoredScript` and list types**

On `Script` and `StoredScript`, add:

```ts
visibility?: 'private' | 'public'
publishedAt?: string
installCount?: number
```

Replace / extend sorts and categories:

```ts
export type ScriptSort = 'newest' | 'oldest' | 'name'
export type MarketplaceSort = 'newest' | 'installs' | 'updated'

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number]

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
```

Also create `server/utils/marketplace-categories.ts` with the string array, then in `workspace.ts`:

```ts
import { MARKETPLACE_CATEGORIES as _CATS } from '../../server/utils/marketplace-categories'
// Prefer duplicating the const in app/types if Nuxt client cannot import server paths:
export const MARKETPLACE_CATEGORIES = [
  '实用工具', '自动化', '数据处理', '数据爬取',
  'DevOps', 'Web 开发', 'AI/ML',
  '数据库', '监控', '安全', '测试', '其他',
] as const
export const SCRIPT_CATEGORIES = MARKETPLACE_CATEGORIES
```

Keep `ScriptListResult` unchanged. Keep server util and client const in sync (same ordered list).

- [ ] **Step 2: Commit**

```bash
git add app/types/workspace.ts server/utils/marketplace-categories.ts
git commit -m "feat(marketplace): add visibility types and marketplace categories"
```

---

### Task 2: DB migration

**Files:**
- Modify: `server/db/index.ts` (after existing scripts ALTER blocks ~line 110)

- [ ] **Step 1: Add marketplace columns**

```ts
  try { _sqlDb.run("ALTER TABLE scripts ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'") } catch (e) {}
  try { _sqlDb.run("ALTER TABLE scripts ADD COLUMN published_at TEXT DEFAULT NULL") } catch (e) {}
  try { _sqlDb.run("ALTER TABLE scripts ADD COLUMN install_count INTEGER NOT NULL DEFAULT 0") } catch (e) {}
```

- [ ] **Step 2: Restart `npm run dev` once and confirm app boots (no SQL crash)**

Expected: Hub loads; existing personal scripts still list.

- [ ] **Step 3: Commit**

```bash
git add server/db/index.ts
git commit -m "feat(db): add scripts visibility, published_at, install_count"
```

---

### Task 3: Shared script access helper

**Files:**
- Create: `server/utils/script-access.ts`

- [ ] **Step 1: Add helper**

```ts
export function isPublicScript(row: { visibility?: string | null }) {
  return (row.visibility || "private") === "public"
}

/** View: public OR owner OR team member (caller supplies team membership check). */
export function canViewPersonalOrPublic(
  row: { visibility?: string | null; owner_id: string; team_id?: string | null },
  userId: string
) {
  if (isPublicScript(row)) return true
  if (!row.team_id && row.owner_id === userId) return true
  return false
}

/** Download/install same as view for personal+public; team path stays in route handlers. */
export function canDownloadPersonalOrPublic(
  row: { visibility?: string | null; owner_id: string; team_id?: string | null },
  userId: string
) {
  return canViewPersonalOrPublic(row, userId)
}
```

- [ ] **Step 2: Commit**

```bash
git add server/utils/script-access.ts
git commit -m "feat(marketplace): add script access helpers for public visibility"
```

---

### Task 4: Marketplace list API (`scope=marketplace`)

**Files:**
- Modify: `server/api/scripts/index.get.ts`

- [ ] **Step 1: Extend `mapRow` with marketplace fields**

```ts
    visibility: row.visibility || "private",
    publishedAt: row.published_at || undefined,
    installCount: Number(row.install_count || 0),
```

- [ ] **Step 2: Handle `scope === "marketplace"` branch**

After parsing query vars, replace the where-builder start so marketplace is first-class:

```ts
  if (teamId) {
    where += " s.team_id = ?"
    params.push(teamId)
  } else if (scope === "marketplace") {
    where += " s.visibility = 'public' AND s.team_id IS NULL"
  } else if (scope === "personal") {
    where += " s.owner_id = ? AND s.team_id IS NULL"
    params.push(userId)
  } else {
    where += " 1=1"
  }
```

- [ ] **Step 3: Marketplace sorts + omit readme on marketplace list**

```ts
  let orderBy = "ORDER BY s.created_at DESC"
  if (scope === "marketplace") {
    if (sort === "installs") orderBy = "ORDER BY s.install_count DESC, s.published_at DESC"
    else if (sort === "updated") orderBy = "ORDER BY s.updated_at DESC"
    else orderBy = "ORDER BY COALESCE(s.published_at, s.created_at) DESC"
  } else {
    if (sort === "oldest") orderBy = "ORDER BY s.created_at ASC"
    else if (sort === "name") orderBy = "ORDER BY s.title COLLATE NOCASE ASC"
  }
```

In the SELECT for list items, when `scope === "marketplace"`, select `'' AS readme` (or omit mapping readme to `""`) so payloads stay small. Keep joining owner user for `owner_display_name` / `owner_avatar_url` as today.

- [ ] **Step 4: Manual verify with curl (after login)**

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/scripts?scope=marketplace&page=1&pageSize=30"
```

Expected: `{ items: [], total: 0, page: 1, pageSize: 30, hasMore: false }` (before any publish).

- [ ] **Step 5: Commit**

```bash
git add server/api/scripts/index.get.ts
git commit -m "feat(api): support marketplace scope listing and sorts"
```

---

### Task 5: Category counts API

**Files:**
- Create: `server/api/scripts/marketplace/categories.get.ts`

- [ ] **Step 1: Implement handler**

```ts
import { getDb } from "../../../db/index"
import { MARKETPLACE_CATEGORIES } from "../../../../app/types/workspace"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const db = await getDb()
  const totalStmt = db.prepare(
    "SELECT COUNT(*) AS c FROM scripts WHERE visibility = 'public' AND team_id IS NULL"
  )
  totalStmt.step()
  const total = Number((totalStmt.getAsObject() as any).c || 0)
  totalStmt.free()

  const counts: Record<string, number> = {}
  for (const cat of MARKETPLACE_CATEGORIES) {
    const st = db.prepare(
      "SELECT COUNT(*) AS c FROM scripts WHERE visibility = 'public' AND team_id IS NULL AND category = ?"
    )
    st.bind([cat])
    st.step()
    counts[cat] = Number((st.getAsObject() as any).c || 0)
    st.free()
  }

  return { total, counts }
})
```

If Nitro cannot import from `app/types`, duplicate the category string array in `server/utils/marketplace-categories.ts` and import from both client types and server (prefer shared server util + re-export from `app/types/workspace.ts`).

- [ ] **Step 2: curl**

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/scripts/marketplace/categories"
```

Expected: `{ total: 0, counts: { "实用工具": 0, ... } }`

- [ ] **Step 3: Commit**

```bash
git add server/api/scripts/marketplace/categories.get.ts server/utils/marketplace-categories.ts app/types/workspace.ts
git commit -m "feat(api): marketplace category counts endpoint"
```

---

### Task 6: Public read / install / download + install_count

**Files:**
- Modify: `server/api/scripts/[id]/index.get.ts`
- Modify: `server/api/scripts/[id]/install-token.post.ts`
- Modify: `server/api/scripts/[id]/download.get.ts`

- [ ] **Step 1: Detail GET — allow public**

Import `isPublicScript`. After loading row, change personal branch:

```ts
  if (row.team_id) {
    // existing team membership check
  } else if (!isPublicScript(row) && row.owner_id !== userId) {
    throw createError({ statusCode: 403, message: "无权查看该脚本" })
  }
```

Include `visibility`, `publishedAt`, `installCount` in `mapScriptRow`.

- [ ] **Step 2: install-token — allow public**

Replace personal denial:

```ts
  } else if (!isPublicScript(row) && row.owner_id !== userId) {
    throw createError({ statusCode: 403, message: "无权限下载" })
  }
```

- [ ] **Step 3: download GET — allow public on captcha path; bump count on installToken path**

Personal branch:

```ts
  } else if (!isPublicScript(row) && row.owner_id !== userId) {
    throw createError({ statusCode: 403, message: "无权限下载" })
  }
```

Inside the `installToken` success path, **after** successful `consumeInstallToken` and before `serveScriptFile`:

```ts
    db.run(
      "UPDATE scripts SET install_count = COALESCE(install_count, 0) + 1 WHERE id = ?",
      [scriptId]
    )
    saveDb()
```

Import `saveDb` from `server/db/index`. Do **not** increment on the captcha download path.

- [ ] **Step 4: Commit**

```bash
git add server/api/scripts/[id]/index.get.ts server/api/scripts/[id]/install-token.post.ts server/api/scripts/[id]/download.get.ts
git commit -m "feat(api): allow public script read/install and track install_count"
```

---

### Task 7: Publish & unpublish APIs

**Files:**
- Create: `server/api/scripts/marketplace/publish.post.ts`
- Create: `server/api/scripts/[id]/unpublish.post.ts`

- [ ] **Step 1: Publish handler**

Accept JSON body:

```ts
{
  scriptId: string
  title?: string
  description?: string
  readme?: string
  category: string
  language?: string
  tags?: string[]
  icon?: string
  iconColor?: string
}
```

Rules:

1. Auth required
2. Load script; must exist, `team_id IS NULL`, `owner_id === userId`
3. If already `visibility === 'public'`, return `409` with message `已在集市中` and `{ scriptId }`
4. `category` required and must be in `MARKETPLACE_CATEGORIES`
5. Effective readme (body or row) trimmed length ≥ 20
6. Must have non-empty `file_path`
7. Update metadata fields if provided; set `visibility='public'`, `published_at = now` only if `published_at` was null (keep first publish time on re-publish after… wait: unpublish clears visibility; on re-publish set `published_at` to now again)
8. Spec: unpublish → private; re-publish → set `published_at` to now
9. Return mapped script (with owner fields)

```ts
import { getDb, saveDb } from "../../../db/index"
import { MARKETPLACE_CATEGORIES } from "../../../utils/marketplace-categories"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const body = await readBody(event)
  const scriptId = String(body?.scriptId || "")
  if (!scriptId) throw createError({ statusCode: 400, message: "缺少 scriptId" })

  const category = String(body?.category || "").trim()
  if (!category || !(MARKETPLACE_CATEGORIES as readonly string[]).includes(category)) {
    throw createError({ statusCode: 400, message: "请选择有效分类" })
  }

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM scripts WHERE id = ?")
  stmt.bind([scriptId])
  if (!stmt.step()) {
    stmt.free()
    throw createError({ statusCode: 404, message: "脚本不存在" })
  }
  const row = stmt.getAsObject() as any
  stmt.free()

  if (row.team_id) throw createError({ statusCode: 400, message: "团队脚本不能直接上架，请使用个人空间脚本" })
  if (row.owner_id !== auth.user.userId) throw createError({ statusCode: 403, message: "只能上架自己的脚本" })
  if ((row.visibility || "private") === "public") {
    throw createError({ statusCode: 409, message: "已在集市中", data: { scriptId } })
  }

  const title = String(body?.title ?? row.title).trim()
  const description = String(body?.description ?? row.description ?? "").trim()
  const readme = String(body?.readme ?? row.readme ?? "")
  if (!title) throw createError({ statusCode: 400, message: "标题不能为空" })
  if (readme.trim().length < 20) throw createError({ statusCode: 400, message: "请完善 README（至少 20 字）" })
  if (!row.file_path) throw createError({ statusCode: 400, message: "脚本缺少安装包" })

  const tags = Array.isArray(body?.tags) ? body.tags : JSON.parse(row.tags || "[]")
  const icon = body?.icon || row.icon || "file-archive"
  const iconColor = body?.iconColor ?? row.icon_color ?? null
  const language = String(body?.language ?? row.language ?? "").trim()
  const now = new Date().toISOString()

  db.run(
    `UPDATE scripts SET title = ?, description = ?, readme = ?, tags = ?, icon = ?, icon_color = ?,
      category = ?, language = ?, visibility = 'public', published_at = ?, updated_at = ?, updated_by = ?
     WHERE id = ?`,
    [
      title, description, readme, JSON.stringify(tags), icon, iconColor,
      category, language, now, now, auth.user.userId, scriptId,
    ]
  )
  saveDb()

  return { ok: true, id: scriptId }
})
```

- [ ] **Step 2: Unpublish handler**

```ts
import { getDb, saveDb } from "../../../db/index"
import { isPublicScript } from "../../../utils/script-access"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const scriptId = getRouterParam(event, "id")
  if (!scriptId) throw createError({ statusCode: 400, message: "缺少脚本 ID" })

  const db = await getDb()
  const stmt = db.prepare("SELECT * FROM scripts WHERE id = ?")
  stmt.bind([scriptId])
  if (!stmt.step()) {
    stmt.free()
    throw createError({ statusCode: 404, message: "脚本不存在" })
  }
  const row = stmt.getAsObject() as any
  stmt.free()

  if (row.owner_id !== auth.user.userId) {
    throw createError({ statusCode: 403, message: "只能下架自己的插件" })
  }
  if (!isPublicScript(row)) {
    return { ok: true, id: scriptId, alreadyPrivate: true }
  }

  const now = new Date().toISOString()
  db.run(
    "UPDATE scripts SET visibility = 'private', published_at = NULL, updated_at = ?, updated_by = ? WHERE id = ?",
    [now, auth.user.userId, scriptId]
  )
  saveDb()
  return { ok: true, id: scriptId }
})
```

- [ ] **Step 3: After unpublish, non-owner detail must 403/404**

Author can still GET own private script via existing personal rules. Optional: marketplace detail page treats 403 as “已下架”.

- [ ] **Step 4: Commit**

```bash
git add server/api/scripts/marketplace/publish.post.ts server/api/scripts/[id]/unpublish.post.ts
git commit -m "feat(api): publish and unpublish marketplace scripts"
```

---

### Task 8: `useMarketplace` composable

**Files:**
- Create: `app/composables/useMarketplace.ts`
- Modify: `app/composables/useScripts.ts` (`toScript` map new fields)

- [ ] **Step 1: Map new fields in `toScript`**

```ts
    visibility: data.visibility || "private",
    publishedAt: data.publishedAt ?? data.published_at ?? undefined,
    installCount: Number(data.installCount ?? data.install_count ?? 0),
```

- [ ] **Step 2: Create `useMarketplace`**

Mirror `useScripts` list state but with dedicated `useState` keys (`marketplace-*`) to avoid clobbering personal list:

```ts
import type { MarketplaceSort, Script, ScriptListResult } from "~/types/workspace"

const PAGE_SIZE_DEFAULT = 30

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = import.meta.client ? localStorage.getItem("autoforge-token") : null
  const headers: Record<string, string> = {}
  if (options?.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json"
  }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`/api${url}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.message || "请求失败"), { statusCode: res.status, data })
  return data as T
}

export function useMarketplace() {
  const items = useState<Script[]>("marketplace-items", () => [])
  const total = useState("marketplace-total", () => 0)
  const hasMore = useState("marketplace-has-more", () => false)
  const loading = useState("marketplace-loading", () => false)
  const loadingMore = useState("marketplace-loading-more", () => false)
  const error = useState("marketplace-error", () => "")
  const categoryTotal = useState("marketplace-cat-total", () => 0)
  const categoryCounts = useState<Record<string, number>>("marketplace-cat-counts", () => ({}))
  const page = useState("marketplace-page", () => 0)
  const query = useState<{ q: string; category: string; sort: MarketplaceSort }>(
    "marketplace-query",
    () => ({ q: "", category: "", sort: "newest" })
  )

  function qs(p: number) {
    const params = new URLSearchParams()
    params.set("scope", "marketplace")
    params.set("page", String(p))
    params.set("pageSize", String(PAGE_SIZE_DEFAULT))
    if (query.value.q.trim()) params.set("q", query.value.q.trim())
    if (query.value.category) params.set("category", query.value.category)
    params.set("sort", query.value.sort)
    return `?${params}`
  }

  async function loadCategories() {
    const data = await apiFetch<{ total: number; counts: Record<string, number> }>(
      "/scripts/marketplace/categories"
    )
    categoryTotal.value = data.total
    categoryCounts.value = data.counts || {}
  }

  async function loadList(next = { ...query.value }) {
    query.value = { ...next }
    loading.value = true
    error.value = ""
    page.value = 1
    try {
      const data = await apiFetch<ScriptListResult>(`/scripts${qs(1)}`)
      items.value = data.items || []
      total.value = data.total
      hasMore.value = data.hasMore
      page.value = data.page
    } catch (e: any) {
      items.value = []
      error.value = e?.message || "加载失败"
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (!hasMore.value || loading.value || loadingMore.value) return
    loadingMore.value = true
    try {
      const nextPage = page.value + 1
      const data = await apiFetch<ScriptListResult>(`/scripts${qs(nextPage)}`)
      items.value = [...items.value, ...(data.items || [])]
      hasMore.value = data.hasMore
      page.value = data.page
    } catch (e: any) {
      error.value = e?.message || "加载失败"
    } finally {
      loadingMore.value = false
    }
  }

  async function publish(body: Record<string, unknown>) {
    return apiFetch<{ ok: boolean; id: string }>("/scripts/marketplace/publish", {
      method: "POST",
      body: JSON.stringify(body),
    })
  }

  async function unpublish(id: string) {
    return apiFetch<{ ok: boolean }>(`/scripts/${id}/unpublish`, { method: "POST" })
  }

  return {
    items, total, hasMore, loading, loadingMore, error,
    categoryTotal, categoryCounts, query,
    loadCategories, loadList, loadMore, publish, unpublish,
  }
}
```

Ensure list API returns camelCase fields already via `mapRow` (or map in composable). Prefer fixing `mapRow` once.

- [ ] **Step 3: Commit**

```bash
git add app/composables/useMarketplace.ts app/composables/useScripts.ts
git commit -m "feat(marketplace): add useMarketplace composable"
```

---

### Task 9: Header entry

**Files:**
- Modify: `app/components/workspace/WsHeader.vue`

- [ ] **Step 1: Insert nav link before 个人空间**

```vue
          <NuxtLink to="/workspace/marketplace" class="ws-nav__link" active-class="ws-nav__link--active">
            <Icon name="lucide:store" size="16" />
            <span>插件集市</span>
          </NuxtLink>
          <NuxtLink to="/workspace/personal" class="ws-nav__link" active-class="ws-nav__link--active">
```

- [ ] **Step 2: Commit**

```bash
git add app/components/workspace/WsHeader.vue
git commit -m "feat(marketplace): add marketplace nav entry left of personal"
```

---

### Task 10: Sidebar + card components

**Files:**
- Create: `app/components/marketplace/MpCategorySidebar.vue`
- Create: `app/components/marketplace/MpPluginCard.vue`

- [ ] **Step 1: `MpCategorySidebar.vue`**

Props: `total: number`, `counts: Record<string, number>`, `modelValue: string` (empty = 全部).  
Emit `update:modelValue`.  
Render 「全部」 + `MARKETPLACE_CATEGORIES` with counts. Active item uses `--accent-soft` / `--accent-border` like `ws-nav__link--active`. Add `data-anim="cat"` on each row for GSAP.

- [ ] **Step 2: `MpPluginCard.vue`**

Props: `script: Script`.  
Compact row: colored icon box, title, `category · language`, author avatar/name, `installCount`.  
Wrap with `NuxtLink` to `/workspace/marketplace/${script.id}`.  
Root: `data-anim="card"`, class `mp-card`. Use CSS variables only; hover border `--accent-border`.

- [ ] **Step 3: Commit**

```bash
git add app/components/marketplace/MpCategorySidebar.vue app/components/marketplace/MpPluginCard.vue
git commit -m "feat(marketplace): add category sidebar and compact plugin card"
```

---

### Task 11: Marketplace list page + GSAP

**Files:**
- Create: `app/pages/workspace/marketplace/index.vue`

- [ ] **Step 1: Page structure (layout B)**

- `definePageMeta({ layout: 'default' })`
- Left: `MpCategorySidebar`
- Main: hero (title 插件集市, subtitle 发现并安装社区公开脚本, CTA → `/workspace/marketplace/submit`)
- Toolbar: search input (debounce 300ms), sort `<select>` 最新/安装最多/最近更新
- Grid: 3 / 2 / 1 columns of `MpPluginCard`
- Sentinel + `IntersectionObserver` → `loadMore`
- Empty / error / loading states

- [ ] **Step 2: GSAP enter + filter refresh**

```ts
import gsap from 'gsap'

const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function playEnter() {
  const ctx = gsap.context(() => {
    if (reduced) {
      gsap.set('[data-anim]', { opacity: 1, x: 0, y: 0 })
      return
    }
    const tl = gsap.timeline()
    tl.from('[data-anim="cat"]', { opacity: 0, x: -16, stagger: 0.04, duration: 0.35, ease: 'power2.out' }, 0)
    tl.from('[data-anim="hero"]', { opacity: 0, y: 14, stagger: 0.06, duration: 0.4 }, 0.1)
    tl.from('[data-anim="toolbar"]', { opacity: 0, y: 8, duration: 0.3 }, 0.25)
    tl.from('[data-anim="card"]', { opacity: 0, y: 16, stagger: 0.05, duration: 0.35 }, 0.3)
  })
  onUnmounted(() => ctx.revert())
}

onMounted(async () => {
  await Promise.all([loadCategories(), loadList()])
  await nextTick()
  playEnter()
  // observer setup like personal.vue
})
```

On category/search/sort change: `loadList` then `nextTick` + stagger only `[data-anim="card"]`.  
On load-more: animate only newly appended cards (track previous length).

Optional card hover `gsap.quickTo(el, 'y', { duration: 0.2 })` with mouseenter/leave.

- [ ] **Step 3: Manual UI check**

Open `/workspace/marketplace` — nav active, empty state, submit CTA works.

- [ ] **Step 4: Commit**

```bash
git add app/pages/workspace/marketplace/index.vue
git commit -m "feat(marketplace): list page with filters, infinite scroll, GSAP"
```

---

### Task 12: Detail page + install/download

**Files:**
- Create: `app/pages/workspace/marketplace/[id].vue`

- [ ] **Step 1: Load script via `fetchScript` from `useScripts` (or dedicated GET)**

If GET returns 403 for unpublished non-owner, show「该插件已下架或不存在」+ link back to marketplace.

- [ ] **Step 2: Hero + README layout**

- Back link to `/workspace/marketplace`
- Icon, title, meta (category, language, author, updatedAt, installCount)
- Primary: 添加到本地 (copy install flow from `WsScriptCard`: health check → install-token → `installScript`)
- Secondary: 下载 ZIP (reuse captcha modal pattern from `WsScriptCard`)
- If `user.id === script.ownerId`: button 从集市下架 → `unpublish` → navigate to list
- Below: `WsMarkdown` for readme; empty readme friendly message

- [ ] **Step 3: GSAP**

Hero stagger on mount; ScrollTrigger fade-up on `.mp-detail__readme` once. Register plugin:

```ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
if (import.meta.client) gsap.registerPlugin(ScrollTrigger)
```

Respect reduced motion.

- [ ] **Step 4: Commit**

```bash
git add app/pages/workspace/marketplace/[id].vue
git commit -m "feat(marketplace): public plugin detail with install and unpublish"
```

---

### Task 13: Submit wizard

**Files:**
- Create: `app/pages/workspace/marketplace/submit.vue`

- [ ] **Step 1: Three steps in one page**

State: `step = 1 | 2 | 3`

**Step 1 — 选择来源**

- Mode A: list personal scripts (`useScripts().loadScripts({ scope: 'personal', pageSize: 100 })`) as selectable rows; skip already-public (`visibility === 'public'`)
- Mode B: reuse upload via `useScripts().addScript` / same multipart as `WsUploadModal` (extract minimal fields: zip + title); after success keep new `scriptId`

**Step 2 — 完善信息**

- Form: title, description, category (`MARKETPLACE_CATEGORIES` select), language, tags, icon/color (`WsIconPicker` if available), README textarea + `WsMarkdown` preview
- Prefill from selected script

**Step 3 — 确认发布**

- Checkbox「我确认将此脚本公开发布到插件集市」
- Submit → `publish({ scriptId, ...fields })`
- On 409: tip + link to detail
- On success: brief success state (GSAP), then `navigateTo(/workspace/marketplace/${id})`

Step transitions: GSAP `x` slide + fade between step panels; reduced motion → instant swap.

Validation before step 3→submit: category set, readme ≥ 20 chars, checkbox checked.

- [ ] **Step 2: Commit**

```bash
git add app/pages/workspace/marketplace/submit.vue
git commit -m "feat(marketplace): three-step publish wizard"
```

---

### Task 14: End-to-end verification

**Files:** none (manual)

- [ ] **Step 1: Publish flow**

1. Login → 插件集市 → 提交插件  
2. Pick/upload personal script with README ≥ 20 chars + category  
3. Publish → lands on detail  
4. List shows card; category count increments  

- [ ] **Step 2: Second user (or another browser profile)**

1. Open marketplace → see plugin  
2. Open detail → 添加到本地 (with Autoforge running) OR at least install-token returns 200  
3. Confirm `install_count` increments after installToken download  

- [ ] **Step 3: Unpublish**

1. Author unpublish → list hides item; other user detail fails  
2. Author still sees script in 个人空间  

- [ ] **Step 4: Motion / a11y**

1. Toggle OS reduced motion → no large translates  
2. Light + dark theme readable  

- [ ] **Step 5: Final commit if polish fixes landed**

```bash
git status
# commit any leftover fixes
git commit -m "fix(marketplace): polish after e2e verification"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Nav left of 个人空间 | 9 |
| Layout B list + categories + counts | 5, 10, 11 |
| Compact cards, 3-col, infinite scroll | 10, 11 |
| Detail hero + README | 12 |
| Submit wizard + public visibility | 7, 13 |
| Unpublish | 7, 12 |
| Public install/download | 6, 12 |
| install_count on install only | 6 |
| GSAP + reduced motion | 11, 12, 13 |
| Types / DB fields | 1, 2 |

## Self-review notes

- No separate mock-data phase; APIs first so UI is real.
- Publish does **not** re-implement ZIP upload server-side: upload via existing `POST /api/scripts`, then `publish` (matches “select or upload” UX without duplicating storage code).
- Shared `MARKETPLACE_CATEGORIES` lives in `server/utils/marketplace-categories.ts` and is re-exported from `app/types/workspace.ts` to avoid Nitro import issues.
