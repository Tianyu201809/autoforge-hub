<script setup lang="ts">
const emit = defineEmits<{
  close: []
  created: [payload: { name: string; description: string }]
}>()

const name = ref('')
const description = ref('')
const error = ref('')
const creating = ref(false)

function validate(): boolean {
  error.value = ''
  if (!name.value.trim()) {
    error.value = '请输入团队名称'
    return false
  }
  if (name.value.trim().length > 30) {
    error.value = '团队名称不能超过 30 个字符'
    return false
  }
  if (description.value.length > 200) {
    error.value = '描述不能超过 200 个字符'
    return false
  }
  return true
}

function onSubmit() {
  if (!validate()) return
  creating.value = true
  setTimeout(() => {
    creating.value = false
    emit('created', {
      name: name.value.trim(),
      description: description.value.trim()
    })
  }, 400)
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-label="创建团队">
      <div class="modal__head">
        <h2 class="modal__title">
          <Icon name="lucide:group" size="18" class="modal__title-icon" />
          创建团队
        </h2>
        <button type="button" class="modal__close" @click="emit('close')">
          <Icon name="lucide:x" size="18" />
        </button>
      </div>

      <form class="modal-form" @submit.prevent="onSubmit">
        <div class="modal-form__field">
          <label class="modal-form__label">团队名称 *</label>
          <input
            v-model="name"
            type="text"
            class="modal-form__input"
            placeholder="例如：前端开发组"
            maxlength="30"
            :disabled="creating"
          >
          <span class="modal-form__hint">{{ name.length }}/30</span>
        </div>

        <div class="modal-form__field">
          <label class="modal-form__label">描述</label>
          <textarea
            v-model="description"
            class="modal-form__textarea"
            placeholder="简要说明团队的目标和方向..."
            rows="3"
            maxlength="200"
            :disabled="creating"
          />
          <span class="modal-form__hint">{{ description.length }}/200</span>
        </div>

        <div v-if="error" class="modal-form__error" role="alert">
          <Icon name="lucide:alert-circle" size="15" />
          {{ error }}
        </div>

        <div class="modal-form__actions">
          <button type="button" class="modal-form__cancel" @click="emit('close')" :disabled="creating">
            取消
          </button>
          <button type="submit" class="modal-form__submit" :disabled="creating">
            <Icon v-if="creating" name="lucide:loader-circle" size="16" class="modal-form__spinner" />
            {{ creating ? '创建中...' : '创建团队' }}
          </button>
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
  width: min(440px, calc(100vw - 32px));
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

.modal__close:hover {
  background: var(--bg-muted);
  color: var(--text);
}

.modal-form {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
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

.modal-form__input {
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

.modal-form__input:focus {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow-orange);
}

.modal-form__textarea {
  padding: 9px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--text);
  outline: none;
  resize: vertical;
  min-height: 64px;
  transition: border-color 0.15s;
}

.modal-form__textarea:focus {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow-orange);
}

.modal-form__hint {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-align: right;
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
