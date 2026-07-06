<script setup lang="ts">
import type { AuthTab } from '~/types/auth'
definePageMeta({
  layout: 'auth'
})

useHead({
  title: '登录 — Autoforge Hub'
})

const route = useRoute()
const { login, register } = useAuth()

const activeTab = ref<AuthTab>('login')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const rememberMe = ref(false)
const loading = ref(false)
const formError = ref('')
const successMessage = ref('')
const fieldErrors = ref<Record<string, string>>({})

const emailRef = ref<{ $el?: HTMLElement }>()

const subtitle = computed(() =>
  activeTab.value === 'login'
    ? '登录以管理你的脚本与团队空间'
    : '创建账号，开始上传与分享 zip 脚本包'
)

watch(activeTab, () => {
  formError.value = ''
  fieldErrors.value = {}
  successMessage.value = ''
  password.value = ''
  confirmPassword.value = ''
  nextTick(() => focusFirstField())
})

onMounted(() => {
  const registered = route.query.registered as string | undefined
  if (registered) {
    email.value = registered
    activeTab.value = 'login'
    successMessage.value = '账号已创建，请登录'
  }
  focusFirstField()
})

function focusFirstField() {
  const input = document.querySelector<HTMLInputElement>('.auth-form .auth-field__input')
  input?.focus()
}

function validateLogin(): boolean {
  const errors: Record<string, string> = {}
  if (!email.value.trim()) errors.email = '请输入邮箱'
  if (!password.value) errors.password = '请输入密码'
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

function validateRegister(): boolean {
  const errors: Record<string, string> = {}
  if (!email.value.trim()) errors.email = '请输入邮箱'
  if (!password.value) errors.password = '请输入密码'
  else if (password.value.length < 8) errors.password = '密码至少需要 8 位'
  if (!confirmPassword.value) errors.confirmPassword = '请确认密码'
  else if (confirmPassword.value !== password.value) errors.confirmPassword = '两次输入的密码不一致'
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function onSubmit() {
  formError.value = ''
  successMessage.value = ''

  if (activeTab.value === 'login') {
    if (!validateLogin()) return
    loading.value = true
    const result = await login(email.value, password.value, rememberMe.value)
    loading.value = false
    if (!result.ok) {
      formError.value = result.error
      return
    }
    const redirect = (route.query.redirect as string) || '/workspace'
    await navigateTo(redirect)
    return
  }

  if (!validateRegister()) return
  loading.value = true
  const result = await register(email.value, password.value)
  loading.value = false
  if (!result.ok) {
    formError.value = result.error
    return
  }
  activeTab.value = 'login'
  password.value = ''
  confirmPassword.value = ''
  successMessage.value = '账号已创建，请登录'
}
</script>

<template>
  <AuthCard :subtitle="subtitle">
    <AuthTabs v-model="activeTab" />

    <div
      v-if="formError"
      class="auth-alert auth-alert--error"
      role="alert"
    >
      {{ formError }}
    </div>
    <div
      v-else-if="successMessage"
      class="auth-alert auth-alert--success"
      role="status"
    >
      {{ successMessage }}
    </div>

    <form class="auth-form" @submit.prevent="onSubmit">
      <AuthField
        ref="emailRef"
        v-model="email"
        label="邮箱"
        type="email"
        icon="lucide:mail"
        placeholder="you@example.com"
        autocomplete="email"
        :error="fieldErrors.email"
        :disabled="loading"
        class="auth-form__field"
        style="animation-delay: 40ms"
      />

      <AuthField
        v-model="password"
        label="密码"
        type="password"
        icon="lucide:lock"
        placeholder="至少 8 位"
        :autocomplete="activeTab === 'login' ? 'current-password' : 'new-password'"
        :error="fieldErrors.password"
        :disabled="loading"
        class="auth-form__field"
        style="animation-delay: 80ms"
      />

      <AuthField
        v-if="activeTab === 'register'"
        v-model="confirmPassword"
        label="确认密码"
        type="password"
        icon="lucide:lock-keyhole"
        placeholder="再次输入密码"
        autocomplete="new-password"
        :error="fieldErrors.confirmPassword"
        :disabled="loading"
        class="auth-form__field"
        style="animation-delay: 120ms"
      />

      <label v-if="activeTab === 'login'" class="auth-form__remember">
        <input v-model="rememberMe" type="checkbox" :disabled="loading">
        <span>记住我</span>
      </label>

      <button
        type="submit"
        class="auth-form__submit"
        :disabled="loading"
        style="animation-delay: 160ms"
      >
        <Icon v-if="loading" name="lucide:loader-circle" size="18" class="auth-form__spinner" />
        {{ loading ? '处理中...' : activeTab === 'login' ? '登录' : '创建账号' }}
      </button>

      <p v-if="activeTab === 'login'" class="auth-form__footer">
        <a href="#" class="auth-form__link" @click.prevent>忘记密码？</a>
      </p>
    </form>
  </AuthCard>
</template>

<style scoped>
.auth-alert {
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
}

.auth-alert--error {
  background: var(--danger-soft);
  color: var(--danger);
  border: 1px solid var(--danger-border);
}

.auth-alert--success {
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 20px;
}

.auth-form__field {
  animation: fieldReveal 0.35s ease both;
}

.auth-form__remember {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.auth-form__remember input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
  cursor: pointer;
}

.auth-form__submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 4px;
  padding: 10px 16px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  background: var(--gradient-orange);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
  transition: transform 0.15s, opacity 0.15s;
  animation: fieldReveal 0.35s ease both;
}

.auth-form__submit:hover:not(:disabled) {
  transform: translateY(-1px);
}

.auth-form__submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-form__spinner {
  animation: spin 0.8s linear infinite;
}

.auth-form__footer {
  margin: 0;
  text-align: center;
}

.auth-form__link {
  font-size: var(--text-sm);
  color: var(--text-muted);
  transition: color 0.15s;
}

.auth-form__link:hover {
  color: var(--accent);
}

@keyframes fieldReveal {
  from {
    opacity: 0;
    transform: translateY(6px);
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
