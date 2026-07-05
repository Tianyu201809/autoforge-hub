<script setup lang="ts">
import type { User } from '~/types/auth'

const { user, logout } = useAuth()
const { teams, loadTeams } = useTeams()

const showMenu = ref(false)
const menuRef = ref<HTMLElement>()
const subMenuLeft = ref(false)
const subTriggerRef = ref<HTMLElement>()

const userTeams = computed(() => teams.value)

function onSubEnter() {
  nextTick(() => {
    if (!subTriggerRef.value) return
    const rect = subTriggerRef.value.getBoundingClientRect()
    const subMenu = subTriggerRef.value.querySelector('.ws-user-dropdown__sub-menu') as HTMLElement
    if (!subMenu) return
    const menuWidth = subMenu.offsetWidth
    subMenuLeft.value = rect.right + menuWidth > window.innerWidth
  })
}

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function handleLogout() {
  showMenu.value = false
  logout()
  navigateTo('/login')
}

function getUserInitials(u: User): string {
  const name = u.displayName || u.email
  return name.slice(0, 2).toUpperCase()
}

onMounted(() => {
  loadTeams()
  function handleClickOutside(e: MouseEvent) {
    if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
      showMenu.value = false
    }
  }
  document.addEventListener('click', handleClickOutside)
  onUnmounted(() => document.removeEventListener('click', handleClickOutside))
})
</script>

<template>
  <header class="ws-header">
    <div class="ws-header__inner">
      <div class="ws-header__left">
        <NuxtLink to="/workspace" class="ws-brand">
          <img src="/logo.png" alt="Autoforge Hub" class="ws-brand__logo" width="28" height="28">
          <span class="ws-brand__text">
            Autoforge<span class="ws-brand__accent">Hub</span>
          </span>
        </NuxtLink>

        <nav class="ws-nav" aria-label="Workspace navigation">
          <NuxtLink to="/workspace/personal" class="ws-nav__link" active-class="ws-nav__link--active">
            <Icon name="lucide:user" size="16" />
            <span>个人空间</span>
          </NuxtLink>
          <NuxtLink to="/workspace/teams" class="ws-nav__link" active-class="ws-nav__link--active">
            <Icon name="lucide:users" size="16" />
            <span>团队空间</span>
          </NuxtLink>
        </nav>
      </div>

      <div class="ws-header__right">
        <HubThemeToggle />
        <NuxtLink to="/workspace" class="ws-back-link" title="返回空间选择">
          <Icon name="lucide:arrow-left" size="16" />
          <span>返回选择</span>
        </NuxtLink>

        <div v-if="user" ref="menuRef" class="ws-user-menu">
          <button
            type="button"
            class="ws-user-btn"
            :class="{ 'ws-user-btn--open': showMenu }"
            @click="toggleMenu"
            :aria-label="user.displayName"
          >
            <span class="ws-user-btn__avatar">{{ getUserInitials(user) }}</span>
            <div class="ws-user-btn__info">
              <span class="ws-user-btn__name">{{ user.displayName }}</span>
              <span class="ws-user-btn__email">{{ user.email }}</span>
            </div>
            <Icon name="lucide:chevron-down" size="14" class="ws-user-btn__chevron" />
          </button>

          <Transition name="menu">
            <div v-if="showMenu" class="ws-user-dropdown">
              <div class="ws-user-dropdown__head">
                <span class="ws-user-dropdown__avatar">{{ getUserInitials(user) }}</span>
                <div>
                  <p class="ws-user-dropdown__name">{{ user.displayName }}</p>
                  <p class="ws-user-dropdown__email">{{ user.email }}</p>
                </div>
              </div>
              <div class="ws-user-dropdown__divider" />
              <NuxtLink to="/workspace" class="ws-user-dropdown__item" @click="showMenu = false">
                <Icon name="lucide:layout-dashboard" size="16" />
                工作区
              </NuxtLink>
              <NuxtLink to="/workspace/personal" class="ws-user-dropdown__item" @click="showMenu = false">
                <Icon name="lucide:user" size="16" />
                个人空间
              </NuxtLink>
              <div class="ws-user-dropdown__divider" />
              <div
                class="ws-user-dropdown__sub"
                :class="{ 'ws-user-dropdown__sub--left': subMenuLeft }"
              >
                <div
                  ref="subTriggerRef"
                  class="ws-user-dropdown__sub-trigger"
                  @mouseenter="onSubEnter"
                >
                  <Icon name="lucide:users" size="16" />
                  <span>团队空间</span>
                  <Icon name="lucide:chevron-right" size="14" class="ws-user-dropdown__sub-arrow" />
                </div>
                <div class="ws-user-dropdown__sub-menu">
                  <NuxtLink
                    v-for="t in userTeams"
                    :key="t.id"
                    :to="`/workspace/teams/${t.id}`"
                    class="ws-user-dropdown__sub-item"
                    @click="showMenu = false"
                  >
                    <Icon name="lucide:users" size="14" />
                    <div class="ws-user-dropdown__item-info">
                      <span class="ws-user-dropdown__item-name">{{ t.name }}</span>
                      <span class="ws-user-dropdown__item-meta">{{ t.memberCount }} 名成员</span>
                    </div>
                  </NuxtLink>
                  <div v-if="userTeams.length === 0" class="ws-user-dropdown__sub-empty">
                    暂无团队
                  </div>
                </div>
              </div>
              <div class="ws-user-dropdown__divider" />
              <NuxtLink to="/workspace/profile" class="ws-user-dropdown__item" @click="showMenu = false">
                <Icon name="lucide:settings" size="16" />
                编辑资料
              </NuxtLink>
              <div class="ws-user-dropdown__divider" />
              <button type="button" class="ws-user-dropdown__item ws-user-dropdown__item--danger" @click="handleLogout">
                <Icon name="lucide:log-out" size="16" />
                退出登录
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.ws-header {
  position: sticky;
  top: 0;
  z-index: 50;
  height: 56px;
  background: var(--header-bg);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
}

.ws-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 20px;
}

.ws-header__left {
  display: flex;
  align-items: center;
  gap: 28px;
}

.ws-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-base);
  letter-spacing: -0.02em;
}

.ws-brand__logo {
  border-radius: 50%;
  box-shadow: var(--logo-shadow);
  transition: transform 0.2s;
}

.ws-brand:hover .ws-brand__logo {
  transform: scale(1.04);
}

.ws-brand__accent {
  margin-left: 3px;
  color: var(--accent);
}

.ws-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ws-nav__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-muted);
  transition: color 0.15s, background 0.15s;
}

.ws-nav__link:hover {
  color: var(--text);
  background: var(--bg-muted);
}

.ws-nav__link--active {
  color: var(--accent);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent-border);
}

.ws-header__right {
  display: flex;
  align-items: center;
  gap: 12px;
}


.ws-user-info {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
  color: var(--text);
}
.ws-user-info:hover { background: var(--bg-muted); }
.ws-user-info__avatar {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--gradient-orange);
  font-size: 11px; font-weight: 700; color: var(--btn-primary-text);
  flex-shrink: 0;
}
.ws-user-info__name { font-size: var(--text-sm); font-weight: 600; }

.ws-header__logout {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-xs); font-weight: 600; color: var(--text-muted);
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.ws-header__logout:hover { border-color: var(--danger-border); color: var(--danger); background: var(--danger-soft); }

.ws-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  transition: border-color 0.15s, color 0.15s;
}

.ws-back-link:hover {
  border-color: var(--secondary-border);
  color: var(--text);
  box-shadow: var(--shadow-glow-purple);
}

.ws-user-menu {
  position: relative;
}

.ws-user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  transition: border-color 0.15s, background 0.15s;
}

.ws-user-btn:hover,
.ws-user-btn--open {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.ws-user-btn__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--gradient-orange);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--btn-primary-text);
  flex-shrink: 0;
}

.ws-user-btn__info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  max-width: 140px;
}

.ws-user-btn__name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  line-height: 1.2;
}

.ws-user-btn__email {
  font-size: 0.6875rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  line-height: 1.2;
}

.ws-user-btn__chevron {
  flex-shrink: 0;
  color: var(--text-muted);
  transition: transform 0.2s;
}

.ws-user-btn--open .ws-user-btn__chevron {
  transform: rotate(180deg);
}

.ws-user-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 240px;
  padding: 8px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md);
  z-index: 60;
}

.ws-user-dropdown__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 12px;
}

.ws-user-dropdown__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--gradient-orange);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--btn-primary-text);
  flex-shrink: 0;
}

.ws-user-dropdown__name {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
}

.ws-user-dropdown__email {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  word-break: break-all;
}

.ws-user-dropdown__divider {
  height: 1px;
  margin: 4px 0;
  background: var(--border);
}

.ws-user-dropdown__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.ws-user-dropdown__item:hover {
  background: var(--bg-muted);
  color: var(--text);
}

.ws-user-dropdown__item--danger {
  color: var(--danger);
}

.ws-user-dropdown__item--danger:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

/* ── User dropdown sub-menu ── */
.ws-user-dropdown__sub {
  position: relative;
  padding: 0 6px;
}

.ws-user-dropdown__sub::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 100%;
  width: 14px;
  z-index: 71;
  pointer-events: auto;
}

.ws-user-dropdown__sub::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  right: 100%;
  width: 14px;
  z-index: 71;
  pointer-events: auto;
  display: none;
}

.ws-user-dropdown__sub--left::after {
  display: block;
}

.ws-user-dropdown__sub-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  cursor: default;
  transition: background 0.1s;
}

.ws-user-dropdown__sub:hover .ws-user-dropdown__sub-trigger {
  background: var(--bg-muted);
  color: var(--text);
}

.ws-user-dropdown__sub-arrow {
  margin-left: auto;
  transition: transform 0.15s;
  color: var(--text-muted);
}

.ws-user-dropdown__sub:hover .ws-user-dropdown__sub-arrow {
  transform: translateX(3px);
}

.ws-user-dropdown__sub-menu {
  display: none;
  position: absolute;
  top: -6px;
  left: calc(100% + 4px);
  min-width: 190px;
  max-width: 260px;
  padding: 6px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md);
  z-index: 70;
  animation: subMenuIn 0.12s ease;
}

.ws-user-dropdown__sub:hover .ws-user-dropdown__sub-menu {
  display: block;
}

.ws-user-dropdown__sub-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-decoration: none;
  transition: background 0.1s, color 0.1s;
}

.ws-user-dropdown__sub-item:hover {
  background: var(--bg-muted);
  color: var(--text);
}

.ws-user-dropdown__sub-empty {
  padding: 12px 10px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-align: center;
}

@keyframes subMenuIn {
  from { opacity: 0; transform: translateX(-4px); }
  to { opacity: 1; transform: translateX(0); }
}

.ws-user-dropdown__sub--left .ws-user-dropdown__sub-menu {
  left: auto;
  right: calc(100% + 4px);
  animation-name: subMenuInLeft;
}

@keyframes subMenuInLeft {
  from { opacity: 0; transform: translateX(4px); }
  to { opacity: 1; transform: translateX(0); }
}

.ws-user-dropdown__item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}

.ws-user-dropdown__item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.ws-user-dropdown__item-meta {
  font-size: 0.625rem;
  color: var(--text-muted);
  font-weight: 400;
}

.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 768px) {
  .ws-nav {
    display: none;
  }

  .ws-back-link span {
    display: none;
  }

  .ws-user-btn__info {
    display: none;
  }

  .ws-user-btn {
    padding: 4px;
  }
}
</style>
