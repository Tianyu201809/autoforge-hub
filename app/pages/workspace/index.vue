<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

useHead({
  title: '选择空间 - Autoforge Hub'
})

const { user } = useAuth()
const { loadScripts } = useScripts()
const { getTeamsForUser, loadTeams } = useTeams()

onMounted(() => {
  loadScripts()
  loadTeams()
})

const userTeams = computed(() => {
  if (!user.value) return []
  return getTeamsForUser(user.value.id)
})
</script>

<template>
  <div class="ws-dashboard" v-if="user">
    <WorkspaceWsHeader />

    <div class="ws-dashboard__body">
      <!-- Hero -->
      <div class="ws-hero">
        <div class="ws-hero__glow ws-hero__glow--purple" aria-hidden="true" />
        <div class="ws-hero__glow ws-hero__glow--orange" aria-hidden="true" />
        <img src="/logo.png" alt="" class="ws-hero__logo" width="56" height="56">
        <h1 class="ws-hero__title">
          Autoforge <span class="ws-hero__accent">Hub</span>
        </h1>
        <p class="ws-hero__subtitle">
          <span class="ws-hero__user">{{ user.displayName }}</span>，请选择要进入的工作空间
        </p>
      </div>

      <!-- Main selection cards -->
      <div class="ws-selection">
        <NuxtLink to="/workspace/personal" class="ws-selection__card ws-selection__card--personal">
          <div class="ws-selection__bg" aria-hidden="true" />
          <div class="ws-selection__icon">
            <Icon name="lucide:user" size="32" />
          </div>
          <div class="ws-selection__content">
            <h2 class="ws-selection__title">个人空间</h2>
            <p class="ws-selection__desc">私人脚本仓库，仅你可见。上传、管理、检索自己的脚本包。</p>
          </div>
          <div class="ws-selection__action">
            <span>进入</span>
            <Icon name="lucide:arrow-right" size="16" />
          </div>
        </NuxtLink>

        <NuxtLink to="/workspace/teams" class="ws-selection__card ws-selection__card--teams">
          <div class="ws-selection__bg" aria-hidden="true" />
          <div class="ws-selection__icon">
            <Icon name="lucide:users" size="32" />
          </div>
          <div class="ws-selection__content">
            <h2 class="ws-selection__title">团队空间</h2>
            <p class="ws-selection__desc">与团队成员协作共享。查看团队脚本、管理共享资源。</p>
          </div>
          <div class="ws-selection__action">
            <span>进入</span>
            <Icon name="lucide:arrow-right" size="16" />
          </div>
        </NuxtLink>
      </div>

      <!-- Teams quick-jump -->
      <section v-if="userTeams.length > 0" class="ws-quick-teams">
        <div class="ws-quick-teams__head">
          <h2 class="ws-quick-teams__title">快捷进入团队</h2>
          <NuxtLink to="/workspace/teams" class="ws-quick-teams__more">
            管理团队
            <Icon name="lucide:chevron-right" size="14" />
          </NuxtLink>
        </div>
        <div class="ws-quick-teams__grid">
          <NuxtLink
            v-for="team in userTeams"
            :key="team.id"
            :to="`/workspace/teams/${team.id}`"
            class="ws-quick-team"
          >
            <div class="ws-quick-team__icon">
              <Icon name="lucide:users" size="16" />
            </div>
            <div class="ws-quick-team__info">
              <span class="ws-quick-team__name">{{ team.name }}</span>
              <span class="ws-quick-team__meta">{{ team.memberCount }} 名成员</span>
            </div>
            <Icon name="lucide:chevron-right" size="14" class="ws-quick-team__chevron" />
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.ws-dashboard {
  min-height: 100vh;
  background: var(--bg);
}

.ws-dashboard__body {
  max-width: 800px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

/* ── Hero ── */
.ws-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 44px;
  padding: 24px 0;
}

.ws-hero__glow {
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
}

.ws-hero__glow--purple {
  top: -40px;
  left: 50%;
  width: 300px;
  height: 160px;
  background: var(--hero-glow-purple);
  transform: translateX(-80%);
}

.ws-hero__glow--orange {
  top: -10px;
  right: 50%;
  width: 260px;
  height: 120px;
  background: var(--hero-glow-orange);
  transform: translateX(80%);
}

.ws-hero__logo {
  position: relative;
  border-radius: 50%;
  box-shadow: var(--logo-shadow);
  margin-bottom: 14px;
}

.ws-hero__title {
  position: relative;
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 3.5vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text);
}

.ws-hero__accent {
  color: var(--accent);
}

.ws-hero__subtitle {
  position: relative;
  margin: 0;
  font-size: var(--text-base);
  color: var(--text-secondary);
}

.ws-hero__user {
  color: var(--accent);
  font-weight: 600;
}

/* ── Selection Cards ── */
.ws-selection {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 32px;
}

.ws-selection__card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 28px 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition: border-color 0.25s, box-shadow 0.35s, transform 0.25s;
  color: inherit;
  animation: cardIn 0.4s ease both;
}

.ws-selection__card:nth-child(2) {
  animation-delay: 80ms;
}

.ws-selection__card:hover {
  transform: translateY(-4px);
}

.ws-selection__card--personal:hover {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-card-hover), var(--shadow-glow-orange);
}

.ws-selection__card--teams:hover {
  border-color: var(--secondary-border);
  box-shadow: var(--shadow-card-hover), var(--shadow-glow-purple);
}

.ws-selection__bg {
  position: absolute;
  top: -60px;
  right: -40px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0.06;
  transition: opacity 0.3s;
}

.ws-selection__card--personal .ws-selection__bg {
  background: var(--accent);
}

.ws-selection__card--teams .ws-selection__bg {
  background: var(--secondary);
}

.ws-selection__card:hover .ws-selection__bg {
  opacity: 0.12;
}

.ws-selection__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.ws-selection__card--personal .ws-selection__icon {
  background: var(--accent-soft);
  color: var(--accent);
  filter: var(--icon-accent-filter);
}

.ws-selection__card--teams .ws-selection__icon {
  background: var(--secondary-soft);
  color: var(--secondary);
  filter: var(--icon-purple-filter);
}

.ws-selection__content {
  flex: 1;
}

.ws-selection__title {
  margin: 0 0 6px;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text);
}

.ws-selection__desc {
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
  color: var(--text-secondary);
}

.ws-selection__action {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: 600;
  transition: gap 0.2s;
}

.ws-selection__card--personal .ws-selection__action {
  color: var(--accent);
}

.ws-selection__card--teams .ws-selection__action {
  color: var(--secondary);
}

.ws-selection__card:hover .ws-selection__action {
  gap: 10px;
}

/* ── Quick Teams ── */
.ws-quick-teams {
  margin-bottom: 40px;
}

.ws-quick-teams__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.ws-quick-teams__title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
}

.ws-quick-teams__more {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
  transition: color 0.15s;
}

.ws-quick-teams__more:hover {
  color: var(--accent);
}

.ws-quick-teams__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.ws-quick-team {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  transition: border-color 0.15s, background 0.15s;
  color: inherit;
}

.ws-quick-team:hover {
  border-color: var(--secondary-border);
  background: var(--secondary-soft);
}

.ws-quick-team__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: var(--secondary-soft);
  flex-shrink: 0;
  color: var(--secondary);
}

.ws-quick-team__info {
  flex: 1;
  min-width: 0;
}

.ws-quick-team__name {
  display: block;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ws-quick-team__meta {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.ws-quick-team__chevron {
  flex-shrink: 0;
  color: var(--text-muted);
}

/* ── Animations ── */
@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .ws-selection {
    grid-template-columns: 1fr;
  }

  .ws-quick-teams__grid {
    grid-template-columns: 1fr;
  }

  .ws-dashboard__body {
    padding: 32px 16px 64px;
  }
}
</style>
