# 脚本卡片增强、说明书与详情页设计

## 概述

在现有脚本卡片网格与服务端分页之上，增强脚本展示与编辑体验：

1. **卡片信息更完整** — 大小、上传者（头像+名称）、上传日期、最近修改日期；新增「详情」入口
2. **产品说明书** — 新字段 `readme`（Markdown，可编辑）
3. **宽屏上传/编辑弹窗** — 左表单、右说明书编辑/预览
4. **独立详情页** — 只读展示属性 + Markdown 说明书；有权限时通过宽屏弹窗编辑

## 目标

- 列表卡片一眼可见谁上传、何时上传/修改、体积多大
- 上传/编辑时能写完整说明书，并实时预览 Markdown
- 详情页集中阅读说明书与元数据，不与列表争空间

## 非目标

- 从 zip 内自动解析 `README.md`
- 详情页内联编辑（编辑统一走宽屏弹窗）
- 去掉或合并 `description`（短描述保留给卡片）
- 说明书协作/版本历史/评论
- 富文本 WYSIWYG（仅 Markdown 文本 + 预览）

---

## 决策摘要

| 项 | 选择 |
|---|---|
| 说明书来源 | DB 字段 `readme`，用户手写 |
| 详情形态 | 路由页 `/workspace/scripts/:id` |
| 编辑入口 | 详情/卡片「编辑」→ 宽屏弹窗 |
| 短描述 | 保留 `description` + 新增 `readme` |
| 上传/编辑 UI | 统一宽屏双栏布局 |

---

## 数据模型

### `scripts` 表

```sql
ALTER TABLE scripts ADD COLUMN readme TEXT NOT NULL DEFAULT '';
```

| 列 | 说明 |
|---|---|
| `readme` | Markdown 说明书；可为空字符串 |

### 前端类型

```ts
interface Script {
  // ...existing
  readme: string
  ownerDisplayName?: string
  ownerAvatarUrl?: string
}
```

列表与详情响应均应带上 `ownerDisplayName` / `ownerAvatarUrl`（个人空间上传者通常是自己，团队空间为实际上传成员）。

**头像 URL：** 与现有用户头像一致 — 空则前端用首字母占位；非空则 `/api/files/avatars/{filename}`（`useAuth.getAvatarSrc`）。

---

## API

### 列表 `GET /api/scripts`（扩展）

在现有分页查询上 **JOIN `users`**（`scripts.owner_id = users.id`），每条 item 增加：

- `ownerDisplayName` ← `users.display_name`
- `ownerAvatarUrl` ← `users.avatar_url`
- `readme` ← `scripts.readme`（列表可返回全文；若后续体积过大可改为省略，本期返回全文以减少详情二次请求场景下的缓存缺口。若担心 payload，列表可只返回 `hasReadme: boolean`，详情再取全文 — **本期选择：列表也返回 `readme`，实现简单**）

### 详情 `GET /api/scripts/:id`（新建）

- 需登录
- 个人脚本：仅 owner 可访问
- 团队脚本：仅该团队成员可访问
- 返回完整 `Script`（含 `readme`、owner 展示字段、`filePath` 等与列表映射一致的字段）
- 404 / 403 明确错误

### 上传 `POST /api/scripts`

FormData 增加可选字段 `readme`（字符串）。写入 `scripts.readme`。

### 更新 `PUT /api/scripts/:id`

JSON body 增加可选 `readme`。权限规则与现有编辑一致。

### 其他

`copy` / `share`：复制行时一并复制 `readme`。

---

## 前端组件与页面

### 卡片 `WsScriptCard`

展示调整：

| 区域 | 内容 |
|---|---|
| 顶栏 | 标题 + 图标（保留） |
| 短描述 | `description` 两行截断（保留） |
| Meta | 分类、语言、**脚本大小** |
| 上传者行 | 小头像 + `ownerDisplayName`（缺省「未知用户」） |
| 日期行 | **上传日期**（`createdAt`）+ **最近修改**（`updatedAt`），分开展示，勿二选一 |
| 标签 | 保留 |
| 操作 | 下载 / 添加到本地；管理图标；**新增「详情」** |

「详情」：`navigateTo(\`/workspace/scripts/${id}\`)`（或 `NuxtLink`）。  
编辑/删除/复制/分享行为不变。

### 宽屏弹窗（上传 + 编辑）

**推荐实现：** 抽取共享布局组件（如 `WsScriptFormDialog`），用 `mode: 'upload' | 'edit'` 区分；或分别改 `WsUploadModal` / `WsEditModal` 共用同一套 CSS/子组件。本期至少视觉与字段一致。

布局：

- 宽度约 `min(960px, calc(100vw - 32px))`，高度约 `min(88vh, 720px)`
- **左栏（~42–48%）**：现有表单字段  
  - 上传：含 zip 拖拽区  
  - 编辑：无 zip；预填含 `readme`
- **右栏（~52–58%）**：说明书  
  - Tab 或分段：「编辑」textarea + 「预览」渲染  
  - 占位提示：支持 Markdown（标题、列表、代码块等）
- 底栏：取消 / 提交（全宽底部或左栏底部对齐）

`description` 仍 maxlength 150；`readme` 建议上限（如 50_000 字符），服务端校验。

### 详情页 `app/pages/workspace/scripts/[id].vue`

- 布局：与弹窗类似的双栏（左属性只读，右 Markdown 渲染）
- 左栏字段：标题、图标、描述、分类、语言、标签、大小、上传者、创建/修改时间、所属（个人/团队名若可得）
- 操作：返回、下载、添加到本地；`editable` 时显示「编辑」打开宽屏编辑弹窗；`deletable` 可选删除
- 右栏：`readme` 用 Markdown 渲染；空则「暂无说明书」
- 权限：进入页面前拉取 `GET /api/scripts/:id`；403/404 显示错误态
- 保存编辑后：更新本地 state 并刷新详情展示

路由建议放在 `workspace` 下，复用 default layout + `WsHeader`。

### Markdown 渲染

- 依赖：引入 `marked`（或项目已有等价物；当前无则新增）
- 组件：如 `WsMarkdown.vue`，`v-html` 渲染 **经消毒** 的 HTML  
  - 最低要求：禁用 raw HTML 或使用 DOMPurify / marked 安全选项  
  - 样式：scoped 下为 `.md-body` 提供标题/列表/代码块基础样式，适配深色主题 token

---

## 卡片与详情信息对照

| 信息 | 卡片 | 详情 |
|---|---|---|
| 大小 | ✓ | ✓ |
| 上传者头像+名 | ✓ | ✓ |
| 上传日期 | ✓ | ✓ |
| 最近修改 | ✓ | ✓ |
| 短描述 | ✓ | ✓ |
| readme | ✗（仅详情按钮进入） | ✓ 渲染 |
| 可编辑属性 | 图标编辑打开弹窗 | 「编辑」打开弹窗 |

---

## 错误与边界

- `readme` 超长：400 + 提示
- 详情无权限：403 文案 + 返回列表
- 上传者用户已删：JOIN 不到时显示「未知用户」、无头像
- Markdown 预览 XSS：必须消毒

---

## 涉及文件（预期）

| 文件 | 变更 |
|---|---|
| `server/db/index.ts` | `readme` 迁移 |
| `app/types/workspace.ts` | `readme` + owner 展示字段 |
| `server/api/scripts/index.get.ts` | JOIN users + readme |
| `server/api/scripts/index.post.ts` | 写入 readme |
| `server/api/scripts/[id]/index.get.ts` | **新建** 详情 |
| `server/api/scripts/[id]/index.put.ts` | 更新 readme |
| `server/api/scripts/[id]/copy.post.ts` 等 | 复制 readme |
| `app/composables/useScripts.ts` | `toScript` 映射；可选 `fetchScript(id)` |
| `app/components/workspace/WsScriptCard.vue` | 信息行 + 详情按钮 |
| `app/components/workspace/WsUploadModal.vue` | 宽屏双栏 |
| `app/components/workspace/WsEditModal.vue` | 宽屏双栏 + readme |
| `app/components/workspace/WsMarkdown.vue` | **新建** |
| `app/pages/workspace/scripts/[id].vue` | **新建** 详情页 |
| `package.json` | `marked`（+ 可选 `dompurify`） |

---

## 测试要点

- 上传带/不带 readme；编辑修改 readme；列表与详情一致
- 团队列表显示实际上传成员头像与名称
- 卡片四类信息（大小、人、两日期）均可见
- 详情跳转、403、空说明书
- Markdown 预览与详情渲染一致；危险 HTML 被过滤
- 宽屏弹窗在窄屏可纵向堆叠（左上右下）且可滚动
