# Composables API

## useHubFilters

**Purpose:** 管理 Hub 首页的资源筛选、排序与搜索，并返回过滤后的资源列表。

**Returns:**

| 名称 | 类型 | 说明 |
|------|------|------|
| `selectedType` | `Ref<HubItemType \| 'all'>` | 资源类型筛选 |
| `selectedIntegration` | `Ref<string>` | 集成筛选（`'all'` 或 integration id） |
| `selectedTags` | `Ref<string[]>` | 快捷标签（多选，AND 逻辑） |
| `sortBy` | `Ref<HubSort>` | `'top'` 热度 / `'new'` 时间 |
| `searchQuery` | `Ref<string>` | 搜索关键词 |
| `filteredItems` | `ComputedRef<HubItem[]>` | 过滤并排序后的列表 |
| `toggleTag` | `(tag: string) => void` | 切换快捷标签选中状态 |
| `resetFilters` | `() => void` | 重置所有筛选与搜索 |

**Filter rules:**

- **类型：** `selectedType !== 'all'` 时按 `item.type` 精确匹配
- **集成：** `selectedIntegration !== 'all'` 时要求 `item.integrations` 包含该 id
- **标签：** 每个选中 tag 须出现在 `integrations` 或 `tags` 中
- **搜索：** 匹配标题、integration 名称或 type（不区分大小写）
- **排序：** `top` → `popularity` 降序；`new` → `createdAt` 降序

**Example:**

```vue
<script setup lang="ts">
const {
  selectedType,
  filteredItems,
  resetFilters
} = useHubFilters()
</script>

<template>
  <HubSidebar v-model:selected-type="selectedType" @reset="resetFilters" />
  <HubItemCard v-for="item in filteredItems" :key="item.id" :item="item" />
</template>
```

**Notes:** 数据源固定为 `~/data/hub-items` 中的 `HUB_ITEMS`，尚未对接远程 API。

---

## useTheme

**Purpose:** 管理全站暗色 / 素白主题，同步 DOM、`localStorage` 与 `theme-color` meta。

**Returns:**

| 名称 | 类型 | 说明 |
|------|------|------|
| `theme` | `Ref<ThemeMode>` | `'dark'` \| `'light'` |
| `isDark` | `ComputedRef<boolean>` | 是否为暗色 |
| `isLight` | `ComputedRef<boolean>` | 是否为素白 |
| `setTheme` | `(mode: ThemeMode) => void` | 设置主题并持久化 |
| `toggleTheme` | `() => void` | 暗色 ↔ 素白 |
| `initTheme` | `() => void` | 从 storage 恢复（挂载时调用） |

**Storage key:** `autoforge-theme`

**Example:**

```vue
<script setup lang="ts">
const { theme, toggleTheme, initTheme } = useTheme()

onMounted(() => initTheme())
</script>

<template>
  <button @click="toggleTheme">
    {{ theme === 'dark' ? '素白模式' : '暗色模式' }}
  </button>
</template>
```

**Notes:** `plugins/theme.client.ts` 在 hydration 前读取 storage，避免主题闪烁。
