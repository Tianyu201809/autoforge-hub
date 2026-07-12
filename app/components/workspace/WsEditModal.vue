<script setup lang="ts">
import type { Script } from "~/types/workspace"
import { SCRIPT_CATEGORIES, SCRIPT_LANGUAGES } from "~/types/workspace"

const props = defineProps<{ script: Script }>()
const emit = defineEmits<{
  close: []
  saved: [payload: {
    id: string
    title: string
    description: string
    readme: string
    tags: string[]
    icon: string
    iconColor?: string
    category: string
    language: string
  }]
}>()

const title = ref(props.script.title)
const description = ref(props.script.description)
const readme = ref(props.script.readme || "")
const readmeTab = ref<'edit' | 'preview'>('edit')
const tagsText = ref(props.script.tags.join(", "))
const category = ref(props.script.category || "")
const language = ref(props.script.language || "")
const icon = ref(props.script.icon || "file-archive")
const iconColor = ref<string | undefined>(props.script.iconColor)
const error = ref("")
const saving = ref(false)

function validate(): boolean {
  error.value = ""
  if (!title.value.trim()) {
    error.value = "请输入脚本名称"
    return false
  }
  return true
}

function onSubmit() {
  if (!validate()) return
  saving.value = true
  const tags = tagsText.value.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean)
  setTimeout(() => {
    saving.value = false
    emit("saved", {
      id: props.script.id,
      title: title.value.trim(),
      description: description.value.trim(),
      readme: readme.value,
      tags,
      icon: icon.value,
      iconColor: iconColor.value,
      category: category.value,
      language: language.value
    })
  }, 300)
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-label="编辑脚本">
      <div class="modal__head">
        <div>
          <h2 class="modal__title">
            <Icon name="lucide:pencil" size="18" class="modal__title-icon" />
            编辑脚本
          </h2>
          <p class="modal__subtitle">更新脚本信息与说明书</p>
        </div>
        <button type="button" class="modal__close" @click="emit('close')">
          <Icon name="lucide:x" size="18" />
        </button>
      </div>

      <form class="modal-form" @submit.prevent="onSubmit">
        <div class="modal__body">
          <div class="modal__pane modal__pane--form">
            <div class="modal-form__field">
              <label class="modal-form__label">脚本名称 *</label>
              <input v-model="title" type="text" class="modal-form__input" placeholder="输入脚本名称" maxlength="30" :disabled="saving">
            </div>

            <div class="modal-form__field">
              <label class="modal-form__label">描述</label>
              <textarea v-model="description" class="modal-form__textarea" placeholder="简要描述脚本的功能" rows="3" maxlength="150" :disabled="saving" />
            </div>

            <div class="modal-form__row">
              <div class="modal-form__field">
                <label class="modal-form__label">分类</label>
                <select v-model="category" class="modal-form__input" :disabled="saving">
                  <option value="">选择分类</option>
                  <option v-for="cat in SCRIPT_CATEGORIES" :key="cat" :value="cat">
                    {{ cat }}
                  </option>
                </select>
              </div>
              <div class="modal-form__field">
                <label class="modal-form__label">编程语言</label>
                <select v-model="language" class="modal-form__input" :disabled="saving">
                  <option value="">选择语言</option>
                  <option v-for="lang in SCRIPT_LANGUAGES" :key="lang" :value="lang">
                    {{ lang }}
                  </option>
                </select>
              </div>
            </div>

            <div class="modal-form__field">
              <WorkspaceWsIconPicker v-model="icon" v-model:color="iconColor" />
            </div>

            <div class="modal-form__field">
              <label class="modal-form__label">标签</label>
              <input v-model="tagsText" type="text" class="modal-form__input" placeholder="逗号分隔，例如：数据, 分析" :disabled="saving">
            </div>
          </div>

          <div class="modal__pane modal__pane--docs">
            <div class="modal-docs__head">
              <div>
                <label class="modal-form__label">说明书</label>
                <p class="modal-docs__hint">支持 Markdown，最多 50000 字</p>
              </div>
              <div class="modal-docs__tabs" role="tablist" aria-label="说明书编辑模式">
                <button
                  type="button"
                  class="modal-docs__tab"
                  :class="{ 'modal-docs__tab--active': readmeTab === 'edit' }"
                  @click="readmeTab = 'edit'"
                >
                  编辑
                </button>
                <button
                  type="button"
                  class="modal-docs__tab"
                  :class="{ 'modal-docs__tab--active': readmeTab === 'preview' }"
                  @click="readmeTab = 'preview'"
                >
                  预览
                </button>
              </div>
            </div>

            <textarea
              v-if="readmeTab === 'edit'"
              v-model="readme"
              class="modal-docs__textarea"
              placeholder="# 使用说明&#10;&#10;写下安装方式、参数说明、示例和注意事项..."
              maxlength="50000"
              :disabled="saving"
            />
            <ClientOnly v-else>
              <div class="modal-docs__preview">
                <WorkspaceWsMarkdown v-if="readme.trim()" :source="readme" />
                <p v-else class="modal-docs__empty">暂无说明书</p>
              </div>
            </ClientOnly>
          </div>
        </div>

        <div class="modal__footer">
          <div v-if="error" class="modal-form__error" role="alert">
            <Icon name="lucide:alert-circle" size="15" />
            {{ error }}
          </div>
          <div class="modal-form__actions">
            <button type="button" class="modal-form__cancel" :disabled="saving" @click="emit('close')">
              取消
            </button>
            <button type="submit" class="modal-form__submit" :disabled="saving">
              <Icon v-if="saving" name="lucide:loader-circle" size="16" class="modal-form__spinner" />
              {{ saving ? "保存中..." : "保存" }}
            </button>
          </div>
        </div>
      </form>
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
  display: flex;
  flex-direction: column;
  width: min(960px, calc(100vw - 32px));
  max-height: min(88vh, 720px);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md), var(--shadow-glow-orange);
  overflow: hidden;
  animation: slideUp 0.2s ease;
}

.modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
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

.modal__subtitle {
  margin: 5px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.modal__title-icon {
  color: var(--accent);
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

.modal__close:hover {
  background: var(--bg-muted);
  color: var(--text);
}

.modal-form {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.modal__body {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(320px, 1.05fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
  padding: 16px 20px;
  overflow-y: auto;
}

.modal__pane {
  min-width: 0;
}

.modal__pane--form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal__pane--docs {
  display: flex;
  min-height: 360px;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  overflow: hidden;
}

.modal-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.modal-form__field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.modal-form__label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

.modal-form__input,
.modal-form__textarea,
.modal-docs__textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.modal-form__input,
.modal-form__textarea {
  padding: 9px 12px;
}

.modal-form__input:focus,
.modal-form__textarea:focus,
.modal-docs__textarea:focus {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow-orange);
}

select.modal-form__input {
  cursor: pointer;
}

select.modal-form__input option {
  background: var(--bg-elevated);
  color: var(--text);
}

.modal-form__textarea {
  resize: vertical;
  min-height: 72px;
}

.modal-docs__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);
}

.modal-docs__hint {
  margin: 4px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.modal-docs__tabs {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}

.modal-docs__tab {
  padding: 5px 10px;
  border: none;
  border-radius: calc(var(--radius-sm) - 2px);
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
}

.modal-docs__tab--active {
  background: var(--bg-elevated);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.modal-docs__textarea {
  flex: 1;
  min-height: 0;
  padding: 14px;
  border: none;
  border-radius: 0;
  resize: none;
  line-height: 1.6;
}

.modal-docs__preview {
  flex: 1;
  min-height: 0;
  padding: 14px;
  overflow-y: auto;
}

.modal-docs__empty {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.modal__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}

.modal-form__error {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
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
  margin-left: auto;
}

.modal-form__cancel {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  transition: background 0.12s, border-color 0.12s;
}

.modal-form__cancel:hover:not(:disabled) {
  background: var(--bg-muted);
  border-color: var(--border-strong);
}

.modal-form__submit {
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

@media (max-width: 800px) {
  .modal__body {
    grid-template-columns: 1fr;
  }

  .modal__pane--docs {
    min-height: 300px;
  }

  .modal-form__row {
    grid-template-columns: 1fr;
  }

  .modal__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .modal-form__actions {
    width: 100%;
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
