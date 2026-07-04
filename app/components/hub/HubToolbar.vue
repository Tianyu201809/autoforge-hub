<script setup lang="ts">
import { HUB_QUICK_TAGS } from '~/data/hub-items'
import type { HubSort } from '~/types/hub'

const sortBy = defineModel<HubSort>('sortBy', { required: true })
const selectedTags = defineModel<string[]>('selectedTags', { required: true })

const emit = defineEmits<{
  toggleMobileFilters: []
}>()
</script>

<template>
  <div class="toolbar">
    <div class="toolbar__tags">
      <button
        v-for="tag in HUB_QUICK_TAGS"
        :key="tag"
        type="button"
        class="tag-pill"
        :class="{ 'tag-pill--active': selectedTags.includes(tag) }"
        @click="
          selectedTags = selectedTags.includes(tag)
            ? selectedTags.filter(t => t !== tag)
            : [...selectedTags, tag]
        "
      >
        {{ tag }}
      </button>
    </div>

    <div class="toolbar__actions">
      <button
        type="button"
        class="toolbar-btn toolbar-btn--ghost mobile-only"
        @click="emit('toggleMobileFilters')"
      >
        <Icon name="lucide:sliders-horizontal" size="16" class="hub-icon" />
        筛选
      </button>

      <div class="sort-tabs" role="tablist" aria-label="排序">
        <button
          type="button"
          role="tab"
          class="sort-tab"
          :class="{ 'sort-tab--active': sortBy === 'top' }"
          :aria-selected="sortBy === 'top'"
          @click="sortBy = 'top'"
        >
          Top
        </button>
        <button
          type="button"
          role="tab"
          class="sort-tab"
          :class="{ 'sort-tab--active': sortBy === 'new' }"
          :aria-selected="sortBy === 'new'"
          @click="sortBy = 'new'"
        >
          New
        </button>
      </div>

      <button type="button" class="toolbar-btn toolbar-btn--primary">
        <Icon name="lucide:plus" size="16" />
        发布
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: contents;
}

.toolbar__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  grid-column: 1 / -1;
  grid-row: 2;
}

.toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
}

.tag-pill {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-elevated);
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.2;
  text-transform: lowercase;
  color: var(--text-muted);
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.tag-pill:hover {
  border-color: var(--border-strong);
  color: var(--text-secondary);
}

.tag-pill--active {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);
}

.sort-tabs {
  display: flex;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}

.sort-tab {
  padding: 4px 12px;
  border: none;
  border-radius: calc(var(--radius-sm) - 2px);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-muted);
  transition: all 0.15s;
}

.sort-tab--active {
  background: var(--bg-elevated);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 600;
  line-height: 1.3;
  transition: all 0.15s;
}

.toolbar-btn--ghost {
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.toolbar-btn--ghost:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.toolbar-btn--primary {
  border: 1px solid var(--accent-border);
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
}

.toolbar-btn--primary:hover {
  transform: translateY(-1px);
}

.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .toolbar__actions {
    grid-column: 1;
    grid-row: 2;
    justify-self: stretch;
    justify-content: space-between;
  }

  .toolbar__tags {
    grid-row: 3;
  }
}

@media (max-width: 960px) {
  .mobile-only {
    display: inline-flex;
  }
}
</style>
