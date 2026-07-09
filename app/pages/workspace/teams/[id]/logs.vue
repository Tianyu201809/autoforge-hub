<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const teamId = computed(() => route.params.id as string)

const { user } = useAuth()
const { getTeamById, loadTeams } = useTeams()
const { logs, loading, total, totalPages, currentPage, PAGE_SIZE, loadLogs, setPage } = useAuditLogs()

const activeFilter = ref('')

const team = computed(() => getTeamById(teamId.value))

const filterOptions = [
  { value: '', label: '全部', icon: 'lucide:list' },
  { value: 'upload', label: '上传', icon: 'lucide:upload' },
  { value: 'edit', label: '编辑', icon: 'lucide:pencil' },
  { value: 'delete', label: '删除', icon: 'lucide:trash-2' },
]

onMounted(() => {
  loadTeams()
  loadLogs(teamId.value, { page: 1 })
})

function handleFilterChange(value: string) {
  activeFilter.value = value
  setPage(1)
  loadLogs(teamId.value, { page: 1, actionType: value })
}

function handlePageChange(page: number) {
  setPage(page)
  loadLogs(teamId.value, { page, actionType: activeFilter.value })
}

function actionIcon(type: string): string {
  switch (type) {
    case 'upload': return 'lucide:upload'
    case 'edit': return 'lucide:pencil'
    case 'delete': return 'lucide:trash-2'
    default: return 'lucide:circle'
  }
}

function actionLabel(type: string): string {
  switch (type) {
    case 'upload': return '上传了脚本'
    case 'edit': return '编辑了脚本'
    case 'delete': return '删除了脚本'
    default: return '操作了脚本'
  }
}

function timeAgo(iso: string): string {
  const now = Date.now()
  const time = new Date(iso).getTime()
  const diff = now - time
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days === 1) return '昨天'
  if (days < 30) return `${days} 天前`
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}
</script>

<template>
  <div v-if="team" class="al-page">
    <WorkspaceWsHeader />

    <div class="al-page__body">
      <!-- Breadcrumb -->
      <div class="al-breadcrumb">
        <button type="button" class="al-back al-back--btn" @click="router.back()">
          <Icon name="lucide:arrow-left" size="14" />
          返回
        </button>
        <span class="al-breadcrumb__sep">·</span>
        <NuxtLink :to="`/workspace/teams/${teamId}`" class="al-back">
          团队详情
        </NuxtLink>
      </div>

      <!-- Header -->
      <div class="al-header">
        <div class="al-header__info">
          <div class="al-header__glow" aria-hidden="true" />
          <h1 class="al-header__title">操作日志</h1>
          <p class="al-header__subtitle">{{ team?.name }} · 共 {{ total }} 条记录</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="al-filters">
        <button
          v-for="opt in filterOptions"
          :key="opt.value"
          type="button"
          class="al-filter-btn"
          :class="{ 'al-filter-btn--active': activeFilter === opt.value }"
          @click="handleFilterChange(opt.value)"
        >
          <Icon :name="opt.icon" size="14" />
          {{ opt.label }}
        </button>
      </div>

      <!-- Timeline -->
      <div class="al-timeline">
        <div v-if="loading" class="al-loading">
          <Icon name="lucide:loader-circle" size="24" class="al-loading__spin" />
          加载中...
        </div>

        <template v-else-if="logs.length > 0">
          <div
            v-for="(log, idx) in logs"
            :key="log.id"
            class="al-entry"
            :class="{
              'al-entry--upload': log.actionType === 'upload',
              'al-entry--edit': log.actionType === 'edit',
              'al-entry--delete': log.actionType === 'delete',
            }"
          >
            <div class="al-entry__line" :class="{ 'al-entry__line--last': idx === logs.length - 1 }" />
            <div class="al-entry__dot">
              <div class="al-entry__dot-inner">
                <Icon :name="actionIcon(log.actionType)" size="12" />
              </div>
            </div>
            <div class="al-entry__card">
              <div class="al-entry__card-top">
                <div class="al-entry__user">
                  <span class="al-entry__avatar">{{ getInitials(log.userName) }}</span>
                  <span class="al-entry__name">{{ log.userName }}</span>
                </div>
                <span class="al-entry__time" :title="formatTime(log.createdAt)">{{ timeAgo(log.createdAt) }}</span>
              </div>
              <p class="al-entry__desc">
                {{ actionLabel(log.actionType) }}
                <strong class="al-entry__script-name">{{ log.scriptName }}</strong>
              </p>
              <div v-if="log.actionType === 'edit' && log.details?.changes?.length" class="al-entry__changes">
                <span
                  v-for="change in log.details.changes"
                  :key="change"
                  class="al-entry__change-tag"
                >{{ {
                  title: '标题', description: '描述', tags: '标签', icon: '图标',
                }[change] || change }}</span>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="al-empty">
          <div class="al-empty__icon">
            <Icon name="lucide:history" size="48" />
          </div>
          <h3 class="al-empty__title">暂无操作日志</h3>
          <p class="al-empty__text">团队成员对脚本的操作记录将在这里显示</p>
        </div>
      </div>

      <!-- Pagination -->
      <WorkspaceWsPagination
        v-if="totalPages > 1"
        :current-page="currentPage"
        :total-pages="totalPages"
        @page-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.al-page {
  min-height: 100vh;
}

.al-page__body {
  max-width: 720px;
  margin: 0 auto;
  padding: 28px 24px 80px;
}

.al-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-muted);
  transition: color 0.15s;
  text-decoration: none;
}

.al-back:hover {
  color: var(--accent);
}

.al-back--btn {
  border: none;
  background: none;
  padding: 0;
  font-family: inherit;
  cursor: pointer;
}

.al-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 20px;
}

.al-breadcrumb__sep {
  font-size: var(--text-sm);
  color: var(--text-muted);
  opacity: 0.4;
}

/* ── Header ── */
.al-header {
  position: relative;
  margin-bottom: 28px;
}

.al-header__glow {
  position: absolute;
  top: -40px;
  left: -30px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--accent-soft) 0%, transparent 70%);
  opacity: 0.4;
  pointer-events: none;
  z-index: 0;
}

.al-header__info {
  position: relative;
  z-index: 1;
}

.al-header__title {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
}

.al-header__subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

/* ── Filters ── */
.al-filters {
  display: flex;
  gap: 6px;
  margin-bottom: 24px;
}

.al-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-elevated);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.al-filter-btn:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.al-filter-btn--active {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

/* ── Timeline ── */
.al-timeline {
  position: relative;
}

.al-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.al-loading__spin {
  animation: alSpin 0.8s linear infinite;
}

/* ── Entry ── */
.al-entry {
  position: relative;
  display: flex;
  gap: 16px;
  padding-bottom: 24px;
}

.al-entry__line {
  position: absolute;
  left: 16px;
  top: 28px;
  bottom: 0;
  width: 2px;
  background: var(--border);
}

.al-entry__line--last {
  display: none;
}

.al-entry__dot {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 34px;
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.al-entry__dot-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-muted);
  transition: all 0.2s;
}

.al-entry--upload .al-entry__dot-inner {
  border-color: #22c55e;
  color: #22c55e;
  background: color-mix(in srgb, #22c55e 10%, var(--bg-elevated));
}

.al-entry--edit .al-entry__dot-inner {
  border-color: #3b82f6;
  color: #3b82f6;
  background: color-mix(in srgb, #3b82f6 10%, var(--bg-elevated));
}

.al-entry--delete .al-entry__dot-inner {
  border-color: #ef4444;
  color: #ef4444;
  background: color-mix(in srgb, #ef4444 10%, var(--bg-elevated));
}

/* ── Card ── */
.al-entry__card {
  flex: 1;
  min-width: 0;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  transition: border-color 0.15s;
}

.al-entry__card:hover {
  border-color: var(--border-accent);
}

.al-entry__card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.al-entry__user {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.al-entry__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--secondary-soft);
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--secondary);
  flex-shrink: 0;
}

.al-entry__name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.al-entry__time {
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.al-entry__desc {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-snug);
}

.al-entry__script-name {
  color: var(--text);
  font-weight: 600;
}

.al-entry__changes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.al-entry__change-tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--accent);
}

/* ── Empty ── */
.al-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  text-align: center;
}

.al-empty__icon {
  margin-bottom: 16px;
  color: var(--text-muted);
}

.al-empty__title {
  margin: 0 0 6px;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text);
}

.al-empty__text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

/* ── Animations ── */
@keyframes alSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ── Pagination ── */
.al-page__body :deep(.ws-pagination) {
  margin-top: 28px;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .al-page__body {
    padding: 20px 16px 80px;
  }

  .al-entry__card-top {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
