# 工作空间脚本分布饼图实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将个人空间与团队空间的脚本分布模块升级为可切换分类/语言、支持点击筛选且统计完整空间数据的原生 SVG 环形饼图。

**Architecture:** 扩展现有脚本列表接口，在分页列表之外返回忽略自身维度筛选的分类与语言分面统计；`useScripts` 统一保存分布状态；个人与团队页面把统计映射到现有筛选组；共享侧栏组件使用原生 SVG 计算并渲染环形扇区、图例和交互。该方案复用现有事件接口和主题变量，不增加图表依赖。

**Tech Stack:** Nuxt 4、Vue 3 Composition API、TypeScript、sql.js、原生 SVG、scoped CSS。

## 全局约束

- 个人空间与团队空间必须共用 `WsSpaceInsightSidebar.vue` 的同一套图表实现。
- 图表只有一个，通过“分类 / 语言”分段按钮切换。
- 点击扇区或图例筛选，再次点击当前项取消筛选。
- 分布统计覆盖完整空间数据，不受 `pageSize=30` 和懒加载影响。
- 当前维度的统计忽略该维度筛选，另一维度统计保留已选条件。
- 不新增第三方运行时依赖，不修改上传、权限、脚本卡片和集市行为。
- 项目没有相邻的前端或 API 测试基础设施；不为本次改动新增测试框架，以类型检查、Lint、构建和定向手工验证为准。
- 除非用户明确授权，不创建 Git 提交。

---

### 任务 1：扩展脚本列表分面统计

**Files:**
- Modify: `app/types/workspace.ts:105`
- Modify: `server/api/scripts/index.get.ts:26`

**Interfaces:**
- Produces: `ScriptDistribution = Record<string, number>`。
- Produces: `ScriptDistributions = { category: ScriptDistribution; language: ScriptDistribution }`。
- Produces: `ScriptListResult.distributions: ScriptDistributions`。

- [ ] **步骤 1：声明列表分布类型**

在 `ScriptListResult` 前增加分布类型，并扩展响应：

```ts
export type ScriptDistribution = Record<string, number>

export type ScriptDistributions = {
  category: ScriptDistribution
  language: ScriptDistribution
}

export type ScriptListResult = {
  items: Script[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  distributions: ScriptDistributions
}
```

- [ ] **步骤 2：抽取可忽略维度的 WHERE 构造器**

在 `server/api/scripts/index.get.ts` 中把当前内联 WHERE 拼接改成局部函数。函数必须始终应用空间范围和搜索词，并按 `ignore` 参数跳过分类或语言条件：

```ts
type DistributionKind = "category" | "language"

function buildWhere(options: {
  teamId: string
  isMarketplace: boolean
  scope: string
  userId: string
  category: string
  language: string
  q: string
  ignore?: DistributionKind
}) {
  let where = "WHERE"
  const params: unknown[] = []

  if (options.teamId) {
    where += " s.team_id = ?"
    params.push(options.teamId)
  } else if (options.isMarketplace) {
    where += " s.visibility = 'public' AND s.team_id IS NULL"
  } else if (options.scope === "personal") {
    where += " s.owner_id = ? AND s.team_id IS NULL"
    params.push(options.userId)
  } else {
    where += " 1=1"
  }

  if (options.category && options.ignore !== "category") {
    where += " AND s.category = ?"
    params.push(options.category)
  }
  if (options.language && options.ignore !== "language") {
    where += " AND s.language = ?"
    params.push(options.language)
  }
  if (options.q) {
    where += " AND (LOWER(s.title) LIKE ? OR LOWER(s.description) LIKE ? OR LOWER(s.tags) LIKE ?)"
    const like = `%${options.q}%`
    params.push(like, like, like)
  }

  return { where, params }
}
```

- [ ] **步骤 3：查询分类与语言聚合**

使用同一空间与搜索条件分别建立两个 WHERE；分类统计忽略分类筛选，语言统计忽略语言筛选。只返回非空名称和正整数数量：

```ts
function readDistribution(
  db: Awaited<ReturnType<typeof getDb>>,
  column: DistributionKind,
  where: string,
  params: unknown[],
) {
  const statement = db.prepare(
    `SELECT s.${column} AS value, COUNT(*) AS count
     FROM scripts s
     ${where} AND COALESCE(s.${column}, '') <> ''
     GROUP BY s.${column}`
  )
  statement.bind(params)
  const result: Record<string, number> = {}
  while (statement.step()) {
    const row = statement.getAsObject() as { value?: string; count?: number }
    if (row.value) result[row.value] = Number(row.count || 0)
  }
  statement.free()
  return result
}
```

在返回值中加入：

```ts
distributions: {
  category: readDistribution(db, "category", categoryWhere.where, categoryWhere.params),
  language: readDistribution(db, "language", languageWhere.where, languageWhere.params),
}
```

- [ ] **步骤 4：检查接口改动**

运行：

```powershell
npx nuxi typecheck
```

预期：命令退出码为 `0`，`ScriptListResult`、SQL 参数与返回对象无 TypeScript 错误。

---

### 任务 2：在状态层与页面接入完整统计

**Files:**
- Modify: `app/composables/useScripts.ts:52`
- Modify: `app/pages/workspace/personal.vue:25`
- Modify: `app/pages/workspace/teams/[id]/index.vue:32`

**Interfaces:**
- Consumes: `ScriptDistributions`、`ScriptListResult.distributions`。
- Produces: `useScripts().distributions: Ref<ScriptDistributions>`。
- Produces: 现有 `filterGroups` 结构 `{ key, title, icon, items }[]`，其中 `items` 来自完整聚合统计。

- [ ] **步骤 1：在 `useScripts` 中保存分布状态**

导入 `ScriptDistributions`，增加稳定的空值工厂：

```ts
function emptyDistributions(): ScriptDistributions {
  return { category: {}, language: {} }
}
```

在 `useScripts()` 中增加：

```ts
const distributions = useState<ScriptDistributions>(
  "workspace-script-distributions",
  emptyDistributions,
)
```

首次加载和加载更多成功时同步：

```ts
distributions.value = data.distributions || emptyDistributions()
```

首次加载失败时清空：

```ts
distributions.value = emptyDistributions()
```

最后从 `useScripts()` 返回 `distributions`。加载更多失败时保留已有分布，避免短暂网络问题抹掉有效图表。

删除脚本沿用现有乐观本地更新，并根据被删除脚本的 `category` 与 `language` 同步递减两组分布计数；计数降为零时删除对应键。上传与编辑流程已有列表刷新，不重复维护本地计数。

- [ ] **步骤 2：个人空间改用服务端统计**

从 `useScripts()` 解构 `distributions`，移除基于 `loadedScripts` 遍历计数的逻辑，将构造器改为：

```ts
function buildFilterItems(
  kind: 'category' | 'language',
  values: readonly string[],
  activeValue: string,
) {
  const counts = distributions.value[kind]
  return values
    .map(value => ({
      label: value,
      value,
      count: counts[value] || 0,
      active: activeValue === value,
    }))
    .filter(item => item.count > 0 || item.active)
}
```

保留现有 `personalSidebarFilterGroups`、`handleSidebarFilter` 和页面事件绑定，不修改列表筛选行为。

- [ ] **步骤 3：团队空间改用服务端统计**

从 `useScripts()` 解构 `distributions`，把 `buildTeamFilterItems` 改为与个人空间相同的映射方式。保留现有团队权限、`teamSidebarFilterGroups`、`handleTeamSidebarFilter` 和页面事件绑定。

- [ ] **步骤 4：检查状态与页面类型**

运行：

```powershell
npx nuxi typecheck
```

预期：命令退出码为 `0`，两处页面能正确识别 `distributions.value.category` 和 `distributions.value.language`。

---

### 任务 3：实现共享 SVG 环形饼图

**Files:**
- Modify: `app/components/workspace/WsSpaceInsightSidebar.vue:1`

**Interfaces:**
- Consumes: 现有 `filterGroups: SidebarFilterGroup[]`。
- Emits: 现有 `filter({ kind, value })`，不改变父页面契约。
- Internal: `activeKind: Ref<FilterKind>`、`hoveredValue: Ref<string>`、`chartSegments`、`chartTotal`、`activeGroup`。

- [ ] **步骤 1：增加图表状态和扇区计算**

增加当前维度、悬浮项、稳定色板和 SVG 圆环常量。色板按 `SCRIPT_CATEGORIES` 与 `SCRIPT_LANGUAGES` 的既有顺序分配，确保同一维度内颜色唯一且跨空间稳定。使用圆环周长计算 `stroke-dasharray` 与 `stroke-dashoffset`，避免复杂路径边界：

```ts
const activeKind = ref<FilterKind>('category')
const hoveredValue = ref('')
const chartRadius = 54
const chartCircumference = 2 * Math.PI * chartRadius
const chartColors = [
  'var(--accent)',
  'var(--secondary)',
  '#0ea5e9',
  '#22c55e',
  '#eab308',
  '#ec4899',
  '#14b8a6',
  '#8b5cf6',
  '#f43f5e',
  '#84cc16',
  '#06b6d4',
  '#f97316',
]
const chartColorOrder = [...SCRIPT_CATEGORIES, ...SCRIPT_LANGUAGES]

function getSegmentColor(value: string, fallbackIndex: number) {
  const knownIndex = chartColorOrder.indexOf(value as (typeof chartColorOrder)[number])
  const colorIndex = knownIndex >= 0 ? knownIndex : fallbackIndex
  return chartColors[colorIndex % chartColors.length] || 'var(--accent)'
}

const activeGroup = computed(() => (
  props.filterGroups.find(group => group.key === activeKind.value)
  || props.filterGroups[0]
))

const chartTotal = computed(() => (
  activeGroup.value?.items.reduce((sum, item) => sum + item.count, 0) || 0
))

const chartSegments = computed(() => {
  let offset = 0
  return (activeGroup.value?.items || []).map((item, index) => {
    const ratio = chartTotal.value > 0 ? item.count / chartTotal.value : 0
    const length = ratio * chartCircumference
    const segment = {
      ...item,
      color: getSegmentColor(item.value, index),
      ratio,
      percentage: Math.round(ratio * 100),
      dasharray: `${length} ${chartCircumference - length}`,
      dashoffset: -offset,
    }
    offset += length
    return segment
  })
})
```

当当前维度不再存在时回退到第一个筛选组；个人与团队页面均有两个固定组，因此正常状态保持用户选择。

- [ ] **步骤 2：替换分布列表模板**

保留模块标题，将当前的两组按钮列表替换为：

1. `role="tablist"` 的分类/语言分段按钮；
2. 带 `<title>` 和说明文本的 SVG；
3. 旋转 `-90deg` 后叠加的 `<circle>` 扇区；
4. 中心总数；
5. 可点击图例列表；
6. 无数据时的现有空状态。

每个扇区使用透明宽描边按钮作为命中区，视觉圆环使用计算后的颜色与 dash 参数。扇区和图例触发同一个调用：

```ts
emit('filter', {
  kind: activeGroup.value!.key,
  value: segment.value,
})
```

扇区的 `aria-label` 包含名称、数量、占比和当前是否选中；分段按钮使用 `aria-selected`，图例按钮使用 `aria-pressed`。

- [ ] **步骤 3：增加图表视觉样式**

在 scoped CSS 中增加以下结构的样式：

- `.space-side__chart-tabs`：两列分段控件，使用 `var(--bg-muted)`、`var(--border)` 和当前主题强调色。
- `.space-side__chart-wrap`：居中容纳约 `168px` 图表并保留呼吸空间。
- `.space-side__chart-track`：使用边框色作为背景圆环。
- `.space-side__chart-segment`：悬浮、聚焦或选中时增加描边宽度和亮度；存在选中项时降低其他扇区透明度。
- `.space-side__chart-center`：总数使用 tabular numbers，说明使用弱化文字色。
- `.space-side__chart-legend`：单列图例；名称自适应，数量和百分比右对齐。
- `.space-side__legend-dot`：使用扇区颜色，不能作为唯一状态提示。

添加 `@media (prefers-reduced-motion: reduce)` 关闭扇区与图例过渡。沿用现有 `@media (max-width: 1100px)`，不新增页面级断点。

- [ ] **步骤 4：检查组件类型与模板**

运行：

```powershell
npx nuxi typecheck
```

预期：命令退出码为 `0`，SVG 属性、计算属性和模板事件无 Vue/TypeScript 错误。

---

### 任务 4：执行完整验证

**Files:**
- Verify: `server/api/scripts/index.get.ts`
- Verify: `app/composables/useScripts.ts`
- Verify: `app/pages/workspace/personal.vue`
- Verify: `app/pages/workspace/teams/[id]/index.vue`
- Verify: `app/components/workspace/WsSpaceInsightSidebar.vue`

**Interfaces:**
- Verifies: API、状态、页面和共享组件的端到端契约。

- [ ] **步骤 1：运行 Lint**

运行：

```powershell
npm run lint
```

预期：命令退出码为 `0`；若仓库已有与本次无关的错误，只记录且不修改无关文件。

- [ ] **步骤 2：运行 TypeScript 检查**

运行：

```powershell
npx nuxi typecheck
```

预期：命令退出码为 `0`。

- [ ] **步骤 3：运行开发构建**

运行：

```powershell
npm run build:dev
```

预期：Nuxt/Nitro 构建完成且命令退出码为 `0`。

- [ ] **步骤 4：定向验证个人空间**

在 `/workspace/personal` 验证：分类与语言切换、完整空间统计、扇区和图例筛选、再次点击取消、搜索联动、空状态、键盘焦点和减少动画偏好。

- [ ] **步骤 5：定向验证团队空间**

在 `/workspace/teams/:id` 验证相同图表交互，并确认团队权限卡、留言、上传按钮和脚本列表行为不变。

- [ ] **步骤 6：检查最终差异**

运行：

```powershell
git diff --check
git status --short
```

预期：`git diff --check` 无输出；状态只包含本计划列出的实现文件、设计规格与实施计划，不包含构建产物或无关改动。
