<script setup lang="ts">
import type { TeamMessage } from '~/types/workspace'

const props = defineProps<{
  teamId: string
  open: boolean
}>()
const emit = defineEmits<{
  close: []
  'total-change': [total: number]
}>()

const { user, getAvatarSrc } = useAuth()
const { fetchTeamMessages, postTeamMessage, deleteTeamMessage } = useTeams()

const PAGE_SIZE = 10
const MAX_CHARS = 500

const items = ref<TeamMessage[]>([])
const total = ref(0)
const hasMore = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const posting = ref(false)
const deletingId = ref<string | null>(null)
const error = ref('')
const composer = ref('')
const listEl = ref<HTMLElement | null>(null)

const composerCount = computed(() => composer.value.length)
const composerOver = computed(() => composerCount.value > MAX_CHARS)
const canPublish = computed(
  () => !posting.value && composer.value.trim().length > 0 && !composerOver.value,
)

function emitTotal() {
  emit('total-change', total.value)
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} 天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}

function roleLabel(role: string): string {
  if (role === 'owner') return '创建者'
  if (role === 'admin') return '管理员'
  return ''
}

function isOwn(msg: TeamMessage): boolean {
  return !!user.value && msg.authorId === user.value.id
}

function avatarSrc(msg: TeamMessage): string {
  return getAvatarSrc(msg.authorAvatarUrl)
}

function initials(name: string): string {
  return (name || '?').slice(0, 2).toUpperCase()
}

async function loadFirst() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetchTeamMessages(props.teamId, 0, PAGE_SIZE)
    items.value = res.items
    total.value = res.total
    hasMore.value = res.hasMore
    emitTotal()
    await nextTick()
    scrollToTop()
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  error.value = ''
  const prevCount = items.value.length
  try {
    const res = await fetchTeamMessages(props.teamId, prevCount, PAGE_SIZE)
    items.value = [...items.value, ...res.items]
    total.value = res.total
    hasMore.value = res.hasMore
    emitTotal()
  } catch (e: any) {
    error.value = e?.message || '加载更多失败'
  } finally {
    loadingMore.value = false
  }
}

async function publish() {
  if (!canPublish.value) return
  posting.value = true
  error.value = ''
  const content = composer.value.trim()
  try {
    const res = await postTeamMessage(props.teamId, content)
    items.value = [res.message, ...items.value]
    total.value += 1
    hasMore.value = total.value > items.value.length
    emitTotal()
    composer.value = ''
    await nextTick()
    scrollToTop()
  } catch (e: any) {
    error.value = e?.message || '发布失败'
  } finally {
    posting.value = false
  }
}

async function removeMessage(msg: TeamMessage) {
  if (deletingId.value) return
  if (!window.confirm(`确认删除这条留言？`)) return
  deletingId.value = msg.id
  error.value = ''
  try {
    await deleteTeamMessage(props.teamId, msg.id)
    items.value = items.value.filter(m => m.id !== msg.id)
    total.value = Math.max(0, total.value - 1)
    hasMore.value = total.value > items.value.length
    emitTotal()
  } catch (e: any) {
    error.value = e?.message || '删除失败'
  } finally {
    deletingId.value = null
  }
}

function scrollToTop() {
  if (listEl.value) listEl.value.scrollTop = 0
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

function close() {
  if (posting.value || deletingId.value) return
  emit('close')
}

function onComposerKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    publish()
  }
}

let prevOverflow = ''
function lockScroll() {
  if (!import.meta.client) return
  prevOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}
function unlockScroll() {
  if (!import.meta.client) return
  document.body.style.overflow = prevOverflow
  prevOverflow = ''
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      lockScroll()
      items.value = []
      total.value = 0
      hasMore.value = false
      error.value = ''
      composer.value = ''
      loadFirst()
    } else {
      unlockScroll()
    }
  },
)

watch(
  () => props.teamId,
  (id, oldId) => {
    if (props.open && id && id !== oldId) {
      items.value = []
      total.value = 0
      hasMore.value = false
      loadFirst()
    }
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  if (props.open) {
    lockScroll()
    loadFirst()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  unlockScroll()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="msg-drawer-overlay" @click.self="close">
        <aside
          class="msg-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="团队留言板"
        >
          <!-- Header -->
          <header class="msg-drawer__head">
            <div class="msg-drawer__title-wrap">
              <h2 class="msg-drawer__title">
                <Icon name="lucide:message-square" size="18" class="msg-drawer__title-icon" />
                留言板
              </h2>
              <span class="msg-drawer__count">{{ total }} 条</span>
            </div>
            <button
              type="button"
              class="msg-drawer__close"
              :disabled="posting || !!deletingId"
              aria-label="关闭"
              @click="close"
            >
              <Icon name="lucide:x" size="18" />
            </button>
          </header>

          <!-- Body -->
          <div ref="listEl" class="msg-drawer__body">
            <!-- Empty -->
            <div v-if="!loading && items.length === 0 && !error" class="msg-empty">
              <div class="msg-empty__icon">
                <Icon name="lucide:message-circle" size="40" />
              </div>
              <h3 class="msg-empty__title">还没有留言</h3>
              <p class="msg-empty__text">在下方写下第一条留言，与团队成员分享想法。</p>
            </div>

            <!-- Loading first -->
            <div v-if="loading" class="msg-loading">
              <Icon name="lucide:loader-circle" size="20" class="msg-loading__spinner" />
              <span>加载中…</span>
            </div>

            <!-- Error -->
            <div v-if="error" class="msg-error" role="alert">
              <Icon name="lucide:alert-circle" size="15" />
              {{ error }}
            </div>

            <!-- Load more -->
            <div v-if="hasMore && !loading" class="msg-loadmore">
              <button
                type="button"
                class="msg-loadmore__btn"
                :disabled="loadingMore"
                @click="loadMore"
              >
                <Icon
                  v-if="loadingMore"
                  name="lucide:loader-circle"
                  size="14"
                  class="msg-loadmore__spinner"
                />
                {{ loadingMore ? '加载中…' : '加载更早留言' }}
              </button>
            </div>

            <!-- Message list (newest first) -->
            <ul v-if="items.length > 0" class="msg-list">
              <li
                v-for="msg in items"
                :key="msg.id"
                class="msg-item"
                :class="{ 'msg-item--own': isOwn(msg) }"
              >
                <div class="msg-item__avatar">
                  <img
                    v-if="avatarSrc(msg)"
                    :src="avatarSrc(msg)"
                    alt=""
                    class="msg-item__avatar-img"
                  >
                  <span v-else class="msg-item__avatar-text">{{ initials(msg.authorDisplayName) }}</span>
                </div>
                <div class="msg-item__main">
                  <div class="msg-item__meta">
                    <span class="msg-item__name">{{ msg.authorDisplayName || '未知用户' }}</span>
                    <span
                      v-if="roleLabel(msg.authorRole)"
                      class="msg-item__role"
                      :class="{
                        'msg-item__role--owner': msg.authorRole === 'owner',
                        'msg-item__role--admin': msg.authorRole === 'admin',
                      }"
                    >{{ roleLabel(msg.authorRole) }}</span>
                    <span v-if="isOwn(msg)" class="msg-item__self">(你)</span>
                    <span class="msg-item__time">{{ formatRelative(msg.createdAt) }}</span>
                    <button
                      v-if="msg.canDelete"
                      type="button"
                      class="msg-item__delete"
                      :disabled="deletingId === msg.id"
                      :title="deletingId === msg.id ? '删除中…' : '删除留言'"
                      @click="removeMessage(msg)"
                    >
                      <Icon
                        :name="deletingId === msg.id ? 'lucide:loader-circle' : 'lucide:trash-2'"
                        size="13"
                        :class="{ 'msg-item__delete-spinner': deletingId === msg.id }"
                      />
                    </button>
                  </div>
                  <div class="msg-item__bubble" :class="{ 'msg-item__bubble--own': isOwn(msg) }">
                    {{ msg.content }}
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <!-- Composer -->
          <footer class="msg-drawer__composer">
            <textarea
              v-model="composer"
              class="msg-composer__input"
              :maxlength="MAX_CHARS + 50"
              rows="2"
              placeholder="写下留言…（Ctrl/⌘ + Enter 发布）"
              :disabled="posting"
              @keydown="onComposerKeydown"
            />
            <div class="msg-composer__bar">
              <span
                class="msg-composer__count"
                :class="{ 'msg-composer__count--over': composerOver }"
              >{{ composerCount }} / {{ MAX_CHARS }}</span>
              <button
                type="button"
                class="msg-composer__submit"
                :disabled="!canPublish"
                @click="publish"
              >
                <Icon
                  v-if="posting"
                  name="lucide:loader-circle"
                  size="14"
                  class="msg-composer__spinner"
                />
                {{ posting ? '发布中…' : '发布' }}
              </button>
            </div>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.msg-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 220;
  display: flex;
  justify-content: flex-end;
  background: var(--overlay-bg);
  backdrop-filter: blur(6px);
}

.msg-drawer {
  display: flex;
  flex-direction: column;
  width: min(420px, 100vw);
  height: 100vh;
  border-left: 1px solid var(--border-accent);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

/* ── Header ── */
.msg-drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.msg-drawer__title-wrap {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.msg-drawer__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.msg-drawer__title-icon {
  color: var(--accent);
}

.msg-drawer__count {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
}

.msg-drawer__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.msg-drawer__close:hover:not(:disabled) {
  background: var(--bg-muted);
  color: var(--text);
}

.msg-drawer__close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Body ── */
.msg-drawer__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px 16px;
}

/* ── Empty ── */
.msg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 64px 16px;
  color: var(--text-muted);
}

.msg-empty__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 14px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
}

.msg-empty__title {
  margin: 0 0 6px;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text);
}

.msg-empty__text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
  max-width: 260px;
  line-height: var(--leading-snug);
}

/* ── Loading / error ── */
.msg-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.msg-loading__spinner {
  animation: spin 0.8s linear infinite;
}

.msg-error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: var(--radius-sm);
  background: var(--danger-soft);
  border: 1px solid var(--danger-border);
  font-size: var(--text-sm);
  color: var(--danger);
}

/* ── Load more ── */
.msg-loadmore {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.msg-loadmore__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s, background 0.12s;
}

.msg-loadmore__btn:hover:not(:disabled) {
  border-color: var(--accent-border);
  color: var(--accent);
  background: var(--accent-soft);
}

.msg-loadmore__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.msg-loadmore__spinner {
  animation: spin 0.8s linear infinite;
}

/* ── List ── */
.msg-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.msg-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.msg-item__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--secondary-soft);
  flex-shrink: 0;
  overflow: hidden;
}

.msg-item__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.msg-item__avatar-text {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--secondary);
}

.msg-item__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.msg-item__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.msg-item__name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
}

.msg-item__self {
  font-size: var(--text-xs);
  font-weight: 400;
  color: var(--text-muted);
}

.msg-item__role {
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 0.625rem;
  font-weight: 700;
  white-space: nowrap;
}

.msg-item__role--owner {
  background: var(--secondary-soft);
  border: 1px solid var(--secondary-border);
  color: var(--secondary);
}

.msg-item__role--admin {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--accent);
}

.msg-item__time {
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
}

.msg-item__delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s, background 0.12s, color 0.12s;
}

.msg-item:hover .msg-item__delete,
.msg-item__delete:focus-visible {
  opacity: 1;
}

.msg-item__delete:hover:not(:disabled) {
  background: var(--danger-soft);
  color: var(--danger);
}

.msg-item__delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.msg-item__delete-spinner {
  animation: spin 0.8s linear infinite;
}

.msg-item__bubble {
  padding: 9px 12px;
  border-radius: 12px 12px 12px 4px;
  background: var(--bg-muted);
  border: 1px solid var(--border);
  font-size: var(--text-sm);
  color: var(--text);
  line-height: var(--leading-snug);
  word-wrap: break-word;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.msg-item__bubble--own {
  border-radius: 12px 12px 4px 12px;
  background: var(--accent-soft);
  border-color: var(--accent-border);
  color: var(--text);
}

/* ── Composer ── */
.msg-drawer__composer {
  flex-shrink: 0;
  padding: 12px 16px 14px;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}

.msg-composer__input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--text);
  line-height: var(--leading-snug);
  resize: none;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.msg-composer__input:focus {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow-orange);
}

.msg-composer__input::placeholder {
  color: var(--text-muted);
}

.msg-composer__input:disabled {
  opacity: 0.6;
}

.msg-composer__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.msg-composer__count {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.msg-composer__count--over {
  color: var(--danger);
  font-weight: 600;
}

.msg-composer__submit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--gradient-orange);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
  cursor: pointer;
  transition: transform 0.15s, opacity 0.15s;
}

.msg-composer__submit:hover:not(:disabled) {
  transform: translateY(-1px);
}

.msg-composer__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.msg-composer__spinner {
  animation: spin 0.8s linear infinite;
}

/* ── Transitions ── */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-active .msg-drawer,
.drawer-leave-active .msg-drawer {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .msg-drawer,
.drawer-leave-to .msg-drawer {
  transform: translateX(100%);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .msg-drawer {
    width: 100vw;
    border-left: none;
  }
}
</style>
