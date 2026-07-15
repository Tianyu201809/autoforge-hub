<script setup lang="ts">
import type { Team } from '~/types/workspace'

const props = defineProps<{
  team: Team
  isOwner: boolean
  canDelete?: boolean
}>()

const emit = defineEmits<{
  delete: [teamId: string]
}>()

const { getTeamAvatarSrc } = useTeams()

const showConfirm = ref(false)

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function handleDelete() {
  if (showConfirm.value) {
    emit('delete', props.team.id)
    showConfirm.value = false
  } else {
    showConfirm.value = true
    setTimeout(() => { showConfirm.value = false }, 3000)
  }
}
</script>

<template>
  <NuxtLink :to="`/workspace/teams/${team.id}`" class="team-card">
    <div class="team-card__header">
      <div class="team-card__icon">
        <img
          v-if="team.avatarUrl"
          :src="getTeamAvatarSrc(team.avatarUrl)"
          alt=""
          class="team-card__avatar-img"
        >
        <Icon
          v-else
          :name="`lucide:${team.icon || 'users'}`"
          size="24"
          class="team-card__users-icon"
          :style="team.iconColor ? { color: team.iconColor } : undefined"
        />
      </div>
      <div class="team-card__info">
        <h3 class="team-card__name">{{ team.name }}</h3>
        <p class="team-card__meta">{{ formatDate(team.createdAt) }} 创建</p>
      </div>
      <div class="team-card__actions">
        <Icon name="lucide:arrow-up-right" size="17" class="team-card__arrow" aria-hidden="true" />
        <button
          v-if="canDelete"
          type="button"
          class="team-card__delete"
          :class="{ 'team-card__delete--confirm': showConfirm }"
          :title="showConfirm ? '确认删除' : '删除团队'"
          @click.stop="handleDelete"
        >
          <Icon :name="showConfirm ? 'lucide:trash-2' : 'lucide:trash-2'" size="15" />
        </button>
      </div>
    </div>

    <p v-if="team.description" class="team-card__desc">{{ team.description }}</p>

    <div class="team-card__footer">
      <span class="team-card__members">
        <span class="team-card__member-icon" aria-hidden="true">
          <Icon name="lucide:users" size="13" />
        </span>
        {{ team.memberCount }} 名成员
      </span>
      <span v-if="isOwner" class="team-card__owner-badge">创建者</span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.team-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 172px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-card);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  animation: cardReveal 0.35s ease both;
  color: inherit;
}

.team-card:hover {
  border-color: var(--secondary-border);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.team-card__header {
  display: flex;
  align-items: center;
  gap: 13px;
}

.team-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--secondary-soft);
  flex-shrink: 0;
  overflow: hidden;
}

.team-card__users-icon {
  color: var(--secondary);
}

.team-card__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.team-card__info {
  flex: 1;
  min-width: 0;
}

.team-card__name {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-card__meta {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.team-card__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.team-card__owner-badge {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--secondary-soft);
  border: 1px solid var(--secondary-border);
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--secondary);
  white-space: nowrap;
}

.team-card__arrow {
  margin-right: 4px;
  color: var(--text-muted);
  transition: color 0.2s ease, transform 0.2s ease;
}

.team-card:hover .team-card__arrow {
  color: var(--secondary);
  transform: translate(2px, -2px);
}

.team-card__delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  transition: background 0.12s, color 0.12s;
}

.team-card__delete:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.team-card__delete--confirm {
  background: var(--danger-soft);
  color: var(--danger);
  animation: pulse 0.8s ease infinite;
}

.team-card__desc {
  margin: 0;
  font-size: var(--text-sm);
  min-height: calc(var(--text-sm) * 2 * 1.45);
  line-height: 1.45;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.team-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.team-card__members {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
}

.team-card__member-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--secondary-soft);
  color: var(--secondary);
}

@keyframes cardReveal {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
