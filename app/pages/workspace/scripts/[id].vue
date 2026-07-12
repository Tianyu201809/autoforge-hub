<script setup lang="ts">
import type { Script } from "~/types/workspace"

type EditPayload = {
  id: string
  title: string
  description: string
  readme: string
  tags: string[]
  icon: string
  iconColor?: string
  category: string
  language: string
}

definePageMeta({
  layout: "default"
})

const route = useRoute()
const router = useRouter()
const scriptId = computed(() => route.params.id as string)

const { user, getAvatarSrc } = useAuth()
const { fetchScript } = useScripts()

const script = ref<Script | null>(null)
const loading = ref(true)
const error = ref("")
const showEdit = ref(false)
const saving = ref(false)

const canEdit = computed(() => {
  if (!script.value) return false
  if (script.value.teamId) return true
  return !!user.value && script.value.ownerId === user.value.id
})

const backTo = computed(() => {
  if (script.value?.teamId) return `/workspace/teams/${script.value.teamId}`
  return "/workspace/personal"
})

const pageTitle = computed(() => script.value ? `${script.value.title} - Autoforge Hub` : "脚本详情 - Autoforge Hub")

useHead({
  title: pageTitle
})

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

async function loadScript() {
  if (!scriptId.value) return
  loading.value = true
  error.value = ""
  try {
    script.value = await fetchScript(scriptId.value)
  } catch (err: unknown) {
    script.value = null
    error.value = errorMessage(err, "加载脚本失败")
  } finally {
    loading.value = false
  }
}

function ownerName() {
  return script.value?.ownerDisplayName || "未知用户"
}

function ownerAvatar() {
  return getAvatarSrc(script.value?.ownerAvatarUrl)
}

function updaterName() {
  return script.value?.updaterDisplayName || script.value?.ownerDisplayName || "未知用户"
}

function updaterAvatar() {
  return getAvatarSrc(script.value?.updaterAvatarUrl || script.value?.ownerAvatarUrl)
}

function initials(name: string) {
  const t = name.trim()
  return t ? t.slice(0, 1).toUpperCase() : "?"
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  if (!iso) return "未知"
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  navigateTo(backTo.value)
}

async function onEditSaved(payload: EditPayload) {
  const token = localStorage.getItem("autoforge-token")
  saving.value = true
  try {
    const res = await fetch(`/api/scripts/${payload.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        title: payload.title,
        description: payload.description,
        readme: payload.readme,
        tags: payload.tags,
        icon: payload.icon,
        iconColor: payload.iconColor,
        category: payload.category,
        language: payload.language
      })
    })
    if (!res.ok) {
      const data = await res.json().catch((): { message?: string } => ({}))
      throw new Error(data.message || "保存失败")
    }
    showEdit.value = false
    await loadScript()
  } catch (err: unknown) {
    error.value = errorMessage(err, "保存失败")
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadScript()
})
</script>

<template>
  <div v-if="user" class="script-detail">
    <WorkspaceWsHeader />

    <main class="script-detail__body">
      <button type="button" class="script-detail__back" @click="goBack">
        <Icon name="lucide:arrow-left" size="15" />
        返回
      </button>

      <div v-if="loading" class="script-detail__state">
        <Icon name="lucide:loader-circle" size="24" class="script-detail__spin" />
        <span>加载中…</span>
      </div>

      <div v-else-if="error && !script" class="script-detail__state script-detail__state--error">
        <Icon name="lucide:alert-circle" size="24" />
        <span>{{ error }}</span>
        <NuxtLink to="/workspace" class="script-detail__state-link">返回工作空间</NuxtLink>
      </div>

      <template v-else-if="script">
        <div v-if="error" class="script-detail__alert" role="alert">
          <Icon name="lucide:alert-circle" size="15" />
          {{ error }}
        </div>

        <div class="script-detail__layout">
          <aside class="script-detail__meta">
            <div class="script-detail__hero">
              <div class="script-detail__icon">
                <Icon
                  :name="`lucide:${script.icon || 'file-archive'}`"
                  size="28"
                  :style="script.iconColor ? { color: script.iconColor } : undefined"
                />
              </div>
              <div class="script-detail__title-wrap">
                <h1 class="script-detail__title">{{ script.title }}</h1>
                <p v-if="script.description" class="script-detail__desc">{{ script.description }}</p>
              </div>
            </div>

            <button v-if="canEdit" type="button" class="script-detail__edit" :disabled="saving" @click="showEdit = true">
              <Icon name="lucide:pencil" size="14" />
              编辑脚本
            </button>

            <dl class="script-detail__facts">
              <div v-if="script.category" class="script-detail__fact">
                <dt>分类</dt>
                <dd>{{ script.category }}</dd>
              </div>
              <div v-if="script.language" class="script-detail__fact">
                <dt>语言</dt>
                <dd>{{ script.language }}</dd>
              </div>
              <div class="script-detail__fact">
                <dt>大小</dt>
                <dd>{{ formatSize(script.zipSize) }}</dd>
              </div>
              <div class="script-detail__fact">
                <dt>创建时间</dt>
                <dd>{{ formatDate(script.createdAt) }}</dd>
              </div>
              <div class="script-detail__fact">
                <dt>更新时间</dt>
                <dd>{{ formatDate(script.updatedAt || script.createdAt) }}</dd>
              </div>
            </dl>

            <div class="script-detail__people">
              <div class="script-detail__person">
                <span class="script-detail__person-label">上传者：</span>
                <img v-if="script.ownerAvatarUrl" :src="ownerAvatar()" alt="" class="script-detail__avatar">
                <span v-else class="script-detail__avatar script-detail__avatar--fallback">{{ initials(ownerName()) }}</span>
                <span class="script-detail__person-name">{{ ownerName() }}</span>
              </div>
              <div class="script-detail__person">
                <span class="script-detail__person-label">最后一次修改者：</span>
                <img
                  v-if="script.updaterAvatarUrl || script.ownerAvatarUrl"
                  :src="updaterAvatar()"
                  alt=""
                  class="script-detail__avatar"
                >
                <span v-else class="script-detail__avatar script-detail__avatar--fallback">{{ initials(updaterName()) }}</span>
                <span class="script-detail__person-name">{{ updaterName() }}</span>
              </div>
            </div>

            <div v-if="script.tags.length" class="script-detail__tags">
              <span v-for="tag in script.tags" :key="tag" class="script-detail__tag">{{ tag }}</span>
            </div>
          </aside>

          <section class="script-detail__readme">
            <div class="script-detail__readme-head">
              <h2 class="script-detail__readme-title">
                <Icon name="lucide:book-open" size="17" />
                说明书
              </h2>
            </div>
            <ClientOnly>
              <WorkspaceWsMarkdown v-if="script.readme?.trim()" :source="script.readme" />
              <p v-else class="script-detail__empty-readme">暂无说明书</p>
            </ClientOnly>
          </section>
        </div>

        <Teleport to="body">
          <WorkspaceWsEditModal
            v-if="showEdit"
            :script="script"
            @close="showEdit = false"
            @saved="onEditSaved"
          />
        </Teleport>
      </template>
    </main>
  </div>
</template>

<style scoped>
.script-detail {
  min-height: 100vh;
}

.script-detail__body {
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px 24px 80px;
}

.script-detail__back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s;
}

.script-detail__back:hover {
  color: var(--accent);
}

.script-detail__layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 24px;
  align-items: flex-start;
}

.script-detail__meta,
.script-detail__readme {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-card);
}

.script-detail__meta {
  position: sticky;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
}

.script-detail__hero {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.script-detail__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  color: var(--accent);
  flex-shrink: 0;
}

.script-detail__title-wrap {
  min-width: 0;
}

.script-detail__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
  word-break: break-word;
}

.script-detail__desc {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: 1.5;
}

.script-detail__edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 9px 16px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  box-shadow: var(--shadow-glow-orange);
  cursor: pointer;
}

.script-detail__edit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.script-detail__facts {
  display: grid;
  gap: 10px;
  margin: 0;
}

.script-detail__fact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.script-detail__fact:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.script-detail__fact dt {
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
}

.script-detail__fact dd {
  margin: 0;
  color: var(--text);
  font-size: var(--text-sm);
  text-align: right;
}

.script-detail__people {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.script-detail__person {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.script-detail__person-label {
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
}

.script-detail__person-row {
  display: flex;
  align-items: center;
  gap: 9px;
}

.script-detail__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.script-detail__avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  background: var(--bg-muted);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
}

.script-detail__person-name {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.script-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.script-detail__tag {
  padding: 3px 9px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 700;
}

.script-detail__readme {
  min-height: 520px;
  padding: 22px 24px 28px;
}

.script-detail__readme-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.script-detail__readme-title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: var(--text);
  font-size: var(--text-lg);
  font-weight: 700;
}

.script-detail__empty-readme {
  margin: 0;
  padding: 48px 20px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  text-align: center;
  font-size: var(--text-sm);
}

.script-detail__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 360px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.script-detail__state--error {
  color: var(--danger);
}

.script-detail__state-link {
  color: var(--accent);
  font-weight: 700;
}

.script-detail__alert {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 14px;
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-sm);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: var(--text-sm);
}

.script-detail__spin {
  animation: spin 0.8s linear infinite;
}

@media (max-width: 860px) {
  .script-detail__layout {
    grid-template-columns: 1fr;
  }

  .script-detail__meta {
    position: static;
  }
}

@media (max-width: 600px) {
  .script-detail__body {
    padding: 24px 16px 64px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
