# Code Map: AutoforgeHub

## Overview

AutoforgeHub 是一个 **Nuxt 4 单页 Hub 门户**，UI 参考 [Windmill Hub](https://hub.windmill.dev/)，用于浏览与筛选自动化资源卡片。当前为纯前端 MVP：数据来自本地 mock，无服务端 API。

```
┌─────────────────────────────────────────────────────────┐
│  HubHeader (导航 / 搜索 / 主题 / 登录)                    │
├──────────┬──────────────────────────────────────────────┤
│ HubSidebar│  Intro (Hero + Toolbar)                     │
│ 类型筛选   │  Items Grid (HubItemCard × N)               │
│ 集成筛选   │                                              │
└──────────┴──────────────────────────────────────────────┘
         HubSearchModal (Ctrl+K)  ·  Mobile Filter Drawer
```

## Directory Structure

```
app/
├── app.vue                 # 根组件，挂载 layout + page
├── layouts/default.vue     # 全站布局壳
├── pages/index.vue         # Hub 首页（筛选状态、intro、网格）
├── assets/css/main.css     # 设计 token、双主题 CSS 变量
├── components/hub/         # Hub 专用 UI 组件
│   ├── HubHeader.vue
│   ├── HubSidebar.vue
│   ├── HubToolbar.vue
│   ├── HubItemCard.vue
│   ├── HubSearchModal.vue
│   └── HubThemeToggle.vue
├── composables/            # 可复用逻辑
│   ├── useHubFilters.ts    # 筛选 / 排序 / 搜索
│   └── useTheme.ts         # 暗色 / 素白主题
├── data/hub-items.ts       # Mock 资源与筛选项常量
├── types/hub.ts            # 共享 TypeScript 类型
├── utils/hub-icons.ts      # Integration → Lucide 图标映射
└── plugins/theme.client.ts # 启动时恢复主题，防闪烁

public/
└── logo.png                # 品牌 Logo / favicon

eslint.config.mjs           # ESLint 入口（扩展 .nuxt 生成配置）
nuxt.config.ts              # Nuxt 模块与全局 head
```

## Key Components

### 页面层 — `pages/index.vue`

- **职责：** 组合 Hub 子组件，持有筛选 UI 状态（搜索弹窗、移动端抽屉）
- **快捷键：** `Ctrl+K` / `Cmd+K` 切换搜索弹窗
- **布局：** CSS Grid 将 Hero 与 Toolbar 的 actions 对齐同一行

### 筛选逻辑 — `composables/useHubFilters.ts`

- **输入：** 用户选择的类型、集成、快捷标签、排序、搜索词
- **输出：** `filteredItems` 计算属性（基于 `HUB_ITEMS`）
- **排序：** `top` 按 `popularity`，`new` 按 `createdAt`

### 主题 — `composables/useTheme.ts` + `plugins/theme.client.ts`

- **存储键：** `autoforge-theme`（`localStorage`）
- **DOM：** `document.documentElement[data-theme="dark"|"light"]`
- **默认：** 暗色；素白模式为亮色「Forge 橙 + 白底」风格

### 卡片 — `components/hub/HubItemCard.vue`

- **布局：** 上部大图标预览区 + 下部标题 / 标签 / Verified
- **图标：** 由 `getItemHeroIcon()` 取首个 integration 的 Lucide 图标（56px）

## Data Flow

```
HUB_ITEMS (mock)
       │
       ▼
useHubFilters() ──► filteredItems
       ▲                  │
       │                  ▼
 HubSidebar          HubItemCard[]
 HubToolbar          (grid render)
 HubSearchModal
```

1. `hub-items.ts` 提供静态资源列表与筛选项常量
2. `index.vue` 通过 `useHubFilters()` 创建响应式筛选状态
3. 子组件通过 `v-model` 双向绑定筛选字段
4. `filteredItems` 驱动 `HubItemCard` 网格渲染

## Dependencies

| 包 | 用途 |
|----|------|
| `nuxt` | 框架、路由、自动导入 |
| `@nuxt/icon` | `<Icon name="lucide:..." />` |
| `@iconify-json/lucide` | Lucide 图标数据 |
| `@nuxt/eslint` + `eslint` | 代码规范 |
| `typescript` + `vue-tsc` | TS 支持与类型检查 |

## Extension Points

接入真实 API 时建议：

1. 将 `HUB_ITEMS` 替换为 `useFetch` / `useAsyncData` 拉取的数据
2. 保留 `useHubFilters` 逻辑，改为对 API 结果过滤，或服务端 query 参数
3. 新增 `pages/items/[id].vue` 作为资源详情页，`HubItemCard` 链接指向该路由
