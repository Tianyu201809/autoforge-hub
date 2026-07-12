<script setup lang="ts">
import type { Script } from '~/types/workspace'

const props = defineProps<{
  script: Script
  deletable?: boolean
  editable?: boolean
  downloadable?: boolean
  copyable?: boolean
  shareable?: boolean
}>()

const emit = defineEmits<{
  delete: [id: string]
  edit: [script: Script]
  copy: [script: Script]
  share: [script: Script]
}>()

const showDeleteModal = ref(false)
const deleteConfirmText = ref('')
const downloading = ref(false)
const showCaptchaModal = ref(false)
const quotaError = ref('')
const usedToday = ref(0)

const { checkHealth, installScript } = useAutoforgeBridge()
const { showTip } = useTip()
const { getAvatarSrc } = useAuth()
const installing = ref(false)
const installMessage = ref('')
const installMessageIsError = ref(false)

function ownerName() {
  return props.script.ownerDisplayName || '未知用户'
}

function ownerAvatar() {
  return getAvatarSrc(props.script.ownerAvatarUrl)
}

function initials(name: string) {
  const t = name.trim()
  return t ? t.slice(0, 1).toUpperCase() : '?'
}

const ADD_DEBOUNCE_MS = 3000
let lastAddClickAt = 0

function onAddToLocalClick() {
  const now = Date.now()
  if (now - lastAddClickAt < ADD_DEBOUNCE_MS) return
  lastAddClickAt = now
  void handleAddToLocal()
}

async function handleAddToLocal() {
  if (installing.value || downloading.value) return

  installing.value = true
  installMessage.value = ''
  installMessageIsError.value = false
  try {
    const healthy = await checkHealth()
    if (!healthy) {
      installMessageIsError.value = true
      installMessage.value = '请先启动 Autoforge 桌面端，然后再试'
      return
    }

    const token = localStorage.getItem('autoforge-token')
    const mintRes = await fetch(`/api/scripts/${props.script.id}/install-token`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const mintData = await mintRes.json().catch(() => ({} as any))
    if (!mintRes.ok) {
      installMessageIsError.value = true
      installMessage.value = mintData.message || '添加失败，请重试'
      return
    }

    const result = await installScript({
      zipUrl: mintData.zipUrl,
      scriptName: mintData.scriptName || props.script.title,
      hubScriptId: mintData.hubScriptId || props.script.id,
    })
    if (result.ok) {
      installMessageIsError.value = false
      installMessage.value = ''
      showTip(
        result.name
          ? `已添加到本地 Autoforge（${result.name}）`
          : '已添加到本地 Autoforge',
        'success'
      )
      usedToday.value++
    } else {
      installMessageIsError.value = true
      installMessage.value = result.message
    }
  } catch {
    installMessageIsError.value = true
    installMessage.value = '添加失败，请重试'
  } finally {
    installing.value = false
  }
}

async function fetchQuota() {
  try {
    const token = localStorage.getItem('autoforge-token')
    const res = await fetch('/api/downloads/quota', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.ok) {
      const data = await res.json()
      usedToday.value = data.used
    }
  } catch { /* ignore */ }
}

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

function handleDownload() {
  if (downloading.value) return
  quotaError.value = ''
  fetchQuota().then(() => {
    showCaptchaModal.value = true
  })
}

async function onCaptchaVerified(captchaToken: string, captchaPosition: number) {
  showCaptchaModal.value = false
  downloading.value = true
  quotaError.value = ''
  try {
    const token = localStorage.getItem('autoforge-token')
    const res = await fetch(
      `/api/scripts/${props.script.id}/download?captchaToken=${encodeURIComponent(captchaToken)}&captchaPosition=${captchaPosition}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    )

    if (!res.ok) {
      const data = await res.json().catch(() => ({ message: '下载失败' }))
      quotaError.value = data.message || '下载失败'
      console.error('[download]', quotaError.value)
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
    usedToday.value++
  } catch (err) {
    console.error('[download]', err)
  } finally {
    downloading.value = false
  }
}

function cancelCaptcha() {
  showCaptchaModal.value = false
}
</script>

<template>
  <div class="script-card">
    <div class="script-card__header">
      <div class="script-card__heading">
        <h3 class="script-card__title" :title="script.title">{{ script.title }}</h3>
        <p v-if="script.description" class="script-card__desc">{{ script.description }}</p>
      </div>
      <div class="script-card__icon" aria-hidden="true">
        <Icon
          :name="`lucide:${script.icon || 'file-archive'}`"
          size="22"
          class="script-card__archive-icon"
          :style="script.iconColor ? { color: script.iconColor } : undefined"
        />
      </div>
    </div>

    <div class="script-card__meta-row">
      <span v-if="script.category" class="script-card__cat-badge">{{ script.category }}</span>
      <span v-if="script.language" class="script-card__lang-badge">{{ script.language }}</span>
    </div>

    <dl class="script-card__info">
      <div class="script-card__info-row">
        <dt>大小</dt>
        <dd>{{ formatSize(script.zipSize) }}</dd>
      </div>
      <div class="script-card__info-row">
        <dt>上传者</dt>
        <dd class="script-card__owner">
          <img
            v-if="script.ownerAvatarUrl"
            :src="ownerAvatar()"
            alt=""
            class="script-card__owner-avatar"
          >
          <span v-else class="script-card__owner-fallback">{{ initials(ownerName()) }}</span>
          <span class="script-card__owner-name" :title="ownerName()">{{ ownerName() }}</span>
        </dd>
      </div>
      <div class="script-card__info-row">
        <dt>上传</dt>
        <dd>{{ formatDate(script.createdAt) }}</dd>
      </div>
      <div class="script-card__info-row">
        <dt>修改</dt>
        <dd>{{ formatDate(script.updatedAt || script.createdAt) }}</dd>
      </div>
    </dl>

    <div v-if="script.tags.length" class="script-card__tags">
      <span
        v-for="tag in script.tags.slice(0, 4)"
        :key="tag"
        class="script-card__tag"
      >
        {{ tag }}
      </span>
      <span v-if="script.tags.length > 4" class="script-card__tag script-card__tag--more">
        +{{ script.tags.length - 4 }}
      </span>
    </div>

    <div class="script-card__footer">
      <NuxtLink :to="`/workspace/scripts/${script.id}`" class="script-card__detail">
        <Icon name="lucide:panel-right" size="14" />
        详情
      </NuxtLink>
      <div v-if="deletable || editable || copyable || shareable" class="script-card__actions">
        <button
          v-if="shareable"
          type="button"
          class="script-card__share"
          title="分享到团队"
          @click="emit('share', script)"
        >
          <Icon name="lucide:share-2" size="14" />
        </button>
        <button
          v-if="copyable"
          type="button"
          class="script-card__copy"
          title="复制到我的空间"
          @click="emit('copy', script)"
        >
          <Icon name="lucide:copy-plus" size="14" />
        </button>
        <button
          v-if="editable"
          type="button"
          class="script-card__edit"
          title="编辑脚本"
          @click="emit('edit', script)"
        >
          <Icon name="lucide:pencil" size="14" />
        </button>
        <button
          v-if="deletable"
          type="button"
          class="script-card__delete"
          title="删除脚本"
          @click="handleDelete"
        >
          <Icon name="lucide:trash-2" size="14" />
        </button>
      </div>
    </div>

    <div v-if="downloadable !== false" class="script-card__cta">
      <button
        type="button"
        class="script-card__download"
        :disabled="downloading || installing"
        title="下载脚本"
        @click="handleDownload"
      >
        <Icon :name="downloading ? 'lucide:loader-circle' : 'lucide:download'" size="14" :class="{ 'script-card__spin': downloading }" />
        {{ downloading ? '下载中...' : '下载' }}
      </button>
      <button
        type="button"
        class="script-card__add-local"
        :class="{ 'script-card__add-local--loading': installing }"
        :disabled="installing || downloading"
        :aria-busy="installing"
        title="添加到本地 Autoforge"
        @click="onAddToLocalClick"
      >
        <span class="script-card__add-local-shine" aria-hidden="true" />
        <span class="script-card__add-local-inner">
          <Icon
            :name="installing ? 'lucide:loader-circle' : 'lucide:monitor-down'"
            size="14"
            :class="{ 'script-card__spin': installing }"
          />
          <span class="script-card__add-local-label">
            {{ installing ? '添加中…' : '添加到本地' }}
          </span>
        </span>
      </button>
    </div>

    <p v-if="quotaError" class="script-card__quota-error">{{ quotaError }}</p>
    <p
      v-if="installMessage"
      class="script-card__install-msg"
      :class="{ 'script-card__install-msg--error': installMessageIsError }"
      role="status"
    >
      {{ installMessage }}
    </p>
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
            >
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

  <!-- ═══ Captcha Modal (self-teleported) ═══ -->
  <WorkspaceDownloadCaptchaModal
    v-if="showCaptchaModal"
    :script-id="script.id"
    :used-today="usedToday"
    @verified="onCaptchaVerified"
    @cancel="cancelCaptcha"
  />
</template>

<style scoped>
.script-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-card);
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
  animation: cardReveal 0.35s ease both;
}

.script-card:hover {
  border-color: var(--border-accent);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}

.script-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.script-card__heading {
  min-width: 0;
  flex: 1;
}

.script-card__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.script-card__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  border: 1px solid var(--border);
}

.script-card__archive-icon {
  color: var(--accent);
  filter: var(--icon-accent-filter);
}

.script-card__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
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

.script-card__copy {
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

.script-card__copy:hover {
  background: var(--secondary-soft);
  color: var(--secondary);
}

.script-card__share {
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

.script-card__share:hover {
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
  margin: 6px 0 0;
  font-size: var(--text-sm);
  line-height: 1.45;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  overflow: hidden;
}

.script-card__meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.script-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
}

.script-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}

.script-card__info {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.script-card__info-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  font-size: var(--text-xs);
  line-height: 1.4;
}

.script-card__info-row dt {
  margin: 0;
  color: var(--text-muted);
  font-weight: 500;
}

.script-card__info-row dd {
  margin: 0;
  color: var(--text-secondary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.script-card__owner {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.script-card__owner-avatar,
.script-card__owner-fallback {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.script-card__owner-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-muted);
  border: 1px solid var(--border);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
}

.script-card__owner-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.script-card__cta {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.script-card__cta > * {
  min-width: 0;
}

.script-card__detail {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}

.script-card__detail:hover {
  border-color: var(--accent-border);
  color: var(--accent);
}

.script-card__add-local-label {
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.script-card__download {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  min-height: 28px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}

.script-card__download:hover:not(:disabled) {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);
}

.script-card__download:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.script-card__add-local {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  min-height: 28px;
  padding: 0 8px;
  overflow: hidden;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: var(--btn-primary-text, #fff);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 1px 0 color-mix(in srgb, var(--accent) 50%, #000);
  transition:
    filter 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.12s ease;
}

.script-card__add-local:hover:not(:disabled) {
  filter: brightness(1.06);
}

.script-card__add-local:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: none;
}

.script-card__add-local:disabled:not(.script-card__add-local--loading) {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.script-card__add-local--loading {
  cursor: wait;
  pointer-events: none;
}

.script-card__add-local-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 25%,
    color-mix(in srgb, #fff 28%, transparent) 45%,
    transparent 65%
  );
  background-size: 220% 100%;
  opacity: 0;
  pointer-events: none;
}

.script-card__add-local--loading .script-card__add-local-shine {
  opacity: 1;
  animation: addLocalShine 1.1s ease-in-out infinite;
}

.script-card__add-local-inner {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.script-card__add-local-label {
  line-height: 1.2;
}

.script-card__install-msg {
  margin: 0;
  width: 100%;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--accent);
}

.script-card__install-msg--error {
  color: var(--danger);
}

.script-card__spin {
  animation: spin 0.75s linear infinite;
}

.script-card__quota-error {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--danger);
}

.script-card__cat-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--accent);
  white-space: nowrap;
}

.script-card__lang-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--secondary-soft);
  border: 1px solid var(--secondary-border);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--secondary);
  white-space: nowrap;
}

.script-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.script-card__tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--bg-muted);
  border: 1px solid var(--border);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.script-card__tag--more {
  color: var(--text-muted);
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

@keyframes addLocalShine {
  0% { background-position: 120% 0; }
  100% { background-position: -120% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .script-card__add-local--loading .script-card__add-local-shine {
    animation: none;
    opacity: 0.35;
  }

  .script-card__spin {
    animation: none;
  }
}
</style>
