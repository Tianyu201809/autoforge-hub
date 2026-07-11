<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'hero'
}>(), {
  variant: 'default'
})

const RELEASES_URL = 'https://github.com/Tianyu201809/autoforge/releases'
</script>

<template>
  <a
    class="af-download"
    :class="`af-download--${variant}`"
    :href="RELEASES_URL"
    target="_blank"
    rel="noopener noreferrer"
  >
    <span class="af-download__icon-wrap">
      <Icon name="lucide:download" :size="variant === 'hero' ? 18 : 15" />
    </span>
    <span class="af-download__body">
      <span class="af-download__label af-download__label--full">下载 Autoforge</span>
      <span class="af-download__label af-download__label--short">下载</span>
      <span v-if="variant === 'hero'" class="af-download__hint">桌面客户端 · GitHub Releases</span>
    </span>
    <Icon
      name="lucide:external-link"
      :size="variant === 'hero' ? 15 : 13"
      class="af-download__external"
    />
  </a>
</template>

<style scoped>
.af-download {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s, background 0.15s, transform 0.15s, box-shadow 0.15s;
}

.af-download:hover {
  border-color: var(--accent-border);
  color: var(--accent);
  background: var(--accent-soft);
}

.af-download__icon-wrap {
  display: inline-flex;
  flex-shrink: 0;
}

.af-download__body {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.af-download__external {
  flex-shrink: 0;
  opacity: 0.6;
}

.af-download__label--short {
  display: none;
}

.af-download__hint {
  display: none;
}

/* ── Hero variant: secondary CTA in narrative panel ──── */
.af-download--hero {
  width: 100%;
  gap: 12px;
  padding: 13px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--accent-border);
  background: color-mix(in srgb, var(--bg-elevated) 55%, transparent);
  color: var(--text);
  font-weight: 600;
  white-space: normal;
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-glow-orange);
}

.af-download--hero:hover {
  color: var(--text);
  background: var(--accent-soft);
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: var(--shadow-glow-orange);
}

.af-download--hero:active {
  transform: scale(0.98);
}

.af-download--hero .af-download__icon-wrap {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
}

.af-download--hero .af-download__body {
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.af-download--hero .af-download__label--full {
  display: block;
  font-size: var(--text-base);
  line-height: 1.2;
}

.af-download--hero .af-download__label--short {
  display: none;
}

.af-download--hero .af-download__hint {
  display: block;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
}

.af-download--hero .af-download__external {
  opacity: 0.55;
  color: var(--text-muted);
}

@media (max-width: 639px) {
  .af-download--default {
    padding: 6px 8px;
  }

  .af-download--default .af-download__label--full {
    display: none;
  }

  .af-download--default .af-download__label--short {
    display: inline;
  }
}
</style>
