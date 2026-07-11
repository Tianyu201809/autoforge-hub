<script setup lang="ts">
const props = defineProps<{
  teamId: string
  initialIcon?: string
  initialIconColor?: string
  initialAvatarUrl?: string
}>()
const emit = defineEmits<{
  close: []
  saved: [payload: { icon: string; iconColor?: string; avatarUrl: string }]
}>()

const { updateTeamIcon, getTeamAvatarSrc } = useTeams()

const tab = ref<'icon' | 'avatar'>(props.initialAvatarUrl ? 'avatar' : 'icon')
const icon = ref(props.initialIcon || 'users')
const iconColor = ref<string | undefined>(props.initialIconColor)
const file = ref<File | null>(null)
const preview = ref(props.initialAvatarUrl ? getTeamAvatarSrc(props.initialAvatarUrl) : '')
const saving = ref(false)
const error = ref('')

function revokePreviewBlob() {
  if (preview.value.startsWith('blob:')) {
    URL.revokeObjectURL(preview.value)
  }
}

function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  revokePreviewBlob()
  file.value = f
  preview.value = URL.createObjectURL(f)
}

function clearFile() {
  revokePreviewBlob()
  file.value = null
  preview.value = props.initialAvatarUrl ? getTeamAvatarSrc(props.initialAvatarUrl) : ''
  const input = document.querySelector<HTMLInputElement>('.icon-modal__file-input')
  if (input) input.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !saving.value) emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  revokePreviewBlob()
  window.removeEventListener('keydown', onKeydown)
})

async function save() {
  saving.value = true
  error.value = ''
  let result
  if (tab.value === 'icon') {
    result = await updateTeamIcon(props.teamId, {
      mode: 'icon',
      icon: icon.value,
      iconColor: iconColor.value ?? null,
    })
  } else {
    if (!file.value) {
      error.value = '请选择图片'
      saving.value = false
      return
    }
    const fd = new FormData()
    fd.append('file', file.value)
    result = await updateTeamIcon(props.teamId, fd)
  }
  saving.value = false
  if (!result.ok) {
    error.value = result.error
    return
  }
  emit('saved', {
    icon: result.icon,
    iconColor: result.iconColor || undefined,
    avatarUrl: result.avatarUrl,
  })
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click.self="!saving && emit('close')">
    <div class="modal" role="dialog" aria-label="更换团队图标">
      <div class="modal__head">
        <h2 class="modal__title">
          <Icon name="lucide:image" size="18" class="modal__title-icon" />
          更换团队图标
        </h2>
        <button type="button" class="modal__close" :disabled="saving" @click="emit('close')">
          <Icon name="lucide:x" size="18" />
        </button>
      </div>

      <div class="modal-form">
        <!-- Tabs -->
        <div class="icon-modal__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="icon-modal__tab"
            :class="{ 'icon-modal__tab--active': tab === 'icon' }"
            :disabled="saving"
            @click="tab = 'icon'"
          >
            <Icon name="lucide:palette" size="14" />
            预置图标
          </button>
          <button
            type="button"
            role="tab"
            class="icon-modal__tab"
            :class="{ 'icon-modal__tab--active': tab === 'avatar' }"
            :disabled="saving"
            @click="tab = 'avatar'"
          >
            <Icon name="lucide:image-up" size="14" />
            上传图片
          </button>
        </div>

        <p class="icon-modal__hint">
          {{ tab === 'icon' ? '从预置图标和颜色中选择一种作为团队图标' : '上传图片将覆盖预置图标设置（互斥）' }}
        </p>

        <!-- Icon tab -->
        <div v-if="tab === 'icon'" class="icon-modal__panel">
          <WorkspaceWsIconPicker
            v-model="icon"
            v-model:color="iconColor"
          />
        </div>

        <!-- Avatar tab -->
        <div v-else class="icon-modal__panel">
          <div class="icon-modal__preview">
            <img
              v-if="preview"
              :src="preview"
              alt=""
              class="icon-modal__preview-img"
            >
            <div v-else class="icon-modal__preview-empty">
              <Icon name="lucide:image" size="32" />
              <span>未选择图片</span>
            </div>
          </div>
          <label class="icon-modal__file-label">
            <input
              type="file"
              class="icon-modal__file-input"
              accept="image/png,image/jpeg,image/gif,image/webp"
              :disabled="saving"
              @change="onFile"
            >
            <Icon name="lucide:upload" size="14" />
            选择图片
          </label>
          <p class="icon-modal__file-hint">支持 PNG / JPG / GIF / WebP 格式</p>
          <button
            v-if="file"
            type="button"
            class="icon-modal__file-clear"
            :disabled="saving"
            @click="clearFile"
          >
            <Icon name="lucide:x" size="12" />
            清除已选
          </button>
        </div>

        <div v-if="error" class="modal-form__error" role="alert">
          <Icon name="lucide:alert-circle" size="15" />
          {{ error }}
        </div>

        <div class="modal-form__actions">
          <button type="button" class="modal-form__cancel" :disabled="saving" @click="emit('close')">
            取消
          </button>
          <button type="button" class="modal-form__submit" :disabled="saving" @click="save">
            <Icon v-if="saving" name="lucide:loader-circle" size="16" class="modal-form__spinner" />
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--overlay-bg);
  backdrop-filter: blur(8px);
  animation: fadeIn 0.15s ease;
}

.modal {
  width: min(440px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--secondary-border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md), var(--shadow-glow-purple);
  animation: slideUp 0.2s ease;
}

.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.modal__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal__title-icon {
  color: var(--secondary);
}

.modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  transition: background 0.12s, color 0.12s;
}

.modal__close:hover:not(:disabled) {
  background: var(--bg-muted);
  color: var(--text);
}

.modal__close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-form {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.icon-modal__tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}

.icon-modal__tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 10px;
  border: none;
  border-radius: calc(var(--radius-sm) - 2px);
  background: transparent;
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.icon-modal__tab:hover:not(:disabled) {
  color: var(--text-secondary);
}

.icon-modal__tab--active {
  background: var(--bg-elevated);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.icon-modal__tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-modal__hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.icon-modal__panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.icon-modal__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  margin: 4px auto 6px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  overflow: hidden;
}

.icon-modal__preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.icon-modal__preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.icon-modal__file-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.icon-modal__file-label:hover {
  border-color: var(--accent-border);
  color: var(--accent);
}

.icon-modal__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

.icon-modal__file-hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-align: center;
}

.icon-modal__file-clear {
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  font-family: inherit;
  font-size: var(--text-xs);
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.12s, border-color 0.12s;
}

.icon-modal__file-clear:hover:not(:disabled) {
  color: var(--danger);
  border-color: var(--danger-border);
}

.modal-form__error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--danger-soft);
  border: 1px solid var(--danger-border);
  font-size: var(--text-sm);
  color: var(--danger);
}

.modal-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.modal-form__cancel {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: transparent;
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  transition: background 0.12s, border-color 0.12s;
}

.modal-form__cancel:hover:not(:disabled) {
  background: var(--bg-muted);
  border-color: var(--border-strong);
}

.modal-form__cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-form__submit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  background: var(--gradient-orange);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
  transition: transform 0.15s, opacity 0.15s;
}

.modal-form__submit:hover:not(:disabled) {
  transform: translateY(-1px);
}

.modal-form__submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.modal-form__spinner {
  animation: spin 0.8s linear infinite;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
