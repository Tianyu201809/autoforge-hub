# Types — `app/types/hub.ts`

## HubItemType

```ts
type HubItemType = 'script' | 'flow' | 'app' | 'skill' | 'resource'
```

Hub 资源分类，与 Windmill Hub 的 Script / Flow / App 等概念对齐，并扩展 Skill、Resource type。

---

## HubSort

```ts
type HubSort = 'top' | 'new'
```

列表排序方式。

---

## HubItem

**Purpose:** 单条 Hub 资源的完整数据结构。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 唯一标识 |
| `title` | `string` | 展示标题 |
| `type` | `HubItemType` | 资源类型 |
| `integrations` | `string[]` | 关联合集成 id 列表 |
| `verified` | `boolean` | 是否已验证 |
| `iconColor?` | `string` | 卡片大图标颜色（hex/rgb/hsl）；省略则按主 integration 或类型推断 |
| `tags?` | `string[]` | 可选标签（如 `trigger`、`failure`） |
| `createdAt` | `string` | ISO 日期字符串，用于 New 排序 |
| `popularity` | `number` | 热度分值，用于 Top 排序 |

---

## HubTypeFilter

**Purpose:** 侧栏类型筛选项。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `HubItemType \| 'all'` | 筛选值 |
| `label` | `string` | UI 文案 |
| `icon` | `string` | Lucide Iconify 名 |

---

## HubIntegrationFilter

**Purpose:** 侧栏集成筛选项。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | `'all'` 或 integration id |
| `label` | `string` | UI 文案 |

**Related data:** 常量定义见 `app/data/hub-items.ts`（`HUB_TYPE_FILTERS`、`HUB_INTEGRATION_FILTERS`、`HUB_QUICK_TAGS`、`HUB_ITEMS`）。
