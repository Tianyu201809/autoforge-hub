<script setup lang="ts">
const props = defineProps<{
  scriptId: string
  scriptTitle: string
}>()

const emit = defineEmits<{
  shared: [teamId: string]
  cancel: []
}>()

const { user } = useAuth()
const { getTeamsForUser, loadTeams } = useTeams()

const teams = computed(() => {
  if (!user.value) return []
  return getTeamsForUser(user.value.id)
})

const selectedTeamId = ref<string | null>(null)
const conflictError = ref('')
const sharing = ref(false)
const shareError = ref('')

// Load teams on mount
onMounted(() => {
  loadTeams()
})

// When team selection changes, check for name conflict
watch(selectedTeamId, async (newTeamId) => {
  conflictError.value = ''
  if (!newTeamId || !user.value) return

  try {
    const token = localStorage.getItem('autoforge-token')
    const res = await fetch(`/api/scripts/${props.scriptId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    // Cannot easily check per-team conflict from client.
    // Server will return 409 on submit; pre-flight is optional.
  } catch { /* pre-flight not critical */ }
})

function selectTeam(teamId: string) {
  selectedTeamId.value = selectedTeamId.value === teamId ? null : teamId
  shareError.value = ''
}

async function confirmShare() {
  if (!selectedTeamId.value) return
  sharing.value = true
  shareError.value = ''
  try {
    const token = localStorage.getItem('autoforge-token')
    const res = await fetch(`/api/scripts/${props.scriptId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ teamId: selectedTeamId.value }),
    })
    const data = await res.json()
    if (!res.ok) {
      shareError.value = data.message || '分享失败'
      return
    }
    emit('shared', selectedTeamId.value)
  } catch (err: any) {
    shareError.value = err.message || '分享失败，请重试'
  } finally {
    sharing.value = false
  }
}

function getTeamMemberCount(team: any): number {
  return team.memberCount || 0
}
</script>

<template>
  <Teleport to="body">
    <div class="share-overlay" @click.self="emit('cancel')">
      <div class="share-modal" role="dialog" aria-label="分享到团队">
        <!-- Close -->
        <button type="button" class="share-modal__close" title="关闭" @click="emit('cancel')">
          <Icon name="lucide:x" size="16" />
        </button>

        <!-- Header -->
        <div class="share-modal__head">
          <div class="share-modal__icon-ring">
            <Icon name="lucide:share-2" size="18" />
          </div>
          <h2 class="share-modal__title">分享到团队</h2>
          <p class="share-modal__desc">将「{{ scriptTitle }}」复制到所选团队空间</p>
        </div>

        <!-- Team list -->
        <div class="share-modal__body">
          <template v-if="teams.length > 0">
            <div class="share-team-list">
              <button
                v-for="team in teams"
                :key="team.id"
                type="button"
                class="share-team-item"
                :class="{ 'share-team-item--selected': selectedTeamId === team.id }"
                @click="selectTeam(team.id)"
              >
                <div class="share-team-item__radio">
                  <span v-if="selectedTeamId === team.id" class="share-team-item__dot" />
                </div>
                <div class="share-team-item__info">
                  <span class="share-team-item__name">{{ team.name }}</span>
                  <span class="share-team-item__meta">{{ getTeamMemberCount(team) }} 名成员</span>
                </div>
                <Icon name="lucide:users" size="14" class="share-team-item__icon" />
              </button>
            </div>
          </template>

          <div v-else class="share-empty">
            <Icon name="lucide:users" size="32" class="share-empty__icon" />
            <p>你还未加入任何团队</p>
          </div>

          <!-- Error -->
          <div v-if="shareError" class="share-error">
            <Icon name="lucide:alert-circle" size="14" />
            {{ shareError }}
          </div>
        </div>

        <!-- Actions -->
        <div class="share-modal__actions">
          <button type="button" class="share-modal__cancel" @click="emit('cancel')">
            取消
          </button>
          <button
            type="button"
            class="share-modal__confirm"
            :disabled="!selectedTeamId || sharing"
            @click="confirmShare"
          >
            <Icon v-if="sharing" name="lucide:loader-circle" size="14" class="share-modal__spin" />
            {{ sharing ? '分享中...' : '确认分享' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ─── Overlay ─── */
.share-overlay {
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
.share-modal {
  position: relative;
  width: min(92vw, 380px);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), var(--shadow-glow-purple);
  overflow: hidden;
  animation: modalRise 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.share-modal__close {
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

.share-modal__close:hover {
  background: var(--bg-muted);
  color: var(--text);
}

/* ─── Head ─── */
.share-modal__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 24px 0;
  text-align: center;
}

.share-modal__icon-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  margin-bottom: 12px;
}

.share-modal__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text);
}

.share-modal__desc {
  margin: 6px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* ─── Body ─── */
.share-modal__body {
  padding: 16px 24px;
}

/* ─── Team list ─── */
.share-team-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.share-team-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.share-team-item:hover {
  border-color: var(--border-strong);
}

.share-team-item--selected {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.share-team-item__radio {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border-strong);
  flex-shrink: 0;
  transition: border-color 0.15s;
}

.share-team-item--selected .share-team-item__radio {
  border-color: var(--accent);
}

.share-team-item__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.share-team-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.share-team-item__name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-team-item__meta {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.share-team-item__icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

/* ─── Empty ─── */
.share-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.share-empty__icon {
  opacity: 0.4;
}

.share-empty p {
  margin: 0;
}

/* ─── Error ─── */
.share-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--danger-soft);
  border: 1px solid var(--danger-border);
  font-size: var(--text-xs);
  color: var(--danger);
}

/* ─── Actions ─── */
.share-modal__actions {
  display: flex;
  gap: 10px;
  padding: 0 24px 24px;
}

.share-modal__cancel {
  flex: 1;
  padding: 10px 0;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: transparent;
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.share-modal__cancel:hover {
  background: var(--bg-muted);
  color: var(--text);
}

.share-modal__confirm {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  background: var(--gradient-orange);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
  cursor: pointer;
  transition: transform 0.15s, opacity 0.15s;
}

.share-modal__confirm:hover:not(:disabled) {
  transform: translateY(-1px);
}

.share-modal__confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.share-modal__spin {
  animation: spin 0.8s linear infinite;
}

/* ─── Animations ─── */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalRise {
  from { opacity: 0; transform: translateY(24px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
