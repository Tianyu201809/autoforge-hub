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

---

## useAutoforgeBridge

**Purpose:** 探测本机 Autoforge 桌面端 HTTP 桥，并将脚本 zip URL 交给桌面端安装。

**Constants:**

| 名称 | 值 |
|------|-----|
| Bridge base | `http://127.0.0.1:19276` |
| Health timeout | `1000` ms |

**Returns:**

| 名称 | 类型 | 说明 |
|------|------|------|
| `checkHealth` | `() => Promise<boolean>` | `GET /health`；超时或非 `{ ok: true }` 为 `false` |
| `installScript` | `(body) => Promise<BridgeInstallResult>` | `POST /install` |

**`installScript` body:**

- `zipUrl` (string, 必填): 绝对 http(s) URL（通常含 `installToken`）
- `scriptName` (string, 可选)
- `hubScriptId` (string, 可选)

**`BridgeInstallResult`:**

```ts
| { ok: true; scriptId: string; name: string }
| { ok: false; status?: number; error?: string; message: string }
```

失败时 `message` 优先用桌面端返回文案，否则按状态码映射（`busy` / `download_failed` / `invalid_package` 等）。

**Example:**

```ts
const { checkHealth, installScript } = useAutoforgeBridge()

if (!(await checkHealth())) {
  // 请先启动 Autoforge
  return
}

const result = await installScript({
  zipUrl,
  scriptName: '我的脚本',
  hubScriptId: scriptId,
})
```

**Notes:** 用于 `WsScriptCard`「添加到本地 Autoforge」。完整链路见 [Hub Local Install API](./hub-local-install.md)。

---

## useTip

**Purpose:** 全站顶部浮层 tip（成功 / 错误 / 信息），由 `AfGlobalTip` 在 `app.vue` 挂载展示。

**Returns:**

| 名称 | 类型 | 说明 |
|------|------|------|
| `tip` | `Ref<TipState>` | `{ visible, message, type }`（`useState` 共享） |
| `showTip` | `(message, type?, durationMs?) => void` | 显示 tip；默认 type `success`，时长 3200ms |
| `hideTip` | `() => void` | 立即关闭 |

**`TipType`:** `'success' \| 'error' \| 'info'`

**Example:**

```ts
const { showTip } = useTip()

showTip('已添加到本地 Autoforge', 'success')
showTip('请先启动 Autoforge 桌面端，然后再试', 'info')
```

**Notes:** 隐藏定时器为模块级单例，避免多处调用 `useTip()` 时互相抢 timer。
