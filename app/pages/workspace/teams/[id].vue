<script setup lang="ts">
import type { ScriptSort } from '~/types/workspace'

definePageMeta({
  layout: 'default'
})

const route = useRoute()
const teamId = computed(() => route.params.id as string)

const { user } = useAuth()
const {
  getTeamById,
  getStoredTeamById,
  isTeamOwner,
  isTeamMember,
  leaveTeam,
  deleteTeam,
  getTeamInviteCode,
  loadTeams,
  hydrated: teamsHydrated
} = useTeams()

const {
  getTeamScripts,
  addScript,
  deleteScript,
  loadScripts,
  hydrated: scriptsHydrated
} = useScripts()

const searchQuery = ref('')
const sortBy = ref<ScriptSort>('newest')
const showUpload = ref(false)
const showEdit = ref(false)
const editingScript = ref<any>(null)
const actionError = ref('')
const actionSuccess = ref('')

onMounted(() => {
  loadTeams()
  loadScripts()
})

const team = computed(() => getTeamById(teamId.value))
const storedTeam = computed(() => getStoredTeamById(teamId.value))

const isOwner = computed(() => {
  if (!user.value || !team.value) return false
  return isTeamOwner(teamId.value, user.value.id)
})

const isMember = computed(() => {
  if (!user.value || !team.value) return false
  return isTeamMember(teamId.value, user.value.id)
})

const teamScripts = computed(() => {
  if (!team.value) return []
  let scripts = getTeamScripts(teamId.value)
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    scripts = scripts.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
    )
  }
  const sorted = [...scripts]
  switch (sortBy.value) {
    case 'newest':
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      break
    case 'oldest':
      sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      break
    case 'name':
      sorted.sort((a, b) => a.title.localeCompare(b.title))
      break
  }
  return sorted
})

async function handleUpload(payload: { title: string; description: string; zipName: string; zipSize: number; tags: string[]; file: File }) {
  if (!user.value || !teamId.value) return
  await addScript(
    payload.title,
    payload.description,
    payload.zipName,
    payload.zipSize,
    payload.tags,
    user.value.id,
    teamId.value,
    payload.file
  )
  showUpload.value = false
  loadScripts()
}

function handleEditScript(script: any) {
  editingScript.value = script
  showEdit.value = true
}

async function handleEditSave(payload: { id: string; title: string; description: string; tags: string[] }) {
  const token = localStorage.getItem("autoforge-token")
  try {
    await fetch("/api/scripts/" + payload.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ title: payload.title, description: payload.description, tags: payload.tags })
    })
  } catch (e) {}
  showEdit.value = false
  loadScripts()
}

function handleDeleteScript(id: string) {
  deleteScript(id)
}

async function handleLeave() {
  if (!user.value) return
  actionError.value = ''
  actionSuccess.value = ''
  const result = await leaveTeam(teamId.value)
  if (!result.ok) {
    actionError.value = result.error
    return
  }
  actionSuccess.value = '已退出团队'
  navigateTo('/workspace/teams')
}

async function handleDeleteTeam() {
  if (!user.value) return
  actionError.value = ''
  const result = await deleteTeam(teamId.value)
  if (!result.ok) {
    actionError.value = result.error
    return
  }
  navigateTo('/workspace/teams')
}

function copyInviteCode() {
  const code = getTeamInviteCode(teamId.value)
  navigator.clipboard.writeText(code).then(() => {
    actionSuccess.value = '邀请码已复制到剪贴板！'
    setTimeout(() => { actionSuccess.value = '' }, 3000)
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="ws-page" v-if="user">
    <WsHeader />

    <div class="ws-page__body">
      <template v-if="team">
        <!-- Back link -->
        <NuxtLink to="/workspace/teams" class="ws-back">
          <Icon name="lucide:arrow-left" size="15" />
          返回团队列表
        </NuxtLink>

        <!-- Team header -->
        <div class="ws-team-header">
          <div class="ws-team-header__icon">
            <Icon name="lucide:users" size="32" class="ws-team-header__users-icon" />
          </div>
          <div class="ws-team-header__info">
            <h1 class="ws-team-header__name">{{ team.name }}</h1>
            <p class="ws-team-header__meta">
              {{ team.memberCount }} 名成员 · {{ formatDate(team.createdAt) }} 创建
              <span v-if="isOwner" class="ws-team-header__badge">创建者</span>
            </p>
            <p v-if="storedTeam?.description" class="ws-team-header__desc">{{ storedTeam.description }}</p>
          </div>
        </div>

        <!-- Alerts -->
        <div v-if="actionError" class="ws-alert ws-alert--error" role="alert">
          <Icon name="lucide:alert-circle" size="15" />
          {{ actionError }}
        </div>
        <div v-if="actionSuccess" class="ws-alert ws-alert--success" role="status">
          <Icon name="lucide:check-circle" size="15" />
          {{ actionSuccess }}
        </div>

        <!-- Team actions -->
        <div class="ws-space-bar ws-space-bar--team">
        <div class="ws-space-bar__info">
          <Icon name="lucide:users" size="16" class="ws-space-bar__icon ws-space-bar__icon--team" />
          <span class="ws-space-bar__label">团队空间：{{ team?.name || "" }}</span>
        </div>
        <NuxtLink to="/workspace/personal" class="ws-space-bar__switch">
          <Icon name="lucide:user" size="14" />
          切换到个人空间
        </NuxtLink>
      </div>
      <div class="ws-team-actions ws-team-actions--detail">
          <button type="button" class="ws-team-btn ws-team-btn--primary" @click="showUpload = true">
            <Icon name="lucide:upload" size="16" />
            上传到团队
          </button>
          <button v-if="isOwner" type="button" class="ws-team-btn ws-team-btn--ghost" @click="copyInviteCode">
            <Icon name="lucide:copy" size="16" />
            复制邀请码
          </button>
          <button v-if="!isOwner && isMember" type="button" class="ws-team-btn ws-team-btn--ghost ws-team-btn--danger" @click="handleLeave">
            <Icon name="lucide:log-out" size="16" />
            退出团队
          </button>
          <button v-if="isOwner" type="button" class="ws-team-btn ws-team-btn--ghost ws-team-btn--danger" @click="handleDeleteTeam">
            <Icon name="lucide:trash-2" size="16" />
            删除团队
          </button>
        </div>

        <!-- Search & sort -->
        <div class="ws-toolbar">
          <div class="ws-toolbar__search">
            <Icon name="lucide:search" size="16" class="ws-toolbar__search-icon" />
            <input
              v-model="searchQuery"
              type="search"
              class="ws-toolbar__search-input"
              placeholder="搜索团队脚本..."
            >
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
          </div>
        </div>

        <!-- Scripts list -->
        <div v-if="teamScripts.length > 0" class="ws-script-list">
          <WsScriptCard
            @edit="handleEditScript"
            v-for="script in teamScripts"
            :key="script.id"
            :script="script"
            :deletable="isOwner || script.ownerId === user.id"
            @delete="handleDeleteScript"
          />
        </div>

        <div v-else class="ws-empty">
          <Icon name="lucide:package" size="48" class="ws-empty__icon" />
          <h2 class="ws-empty__title">{{ searchQuery ? '没有匹配的脚本' : '团队还没有脚本' }}</h2>
          <p class="ws-empty__text">
            {{ searchQuery ? '试试其他关键词' : '上传第一个 .zip 脚本包，与团队成员共享' }}
          </p>
          <button v-if="!searchQuery" type="button" class="ws-empty__btn" @click="showUpload = true">
            <Icon name="lucide:upload" size="16" />
            上传第一个脚本
          </button>
        </div>
      </template>

      <!-- Team not found -->
      <div v-else class="ws-error-state">
        <Icon name="lucide:search-x" size="48" class="ws-error-state__icon" />
        <h2 class="ws-error-state__title">团队不存在</h2>
        <p class="ws-error-state__text">该团队可能已被删除，或你尚未加入</p>
        <NuxtLink to="/workspace/teams" class="ws-error-state__link">
          返回团队列表
        </NuxtLink>
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
  </div>
</template>

<style scoped>
.ws-page {
  min-height: 100vh;
  background: var(--bg);
}

.ws-page__body {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 24px 80px;
}

.ws-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 20px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-muted);
  transition: color 0.15s;
}

.ws-back:hover {
  color: var(--accent);
}

.ws-team-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.ws-team-header__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  background: var(--secondary-soft);
  flex-shrink: 0;
}

.ws-team-header__users-icon {
  color: var(--secondary);
}

.ws-team-header__info {
  flex: 1;
  min-width: 0;
}

.ws-team-header__name {
  margin: 0 0 4px;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text);
}

.ws-team-header__meta {
  margin: 0 0 6px;
  font-size: var(--text-sm);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ws-team-header__badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--secondary-soft);
  border: 1px solid var(--secondary-border);
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--secondary);
}

.ws-team-header__desc {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-snug);
}

.ws-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  margin-bottom: 16px;
}

.ws-alert--error {
  background: var(--danger-soft);
  color: var(--danger);
  border: 1px solid var(--danger-border);
}

.ws-alert--success {
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}

.ws-team-actions--detail {
  margin-bottom: 24px;
}

.ws-team-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 600;
  transition: all 0.15s;
  margin-right: 8px;
  margin-bottom: 8px;
}

.ws-team-btn--primary {
  border: 1px solid var(--accent-border);
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
}

.ws-team-btn--primary:hover {
  transform: translateY(-1px);
}

.ws-team-btn--ghost {
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.ws-team-btn--ghost:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.ws-team-btn--danger {
  color: var(--danger);
}

.ws-team-btn--danger:hover {
  border-color: var(--danger-border);
  background: var(--danger-soft);
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

.ws-script-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.ws-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}

.ws-error-state__icon {
  margin-bottom: 16px;
  color: var(--text-muted);
}

.ws-error-state__title {
  margin: 0 0 6px;
  font-size: var(--text-lg);
  font-weight: 600;
}

.ws-error-state__text {
  margin: 0 0 20px;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.ws-error-state__link {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  transition: border-color 0.15s;
}

.ws-error-state__link:hover {
  border-color: var(--accent-border);
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
  color: var(--secondary);
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
  color: var(--secondary);
  background: var(--accent-soft);
}

@media (max-width: 600px) {
  .ws-space-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
