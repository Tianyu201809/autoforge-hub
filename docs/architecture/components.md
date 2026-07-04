# Hub Components

`app/components/hub/` 下的 Vue 组件，Nuxt 自动导入，无需手动 register。

## HubHeader

**Purpose:** 顶栏 — 品牌、导航、搜索入口、主题切换、登录按钮。

**Events:**

| 事件 | 说明 |
|------|------|
| `openSearch` | 用户点击搜索框或需打开搜索弹窗时触发 |

---

## HubSidebar

**Purpose:** 左侧筛选面板（类型 + 集成），移动端隐藏，改由抽屉展示。

**v-model:**

| 模型 | 类型 |
|------|------|
| `selectedType` | `HubItemType \| 'all'` |
| `selectedIntegration` | `string` |

**Events:** `reset` — 重置筛选（由父级 `useHubFilters().resetFilters` 处理）

---

## HubToolbar

**Purpose:** 快捷标签、Top/New 排序、发布按钮；通过 `display: contents` 参与首页 intro 网格布局。

**v-model:**

| 模型 | 类型 |
|------|------|
| `sortBy` | `HubSort` |
| `selectedTags` | `string[]` |

**Events:** `toggleMobileFilters` — 打开移动端筛选抽屉

---

## HubItemCard

**Purpose:** 资源卡片 — 上大图标预览、下标题 + 类型/集成 pill + Verified。

**Props:**

| 名称 | 类型 | 说明 |
|------|------|------|
| `item` | `HubItem` | 资源数据 |

**Layout:**

```
┌─────────────────┐
│   [大图标 56px]  │
├─────────────────┤
│ Title      ↗    │
│ Script Http  ✓   │
└─────────────────┘
```

---

## HubSearchModal

**Purpose:** 全屏搜索弹窗，支持 `Esc` 关闭。

**v-model:** `searchQuery` (`string`)

**Events:** `close`

---

## HubThemeToggle

**Purpose:** 暗色 / 素白主题胶囊开关，内部调用 `useTheme()`。

**Notes:** 挂载时执行 `initTheme()` 与 plugin 协同，避免状态不一致。
