<script setup lang="ts">
import type { Script } from '~/types/workspace'

const props = defineProps<{
  script: Script
}>()

const { getAvatarSrc } = useAuth()

const ownerName = computed(() => props.script.ownerDisplayName || '未知用户')
const avatarSrc = computed(() => getAvatarSrc(props.script.ownerAvatarUrl))
const summary = computed(() => props.script.description?.trim() || '作者暂未填写概要描述')
const publishTime = computed(() => formatCardDate(props.script.publishedAt || props.script.createdAt))
const githubText = computed(() => githubLabel(props.script.githubUrl))
const previewTags = computed(() => (props.script.tags || []).slice(0, 2))

function initials(name: string) {
  const t = name.trim()
  return t ? t.slice(0, 1).toUpperCase() : '?'
}

function formatCardDate(iso?: string) {
  if (!iso) return '未上架'
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function githubLabel(url?: string) {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return parsed.pathname.replace(/^\/|\/$/g, '') || parsed.hostname
  } catch {
    return url
  }
}
</script>

<template>
  <article class="mp-card" data-anim="card">
    <div class="mp-card__plate">
      <NuxtLink :to="`/workspace/marketplace/${script.id}`" class="mp-card__main">
        <div class="mp-card__top">
          <div
            class="mp-card__icon"
            :style="script.iconColor ? { color: script.iconColor } : undefined"
            aria-hidden="true"
          >
            <Icon :name="`lucide:${script.icon || 'file-archive'}`" size="24" />
          </div>
          <span class="mp-card__badge">
            {{ script.category || '未分类' }}
          </span>
        </div>

        <h3 class="mp-card__title">{{ script.title }}</h3>
        <p class="mp-card__summary">{{ summary }}</p>

        <div class="mp-card__tags" aria-label="脚本标签">
          <span v-if="script.language" class="mp-card__tag">{{ script.language }}</span>
          <span v-for="tag in previewTags" :key="tag" class="mp-card__tag">{{ tag }}</span>
        </div>
      </NuxtLink>

      <div class="mp-card__info" aria-label="脚本概要信息">
        <span class="mp-card__info-item">
          <Icon name="lucide:user-round" size="13" />
          <span class="mp-card__text">{{ ownerName }}</span>
        </span>
        <span class="mp-card__info-item">
          <Icon name="lucide:calendar-days" size="13" />
          <span>{{ publishTime }}</span>
        </span>
        <a
          v-if="script.githubUrl"
          class="mp-card__info-item mp-card__github"
          :href="script.githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          :title="githubText"
          @click.stop
        >
          <Icon name="lucide:github" size="13" />
          <span class="mp-card__text">{{ githubText }}</span>
          <Icon name="lucide:external-link" size="11" />
        </a>
        <span v-else class="mp-card__info-item mp-card__info-item--muted">
          <Icon name="lucide:github" size="13" />
          <span>暂无仓库</span>
        </span>
      </div>

      <div class="mp-card__footer">
        <span class="mp-card__owner">
          <img v-if="avatarSrc" :src="avatarSrc" alt="" class="mp-card__avatar">
          <span v-else class="mp-card__avatar mp-card__avatar--fallback">{{ initials(ownerName) }}</span>
          <span class="mp-card__owner-name">{{ ownerName }}</span>
        </span>
        <span class="mp-card__installs">
          <Icon name="lucide:download" size="13" />
          {{ script.installCount || 0 }}
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.mp-card {
  position: relative;
  perspective: 900px;
  opacity: 1;
}

.mp-card__plate {
  position: relative;
  display: flex;
  min-height: 254px;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.08), transparent 28%),
    linear-gradient(160deg, rgba(255, 140, 0, 0.1), transparent 34%),
    linear-gradient(330deg, rgba(107, 76, 230, 0.13), transparent 42%),
    var(--bg-elevated);
  box-shadow:
    0 18px 34px rgba(0, 0, 0, 0.34),
    0 2px 0 rgba(255, 255, 255, 0.05) inset,
    0 -14px 24px rgba(0, 0, 0, 0.22) inset;
  transform-style: preserve-3d;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.mp-card__plate::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  content: "";
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 38px 38px;
  mask-image: linear-gradient(180deg, black, transparent 80%);
  opacity: 0.38;
}

.mp-card__plate::after {
  position: absolute;
  right: 14px;
  bottom: 10px;
  left: 14px;
  height: 18px;
  z-index: -2;
  content: "";
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.48);
  filter: blur(16px);
}

.mp-card:hover .mp-card__plate {
  border-color: var(--border-accent);
  box-shadow:
    0 26px 46px rgba(0, 0, 0, 0.44),
    0 0 24px rgba(255, 140, 0, 0.12),
    0 2px 0 rgba(255, 255, 255, 0.08) inset,
    0 -16px 26px rgba(0, 0, 0, 0.24) inset;
  transform: translateY(-6px) rotateX(2deg);
}

.mp-card__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 16px 16px 10px;
  color: inherit;
  text-decoration: none;
}

.mp-card__top,
.mp-card__footer,
.mp-card__owner,
.mp-card__installs,
.mp-card__info-item {
  display: flex;
  align-items: center;
}

.mp-card__top {
  justify-content: space-between;
  gap: 10px;
}

.mp-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.22), transparent 34%),
    var(--accent-soft);
  color: var(--accent);
  box-shadow:
    0 12px 22px rgba(0, 0, 0, 0.28),
    0 1px 0 rgba(255, 255, 255, 0.12) inset;
  transform: translateZ(24px);
}

.mp-card__badge {
  max-width: 54%;
  overflow: hidden;
  padding: 5px 8px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.04);
}

.mp-card__title {
  margin: 14px 0 0;
  color: var(--text);
  font-size: var(--text-base);
  font-weight: 700;
  line-height: var(--leading-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mp-card__summary {
  display: -webkit-box;
  min-height: 40px;
  margin: 8px 0 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.mp-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 24px;
  margin-top: 12px;
}

.mp-card__tag {
  max-width: 44%;
  overflow: hidden;
  padding: 3px 7px;
  border: 1px solid var(--secondary-border);
  border-radius: 999px;
  background: var(--secondary-soft);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mp-card__info {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  padding: 0 16px 14px;
}

.mp-card__info-item {
  min-width: 0;
  gap: 6px;
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.mp-card__github {
  grid-column: 1 / -1;
  width: fit-content;
  max-width: 100%;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.mp-card__github:hover {
  color: var(--accent);
}

.mp-card__info-item--muted {
  grid-column: 1 / -1;
  opacity: 0.72;
}

.mp-card__text,
.mp-card__owner-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mp-card__footer {
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding: 11px 16px 13px;
  border-top: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.12);
}

.mp-card__owner {
  min-width: 0;
  gap: 7px;
  color: var(--text-secondary);
  font-size: var(--text-xs);
}

.mp-card__avatar {
  width: 22px;
  height: 22px;
  border: 1px solid rgba(255, 255, 255, 0.16);
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
  font-size: 10px;
  font-weight: 800;
}

.mp-card__installs {
  gap: 5px;
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
}

:global(html[data-theme='light'] .mp-card__plate) {
  border-color: rgba(15, 23, 42, 0.08);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96) 56%, rgba(243, 246, 250, 0.98)),
    radial-gradient(circle at 16% 10%, rgba(234, 88, 12, 0.08), transparent 34%),
    radial-gradient(circle at 88% 6%, rgba(79, 70, 229, 0.055), transparent 34%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.88) inset,
    0 -18px 28px rgba(15, 23, 42, 0.035) inset,
    0 18px 34px rgba(15, 23, 42, 0.08),
    0 5px 12px rgba(15, 23, 42, 0.04);
}

:global(html[data-theme='light'] .mp-card__plate::before) {
  background:
    linear-gradient(90deg, rgba(15, 23, 42, 0.026) 1px, transparent 1px),
    linear-gradient(180deg, rgba(15, 23, 42, 0.02) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.5;
}

:global(html[data-theme='light'] .mp-card__plate::after) {
  right: 18px;
  bottom: -5px;
  left: 18px;
  height: 22px;
  background: rgba(15, 23, 42, 0.16);
  filter: blur(18px);
}

:global(html[data-theme='light'] .mp-card:hover .mp-card__plate) {
  border-color: rgba(234, 88, 12, 0.24);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.92) inset,
    0 -18px 28px rgba(15, 23, 42, 0.04) inset,
    0 24px 46px rgba(15, 23, 42, 0.11),
    0 8px 18px rgba(234, 88, 12, 0.07);
}

:global(html[data-theme='light'] .mp-card__icon) {
  border-color: rgba(234, 88, 12, 0.16);
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.9), transparent 38%),
    linear-gradient(145deg, rgba(255, 247, 237, 0.95), rgba(255, 237, 213, 0.86));
  box-shadow:
    0 11px 20px rgba(234, 88, 12, 0.13),
    0 1px 0 rgba(255, 255, 255, 0.86) inset;
}

:global(html[data-theme='light'] .mp-card__badge) {
  border-color: rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.72);
  color: #64748b;
}

:global(html[data-theme='light'] .mp-card__tag) {
  border-color: rgba(79, 70, 229, 0.14);
  background: rgba(79, 70, 229, 0.055);
  color: #4f46e5;
}

:global(html[data-theme='light'] .mp-card__summary) {
  color: #4b5563;
}

:global(html[data-theme='light'] .mp-card__info-item) {
  color: #7b8494;
}

:global(html[data-theme='light'] .mp-card__github) {
  color: #374151;
}

:global(html[data-theme='light'] .mp-card__github:hover) {
  color: #ea580c;
}

:global(html[data-theme='light'] .mp-card__footer) {
  border-top-color: rgba(15, 23, 42, 0.07);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.64), rgba(241, 243, 247, 0.72));
}

:global(html[data-theme='light'] .mp-card__avatar) {
  border-color: rgba(15, 23, 42, 0.08);
}

:global(html[data-theme='light'] .mp-card__avatar--fallback) {
  box-shadow: 0 5px 12px rgba(234, 88, 12, 0.18);
}

@media (prefers-reduced-motion: reduce) {
  .mp-card__plate {
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }

  .mp-card:hover .mp-card__plate {
    transform: none;
  }
}

@media (max-width: 640px) {
  .mp-card__plate {
    min-height: 236px;
  }

  .mp-card:hover .mp-card__plate {
    transform: translateY(-3px);
  }
}
</style>
