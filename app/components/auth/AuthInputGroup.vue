<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  label: string
  placeholder?: string
  type?: string
  autocomplete?: string
  error?: string
  disabled?: boolean
  hint?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPassword = ref(false)

const inputType = computed(() => {
  if (props.type !== 'password') return props.type ?? 'text'
  return showPassword.value ? 'text' : 'password'
})
</script>

<template>
  <div class="auth-input">
    <label class="auth-input__label">{{ label }}</label>
    <div class="auth-input__wrap" :class="{ 'auth-input__wrap--error': error }">
      <input
        :value="modelValue"
        :type="inputType"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        class="auth-input__field"
        :class="{ 'auth-input__field--with-eye': type === 'password' }"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <button
        v-if="type === 'password'"
        type="button"
        class="auth-input__eye"
        :aria-label="showPassword ? '隐藏密码' : '显示密码'"
        :disabled="disabled"
        tabindex="-1"
        @click="showPassword = !showPassword"
      >
        <Icon :name="showPassword ? 'lucide:eye-off' : 'lucide:eye'" size="16" />
      </button>
    </div>
    <p v-if="error" class="auth-input__error" role="alert">{{ error }}</p>
    <p v-else-if="hint" class="auth-input__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.auth-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-input__label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.auth-input__wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.auth-input__field {
  width: 100%;
  height: 44px;
  padding: 0 16px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.auth-input__field--with-eye {
  padding-right: 44px;
}

.auth-input__field::placeholder {
  color: var(--text-muted);
}

.auth-input__field:focus {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow-orange);
}

.auth-input__field:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-input__wrap--error .auth-input__field {
  border-color: var(--danger-border);
  box-shadow: 0 0 0 3px var(--danger-soft);
}

.auth-input__eye {
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.auth-input__eye:hover:not(:disabled) {
  color: var(--text-secondary);
  background: var(--bg-elevated);
}

.auth-input__eye:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-input__error {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--danger);
}

.auth-input__hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>
