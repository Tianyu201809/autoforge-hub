<script setup lang="ts">
const emit = defineEmits<{
  openSearch: []
}>()

const { user, isAuthenticated, getUserInitials } = useAuth()

const navLinks = [
  { label: 'Hub', href: '/', active: true },
  { label: 'Docs', href: '#', external: false },
  { label: 'Community', href: '#', external: false },
  { label: 'Autoforge', href: '#', external: true }
]
</script>

<template>
  <header class="header">
    <div class="header__inner">
      <div class="header__left">
        <NuxtLink to="/" class="brand">
          <img src="/logo.png" alt="Autoforge Hub" class="brand__logo" width="32" height="32">
          <span class="brand__text">
            Autoforge<span class="brand__text-accent">Hub</span>
          </span>
        </NuxtLink>

        <nav class="nav" aria-label="主导航">
          <a
            v-for="link in navLinks"
            :key="link.label"
            :href="link.href"
            class="nav__link"
            :class="{ 'nav__link--active': link.active }"
          >
            {{ link.label }}
            <Icon
              v-if="link.external"
              name="lucide:external-link"
              size="13"
              class="nav__external hub-icon"
            />
          </a>
        </nav>
      </div>

      <div class="header__right">
        <button
          type="button"
          class="search-trigger"
          aria-label="搜索"
          @click="emit('openSearch')"
        >
          <Icon name="lucide:search" size="15" class="hub-icon" />
          <span class="search-trigger__text">搜索</span>
          <kbd class="search-trigger__kbd">
            <span>Ctrl</span>
            <span>K</span>
          </kbd>
        </button>

        <HubThemeToggle />

        <template v-if="isAuthenticated && user">
          <NuxtLink to="/workspace" class="btn-workspace">
            <Icon name="lucide:layout-dashboard" size="15" />
            <span>工作区</span>
          </NuxtLink>
          <NuxtLink to="/workspace" class="btn-user-avatar" :title="user.displayName">
            <span class="btn-user-avatar__text">{{ getUserInitials(user) }}</span>
          </NuxtLink>
        </template>
        <template v-else>
        <NuxtLink to="/login" class="btn-login">
          登录
        </NuxtLink>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  height: var(--header-height);
  background: var(--header-bg);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  transition: background 0.25s ease, border-color 0.25s ease;
}

.header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px;
}

.header__left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-base);
  letter-spacing: -0.02em;
}

.brand__logo {
  border-radius: 50%;
  box-shadow: var(--logo-shadow);
  transition: transform 0.2s;
}

.brand:hover .brand__logo {
  transform: scale(1.04);
}

.brand__text-accent {
  margin-left: 3px;
  color: var(--accent);
}

.nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 11px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.3;
  color: var(--text-muted);
  transition: color 0.15s, background 0.15s;
}

.nav__link:hover {
  color: var(--text);
  background: var(--bg-muted);
}

.nav__link--active {
  color: var(--accent);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent-border);
}

.nav__external {
  opacity: 0.6;
}

.header__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
  padding: 6px 11px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  color: var(--text-muted);
  transition: border-color 0.15s;
}

.search-trigger:hover {
  border-color: var(--secondary-border);
  box-shadow: var(--shadow-glow-purple);
}

.search-trigger__text {
  flex: 1;
  text-align: left;
  font-size: var(--text-sm);
}

.search-trigger__kbd {
  display: inline-flex;
  gap: 2px;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 600;
}

.search-trigger__kbd span {
  padding: 2px 5px;
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  background: var(--bg-elevated);
  color: var(--text-muted);
}

.btn-login {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--gradient-orange);
  font-size: var(--text-sm);
  font-weight: 600;
  line-height: 1.3;
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
  transition: transform 0.15s;
}

.btn-login:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-glow-orange);
}

@media (max-width: 900px) {
  .nav {
    display: none;
  }

  .search-trigger {
    min-width: auto;
  }

  .search-trigger__text,
  .search-trigger__kbd {
    display: none;
  }
}

.btn-workspace {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  transition: border-color 0.15s, color 0.15s;
}

.btn-workspace:hover {
  border-color: var(--accent-border);
  color: var(--accent);
}

.btn-user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--gradient-orange);
  cursor: pointer;
  transition: transform 0.15s;
}

.btn-user-avatar:hover {
  transform: scale(1.05);
}

.btn-user-avatar__text {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--btn-primary-text);
}

@media (max-width: 600px) {
  .btn-workspace span {
    display: none;
  }

  .btn-workspace {
    padding: 6px 8px;
  }
}
</style>
