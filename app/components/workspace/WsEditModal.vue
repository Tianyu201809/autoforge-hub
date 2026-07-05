<script setup lang="ts">
import type { Script } from "~/types/workspace"

const props = defineProps<{ script: Script }>()
const emit = defineEmits<{ close: []; saved: [payload: { id: string; title: string; description: string; tags: string[] }] }>()

const title = ref(props.script.title)
const description = ref(props.script.description)
const tagsText = ref(props.script.tags.join(", "))
const category = ref(props.script.category || "")
const language = ref(props.script.language || "")
const error = ref("")
const saving = ref(false)

function validate(): boolean {
  error.value = ""
  if (!title.value.trim()) { error.value = "请输入脚本名称"; return false }
  return true
}

function onSubmit() {
  if (!validate()) return
  saving.value = true
  const tags = tagsText.value.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean)
  setTimeout(() => {
    saving.value = false
    emit("saved", { id: props.script.id, title: title.value.trim(), description: description.value.trim(), tags })
  }, 300)
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-label="编辑脚本">
      <div class="modal__head">
        <h2 class="modal__title"><Icon name="lucide:pencil" size="18" class="modal__title-icon" /> 编辑脚本</h2>
        <button type="button" class="modal__close" @click="emit('close')"><Icon name="lucide:x" size="18" /></button>
      </div>
      <form class="modal-form" @submit.prevent="onSubmit">
        <div class="modal-form__field">
          <label class="modal-form__label">脚本名称 *</label>
          <input v-model="title" type="text" class="modal-form__input" placeholder="输入脚本名称" maxlength="50" :disabled="saving">
        </div>
        <div class="modal-form__field">
          <label class="modal-form__label">描述</label>
          <textarea v-model="description" class="modal-form__textarea" placeholder="简要描述脚本的功能" rows="3" maxlength="200" :disabled="saving" />
        </div>
        <div class="modal-form__field">
          <label class="modal-form__label">分类</label>
          <select v-model="category" class="modal-form__input">
            <option value="">选择分类</option>
            <option value="数据处理">数据处理</option>
            <option value="自动化">自动化</option>
            <option value="DevOps">DevOps</option>
            <option value="Web 开发">Web 开发</option>
            <option value="AI/ML">AI/ML</option>
            <option value="数据库">数据库</option>
            <option value="监控">监控</option>
            <option value="安全">安全</option>
            <option value="测试">测试</option>
            <option value="其他">其他</option>
          </select>
        </div>
        <div class="modal-form__field">
          <label class="modal-form__label">编程语言</label>
          <select v-model="language" class="modal-form__input">
            <option value="">选择语言</option>
            <option value="Python">Python</option>
            <option value="JavaScript">JavaScript</option>
            <option value="TypeScript">TypeScript</option>
            <option value="Go">Go</option>
            <option value="Rust">Rust</option>
            <option value="Bash">Bash</option>
            <option value="PowerShell">PowerShell</option>
            <option value="Java">Java</option>
            <option value="Ruby">Ruby</option>
            <option value="其他">其他</option>
          </select>
        </div>
        <div class="modal-form__field">
          <label class="modal-form__label">标签</label>
          <input v-model="tagsText" type="text" class="modal-form__input" placeholder="逗号分隔，例如：数据, 分析" :disabled="saving">
        </div>
        <div v-if="error" class="modal-form__error" role="alert"><Icon name="lucide:alert-circle" size="15" /> {{ error }}</div>
        <div class="modal-form__actions">
          <button type="button" class="modal-form__cancel" @click="emit('close')" :disabled="saving">取消</button>
          <button type="submit" class="modal-form__submit" :disabled="saving">
            <Icon v-if="saving" name="lucide:loader-circle" size="16" class="modal-form__spinner" />
            {{ saving ? "保存中..." : "保存" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--overlay-bg);backdrop-filter:blur(8px);animation:fadeIn .15s ease}
.modal{width:min(440px,calc(100vw - 32px));border:1px solid var(--accent-border);border-radius:var(--radius-lg);background:var(--bg-elevated);box-shadow:var(--shadow-md),var(--shadow-glow-orange);animation:slideUp .2s ease}
.modal__head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid var(--border)}
.modal__title{margin:0;font-size:var(--text-lg);font-weight:700;display:flex;align-items:center;gap:8px}
.modal__title-icon{color:var(--accent)}
.modal__close{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:none;border-radius:var(--radius-sm);background:transparent;color:var(--text-muted);transition:background .12s,color .12s}
.modal__close:hover{background:var(--bg-muted);color:var(--text)}
.modal-form{padding:16px 20px 20px;display:flex;flex-direction:column;gap:14px}
.modal-form__field{display:flex;flex-direction:column;gap:5px}
.modal-form__label{font-size:var(--text-sm);font-weight:600;color:var(--text-secondary)}
.modal-form__input{padding:9px 12px;border:1px solid var(--border-strong);border-radius:var(--radius-md);background:var(--bg-muted);font-family:inherit;font-size:var(--text-base);color:var(--text);outline:none;transition:border-color .15s}
.modal-form__input:focus{border-color:var(--accent-border);box-shadow:var(--shadow-glow-orange)}
.modal-form__textarea{padding:9px 12px;border:1px solid var(--border-strong);border-radius:var(--radius-md);background:var(--bg-muted);font-family:inherit;font-size:var(--text-base);color:var(--text);outline:none;resize:vertical;min-height:64px;transition:border-color .15s}
.modal-form__textarea:focus{border-color:var(--accent-border);box-shadow:var(--shadow-glow-orange)}
.modal-form__error{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:var(--radius-sm);background:var(--danger-soft);border:1px solid var(--danger-border);font-size:var(--text-sm);color:var(--danger)}
.modal-form__actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}
.modal-form__cancel{padding:8px 16px;border:1px solid var(--border);border-radius:var(--radius-md);background:transparent;font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);transition:background .12s,border-color .12s}
.modal-form__cancel:hover:not(:disabled){background:var(--bg-muted);border-color:var(--border-strong)}
.modal-form__submit{display:inline-flex;align-items:center;gap:6px;padding:8px 20px;border:1px solid var(--accent-border);border-radius:var(--radius-md);background:var(--gradient-orange);font-size:var(--text-sm);font-weight:600;color:var(--btn-primary-text);box-shadow:var(--shadow-glow-orange);transition:transform .15s,opacity .15s}
.modal-form__submit:hover:not(:disabled){transform:translateY(-1px)}
.modal-form__submit:disabled{opacity:.7;cursor:not-allowed}
.modal-form__spinner{animation:spin .8s linear infinite}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
</style>