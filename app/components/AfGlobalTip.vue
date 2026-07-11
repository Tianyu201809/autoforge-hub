<script setup lang="ts">
const { tip, hideTip } = useTip()

const iconName = computed(() => {
  switch (tip.value.type) {
    case 'error':
      return 'lucide:circle-x'
    case 'info':
      return 'lucide:info'
    default:
      return 'lucide:circle-check'
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="af-tip">
      <div
        v-if="tip.visible"
        class="af-tip"
        :class="`af-tip--${tip.type}`"
        role="status"
        aria-live="polite"
      >
        <Icon :name="iconName" size="18" class="af-tip__icon" />
        <p class="af-tip__text">{{ tip.message }}</p>
        <button type="button" class="af-tip__close" aria-label="关闭提示" @click="hideTip">
          <Icon name="lucide:x" size="14" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.af-tip {
  position: fixed;
  top: 24px;
  left: 50%;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(440px, calc(100vw - 32px));
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md, 0 12px 32px rgba(0, 0, 0, 0.18));
  transform: translateX(-50%);
}

.af-tip--success {
  border-color: var(--accent-border);
  background: color-mix(in srgb, var(--bg-elevated) 88%, var(--accent-soft));
}

.af-tip--success .af-tip__icon {
  color: var(--accent);
}

.af-tip--error {
  border-color: var(--danger-border);
  background: color-mix(in srgb, var(--bg-elevated) 88%, var(--danger-soft));
}

.af-tip--error .af-tip__icon {
  color: var(--danger);
}

.af-tip--info .af-tip__icon {
  color: var(--text-secondary);
}

.af-tip__icon {
  flex-shrink: 0;
}

.af-tip__text {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}

.af-tip__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
}

.af-tip__close:hover {
  background: var(--accent-soft);
  color: var(--text);
}

.af-tip-enter-active,
.af-tip-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.af-tip-enter-from,
.af-tip-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.af-tip-enter-to,
.af-tip-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .af-tip-enter-active,
  .af-tip-leave-active {
    transition: opacity 0.15s ease;
  }

  .af-tip-enter-from,
  .af-tip-leave-to {
    transform: translateX(-50%);
  }
}
</style>
