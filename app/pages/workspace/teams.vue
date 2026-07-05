<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

useHead({
  title: '团队空间 - Autoforge Hub'
})

const { user } = useAuth()
const {
  getTeamsForUser,
  getStoredTeamById,
  isTeamOwner,
  createTeam,
  joinTeam,
  deleteTeam,
  getTeamInviteCode,
  resolveInviteCode,
  teams,
  loadTeams,
  hydrated
} = useTeams()

const showCreate = ref(false)
const showJoin = ref(false)
const actionError = ref('')
const actionSuccess = ref('')

onMounted(() => {
  loadTeams()
})

const userTeams = computed(() => {
  if (!user.value) return []
  // Explicitly track teams ref for reactivity
  void teams.value
  return getTeamsForUser(user.value.id)
})

function isOwnedTeam(teamId: string): boolean {
  if (!user.value) return false
  return isTeamOwner(teamId, user.value.id)
}

function handleCreate(payload: { name: string; description: string }) {
  if (!user.value) return
  actionError.value = ''
  actionSuccess.value = ''
  const result = createTeam(payload.name, payload.description, user.value.id)
  if (!result.ok) {
    actionError.value = result.error
    return
  }
  showCreate.value = false
  actionSuccess.value = `团队「${result.team.name}」创建成功！`
  setTimeout(() => { actionSuccess.value = '' }, 4000)
}

function handleJoin(code: string) {
  if (!user.value) return
  actionError.value = ''
  actionSuccess.value = ''

  const teamId = resolveInviteCode(code)
  if (!teamId) {
    actionError.value = '无效的邀请码'
    return
  }

  const storedTeam = getStoredTeamById(teamId)
  if (!storedTeam) {
    actionError.value = '邀请码无效或团队已不存在'
    return
  }

  const result = joinTeam(teamId, user.value.id)
  if (!result.ok) {
    actionError.value = result.error
    return
  }

  showJoin.value = false
  actionSuccess.value = `已成功加入团队「${storedTeam.name}」！`
  setTimeout(() => { actionSuccess.value = '' }, 4000)
}

function handleDeleteTeam(teamId: string) {
  if (!user.value) return
  actionError.value = ''
  const result = deleteTeam(teamId, user.value.id)
  if (!result.ok) {
    actionError.value = result.error
  }
}

function copyInviteCode(teamId: string) {
  const code = getTeamInviteCode(teamId)
  navigator.clipboard.writeText(code).then(() => {
    actionSuccess.value = '邀请码已复制到剪贴板！'
    setTimeout(() => { actionSuccess.value = '' }, 3000)
  })
}
</script>

<template>
  <div class="ws-page" v-if="user">
    <WsHeader />
    
    <div class="ws-page__body">
      <div class="ws-page__hero">
        <div class="ws-page__glow" aria-hidden="true" />
        <h1 class="ws-page__title">团队空间</h1>
        <p class="ws-page__desc">查看你加入的团队，创建新团队或通过邀请码加入已有团队</p>
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

      <!-- Actions -->
      <div class="ws-team-actions">
        <button type="button" class="ws-team-btn ws-team-btn--primary" @click="showCreate = true">
          <Icon name="lucide:plus" size="16" />
          创建团队
        </button>
        <button type="button" class="ws-team-btn ws-team-btn--ghost" @click="showJoin = true">
          <Icon name="lucide:user-plus" size="16" />
          加入团队
        </button>
      </div>

      <!-- Team list -->
      <div v-if="userTeams.length > 0" class="ws-team-grid">
        <WsTeamCard
          v-for="team in userTeams"
          :key="team.id"
          :team="team"
          :is-owner="isOwnedTeam(team.id)"
          :can-delete="isOwnedTeam(team.id)"
          @delete="handleDeleteTeam"
        />
      </div>

      <div v-else class="ws-empty">
        <Icon name="lucide:users" size="48" class="ws-empty__icon" />
        <h2 class="ws-empty__title">还没有加入任何团队</h2>
        <p class="ws-empty__text">
          创建你自己的团队，或通过邀请码加入已有团队
        </p>
      </div>

      <!-- Invite hint -->
      <div v-if="userTeams.length > 0" class="ws-invite-hint">
        <Icon name="lucide:info" size="15" />
        <span>在团队详情页可以复制邀请码，分享给其他人加入</span>
      </div>
    </div>

    <Teleport to="body">
      <WsCreateTeamModal
        v-if="showCreate"
        @close="showCreate = false"
        @created="handleCreate"
      />
      <WsJoinTeamModal
        v-if="showJoin"
        @close="showJoin = false"
        @joined="handleJoin"
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
  padding: 32px 24px 80px;
}

.ws-page__hero {
  position: relative;
  margin-bottom: 24px;
}

.ws-page__glow {
  position: absolute;
  top: -30px;
  left: -20px;
  width: 200px;
  height: 100px;
  background: var(--hero-glow-purple);
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

.ws-team-actions {
  display: flex;
  gap: 10px;
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
  border-color: var(--secondary-border);
  color: var(--text);
  box-shadow: var(--shadow-glow-purple);
}

.ws-team-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.ws-invite-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .ws-team-grid {
    grid-template-columns: 1fr;
  }

  .ws-team-actions {
    flex-direction: column;
  }
}
</style>
