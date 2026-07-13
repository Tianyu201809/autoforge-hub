<script setup lang="ts">
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Script } from '~/types/workspace'

definePageMeta({ layout: 'default' })

if (import.meta.client) gsap.registerPlugin(ScrollTrigger)

const route = useRoute()
const scriptId = computed(() => route.params.id as string)

const { user, getAvatarSrc } = useAuth()
const { fetchScript } = useScripts()
const { unpublish } = useMarketplace()
const { checkHealth, installScript } = useAutoforgeBridge()
const { showTip } = useTip()

const script = ref<Script | null>(null)
const loading = ref(true)
const error = ref('')
const unpublished = ref(false)
const installing = ref(false)
const downloading = ref(false)
const showCaptchaModal = ref(false)
const usedToday = ref(0)
const unpublishing = ref(false)
let gsapCtx: gsap.Context | null = null

const pageTitle = computed(() =>
  script.value ? `${script.value.title} - 插件集市` : '插件详情 - Autoforge Hub'
)
useHead({ title: pageTitle })

const isOwner = computed(() =>
  !!user.value && !!script.value && script.value.ownerId === user.value.id
)

const avatarSrc = computed(() => getAvatarSrc(script.value?.ownerAvatarUrl))
const reducedMotion = computed(() =>
  import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
)

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

async function load() {
  loading.value = true
  error.value = ''
  unpublished.value = false
  try {
    script.value = await fetchScript(scriptId.value)
  } catch (e: any) {
    script.value = null
    if (e?.statusCode === 403 || e?.statusCode === 404 || /无权|不存在/.test(e?.message || '')) {
      unpublished.value = true
      error.value = '该插件已下架或不存在'
    } else {
      error.value = e?.message || '加载失败'
    }
  } finally {
    loading.value = false
  }
}

function playMotion() {
  gsapCtx?.revert()
  gsapCtx = gsap.context(() => {
    if (reducedMotion.value) return
    gsap.from('[data-anim="hero"]', {
      opacity: 0,
      y: 16,
      stagger: 0.07,
      duration: 0.4,
      ease: 'power2.out',
    })
    gsap.from('[data-anim="readme"]', {
      opacity: 0,
      y: 24,
      duration: 0.45,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '[data-anim="readme"]',
        start: 'top 85%',
        once: true,
      },
    })
  })
}

async function handleInstall() {
  if (!script.value || installing.value || downloading.value) return
  installing.value = true
  try {
    const healthy = await checkHealth()
    if (!healthy) {
      showTip('请先启动 Autoforge 桌面端，然后再试', 'error')
      return
    }
    const token = localStorage.getItem('autoforge-token')
    const mintRes = await fetch(`/api/scripts/${script.value.id}/install-token`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const mintData = await mintRes.json().catch(() => ({} as any))
    if (!mintRes.ok) {
      showTip(mintData.message || '添加失败，请重试', 'error')
      return
    }
    const result = await installScript({
      zipUrl: mintData.zipUrl,
      scriptName: mintData.scriptName || script.value.title,
      hubScriptId: mintData.hubScriptId || script.value.id,
    })
    if (result.ok) {
      showTip(result.name ? `已添加到本地 Autoforge（${result.name}）` : '已添加到本地 Autoforge', 'success')
      script.value.installCount = (script.value.installCount || 0) + 1
    } else {
      showTip(result.message || '添加失败', 'error')
    }
  } catch {
    showTip('添加失败，请重试', 'error')
  } finally {
    installing.value = false
  }
}

async function fetchQuota() {
  try {
    const token = localStorage.getItem('autoforge-token')
    const res = await fetch('/api/downloads/quota', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.ok) {
      const data = await res.json()
      usedToday.value = data.used
    }
  } catch { /* ignore */ }
}

function handleDownload() {
  if (downloading.value) return
  fetchQuota().then(() => { showCaptchaModal.value = true })
}

async function onCaptchaVerified(captchaToken: string, captchaPosition: number) {
  if (!script.value) return
  showCaptchaModal.value = false
  downloading.value = true
  try {
    const token = localStorage.getItem('autoforge-token')
    const res = await fetch(
      `/api/scripts/${script.value.id}/download?captchaToken=${encodeURIComponent(captchaToken)}&captchaPosition=${captchaPosition}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({ message: '下载失败' }))
      showTip(data.message || '下载失败', 'error')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = script.value.zipName || 'script.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    usedToday.value++
  } catch {
    showTip('下载失败', 'error')
  } finally {
    downloading.value = false
  }
}

async function handleUnpublish() {
  if (!script.value || unpublishing.value) return
  if (!confirm('确定从集市下架此插件？脚本仍保留在个人空间。')) return
  unpublishing.value = true
  try {
    await unpublish(script.value.id)
    showTip('已从集市下架', 'success')
    await navigateTo('/workspace/marketplace')
  } catch (e: any) {
    showTip(e?.message || '下架失败', 'error')
  } finally {
    unpublishing.value = false
  }
}

onMounted(async () => {
  await load()
  await nextTick()
  if (script.value) playMotion()
})

watch(scriptId, async () => {
  await load()
  await nextTick()
  if (script.value) playMotion()
})

onUnmounted(() => {
  gsapCtx?.revert()
})
</script>

<template>
  <div class="mp-detail">
    <NuxtLink to="/workspace/marketplace" class="mp-detail__back" data-anim="hero">
      <Icon name="lucide:arrow-left" size="16" />
      返回集市
    </NuxtLink>

    <p v-if="loading" class="mp-detail__status">加载中…</p>
    <div v-else-if="error" class="mp-detail__status mp-detail__status--error">
      <p>{{ error }}</p>
      <NuxtLink v-if="unpublished" to="/workspace/marketplace" class="mp-detail__link">回到插件集市</NuxtLink>
    </div>

    <template v-else-if="script">
      <section class="mp-detail__hero">
        <div
          class="mp-detail__icon"
          data-anim="hero"
          :style="script.iconColor ? { color: script.iconColor } : undefined"
        >
          <Icon :name="`lucide:${script.icon || 'file-archive'}`" size="36" />
        </div>
        <div class="mp-detail__hero-body">
          <h1 class="mp-detail__title" data-anim="hero">{{ script.title }}</h1>
          <p v-if="script.description" class="mp-detail__desc" data-anim="hero">{{ script.description }}</p>
          <div class="mp-detail__meta" data-anim="hero">
            <span v-if="script.category">{{ script.category }}</span>
            <span v-if="script.language">{{ script.language }}</span>
            <span class="mp-detail__owner">
              <img v-if="avatarSrc" :src="avatarSrc" alt="" class="mp-detail__avatar">
              {{ script.ownerDisplayName || '未知用户' }}
            </span>
            <span>更新 {{ formatDate(script.updatedAt) }}</span>
            <span>安装 {{ script.installCount || 0 }}</span>
          </div>
          <div class="mp-detail__actions" data-anim="hero">
            <button type="button" class="mp-btn mp-btn--primary" :disabled="installing" @click="handleInstall">
              <Icon name="lucide:plus" size="16" />
              {{ installing ? '添加中…' : '添加到本地' }}
            </button>
            <button type="button" class="mp-btn" :disabled="downloading" @click="handleDownload">
              <Icon name="lucide:download" size="16" />
              {{ downloading ? '下载中…' : '下载 ZIP' }}
            </button>
            <button
              v-if="isOwner"
              type="button"
              class="mp-btn mp-btn--danger"
              :disabled="unpublishing"
              @click="handleUnpublish"
            >
              从集市下架
            </button>
          </div>
        </div>
      </section>

      <section class="mp-detail__readme" data-anim="readme">
        <h2 class="mp-detail__readme-title">说明书</h2>
        <WsMarkdown v-if="script.readme?.trim()" :source="script.readme" />
        <p v-else class="mp-detail__empty-readme">作者尚未提供 README</p>
      </section>
    </template>

    <WorkspaceDownloadCaptchaModal
      v-if="showCaptchaModal && script"
      :script-id="script.id"
      :used-today="usedToday"
      @verified="onCaptchaVerified"
      @cancel="showCaptchaModal = false"
    />
  </div>
</template>

<style scoped>
.mp-detail {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 20px 64px;
}

.mp-detail__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 20px;
  font-size: var(--text-sm);
  color: var(--text-muted);
  text-decoration: none;
}

.mp-detail__back:hover {
  color: var(--accent);
}

.mp-detail__status {
  text-align: center;
  padding: 48px 0;
  color: var(--text-secondary);
}

.mp-detail__status--error {
  color: var(--danger);
}

.mp-detail__link {
  display: inline-block;
  margin-top: 12px;
  color: var(--accent);
}

.mp-detail__hero {
  display: flex;
  gap: 20px;
  padding: 28px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(135deg, rgba(255, 140, 0, 0.06), transparent 40%),
    var(--bg-elevated);
  margin-bottom: 28px;
}

.mp-detail__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--accent-soft);
  color: var(--accent);
}

.mp-detail__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.mp-detail__desc {
  margin: 8px 0 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-normal);
}

.mp-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 14px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.mp-detail__owner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.mp-detail__avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
}

.mp-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.mp-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  color: var(--text);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.mp-btn:hover:not(:disabled) {
  border-color: var(--accent-border);
}

.mp-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mp-btn--primary {
  border-color: var(--accent-border);
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
}

.mp-btn--danger {
  color: var(--danger);
  border-color: var(--danger-border);
  background: var(--danger-soft);
}

.mp-detail__readme {
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
}

.mp-detail__readme-title {
  margin: 0 0 16px;
  font-family: var(--font-display);
  font-size: var(--text-lg);
}

.mp-detail__empty-readme {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

@media (max-width: 640px) {
  .mp-detail__hero {
    flex-direction: column;
  }
}
</style>
