# Autoforge Download Entry Design

> 在登录页与工作区顶栏增加跳转 GitHub Releases 的下载入口，登录与否均可访问

## 背景

AutoforgeHub 是脚本管理 Hub；桌面端 Autoforge 发布在 GitHub Releases。当前站点无任何指向桌面端下载的入口。公开面仅有 `/login`，登录后统一使用 `WsHeader`。

## 目标

- 游客在 `/login` 可一键打开 Releases
- 已登录用户在任意 `/workspace/*` 顶栏可一键打开 Releases
- 不抢登录主 CTA / 工作区主导航的视觉权重
- 不改鉴权、不新增公开路由

## 非目标

- 不恢复公开 Hub 落地页 / 不挂载 `HubHeader`
- 不内嵌安装说明或版本列表（直接外链 Releases）
- 不改脚本 zip 下载逻辑（`WsScriptCard`）

## 行为

| 项 | 规格 |
|----|------|
| URL | `https://github.com/Tianyu201809/autoforge/releases` |
| 打开方式 | `target="_blank"` + `rel="noopener noreferrer"` |
| 文案（≥640px） | 下载 Autoforge |
| 文案（&lt;640px） | 下载 |
| 图标 | 左 `lucide:download`，右 `lucide:external-link`（半透明） |

## 放置

### 游客 — `app/layouts/auth.vue`

- 左上角固定：`top: 16px; left: 16px; z-index: 10`
- 与右上角 `HubThemeToggle` 对称

### 已登录 — `app/components/workspace/WsHeader.vue`

- `ws-header__right` 内，插在 `HubThemeToggle` 左侧
- 窄屏仍显示（不随 `ws-nav` 隐藏）

## 视觉

幽灵按钮，对齐现有 `btn-workspace`：

- `display: inline-flex; align-items: center; gap: 6px`
- `padding: 6px 12px`；窄屏可缩为 `6px 8px`
- `border: 1px solid var(--border)`；`border-radius: var(--radius-sm)`
- 字色 `var(--text-muted)` / `var(--text-secondary)`；字号 `var(--text-sm)`；字重 500
- hover：`border-color` / `color` → `var(--accent)`；可选轻微 `background: var(--accent-soft)`
- 外链图标 opacity ~0.6

## 实现

### 推荐：共享组件 `AfDownloadLink.vue`

路径：`app/components/AfDownloadLink.vue`（或 `app/components/shared/AfDownloadLink.vue`，以仓库现有组件目录习惯为准）

- 单一 `<a>`，内含图标 + 响应式文案
- scoped 样式自包含，两端直接引用，避免 `auth.vue` / `WsHeader.vue` 样式分叉

### 改动文件

| 文件 | 改动 |
|------|------|
| `app/components/AfDownloadLink.vue` | 新建共享链接组件 |
| `app/layouts/auth.vue` | 左上角挂载 |
| `app/components/workspace/WsHeader.vue` | 右侧挂载 |

## 验收

- [ ] 未登录访问 `/login`，左上角可见并可跳转 Releases
- [ ] 登录后访问任意 `/workspace/*`，顶栏可见并可跳转 Releases
- [ ] 深色 / 浅色主题下对比度正常
- [ ] &lt;640px 文案收缩为「下载」，不挤压用户菜单
- [ ] 登录橙按钮仍为页面主 CTA，下载入口为次级

## 常量

可将 URL 写在组件内常量；若后续 Docs/Community 等外链增多，再抽到 `app/utils/links.ts`（本次不做）。
