<script setup lang="ts">
import { MARKETPLACE_CATEGORIES } from '~/types/workspace'

const props = defineProps<{
  total: number
  counts: Record<string, number>
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function select(cat: string) {
  emit('update:modelValue', cat)
}
</script>

<template>
  <aside class="mp-sidebar" aria-label="插件分类">
    <p class="mp-sidebar__label">分类</p>
    <button
      type="button"
      class="mp-sidebar__item"
      data-anim="cat"
      :class="{ 'mp-sidebar__item--active': !modelValue }"
      @click="select('')"
    >
      <span>全部</span>
      <span class="mp-sidebar__count">{{ total }}</span>
    </button>
    <button
      v-for="cat in MARKETPLACE_CATEGORIES"
      :key="cat"
      type="button"
      class="mp-sidebar__item"
      data-anim="cat"
      :class="{ 'mp-sidebar__item--active': modelValue === cat }"
      @click="select(cat)"
    >
      <span>{{ cat }}</span>
      <span class="mp-sidebar__count">{{ counts[cat] || 0 }}</span>
    </button>
  </aside>
</template>

<style scoped>
.mp-sidebar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  position: sticky;
  top: calc(var(--header-height) + 16px);
  max-height: calc(100vh - var(--header-height) - 32px);
  overflow: auto;
}

.mp-sidebar__label {
  margin: 0 0 8px;
  padding: 0 8px;
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.mp-sidebar__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}

.mp-sidebar__item:hover {
  color: var(--text);
  background: var(--bg-muted);
}

.mp-sidebar__item--active {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

.mp-sidebar__count {
  flex-shrink: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.mp-sidebar__item--active .mp-sidebar__count {
  color: var(--accent);
}

@media (max-width: 900px) {
  .mp-sidebar {
    position: static;
    max-height: none;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 6px;
  }

  .mp-sidebar__label {
    display: none;
  }

  .mp-sidebar__item {
    flex-shrink: 0;
    white-space: nowrap;
  }
}
</style>
