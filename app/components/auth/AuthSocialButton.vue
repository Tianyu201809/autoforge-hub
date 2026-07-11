<script setup lang="ts">
defineProps<{
  icon: string
  label: string
  disabled?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="auth-social"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <Icon :name="icon" size="18" />
    <span>{{ label }}</span>
  </button>
</template>

<style scoped>
.auth-social {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  color: var(--text);
  font-size: var(--text-sm);
  font-weight: 500;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.auth-social:hover:not(:disabled) {
  background: var(--bg-muted);
  border-color: var(--accent-border);
  color: var(--accent);
}

.auth-social:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
