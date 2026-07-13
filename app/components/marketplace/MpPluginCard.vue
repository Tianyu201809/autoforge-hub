<script setup lang="ts">
import type { Script } from '~/types/workspace'

const props = defineProps<{
  script: Script
}>()

const { getAvatarSrc } = useAuth()

const ownerName = computed(() => props.script.ownerDisplayName || '未知用户')
const avatarSrc = computed(() => getAvatarSrc(props.script.ownerAvatarUrl))

function initials(name: string) {
  const t = name.trim()
  return t ? t.slice(0, 1).toUpperCase() : '?'
}
</script>

<template>
  <article class="mp-card" data-anim="card">
    <NuxtLink :to="`/workspace/marketplace/${script.id}`" class="mp-card__link">
      <div
        class="mp-card__icon"
        :style="script.iconColor ? { color: script.iconColor } : undefined"
        aria-hidden="true"
      >
        <Icon :name="`lucide:${script.icon || 'file-archive'}`" size="20" />
      </div>
      <div class="mp-card__body">
        <h3 class="mp-card__title">{{ script.title }}</h3>
        <p class="mp-card__meta">
          <span v-if="script.category">{{ script.category }}</span>
          <span v-if="script.category && script.language"> · </span>
          <span v-if="script.language">{{ script.language }}</span>
        </p>
        <div class="mp-card__footer">
          <span class="mp-card__owner">
            <img v-if="avatarSrc" :src="avatarSrc" alt="" class="mp-card__avatar">
            <span v-else class="mp-card__avatar mp-card__avatar--fallback">{{ initials(ownerName) }}</span>
            <span class="mp-card__owner-name">{{ ownerName }}</span>
          </span>
          <span class="mp-card__installs">
            <Icon name="lucide:download" size="12" />
            {{ script.installCount || 0 }}
          </span>
        </div>
      </div>
    </NuxtLink>
  </article>
</template>

<style scoped>
.mp-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-card);
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
  opacity: 1;
}

.mp-card:hover {
  border-color: var(--border-accent);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.mp-card__link {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  color: inherit;
  text-decoration: none;
  height: 100%;
}

.mp-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent);
}

.mp-card__body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mp-card__title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mp-card__meta {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.mp-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
}

.mp-card__owner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.mp-card__avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.mp-card__avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
  font-size: 9px;
  font-weight: 700;
}

.mp-card__owner-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mp-card__installs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
