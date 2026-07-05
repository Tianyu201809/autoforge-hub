<script setup lang="ts">
import type { AuthTab } from '~/types/auth'

const model = defineModel<AuthTab>({ required: true })

const tabs: { id: AuthTab; label: string }[] = [
  { id: 'login', label: '登录' },
  { id: 'register', label: '注册' }
]
</script>

<template>
  <div class="auth-tabs" role="tablist" aria-label="认证方式">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      class="auth-tabs__item"
      :class="{ 'auth-tabs__item--active': model === tab.id }"
      :aria-selected="model === tab.id"
      @click="model = tab.id"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.auth-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: var(--radius-md);
  background: var(--bg-muted);
}

.auth-tabs__item {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-muted);
  transition: color 0.15s, background 0.15s, box-shadow 0.15s;
}

.auth-tabs__item:hover {
  color: var(--text);
}

.auth-tabs__item--active {
  color: var(--accent);
  background: var(--accent-soft);
  box-shadow: inset 0 -2px 0 var(--accent);
}
</style>
