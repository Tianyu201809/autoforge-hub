<script setup lang="ts">
import gsap from 'gsap'
import type { MarketplaceSort } from '~/types/workspace'

definePageMeta({ layout: 'default' })

useHead({ title: '插件集市 - Autoforge Hub' })

const {
  items,
  hasMore,
  loading,
  loadingMore,
  error,
  categoryTotal,
  categoryCounts,
  query,
  loadCategories,
  loadList,
  loadMore,
} = useMarketplace()

const searchInput = ref(query.value.q)
const category = ref(query.value.category)
const sort = ref<MarketplaceSort>(query.value.sort)
const loadMoreSentinel = ref<HTMLElement | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let loadMoreObserver: IntersectionObserver | null = null
let gsapCtx: gsap.Context | null = null
let prevCardCount = 0

const reducedMotion = computed(() =>
  import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
)

function playEnter(mode: 'full' | 'cards' | 'newCards' = 'full') {
  gsapCtx?.revert()
  gsapCtx = gsap.context(() => {
    if (reducedMotion.value) {
      gsap.set('[data-anim]', { clearProps: 'all', opacity: 1 })
      return
    }
    if (mode === 'full') {
      const tl = gsap.timeline()
      tl.from('[data-anim="cat"]', { opacity: 0, x: -16, stagger: 0.04, duration: 0.35, ease: 'power2.out' }, 0)
      tl.from('[data-anim="hero"]', { opacity: 0, y: 14, stagger: 0.06, duration: 0.4, ease: 'power2.out' }, 0.1)
      tl.from('[data-anim="toolbar"]', { opacity: 0, y: 8, duration: 0.3, ease: 'power2.out' }, 0.25)
      tl.from('[data-anim="card"]', { opacity: 0, y: 16, stagger: 0.05, duration: 0.35, ease: 'power2.out' }, 0.3)
      return
    }
    if (mode === 'cards') {
      gsap.from('[data-anim="card"]', { opacity: 0, y: 14, stagger: 0.04, duration: 0.3, ease: 'power2.out' })
      return
    }
    const cards = gsap.utils.toArray<HTMLElement>('[data-anim="card"]')
    const fresh = cards.slice(prevCardCount)
    if (fresh.length) {
      gsap.from(fresh, { opacity: 0, y: 12, stagger: 0.04, duration: 0.28, ease: 'power2.out' })
    }
  })
}

async function refresh(mode: 'full' | 'cards' = 'cards') {
  await loadList({ q: searchInput.value, category: category.value, sort: sort.value })
  await loadCategories()
  await nextTick()
  prevCardCount = items.value.length
  playEnter(mode)
}

watch(searchInput, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { void refresh('cards') }, 300)
})

watch([category, sort], () => { void refresh('cards') })

watch(loadingMore, async (v, prev) => {
  if (prev && !v) {
    await nextTick()
    playEnter('newCards')
    prevCardCount = items.value.length
  }
})

onMounted(async () => {
  await Promise.all([loadCategories(), loadList()])
  await nextTick()
  prevCardCount = items.value.length
  playEnter('full')

  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some(e => e.isIntersecting)) void loadMore()
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

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
  loadMoreObserver?.disconnect()
  gsapCtx?.revert()
})
</script>

<template>
  <div class="mp-page">
    <MpCategorySidebar v-model="category" :total="categoryTotal" :counts="categoryCounts" />

    <div class="mp-main">
      <header class="mp-hero">
        <div>
          <h1 class="mp-hero__title" data-anim="hero">插件集市</h1>
          <p class="mp-hero__sub" data-anim="hero">发现并安装社区公开脚本</p>
        </div>
        <NuxtLink to="/workspace/marketplace/submit" class="mp-hero__cta" data-anim="hero">
          <Icon name="lucide:upload" size="16" />
          提交插件
        </NuxtLink>
      </header>

      <div class="mp-toolbar" data-anim="toolbar">
        <label class="mp-search">
          <Icon name="lucide:search" size="15" />
          <input v-model="searchInput" type="search" placeholder="搜索插件名称、标签…">
        </label>
        <select v-model="sort" class="mp-sort" aria-label="排序">
          <option value="newest">最新</option>
          <option value="installs">安装最多</option>
          <option value="updated">最近更新</option>
        </select>
      </div>

      <p v-if="error" class="mp-status mp-status--error">
        {{ error }}
        <button type="button" class="mp-status__retry" @click="refresh('cards')">重试</button>
      </p>
      <p v-else-if="loading" class="mp-status">加载中…</p>
      <p v-else-if="!items.length" class="mp-status">暂无公开插件，成为第一个提交者吧</p>

      <div v-else class="mp-grid">
        <MpPluginCard v-for="s in items" :key="s.id" :script="s" />
      </div>

      <div ref="loadMoreSentinel" class="mp-sentinel" aria-hidden="true" />
      <p v-if="loadingMore" class="mp-status">加载更多…</p>
      <p v-else-if="items.length && !hasMore" class="mp-status mp-status--muted">没有更多了</p>
    </div>
  </div>
</template>

<style scoped>
.mp-page {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 20px;
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px 20px 48px;
  min-height: calc(100vh - var(--header-height));
  background:
    radial-gradient(ellipse 50% 40% at 10% 0%, rgba(107, 76, 230, 0.1) 0%, transparent 55%),
    radial-gradient(ellipse 40% 30% at 90% 5%, rgba(255, 140, 0, 0.08) 0%, transparent 50%);
}

.mp-main {
  min-width: 0;
}

.mp-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.mp-hero__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text);
}

.mp-hero__sub {
  margin: 6px 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.mp-hero__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
  font-size: var(--text-sm);
  font-weight: 600;
  box-shadow: var(--shadow-glow-orange);
  text-decoration: none;
  transition: transform 0.15s;
}

.mp-hero__cta:hover {
  transform: translateY(-1px);
}

.mp-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}

.mp-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  color: var(--text-muted);
}

.mp-search input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: var(--text-sm);
  outline: none;
}

.mp-sort {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  color: var(--text);
  font-size: var(--text-sm);
}

.mp-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.mp-status {
  margin: 24px 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.mp-status--muted {
  color: var(--text-muted);
}

.mp-status--error {
  color: var(--danger);
}

.mp-status__retry {
  margin-left: 8px;
  border: none;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font-weight: 600;
}

.mp-sentinel {
  height: 1px;
}

@media (max-width: 1100px) {
  .mp-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .mp-page {
    grid-template-columns: 1fr;
  }

  .mp-hero {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 600px) {
  .mp-grid {
    grid-template-columns: 1fr;
  }

  .mp-toolbar {
    flex-direction: column;
  }
}
</style>
