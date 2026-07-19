# 个人设置页 GitHub 式重构实施计划

> **For agentic workers:** 在当前会话内按任务顺序执行，并在每个任务结束后运行对应检查。步骤使用复选框跟踪。

**目标：** 将 `/workspace/profile` 重构为保留 AutoforgeHub 品牌的 GitHub Settings 式单页设置界面。

**架构：** 保留现有 Nuxt 页面、认证组合式函数、头像裁剪弹窗和后端 API。页面新增本地导航状态与滚动同步，模板改为账户摘要、吸顶导航和两个设置区块，样式通过现有设计令牌实现深浅主题与响应式布局。

**技术栈：** Nuxt 4、Vue 3 Composition API、TypeScript、Scoped CSS、Nuxt Icon。

## 全局约束

- 只修改前端设置页和设计文档，不修改数据库、认证接口或路由。
- 只展示现有字段：显示名称、邮箱、头像和密码。
- 保留 `WorkspaceWsHeader`、`WorkspaceAvatarCropModal` 与现有 API 调用。
- 保留 AutoforgeHub 橙色强调色、深浅主题变量和品牌字体。
- 桌面端使用左侧吸顶导航，窄屏使用横向分段导航。

---

### 任务 1：设置导航与状态同步

**文件：**

- 修改：`app/pages/workspace/profile.vue:6`

**接口：**

- 使用：`useAuth().updateUser(partial)`、`PUT /api/auth/profile`
- 产生：`activeSection`、`profileSection`、`securitySection`、`scrollToSection(section)`

- [ ] **步骤 1：定义设置区块状态和引用**

```ts
type SettingsSection = 'profile' | 'security'

const activeSection = ref<SettingsSection>('profile')
const profileSection = ref<HTMLElement | null>(null)
const securitySection = ref<HTMLElement | null>(null)
let sectionObserver: IntersectionObserver | null = null

const settingsSections = [
  { id: 'profile' as const, label: '公开资料', icon: 'lucide:user-round' },
  { id: 'security' as const, label: '密码与安全', icon: 'lucide:shield-check' },
]
```

- [ ] **步骤 2：实现锚点滚动**

```ts
function scrollToSection(section: SettingsSection) {
  activeSection.value = section
  const target = section === 'profile' ? profileSection.value : securitySection.value
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
```

- [ ] **步骤 3：在挂载和卸载生命周期中同步高亮**

在现有 `onMounted` 中创建 `IntersectionObserver`，使用 `rootMargin: '-120px 0px -60% 0px'`，区块进入视口时更新 `activeSection`；在 `onBeforeUnmount` 中调用 `sectionObserver?.disconnect()`。无 `IntersectionObserver` 环境下仍允许点击导航。

- [ ] **步骤 4：资料保存成功后同步全局用户**

```ts
const nextDisplayName = data.displayName || displayName.value.trim()
displayName.value = nextDisplayName
updateUser({ displayName: nextDisplayName })
message.value = '个人资料已保存'
```

- [ ] **步骤 5：运行脚本级静态检查**

运行：`npx eslint app/pages/workspace/profile.vue`

预期：命令退出码为 `0`；此时模板引用尚未加入时，允许仅记录未使用变量并在任务 2 消除。

---

### 任务 2：重建页面语义结构

**文件：**

- 修改：`app/pages/workspace/profile.vue:133`

**接口：**

- 使用：任务 1 的 `settingsSections`、`activeSection`、区块引用和 `scrollToSection`
- 保留：`saveProfile()`、`savePassword()`、`selectAvatarFile()` 与裁剪弹窗事件

- [ ] **步骤 1：建立设置主体**

在工作区顶栏后创建 `<main class="profile-settings">`，保留返回工作区链接，直接进入设置双栏主体；页面不额外展示重复的账户摘要。

- [ ] **步骤 2：加入可访问的设置导航**

```vue
<nav class="settings-nav" aria-label="个人设置">
  <button
    v-for="section in settingsSections"
    :key="section.id"
    type="button"
    class="settings-nav__item"
    :class="{ 'settings-nav__item--active': activeSection === section.id }"
    :aria-current="activeSection === section.id ? 'page' : undefined"
    @click="scrollToSection(section.id)"
  >
    <Icon :name="section.icon" size="16" />
    <span>{{ section.label }}</span>
  </button>
</nav>
```

- [ ] **步骤 3：重排公开资料区**

创建 `id="profile-settings-profile"`、`ref="profileSection"` 的 `<section>`。区块标题下使用 `profile-editor` 双栏：表单包含显示名称、只读邮箱、说明文案、反馈和内容宽度保存按钮；头像栏包含标题、128px 头像和覆盖式“编辑”文件标签。

- [ ] **步骤 4：重排密码与安全区**

创建 `id="profile-settings-security"`、`ref="securitySection"` 的 `<section>`。保留三个密码字段，在新密码下加入“至少 8 位字符”的提示，并使用内容宽度更新按钮。

- [ ] **步骤 5：补齐表单语义**

为输入框配置稳定 `id` 与对应 `for`；只读邮箱增加说明；成功反馈设置 `role="status"`，错误反馈设置 `role="alert"`；头像编辑入口增加可见“编辑”文字；加载图标增加 `aria-hidden="true"`。

- [ ] **步骤 6：运行模板静态检查**

运行：`npx eslint app/pages/workspace/profile.vue`

预期：退出码为 `0`，无 Vue 模板和 TypeScript 错误。

---

### 任务 3：实现品牌化 GitHub Settings 样式

**文件：**

- 修改：`app/pages/workspace/profile.vue:212`

**接口：**

- 使用：`app/assets/css/main.css` 中现有颜色、字体、圆角、阴影和字号变量
- 产生：桌面、平板和移动端稳定布局

- [ ] **步骤 1：建立页面与账户摘要布局**

主体设置 `max-width: 1120px`、桌面内边距 `36px 24px 88px`。账户摘要使用底部分隔线和紧凑的 48px 头像，不使用独立大卡片。

- [ ] **步骤 2：建立设置双栏与吸顶导航**

`.profile-settings__layout` 使用 `grid-template-columns: 240px minmax(0, 1fr)` 和 `gap: 48px`；`.settings-nav` 使用 `position: sticky; top: 84px`。激活项以左侧 3px 橙色标记、柔和背景和高对比文本表现。

- [ ] **步骤 3：建立表单与头像布局**

设置区块使用细分隔线和 `scroll-margin-top: 88px`；公开资料内部使用 `minmax(0, 1fr) 180px` 两栏。输入框最大宽度 `560px`，按钮保持内容宽度，头像为 128px 圆形并使用“编辑”覆盖按钮。

- [ ] **步骤 4：加入反馈、焦点和禁用状态**

输入框与按钮使用 `:focus-visible` 显示明确焦点环；成功/错误反馈使用现有 `--accent-*`、`--danger-*` 变量；禁用态保持文字可读且阻止交互。

- [ ] **步骤 5：加入响应式规则**

在 `900px` 以下改为单栏，导航成为顶部横向布局，公开资料头像移到表单前；在 `640px` 以下将页面内边距改为 `24px 16px 64px`，表单按钮允许全宽。避免任何横向滚动。

- [ ] **步骤 6：尊重减少动态效果偏好**

在 `@media (prefers-reduced-motion: reduce)` 中移除平滑滚动相关过渡和旋转以外的装饰性动画；加载旋转仍用于表达进行中状态。

- [ ] **步骤 7：运行样式与模板检查**

运行：`npx eslint app/pages/workspace/profile.vue`

预期：退出码为 `0`。

---

### 任务 4：构建与视觉验收

**文件：**

- 验证：`app/pages/workspace/profile.vue`
- 对照：`docs/superpowers/specs/2026-07-19-profile-settings-redesign-design.md`

- [ ] **步骤 1：运行差异检查**

运行：`git diff --check`

预期：无空白字符错误。

- [ ] **步骤 2：运行生产构建**

运行：`npm run build:prod`

预期：Nuxt 构建成功，退出码为 `0`。

- [ ] **步骤 3：桌面端验收**

在约 `1440px` 宽度验证：账户摘要完整、左侧导航吸顶、公开资料为表单与头像双栏、两个导航项能正确滚动和高亮。

- [ ] **步骤 4：窄屏验收**

在约 `768px` 与 `390px` 宽度验证：导航横向排列、头像位于公开资料表单前、按钮和输入框不溢出、页面无横向滚动。

- [ ] **步骤 5：主题与功能验收**

分别在深色和浅色主题验证文本、边框、焦点和反馈对比度；手动验证名称保存后顶栏同步、头像裁剪上传、密码本地校验和服务端反馈。
