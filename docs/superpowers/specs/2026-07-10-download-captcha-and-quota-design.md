# 下载验证码与每日配额限制设计

## 概述

为防止恶意下载滥用，为脚本下载功能增加两道防线：
1. **滑块验证码** — 每次下载前需通过滑块验证，确认是真人操作
2. **每日下载配额** — 每个账号每天（自然日，00:00 服务器时间重置）最多下载 50 次（所有脚本合计）

---

## 架构

```
用户点击下载
    │
    ▼
弹出滑块验证码弹框（DownloadCaptchaModal → SliderCaptcha）
    │
    ▼ 滑块验证通过
携带 captchaToken + position 调用 /api/scripts/{id}/download?captchaToken=xxx&position=xxx
    │
    ▼
服务端下载 API：
  ① 验证 captcha token（复用 verifyCaptchaToken）
  ② 检查今日下载配额（内存缓存 → 回查 DB）
  ③ 配额充足 → 记录下载日志到 DB → 更新缓存 → 返回文件
  ④ 配额不足 → 返回 429 及剩余次数信息
```

## 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/db/schema.ts` | 修改 | 新增 `download_logs` drizzle 表定义 |
| `server/db/index.ts` | 修改 | migration 创建 `download_logs` 表 |
| `server/utils/download-quota.ts` | **新建** | 配额检查 + 计数器（内存缓存 + DB 持久化） |
| `server/api/scripts/[id]/download.get.ts` | 修改 | 增加 captcha 验证 + 配额检查 |
| `app/components/workspace/DownloadCaptchaModal.vue` | **新建** | 包裹 SliderCaptcha 的下载验证弹框 |
| `app/components/workspace/WsScriptCard.vue` | 修改 | 点击下载 → 弹出 captcha 弹框 → 验证后下载 |

---

## 数据层

### download_logs 表

```sql
CREATE TABLE IF NOT EXISTS download_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  script_id TEXT NOT NULL,
  downloaded_at TEXT NOT NULL
)
```

- `id`: UUID
- `user_id`: 用户 ID，用于按用户统计配额
- `script_id`: 被下载的脚本 ID（仅用于审计，不参与配额计算）
- `downloaded_at`: ISO-8601 时间戳，用于按日期统计

### 索引

不建额外索引。查询模式只有一种：`SELECT COUNT(*) FROM download_logs WHERE user_id = ? AND downloaded_at >= ?`。每天每个用户 50 条记录，数据量很小，全表扫描足够。

---

## 服务端配额逻辑

### `server/utils/download-quota.ts`

```typescript
const DAILY_LIMIT = 50

// Key: `${userId}:${YYYY-MM-DD}`
// Value: 当日已下载次数
const quotaCache = new Map<string, number>()

function getTodayDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export async function checkDownloadQuota(userId: string): Promise<{ ok: true } | { ok: false; used: number; limit: number }> {
  const key = `${userId}:${getTodayDateStr()}`

  let count = quotaCache.get(key)
  if (count === undefined) {
    // 回查 DB
    const db = await getDb()
    const today = getTodayDateStr()
    const stmt = db.prepare("SELECT COUNT(*) AS cnt FROM download_logs WHERE user_id = ? AND downloaded_at >= ?")
    stmt.bind([userId, today])
    if (stmt.step()) {
      count = (stmt.getAsObject() as any).cnt as number
    } else {
      count = 0
    }
    stmt.free()
    quotaCache.set(key, count)
  }

  if (count >= DAILY_LIMIT) {
    return { ok: false, used: count, limit: DAILY_LIMIT }
  }

  return { ok: true }
}

export async function incrementDownloadQuota(userId: string, scriptId: string): Promise<void> {
  const key = `${userId}:${getTodayDateStr()}`
  const db = await getDb()
  db.run(
    "INSERT INTO download_logs (id, user_id, script_id, downloaded_at) VALUES (?, ?, ?, ?)",
    [crypto.randomUUID(), userId, scriptId, new Date().toISOString()]
  )
  // 更新缓存（原子性要求不高）
  const current = quotaCache.get(key) || 0
  quotaCache.set(key, current + 1)
}
```

### 配额缓存说明

- Key 包含日期字符串，每天 00:00 后自动变成新 key，旧 key 自然过期
- 使用普通 `Map`，不需要 LRU（活跃用户数 × 1 条目 / 天，内存压力很小）
- 缓存未命中时回查 DB，查询效率足够（每天每人 ≤ 50 条）

---

## 服务端 API 改动

### `server/api/scripts/[id]/download.get.ts`

在现有权限检查之后、文件返回之前，插入：

```typescript
// 1) 验证 captcha
const query = getQuery(event)
const captchaToken = query.captchaToken as string
const captchaPosition = query.captchaPosition as string

if (!captchaToken || captchaPosition === undefined) {
  throw createError({ statusCode: 400, message: "请完成安全验证" })
}

const captchaResult = verifyCaptchaToken(captchaToken, Number(captchaPosition))
if (!captchaResult.ok) {
  const messages: Record<string, string> = {
    invalid_or_expired: "验证已失效，请重新验证",
    expired: "验证已过期，请重新验证",
    position_mismatch: "验证失败，请重试",
  }
  throw createError({ statusCode: 400, message: messages[captchaResult.reason ?? ""] ?? "安全验证失败" })
}

// 2) 检查下载配额
const quota = await checkDownloadQuota(userId)
if (!quota.ok) {
  throw createError({
    statusCode: 429,
    message: `今日下载次数已达上限（${quota.used}/${quota.limit}）`,
    data: { used: quota.used, limit: quota.limit }
  })
}

// 3) 记录下载
await incrementDownloadQuota(userId, scriptId)
```

**响应结构（正常）：**

API 返回原始文件二进制流（`Content-Type: application/zip`），同时通过响应头传递配额信息：
- `X-Remaining-Downloads: 49`

**响应结构（配额不足 - 429）：**

```json
{
  "ok": false,
  "message": "今日下载次数已达上限（50/50）",
  "used": 50,
  "limit": 50
}
```

---

## 前端改动

### `app/components/workspace/DownloadCaptchaModal.vue`（新建）

一个模态弹框，内部嵌入现有 `SliderCaptcha` 组件。

**Props:**
- `scriptId: string`

**Emits:**
- `verified: [captchaToken: string, captchaPosition: number]`

**行为：**
1. 打开时调用 `/api/auth/captcha/generate` 获取 captcha token + position
2. 将 SliderCaptcha 嵌入弹框
3. 滑块验证通过后 emit `verified`，携带 captcha token 和 position
4. 父组件关闭弹框并发起下载请求

### `app/components/workspace/WsScriptCard.vue`（改动）

**`handleDownload()` 新流程：**

```
async function handleDownload() {
  if (downloading.value) return

  // 弹出验证码弹框（通过 ref 控制）
  showCaptchaModal.value = true
}

function onCaptchaVerified(token: string, position: number) {
  showCaptchaModal.value = false
  downloading.value = true

  try {
    const res = await fetch(`/api/scripts/${props.script.id}/download?captchaToken=${token}&captchaPosition=${position}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.status === 429) {
      const data = await res.json()
      // 显示配额超限提示
      return
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: '下载失败' }))
      console.error('[download]', err.message)
      return
    }

    // 原有下载逻辑（blob → createObjectURL → click）
    const blob = await res.blob()
    const remaining = res.headers.get('X-Remaining-Downloads')
    // 可选：提示剩余次数
    ...
  } finally {
    downloading.value = false
  }
}
```

**新增状态：**
- `showCaptchaModal: ref(false)`

**模板新增：**
```html
<Teleport to="body">
  <WorkspaceDownloadCaptchaModal
    v-if="showCaptchaModal"
    :script-id="script.id"
    @verified="onCaptchaVerified"
    @cancel="showCaptchaModal = false"
  />
</Teleport>
```

---

## 错误处理与边界情况

| 场景 | 处理 |
|------|------|
| captcha token 失效/过期 | API 返回 400，弹框内显示「验证已失效」并自动刷新 captcha |
| 配额达到 50/50 | 点击下载时直接显示「今日下载次数已达上限」，不再弹 captcha |
| 下载过程中网络中断 | 不扣配额（下载失败不计入） |
| 服务器时间跨日 | 依赖服务器本地时间做判断，统一以服务器时间为准 |
| 多设备同时下载 | 配额检查非原子操作（先查后增），极端情况可能超 1-2 次。可接受 |
| 未登录用户 | 下载 API 已有 401 拦截，不受影响 |

---

## 未来扩展

- 配额上限可改为管理员可配置（环境变量 `DOWNLOAD_DAILY_LIMIT`）
- 可增加 IP 级别的频率限制作为补充
- 下载日志可用于后续的数据分析面板
