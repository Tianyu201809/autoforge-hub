<script setup lang="ts">
const {
  selectedType,
  selectedIntegration,
  selectedTags,
  sortBy,
  searchQuery,
  filteredItems,
  resetFilters
} = useHubFilters()

const showSearch = ref(false)
const showMobileFilters = ref(false)

function openSearch() {
  showSearch.value = true
}

function closeSearch() {
  showSearch.value = false
}

onMounted(() => {
  const handler = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      showSearch.value = !showSearch.value
    }
  }
  window.addEventListener('keydown', handler)
  onUnmounted(() => window.removeEventListener('keydown', handler))
})

useHead({
  title: 'Autoforge Hub — 发现与分享自动化资源'
})
</script>

<template>
  <div class="hub">
    <HubHeader @open-search="openSearch" />

    <div class="hub__body">
      <HubSidebar
        v-model:selected-type="selectedType"
        v-model:selected-integration="selectedIntegration"
        @reset="resetFilters"
      />

      <main class="hub__main">
        <section class="intro">
          <div class="intro__hero">
            <div class="intro__glow intro__glow--purple" aria-hidden="true" />
            <div class="intro__glow intro__glow--orange" aria-hidden="true" />

            <div class="intro__brand">
              <img src="/logo.png" alt="" class="intro__logo" width="48" height="48">
              <div class="intro__copy">
                <h1 class="intro__title">
                  Autoforge <span class="intro__title-accent">Hub</span>
                </h1>
                <p class="intro__subtitle">
                  发现并与社区分享你的脚本、流程、应用与 Skills。
                </p>
              </div>
            </div>
          </div>

          <HubToolbar
            v-model:sort-by="sortBy"
            v-model:selected-tags="selectedTags"
            @toggle-mobile-filters="showMobileFilters = true"
          />
        </section>

        <div class="items-header">
          <h2 class="items-header__title">全部资源</h2>
          <span class="items-header__count">{{ filteredItems.length }} items</span>
        </div>

        <div v-if="filteredItems.length" class="items-grid">
          <HubItemCard
            v-for="(item, index) in filteredItems"
            :key="item.id"
            :item="item"
            :style="{ animationDelay: `${Math.min(index, 12) * 40}ms` }"
            class="items-grid__item"
          />
        </div>

        <div v-else class="empty-state">
          <Icon name="lucide:search-x" size="40" class="empty-state__icon hub-icon--purple" />
          <p class="empty-state__title">没有找到匹配的资源</p>
          <p class="empty-state__text">试试调整筛选条件或搜索关键词</p>
          <button type="button" class="empty-state__btn" @click="resetFilters">
            重置筛选
          </button>
        </div>
      </main>
    </div>

    <Teleport to="body">
      <HubSearchModal
        v-if="showSearch"
        v-model="searchQuery"
        @close="closeSearch"
      />
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showMobileFilters"
        class="mobile-drawer-overlay"
        @click.self="showMobileFilters = false"
      >
        <div class="mobile-drawer">
          <div class="mobile-drawer__head">
            <h2>筛选</h2>
            <button type="button" @click="showMobileFilters = false">
              <Icon name="lucide:x" size="18" />
            </button>
          </div>
          <HubSidebar
            v-model:selected-type="selectedType"
            v-model:selected-integration="selectedIntegration"
            class="mobile-drawer__sidebar"
            @reset="resetFilters"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.hub__body {
  display: flex;
  max-width: 1440px;
  margin: 0 auto;
}

.hub__main {
  flex: 1;
  min-width: 0;
  padding: 24px 28px 56px;
}

.intro {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 14px 24px;
  align-items: center;
  margin-bottom: 24px;
}

.intro__hero {
  position: relative;
  grid-column: 1;
  grid-row: 1;
}

.intro__brand {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
}

.intro__logo {
  flex-shrink: 0;
  border-radius: 50%;
  box-shadow: var(--logo-shadow);
}

.intro__copy {
  min-width: 0;
}

.intro__title {
  margin: 0 0 4px;
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: var(--leading-tight);
  color: var(--text);
}

.intro__title-accent {
  color: var(--accent);
}

.intro__subtitle {
  margin: 0;
  max-width: 480px;
  font-size: var(--text-base);
  font-weight: 400;
  line-height: var(--leading-normal);
  color: var(--text-secondary);
}

.intro__glow {
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
}

.intro__glow--purple {
  top: -48px;
  left: -32px;
  width: 260px;
  height: 160px;
  background: var(--hero-glow-purple);
}

.intro__glow--orange {
  top: -12px;
  left: 40px;
  width: 200px;
  height: 120px;
  background: var(--hero-glow-orange);
}

@media (max-width: 768px) {
  .intro {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    gap: 12px;
    align-items: stretch;
  }

  .intro__hero {
    grid-column: 1;
    grid-row: 1;
  }
}

.items-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.items-header__title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--text);
}

.items-header__count {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--text-muted);
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.items-grid__item {
  animation: cardReveal 0.45s ease both;
  display: flex;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  text-align: center;
}

.empty-state__icon {
  margin-bottom: 16px;
  color: var(--text-muted);
}

.empty-state__title {
  margin: 0 0 6px;
  font-size: 1rem;
  font-weight: 600;
}

.empty-state__text {
  margin: 0 0 20px;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.empty-state__btn {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  font-size: 0.875rem;
  font-weight: 600;
}

.empty-state__btn:hover {
  background: var(--bg-muted);
}

.mobile-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: var(--overlay-bg);
  backdrop-filter: blur(4px);
}

.mobile-drawer {
  position: absolute;
  inset: 0 auto 0 0;
  width: min(320px, 88vw);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md);
}

.mobile-drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.mobile-drawer__head h2 {
  margin: 0;
  font-size: 1rem;
}

.mobile-drawer__head button {
  display: flex;
  padding: 6px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
}

.mobile-drawer__sidebar {
  display: flex !important;
  width: 100%;
  min-height: auto;
  border-right: none;
}

@keyframes cardReveal {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .hub__main {
    padding: 24px 16px 48px;
  }

  .items-grid {
    grid-template-columns: 1fr;
  }
}
</style>
