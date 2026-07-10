<script setup lang="ts">
const props = defineProps<{
  scriptId: string
  /** 今日已用次数，可选 */
  usedToday?: number
}>()

const emit = defineEmits<{
  verified: [captchaToken: string, captchaPosition: number]
  cancel: []
}>()

// ─── Captcha state ───
const captchaToken = ref('')
const captchaTarget = ref(0)
const loading = ref(true)
const error = ref('')

async function refreshCaptcha() {
  loading.value = true
  error.value = ''
  try {
    const token = localStorage.getItem('autoforge-token')
    const res = await fetch('/api/auth/captcha/generate', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('获取验证码失败')
    const data = await res.json()
    captchaToken.value = data.token
    captchaTarget.value = data.position
  } catch (e: any) {
    error.value = e.message || '获取验证码失败'
  } finally {
    loading.value = false
  }
}

onMounted(refreshCaptcha)

function onCaptchaVerified(position: number) {
  emit('verified', captchaToken.value, position)
}

function handleRefresh() {
  refreshCaptcha()
}

// ─── Quota display ───
const limit = 50
const remaining = computed(() => limit - (props.usedToday ?? 0))
</script>

<template>
  <Teleport to="body">
    <div class="dc-overlay" @click.self="emit('cancel')">
      <div class="dc-modal" role="dialog" aria-label="安全验证">
        <!-- Close -->
        <button type="button" class="dc-modal__close" title="关闭" @click="emit('cancel')">
          <Icon name="lucide:x" size="16" />
        </button>

        <!-- Header -->
        <div class="dc-modal__head">
          <div class="dc-modal__icon-ring">
            <Icon name="lucide:shield" size="20" />
          </div>
          <h2 class="dc-modal__title">安全验证</h2>
          <p class="dc-modal__desc">请完成滑块验证后再下载脚本</p>
        </div>

        <!-- Body -->
        <div class="dc-modal__body">
          <!-- Loading state -->
          <div v-if="loading" class="dc-loading">
            <Icon name="lucide:loader-circle" size="24" class="dc-loading__spin" />
            <span>获取验证码...</span>
          </div>

          <!-- Error state -->
          <div v-else-if="error" class="dc-error">
            <Icon name="lucide:alert-circle" size="20" />
            <p>{{ error }}</p>
            <button type="button" class="dc-error__retry" @click="handleRefresh">
              重试
            </button>
          </div>

          <!-- Captcha -->
          <AuthSliderCaptcha
            v-else
            :token="captchaToken"
            :target-position="captchaTarget"
            @verified="onCaptchaVerified"
            @refresh="handleRefresh"
          />
        </div>

        <!-- Quota info -->
        <div class="dc-footer">
          <div class="dc-footer__quota">
            <Icon name="lucide:download" size="13" />
            <span>今日已下载 <strong>{{ usedToday ?? '—' }}</strong> / {{ limit }} 次</span>
          </div>
          <button type="button" class="dc-footer__cancel" @click="emit('cancel')">
            取消
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ─── Overlay ─── */
.dc-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 4, 8, 0.78);
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}

/* ─── Modal ─── */
.dc-modal {
  position: relative;
  width: min(92vw, 380px);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), var(--shadow-glow-purple);
  overflow: hidden;
  animation: modalRise 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.dc-modal__close {
  position: absolute;
  top: 12px;
  right: 12px;
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
  transition: background 0.12s, color 0.12s;
}

.dc-modal__close:hover {
  background: var(--bg-muted);
  color: var(--text);
}

/* ─── Head ─── */
.dc-modal__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 24px 0;
  text-align: center;
}

.dc-modal__icon-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--secondary-soft);
  border: 1px solid var(--secondary-border);
  color: var(--secondary);
  margin-bottom: 12px;
}

.dc-modal__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
}

.dc-modal__desc {
  margin: 6px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: var(--leading-snug);
}

/* ─── Body ─── */
.dc-modal__body {
  padding: 20px 24px;
  min-height: 80px;
}

/* ─── Loading ─── */
.dc-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.dc-loading__spin {
  animation: spin 0.8s linear infinite;
  color: var(--secondary);
}

/* ─── Error ─── */
.dc-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  font-size: var(--text-sm);
  color: var(--danger);
  text-align: center;
}

.dc-error p {
  margin: 0;
}

.dc-error__retry {
  padding: 6px 16px;
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-sm);
  background: var(--danger-soft);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--danger);
  cursor: pointer;
  transition: background 0.12s;
}

.dc-error__retry:hover {
  background: rgba(248, 113, 113, 0.2);
}

/* ─── Footer ─── */
.dc-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px 20px;
}

.dc-footer__quota {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.dc-footer__quota strong {
  color: var(--text-secondary);
  font-weight: 600;
}

.dc-footer__cancel {
  padding: 6px 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.dc-footer__cancel:hover {
  background: var(--bg-muted);
  color: var(--text);
}

/* ─── Animations ─── */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalRise {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
