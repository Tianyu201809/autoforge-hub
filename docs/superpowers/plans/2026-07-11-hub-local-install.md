# Hub Local Install (添加到本地 Autoforge) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let logged-in Hub users click「添加到本地」on a script card so a running Autoforge desktop app imports that script via the localhost bridge (`127.0.0.1:19276`), using a short-lived one-shot download token instead of a permanently public zip URL.

**Architecture:** Frontend probes Autoforge `/health`, then calls Hub `POST /api/scripts/:id/install-token` (auth + quota + permissions) to mint an absolute `zipUrl` with `installToken`. Autoforge `POST /install` fetches that URL; Hub `GET .../download?installToken=` validates and consumes the token (no captcha, no Bearer), records one download against the daily quota, and streams the zip. Ordinary captcha download path is unchanged.

**Tech Stack:** Nuxt 4 / Nitro, h3, sql.js SQLite, Vue 3 Composition API, browser `fetch` to localhost bridge.

**Spec:** `docs/superpowers/specs/2026-07-11-hub-local-install-hub-side-design.md`  
**Desktop contract (reference only):** `docs/superpowers/specs/2026-07-11-hub-local-install-design.md`

**Note:** Repo has no automated test runner. Verification uses `curl` against `pnpm dev` / `npm run dev` (default port from env, often `9876` or `3000`). Set `BASE` accordingly. Autoforge desktop must be running for end-to-end bridge checks.

---

## File map

| File | Responsibility |
|------|----------------|
| `server/utils/install-token.ts` | In-memory one-shot token create / consume / cleanup |
| `server/middleware/auth.ts` | Allow `GET .../download` through when `installToken` query present |
| `server/api/scripts/[id]/download.get.ts` | Branch: installToken path vs existing captcha path |
| `server/api/scripts/[id]/install-token.post.ts` | Auth, permission, quota check; mint absolute zipUrl |
| `app/composables/useAutoforgeBridge.ts` | health + install against `127.0.0.1:19276` |
| `app/components/workspace/WsScriptCard.vue` | 「添加到本地」button + full click flow + messages |

---

### Task 1: Install-token store utility

**Files:**
- Create: `server/utils/install-token.ts`

- [ ] **Step 1: Create `server/utils/install-token.ts`**

```ts
export const INSTALL_TOKEN_TTL_MS = 120_000

interface InstallTokenEntry {
  scriptId: string
  userId: string
  expiresAt: number
}

const store = new Map<string, InstallTokenEntry>()

const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupExpired() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [token, entry] of store) {
    if (entry.expiresAt < now) store.delete(token)
  }
}

export function createInstallToken(
  scriptId: string,
  userId: string
): { token: string; expiresIn: number } {
  cleanupExpired()
  const token = crypto.randomUUID()
  store.set(token, {
    scriptId,
    userId,
    expiresAt: Date.now() + INSTALL_TOKEN_TTL_MS,
  })
  return { token, expiresIn: Math.floor(INSTALL_TOKEN_TTL_MS / 1000) }
}

/**
 * One-shot consume. Deletes the token whether valid or not once looked up.
 * Returns null if missing, expired, or scriptId mismatch.
 */
export function consumeInstallToken(
  token: string,
  scriptId: string
): { userId: string } | null {
  cleanupExpired()
  const entry = store.get(token)
  if (!entry) return null
  store.delete(token)
  if (entry.expiresAt < Date.now()) return null
  if (entry.scriptId !== scriptId) return null
  return { userId: entry.userId }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/utils/install-token.ts
git commit -m "feat(scripts): add in-memory installToken store"
```

---

### Task 2: Auth middleware — allow download with installToken

**Files:**
- Modify: `server/middleware/auth.ts`

- [ ] **Step 1: Add early return for script download + installToken**

Near the top of the handler, after the existing public-path whitelist `return`s and **before** the Authorization header check, insert:

```ts
  // One-shot local-install download: Autoforge fetches zip without Bearer
  const pathOnly = url.split("?")[0]
  if (/^\/api\/scripts\/[^/]+\/download\/?$/.test(pathOnly)) {
    const query = getQuery(event)
    if (typeof query.installToken === "string" && query.installToken.length > 0) {
      return
    }
  }
```

Keep all other routes requiring Bearer as today.

- [ ] **Step 2: Commit**

```bash
git add server/middleware/auth.ts
git commit -m "feat(auth): allow script download with installToken without Bearer"
```

---

### Task 3: Extend download handler for installToken

**Files:**
- Modify: `server/api/scripts/[id]/download.get.ts`

- [ ] **Step 1: Import token helper and branch before captcha**

Add import:

```ts
import { consumeInstallToken } from "../../../utils/install-token"
```

Inside `handleDownload`, after loading `row` from DB (script exists) and **before** the existing `auth` / access / captcha block, insert an installToken branch. Refactor so the structure is:

```ts
async function handleDownload(event: any) {
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

  const query = getQuery(event)
  const installToken = query.installToken as string | undefined

  let userId: string

  if (installToken) {
    const consumed = consumeInstallToken(installToken, scriptId)
    if (!consumed) {
      throw createError({ statusCode: 401, message: "安装链接无效或已过期" })
    }
    userId = consumed.userId

    const quota = await checkDownloadQuota(userId)
    if (!quota.ok) {
      throw createError({
        statusCode: 429,
        message: `今日下载次数已达上限（${quota.used}/${quota.limit}）`,
        data: { used: quota.used, limit: quota.limit },
      })
    }

    const remaining = await incrementDownloadQuota(userId, scriptId)
    return serveScriptFile(event, row, remaining)
  }

  // ── Existing authenticated + captcha path (unchanged logic) ──
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })
  userId = auth.user.userId

  // ... keep existing team/personal permission checks, captcha, quota ...
  // at the end call serveScriptFile instead of inlined file serve
}
```

Extract the file-serving tail into a helper in the same file:

```ts
function serveScriptFile(event: any, row: any, remaining: number) {
  const filePath = getFilePath(row.file_path)
  if (filePath.startsWith("http")) {
    return sendRedirect(event, filePath, 302)
  }

  if (!existsSync(filePath)) throw createError({ statusCode: 404, message: "文件不存在" })
  const data = readFileSync(filePath)
  const filename = row.file_name || "script.zip"
  setHeader(event, "Content-Type", "application/zip")
  setHeader(event, "Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`)
  setHeader(event, "Cache-Control", "public, max-age=31536000")
  setHeader(event, "X-Remaining-Downloads", String(remaining))
  return new Uint8Array(data)
}
```

Replace the old inline serve block at the end of the captcha path with `return serveScriptFile(event, row, remaining)`.

**Important:** Do not require captcha when `installToken` is present. Do not use `event.context.auth` on that branch.

- [ ] **Step 2: Manual verify token rejection (dev server running)**

```bash
curl -s -o /dev/null -w "%{http_code}" "%BASE%/api/scripts/any-id/download?installToken=not-a-real-token"
```

Expected: `401` (or `404` if you use a missing script id — prefer a real script id from DB to assert `401` for bad token).

- [ ] **Step 3: Commit**

```bash
git add server/api/scripts/[id]/download.get.ts
git commit -m "feat(scripts): serve zip via one-shot installToken without captcha"
```

---

### Task 4: `POST /api/scripts/:id/install-token`

**Files:**
- Create: `server/api/scripts/[id]/install-token.post.ts`

- [ ] **Step 1: Create the handler**

```ts
import { getDb } from "../../../db/index"
import { parseSettings, checkMemberPermission } from "../../../utils/team-permissions"
import { checkDownloadQuota } from "../../../utils/download-quota"
import { createInstallToken } from "../../../utils/install-token"

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) throw createError({ statusCode: 401, message: "未登录" })

  const scriptId = getRouterParam(event, "id")
  if (!scriptId) throw createError({ statusCode: 400, message: "缺少脚本 ID" })

  const userId = auth.user.userId
  const db = await getDb()

  const stmt = db.prepare("SELECT * FROM scripts WHERE id = ?")
  stmt.bind([scriptId])
  if (!stmt.step()) {
    stmt.free()
    throw createError({ statusCode: 404, message: "脚本不存在" })
  }
  const row = stmt.getAsObject() as any
  stmt.free()

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
      throw createError({ statusCode: 403, message: "你不是该团队成员" })
    }
    const teamSettings = parseSettings(team.settings)
    if (!checkMemberPermission(teamSettings, userId, team.owner_id, "download")) {
      throw createError({ statusCode: 403, message: "没有下载权限" })
    }
  } else if (row.owner_id !== userId) {
    throw createError({ statusCode: 403, message: "无权限下载" })
  }

  const quota = await checkDownloadQuota(userId)
  if (!quota.ok) {
    throw createError({
      statusCode: 429,
      message: `今日下载次数已达上限（${quota.used}/${quota.limit}）`,
      data: { used: quota.used, limit: quota.limit },
    })
  }

  const { token, expiresIn } = createInstallToken(scriptId, userId)
  const origin = getRequestURL(event).origin
  const zipUrl = `${origin}/api/scripts/${scriptId}/download?installToken=${encodeURIComponent(token)}`

  return {
    ok: true,
    zipUrl,
    scriptName: row.title as string,
    hubScriptId: scriptId,
    expiresIn,
  }
})
```

- [ ] **Step 2: Verify mint + consume with curl**

Login first (or reuse a JWT from the browser). Then:

```bash
# Mint
curl -s -X POST "%BASE%/api/scripts/%SCRIPT_ID%/install-token" \
  -H "Authorization: Bearer %JWT%"

# Expect JSON with ok, zipUrl, scriptName, hubScriptId, expiresIn: 120

# Download once with token from zipUrl (no Authorization)
curl -s -o /tmp/script.zip -w "%{http_code}" "%ZIP_URL%"
# Expect: 200 and a zip file

# Reuse same URL
curl -s -o /dev/null -w "%{http_code}" "%ZIP_URL%"
# Expect: 401
```

- [ ] **Step 3: Commit**

```bash
git add server/api/scripts/[id]/install-token.post.ts
git commit -m "feat(scripts): add install-token endpoint for local Autoforge install"
```

---

### Task 5: `useAutoforgeBridge` composable

**Files:**
- Create: `app/composables/useAutoforgeBridge.ts`

- [ ] **Step 1: Create composable**

```ts
const BRIDGE_BASE = "http://127.0.0.1:19276"
const HEALTH_TIMEOUT_MS = 1000

export type BridgeInstallResult =
  | { ok: true; scriptId: string; name: string }
  | { ok: false; status?: number; error?: string; message: string }

export function useAutoforgeBridge() {
  async function checkHealth(): Promise<boolean> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
    try {
      const res = await fetch(`${BRIDGE_BASE}/health`, {
        method: "GET",
        signal: controller.signal,
      })
      if (!res.ok) return false
      const data = await res.json().catch(() => null)
      return !!(data && data.ok === true)
    } catch {
      return false
    } finally {
      clearTimeout(timer)
    }
  }

  async function installScript(body: {
    zipUrl: string
    scriptName?: string
    hubScriptId?: string
  }): Promise<BridgeInstallResult> {
    try {
      const res = await fetch(`${BRIDGE_BASE}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({} as any))
      if (res.ok && data?.ok) {
        return {
          ok: true,
          scriptId: data.scriptId as string,
          name: (data.name as string) || body.scriptName || "",
        }
      }
      return {
        ok: false,
        status: res.status,
        error: data?.error as string | undefined,
        message: mapInstallError(res.status, data),
      }
    } catch {
      return { ok: false, message: "添加失败，请重试" }
    }
  }

  return { checkHealth, installScript }
}

function mapInstallError(status: number, data: any): string {
  if (typeof data?.message === "string" && data.message) return data.message
  if (status === 409 || data?.error === "busy") return "正在安装，请稍候"
  if (status === 502 || data?.error === "download_failed") return "下载失败，请重试"
  if (status === 400 || data?.error === "invalid_package") {
    return "不是有效的 Autoforge 脚本包"
  }
  return "添加失败，请重试"
}
```

- [ ] **Step 2: Commit**

```bash
git add app/composables/useAutoforgeBridge.ts
git commit -m "feat(scripts): add useAutoforgeBridge for localhost health/install"
```

---

### Task 6: WsScriptCard —「添加到本地」UI + flow

**Files:**
- Modify: `app/components/workspace/WsScriptCard.vue`

- [ ] **Step 1: Add state and install handler in `<script setup>`**

After existing refs (`downloading`, `quotaError`, etc.), add:

```ts
const { checkHealth, installScript } = useAutoforgeBridge()
const installing = ref(false)
const installMessage = ref("")
const installMessageIsError = ref(false)

async function handleAddToLocal() {
  if (installing.value || downloading.value) return
  installing.value = true
  installMessage.value = ""
  installMessageIsError.value = false
  try {
    const healthy = await checkHealth()
    if (!healthy) {
      installMessageIsError.value = true
      installMessage.value = "请先启动 Autoforge 桌面端，然后再试"
      return
    }

    const token = localStorage.getItem("autoforge-token")
    const mintRes = await fetch(`/api/scripts/${props.script.id}/install-token`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const mintData = await mintRes.json().catch(() => ({} as any))
    if (!mintRes.ok) {
      installMessageIsError.value = true
      installMessage.value = mintData.message || "添加失败，请重试"
      return
    }

    const result = await installScript({
      zipUrl: mintData.zipUrl,
      scriptName: mintData.scriptName || props.script.title,
      hubScriptId: mintData.hubScriptId || props.script.id,
    })
    if (result.ok) {
      installMessageIsError.value = false
      installMessage.value = result.name
        ? `已添加到本地 Autoforge（${result.name}）`
        : "已添加到本地 Autoforge"
      usedToday.value++
    } else {
      installMessageIsError.value = true
      installMessage.value = result.message
    }
  } catch {
    installMessageIsError.value = true
    installMessage.value = "添加失败，请重试"
  } finally {
    installing.value = false
  }
}
```

- [ ] **Step 2: Template — button next to download**

Replace the single download button block so meta actions are a group (download keeps `margin-left: auto` on the group). Example:

```vue
        <div v-if="downloadable !== false" class="script-card__meta-actions">
          <button
            type="button"
            class="script-card__download"
            :disabled="downloading || installing"
            title="下载脚本"
            @click="handleDownload"
          >
            <Icon :name="downloading ? 'lucide:loader-circle' : 'lucide:download'" size="13" :class="{ 'script-card__spin': downloading }" />
            {{ downloading ? '下载中...' : '下载' }}
          </button>
          <button
            type="button"
            class="script-card__add-local"
            :disabled="installing || downloading"
            title="添加到本地 Autoforge"
            @click="handleAddToLocal"
          >
            <Icon :name="installing ? 'lucide:loader-circle' : 'lucide:hard-drive-download'" size="13" :class="{ 'script-card__spin': installing }" />
            {{ installing ? '添加中...' : '添加到本地' }}
          </button>
        </div>
        <p v-if="quotaError" class="script-card__quota-error">{{ quotaError }}</p>
        <p
          v-if="installMessage"
          class="script-card__install-msg"
          :class="{ 'script-card__install-msg--error': installMessageIsError }"
        >
          {{ installMessage }}
        </p>
```

- [ ] **Step 3: Styles**

Move `margin-left: auto` from `.script-card__download` to `.script-card__meta-actions`. Add:

```css
.script-card__meta-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  flex-wrap: wrap;
}

.script-card__download {
  /* remove margin-left: auto from previous rule */
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: var(--text-xs);
  color: var(--accent);
  white-space: nowrap;
  cursor: pointer;
  transition: opacity 0.12s;
}

.script-card__add-local {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: var(--text-xs);
  color: var(--accent);
  white-space: nowrap;
  cursor: pointer;
  transition: opacity 0.12s;
}

.script-card__add-local:hover {
  opacity: 0.75;
}

.script-card__add-local:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.script-card__install-msg {
  margin: 0;
  width: 100%;
  font-size: var(--text-xs);
  color: var(--success, #16a34a);
}

.script-card__install-msg--error {
  color: var(--danger);
}
```

If `--success` is not defined in the project theme, use `color: var(--accent)` for success and keep danger for errors.

- [ ] **Step 4: Manual UI checks**

1. Autoforge **not** running → click「添加到本地」→ message「请先启动 Autoforge 桌面端，然后再试」; Network tab shows **no** `install-token` call.  
2. Autoforge running + valid script zip → success message; script appears/opens in desktop.  
3. During install, both buttons disabled.  
4. Ordinary「下载」still opens captcha modal.

- [ ] **Step 5: Commit**

```bash
git add app/components/workspace/WsScriptCard.vue
git commit -m "feat(scripts): add Add-to-local Autoforge button on script cards"
```

---

### Task 7: End-to-end acceptance + docs touch-up

**Files:**
- None required (optional: one-line note in `docs/api/composables.md` if that doc lists composables)

- [ ] **Step 1: Walk the Hub 验收清单 from the spec**

- [ ] Mint works only when logged in and download-permitted  
- [ ] Autoforge off → start prompt, no token mint  
- [ ] Autoforge on + good package → Hub success + desktop opens script  
- [ ] Token reuse fails with 401; captcha download still requires captcha  
- [ ] Quota exhausted → mint returns 429 with message  
- [ ] Button loading prevents double submit  
- [ ] `zipUrl` absolute; `curl` to it within TTL downloads zip without Bearer  

- [ ] **Step 2: Final commit if any small fixes remain**

```bash
git add -A
git status
# only commit intentional fix files
git commit -m "fix(scripts): polish local-install edge cases"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| health then mint then install | Task 5–6 |
| installToken TTL 120s, one-shot | Task 1, 3–4 |
| skip captcha, count quota on serve | Task 3–4 |
| permission same as download | Task 4 |
| auth bypass only with installToken query | Task 2 |
| WsScriptCard button + copy | Task 6 |
| absolute zipUrl | Task 4 (`getRequestURL().origin`) |
| desktop contract unchanged | no desktop tasks |
| ordinary download unchanged | Task 3 captcha path preserved |

## Self-review notes

- No placeholders left in steps.  
- Types/names consistent: `createInstallToken` / `consumeInstallToken` / `installToken` query / `useAutoforgeBridge`.  
- Quota deducted on successful download serve (not on mint), matching spec.  
- Health failure must short-circuit before mint (Task 6).  
