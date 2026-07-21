<script setup lang="ts">
import type { ScriptSort } from '~/types/workspace'
import { SCRIPT_CATEGORIES, SCRIPT_LANGUAGES } from '~/types/workspace'

definePageMeta({
  layout: 'default'
})

useHead({
  title: '个人空间 - Autoforge Hub'
})

const { user } = useAuth()
const {
  scripts,
  total,
  hasMore,
  distributions,
  listLoading,
  listLoadingMore,
  listError,
  deleteScript,
  addScript,
  loadScripts,
  loadMoreScripts,
} = useScripts()

const searchQuery = ref('')
const sortBy = ref<ScriptSort>('newest')
const filterCategory = ref('')
const filterLanguage = ref('')
const showUpload = ref(false)
const showEdit = ref(false)
const editingScript = ref<any>(null)
const showShare = ref(false)
const shareScript = ref<any>(null)
const actionMsg = ref('')
const actionError = ref('')

// ─── Script list (server pagination) ───
const PAGE_SIZE = 30
const loadMoreSentinel = ref<HTMLElement | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let loadMoreObserver: IntersectionObserver | null = null

function currentListQuery() {
  return {
    scope: 'personal' as const,
    pageSize: PAGE_SIZE,
    q: searchQuery.value,
    category: filterCategory.value,
    language: filterLanguage.value,
    sort: sortBy.value,
  }
}

function refreshScriptList() {
  return loadScripts(currentListQuery())
}

onMounted(() => {
  refreshScriptList()

  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some(e => e.isIntersecting)) void loadMoreScripts()
    },
    { rootMargin: '200px' }
  )
  if (loadMoreSentinel.value) loadMoreObserver.observe(loadMoreSentinel.value)
})

watch(loadMoreSentinel, (node, prev) => {
  if (!loadMoreObserver) return
  if (prev) loadMoreObserver.unobserve(prev)
  if (node) loadMoreObserver.observe(node)
})

watch([sortBy, filterCategory, filterLanguage], () => {
  refreshScriptList()
})

watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    refreshScriptList()
  }, 300)
})

onBeforeUnmount(() => {
  loadMoreObserver?.disconnect()
  if (searchTimer) clearTimeout(searchTimer)
})

function handleEdit(script: any) {
  editingScript.value = script
  showEdit.value = true
}

function handleShare(script: any) {
  shareScript.value = script
  showShare.value = true
}

function onShared(_teamId: string) {
  showShare.value = false
  shareScript.value = null
  actionMsg.value = '已成功分享到团队！'
  setTimeout(() => { actionMsg.value = '' }, 3000)
}

function onShareCancel() {
  showShare.value = false
  shareScript.value = null
}

async function handleEditSave(payload: { id: string; title: string; description: string; readme: string; tags: string[]; icon: string; iconColor?: string; category: string; language: string }) {
  const token = localStorage.getItem("autoforge-token")
  try {
    await fetch("/api/scripts/" + payload.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ title: payload.title, description: payload.description, readme: payload.readme, tags: payload.tags, icon: payload.icon, iconColor: payload.iconColor, category: payload.category, language: payload.language })
    })
  } catch (e) {}
  showEdit.value = false
  await refreshScriptList()
}

function handleDelete(id: string) {
  deleteScript(id)
}

async function handleUpload(payload: { title: string; description: string; readme: string; zipName: string; zipSize: number; tags: string[]; file: File; category: string; language: string; icon: string; iconColor?: string }) {
  if (!user.value) return
  await addScript(
    payload.title,
    payload.description,
    payload.tags,
    payload.category,
    payload.language,
    payload.icon,
    payload.file,
    undefined,
    payload.iconColor,
    payload.readme || '',
  )
  showUpload.value = false
  await refreshScriptList()
}

const RELEASES_URL = 'https://github.com/Tianyu201809/autoforge/releases'
const loadedScripts = computed(() => scripts.value || [])

function buildFilterItems(kind: 'category' | 'language', values: readonly string[], activeValue: string) {
  const counts = distributions.value[kind]
  return values
    .map(value => ({
      label: value,
      value,
      count: counts[value] || 0,
      active: activeValue === value,
    }))
    .filter(item => item.count > 0 || item.active)
}

const personalSidebarStats = computed(() => [
  { label: '结果总数', value: total.value, icon: 'lucide:library' },
  { label: '当前显示', value: loadedScripts.value.length, icon: 'lucide:layout-grid' },
  {
    label: '已发布',
    value: loadedScripts.value.filter(script => script.visibility === 'public').length,
    icon: 'lucide:store',
  },
  {
    label: '总安装',
    value: loadedScripts.value.reduce((sum, script) => sum + Number(script.installCount || 0), 0),
    icon: 'lucide:download',
  },
])

const personalSidebarActions = [
  { key: 'upload', label: '上传脚本', icon: 'lucide:upload', primary: true },
  { key: 'guide', label: '查看上传规范', icon: 'lucide:book-open-check' },
  { key: 'marketplace', label: '前往脚本集市', icon: 'lucide:store', to: '/workspace/marketplace' },
  { key: 'teams', label: '切换团队空间', icon: 'lucide:users', to: '/workspace/teams' },
  { key: 'download', label: '下载 Autoforge', icon: 'lucide:download', to: RELEASES_URL, external: true },
]

const personalSidebarFilterGroups = computed(() => [
  {
    key: 'category' as const,
    title: '分类',
    icon: 'lucide:folder',
    items: buildFilterItems('category', SCRIPT_CATEGORIES, filterCategory.value),
  },
  {
    key: 'language' as const,
    title: '语言',
    icon: 'lucide:code-2',
    items: buildFilterItems('language', SCRIPT_LANGUAGES, filterLanguage.value),
  },
])

function handleSidebarAction(key: string) {
  if (key === 'upload' || key === 'guide') {
    showUpload.value = true
  }
}

function handleSidebarFilter(payload: { kind: 'category' | 'language'; value: string }) {
  if (payload.kind === 'category') {
    filterCategory.value = filterCategory.value === payload.value ? '' : payload.value
  } else {
    filterLanguage.value = filterLanguage.value === payload.value ? '' : payload.value
  }
}
</script>

<template>
  <div v-if="user" class="ws-page">
    <WorkspaceWsHeader />
        <div class="ws-page__body">
      <div class="ws-page__hero">
        <div class="ws-page__glow" aria-hidden="true" />
        <h1 class="ws-page__title">个人空间</h1>
        <p class="ws-page__desc">管理你个人上传的脚本包，只有你自己可以看到</p>
      </div>

      <div class="ws-space-bar">
        <div class="ws-space-bar__info">
          <Icon name="lucide:user" size="16" class="ws-space-bar__icon" />
          <span class="ws-space-bar__label">个人空间</span>
        </div>
        <NuxtLink to="/workspace/teams" class="ws-space-bar__switch">
          <Icon name="lucide:users" size="14" />
          切换到团队空间
        </NuxtLink>
      </div>

      <div class="ws-layout">
        <div class="ws-layout__sidebar">
          <WorkspaceWsSpaceInsightSidebar
            tone="personal"
            title="个人脚本库"
            description="快速查看脚本规模、分布和常用入口。"
            :stats="personalSidebarStats"
            :actions="personalSidebarActions"
            :filter-groups="personalSidebarFilterGroups"
            @action="handleSidebarAction"
            @filter="handleSidebarFilter"
          />
        </div>

        <main class="ws-layout__main">
      <div class="ws-toolbar">
        <div class="ws-toolbar__search">
          <Icon name="lucide:search" size="16" class="ws-toolbar__search-icon" />
          <input
            v-model="searchQuery"
            type="search"
            class="ws-toolbar__search-input"
            placeholder="搜索脚本名称、描述或标签..."
          >
        </div>

        <div class="ws-filter-bar">
        <select v-model="filterCategory" class="ws-filter-select">
          <option value="">全部分类</option>
          <option v-for="cat in SCRIPT_CATEGORIES" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>
        <select v-model="filterLanguage" class="ws-filter-select">
          <option value="">全部语言</option>
          <option v-for="lang in SCRIPT_LANGUAGES" :key="lang" :value="lang">
            {{ lang }}
          </option>
        </select>
      </div>
      <div class="ws-toolbar__actions">
          <div class="ws-sort">
            <button
              v-for="opt in ([
                { id: 'newest' as ScriptSort, label: '最新' },
                { id: 'oldest' as ScriptSort, label: '最早' },
                { id: 'name' as ScriptSort, label: '名称' }
              ])"
              :key="opt.id"
              type="button"
              class="ws-sort__btn"
              :class="{ 'ws-sort__btn--active': sortBy === opt.id }"
              @click="sortBy = opt.id"
            >
              {{ opt.label }}
            </button>
          </div>

          <button type="button" class="ws-upload-btn" @click="showUpload = true">
            <Icon name="lucide:upload" size="16" />
            上传脚本
          </button>
        </div>
      </div>

      <div v-if="listLoading && scripts.length === 0" class="ws-empty">
        <p class="ws-empty__text">加载中…</p>
      </div>

      <div v-else-if="scripts.length > 0" class="ws-script-list">
        <WorkspaceWsScriptCard
          v-for="script in scripts"
          :key="script.id"
          :script="script"
          :deletable="true"
          :editable="true"
          :downloadable="true"
          :shareable="true"
          @edit="handleEdit"
          @delete="handleDelete"
          @share="handleShare"
        />
      </div>

      <div v-else class="ws-empty">
        <Icon name="lucide:package" size="48" class="ws-empty__icon" />
        <h2 class="ws-empty__title">{{ searchQuery ? '没有匹配的脚本' : '还没有上传脚本' }}</h2>
        <p class="ws-empty__text">
          {{ searchQuery ? '试试其他关键词' : '上传你的第一个 .zip 脚本包，开始构建你的脚本库' }}
        </p>
        <button v-if="!searchQuery" type="button" class="ws-empty__btn" @click="showUpload = true">
          <Icon name="lucide:upload" size="16" />
          上传第一个脚本
        </button>
      </div>

      <!-- Feedback message -->
      <div v-if="actionMsg" class="ws-alert ws-alert--success" role="status">
        <Icon name="lucide:check-circle" size="14" />
        {{ actionMsg }}
      </div>
      <div v-if="actionError" class="ws-alert ws-alert--error" role="alert">
        <Icon name="lucide:alert-circle" size="14" />
        {{ actionError }}
      </div>

      <div v-if="scripts.length > 0" class="ws-load-more">
        <div ref="loadMoreSentinel" class="ws-load-more__sentinel" aria-hidden="true" />
        <p v-if="listLoadingMore" class="ws-load-more__text">加载中…</p>
          <p v-else-if="!hasMore" class="ws-load-more__text">没有更多了</p>
          <p v-else-if="listError" class="ws-load-more__text ws-load-more__text--error">{{ listError }}</p>
        </div>
        </main>
      </div>
    </div>

    <Teleport to="body">
      <WorkspaceWsUploadModal
        v-if="showUpload"
        @close="showUpload = false"
        @uploaded="handleUpload"
      />
    </Teleport>
    <Teleport to="body">
      <WorkspaceWsEditModal
        v-if="showEdit && editingScript"
        :script="editingScript"
        @close="showEdit = false"
        @saved="handleEditSave"
      />
    </Teleport>

    <WorkspaceShareToTeamModal
      v-if="showShare && shareScript"
      :script-id="shareScript.id"
      :script-title="shareScript.title"
      @shared="onShared"
      @cancel="onShareCancel"
    />
  </div>
</template>

<style scoped>
.ws-page {
  min-height: 100vh;
}

.ws-page__body {
  max-width: 1500px;
  margin: 0 auto;
  padding: 32px 24px 80px;
}

.ws-page__hero {
  position: relative;
  margin-bottom: 28px;
}

.ws-page__glow {
  position: absolute;
  top: -30px;
  left: -20px;
  width: 180px;
  height: 100px;
  background: var(--hero-glow-orange);
  border-radius: 50%;
  pointer-events: none;
}

.ws-page__title {
  position: relative;
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.ws-page__desc {
  position: relative;
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.ws-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 28px;
  align-items: flex-start;
}

.ws-layout__sidebar,
.ws-layout__main {
  min-width: 0;
}

.ws-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
}

.ws-toolbar__search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 6px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  transition: border-color 0.15s;
}

.ws-toolbar__search:focus-within {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow-orange);
}

.ws-toolbar__search-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.ws-toolbar__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--text);
  outline: none;
}

.ws-toolbar__search-input::placeholder {
  color: var(--text-muted);
}

.ws-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.ws-sort {
  display: flex;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}

.ws-sort__btn {
  padding: 4px 10px;
  border: none;
  border-radius: calc(var(--radius-sm) - 2px);
  background: transparent;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.15s;
  white-space: nowrap;
}

.ws-sort__btn--active {
  background: var(--bg-elevated);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.ws-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--gradient-orange);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
  transition: transform 0.15s;
  white-space: nowrap;
}

.ws-upload-btn:hover {
  transform: translateY(-1px);
}

.ws-script-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

@media (max-width: 900px) {
  .ws-script-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .ws-layout {
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 22px;
  }
}

@media (max-width: 960px) {
  .ws-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .ws-script-list {
    grid-template-columns: 1fr;
  }
}

.ws-load-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 0 8px;
}

.ws-load-more__sentinel {
  width: 100%;
  height: 1px;
}

.ws-load-more__text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.ws-load-more__text--error {
  color: var(--danger);
}

.ws-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  text-align: center;
}

.ws-empty__icon {
  margin-bottom: 16px;
  color: var(--text-muted);
}

.ws-empty__title {
  margin: 0 0 6px;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text);
}

.ws-empty__text {
  margin: 0 0 20px;
  font-size: var(--text-sm);
  color: var(--text-muted);
  max-width: 320px;
}

.ws-empty__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  background: var(--gradient-orange);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
  transition: transform 0.15s;
}

.ws-empty__btn:hover {
  transform: translateY(-1px);
}

/* Alerts */
.ws-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  margin-bottom: 16px;
}

.ws-alert--success {
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}

.ws-alert--error {
  background: var(--danger-soft);
  color: var(--danger);
  border: 1px solid var(--danger-border);
}

@media (max-width: 640px) {
  .ws-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .ws-toolbar__actions {
    justify-content: space-between;
  }
}

.ws-pagination {
  margin-top: 28px;
}


.ws-space-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
}

.ws-space-bar__info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ws-space-bar__icon {
  color: var(--accent);
}

.ws-space-bar__icon--team {
  color: var(--secondary);
}

.ws-space-bar__label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
}

.ws-space-bar__switch {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.ws-space-bar__switch:hover {
  border-color: var(--accent-border);
  color: var(--accent);
  background: var(--accent-soft);
}

@media (max-width: 600px) {
  .ws-space-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
.ws-filter-bar { display: flex; gap: 8px; }
.ws-filter-select { padding: 6px 10px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: var(--bg-muted); font-family: inherit; font-size: var(--text-sm); color: var(--text); outline: none; cursor: pointer; transition: border-color 0.15s; }
.ws-filter-select:focus { border-color: var(--accent-border); }
.ws-filter-select option { background: var(--bg-elevated); }
</style>
