<script setup lang="ts">
import type { Script } from '~/types/workspace'

const props = defineProps<{
  script: Script
  deletable?: boolean
  editable?: boolean
  downloadable?: boolean
}>()

const emit = defineEmits<{
  delete: [id: string]
  edit: [script: Script]
}>()

const showConfirm = ref(false)
const downloading = ref(false)

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function handleDelete() {
  if (showConfirm.value) {
    emit('delete', props.script.id)
    showConfirm.value = false
  } else {
    showConfirm.value = true
    setTimeout(() => { showConfirm.value = false }, 3000)
  }
}

async function handleDownload() {
  if (downloading.value) return
  downloading.value = true
  try {
    const token = localStorage.getItem('autoforge-token')
    const res = await fetch(`/api/scripts/${props.script.id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: '下载失败' }))
      console.error('[download]', err.message)
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = props.script.zipName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('[download]', err)
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div class="script-card">
    <div class="script-card__icon">
      <Icon name="lucide:file-archive" size="24" class="script-card__archive-icon" />
    </div>

    <div class="script-card__body">
      <div class="script-card__title-row">
        <h3 class="script-card__title">{{ script.title }}</h3>
        <div v-if="deletable || editable" class="script-card__actions">
          <button
            v-if="editable"
            type="button"
            class="script-card__edit"
            title="编辑脚本"
            @click="emit('edit', script)"
          >
            <Icon name="lucide:pencil" size="15" />
          </button>
          <button
            v-if="deletable"
            type="button"
            class="script-card__delete"
            :class="{ 'script-card__delete--confirm': showConfirm }"
            :title="showConfirm ? '再次点击确认删除' : '删除脚本'"
            @click="handleDelete"
          >
            <Icon :name="showConfirm ? 'lucide:alert-triangle' : 'lucide:trash-2'" size="15" />
            <span v-if="showConfirm" class="script-card__delete-text">确认?</span>
          </button>
        </div>
      </div>

      <p v-if="script.description" class="script-card__desc">{{ script.description }}</p>

      <div v-if="script.category || script.language" class="script-card__meta-tags">
        <span v-if="script.category" class="script-card__cat-badge">{{ script.category }}</span>
        <span v-if="script.language" class="script-card__lang-badge">{{ script.language }}</span>
      </div>

      <div class="script-card__meta">
        <span class="script-card__meta-item">
          <Icon name="lucide:file" size="13" />
          {{ script.zipName }}
        </span>
        <span class="script-card__meta-item">
          <Icon name="lucide:hard-drive" size="13" />
          {{ formatSize(script.zipSize) }}
        </span>
        <span class="script-card__meta-item">
          <Icon name="lucide:calendar" size="13" />
          {{ formatDate(script.createdAt) }}
        </span>
        <button
          v-if="downloadable !== false"
          type="button"
          class="script-card__download"
          :disabled="downloading"
          title="下载脚本"
          @click="handleDownload"
        >
          <Icon :name="downloading ? 'lucide:loader-circle' : 'lucide:download'" size="13" :class="{ 'script-card__download--spin': downloading }" />
          {{ downloading ? '下载中...' : '下载' }}
        </button>
      </div>

      <div v-if="script.tags.length" class="script-card__tags">
        <span
          v-for="tag in script.tags"
          :key="tag"
          class="script-card__tag"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.script-card {
  display: flex;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-card);
  transition: border-color 0.18s, box-shadow 0.18s;
  animation: cardReveal 0.35s ease both;
}

.script-card:hover {
  border-color: var(--border-accent);
  box-shadow: var(--shadow-card-hover);
}

.script-card__icon {
  display: flex;
  align-items: flex-start;
  flex-shrink: 0;
  padding-top: 2px;
}

.script-card__archive-icon {
  color: var(--accent);
  filter: var(--icon-accent-filter);
}

.script-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.script-card__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.script-card__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.script-card__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  margin-left: auto;
}

.script-card__edit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.script-card__edit:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.script-card__delete {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 6px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
}

.script-card__delete:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.script-card__delete--confirm {
  background: var(--danger-soft);
  color: var(--danger);
  animation: pulse 0.8s ease infinite;
}

.script-card__delete-text {
  white-space: nowrap;
}

.script-card__desc {
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  overflow: hidden;
}

.script-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}

.script-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
}

.script-card__download {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: var(--text-xs);
  color: var(--accent);
  white-space: nowrap;
  cursor: pointer;
  transition: opacity 0.12s;
  margin-left: auto;
}

.script-card__download:hover {
  opacity: 0.75;
}

.script-card__download:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.script-card__download--spin {
  animation: spin 0.8s linear infinite;
}

.script-card__meta-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
.script-card__cat-badge { padding: 2px 8px; border-radius: 999px; background: var(--accent-soft); border: 1px solid var(--accent-border); font-size: 0.6875rem; font-weight: 600; color: var(--accent); white-space: nowrap; }
.script-card__lang-badge { padding: 2px 8px; border-radius: 999px; background: var(--secondary-soft); border: 1px solid var(--secondary-border); font-size: 0.6875rem; font-weight: 600; color: var(--secondary); white-space: nowrap; }

.script-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 2px;
}

.script-card__tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--accent);
  white-space: nowrap;
}

@keyframes cardReveal {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
