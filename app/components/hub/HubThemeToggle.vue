<script setup lang="ts">
const { theme, toggleTheme, initTheme } = useTheme()

onMounted(() => {
  initTheme()
})
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="theme === 'dark' ? '切换至亮色主题' : '切换至暗色主题'"
    :title="theme === 'dark' ? '素白模式' : '暗色模式'"
    @click="toggleTheme"
  >
    <span class="theme-toggle__track">
      <span class="theme-toggle__thumb" :class="{ 'theme-toggle__thumb--light': theme === 'light' }">
        <Icon
          :name="theme === 'dark' ? 'lucide:moon' : 'lucide:sun'"
          size="14"
          class="theme-toggle__icon"
        />
      </span>
    </span>
    <span class="theme-toggle__label">{{ theme === 'dark' ? '暗色' : '素白' }}</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-secondary);
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.theme-toggle:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.theme-toggle__track {
  position: relative;
  display: flex;
  align-items: center;
  width: 36px;
  height: 22px;
  border-radius: 999px;
  background: var(--bg-elevated);
  box-shadow: inset 0 0 0 1px var(--border);
}

.theme-toggle__thumb {
  position: absolute;
  left: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.theme-toggle__thumb--light {
  transform: translateX(14px);
  background: #fff;
  color: var(--accent);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.theme-toggle__icon {
  flex-shrink: 0;
}

.theme-toggle__label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

@media (max-width: 900px) {
  .theme-toggle__label {
    display: none;
  }

  .theme-toggle {
    padding: 4px;
  }
}
</style>
