<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  label: string
  type?: string
  icon?: string
  placeholder?: string
  autocomplete?: string
  error?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPassword = ref(false)

const inputType = computed(() => {
  if (props.type !== 'password') return props.type ?? 'text'
  return showPassword.value ? 'text' : 'password'
})

const toggleIcon = computed(() =>
  showPassword.value ? 'lucide:eye-off' : 'lucide:eye'
)
</script>

<template>
  <div class="auth-field">
    <label class="auth-field__label">{{ label }}</label>
    <div
      class="auth-field__wrap"
      :class="{ 'auth-field__wrap--error': error }"
    >
      <Icon
        v-if="icon"
        :name="icon"
        size="18"
        class="auth-field__icon"
      />
      <input
        :value="modelValue"
        :type="inputType"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        class="auth-field__input"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <button
        v-if="type === 'password'"
        type="button"
        class="auth-field__toggle"
        :aria-label="showPassword ? '隐藏密码' : '显示密码'"
        :disabled="disabled"
        tabindex="-1"
        @click="showPassword = !showPassword"
      >
        <Icon :name="toggleIcon" size="16" />
      </button>
    </div>
    <p v-if="error" class="auth-field__error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.auth-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-field__label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.auth-field__wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 4px 4px 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.auth-field__wrap:focus-within {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow-orange);
}

.auth-field__wrap--error {
  border-color: var(--danger-border);
}

.auth-field__wrap--error:focus-within {
  box-shadow: 0 0 0 3px var(--danger-soft);
}

.auth-field__icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.auth-field__input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px 8px 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--text);
  outline: none;
}

.auth-field__input::placeholder {
  color: var(--text-muted);
}

.auth-field__input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-field__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  flex-shrink: 0;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.auth-field__toggle:hover {
  color: var(--text-secondary);
  background: var(--bg-muted);
}

.auth-field__toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-field__error {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--danger);
}
</style>
