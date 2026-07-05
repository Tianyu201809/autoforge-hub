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

const showDeleteModal = ref(false)
const deleteConfirmText = ref('')
const downloading = ref(false)

const deleteInputMatch = computed(() => deleteConfirmText.value === props.script.title)

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
  deleteConfirmText.value = ''
  showDeleteModal.value = true
}

function confirmDelete() {
  if (!deleteInputMatch.value) return
  emit('delete', props.script.id)
  showDeleteModal.value = false
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
      <Icon :name="`lucide:${script.icon || 'file-archive'}`" size="24" class="script-card__archive-icon" />
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
            title="删除脚本"
            @click="handleDelete"
          >
            <Icon name="lucide:trash-2" size="15" />
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

  <!-- ═══ Delete Confirmation Modal ═══ -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showDeleteModal" class="delete-overlay" @click.self="showDeleteModal = false">
        <div class="delete-modal" role="dialog" aria-label="确认删除">
          <div class="delete-modal__icon">
            <div class="delete-modal__icon-ring">
              <Icon name="lucide:trash-2" size="24" />
            </div>
          </div>
          <h3 class="delete-modal__title">确认删除脚本</h3>
          <p class="delete-modal__desc">
            确定要删除「<strong>{{ script.title }}</strong>」吗？此操作不可撤销。
          </p>
          <div class="delete-modal__input-group">
            <label class="delete-modal__label">
              请输入 <strong>{{ script.title }}</strong> 确认删除
            </label>
            <input
              v-model="deleteConfirmText"
              type="text"
              class="delete-modal__input"
              :placeholder="script.title"
              autocomplete="off"
              @keydown.enter="confirmDelete"
            />
          </div>
          <div class="delete-modal__actions">
            <button
              type="button"
              class="delete-modal__cancel"
              @click="showDeleteModal = false"
            >
              取消
            </button>
            <button
              type="button"
              class="delete-modal__confirm"
              :disabled="!deleteInputMatch"
              @click="confirmDelete"
            >
              <Icon name="lucide:trash-2" size="14" />
              确认删除
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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

/* ── Delete Confirmation Modal ── */
.delete-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--overlay-bg);
  backdrop-filter: blur(8px);
}

.delete-modal {
  width: min(380px, calc(100vw - 32px));
  padding: 32px 28px 24px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  text-align: center;
  animation: modalIn 0.25s ease;
}

.delete-modal__icon {
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
}

.delete-modal__icon-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--danger-soft);
  color: var(--danger);
}

.delete-modal__title {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text);
}

.delete-modal__desc {
  margin: 0 0 24px;
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
  color: var(--text-secondary);
}

.delete-modal__desc strong {
  color: var(--text);
  font-weight: 600;
}

.delete-modal__input-group {
  margin-bottom: 20px;
  text-align: left;
}

.delete-modal__label {
  display: block;
  margin-bottom: 6px;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: var(--leading-snug);
}

.delete-modal__label strong {
  color: var(--text);
  font-weight: 600;
}

.delete-modal__input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.delete-modal__input:focus {
  border-color: var(--danger-border);
  box-shadow: 0 0 0 3px var(--danger-soft);
}

.delete-modal__input::placeholder {
  color: var(--text-muted);
}

.delete-modal__actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.delete-modal__cancel {
  flex: 1;
  padding: 9px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  transition: background 0.12s, border-color 0.12s;
  font-family: inherit;
}

.delete-modal__cancel:hover {
  background: var(--bg-muted);
  border-color: var(--border-strong);
}

.delete-modal__confirm {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 16px;
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-sm);
  background: var(--danger);
  font-size: var(--text-sm);
  font-weight: 600;
  color: #fff;
  transition: background 0.12s, opacity 0.12s;
  font-family: inherit;
}

.delete-modal__confirm:hover:not(:disabled) {
  opacity: 0.9;
}

.delete-modal__confirm:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Transition */
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
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

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
