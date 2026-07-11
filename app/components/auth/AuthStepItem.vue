<script setup lang="ts">
defineProps<{
  number: number | string
  text: string
  active?: boolean
}>()
</script>

<template>
  <div
    class="auth-step"
    :class="active ? 'auth-step--active' : 'auth-step--inactive'"
  >
    <span class="auth-step__num">{{ number }}</span>
    <span class="auth-step__text">{{ text }}</span>
  </div>
</template>

<style scoped>
.auth-step {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  backdrop-filter: blur(10px);
  transition: background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.auth-step--active {
  background: var(--accent-soft);
  color: var(--text);
  border: 1px solid var(--accent-border);
  box-shadow: var(--shadow-glow-orange);
}

.auth-step--inactive {
  background: color-mix(in srgb, var(--bg-muted) 82%, transparent);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.auth-step__num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: var(--text-xs);
  font-weight: 600;
  flex-shrink: 0;
}

.auth-step--active .auth-step__num {
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
}

.auth-step--inactive .auth-step__num {
  background: var(--bg-muted);
  color: var(--text-muted);
  border: 1px solid var(--border-strong);
}

.auth-step__text {
  line-height: 1.3;
}
</style>
