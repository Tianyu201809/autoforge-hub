# Audit Log — 团队操作日志模块设计

**日期**: 2026-07-05
**状态**: 设计稿

---

## 1. 概述

为团队空间引入操作日志模块，自动记录成员对团队脚本的上传、编辑、删除操作。日志对团队内所有成员公开可见，且不可删除、不可篡改。

**范围限定**：仅记录**团队空间**内的脚本操作，个人空间不纳入。

---

## 2. 数据库

### 2.1 新建表 `audit_logs`

在 `server/db/index.ts` 的 `CREATE TABLE` 中新增：

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  action_type TEXT NOT NULL,
  script_id TEXT,
  script_name TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
)
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | UUID，写入后永不修改 |
| `team_id` | TEXT NOT NULL | 所属团队 ID，关联 teams |
| `user_id` | TEXT NOT NULL | 操作人 ID，关联 users |
| `user_name` | TEXT | 操作人显示名（冗余，防用户改名后日志无法溯源） |
| `action_type` | TEXT | `upload` / `edit` / `delete` |
| `script_id` | TEXT | 关联脚本 ID（可为 null，脚本删除后记录仍保留） |
| `script_name` | TEXT | 操作时的脚本名称（冗余，脚本删除后仍可显示） |
| `details` | TEXT | JSON 字符串，存储额外上下文 |
| `created_at` | TEXT | ISO 8601 时间戳，写入后永不修改 |

### 2.2 不可变性

- 不提供 UPDATE 或 DELETE 接口
- 不提供清理机制（日志永久保留）
- `details` 字段在写入后永不修改

---

## 3. API

### 3.1 `GET /api/teams/[id]/logs`

获取团队操作日志（分页）。

**权限**：请求者必须是团队成员（owner / admin / member 均可）

**Query 参数**：

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `page` | number | 1 | 页码 |
| `pageSize` | number | 20 | 每页条数 |
| `action_type` | string | 空 | 筛选：`upload` / `edit` / `delete`，为空表示全部 |

**响应**：

```json
{
  "ok": true,
  "logs": [
    {
      "id": "uuid",
      "team_id": "uuid",
      "user_id": "uuid",
      "user_name": "demo",
      "action_type": "upload",
      "script_id": "uuid",
      "script_name": "My Script",
      "details": {},
      "created_at": "2026-07-05T12:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

### 3.2 日志写入点（3 处）

日志写入在现有 API **成功处理业务逻辑之后**、**返回响应之前**执行。仅在 `team_id` 不为 null 时写入。

| API 路径 | action_type | details 内容 |
|----------|-------------|-------------|
| `scripts/index.post.ts` | `upload` | `{}` |
| `scripts/[id]/index.put.ts` | `edit` | `{ "title_old": "...", "title_new": "...", "changes": ["title","description","tags","icon"] }` |
| `scripts/[id]/index.delete.ts` | `delete` | `{}` |

### 3.3 日志辅助函数

在 `server/utils/` 下新增 `audit-log.ts`，提供 `createAuditLog(db, data)` 函数封装写入逻辑。

---

## 4. 客户端

### 4.1 新增 composable: `useAuditLogs.ts`

```typescript
export function useAuditLogs() {
  const logs = useState<AuditLog[]>("team-audit-logs", () => [])
  const loading = ref(false)
  const total = ref(0)
  const totalPages = ref(0)

  async function loadLogs(teamId: string, options?: {
    page?: number, pageSize?: number, actionType?: string
  }): Promise<void>

  return { logs, loading, total, totalPages, loadLogs }
}
```

### 4.2 新增类型

在 `app/types/workspace.ts` 中新增 `AuditLog` 接口：

```typescript
export interface AuditLog {
  id: string
  teamId: string
  userId: string
  userName: string
  actionType: 'upload' | 'edit' | 'delete'
  scriptId?: string
  scriptName: string
  details: Record<string, any>
  createdAt: string
}
```

---

## 5. 页面

### 5.1 路由

`/workspace/teams/[id]/logs` → `app/pages/workspace/teams/[id]/logs.vue`

### 5.2 布局

```
┌─────────────────────────────────────┐
│ ← 返回团队详情                       │
│ 操作日志 · 测试                      │
│                                     │
│ [全部] [上传] [编辑] [删除]          │
│                                     │
│ ┌─ 时间线 ──────────────────────┐   │
│ │ ● 上传  demo 上传了脚本 abc    │   │
│ │         2 小时前               │   │
│ │ ● 编辑  demo 编辑了脚本 xyz    │   │
│ │         5 小时前               │   │
│ │ ● 删除  136****2888 删除了脚本  │   │
│ │         昨天 14:30             │   │
│ └──────────────────────────────┘   │
│                                     │
│ 分页组件 (WsPagination)              │
└─────────────────────────────────────┘
```

### 5.3 设计风格

- **时间线布局**：左侧一条垂直灰线，每个日志条目在线上带一个圆点
- **操作图标**：上传 = 绿色上传图标，编辑 = 蓝色铅笔图标，删除 = 红色垃圾桶图标
- **用户头像**：显示用户首字母缩写圆圈，与团队成员列表风格一致
- **相对时间**：使用简单的相对时间显示（"刚刚"、"X 分钟前"、"X 小时前"、"昨天"、"X 天前"）
- **筛选标签**：三个标签按钮，激活态高亮，切换时重置页码为 1
- **分页**：复用 `WsPagination` 组件，每页 20 条

### 5.4 导航入口

在团队详情页（`teams/[id].vue`）的操作栏中，在上传按钮旁添加一个「操作日志」按钮：

```html
<NuxtLink to={`/workspace/teams/${teamId}/logs`} class="ws-team-btn ws-team-btn--ghost">
  <Icon name="lucide:history" size="16" />
  操作日志
</NuxtLink>
```

---

## 6. 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `server/db/index.ts` | 新增 `audit_logs` 建表语句 |
| 新增 | `server/utils/audit-log.ts` | 日志写入辅助函数 |
| 修改 | `server/api/scripts/index.post.ts` | 上传成功后写入日志 |
| 修改 | `server/api/scripts/[id]/index.put.ts` | 编辑成功后写入日志 |
| 修改 | `server/api/scripts/[id]/index.delete.ts` | 删除成功后写入日志 |
| 新增 | `server/api/teams/[id]/logs.get.ts` | 查询日志 API |
| 新增 | `app/types/workspace.ts` | 新增 `AuditLog` 接口 |
| 新增 | `app/composables/useAuditLogs.ts` | 日志数据管理 |
| 新增 | `app/pages/workspace/teams/[id]/logs.vue` | 日志展示页面 |
| 修改 | `app/pages/workspace/teams/[id].vue` | 添加「操作日志」导航按钮 |

---

## 7. 注意事项

- 日志写入应放在 try/catch 中，**不应因日志写入失败而影响主业务逻辑**
- `user_name` 和 `script_name` 的冗余存储确保日志在用户改名或脚本删除后仍可追溯
- 分页查询使用 SQL `LIMIT/OFFSET`，按 `created_at DESC` 排序
- 权限校验：任何团队成员均可查看日志
