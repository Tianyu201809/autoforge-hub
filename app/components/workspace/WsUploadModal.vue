<script setup lang="ts">
import { SCRIPT_CATEGORIES, SCRIPT_LANGUAGES } from "~/types/workspace"

const emit = defineEmits<{
  close: []
  uploaded: [payload: {
    title: string
    description: string
    zipName: string
    zipSize: number
    tags: string[]
    file: File
    category: string
    language: string
    icon: string
    iconColor?: string
  }]
}>()

const title = ref('')
const description = ref('')
const category = ref('')
const language = ref('')
const icon = ref('file-archive')
const iconColor = ref<string | undefined>(undefined)
const tagsText = ref('')
const zipFile = ref<File | null>(null)
const error = ref('')
const uploading = ref(false)
const dragOver = ref(false)

const fileInputRef = ref<HTMLInputElement>()

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    const file = input.files[0]
    if (file.size > MAX_FILE_SIZE) {
      error.value = '文件大小不能超过 20MB'
      zipFile.value = null
      if (fileInputRef.value) fileInputRef.value.value = ''
      return
    }
    zipFile.value = file
    error.value = ''
  }
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) {
    if (!file.name.endsWith('.zip')) {
      error.value = '仅支持 .zip 格式的脚本包'
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      error.value = '文件大小不能超过 20MB'
      return
    }
    zipFile.value = file
    error.value = ''
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function validate(): boolean {
  error.value = ''
  if (!title.value.trim()) {
    error.value = '请输入脚本名称'
    return false
  }
  if (!zipFile.value) {
    error.value = '请选择要上传的 .zip 文件'
    return false
  }
  if (!zipFile.value.name.endsWith('.zip')) {
    error.value = '仅支持 .zip 格式的脚本包'
    return false
  }
  if (zipFile.value.size > MAX_FILE_SIZE) {
    error.value = '文件大小不能超过 20MB'
    return false
  }
  return true
}

function onSubmit() {
  if (!validate()) return
  uploading.value = true

  const tags = tagsText.value
    .split(/[,，\s]+/)
    .map(t => t.trim())
    .filter(Boolean)

  setTimeout(() => {
    uploading.value = false
    emit('uploaded', {
      title: title.value.trim(),
      description: description.value.trim(),
      category: category.value,
      language: language.value,
      icon: icon.value,
      iconColor: iconColor.value,
      zipName: zipFile.value!.name,
      zipSize: zipFile.value!.size,
      tags,
      file: zipFile.value! as File
    })
  }, 600)
}

function removeFile() {
  zipFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="upload-overlay">
    <div class="upload-modal" role="dialog" aria-label="上传脚本">
      <div class="upload-modal__head">
        <h2 class="upload-modal__title">
          <Icon name="lucide:upload" size="18" class="upload-modal__title-icon" />
          上传脚本
        </h2>
        <button type="button" class="upload-modal__close" @click="emit('close')">
          <Icon name="lucide:x" size="18" />
        </button>
      </div>

      <form class="upload-form" @submit.prevent="onSubmit">
        <div class="upload-form__field">
          <label class="upload-form__label">脚本名称 *</label>
          <input v-model="title" type="text" class="upload-form__input" placeholder="例如：数据清洗脚本" maxlength="30" :disabled="uploading">
        </div>

        <div class="upload-form__field">
          <label class="upload-form__label">描述</label>
          <textarea
v-model="description" class="upload-form__textarea" placeholder="简要描述脚本的功能..." rows="3"
            :disabled="uploading" />
        </div>

        <div class="upload-form__field">
          <label class="upload-form__label">分类</label>
          <select v-model="category" class="upload-form__select">
            <option value="">选择分类</option>
            <option v-for="cat in SCRIPT_CATEGORIES" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>
        </div>
        <div class="upload-form__field">
          <label class="upload-form__label">编程语言</label>
          <select v-model="language" class="upload-form__select">
            <option value="">选择语言</option>
            <option v-for="lang in SCRIPT_LANGUAGES" :key="lang" :value="lang">
              {{ lang }}
            </option>
          </select>
        </div>
        <div class="upload-form__field">
          <WorkspaceWsIconPicker v-model="icon" v-model:color="iconColor" />
        </div>
        <div class="upload-form__field">
          <input
v-model="tagsText" type="text" class="upload-form__input" placeholder="以逗号分隔，例如：数据, 分析, 自动化"
            :disabled="uploading">
        </div>

        <div class="upload-form__field">
          <label class="upload-form__label">上传 .zip 包 *</label>
          <div
class="upload-dropzone"
            :class="{ 'upload-dropzone--active': dragOver, 'upload-dropzone--has-file': zipFile }"
            @drop.prevent="onDrop" @dragover="onDragOver" @dragleave="onDragLeave" @click="fileInputRef?.click()">
            <template v-if="!zipFile">
              <Icon name="lucide:file-archive" size="32" class="upload-dropzone__icon" />
              <p class="upload-dropzone__text">
                拖拽 .zip 文件到此处，或<span class="upload-dropzone__link">点击选择</span>
              </p>
              <p class="upload-dropzone__hint">仅支持 .zip 格式</p>
            </template>
            <template v-else>
              <Icon name="lucide:file-text" size="24" class="upload-dropzone__file-icon" />
              <div class="upload-dropzone__file-info">
                <span class="upload-dropzone__file-name">{{ zipFile.name }}</span>
                <span class="upload-dropzone__file-size">{{ (zipFile.size / 1024).toFixed(1) }} KB</span>
              </div>
              <button type="button" class="upload-dropzone__remove" @click.stop="removeFile">
                <Icon name="lucide:x" size="16" />
              </button>
            </template>
            <input ref="fileInputRef" type="file" accept=".zip" class="upload-dropzone__input" @change="onFileChange">
          </div>
        </div>

        <div v-if="error" class="upload-form__error" role="alert">
          <Icon name="lucide:alert-circle" size="15" />
          {{ error }}
        </div>

        <div class="upload-form__actions">
          <button type="button" class="upload-form__cancel" :disabled="uploading" @click="emit('close')">
            取消
          </button>
          <button type="submit" class="upload-form__submit" :disabled="uploading">
            <Icon v-if="uploading" name="lucide:loader-circle" size="16" class="upload-form__spinner" />
            {{ uploading ? '上传中...' : '上传' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.upload-overlay {
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

.upload-modal {
  width: min(480px, calc(100vw - 32px));
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--secondary-border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md), var(--shadow-glow-purple);
  animation: slideUp 0.2s ease;
}

.upload-modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.upload-modal__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-modal__title-icon {
  color: var(--accent);
}

.upload-modal__close {
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

.upload-modal__close:hover {
  background: var(--bg-muted);
  color: var(--text);
}

.upload-form {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.upload-form__field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.upload-form__label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

.upload-form__input {
  padding: 9px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
}

.upload-form__input:focus {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow-orange);
}

.upload-form__select {
  padding: 9px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
  cursor: pointer;
}

.upload-form__select:focus {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow-orange);
}

.upload-form__select option {
  background: var(--bg-elevated);
  color: var(--text);
}

.upload-form__textarea {
  padding: 9px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--text);
  outline: none;
  resize: vertical;
  min-height: 72px;
  transition: border-color 0.15s;
}

.upload-form__select {
  padding: 9px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
  cursor: pointer;
}

.upload-form__select:focus {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow-orange);
}

.upload-form__select option {
  background: var(--bg-elevated);
  color: var(--text);
}

.upload-form__textarea:focus {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow-orange);
}

.upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 28px 16px;
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  position: relative;
  min-height: 100px;
}

.upload-dropzone:hover {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.upload-dropzone--active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.upload-dropzone--has-file {
  flex-direction: row;
  justify-content: flex-start;
  gap: 12px;
  padding: 16px;
  border-style: solid;
  border-color: var(--border);
  cursor: default;
  min-height: auto;
}

.upload-dropzone__icon {
  color: var(--text-muted);
}

.upload-dropzone__text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-align: center;
}

.upload-dropzone__link {
  color: var(--accent);
  font-weight: 600;
}

.upload-dropzone__hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.upload-dropzone__file-icon {
  color: var(--accent);
  flex-shrink: 0;
}

.upload-dropzone__file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.upload-dropzone__file-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-dropzone__file-size {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.upload-dropzone__remove {
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
  transition: background 0.12s, color 0.12s;
}

.upload-dropzone__remove:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.upload-dropzone__input {
  display: none;
}

.upload-form__error {
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

.upload-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.upload-form__cancel {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  transition: background 0.12s, border-color 0.12s;
}

.upload-form__cancel:hover:not(:disabled) {
  background: var(--bg-muted);
  border-color: var(--border-strong);
}

.upload-form__submit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  background: var(--gradient-orange);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
  transition: transform 0.15s, opacity 0.15s;
}

.upload-form__submit:hover:not(:disabled) {
  transform: translateY(-1px);
}

.upload-form__submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.upload-form__spinner {
  animation: spin 0.8s linear infinite;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
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
  to {
    transform: rotate(360deg);
  }
}
</style>
