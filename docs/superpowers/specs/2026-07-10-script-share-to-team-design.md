# 个人脚本分享到团队空间设计

## 概述

允许用户将个人空间的脚本复制分享到自己所在的团队空间。支持分享到多个团队（每次生成独立副本），个人空间原稿不受影响。

## 需求确认

- 同一个脚本可分享到多个不同团队（各团队一份独立副本）
- 分享后个人空间原脚本保留不变（复制，非移动）
- 只要是团队成员即可分享（不需要 admin/owner 权限）
- 目标团队已有同名脚本时拒绝分享并提示

## 架构

```
个人空间脚本卡片
    │ 点击「分享到团队」按钮
    ▼
弹出团队选择弹框（ShareToTeamModal）
  ┌─────────────────────────┐
  │ 分享「脚本名」到团队      │
  │ ○ 前端设计组              │
  │ ○ 后端开发组  ← 已选      │
  │ ○ 运维组                  │
  │ [取消]       [确认分享]    │
  └─────────────────────────┘
    │ 确认 → POST /api/scripts/{id}/share { teamId }
    ▼
服务端：
  ① 验证脚本属于该用户且为个人脚本
  ② 验证用户是目标团队成员
  ③ 检测目标团队同名脚本冲突 → 409
  ④ 复制文件到团队存储 → 创建新脚本记录
  ⑤ 写审计日志
```

## 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/api/scripts/[id]/share.post.ts` | **新建** | 分享 API |
| `app/components/workspace/ShareToTeamModal.vue` | **新建** | 团队选择弹框 |
| `app/components/workspace/WsScriptCard.vue` | 修改 | 新增 `shareable` prop 和分享按钮 |
| `app/pages/workspace/personal.vue` | 修改 | 接入分享流程，监听 `@share` 事件 |

## 服务端 API

### `POST /api/scripts/{id}/share`

**请求体:** `{ teamId: string }`

**处理流程:**

1. 获取源脚本：`SELECT * FROM scripts WHERE id = ? AND team_id IS NULL`
2. 验证 `owner_id === userId`（确保是当前用户的个人脚本）
3. 验证 `team_id IS NULL`（确保尚未关联团队）
4. 验证用户是目标团队成员：`SELECT * FROM teams WHERE id = ?` → 检查 `member_ids` 和 `owner_id`
5. 检查同名冲突：`SELECT id FROM scripts WHERE team_id = ? AND title = ?`
6. 读取源文件 → 写入团队存储目录 `files/{teamId}/`
7. 创建新脚本记录：`INSERT INTO scripts (... team_id = targetTeamId ...)`
8. 写审计日志

**错误码:**

| 状态码 | 含义 |
|--------|------|
| 400 | 脚本非个人所有或已有关联团队 |
| 403 | 不是目标团队成员 |
| 404 | 目标团队不存在 |
| 409 | 目标团队已有同名脚本 |

**成功响应:**
```json
{ "ok": true, "script": { "id": "...", "title": "..." } }
```

## 前端

### ShareToTeamModal.vue

- **Props**: `scriptId: string`, `scriptTitle: string`
- **Emits**: `shared: [teamId: string]`, `cancel`
- 通过 `useTeams().getTeamsForUser(userId)` 获取用户所在团队列表
- 单选列表（团队名称 + 成员数），选中后高亮
- 选中某个团队后检查同名冲突（显示警告）
- 确认后 emit `shared(teamId)`

### WsScriptCard.vue 改动

- 新增 prop `shareable?: boolean`
- 新增 emit `share: [script: Script]`
- 个人空间下显示「分享到团队」按钮（图标 `lucide:share-2`）

### personal.vue 改动

- 引入 `ShareToTeamModal`，监听 `WsScriptCard` 的 `@share` 事件
- 弹框确认后调用 `POST /api/scripts/{id}/share { teamId }`，显示成功/失败提示
