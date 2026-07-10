<script setup lang="ts">
const RELEASES_URL = 'https://github.com/Tianyu201809/autoforge/releases'
</script>

<template>
  <a
    class="af-download"
    :href="RELEASES_URL"
    target="_blank"
    rel="noopener noreferrer"
  >
    <Icon name="lucide:download" size="15" class="af-download__icon" />
    <span class="af-download__label af-download__label--full">下载 Autoforge</span>
    <span class="af-download__label af-download__label--short">下载</span>
    <Icon name="lucide:external-link" size="13" class="af-download__external" />
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
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.af-download:hover {
  border-color: var(--accent-border);
  color: var(--accent);
  background: var(--accent-soft);
}

.af-download__icon {
  flex-shrink: 0;
}

.af-download__external {
  flex-shrink: 0;
  opacity: 0.6;
}

.af-download__label--short {
  display: none;
}

@media (max-width: 639px) {
  .af-download {
    padding: 6px 8px;
  }

  .af-download__label--full {
    display: none;
  }

  .af-download__label--short {
    display: inline;
  }
}
</style>
