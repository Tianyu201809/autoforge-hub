<script setup lang="ts">
const model = defineModel<string>({ required: true })

const emit = defineEmits<{
  close: []
}>()

const inputRef = ref<HTMLInputElement>()

onMounted(() => {
  inputRef.value?.focus()
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <div class="search-overlay" @click.self="emit('close')">
    <div class="search-modal" role="dialog" aria-label="搜索">
      <div class="search-modal__input-wrap">
        <Icon name="lucide:search" size="18" class="search-modal__icon hub-icon--accent" />
        <input
          ref="inputRef"
          v-model="model"
          type="search"
          class="search-modal__input"
          placeholder="搜索脚本、流程、应用..."
          @keydown="onKeydown"
        >
        <button type="button" class="search-modal__close" @click="emit('close')">
          <Icon name="lucide:x" size="16" />
        </button>
      </div>
      <p class="search-modal__hint">
        按 <kbd>Esc</kbd> 关闭 · <kbd>Ctrl</kbd>+<kbd>K</kbd> 打开
      </p>
    </div>
  </div>
</template>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  background: var(--overlay-bg);
  backdrop-filter: blur(8px);
  animation: fadeIn 0.15s ease;
}

.search-modal {
  width: min(560px, calc(100vw - 32px));
  padding: 16px;
  border: 1px solid var(--secondary-border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md), var(--shadow-glow-purple), var(--shadow-glow-orange);
  animation: slideDown 0.2s ease;
}

.search-modal__input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 4px 4px 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.search-modal__input-wrap:focus-within {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow-orange);
}

.search-modal__icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.search-modal__input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 1rem;
  color: var(--text);
  outline: none;
}

.search-modal__input::placeholder {
  color: var(--text-muted);
}

.search-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
}

.search-modal__close:hover {
  background: var(--bg-muted);
  color: var(--text);
}

.search-modal__hint {
  margin: 12px 4px 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.search-modal__hint kbd {
  padding: 1px 5px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-muted);
  font-family: inherit;
  font-size: 0.7rem;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
