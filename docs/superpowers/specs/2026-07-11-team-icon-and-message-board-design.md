# 团队自定义图标与留言板设计

## 概述

为团队空间增加两项能力：

1. **自定义团队图标** — 预置 Lucide 图标 + 颜色，或上传图片（互斥）；仅 owner / admin 可改
2. **团队留言板** — 右侧抽屉（聊天气泡 + 底部输入）；成员可发多条、删自己的；owner / admin 可删任意留言；分页每次 10 条

## 目标

- 团队列表卡与详情页 header 展示自定义图标（图或预置图标色）
- 团队详情可通过抽屉查看 / 发布 / 删除留言
- 权限与现有 `getTeamRole`（owner / admin / member）对齐

## 非目标

- 留言编辑、回复、@、富文本
- 创建团队时设置图标
- 留言写入操作审计日志
- 留言未读红点（本期仅可在入口显示总数，可选）

---

## 数据模型

### `teams` 表扩展

```sql
ALTER TABLE teams ADD COLUMN icon TEXT NOT NULL DEFAULT 'users';
ALTER TABLE teams ADD COLUMN icon_color TEXT DEFAULT NULL;
ALTER TABLE teams ADD COLUMN avatar_url TEXT NOT NULL DEFAULT '';
```

| 列 | 说明 |
|---|---|
| `icon` | 预置 Lucide 图标 ID，默认 `users` |
| `icon_color` | hex（如 `#3b82f6`）；`NULL` 时用主题色 `var(--accent)` |
| `avatar_url` | 上传图存储名；**非空时展示用图，忽略 icon / icon_color** |

**互斥写入规则（API 强制）：**

- 模式「预置图标」：写入 `icon` + `icon_color`，清空 `avatar_url`（`''`）
- 模式「上传图片」：写入 `avatar_url`，`icon` 重置为 `users`，`icon_color` 置 `NULL`

### 新表 `team_messages`

```sql
CREATE TABLE IF NOT EXISTS team_messages (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_team_messages_team_created
  ON team_messages(team_id, created_at DESC);
```

### 前端类型

```ts
// app/types/workspace.ts — Team 扩展
interface Team {
  // ...existing
  icon: string
  iconColor?: string
  avatarUrl?: string
}

interface TeamMessage {
  id: string
  teamId: string
  authorId: string
  authorDisplayName: string
  authorAvatarUrl: string
  authorRole: 'owner' | 'admin' | 'member'
  content: string
  createdAt: string
  canDelete: boolean  // 由服务端按当前用户计算后返回
}
```

---

## API

### `PUT /api/teams/:id/icon`

- **权限：** owner 或 admin
- **请求（二选一）：**
  - JSON：`{ mode: 'icon', icon: string, iconColor?: string | null }`
  - multipart：`mode=avatar` + `file`（扩展名 png / jpg / jpeg / gif / webp，与用户头像一致）
- **存储：** 图片经 `saveFile(..., 'team-avatars')`；新增静态路由 `GET /api/files/team-avatars/[filename]`（对齐 avatars 实现），auth middleware 放行该前缀
- **响应：** `{ ok: true, icon, iconColor, avatarUrl }`

### `GET /api/teams/:id/messages?limit=10&offset=0`

- **权限：** 团队成员
- **默认：** `limit=10`，`offset=0`；按 `created_at DESC`
- **响应：**

```ts
{
  items: TeamMessage[]
  total: number
  hasMore: boolean
}
```

每条 `items` 含作者展示名、头像、角色；`canDelete` 为 true 当：当前用户是作者，或当前用户是 owner/admin。

### `POST /api/teams/:id/messages`

- **权限：** 团队成员
- **Body：** `{ content: string }`
- **校验：** trim 后非空；长度 ≤ 500
- **响应：** `{ ok: true, message: TeamMessage }`

### `DELETE /api/teams/:id/messages/:msgId`

- **权限：** 留言作者，或该团队 owner / admin
- **响应：** `{ ok: true }`

### 既有接口调整

- `GET /api/teams`、`GET /api/teams/:id`：返回 `icon` / `iconColor` / `avatarUrl`
- 创建团队：默认 `icon=users`，`icon_color=NULL`，`avatar_url=''`

---

## UI / 交互

### 团队图标展示

- `WsTeamCard`、详情页 header：有 `avatarUrl` → 圆形图；否则 → `Icon` + `iconColor`；未定制 → 现有 `users`
- owner / admin：header 图标可点「更换」→ `WsTeamIconModal`

### `WsTeamIconModal`

- 顶部互斥切换：**预置图标** | **上传图片**
- 预置：复用 `WsIconPicker`（图标 + 颜色）
- 上传：选图预览；格式限制同用户头像
- 保存 → `PUT /api/teams/:id/icon`
- 创建团队流程不设图标

### 留言板抽屉（方案 A）

**入口：** 团队详情工具栏「留言板」按钮（可显示 `total`；本期不做未读红点）。

**抽屉行为：**

- 自右侧滑入；桌面宽约 400–440px；移动端全宽
- 半透明遮罩；打开时锁背景滚动
- 关闭：Esc / 点遮罩 / 点 ×

**布局（自上而下）：**

1. **Header** — 标题「留言板」、总数、关闭
2. **消息列表** — 倒序（最新在上）；聊天气泡
   - 他人：左上圆角气泡、中性底
   - 自己：右上圆角气泡、橙色 soft 底
   - 行：头像、显示名、可选角色徽标（admin/owner）、相对时间、删除（仅 `canDelete`）
3. **加载更多** — `hasMore` 时显示；点击 `offset += 10` 追加更早消息
4. **底部固定输入** — textarea + 字数 `n / 500` +「发布」；空内容禁用发布

**空态：** 居中插画/图标 +「还没有留言」+ 引导文案。

**交互细节：**

- 发布成功：清空输入、新消息插入列表顶部、滚动到顶、`total++`
- 删除：轻量二次确认 → 成功后移除该项并更新 `total`
- 请求失败：抽屉内行内/toast 错误，不关闭抽屉

**组件建议：** `WsTeamMessageDrawer.vue`（自包含打开状态、分页、发布、删除）。

侧栏「团队成员」区块保持不变；留言板不再嵌入侧栏。

---

## 权限小结

| 操作 | owner | admin | member |
|---|---|---|---|
| 改团队图标 | ✓ | ✓ | ✗ |
| 发留言 | ✓ | ✓ | ✓ |
| 删自己的留言 | ✓ | ✓ | ✓ |
| 删他人留言 | ✓ | ✓ | ✗ |
| 看留言板 | ✓ | ✓ | ✓ |

---

## 错误处理

| 场景 | 状态码 / 行为 |
|---|---|
| 未登录 | 401 |
| 非成员访问留言 API | 403 |
| 无权限改图标 / 删他人留言 | 403 |
| 留言空或 > 500 字 | 400 |
| 上传非允许图片类型 | 400 |
| 团队 / 留言不存在 | 404 |
| 前端请求失败 | 抽屉或弹层内提示，保留用户输入 |

---

## 测试要点

1. owner/admin 可设预置图标与上传图；互斥切换后展示正确；member 无设置入口
2. 列表卡 + 详情 header：图 / 图标色 / 默认三种路径
3. 成员发留言；分页每次 10 条；`hasMore` / `total` 正确
4. 本人删自己的；admin/owner 删任意；普通成员不能删他人（UI 无按钮 + API 403）
5. 抽屉：开合、Esc、遮罩、空态、发布置顶、加载更多、移动端全宽

---

## 实现备注

- 复用：`WsIconPicker`、`saveFile`、`getTeamRole` / `parseSettings`
- 迁移：在 `server/db/index.ts` 用现有 `ALTER TABLE` try/catch 模式 + `CREATE TABLE IF NOT EXISTS`
- 删除团队时：级联删除该团队 `team_messages`（在现有 delete team 逻辑中显式 `DELETE FROM team_messages WHERE team_id = ?`）；可选清理 `team-avatars` 文件
