# 插件集市设计

## 概述

在 Autoforge Hub 工作区新增**插件集市**：用户可浏览、搜索、筛选公开脚本，进入详情页安装/下载，并通过独立「提交插件」流程将脚本公开发布到集市。布局与交互参考 [SkillHot](https://skillhot.savs-ai.com/#categories) 的分类发现感，视觉贴合现有橙紫深色主题（Syne / Outfit、CSS 变量），列表与详情使用 GSAP 做丰富入场与交互动效。

## 目标

- 顶栏「个人空间」左侧提供「插件集市」入口
- 集市列表：左分类（带数量）+ 主区英雄标题/搜索/排序 + 紧凑横排卡片（桌面 3 列）+ 无限滚动
- 卡片进入独立详情页（上英雄下文档）；安装/下载复用现有 Autoforge bridge 与配额
- 独立提交上架流程；发布后 `visibility = public`，下架后集市不可见
- GSAP 动效丰富，并尊重 `prefers-reduced-motion`

## 非目标

- 未登录公开浏览（本期与工作区一致，需登录）
- 榜单 / 排行榜独立模块（列表排序提供「最新 / 安装最多 / 最近更新」即可，不做 SkillHot 式独立榜单页）
- 评论、点赞、关注作者
- 审核工单流（本期发布即上架；违规下架由作者或后续运营能力处理）
- 改造个人/团队列表页的既有卡片为集市样式

---

## 决策摘要

| 项 | 选择 |
|---|---|
| 架构 | 独立集市域（方案 1） |
| 数据范围 | 全站公开脚本（`visibility = public`） |
| 卡片点击 | 进入独立详情页 |
| 上架方式 | 集市内独立「提交插件」流程 |
| 本期范围 | 浏览 + 提交 + 详情完整闭环 |
| 列表布局 | B：左分类 + 主区英雄标题/副文案 + 搜索/排序 + 右上提交 |
| 卡片样式 | 紧凑横排卡（图标 + 标题同行） |
| 详情布局 | 上英雄（标题/meta/CTA）+ 下全宽 README |
| 分页 | 服务端分页 + IntersectionObserver 加载更多（对齐个人空间，`pageSize=30`） |
| 动效 | GSAP + ScrollTrigger（详情）；减弱动效时降级 |

---

## 信息架构与路由

### 顶栏

在 `WsHeader` 的 `ws-nav` 中，于「个人空间」**左侧**插入：

`插件集市` → `个人空间` → `团队空间`

- 链接：`/workspace/marketplace`
- 激活态复用 `ws-nav__link--active`

### 路由

| 路径 | 页面 |
|---|---|
| `/workspace/marketplace` | 集市列表 |
| `/workspace/marketplace/submit` | 提交上架（分步单页） |
| `/workspace/marketplace/[id]` | 公开插件详情 |

### 权限

| 动作 | 要求 |
|---|---|
| 浏览列表 / 详情 | 已登录 |
| 安装到本地 / 下载 | 已登录；复用现有 captcha、配额、bridge |
| 提交 / 下架 | 已登录；下架仅作者（或后续扩展管理员） |

---

## 列表页布局（布局 B）

```
┌─ WsHeader: [集市][个人][团队] ─────────────────────────────┐
├────────────┬──────────────────────────────────────────────┤
│ 分类侧栏    │  英雄区：标题「插件集市」+ 副文案              │
│ · 全部 N   │           「提交插件」CTA（右上）             │
│ · 实用工具 │  工具条：搜索框 + 排序（最新/安装最多/最近更新）│
│ · 自动化   │  卡片栅格：紧凑横排卡，桌面 3 列               │
│ · … + 数量 │  滚动加载更多                                 │
└────────────┴──────────────────────────────────────────────┘
```

### 分类侧栏

- 固定分类枚举（集市专用，可与上传表单共用常量），至少包含：
  - 全部、实用工具、自动化、数据处理、数据爬取
  - 以及现有 `SCRIPT_CATEGORIES` 中仍需要的项（如 DevOps、AI/ML、数据库、监控、安全、测试、其他），合并为一份 `MARKETPLACE_CATEGORIES`，避免两套不一致
- 每项显示**该分类下公开脚本数量**（「全部」为公开总数）
- 单选筛选；切换分类触发列表刷新 + 卡片入场动画
- 窄屏：侧栏改为可折叠抽屉或顶部横向滚动分类条

### 主区

- 标题：插件集市（`font-display`）
- 副文案：一句说明，如「发现并安装社区公开脚本」
- 「提交插件」→ `/workspace/marketplace/submit`
- 搜索：防抖后请求 `q`；匹配 title / description / tags
- 排序：`newest`（`published_at` 降序）| `installs`（`install_count` 降序）| `updated`（`updated_at` 降序）；UI 文案为「最新 / 安装最多 / 最近更新」
- 空态 / 加载态 / 错误态与个人空间语气一致

### 卡片（紧凑横排）

每张卡片展示：

- 图标（含 `iconColor`）
- 标题
- 分类 · 语言
- 作者头像/名 · 安装数（或下载数）

点击整卡进入 `/workspace/marketplace/[id]`。卡片上不放完整管理操作（编辑/删除/分享）；安装放在详情页。

栅格：桌面 3 列，中屏 2 列，小屏 1 列。

---

## 详情页（上英雄 / 下文档）

### 英雄区

- 返回集市
- 图标 + 标题
- meta：分类、语言、作者、更新时间、安装数
- 主 CTA：添加到本地 Autoforge；次 CTA：下载 ZIP
- 若当前用户为作者：提供「从集市下架」

### 文档区

- 全宽 Markdown README（复用 `WsMarkdown`）
- 无 README 时显示友好空态

安装/下载行为与 `WsScriptCard` / 现有详情逻辑对齐（健康检查、install-token、captcha、配额）。

---

## 提交上架流程

路由：`/workspace/marketplace/submit`  
单页分 3 步（不拆多路由）：

1. **选择来源**
   - 从个人空间已有脚本（`team_id IS NULL`）中选择一条；或
   - 上传新 ZIP（复用现有上传校验与 `WsZipSpecGuide`）
2. **完善集市信息**
   - 标题、简述、分类、标签、图标/颜色
   - README 预览确认
3. **确认发布**
   - 明确「公开发布到插件集市」
   - 成功后将该脚本（或新创建脚本）设为 `visibility = public`，并写入/更新集市用元数据（如 `publishedAt`）
   - 跳转 `/workspace/marketplace/[id]`

### 下架

- 作者在详情页或个人空间对应入口触发
- API 将 `visibility` 改回非公开（如 `private`）；脚本仍保留在个人空间
- 集市列表与详情对非作者返回 404

### 校验

- 缺分类、无有效 ZIP、README 为空（或过短）时禁止发布
- 错误用现有 `useTip` / 表单错误样式

---

## 数据模型与 API

### 脚本字段扩展

在 `scripts` 表（及类型 `Script` / `StoredScript`）增加：

| 字段 | 类型 | 说明 |
|---|---|---|
| `visibility` | text | `private`（默认）\| `public`；团队脚本保持团队可见，不进入集市 unless 明确从个人副本发布 |
| `published_at` | text nullable | 首次上架时间 |
| `install_count` | integer | 成功「添加到本地」次数，默认 0；仅 install 成功时 +1，纯 ZIP 下载不计入 |

现有个人/团队查询不加 `visibility` 过滤（作者始终可见自己的脚本）。集市查询强制 `visibility = 'public'`。

### API

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/scripts?scope=marketplace` | 公开列表；支持 `category` / `q` / `sort` / `page` / `pageSize` |
| `GET` | `/api/scripts/marketplace/categories` | 返回各分类公开数量（含全部） |
| `GET` | `/api/scripts/:id` | 公开脚本任意登录用户可读；非公开仅作者/团队成员按现有规则 |
| `POST` | `/api/scripts/marketplace/publish` | 上架：`scriptId` 或 multipart 新上传 + 元数据 |
| `POST` | `/api/scripts/:id/unpublish` | 作者下架 |

`scope=marketplace` 的列表响应可省略大字段 `readme`（详情再取），以减轻分页载荷。

安装成功路径（install-token 成功安装后）递增 `install_count`（具体钩子在实现计划中落到 bridge 回调或 token 消费成功处）。

---

## GSAP 动效

### 原则

- 客户端 only；`gsap.context` + timeline，卸载 `kill`
- `prefers-reduced-motion: reduce` 时：取消位移/stagger，仅短淡入或无动画

### 列表页

| 时机 | 动效 |
|---|---|
| 首次进入 | 侧栏自左 stagger；标题/副文案/提交上浮；搜索条延迟出现；首屏卡片 stagger（opacity + y） |
| 切换分类 / 搜索 | 旧卡快速淡出 → 新卡 stagger 入场 |
| 加载更多 | 仅对新节点短入场 |
| Hover | `quickTo` 微抬 + 阴影/边框强调 |

### 详情页

- 英雄：标题、meta、CTA 错落入场
- README：ScrollTrigger 一次 fade-up

### 提交页

- 步骤切换：内容区横向 slide + fade
- 发布成功：短确认态再跳转

---

## 组件与文件（预期）

| 路径 | 职责 |
|---|---|
| `app/pages/workspace/marketplace/index.vue` | 列表页 |
| `app/pages/workspace/marketplace/submit.vue` | 提交上架 |
| `app/pages/workspace/marketplace/[id].vue` | 详情 |
| `app/components/marketplace/MpCategorySidebar.vue` | 分类侧栏 |
| `app/components/marketplace/MpPluginCard.vue` | 紧凑横排卡 |
| `app/components/marketplace/MpSubmitWizard.vue` | 分步上架（可内联于 submit 页） |
| `app/composables/useMarketplace.ts` | 列表/分类/发布/下架 |
| `app/components/workspace/WsHeader.vue` | 增加导航入口 |
| `app/types/workspace.ts` | `visibility`、集市分类常量、排序类型 |
| `server/api/scripts/*` | marketplace scope、publish、unpublish、categories |

视觉：复用 `--bg` / `--accent` / `--secondary` 等变量；不引入新的紫色渐变「AI 默认风」；字体保持 Syne + Outfit。

---

## 错误处理

- 401：与全局 auth 中间件一致，跳转登录
- 公开详情对已下架脚本：404 + 返回集市链接
- 发布冲突（脚本已公开）：提示「已在集市中」并提供详情链接
- 列表接口失败：主区错误条 + 重试

---

## 测试要点

- 顶栏入口位于个人空间左侧，激活态正确
- 分类数量与筛选结果一致；「全部」等于公开总数
- 搜索、排序、无限滚动正确
- 未上架脚本不出现在集市；上架后出现；下架后消失且详情 404
- 非作者不能下架；作者可下架
- 详情安装/下载与配额、captcha、bridge 行为与现网一致
- 减弱动效下无位移动画且可正常使用
- 深/浅色主题下对比度可读

---

## 参考

- 布局灵感：[SkillHot · 分类发现](https://skillhot.savs-ai.com/#categories)
- 现有分页与列表模式：`docs/superpowers/specs/2026-07-12-script-card-grid-pagination-design.md`
- GSAP 用法先例：`app/components/workspace/WsZipSpecGuide.vue`
