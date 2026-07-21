# 工作空间 Icon Dock 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将个人/团队空间快捷操作和团队权限状态重构为纯图标 Icon Dock，并保留现有行为、状态与无障碍语义。

**Architecture:** 只修改共享组件 `WsSpaceInsightSidebar.vue`。模板按 `actions` 原始顺序分别渲染 `NuxtLink`、外链和按钮；权限继续消费现有只读数组；所有名称转入 Tooltip、`title` 与 `aria-label`，不改变父页面接口。

**Tech Stack:** Nuxt 4、Vue 3 Composition API、TypeScript、Nuxt Icon、scoped CSS。

## 全局约束

- 快捷操作与权限项默认只显示图标，不显示常驻名称或状态文字。
- 个人空间五项操作使用三列网格，团队空间两项操作使用两列网格。
- 个人空间使用橙色强调，团队空间使用紫色强调。
- 主操作、普通操作、外链、禁用、权限可用和权限关闭必须有不同图形状态。
- 保留现有 `actions`、`permissions` props、`action` emit、路由、外链和禁用判断。
- 不修改脚本分布饼图、父页面数据、权限逻辑或全局主题令牌。
- 不新增运行时依赖或测试框架。
- 除非用户明确授权，不创建 Git 提交。

---

### 任务 1：重构快捷操作与权限模板

**Files:**
- Modify: `app/components/workspace/WsSpaceInsightSidebar.vue:154`

**Interfaces:**
- Consumes: `actions: SidebarAction[]` 与 `permissions: SidebarPermission[]`。
- Preserves: `emit("action", action.key)`、`NuxtLink.to`、外链 `href/target/rel`、`disabled`。
- Produces: `.space-side__icon-dock`、`.space-side__icon-action`、`.space-side__permission-dock` 与共享 `.space-side__icon-tooltip` 结构。

- [ ] **步骤 1：移除快捷操作文字标题栏**

将快捷操作 section 改为只保留可访问名称的面板：

```vue
<section
  class="space-side__panel space-side__panel--icon-dock"
  aria-label="快捷操作"
>
  <div
    class="space-side__icon-dock"
    :class="{ 'space-side__icon-dock--compact': actions.length <= 2 }"
  >
    <!-- actions -->
  </div>
</section>
```

- [ ] **步骤 2：按原始顺序渲染三种操作类型**

使用单个 `<template v-for="action in actions">`，内部按路由、外链、按钮三种分支渲染，避免现有三个循环改变传入顺序。每个分支必须包含：

```vue
:aria-label="action.label"
:title="action.label"
class="space-side__icon-action"
:class="{
  'space-side__icon-action--primary': action.primary,
  'space-side__icon-action--disabled': action.disabled,
}"
```

内容只渲染主图标、状态角标和 Tooltip：

```vue
<Icon :name="action.icon" size="20" />
<span v-if="action.external || action.disabled" class="space-side__icon-badge" aria-hidden="true">
  <Icon :name="action.disabled ? 'lucide:lock-keyhole' : 'lucide:external-link'" size="9" />
</span>
<span class="space-side__icon-tooltip" role="tooltip">{{ action.label }}</span>
```

按钮分支继续使用 `@click="emit('action', action.key)"`；外链继续使用 `target="_blank" rel="noopener noreferrer"`；路由分支继续绑定 `:to="action.to"`。

- [ ] **步骤 3：重构团队权限为四列图标阵列**

将权限 section 改为纯图标面板：

```vue
<section
  v-if="permissions.length > 0"
  class="space-side__panel space-side__panel--permission-dock"
  aria-label="我的权限"
>
  <div class="space-side__permission-dock">
    <div
      v-for="permission in permissions"
      :key="permission.label"
      class="space-side__permission-icon"
      :class="{ 'space-side__permission-icon--enabled': permission.enabled }"
      role="img"
      tabindex="0"
      :aria-label="`${permission.label}，${permission.enabled ? '可用' : '关闭'}`"
      :title="`${permission.label} · ${permission.enabled ? '可用' : '关闭'}`"
    >
      <Icon :name="permission.icon" size="19" />
      <span class="space-side__permission-badge" aria-hidden="true">
        <Icon :name="permission.enabled ? 'lucide:check' : 'lucide:lock-keyhole'" size="8" />
      </span>
      <span class="space-side__icon-tooltip" role="tooltip">
        {{ permission.label }} · {{ permission.enabled ? '可用' : '关闭' }}
      </span>
    </div>
  </div>
</section>
```

- [ ] **步骤 4：运行组件定向 Lint**

运行：

```powershell
npx eslint app/components/workspace/WsSpaceInsightSidebar.vue
```

预期：命令退出码为 `0`。

---

### 任务 2：实现 Icon Dock 视觉与交互状态

**Files:**
- Modify: `app/components/workspace/WsSpaceInsightSidebar.vue:471`

**Interfaces:**
- Consumes: 任务 1 新增的 class 名称。
- Produces: 三列/两列布局、空间色调、状态角标、Tooltip、焦点和减少动画样式。

- [ ] **步骤 1：删除旧文字按钮与权限列表样式**

移除不再使用的 `.space-side__actions`、`.space-side__action`、`.space-side__external`、`.space-side__permissions`、`.space-side__permission` 和 `.space-side__permission-state*` 规则，保留其他侧栏、图表和空状态样式不变。

- [ ] **步骤 2：增加图标网格与底座**

使用以下核心布局：

```css
.space-side__panel--icon-dock,
.space-side__panel--permission-dock {
  position: relative;
  overflow: visible;
}

.space-side__icon-dock {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  place-items: center;
  gap: 10px;
  padding: 14px;
}

.space-side__icon-dock--compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.space-side__icon-action,
.space-side__permission-icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-muted);
  color: var(--text-secondary);
}
```

操作入口补充 `cursor`、字体继承、无文字装饰和 `transform/background/border/color/box-shadow` 过渡。

- [ ] **步骤 3：实现主操作、空间色调与禁用态**

- 个人主操作使用 `var(--gradient-orange)`、`var(--btn-primary-text)` 与 `var(--shadow-glow-orange)`。
- 团队主操作覆盖为 `var(--secondary-soft)`、`var(--secondary-border)` 与 `var(--secondary)`。
- 普通操作悬浮时上移 `2px` 并使用当前空间的 soft/border/text 强调色。
- 禁用项设置 `opacity: 0.42`、`cursor: not-allowed`，禁止位移和光晕。
- `:focus-visible` 使用 `2px solid` 当前空间强调色，确保键盘焦点可见。

- [ ] **步骤 4：实现角标与 Tooltip**

角标放在右上角或右下角，使用 16px 圆形底座。权限可用角标使用对勾和团队紫色，不可用角标使用锁与弱化灰色。

Tooltip 采用绝对定位，默认 `opacity: 0; visibility: hidden; transform: translate(-50%, 4px)`；父项 hover 或 focus-visible 时显示。Tooltip 使用 `var(--bg-elevated)`、`var(--border-strong)`、`var(--shadow-md)` 和不换行文字，并设置 `pointer-events: none; z-index: 20`。

- [ ] **步骤 5：增加权限阵列和减少动画规则**

权限阵列使用四列等宽网格、12–14px 内边距。可用项使用团队色描边和柔和背景；关闭项使用弱化颜色和虚线边框。

在现有 `@media (prefers-reduced-motion: reduce)` 中加入 Icon Dock、权限图标和 Tooltip，关闭全部新过渡与位移。

- [ ] **步骤 6：运行组件定向 Lint 与构建**

运行：

```powershell
npx eslint app/components/workspace/WsSpaceInsightSidebar.vue
npm run build:dev
```

预期：两个命令退出码均为 `0`；Nuxt/Nitro 构建完成。

---

### 任务 3：执行视觉与交互验证

**Files:**
- Temporary create/delete: `app/pages/__icon-dock-preview.vue`
- Temporary modify/revert: `app/middleware/auth.global.ts`
- Verify: `app/components/workspace/WsSpaceInsightSidebar.vue`

**Interfaces:**
- Verifies: 个人五项操作、团队两项操作、四项权限、Tooltip 与无障碍状态。

- [ ] **步骤 1：创建临时无认证预览**

临时把 `/__icon-dock-preview` 加入 `PUBLIC_ROUTES`，并创建以下页面：

```vue
<script setup lang="ts">
definePageMeta({ layout: false })

const personalActions = [
  { key: 'upload', label: '上传脚本', icon: 'lucide:upload', primary: true },
  { key: 'guide', label: '查看上传规范', icon: 'lucide:book-open-check' },
  { key: 'marketplace', label: '前往脚本集市', icon: 'lucide:store', to: '/workspace/marketplace' },
  { key: 'teams', label: '切换团队空间', icon: 'lucide:users', to: '/workspace/teams' },
  { key: 'download', label: '下载 Autoforge', icon: 'lucide:download', to: 'https://example.com', external: true },
]

const teamActions = [
  { key: 'upload', label: '上传团队脚本', icon: 'lucide:upload', primary: true, disabled: true },
  { key: 'personal', label: '切换个人空间', icon: 'lucide:user', to: '/workspace/personal' },
]

const permissions = [
  { label: '上传', icon: 'lucide:upload', enabled: true },
  { label: '编辑', icon: 'lucide:pencil', enabled: true },
  { label: '下载', icon: 'lucide:download', enabled: false },
  { label: '删除', icon: 'lucide:trash-2', enabled: false },
]
</script>

<template>
  <main class="preview-page">
    <WorkspaceWsSpaceInsightSidebar
      tone="personal"
      title="个人脚本库"
      description="Icon Dock 预览"
      :stats="[]"
      :actions="personalActions"
      :filter-groups="[]"
    />
    <WorkspaceWsSpaceInsightSidebar
      tone="team"
      title="团队协作台"
      description="Icon Dock 预览"
      :stats="[]"
      :actions="teamActions"
      :filter-groups="[]"
      :permissions="permissions"
    />
  </main>
</template>

<style scoped>
.preview-page {
  display: grid;
  grid-template-columns: repeat(2, 280px);
  justify-content: center;
  gap: 32px;
  min-height: 100vh;
  padding: 48px;
  background: var(--bg);
}
</style>
```

- [ ] **步骤 2：验证可见结构与顺序**

在浏览器打开 `/__icon-dock-preview`，确认：

- 个人操作顺序为上传、规范、集市、团队、下载。
- 团队快捷操作为两列，上传禁用态与个人空间入口可区分。
- 快捷操作和权限面板无常驻文字标题、名称或状态标签。
- 四项权限为四列图标，并显示对勾/锁状态点。

- [ ] **步骤 3：验证交互与无障碍**

检查每个操作唯一 `aria-label`、权限状态 `aria-label`、Tooltip 悬浮/焦点显示、按钮禁用、外链角标和键盘焦点。确认图标点击仍触发原有按钮或路由行为。

- [ ] **步骤 4：清理临时预览**

删除 `app/pages/__icon-dock-preview.vue`，将 `PUBLIC_ROUTES` 恢复为仅包含 `/login`，停止临时预览进程并关闭浏览器测试页。

- [ ] **步骤 5：检查最终差异**

运行：

```powershell
git diff --check
git status --short
```

预期：没有临时预览文件或登录守卫改动；本次新增最终差异只有 `WsSpaceInsightSidebar.vue`、设计规格和实施计划。工作区中上一项饼图任务的未提交文件继续保留，不覆盖、不回退。

## 后续修订

- 快捷操作 section 增加 `v-if="tone === 'personal' && actions.length > 0"`，团队空间完全移除该模块。
- 移除操作与权限项的原生 `title`，Tooltip 改为 `bottom: calc(100% + 8px)`，悬浮/聚焦项使用 `z-index: 30`。
- 权限 section 恢复 `.space-side__section-head` 与“我的权限”标题，但权限内容仍保持纯图标阵列。
- 个人快捷操作 section 恢复 `.space-side__section-head` 与“快捷操作”标题，继续受个人空间条件控制。
