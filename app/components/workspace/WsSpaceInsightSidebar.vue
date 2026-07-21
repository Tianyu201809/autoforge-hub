<script setup lang="ts">
import { SCRIPT_CATEGORIES, SCRIPT_LANGUAGES } from "~/types/workspace"

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
const activeKind = shallowRef<FilterKind>("category")
const highlightedValue = shallowRef("")
const chartRadius = 54
const chartCircumference = 2 * Math.PI * chartRadius
const chartColors = [
  "var(--accent)",
  "var(--secondary)",
  "#0ea5e9",
  "#22c55e",
  "#eab308",
  "#ec4899",
  "#14b8a6",
  "#8b5cf6",
  "#f43f5e",
  "#84cc16",
  "#06b6d4",
  "#f97316",
] as const
const chartColorOrder = [...SCRIPT_CATEGORIES, ...SCRIPT_LANGUAGES]

const activeGroup = computed(() => (
  props.filterGroups.find(group => group.key === activeKind.value)
  || props.filterGroups[0]
))

const chartTotal = computed(() => (
  activeGroup.value?.items.reduce((sum, item) => sum + item.count, 0) || 0
))

function getSegmentColor(value: string, fallbackIndex: number) {
  const knownIndex = chartColorOrder.indexOf(value as (typeof chartColorOrder)[number])
  const colorIndex = knownIndex >= 0 ? knownIndex : fallbackIndex
  return chartColors[colorIndex % chartColors.length] || "var(--accent)"
}

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

const selectedValue = computed(() => (
  activeGroup.value?.items.find(item => item.active)?.value || ""
))

const highlightedSegment = computed(() => {
  const value = highlightedValue.value || selectedValue.value
  return chartSegments.value.find(segment => segment.value === value)
})

const chartAriaLabel = computed(() => {
  const title = activeGroup.value?.title || "脚本"
  const details = chartSegments.value
    .filter(segment => segment.count > 0)
    .map(segment => `${segment.label} ${segment.count} 个，占 ${segment.percentage}%`)
    .join("；")
  return `${title}分布，共 ${chartTotal.value} 个脚本${details ? `：${details}` : ""}`
})

function setActiveKind(kind: FilterKind) {
  activeKind.value = kind
  highlightedValue.value = ""
}

function selectSegment(item: SidebarFilterItem) {
  if (!activeGroup.value) return
  emit("filter", { kind: activeGroup.value.key, value: item.value })
}

function preventDisabledNavigation(event: MouseEvent, disabled?: boolean) {
  if (disabled) event.preventDefault()
}
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

    <section
      v-if="tone === 'personal' && actions.length > 0"
      class="space-side__panel space-side__panel--icon-dock"
      aria-label="快捷操作"
    >
      <div class="space-side__section-head">
        <h3 class="space-side__section-title">
          <Icon name="lucide:zap" size="14" />
          快捷操作
        </h3>
      </div>
      <div
        class="space-side__icon-dock"
        :class="{ 'space-side__icon-dock--compact': actions.length <= 2 }"
      >
        <template v-for="action in actions" :key="action.key">
          <NuxtLink
            v-if="action.to && !action.external"
            :to="action.to"
            class="space-side__icon-action"
            :class="{
              'space-side__icon-action--primary': action.primary,
              'space-side__icon-action--disabled': action.disabled,
            }"
            :aria-label="action.label"
            :aria-disabled="action.disabled || undefined"
            :tabindex="action.disabled ? -1 : undefined"
            @click="preventDisabledNavigation($event, action.disabled)"
          >
            <Icon :name="action.icon" size="20" />
            <span v-if="action.disabled" class="space-side__icon-badge" aria-hidden="true">
              <Icon name="lucide:lock-keyhole" size="9" />
            </span>
            <span class="space-side__icon-tooltip" aria-hidden="true">{{ action.label }}</span>
          </NuxtLink>

          <a
            v-else-if="action.to && action.external"
            :href="action.to"
            target="_blank"
            rel="noopener noreferrer"
            class="space-side__icon-action"
            :class="{
              'space-side__icon-action--primary': action.primary,
              'space-side__icon-action--disabled': action.disabled,
            }"
            :aria-label="action.label"
            :aria-disabled="action.disabled || undefined"
            :tabindex="action.disabled ? -1 : undefined"
            @click="preventDisabledNavigation($event, action.disabled)"
          >
            <Icon :name="action.icon" size="20" />
            <span class="space-side__icon-badge" aria-hidden="true">
              <Icon :name="action.disabled ? 'lucide:lock-keyhole' : 'lucide:external-link'" size="9" />
            </span>
            <span class="space-side__icon-tooltip" aria-hidden="true">{{ action.label }}</span>
          </a>

          <button
            v-else
            type="button"
            class="space-side__icon-action"
            :class="{
              'space-side__icon-action--primary': action.primary,
              'space-side__icon-action--disabled': action.disabled,
            }"
            :disabled="action.disabled"
            :aria-label="action.label"
            @click="emit('action', action.key)"
          >
            <Icon :name="action.icon" size="20" />
            <span v-if="action.disabled" class="space-side__icon-badge" aria-hidden="true">
              <Icon name="lucide:lock-keyhole" size="9" />
            </span>
            <span class="space-side__icon-tooltip" aria-hidden="true">{{ action.label }}</span>
          </button>
        </template>
      </div>
    </section>

    <section class="space-side__panel">
      <div class="space-side__section-head">
        <h3 class="space-side__section-title">
          <Icon name="lucide:chart-no-axes-column" size="14" />
          脚本分布
        </h3>
      </div>

      <div v-if="hasFilters" class="space-side__chart">
        <div class="space-side__chart-tabs" role="tablist" aria-label="脚本分布维度">
          <button
            v-for="group in filterGroups"
            :key="group.key"
            type="button"
            role="tab"
            class="space-side__chart-tab"
            :class="{ 'space-side__chart-tab--active': activeGroup?.key === group.key }"
            :aria-selected="activeGroup?.key === group.key"
            @click="setActiveKind(group.key)"
          >
            <Icon :name="group.icon" size="13" />
            {{ group.title }}
          </button>
        </div>

        <div v-if="chartTotal > 0" class="space-side__chart-wrap">
          <svg
            class="space-side__chart-svg"
            viewBox="0 0 160 160"
            role="img"
            :aria-label="chartAriaLabel"
          >
            <circle class="space-side__chart-track" cx="80" cy="80" :r="chartRadius" />
            <circle
              v-for="segment in chartSegments"
              :key="`${activeGroup?.key}-${segment.value}`"
              class="space-side__chart-segment"
              :class="{
                'space-side__chart-segment--active': segment.active,
                'space-side__chart-segment--muted': highlightedSegment && highlightedSegment.value !== segment.value,
              }"
              cx="80"
              cy="80"
              :r="chartRadius"
              :stroke="segment.color"
              :stroke-dasharray="segment.dasharray"
              :stroke-dashoffset="segment.dashoffset"
              role="button"
              tabindex="0"
              :aria-pressed="segment.active"
              :aria-label="`${segment.label}，${segment.count} 个，占 ${segment.percentage}%${segment.active ? '，已筛选' : ''}`"
              @click="selectSegment(segment)"
              @keydown.enter.prevent="selectSegment(segment)"
              @keydown.space.prevent="selectSegment(segment)"
              @mouseenter="highlightedValue = segment.value"
              @mouseleave="highlightedValue = ''"
              @focus="highlightedValue = segment.value"
              @blur="highlightedValue = ''"
            >
              <title>{{ segment.label }}：{{ segment.count }} 个（{{ segment.percentage }}%）</title>
            </circle>
          </svg>

          <div class="space-side__chart-center" aria-hidden="true">
            <template v-if="highlightedSegment">
              <strong class="space-side__chart-center-label">{{ highlightedSegment.label }}</strong>
              <span>{{ highlightedSegment.count }} 个 · {{ highlightedSegment.percentage }}%</span>
            </template>
            <template v-else>
              <strong>{{ chartTotal }}</strong>
              <span>脚本</span>
            </template>
          </div>
        </div>

        <p v-else class="space-side__chart-empty">当前{{ activeGroup?.title || '维度' }}暂无数据</p>

        <div v-if="chartSegments.length > 0" class="space-side__chart-legend" aria-label="图表图例">
          <button
            v-for="segment in chartSegments"
            :key="`legend-${activeGroup?.key}-${segment.value}`"
            type="button"
            class="space-side__legend-item"
            :class="{
              'space-side__legend-item--active': segment.active,
              'space-side__legend-item--muted': highlightedSegment && highlightedSegment.value !== segment.value,
            }"
            :aria-pressed="segment.active"
            @click="selectSegment(segment)"
            @mouseenter="highlightedValue = segment.value"
            @mouseleave="highlightedValue = ''"
            @focus="highlightedValue = segment.value"
            @blur="highlightedValue = ''"
          >
            <span class="space-side__legend-dot" :style="{ backgroundColor: segment.color }" aria-hidden="true" />
            <span class="space-side__legend-label">{{ segment.label }}</span>
            <span class="space-side__legend-value">{{ segment.count }}</span>
            <span class="space-side__legend-percent">{{ segment.percentage }}%</span>
          </button>
        </div>
      </div>
      <p v-else class="space-side__empty">上传脚本后会展示分类和语言分布</p>
    </section>

    <section
      v-if="permissions.length > 0"
      class="space-side__panel space-side__panel--permission-dock"
      aria-label="我的权限"
    >
      <div class="space-side__section-head">
        <h3 class="space-side__section-title">
          <Icon name="lucide:shield-check" size="14" />
          我的权限
        </h3>
      </div>
      <div class="space-side__permission-dock">
        <div
          v-for="permission in permissions"
          :key="permission.label"
          class="space-side__permission-icon"
          :class="{ 'space-side__permission-icon--enabled': permission.enabled }"
          role="img"
          tabindex="0"
          :aria-label="`${permission.label}，${permission.enabled ? '可用' : '关闭'}`"
        >
          <Icon :name="permission.icon" size="19" />
          <span class="space-side__permission-badge" aria-hidden="true">
            <Icon :name="permission.enabled ? 'lucide:check' : 'lucide:lock-keyhole'" size="8" />
          </span>
          <span class="space-side__icon-tooltip" aria-hidden="true">
            {{ permission.label }} · {{ permission.enabled ? '可用' : '关闭' }}
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

.space-side__panel--icon-dock,
.space-side__panel--permission-dock {
  position: relative;
  overflow: visible;
}

.space-side__panel--icon-dock {
  background:
    radial-gradient(circle at 12% 18%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 38%),
    var(--bg-elevated);
}

.space-side--team .space-side__panel--icon-dock,
.space-side--team .space-side__panel--permission-dock {
  background:
    radial-gradient(circle at 12% 18%, color-mix(in srgb, var(--secondary) 13%, transparent), transparent 40%),
    var(--bg-elevated);
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
  box-sizing: border-box;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-muted);
  color: var(--text-secondary);
}

.space-side__icon-action {
  padding: 0;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text) 5%, transparent);
  transition: transform 0.18s, border-color 0.18s, background 0.18s, color 0.18s, box-shadow 0.18s;
}

.space-side__icon-action:hover:not(:disabled):not(.space-side__icon-action--disabled) {
  z-index: 30;
  border-color: var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);
  box-shadow: var(--shadow-sm), inset 0 1px 0 color-mix(in srgb, var(--accent) 16%, transparent);
  transform: translateY(-2px);
}

.space-side--team .space-side__icon-action:hover:not(:disabled):not(.space-side__icon-action--disabled) {
  border-color: var(--secondary-border);
  background: var(--secondary-soft);
  color: var(--secondary);
}

.space-side__icon-action--primary {
  border-color: var(--accent-border);
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
}

.space-side__icon-action--primary:hover:not(:disabled):not(.space-side__icon-action--disabled) {
  border-color: var(--accent-hover);
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange), 0 8px 20px color-mix(in srgb, var(--accent) 18%, transparent);
}

.space-side--team .space-side__icon-action--primary {
  border-color: var(--secondary-border);
  background: color-mix(in srgb, var(--secondary) 16%, var(--bg-elevated));
  color: var(--secondary);
  box-shadow: var(--shadow-glow-purple);
}

.space-side--team .space-side__icon-action--primary:hover:not(:disabled):not(.space-side__icon-action--disabled) {
  border-color: var(--secondary);
  background: color-mix(in srgb, var(--secondary) 22%, var(--bg-elevated));
  color: var(--secondary);
  box-shadow: var(--shadow-glow-purple), 0 8px 20px color-mix(in srgb, var(--secondary) 18%, transparent);
}

.space-side__icon-action--disabled,
.space-side__icon-action:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  box-shadow: none;
}

.space-side__icon-action--disabled:hover,
.space-side__icon-action:disabled:hover {
  transform: none;
}

.space-side__icon-action:focus-visible,
.space-side__permission-icon:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.space-side--team .space-side__icon-action:focus-visible,
.space-side--team .space-side__permission-icon:focus-visible {
  outline-color: var(--secondary);
}

.space-side__icon-badge,
.space-side__permission-badge {
  position: absolute;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  box-sizing: border-box;
  border: 2px solid var(--bg-elevated);
  border-radius: 50%;
  background: var(--bg-muted);
  color: var(--text-muted);
  box-shadow: var(--shadow-sm);
}

.space-side__icon-badge {
  top: -5px;
  right: -5px;
}

.space-side__icon-action--primary .space-side__icon-badge {
  background: var(--bg-elevated);
  color: var(--accent);
}

.space-side--team .space-side__icon-action--primary .space-side__icon-badge {
  color: var(--secondary);
}

.space-side__icon-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  z-index: 20;
  visibility: hidden;
  width: max-content;
  max-width: 180px;
  padding: 5px 8px;
  border: 1px solid var(--border-strong);
  border-radius: 7px;
  background: var(--bg-elevated);
  color: var(--text);
  box-shadow: var(--shadow-md);
  opacity: 0;
  font-size: var(--text-xs);
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
  transform: translate(-50%, 4px);
  transition: opacity 0.14s, visibility 0.14s, transform 0.14s;
}

.space-side__icon-action:hover .space-side__icon-tooltip,
.space-side__icon-action:focus-visible .space-side__icon-tooltip,
.space-side__permission-icon:hover .space-side__icon-tooltip,
.space-side__permission-icon:focus-visible .space-side__icon-tooltip {
  visibility: visible;
  opacity: 1;
  transform: translate(-50%, 0);
}

.space-side__icon-action:focus-visible,
.space-side__permission-icon:hover,
.space-side__permission-icon:focus-visible {
  z-index: 30;
}

.space-side__chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px 14px;
}

.space-side__chart-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}

.space-side__chart-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 30px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 800;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.space-side__chart-tab:hover {
  color: var(--text-secondary);
}

.space-side__chart-tab--active {
  border-color: var(--accent-border);
  background: var(--bg-elevated);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.space-side--team .space-side__chart-tab--active {
  border-color: var(--secondary-border);
  color: var(--secondary);
}

.space-side__chart-tab:focus-visible,
.space-side__chart-segment:focus-visible,
.space-side__legend-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.space-side__chart-wrap {
  position: relative;
  width: min(176px, 100%);
  aspect-ratio: 1;
  margin: 0 auto;
}

.space-side__chart-svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  transform: rotate(-90deg);
}

.space-side__chart-track,
.space-side__chart-segment {
  fill: none;
  stroke-width: 18;
}

.space-side__chart-track {
  stroke: var(--border-strong);
}

.space-side__chart-segment {
  cursor: pointer;
  transition: opacity 0.2s, stroke-width 0.2s, filter 0.2s;
}

.space-side__chart-segment:hover,
.space-side__chart-segment:focus-visible,
.space-side__chart-segment--active {
  stroke-width: 22;
  filter: brightness(1.12);
}

.space-side__chart-segment--muted {
  opacity: 0.28;
}

.space-side__chart-center {
  position: absolute;
  inset: 31%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  min-width: 0;
  color: var(--text);
  text-align: center;
  pointer-events: none;
}

.space-side__chart-center strong {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-xl);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.space-side__chart-center .space-side__chart-center-label {
  font-size: var(--text-sm);
}

.space-side__chart-center span {
  margin-top: 2px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.space-side__chart-empty {
  margin: 4px 0;
  padding: 18px 10px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-align: center;
}

.space-side__chart-legend {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.space-side__legend-item {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto 34px;
  align-items: center;
  gap: 7px;
  width: 100%;
  min-height: 30px;
  padding: 5px 7px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: var(--text-xs);
  text-align: left;
  cursor: pointer;
  transition: opacity 0.18s, border-color 0.18s, background 0.18s, transform 0.18s;
}

.space-side__legend-item:hover,
.space-side__legend-item--active {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  transform: translateX(2px);
}

.space-side--team .space-side__legend-item:hover,
.space-side--team .space-side__legend-item--active {
  border-color: var(--secondary-border);
  background: var(--secondary-soft);
}

.space-side__legend-item--muted {
  opacity: 0.38;
}

.space-side__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 8%, transparent);
}

.space-side__legend-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
}

.space-side__legend-value,
.space-side__legend-percent {
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.space-side__legend-value {
  font-weight: 800;
  color: var(--text-secondary);
}

.space-side__permission-dock {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  place-items: center;
  gap: 8px;
  padding: 14px 12px;
}

.space-side__permission-icon {
  width: 42px;
  height: 42px;
  border-style: dashed;
  color: var(--text-muted);
  outline: none;
  transition: border-color 0.18s, background 0.18s, color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.space-side__permission-icon:hover,
.space-side__permission-icon:focus-visible {
  border-color: var(--border-strong);
  color: var(--text-secondary);
  transform: translateY(-1px);
}

.space-side__permission-icon--enabled {
  border-style: solid;
  border-color: var(--secondary-border);
  background: var(--secondary-soft);
  color: var(--secondary);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--secondary) 12%, transparent);
}

.space-side__permission-icon--enabled:hover,
.space-side__permission-icon--enabled:focus-visible {
  border-color: var(--secondary);
  color: var(--secondary);
  box-shadow: var(--shadow-glow-purple);
}

.space-side__permission-badge {
  right: -5px;
  bottom: -5px;
}

.space-side__permission-icon--enabled .space-side__permission-badge {
  border-color: var(--bg-elevated);
  background: var(--secondary);
  color: var(--bg-elevated);
}

.space-side__empty {
  margin: 0;
  padding: 14px;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

@media (prefers-reduced-motion: reduce) {
  .space-side__chart-tab,
  .space-side__chart-segment,
  .space-side__legend-item,
  .space-side__icon-action,
  .space-side__permission-icon,
  .space-side__icon-tooltip {
    transition: none;
  }

  .space-side__icon-action:hover,
  .space-side__permission-icon:hover {
    transform: none;
  }
}

@media (max-width: 1100px) {
  .space-side {
    position: static;
  }
}
</style>
