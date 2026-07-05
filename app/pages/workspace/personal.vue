<script setup lang="ts">
import type { ScriptSort } from '~/types/workspace'

definePageMeta({
  layout: 'default'
})

useHead({
  title: '个人空间 - Autoforge Hub'
})

const { user } = useAuth()
const { scripts, getPersonalScripts, deleteScript, searchScripts, sortScripts, addScript, loadScripts } = useScripts()

const searchQuery = ref('')
const sortBy = ref<ScriptSort>('newest')
const showUpload = ref(false)

onMounted(() => {
  loadScripts()
  console.log('[DIAG] scripts loaded:', scripts.value.length)
  console.log('[DIAG] user id:', user.value?.id)
})

const personalScripts = computed(() => {
  if (!user.value) return []
  // Explicitly track scripts ref for reactivity
  void scripts.value
  return sortScripts(searchScripts(user.value.id, searchQuery.value), sortBy.value)
})

function handleDelete(id: string) {
  deleteScript(id)
}

function handleUpload(payload: { title: string; description: string; zipName: string; zipSize: number; tags: string[] }) {
  if (!user.value) return
  addScript(
    payload.title,
    payload.description,
    payload.zipName,
    payload.zipSize,
    payload.tags,
    user.value.id
  )
  showUpload.value = false
}
</script>

<template>
  <div class="ws-page" v-if="user">
    <WsHeader />
        <div class="ws-page__body">
      <div class="ws-page__hero">
        <div class="ws-page__glow" aria-hidden="true" />
        <h1 class="ws-page__title">个人空间</h1>
        <p class="ws-page__desc">管理你个人上传的脚本包，只有你自己可以看到</p>
      </div>

      <div class="ws-toolbar">
        <div class="ws-toolbar__search">
          <Icon name="lucide:search" size="16" class="ws-toolbar__search-icon" />
          <input
            v-model="searchQuery"
            type="search"
            class="ws-toolbar__search-input"
            placeholder="搜索脚本名称、描述或标签..."
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

          <button type="button" class="ws-upload-btn" @click="showUpload = true">
            <Icon name="lucide:upload" size="16" />
            上传脚本
          </button>
        </div>
      </div>

      <div v-if="personalScripts.length > 0" class="ws-script-list">
        <WsScriptCard
          v-for="script in personalScripts"
          :key="script.id"
          :script="script"
          :deletable="true"
          @delete="handleDelete"
        />
      </div>

      <div v-else class="ws-empty">
        <Icon name="lucide:package" size="48" class="ws-empty__icon" />
        <h2 class="ws-empty__title">{{ searchQuery ? '没有匹配的脚本' : '还没有上传脚本' }}</h2>
        <p class="ws-empty__text">
          {{ searchQuery ? '试试其他关键词' : '上传你的第一个 .zip 脚本包，开始构建你的脚本库' }}
        </p>
        <button v-if="!searchQuery" type="button" class="ws-empty__btn" @click="showUpload = true">
          <Icon name="lucide:upload" size="16" />
          上传第一个脚本
        </button>
      </div>
    </div>

    <Teleport to="body">
      <WsUploadModal
        v-if="showUpload"
        @close="showUpload = false"
        @uploaded="handleUpload"
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
  margin-bottom: 28px;
}

.ws-page__glow {
  position: absolute;
  top: -30px;
  left: -20px;
  width: 180px;
  height: 100px;
  background: var(--hero-glow-orange);
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

.ws-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--gradient-orange);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
  transition: transform 0.15s;
  white-space: nowrap;
}

.ws-upload-btn:hover {
  transform: translateY(-1px);
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

@media (max-width: 640px) {
  .ws-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .ws-toolbar__actions {
    justify-content: space-between;
  }
}
</style>
