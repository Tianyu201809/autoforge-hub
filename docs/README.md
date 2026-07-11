# AutoforgeHub 文档

Autoforge Hub 的前端项目文档，用于发现与浏览自动化资源（Script、Flow、App、Skill、Resource）。

## 目录

| 文档 | 说明 |
|------|------|
| [Code Map](./code-map/overview.md) | 架构、目录结构与数据流 |
| [Composables API](./api/composables.md) | `useHubFilters`、`useTheme`、`useAutoforgeBridge`、`useTip` 等 |
| [Hub Local Install API](./api/hub-local-install.md) | 一键安装到本机 Autoforge（installToken + 本机桥） |
| [Utils API](./api/utils.md) | 图标映射与标签格式化 |
| [Types](./api/types.md) | TypeScript 类型定义 |
| [Components](./architecture/components.md) | Hub UI 组件说明 |
| [Deploy Railway](./deploy-railway.md) | Railway 部署说明 |

## 快速开始

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint     # ESLint 检查
pnpm build    # 生产构建
```

## 技术栈

- **Nuxt 4** + **Vue 3** + **TypeScript**
- **@nuxt/icon** + Lucide 图标集
- **@nuxt/eslint** Flat Config
- 双主题：暗色 Forge / 素白亮色（`data-theme` + localStorage）

## 当前数据层

初版使用 `app/data/hub-items.ts` 中的 mock 数据，尚未接入后端 API。筛选、排序、搜索均在客户端完成。
