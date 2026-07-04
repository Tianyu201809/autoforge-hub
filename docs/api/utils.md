# Utils API — `app/utils/hub-icons.ts`

Integration 与资源类型的 Lucide 图标映射，供 `HubItemCard` 大图标与标签展示使用。

## getIntegrationIcon

**Purpose:** 根据 integration id 返回 Iconify 图标名。

**Parameters:**

- `integration` (`string`): 集成标识，如 `'github'`、`'http'`

**Returns:** `string` — 形如 `'lucide:github'`；未知集成回退 `'lucide:box'`

**Example:**

```ts
getIntegrationIcon('http')   // 'lucide:cloud'
getIntegrationIcon('unknown')  // 'lucide:box'
```

---

## getItemHeroIcon

**Purpose:** 为卡片预览区选取主图标：优先首个 integration，否则按资源类型。

**Parameters:**

- `item` (`HubItem`): 资源对象

**Returns:** `string` — Iconify 图标名（卡片内常用 `size="56"`）

**Example:**

```ts
getItemHeroIcon({ integrations: ['slack', 'openai'], type: 'script', ... })
// 'lucide:message-square'
```

---

## formatIntegrationLabel

**Purpose:** 将 integration id 格式化为 UI 展示标签。

**Parameters:**

- `integration` (`string`): 原始 id

**Returns:** `string` — 如 `'Http'`、`'GSheets'`、`'Github'`

---

## hubTypeLabels

**Purpose:** 资源类型 id → 英文展示名常量表。

**Type:** `Record<HubItemType, string>`

| Key | Label |
|-----|-------|
| `script` | Script |
| `flow` | Flow |
| `app` | App |
| `skill` | Skill |
| `resource` | Resource type |

**Notes:** 新增 integration 时，在 `integrationIcons` 对象中补充 Lucide 映射即可。
