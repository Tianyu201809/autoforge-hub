<script setup lang="ts">
import { SCRIPT_CATEGORIES, SCRIPT_LANGUAGES } from "~/types/workspace"
import { extractRootReadme } from "#shared/utils/zip-readme"

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
    readme: string
  }]
}>()

const title = ref("")
const description = ref("")
const readme = ref("")
const paneTab = ref<"spec" | "docs">("spec")
const readmeTab = ref<"edit" | "preview">("edit")
const category = ref("")
const language = ref("")
const icon = ref("file-archive")
const iconColor = ref<string | undefined>(undefined)
const tagsText = ref("")
const zipFile = ref<File | null>(null)
const error = ref("")
const uploading = ref(false)
const readmeImporting = ref(false)
const dragOver = ref(false)
let zipSelectionVersion = 0

const fileInputRef = ref<HTMLInputElement>()

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const hasZip = computed(() => Boolean(zipFile.value))

function deriveTitleFromZip(fileName: string): string {
  const withoutExt = fileName.replace(/\.zip$/i, "").trim()
  return (withoutExt || "未命名脚本").slice(0, 30)
}

async function applyZipFile(file: File) {
  const selectionVersion = ++zipSelectionVersion
  readmeImporting.value = false
  if (!file.name.toLowerCase().endsWith(".zip")) {
    error.value = "仅支持 .zip 格式的脚本包"
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    error.value = "文件大小不能超过 20MB"
    zipFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ""
    return
  }

  zipFile.value = file
  title.value = deriveTitleFromZip(file.name)
  error.value = ""

  readmeImporting.value = true
  try {
    const readmeFromZip = extractRootReadme(new Uint8Array(await file.arrayBuffer()))
    if (selectionVersion !== zipSelectionVersion || readmeFromZip === null) return
    if (!readme.value.trim()) {
      readme.value = readmeFromZip
      return
    }
    if (readme.value === readmeFromZip) return
    if (window.confirm("ZIP 根目录检测到 README.md，是否覆盖当前说明书？")) {
      readme.value = readmeFromZip
    }
  } catch (parseError) {
    console.warn("[WsUploadModal] failed to extract root README.md:", parseError)
  } finally {
    if (selectionVersion === zipSelectionVersion) readmeImporting.value = false
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    void applyZipFile(input.files[0])
  }
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) void applyZipFile(file)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function validate(): boolean {
  error.value = ""
  if (!zipFile.value) {
    error.value = "请先选择要上传的 .zip 文件"
    return false
  }
  if (!title.value.trim()) {
    error.value = "脚本名称会由 ZIP 文件名自动生成，请重新选择文件"
    return false
  }
  if (!zipFile.value.name.toLowerCase().endsWith(".zip")) {
    error.value = "仅支持 .zip 格式的脚本包"
    return false
  }
  if (zipFile.value.size > MAX_FILE_SIZE) {
    error.value = "文件大小不能超过 20MB"
    return false
  }
  return true
}

function onSubmit() {
  if (readmeImporting.value) {
    error.value = "正在读取 ZIP 中的说明书，请稍候"
    return
  }
  if (!validate()) return
  uploading.value = true

  const tags = tagsText.value
    .split(/[,，\s]+/)
    .map(t => t.trim())
    .filter(Boolean)

  setTimeout(() => {
    uploading.value = false
    emit("uploaded", {
      title: title.value.trim(),
      description: description.value.trim(),
      readme: readme.value,
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
  title.value = ""
  if (fileInputRef.value) fileInputRef.value.value = ""
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}
</script>

<template>
  <div class="upload-overlay" @click.self="emit('close')">
    <div class="upload-modal" role="dialog" aria-label="上传脚本">
      <div class="upload-modal__head">
        <div>
          <h2 class="upload-modal__title">
            <Icon name="lucide:upload" size="18" class="upload-modal__title-icon" />
            上传脚本
          </h2>
          <p class="upload-modal__subtitle">先上传 ZIP 包，系统会自动生成脚本名称，再补充展示信息与说明书</p>
        </div>
        <button type="button" class="upload-modal__close" aria-label="关闭" @click="emit('close')">
          <Icon name="lucide:x" size="18" />
        </button>
      </div>

      <form class="upload-form" @submit.prevent="onSubmit">
        <div class="upload-modal__steps" aria-label="上传步骤">
          <div class="upload-step upload-step--done">
            <span class="upload-step__index">1</span>
            <span class="upload-step__text">上传 ZIP</span>
          </div>
          <div class="upload-step__line" :class="{ 'upload-step__line--active': hasZip }" />
          <div class="upload-step" :class="{ 'upload-step--done': hasZip }">
            <span class="upload-step__index">2</span>
            <span class="upload-step__text">补充信息</span>
          </div>
        </div>

        <div class="upload-modal__body">
          <div class="upload-modal__pane upload-modal__pane--form">
            <section class="upload-section upload-section--zip" aria-labelledby="upload-zip-title">
              <div class="upload-section__head">
                <div>
                  <h3 id="upload-zip-title" class="upload-section__title">上传 .zip 包</h3>
                  <p class="upload-section__desc">选择后自动带入脚本名称，无需手动填写</p>
                </div>
                <span class="upload-section__badge">必填</span>
              </div>

              <div
                class="upload-dropzone"
                :class="{ 'upload-dropzone--active': dragOver, 'upload-dropzone--has-file': zipFile }"
                @drop.prevent="onDrop"
                @dragover="onDragOver"
                @dragleave="onDragLeave"
                @click="fileInputRef?.click()"
              >
                <template v-if="!zipFile">
                  <Icon name="lucide:file-archive" size="34" class="upload-dropzone__icon" />
                  <p class="upload-dropzone__text">
                    拖拽 .zip 文件到此处，或<span class="upload-dropzone__link">点击选择</span>
                  </p>
                  <p class="upload-dropzone__hint">仅支持 .zip 格式，最大 20MB</p>
                </template>
                <template v-else>
                  <div class="upload-dropzone__file-mark">
                    <Icon name="lucide:package-check" size="22" />
                  </div>
                  <div class="upload-dropzone__file-info">
                    <span class="upload-dropzone__file-label">已选择脚本包</span>
                    <span class="upload-dropzone__file-name">{{ zipFile.name }}</span>
                    <span class="upload-dropzone__file-size">{{ formatSize(zipFile.size) }}</span>
                  </div>
                  <button type="button" class="upload-dropzone__remove" title="移除文件" @click.stop="removeFile">
                    <Icon name="lucide:x" size="16" />
                  </button>
                </template>
                <input ref="fileInputRef" type="file" accept=".zip" class="upload-dropzone__input" @change="onFileChange">
              </div>
            </section>

            <section class="upload-section" :class="{ 'upload-section--muted': !hasZip }" aria-labelledby="upload-info-title">
              <div class="upload-section__head">
                <div>
                  <h3 id="upload-info-title" class="upload-section__title">脚本信息</h3>
                  <p class="upload-section__desc">{{ hasZip ? '这些信息会显示在脚本卡片与详情页' : '先选择 ZIP 包后继续填写' }}</p>
                </div>
              </div>

              <div class="upload-form__field">
                <label class="upload-form__label">脚本名称</label>
                <input v-model="title" type="text" class="upload-form__input" placeholder="选择 ZIP 后自动生成，可手动修改" maxlength="30" :disabled="uploading || !hasZip">
              </div>

              <div class="upload-form__field">
                <label class="upload-form__label">描述</label>
                <textarea v-model="description" class="upload-form__textarea" placeholder="简要描述脚本的功能..." rows="3" maxlength="150" :disabled="uploading || !hasZip" />
              </div>

              <div class="upload-form__row">
                <div class="upload-form__field">
                  <label class="upload-form__label">分类</label>
                  <select v-model="category" class="upload-form__select" :disabled="uploading || !hasZip">
                    <option value="">选择分类</option>
                    <option v-for="cat in SCRIPT_CATEGORIES" :key="cat" :value="cat">
                      {{ cat }}
                    </option>
                  </select>
                </div>
                <div class="upload-form__field">
                  <label class="upload-form__label">编程语言</label>
                  <select v-model="language" class="upload-form__select" :disabled="uploading || !hasZip">
                    <option value="">选择语言</option>
                    <option v-for="lang in SCRIPT_LANGUAGES" :key="lang" :value="lang">
                      {{ lang }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="upload-form__field">
                <WorkspaceWsIconPicker v-model="icon" v-model:color="iconColor" />
              </div>

              <div class="upload-form__field">
                <label class="upload-form__label">标签</label>
                <input v-model="tagsText" type="text" class="upload-form__input" placeholder="以逗号分隔，例如：数据, 分析, 自动化" :disabled="uploading || !hasZip">
              </div>
            </section>
          </div>

          <div class="upload-modal__pane upload-modal__pane--docs">
            <div class="upload-docs__head">
              <div class="upload-docs__pane-tabs" role="tablist" aria-label="右侧面板">
                <button
                  type="button"
                  class="upload-docs__pane-tab"
                  role="tab"
                  :aria-selected="paneTab === 'spec'"
                  :class="{ 'upload-docs__pane-tab--active': paneTab === 'spec' }"
                  @click="paneTab = 'spec'"
                >
                  <Icon name="lucide:package-check" size="13" />
                  上传规格
                </button>
                <button
                  type="button"
                  class="upload-docs__pane-tab"
                  role="tab"
                  :aria-selected="paneTab === 'docs'"
                  :class="{ 'upload-docs__pane-tab--active': paneTab === 'docs' }"
                  @click="paneTab = 'docs'"
                >
                  <Icon name="lucide:file-text" size="13" />
                  使用说明
                </button>
              </div>

              <div v-if="paneTab === 'docs'" class="upload-docs__tabs" role="tablist" aria-label="使用说明编辑模式">
                <button
                  type="button"
                  class="upload-docs__tab"
                  :class="{ 'upload-docs__tab--active': readmeTab === 'edit' }"
                  @click="readmeTab = 'edit'"
                >
                  编辑
                </button>
                <button
                  type="button"
                  class="upload-docs__tab"
                  :class="{ 'upload-docs__tab--active': readmeTab === 'preview' }"
                  @click="readmeTab = 'preview'"
                >
                  预览
                </button>
              </div>
              <p v-else class="upload-docs__hint">script-spec · autoforge 1.0</p>
            </div>

            <div v-if="paneTab === 'spec'" class="upload-docs__spec">
              <ClientOnly>
                <WorkspaceWsZipSpecGuide :active="true" />
              </ClientOnly>
            </div>

            <template v-else>
              <p class="upload-docs__subhint">支持 Markdown，最多 50000 字</p>
              <textarea
                v-if="readmeTab === 'edit'"
                v-model="readme"
                class="upload-docs__textarea"
                placeholder="# 使用说明&#10;&#10;写下安装方式、参数说明、示例和注意事项..."
                maxlength="50000"
                :disabled="uploading"
              />
              <ClientOnly v-else>
                <div class="upload-docs__preview">
                  <WorkspaceWsMarkdown v-if="readme.trim()" :source="readme" />
                  <p v-else class="upload-docs__empty">暂无使用说明</p>
                </div>
              </ClientOnly>
            </template>
          </div>
        </div>

        <div class="upload-modal__footer">
          <div v-if="error" class="upload-form__error" role="alert">
            <Icon name="lucide:alert-circle" size="15" />
            {{ error }}
          </div>
          <div v-else class="upload-modal__footer-hint">
            <Icon name="lucide:info" size="14" />
            {{ hasZip ? '确认信息后即可上传' : '请先选择 ZIP 文件' }}
          </div>
          <div class="upload-form__actions">
            <button type="button" class="upload-form__cancel" :disabled="uploading" @click="emit('close')">
              取消
            </button>
            <button type="submit" class="upload-form__submit" :disabled="uploading || readmeImporting">
              <Icon v-if="uploading" name="lucide:loader-circle" size="16" class="upload-form__spinner" />
              {{ uploading ? '上传中...' : readmeImporting ? '读取说明中...' : '上传脚本' }}
            </button>
          </div>
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
  display: flex;
  flex-direction: column;
  width: min(1040px, calc(100vw - 32px));
  max-height: min(90vh, 760px);
  border: 1px solid var(--secondary-border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md), var(--shadow-glow-purple);
  overflow: hidden;
  animation: slideUp 0.2s ease;
}

.upload-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--border);
}

.upload-modal__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
}

.upload-modal__subtitle {
  margin: 5px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
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
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.upload-modal__steps {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 22px;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-muted) 74%, transparent);
}

.upload-step {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
}

.upload-step--done {
  color: var(--accent);
}

.upload-step__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  background: var(--bg-elevated);
  color: inherit;
  font-size: 12px;
}

.upload-step--done .upload-step__index {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.upload-step__line {
  width: 42px;
  height: 1px;
  background: var(--border-strong);
}

.upload-step__line--active {
  background: var(--accent-border);
}

.upload-modal__body {
  display: grid;
  grid-template-columns: minmax(340px, 0.92fr) minmax(360px, 1.08fr);
  gap: 18px;
  flex: 1;
  min-height: 0;
  padding: 18px 22px;
  overflow-y: auto;
}

.upload-modal__pane {
  min-width: 0;
}

.upload-modal__pane--form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-modal__pane--docs {
  display: flex;
  min-height: 390px;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  overflow: hidden;
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 13px;
  padding-top: 2px;
}

.upload-section + .upload-section {
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.upload-section--muted {
  opacity: 0.72;
}

.upload-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.upload-section__title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--text);
}

.upload-section__desc {
  margin: 4px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.upload-section__badge {
  flex-shrink: 0;
  padding: 3px 8px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: var(--text-xs);
  font-weight: 700;
}

.upload-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
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

.upload-form__input,
.upload-form__select,
.upload-form__textarea,
.upload-docs__textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.upload-form__input,
.upload-form__select,
.upload-form__textarea {
  padding: 9px 12px;
}

.upload-form__input:focus,
.upload-form__select:focus,
.upload-form__textarea:focus,
.upload-docs__textarea:focus {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow-orange);
}

.upload-form__select {
  cursor: pointer;
}

.upload-form__select option {
  background: var(--bg-elevated);
  color: var(--text);
}

.upload-form__textarea {
  min-height: 76px;
  resize: vertical;
}

.upload-dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 136px;
  padding: 26px 16px;
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
}

.upload-dropzone:hover {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.upload-dropzone--active {
  border-color: var(--accent);
  background: var(--accent-soft);
  transform: translateY(-1px);
}

.upload-dropzone--has-file {
  min-height: 92px;
  flex-direction: row;
  justify-content: flex-start;
  gap: 12px;
  padding: 16px;
  border-style: solid;
  border-color: var(--accent-border);
  background: var(--accent-soft);
  cursor: pointer;
}

.upload-dropzone__icon {
  color: var(--text-muted);
}

.upload-dropzone__text {
  margin: 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.upload-dropzone__link {
  color: var(--accent);
  font-weight: 700;
}

.upload-dropzone__hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.upload-dropzone__file-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  color: var(--accent);
}

.upload-dropzone__file-info {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.upload-dropzone__file-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.upload-dropzone__file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text);
}

.upload-dropzone__file-size {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.upload-dropzone__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  transition: background 0.12s, color 0.12s;
}

.upload-dropzone__remove:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.upload-dropzone__input {
  display: none;
}

.upload-docs__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);
}

.upload-docs__pane-tabs,
.upload-docs__tabs {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}

.upload-docs__pane-tab,
.upload-docs__tab {
  border: none;
  border-radius: calc(var(--radius-sm) - 2px);
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
  transition: background 0.12s, color 0.12s;
}

.upload-docs__pane-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
}

.upload-docs__tab {
  padding: 5px 10px;
}

.upload-docs__pane-tab--active,
.upload-docs__tab--active {
  background: var(--bg-elevated);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.upload-docs__hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.upload-docs__subhint {
  margin: 0;
  padding: 8px 12px 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  background: var(--bg-muted);
}

.upload-docs__spec {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.upload-docs__textarea {
  flex: 1;
  min-height: 0;
  padding: 14px;
  border: none;
  border-radius: 0;
  resize: none;
  line-height: 1.6;
}

.upload-docs__preview {
  flex: 1;
  min-height: 0;
  padding: 14px;
  overflow-y: auto;
}

.upload-docs__empty {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.upload-modal__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 22px 18px;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}

.upload-modal__footer-hint,
.upload-form__error {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: var(--text-sm);
}

.upload-modal__footer-hint {
  color: var(--text-muted);
}

.upload-form__error {
  padding: 8px 12px;
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-sm);
  background: var(--danger-soft);
  color: var(--danger);
}

.upload-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-left: auto;
}

.upload-form__cancel,
.upload-form__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
}

.upload-form__cancel {
  padding: 8px 16px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  transition: background 0.12s, border-color 0.12s;
}

.upload-form__cancel:hover:not(:disabled) {
  background: var(--bg-muted);
  border-color: var(--border-strong);
}

.upload-form__submit {
  padding: 8px 20px;
  border: 1px solid var(--accent-border);
  background: var(--gradient-orange);
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

@media (max-width: 860px) {
  .upload-modal__body {
    grid-template-columns: 1fr;
  }

  .upload-modal__pane--docs {
    min-height: 320px;
  }

  .upload-form__row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .upload-overlay {
    padding: 12px;
  }

  .upload-modal {
    width: 100%;
    max-height: calc(100vh - 24px);
  }

  .upload-modal__head,
  .upload-modal__steps,
  .upload-modal__body,
  .upload-modal__footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .upload-docs__head,
  .upload-modal__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .upload-form__actions {
    width: 100%;
  }

  .upload-form__cancel,
  .upload-form__submit {
    flex: 1;
  }
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
  to {
    transform: rotate(360deg);
  }
}
</style>
