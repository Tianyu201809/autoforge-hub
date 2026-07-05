<script setup lang="ts">
defineProps<{
  currentPage: number
  totalPages: number
}>()

const emit = defineEmits<{
  (e: 'page-change', page: number): void
}>()

function goPrev() {
  // handled by parent via prop, but we validate
}

function goNext() {
  // handled by parent via prop
}
</script>

<template>
  <div class="ws-pagination" v-if="totalPages > 1">
    <div class="ws-pagination__info">
      第 {{ currentPage }} 页 / 共 {{ totalPages }} 页（{{ totalPages }} 页）
    </div>

    <div class="ws-pagination__controls">
      <button
        type="button"
        class="ws-pagination__btn"
        :disabled="currentPage <= 1"
        @click="$emit('page-change', currentPage - 1)"
      >
        <Icon name="lucide:chevron-left" size="14" />
        上一页
      </button>

      <template v-for="page in totalPages" :key="page">
        <button
          v-if="
            page === 1 ||
            page === totalPages ||
            (page >= currentPage - 1 && page <= currentPage + 1)
          "
          type="button"
          class="ws-pagination__num"
          :class="{ 'ws-pagination__num--active': page === currentPage }"
          @click="$emit('page-change', page)"
        >
          {{ page }}
        </button>
        <span
          v-else-if="page === currentPage - 2 || page === currentPage + 2"
          class="ws-pagination__ellipsis"
        >…</span>
      </template>

      <button
        type="button"
        class="ws-pagination__btn"
        :disabled="currentPage >= totalPages"
        @click="$emit('page-change', currentPage + 1)"
      >
        下一页
        <Icon name="lucide:chevron-right" size="14" />
      </button>
    </div>

    <div class="ws-pagination__jump">
      <span>跳至</span>
      <input
        type="number"
        class="ws-pagination__jump-input"
        :min="1"
        :max="totalPages"
        :value="currentPage"
        @keyup.enter="
          (e) => {
            const val = parseInt((e.target as HTMLInputElement).value)
            if (val >= 1 && val <= totalPages) $emit('page-change', val)
          }
        "
      />
      <span>页</span>
    </div>
  </div>
</template>

<style scoped>
.ws-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
}

.ws-pagination__info {
  font-size: var(--text-sm);
  color: var(--text-muted);
  white-space: nowrap;
}

.ws-pagination__controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ws-pagination__btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.ws-pagination__btn:hover:not(:disabled) {
  border-color: var(--accent-border);
  color: var(--accent);
  background: var(--accent-soft);
}

.ws-pagination__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ws-pagination__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.ws-pagination__num:hover {
  border-color: var(--border-strong);
  background: var(--bg);
}

.ws-pagination__num--active {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.ws-pagination__ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 32px;
  font-size: var(--text-sm);
  color: var(--text-muted);
  user-select: none;
}

.ws-pagination__jump {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
  color: var(--text-muted);
  white-space: nowrap;
}

.ws-pagination__jump-input {
  width: 48px;
  padding: 3px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--text);
  text-align: center;
  outline: none;
  transition: border-color 0.15s;
  -moz-appearance: textfield;
}

.ws-pagination__jump-input::-webkit-outer-spin-button,
.ws-pagination__jump-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.ws-pagination__jump-input:focus {
  border-color: var(--accent-border);
}
</style>
