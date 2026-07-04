<script setup lang="ts">
import { HUB_INTEGRATION_FILTERS, HUB_TYPE_FILTERS } from '~/data/hub-items'
import type { HubItemType } from '~/types/hub'

const selectedType = defineModel<HubItemType | 'all'>('selectedType', { required: true })
const selectedIntegration = defineModel<string>('selectedIntegration', { required: true })

const emit = defineEmits<{
  reset: []
}>()

const showAllIntegrations = ref(false)
const visibleIntegrations = computed(() =>
  showAllIntegrations.value
    ? HUB_INTEGRATION_FILTERS
    : HUB_INTEGRATION_FILTERS.slice(0, 8)
)
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__section">
      <div class="sidebar__head">
        <h2 class="sidebar__title">筛选</h2>
        <button type="button" class="sidebar__reset" @click="emit('reset')">
          重置
        </button>
      </div>

      <div class="filter-group">
        <h3 class="filter-group__label">类型</h3>
        <ul class="filter-list">
          <li v-for="filter in HUB_TYPE_FILTERS" :key="filter.id">
            <button
              type="button"
              class="filter-item"
              :class="{ 'filter-item--active': selectedType === filter.id }"
              @click="selectedType = filter.id"
            >
              <Icon :name="filter.icon" size="16" class="filter-item__icon hub-icon" />
              <span>{{ filter.label }}</span>
            </button>
          </li>
        </ul>
      </div>

      <div class="filter-group">
        <h3 class="filter-group__label">集成</h3>
        <ul class="filter-list">
          <li v-for="filter in visibleIntegrations" :key="filter.id">
            <button
              type="button"
              class="filter-item filter-item--compact"
              :class="{ 'filter-item--active': selectedIntegration === filter.id }"
              @click="selectedIntegration = filter.id"
            >
              <span>{{ filter.label }}</span>
            </button>
          </li>
        </ul>
        <button
          v-if="HUB_INTEGRATION_FILTERS.length > 8"
          type="button"
          class="browse-all"
          @click="showAllIntegrations = !showAllIntegrations"
        >
          {{ showAllIntegrations ? '收起' : `浏览全部 (${HUB_INTEGRATION_FILTERS.length - 1})` }}
          <Icon
            :name="showAllIntegrations ? 'lucide:chevron-up' : 'lucide:chevron-down'"
            size="15"
          />
        </button>
      </div>
    </div>

    <div class="sidebar__footer">
      <button type="button" class="suggest-btn">
        <Icon name="lucide:plus-circle" size="16" class="hub-icon--accent" />
        建议新集成
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  min-height: calc(100vh - var(--header-height));
  padding: 18px 14px;
  border-right: 1px solid var(--border);
  background: var(--bg-purple);
}

.sidebar__section {
  flex: 1;
}

.sidebar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.sidebar__title {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.sidebar__reset {
  padding: 3px 7px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--accent);
}

.sidebar__reset:hover {
  background: var(--accent-soft);
}

.filter-group {
  margin-bottom: 20px;
}

.filter-group__label {
  margin: 0 0 6px;
  padding: 0 8px;
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-muted);
}

.filter-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 6px 9px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.35;
  color: var(--text-secondary);
  text-align: left;
  transition: background 0.12s, color 0.12s;
}

.filter-item:hover {
  background: var(--bg-muted);
  color: var(--text);
}

.filter-item--active {
  background: var(--accent-soft);
  color: var(--accent);
  box-shadow: inset 2px 0 0 var(--accent);
}

.filter-item--active .filter-item__icon {
  color: var(--accent);
  filter: var(--icon-accent-filter);
}

.filter-item__icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.filter-item--compact {
  font-size: var(--text-sm);
  text-transform: lowercase;
}

.browse-all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 5px 9px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
}

.browse-all:hover {
  color: var(--text);
  background: var(--bg-muted);
}

.sidebar__footer {
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.suggest-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 9px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.35;
  color: var(--text-secondary);
  transition: border-color 0.15s, color 0.15s;
}

.suggest-btn:hover {
  border-color: var(--accent-border);
  color: var(--accent);
  box-shadow: var(--shadow-glow-orange);
}

@media (max-width: 960px) {
  .sidebar {
    display: none;
  }
}
</style>
