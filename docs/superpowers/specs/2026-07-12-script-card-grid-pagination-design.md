# 脚本列表卡片网格与服务端分页设计

## 概述

将**团队脚本列表**与**个人空间脚本列表**从单列列表 + 客户端分页（每页 5 条）改为：

1. **3 列卡片网格**（窄屏降为 2 / 1 列），卡片视觉参考图 2 结构，适配现有深色工作区
2. **服务端分页**，每次请求 `pageSize=30`
3. 搜索 / 分类 / 语言 / 排序均走服务端
4. 滚到底部**自动加载下一页**；底部显示「加载中…」或「没有更多了」

## 目标

- 团队页（`teams/[id]`）与个人页（`personal`）列表体验一致
- 首屏与后续页均只拉取当前需要的数据，避免一次拉全量
- 保留现有脚本操作：下载、添加到本地、编辑、删除、复制、分享（按权限）

## 非目标

- 游标（cursor）分页
- 新建独立 `WsScriptGridCard` 与旧列表卡片并存（本期直接改造 `WsScriptCard`）
- 脚本详情独立页 / 「详情」跳转（图 2 的「详情」映射为本期卡片内操作，不新增路由）
- 审计日志页等其他分页场景改造
- 留言板分页逻辑变更

---

## 决策摘要

| 项 | 选择 |
|---|---|
| 分页 | 服务端 `page` + `pageSize` |
| 每页条数 | 固定 30 |
| 筛选 / 排序 | 全部走接口 |
| 范围 | 团队 + 个人 |
| 加载更多 | IntersectionObserver 自动加载 |
| 卡片 | 改造现有 `WsScriptCard`，网格布局 |

---

## API

### `GET /api/scripts` 扩展

**现有行为：** 返回完整 `Script[]`，支持 `scope` / `teamId` / `category` / `language`，固定 `ORDER BY created_at DESC`。

**新查询参数：**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `scope` | string | `personal` | 与现有一致；有 `teamId` 时以团队为准 |
| `teamId` | string | — | 团队脚本 |
| `page` | number | `1` | 从 1 开始 |
| `pageSize` | number | `30` | 上限 100，非法值回退默认 |
| `q` | string | `''` | 搜索：title / description / tags（JSON 文本包含，大小写不敏感） |
| `category` | string | `''` | 精确匹配（现有） |
| `language` | string | `''` | 精确匹配（现有） |
| `sort` | string | `newest` | `newest` \| `oldest` \| `name` |

**排序映射：**

| sort | SQL |
|---|---|
| `newest` | `ORDER BY created_at DESC` |
| `oldest` | `ORDER BY created_at ASC` |
| `name` | `ORDER BY title COLLATE NOCASE ASC` |

**响应形状（破坏性变更）：**

```ts
{
  items: Script[]   // 映射字段与现有单条一致
  total: number
  page: number
  pageSize: number
  hasMore: boolean  // page * pageSize < total
}
```

实现：先按条件 `COUNT(*)`，再 `LIMIT ? OFFSET ?`（`OFFSET = (page - 1) * pageSize`）。权限与现有一致（需登录；personal 仅本人；team 需为成员等，沿用现有 middleware / 查询约束）。

**兼容说明：** 前端 `useScripts` 与脚本列表页是唯一消费者；本期同步改前端，不保留旧数组响应。

---

## 前端数据层

### `useScripts` 调整

全局 `useState<Script[]>('workspace-scripts')` 改为承载**当前列表的已加载累计项**（个人与团队页切换时重置）。

新增 / 调整能力：

```ts
type ScriptListQuery = {
  scope?: 'personal'
  teamId?: string
  page?: number
  pageSize?: number  // 默认 30
  q?: string
  category?: string
  language?: string
  sort?: ScriptSort
}

type ScriptListResult = {
  items: Script[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// 重置并加载第 1 页（筛选 / 排序 / 进入页面 / 上传删除后刷新）
async function loadScripts(query: ScriptListQuery): Promise<void>

// 追加下一页；若 !hasMore 或正在加载则 no-op
async function loadMoreScripts(): Promise<void>
```

状态建议一并暴露：

- `scripts` — 已加载列表
- `total` / `hasMore` / `listLoading` / `listLoadingMore`
- 当前查询快照（便于 loadMore 复用同一筛选条件）

**上传成功：** 重置为当前筛选条件的第 1 页并 `loadScripts`（避免仅 `unshift` 导致与服务端分页不一致）。  
**删除成功：** 从本地 `scripts` 移除该项，并 `total--`；若当前页变空且还有更早数据，可选再拉一页补齐（最低要求：本地移除 + total 更新）。  
**编辑成功：** 就地更新对应项字段。

废弃页内客户端 `searchScripts` / `sortScripts` 用于列表主路径（composables 内函数可保留作工具或删除，以调用点清零为准）。

---

## UI / 组件

### 布局：`teams/[id]/index.vue` 与 `personal.vue`

- `.ws-script-list` 改为 CSS Grid：`repeat(3, 1fr)`；`@media` 中屏 2 列、小屏 1 列
- 移除脚本列表的 `WsPagination`（组件本身保留，供审计等页面使用）
- 列表底部增加哨兵节点 + 状态文案：
  - `listLoadingMore` →「加载中…」
  - `!hasMore && scripts.length > 0` →「没有更多了」
  - 首屏 `listLoading && scripts.length === 0` → 现有空/加载态
- `IntersectionObserver`（`rootMargin` 约 `200px`）观察哨兵；进入视口且 `hasMore && !listLoading && !listLoadingMore` 时调用 `loadMoreScripts`
- 工具栏：搜索防抖（约 300ms）后触发 `loadScripts` 第 1 页；分类 / 语言 / 排序变更立即重置加载

### 卡片：`WsScriptCard.vue`

由横向列表行改为竖向卡片（对齐图 2 分区，深色主题）：

1. **顶栏**：左侧标题；右侧脚本 Lucide 图标（`icon` + `iconColor`）
2. **简介**：`description` 最多 2 行，超出省略
3. **Meta 行**：分类 / 语言徽章；文件大小（可选文件名缩短展示）
4. **标签行**：`tags`（过多时截断 + 省略）
5. **底栏时间**：相对时间或现有 `formatDate(createdAt/updatedAt)`（优先展示更新时间文案，如「x 天前更新」若实现成本高则沿用绝对日期）
6. **操作栏**：底部分隔线内操作 —— 下载、添加到本地为主要 CTA；复制 / 编辑 / 删除 / 分享按 props 显示为图标按钮

悬停：轻微边框 / 背景提亮（与现有 workspace token 一致，不用紫色渐变或强阴影）。  
删除确认、下载验证码、安装逻辑保持不变，仅布局调整。

### 图 2 字段映射

| 图 2 | 脚本卡片 |
|---|---|
| 仓库名 | `title` |
| 短描述 | `description` |
| 右上角头像 | 脚本 `icon` |
| 分类标签 | `category` |
| 统计图标行 | 语言 + 体积等 meta（无 stars/forks，不伪造） |
| 技术标签 | `tags` |
| 更新时间 | `updatedAt` / `createdAt` |
| 收藏 / 详情 / 外链 | 映射为下载 / 添加到本地 / 管理操作（无独立详情页） |

---

## 错误处理

- 第 1 页失败：清空列表（或保留旧数据并 toast），展示错误提示
- 加载更多失败：不追加；哨兵旁显示「加载失败，滚动重试」或下次进入视口再试（需防抖，避免死循环狂刷；失败后设短冷却或要求再次离开再进入视口）
- `pageSize` 非法：服务端钳制

---

## 测试要点

- 团队 / 个人：空列表、不足 30 条、刚好 30 条、超过 30 条滚动加载
- 搜索 / 分类 / 语言 / 排序变更后重置为第 1 页且结果正确
- 无 `hasMore` 时不发多余请求
- 权限按钮在卡片新布局下仍正确显示
- 上传 / 删除 / 编辑后列表与 total 一致
- 响应式：3 / 2 / 1 列可读、可点

---

## 涉及文件

| 文件 | 变更 |
|---|---|
| `server/api/scripts/index.get.ts` | 分页、搜索、排序、新响应 |
| `app/composables/useScripts.ts` | `loadScripts` / `loadMoreScripts`、状态 |
| `app/components/workspace/WsScriptCard.vue` | 竖向卡片 UI |
| `app/pages/workspace/teams/[id]/index.vue` | 网格、无限滚动、去掉分页器、查询驱动加载 |
| `app/pages/workspace/personal.vue` | 同上 |

可选：抽出 `useScriptInfiniteScroll(sentinelRef)` 若两页逻辑重复明显。
