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
const updateTime = computed(() => formatCardDate(props.script.updatedAt || props.script.publishedAt || props.script.createdAt))
const sizeText = computed(() => formatSize(props.script.zipSize))
const installText = computed(() => formatCount(props.script.installCount || 0))
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

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '未知'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatCount(count: number): string {
  if (count < 1000) return String(count)
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`
  return `${Math.round(count / 1000)}k`
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
          <div class="mp-card__heading">
            <div
              class="mp-card__icon"
              :style="script.iconColor ? { color: script.iconColor } : undefined"
              aria-hidden="true"
            >
              <Icon :name="`lucide:${script.icon || 'file-archive'}`" size="24" />
            </div>
            <h3 class="mp-card__title">{{ script.title }}</h3>
          </div>
          <span class="mp-card__badge">
            {{ script.category || '未分类' }}
          </span>
        </div>

        <div class="mp-card__body">
          <p class="mp-card__summary">{{ summary }}</p>

          <div class="mp-card__tags" aria-label="脚本标签">
            <span v-if="script.language" class="mp-card__tag">{{ script.language }}</span>
            <span v-for="tag in previewTags" :key="tag" class="mp-card__tag">{{ tag }}</span>
          </div>

          <dl class="mp-card__metrics" aria-label="脚本指标">
            <div class="mp-card__metric">
              <dt>
                <Icon name="lucide:hard-drive" size="13" />
                大小
              </dt>
              <dd>{{ sizeText }}</dd>
            </div>
            <div class="mp-card__metric">
              <dt>
                <Icon name="lucide:download" size="13" />
                安装
              </dt>
              <dd>{{ installText }}</dd>
            </div>
            <div class="mp-card__metric">
              <dt>
                <Icon name="lucide:refresh-cw" size="13" />
                更新
              </dt>
              <dd>{{ updateTime }}</dd>
            </div>
          </dl>
        </div>
      </NuxtLink>

      <div class="mp-card__info" aria-label="脚本概要信息">
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
          <span class="mp-card__repo-label">仓库</span>
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
          <span class="mp-card__owner-label">作者</span>
          <span class="mp-card__owner-name">{{ ownerName }}</span>
        </span>
        <span class="mp-card__published">
          <Icon name="lucide:calendar-days" size="13" />
          上架 {{ publishTime }}
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
  min-height: 286px;
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
.mp-card__heading,
.mp-card__footer,
.mp-card__owner,
.mp-card__published,
.mp-card__info-item {
  display: flex;
  align-items: center;
}

.mp-card__top {
  position: relative;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: -16px -16px 0;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 140, 0, 0.28);
  background: rgba(255, 140, 0, 0.07);
}

.mp-card__top::after {
  display: none;
}

.mp-card__heading {
  min-width: 0;
  flex: 1;
  gap: 11px;
}

.mp-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 140, 0, 0.28);
  border-radius: var(--radius-sm);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.12), transparent 42%),
    var(--accent-soft);
  color: var(--accent);
  box-shadow:
    0 10px 20px rgba(0, 0, 0, 0.24),
    0 1px 0 rgba(255, 255, 255, 0.1) inset;
  transform: translateZ(18px);
}

.mp-card__badge {
  max-width: 36%;
  overflow: hidden;
  padding: 4px 8px;
  border: 1px solid rgba(107, 76, 230, 0.34);
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgba(107, 76, 230, 0.1);
}

.mp-card__title {
  min-width: 0;
  margin: 0;
  color: var(--text);
  font-size: var(--text-base);
  font-weight: 700;
  line-height: var(--leading-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mp-card__body {
  margin: 12px 0 0;
  padding: 0;
}

.mp-card__summary {
  display: -webkit-box;
  min-height: 38px;
  margin: 0;
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

.mp-card__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 12px 0 0;
}

.mp-card__metric {
  min-width: 0;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.035);
}

.mp-card__metric dt {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.1;
  white-space: nowrap;
}

.mp-card__metric dd {
  min-width: 0;
  margin: 6px 0 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mp-card__info {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
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
.mp-card__repo-label,
.mp-card__owner-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mp-card__owner-label {
  flex-shrink: 0;
  color: var(--text-muted);
}

.mp-card__repo-label {
  flex-shrink: 0;
  color: var(--text-muted);
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

.mp-card__published {
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

:global(html[data-theme='light'] .mp-card__top) {
  border-bottom-color: rgba(234, 88, 12, 0.3);
  background: rgba(234, 88, 12, 0.13);
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

:global(html[data-theme='light'] .mp-card__metric) {
  border-color: rgba(15, 23, 42, 0.07);
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.82) inset;
}

:global(html[data-theme='light'] .mp-card__metric dd) {
  color: #334155;
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
    min-height: 268px;
  }

  .mp-card:hover .mp-card__plate {
    transform: translateY(-3px);
  }
}
</style>
