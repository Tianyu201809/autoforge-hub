<script setup lang="ts">
type SidebarTone = "personal" | "team"
type FilterKind = "category" | "language"

type SidebarStat = {
  label: string
  value: string | number
  icon: string
  hint?: string
}

type SidebarAction = {
  key: string
  label: string
  icon: string
  to?: string
  external?: boolean
  primary?: boolean
  disabled?: boolean
}

type SidebarFilterItem = {
  label: string
  value: string
  count: number
  active?: boolean
}

type SidebarFilterGroup = {
  key: FilterKind
  title: string
  icon: string
  items: SidebarFilterItem[]
}

type SidebarPermission = {
  label: string
  icon: string
  enabled: boolean
}

const props = withDefaults(defineProps<{
  tone?: SidebarTone
  title: string
  description: string
  stats: SidebarStat[]
  actions: SidebarAction[]
  filterGroups: SidebarFilterGroup[]
  permissions?: SidebarPermission[]
}>(), {
  tone: "personal",
  permissions: () => []
})

const emit = defineEmits<{
  action: [key: string]
  filter: [payload: { kind: FilterKind; value: string }]
}>()

const hasFilters = computed(() => props.filterGroups.some(group => group.items.length > 0))
</script>

<template>
  <aside class="space-side" :class="`space-side--${tone}`" aria-label="空间洞察">
    <section class="space-side__panel space-side__panel--hero">
      <div class="space-side__eyebrow">
        <Icon :name="tone === 'team' ? 'lucide:users' : 'lucide:user-round'" size="14" />
        空间概览
      </div>
      <h2 class="space-side__title">{{ title }}</h2>
      <p class="space-side__desc">{{ description }}</p>

      <div class="space-side__stats">
        <div v-for="stat in stats" :key="stat.label" class="space-side__stat">
          <div class="space-side__stat-icon">
            <Icon :name="stat.icon" size="15" />
          </div>
          <div class="space-side__stat-body">
            <span class="space-side__stat-value">{{ stat.value }}</span>
            <span class="space-side__stat-label">{{ stat.label }}</span>
            <span v-if="stat.hint" class="space-side__stat-hint">{{ stat.hint }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="space-side__panel">
      <div class="space-side__section-head">
        <h3 class="space-side__section-title">
          <Icon name="lucide:zap" size="14" />
          快捷操作
        </h3>
      </div>

      <div class="space-side__actions">
        <NuxtLink
          v-for="action in actions.filter(item => item.to && !item.external)"
          :key="action.key"
          :to="action.to"
          class="space-side__action"
          :class="{ 'space-side__action--primary': action.primary, 'space-side__action--disabled': action.disabled }"
          :aria-disabled="action.disabled"
        >
          <Icon :name="action.icon" size="15" />
          <span>{{ action.label }}</span>
        </NuxtLink>

        <a
          v-for="action in actions.filter(item => item.to && item.external)"
          :key="action.key"
          :href="action.to"
          target="_blank"
          rel="noopener noreferrer"
          class="space-side__action"
          :class="{ 'space-side__action--primary': action.primary, 'space-side__action--disabled': action.disabled }"
          :aria-disabled="action.disabled"
        >
          <Icon :name="action.icon" size="15" />
          <span>{{ action.label }}</span>
          <Icon name="lucide:external-link" size="12" class="space-side__external" />
        </a>

        <button
          v-for="action in actions.filter(item => !item.to)"
          :key="action.key"
          type="button"
          class="space-side__action"
          :class="{ 'space-side__action--primary': action.primary }"
          :disabled="action.disabled"
          @click="emit('action', action.key)"
        >
          <Icon :name="action.icon" size="15" />
          <span>{{ action.label }}</span>
        </button>
      </div>
    </section>

    <section class="space-side__panel">
      <div class="space-side__section-head">
        <h3 class="space-side__section-title">
          <Icon name="lucide:chart-no-axes-column" size="14" />
          脚本分布
        </h3>
      </div>

      <div v-if="hasFilters" class="space-side__filter-groups">
        <div v-for="group in filterGroups" :key="group.key" class="space-side__filter-group">
          <div v-if="group.items.length > 0" class="space-side__filter-title">
            <Icon :name="group.icon" size="13" />
            {{ group.title }}
          </div>
          <button
            v-for="item in group.items"
            :key="`${group.key}-${item.value}`"
            type="button"
            class="space-side__filter"
            :class="{ 'space-side__filter--active': item.active }"
            @click="emit('filter', { kind: group.key, value: item.value })"
          >
            <span>{{ item.label }}</span>
            <span class="space-side__filter-count">{{ item.count }}</span>
          </button>
        </div>
      </div>
      <p v-else class="space-side__empty">上传脚本后会展示分类和语言分布</p>
    </section>

    <section v-if="permissions.length > 0" class="space-side__panel">
      <div class="space-side__section-head">
        <h3 class="space-side__section-title">
          <Icon name="lucide:shield-check" size="14" />
          我的权限
        </h3>
      </div>
      <div class="space-side__permissions">
        <div v-for="permission in permissions" :key="permission.label" class="space-side__permission">
          <Icon :name="permission.icon" size="14" />
          <span>{{ permission.label }}</span>
          <span
            class="space-side__permission-state"
            :class="{ 'space-side__permission-state--on': permission.enabled }"
          >
            {{ permission.enabled ? '可用' : '关闭' }}
          </span>
        </div>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.space-side {
  position: sticky;
  top: 96px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.space-side__panel {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-elevated) 88%, transparent), var(--bg-elevated));
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.space-side__panel--hero {
  padding: 16px;
}

.space-side__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  color: var(--accent);
  font-size: var(--text-xs);
  font-weight: 800;
}

.space-side--team .space-side__eyebrow {
  color: var(--secondary);
}

.space-side__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--text);
}

.space-side__desc {
  margin: 6px 0 14px;
  font-size: var(--text-xs);
  line-height: var(--leading-snug);
  color: var(--text-muted);
}

.space-side__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.space-side__stat {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}

.space-side__stat-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent);
}

.space-side--team .space-side__stat-icon {
  background: var(--secondary-soft);
  color: var(--secondary);
}

.space-side__stat-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.space-side__stat-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-base);
  font-weight: 800;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.space-side__stat-label,
.space-side__stat-hint {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.space-side__section-head {
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--border);
}

.space-side__section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--text);
}

.space-side__actions,
.space-side__filter-groups,
.space-side__permissions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px 14px;
}

.space-side__action,
.space-side__filter,
.space-side__permission {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: var(--text-sm);
}

.space-side__action {
  justify-content: flex-start;
  min-height: 36px;
  padding: 8px 11px;
  border: 1px solid var(--border);
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-weight: 700;
  text-decoration: none;
  transition: border-color 0.15s, color 0.15s, background 0.15s, transform 0.15s;
}

.space-side__action:hover:not(:disabled):not(.space-side__action--disabled) {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);
  transform: translateY(-1px);
}

.space-side__action--primary {
  border-color: var(--accent-border);
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
}

.space-side__action--primary:hover:not(:disabled) {
  color: var(--btn-primary-text);
}

.space-side__action--disabled,
.space-side__action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.space-side__external {
  margin-left: auto;
  opacity: 0.7;
}

.space-side__filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.space-side__filter-group + .space-side__filter-group {
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.space-side__filter-title {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 2px;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-muted);
}

.space-side__filter {
  justify-content: space-between;
  padding: 7px 9px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  text-align: left;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.space-side__filter:hover,
.space-side__filter--active {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);
}

.space-side__filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.space-side__permission {
  padding: 8px 9px;
  background: var(--bg-muted);
  color: var(--text-secondary);
}

.space-side__permission-state {
  margin-left: auto;
  padding: 2px 7px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 800;
}

.space-side__permission-state--on {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);
}

.space-side__empty {
  margin: 0;
  padding: 14px;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

@media (max-width: 1100px) {
  .space-side {
    position: static;
  }
}
</style>
