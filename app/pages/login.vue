<script setup lang="ts">
import type { AuthTab, AuthView } from '~/types/auth'

definePageMeta({
  layout: 'auth'
})

useHead({
  title: '登录 — Autoforge Hub'
})

const route = useRoute()
const { login, register, forgotPassword, resetPassword } = useAuth()

const view = ref<AuthView>('login')
const activeTab = computed<AuthTab>({
  get: () => (view.value === 'register' ? 'register' : 'login'),
  set: (tab) => { view.value = tab },
})
const isAuthTab = computed(() => view.value === 'login' || view.value === 'register')

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const rememberMe = ref(false)
const loading = ref(false)
const formError = ref('')
const successMessage = ref('')
const fieldErrors = ref<Record<string, string>>({})
const socialHint = ref('')

const resetCode = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const resendCooldown = ref(0)
let resendTimer: ReturnType<typeof setInterval> | null = null

const captchaToken = ref('')
const captchaTargetPosition = ref(0)
const captchaFinalPosition = ref(0)
const captchaVerified = ref(false)

const headerTitle = computed(() => {
  if (view.value === 'forgot-email') return '找回密码'
  if (view.value === 'forgot-reset') return '设置新密码'
  return view.value === 'login' ? '欢迎回来' : '创建新档案'
})
const headerSubtitle = computed(() => {
  if (view.value === 'forgot-email') return '输入注册邮箱，我们将发送验证码'
  if (view.value === 'forgot-reset') return '输入验证码并设置新密码'
  return view.value === 'login'
    ? '登录以管理你的脚本与团队空间'
    : '填写基本信息，开始你的旅程'
})
const submitLabel = computed(() => {
  if (loading.value) return '处理中...'
  if (view.value === 'forgot-email') return '发送验证码'
  if (view.value === 'forgot-reset') return '重置密码'
  return view.value === 'login' ? '登录' : '创建账号'
})

// Only login ↔ register transitions reset fields here; forgot flows reset in their handlers
// so they can preserve state (e.g. email + success message) across forgot-email → forgot-reset.
watch(view, (newView, oldView) => {
  if ((oldView === 'login' || oldView === 'register') && (newView === 'login' || newView === 'register')) {
    formError.value = ''
    fieldErrors.value = {}
    successMessage.value = ''
    socialHint.value = ''
    password.value = ''
    confirmPassword.value = ''
    captchaVerified.value = false
    if (newView === 'register') {
      nextTick(() => loadCaptcha())
    }
    nextTick(() => focusFirstField())
  }
})

onMounted(() => {
  window.scrollTo(0, 0)
  const registered = route.query.registered as string | undefined
  if (registered) {
    email.value = registered
    view.value = 'login'
    successMessage.value = '账号已创建，请登录'
  }
  focusFirstField()
})

onBeforeUnmount(() => {
  if (resendTimer) clearInterval(resendTimer)
})

function focusFirstField() {
  const input = document.querySelector<HTMLInputElement>('.login-page .auth-input__field')
  input?.focus({ preventScroll: true })
}

async function loadCaptcha() {
  try {
    const res = await fetch('/api/auth/captcha/generate', { method: 'POST' })
    const data = await res.json()
    if (data.ok) {
      captchaToken.value = data.token
      captchaTargetPosition.value = data.position
      captchaFinalPosition.value = 0
      captchaVerified.value = false
    }
  } catch {
    // Silently handle — captcha will be retried
  }
}

function onCaptchaVerified(position: number) {
  captchaFinalPosition.value = position
  captchaVerified.value = true
}

function onCaptchaRefresh() {
  loadCaptcha()
}

function onSocialClick(provider: string) {
  socialHint.value = `${provider} 登录即将开放`
}

function switchTab(tab: AuthTab) {
  view.value = tab
}

function openForgot() {
  view.value = 'forgot-email'
  formError.value = ''
  successMessage.value = ''
  fieldErrors.value = {}
  socialHint.value = ''
  password.value = ''
  nextTick(() => focusFirstField())
}

function backToLogin() {
  view.value = 'login'
  resetCode.value = ''
  newPassword.value = ''
  confirmNewPassword.value = ''
  formError.value = ''
  successMessage.value = ''
  fieldErrors.value = {}
  socialHint.value = ''
  nextTick(() => focusFirstField())
}

function startResendCooldown(seconds = 60) {
  resendCooldown.value = seconds
  if (resendTimer) clearInterval(resendTimer)
  resendTimer = setInterval(() => {
    resendCooldown.value -= 1
    if (resendCooldown.value <= 0 && resendTimer) {
      clearInterval(resendTimer)
      resendTimer = null
    }
  }, 1000)
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
  if (!captchaVerified.value) errors.captcha = '请完成安全验证'
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function onForgotEmailSubmit() {
  formError.value = ''
  fieldErrors.value = {}
  if (!email.value.trim()) {
    fieldErrors.value = { email: '请输入邮箱' }
    return
  }
  loading.value = true
  const result = await forgotPassword(email.value.trim())
  loading.value = false
  if (!result.ok) {
    formError.value = result.error
    return
  }
  successMessage.value = result.message
  view.value = 'forgot-reset'
  startResendCooldown(60)
  nextTick(() => focusFirstField())
}

async function onForgotResetSubmit() {
  formError.value = ''
  fieldErrors.value = {}
  const errors: Record<string, string> = {}
  if (!resetCode.value.trim()) errors.code = '请输入验证码'
  if (!newPassword.value || newPassword.value.length < 8) errors.newPassword = '密码至少需要 8 位'
  if (newPassword.value !== confirmNewPassword.value) errors.confirmNewPassword = '两次输入的密码不一致'
  if (Object.keys(errors).length) {
    fieldErrors.value = errors
    return
  }
  loading.value = true
  const result = await resetPassword(email.value.trim(), resetCode.value.trim(), newPassword.value)
  loading.value = false
  if (!result.ok) {
    formError.value = result.error
    return
  }
  await navigateTo('/workspace')
}

async function onResendCode() {
  if (resendCooldown.value > 0 || loading.value) return
  formError.value = ''
  loading.value = true
  const result = await forgotPassword(email.value.trim())
  loading.value = false
  if (!result.ok) {
    formError.value = result.error
    return
  }
  successMessage.value = result.message
  startResendCooldown(60)
}

async function onSubmit() {
  if (view.value === 'forgot-email') return onForgotEmailSubmit()
  if (view.value === 'forgot-reset') return onForgotResetSubmit()

  formError.value = ''
  successMessage.value = ''
  socialHint.value = ''

  if (view.value === 'login') {
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
  const result = await register(email.value, password.value, captchaToken.value, captchaFinalPosition.value)
  loading.value = false
  if (!result.ok) {
    formError.value = result.error
    if (result.captchaError) {
      loadCaptcha()
    }
    return
  }
  view.value = 'login'
  password.value = ''
  confirmPassword.value = ''
  successMessage.value = '账号已创建，请登录'
}
</script>

<template>
  <main class="login-page">
    <div class="login-canvas" aria-hidden="true">
      <div class="login-canvas__glow login-canvas__glow--purple" />
      <div class="login-canvas__glow login-canvas__glow--orange" />
      <div class="login-canvas__glow login-canvas__glow--soft" />
      <div class="login-canvas__beam" />
      <div class="login-canvas__grid" />
      <div class="login-canvas__grain" />
      <div class="login-canvas__vignette" />
    </div>

    <div class="login-shell">
      <AuthHeroPanel />

      <section class="login-form-col">
        <div class="login-form-panel">
          <header class="login-form-panel__header">
            <p class="login-form-panel__eyebrow">Account</p>
            <h2>{{ headerTitle }}</h2>
            <p class="login-form-panel__subtitle">{{ headerSubtitle }}</p>
          </header>

          <div v-if="isAuthTab" class="login-form-panel__tabs">
            <AuthTabs v-model="activeTab" />
          </div>

          <!-- <div class="login-social">
            <AuthSocialButton
              icon="lucide:chrome"
              label="Google"
              @click="onSocialClick('Google')"
            />
            <AuthSocialButton
              icon="lucide:github"
              label="GitHub"
              @click="onSocialClick('GitHub')"
            />
          </div> -->
          <p v-if="socialHint" class="login-social__hint" role="status">{{ socialHint }}</p>

          <div v-if="isAuthTab" class="login-divider" role="separator">
            <span>或使用邮箱</span>
          </div>

          <div
            v-if="formError"
            class="login-alert login-alert--error"
            role="alert"
          >
            {{ formError }}
          </div>
          <div
            v-else-if="successMessage"
            class="login-alert login-alert--success"
            role="status"
          >
            {{ successMessage }}
          </div>

          <form class="login-form" @submit.prevent="onSubmit">
            <AuthInputGroup
              v-if="view !== 'forgot-reset'"
              v-model="email"
              label="邮箱"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              :error="fieldErrors.email"
              :disabled="loading"
            />

            <AuthInputGroup
              v-if="isAuthTab"
              v-model="password"
              label="密码"
              type="password"
              placeholder="至少 8 位"
              :autocomplete="view === 'login' ? 'current-password' : 'new-password'"
              :error="fieldErrors.password"
              :disabled="loading"
              :hint="view === 'register' ? '密码至少需要 8 位' : undefined"
            />

            <AuthInputGroup
              v-if="view === 'register'"
              v-model="confirmPassword"
              label="确认密码"
              type="password"
              placeholder="再次输入密码"
              autocomplete="new-password"
              :error="fieldErrors.confirmPassword"
              :disabled="loading"
            />

            <div
              v-if="view === 'register'"
              class="login-form__captcha"
            >
              <AuthSliderCaptcha
                v-if="captchaToken"
                :key="captchaToken"
                :token="captchaToken"
                :target-position="captchaTargetPosition"
                :disabled="loading"
                @verified="onCaptchaVerified"
                @refresh="onCaptchaRefresh"
              />
              <p v-if="fieldErrors.captcha" class="login-form__captcha-error" role="alert">
                {{ fieldErrors.captcha }}
              </p>
            </div>

            <label v-if="view === 'login'" class="login-form__remember">
              <input v-model="rememberMe" type="checkbox" :disabled="loading">
              <span>记住我</span>
            </label>

            <button
              v-if="view === 'login'"
              type="button"
              class="login-form__forgot"
              :disabled="loading"
              @click="openForgot"
            >
              忘记密码？
            </button>

            <template v-if="view === 'forgot-reset'">
              <AuthInputGroup
                v-model="resetCode"
                label="验证码"
                type="text"
                placeholder="6 位数字"
                autocomplete="one-time-code"
                :error="fieldErrors.code"
                :disabled="loading"
              />
              <AuthInputGroup
                v-model="newPassword"
                label="新密码"
                type="password"
                placeholder="至少 8 位"
                autocomplete="new-password"
                :error="fieldErrors.newPassword"
                :disabled="loading"
              />
              <AuthInputGroup
                v-model="confirmNewPassword"
                label="确认新密码"
                type="password"
                placeholder="再次输入新密码"
                autocomplete="new-password"
                :error="fieldErrors.confirmNewPassword"
                :disabled="loading"
              />
              <div class="login-form__forgot-actions">
                <button
                  type="button"
                  class="login-form-panel__link"
                  :disabled="loading || resendCooldown > 0"
                  @click="onResendCode"
                >
                  {{ resendCooldown > 0 ? `重新发送 (${resendCooldown}s)` : '重新发送' }}
                </button>
                <button
                  type="button"
                  class="login-form-panel__link"
                  :disabled="loading"
                  @click="backToLogin"
                >
                  返回登录
                </button>
              </div>
            </template>

            <button
              type="submit"
              class="login-form__submit"
              :disabled="loading || (view === 'register' && !captchaVerified)"
            >
              <Icon
                v-if="loading"
                name="lucide:loader-circle"
                size="18"
                class="login-form__spinner"
              />
              {{ submitLabel }}
            </button>
          </form>

          <p class="login-form-panel__footer">
            <template v-if="view === 'login'">
              还没有账号？
              <button type="button" class="login-form-panel__link" @click="switchTab('register')">
                创建账号
              </button>
            </template>
            <template v-else-if="view === 'register'">
              已是团队成员？
              <button type="button" class="login-form-panel__link" @click="switchTab('login')">
                登录
              </button>
            </template>
            <template v-else-if="view === 'forgot-email'">
              <button type="button" class="login-form-panel__link" @click="backToLogin">
                返回登录
              </button>
            </template>
          </p>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--bg);
  transition: background-color 0.25s, color 0.25s;
}

.login-page ::selection {
  background: var(--selection-bg);
  color: var(--selection-color);
}

/* ── Shared canvas atmosphere ────────────────────────── */
.login-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.login-canvas__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
}

.login-canvas__glow--purple {
  top: -18%;
  left: -8%;
  width: 55vw;
  height: 55vw;
  max-width: 680px;
  max-height: 680px;
  background: color-mix(in srgb, var(--secondary) 30%, transparent);
  animation: canvasDrift 16s ease-in-out infinite alternate;
}

.login-canvas__glow--orange {
  top: 12%;
  right: -12%;
  width: 48vw;
  height: 48vw;
  max-width: 560px;
  max-height: 560px;
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  animation: canvasDrift 20s ease-in-out infinite alternate-reverse;
}

.login-canvas__glow--soft {
  bottom: -20%;
  left: 30%;
  width: 40vw;
  height: 40vw;
  max-width: 480px;
  max-height: 480px;
  background: color-mix(in srgb, var(--secondary) 14%, transparent);
}

.login-canvas__beam {
  position: absolute;
  top: -20%;
  left: 42%;
  width: 1px;
  height: 140%;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    color-mix(in srgb, var(--accent) 35%, transparent) 35%,
    color-mix(in srgb, var(--secondary) 25%, transparent) 60%,
    transparent 100%
  );
  opacity: 0.35;
  transform: rotate(18deg);
  transform-origin: top center;
}

.login-canvas__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--border) 1px, transparent 1px),
    linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 80% 70% at 35% 45%, #000 0%, transparent 72%);
  opacity: 0.45;
  transform: perspective(900px) rotateX(52deg) scale(1.35);
  transform-origin: 35% 10%;
}

.login-canvas__grain {
  position: absolute;
  inset: 0;
  opacity: 0.28;
  mix-blend-mode: soft-light;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
}

.login-canvas__vignette {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 90% 80% at 50% 45%, transparent 40%, color-mix(in srgb, var(--bg) 75%, transparent) 100%);
}

/* ── Asymmetric shell ────────────────────────────────── */
.login-shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  min-height: 100vh;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 72px 20px 40px;
}

/* ── Floating form ───────────────────────────────────── */
.login-form-col {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 420px;
  display: flex;
  justify-content: center;
}

.login-form-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 28px 24px;
  border-radius: calc(var(--radius-xl) + 2px);
  border: 1px solid color-mix(in srgb, var(--border-strong) 80%, var(--accent-border));
  background: color-mix(in srgb, var(--bg-elevated) 82%, transparent);
  backdrop-filter: blur(22px) saturate(1.2);
  box-shadow:
    var(--shadow-md),
    0 0 0 1px color-mix(in srgb, var(--secondary) 8%, transparent),
    var(--shadow-glow-orange);
  opacity: 0;
  animation: formRise 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.15s forwards;
}

.login-form-panel__eyebrow {
  margin: 0 0 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
}

.login-form-panel__header h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--text);
}

.login-form-panel__subtitle {
  margin: 8px 0 0;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--text-secondary);
}

.login-form-panel__tabs :deep(.auth-tabs) {
  background: var(--bg-muted);
  border: 1px solid var(--border);
}

.login-form-panel__tabs :deep(.auth-tabs__item) {
  color: var(--text-muted);
}

.login-form-panel__tabs :deep(.auth-tabs__item:hover) {
  color: var(--text);
}

.login-form-panel__tabs :deep(.auth-tabs__item--active) {
  color: var(--accent);
  background: var(--accent-soft);
  box-shadow: inset 0 -2px 0 var(--accent);
}

.login-social {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.login-social__hint {
  margin: -6px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-align: center;
}

.login-divider {
  display: flex;
  align-items: center;
  width: 100%;
}

.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-strong);
}

.login-divider span {
  padding: 0 12px;
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  white-space: nowrap;
}

.login-alert {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
}

.login-alert--error {
  background: var(--danger-soft);
  color: var(--danger);
  border: 1px solid var(--danger-border);
}

.login-alert--success {
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.login-form__captcha-error {
  margin: 8px 0 0;
  font-size: var(--text-xs);
  color: var(--danger);
}

.login-form__remember {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.login-form__remember input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
  cursor: pointer;
}

.login-form__forgot {
  align-self: flex-end;
  margin-top: -8px;
  border: none;
  background: none;
  padding: 0;
  font-size: var(--text-sm);
  color: var(--accent);
  cursor: pointer;
}

.login-form__forgot:hover:not(:disabled) {
  text-decoration: underline;
}

.login-form__forgot:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-form__forgot-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.login-form__submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 50px;
  margin-top: 6px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
  font-size: var(--text-base);
  font-weight: 600;
  box-shadow: var(--shadow-glow-orange);
  transition: transform 0.15s, opacity 0.15s;
}

.login-form__submit:hover:not(:disabled) {
  transform: translateY(-1px);
}

.login-form__submit:active:not(:disabled) {
  transform: scale(0.98);
}

.login-form__submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-form__spinner {
  animation: spin 0.8s linear infinite;
}

.login-form-panel__footer {
  margin: 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.login-form-panel__link {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
  transition: color 0.15s;
}

.login-form-panel__link:hover {
  color: var(--accent-hover);
}

@media (min-width: 640px) {
  .login-shell {
    padding: 80px 32px 48px;
  }

  .login-form-panel {
    padding: 32px 30px;
    gap: 22px;
  }
}

@media (min-width: 1024px) {
  .login-page {
    height: 100vh;
  }

  .login-shell {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
    align-items: center;
    gap: 0 48px;
    min-height: 100vh;
    padding: 48px 56px;
  }

  .login-form-col {
    justify-content: flex-end;
    max-width: none;
  }

  .login-form-panel {
    max-width: 400px;
    margin-left: auto;
    /* Overlap into narrative zone — one composition */
    transform: translateX(-12px);
  }
}

@media (min-width: 1280px) {
  .login-shell {
    max-width: 1240px;
    gap: 0 64px;
    padding: 48px 72px;
  }

  .login-form-panel {
    max-width: 420px;
    transform: translateX(-28px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-canvas__glow--purple,
  .login-canvas__glow--orange,
  .login-form-panel {
    animation: none;
  }

  .login-form-panel {
    opacity: 1;
  }
}

@keyframes canvasDrift {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(28px, -20px) scale(1.06); }
}

@keyframes formRise {
  from {
    opacity: 0;
    transform: translateY(22px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (min-width: 1024px) {
  @keyframes formRise {
    from {
      opacity: 0;
      transform: translateX(-12px) translateY(18px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translateX(-12px) translateY(0) scale(1);
    }
  }
}

@media (min-width: 1280px) {
  @keyframes formRise {
    from {
      opacity: 0;
      transform: translateX(-28px) translateY(18px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translateX(-28px) translateY(0) scale(1);
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
