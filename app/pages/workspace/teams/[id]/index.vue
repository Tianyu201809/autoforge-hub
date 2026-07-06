<script setup lang="ts">
import type { ScriptSort } from '~/types/workspace'
import { SCRIPT_CATEGORIES, SCRIPT_LANGUAGES } from '~/types/workspace'

definePageMeta({
  layout: 'default'
})

const route = useRoute()
const teamId = computed(() => route.params.id as string)

const { user } = useAuth()
const {
  getTeamById,
  getStoredTeamById,
  isTeamOwner,
  isTeamMember,
  leaveTeam,
  deleteTeam,
  getTeamInviteCode,
  loadTeams,
  getTeamDetail,
  updateTeamSettings,
  manageMember,
} = useTeams()

const {
  getTeamScripts,
  addScript,
  deleteScript,
  loadScripts,
} = useScripts()

const searchQuery = ref('')
const sortBy = ref<ScriptSort>('newest')
const filterCategory = ref('')
const filterLanguage = ref('')
const showUpload = ref(false)
const showEdit = ref(false)
const editingScript = ref<any>(null)
const actionError = ref('')
const actionSuccess = ref('')
const sectionMembersOpen = ref(true)
const sectionPermissionsOpen = ref(true)

// ─── Pagination ───
const PAGE_SIZE = 5
const currentPage = ref(1)

const totalPages = computed(() => Math.max(1, Math.ceil(teamScripts.value.length / PAGE_SIZE)))

const pagedScripts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return teamScripts.value.slice(start, start + PAGE_SIZE)
})

// Reset to page 1 when search/sort/filter changes
watch([searchQuery, sortBy, filterCategory, filterLanguage], () => {
  currentPage.value = 1
})

// Team detail (includes members, settings, currentUserRole)
const teamDetail = ref<any>(null)
const loadingDetail = ref(false)

async function refreshDetail() {
  if (!teamId.value) return
  loadingDetail.value = true
  try {
    teamDetail.value = await getTeamDetail(teamId.value)
  } catch {
    teamDetail.value = null
  } finally {
    loadingDetail.value = false
  }
}

onMounted(() => {
  loadTeams()
  loadScripts("team", teamId.value)
  refreshDetail()
})

const team = computed(() => getTeamById(teamId.value) || (teamDetail.value ? {
  id: teamDetail.value.id,
  name: teamDetail.value.name,
  description: teamDetail.value.description || '',
  ownerId: teamDetail.value.ownerId,
  memberCount: teamDetail.value.memberCount || 0,
  createdAt: teamDetail.value.createdAt,
} : undefined))
const storedTeam = computed(() => getStoredTeamById(teamId.value))

const isOwner = computed(() => {
  if (!user.value || !team.value) return false
  return isTeamOwner(teamId.value, user.value.id)
})

const isMember = computed(() => {
  if (!user.value || !team.value) return false
  return isTeamMember(teamId.value, user.value.id)
})

// Current user's role in this team
const currentUserRole = computed(() => teamDetail.value?.currentUserRole || "member")
const isAdminOrOwner = computed(() => currentUserRole.value === "owner" || currentUserRole.value === "admin")
const isOnlyOwner = computed(() => currentUserRole.value === "owner")

const teamScripts = computed(() => {
  if (!team.value) return []
  let scripts = getTeamScripts(teamId.value)
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    scripts = scripts.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
    )
  }
  if (filterCategory.value) {
    scripts = scripts.filter(s => s.category === filterCategory.value)
  }
  if (filterLanguage.value) {
    scripts = scripts.filter(s => s.language === filterLanguage.value)
  }
  const sorted = [...scripts]
  switch (sortBy.value) {
    case 'newest':
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      break
    case 'oldest':
      sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      break
    case 'name':
      sorted.sort((a, b) => a.title.localeCompare(b.title))
      break
  }
  return sorted
})

// Permissions
const memberPermissions = computed(() =>
  teamDetail.value?.settings?.memberPermissions || { upload: true, edit: true, delete: false, download: true }
)
const canUpload = computed(() => currentUserRole.value === "owner" || currentUserRole.value === "admin" || memberPermissions.value.upload)
const canDeleteScript = computed(() => (script: any) => {
  if (!user.value) return false
  if (currentUserRole.value === "owner" || currentUserRole.value === "admin") return true
  return script.ownerId === user.value.id && memberPermissions.value.delete
})
const canEditScript = computed(() => (script: any) => {
  if (!user.value) return false
  if (currentUserRole.value === "owner" || currentUserRole.value === "admin") return true
  return script.ownerId === user.value.id && memberPermissions.value.edit
})
const canDownload = computed(() =>
  currentUserRole.value === "owner" || currentUserRole.value === "admin" || memberPermissions.value.download
)

async function handleUpload(payload: any) {
  if (!user.value || !teamId.value) return
  await addScript(
    payload.title, payload.description, payload.tags,
    payload.category, payload.language, payload.icon || "file-archive", payload.file, teamId.value,
  )
  showUpload.value = false
  loadScripts("team", teamId.value)
}

function handleEditScript(script: any) {
  editingScript.value = script
  showEdit.value = true
}

async function handleEditSave(payload: { id: string; title: string; description: string; tags: string[]; icon: string; category: string; language: string }) {
  const token = localStorage.getItem("autoforge-token")
  try {
    await fetch("/api/scripts/" + payload.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ title: payload.title, description: payload.description, tags: payload.tags, icon: payload.icon, category: payload.category, language: payload.language })
    })
  } catch (e) {}
  showEdit.value = false
  loadScripts("team", teamId.value)
}

function handleDeleteScript(id: string) {
  deleteScript(id)
}

async function handleLeave() {
  if (!user.value) return
  actionError.value = ''
  actionSuccess.value = ''
  const result = await leaveTeam(teamId.value)
  if (!result.ok) { actionError.value = result.error; return }
  actionSuccess.value = '已退出团队'
  navigateTo('/workspace/teams')
}

async function handleDeleteTeam() {
  if (!user.value) return
  actionError.value = ''
  // Check members before opening modal
  if (teamDetail.value?.members) {
    const others = teamDetail.value.members.filter((m: any) => m.id !== user.value?.id)
    if (others.length > 0) {
      actionError.value = `请先将 ${others.length} 名成员移出团队后再删除`
      return
    }
  }
  showDeleteTeamModal.value = true
}

const showDeleteTeamModal = ref(false)
const deleteTeamConfirmText = ref('')

function confirmDeleteTeam() {
  if (deleteTeamConfirmText.value !== teamNameForDelete.value) return
  deleteTeamConfirmText.value = ''
  showDeleteTeamModal.value = false
  // proceed with deletion
  deleteTeam(teamId.value).then((result) => {
    if (!result.ok) { actionError.value = result.error; return }
    navigateTo('/workspace/teams')
  })
}

const teamNameForDelete = computed(() => team.value?.name || '')

function copyInviteCode() {
  const code = getTeamInviteCode(teamId.value)
  navigator.clipboard.writeText(code).then(() => {
    actionSuccess.value = '邀请码已复制到剪贴板！'
    setTimeout(() => { actionSuccess.value = '' }, 3000)
  })
}

// ─── Member management ───
const showKickModal = ref(false)
const kickTarget = ref<any>(null)
const kickConfirmText = ref('')

function handleKickMember(member: any) {
  kickTarget.value = member
  kickConfirmText.value = ''
  showKickModal.value = true
}

async function confirmKick() {
  if (!kickTarget.value || kickConfirmText.value !== team.value?.name) return
  actionError.value = ''
  const result = await manageMember(teamId.value, "kick", kickTarget.value.id)
  if (!result.ok) { actionError.value = result.error; showKickModal.value = false; return }
  actionSuccess.value = `已将 ${kickTarget.value.displayName} 移出团队`
  setTimeout(() => { actionSuccess.value = '' }, 3000)
  showKickModal.value = false
  const kickedSelf = kickTarget.value.id === user.value?.id
  kickTarget.value = null
  refreshDetail()
  loadTeams()
  if (kickedSelf) navigateTo('/workspace/teams')
}

// ─── Set role confirmation ───
const showRoleModal = ref(false)
const roleTarget = ref<any>(null)
const roleAction = ref<'promote' | 'demote'>('promote')
const roleConfirmText = ref('')

function handleSetRole(member: any) {
  const isAdmin = getMemberRole(member) === 'admin'
  roleTarget.value = member
  roleAction.value = isAdmin ? 'demote' : 'promote'
  roleConfirmText.value = ''
  showRoleModal.value = true
}

async function confirmSetRole() {
  if (!roleTarget.value || roleConfirmText.value !== team.value?.name) return
  const newRole = roleAction.value === 'promote' ? 'admin' : 'member'
  actionError.value = ''
  const result = await manageMember(teamId.value, "setRole", roleTarget.value.id, newRole)
  if (!result.ok) { actionError.value = result.error; showRoleModal.value = false; return }
  actionSuccess.value = result.message
  setTimeout(() => { actionSuccess.value = '' }, 3000)
  showRoleModal.value = false
  roleTarget.value = null
  refreshDetail()
}

// ─── Permission settings (owner only) ───
const editingPermissions = ref(false)
const pendingPermissions = ref({ upload: true, edit: true, delete: false, download: true })

function startEditPermissions() {
  pendingPermissions.value = { ...memberPermissions.value }
  editingPermissions.value = true
}

async function savePermissions() {
  if (!user.value || !teamId.value) return
  actionError.value = ''
  const result = await updateTeamSettings(teamId.value, pendingPermissions.value)
  if (!result.ok) { actionError.value = result.error; return }
  editingPermissions.value = false
  actionSuccess.value = '权限设置已更新'
  setTimeout(() => { actionSuccess.value = '' }, 3000)
  refreshDetail()
}

function cancelEditPermissions() {
  editingPermissions.value = false
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

// ─── Role display ───
function roleLabel(role: string): string {
  if (role === 'owner') return '创建者'
  if (role === 'admin') return '管理员'
  return '成员'
}

function roleBadgeClass(role: string): string {
  if (role === 'owner') return 'ws-member__badge--owner'
  if (role === 'admin') return 'ws-member__badge--admin'
  return ''
}

function getMemberRole(member: any): string {
  return member.role || 'member'
}

function canKick(member: any): boolean {
  if (!user.value) return false
  const mRole = getMemberRole(member)
  if (mRole === 'owner') return false
  if (currentUserRole.value === 'owner') return true
  if (currentUserRole.value === 'admin' && mRole === 'admin') return false
  if (currentUserRole.value === 'admin' && mRole === 'member') return true
  return false
}

function canSetRole(member: any): boolean {
  if (!user.value) return false
  if (currentUserRole.value !== 'owner') return false
  return getMemberRole(member) !== 'owner'
}
</script>

<template>
  <div class="ws-page" v-if="user">
    <WorkspaceWsHeader />

    <div class="ws-page__body">
      <template v-if="team">
        <!-- Back link -->
        <NuxtLink to="/workspace/teams" class="ws-back">
          <Icon name="lucide:arrow-left" size="15" />
          返回团队列表
        </NuxtLink>

        <!-- Team header -->
        <div class="ws-team-header">
          <div class="ws-team-header__icon">
            <Icon name="lucide:users" size="32" class="ws-team-header__users-icon" />
          </div>
          <div class="ws-team-header__info">
            <h1 class="ws-team-header__name">{{ team.name }}</h1>
            <p class="ws-team-header__meta">
              {{ team.memberCount }} 名成员 · {{ formatDate(team.createdAt) }} 创建
              <span v-if="isOwner" class="ws-team-header__badge">创建者</span>
            </p>
            <p v-if="storedTeam?.description" class="ws-team-header__desc">{{ storedTeam.description }}</p>
          </div>
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

        <!-- Team actions -->
        <div class="ws-space-bar ws-space-bar--team">
        <div class="ws-space-bar__info">
          <Icon name="lucide:users" size="16" class="ws-space-bar__icon ws-space-bar__icon--team" />
          <span class="ws-space-bar__label">团队空间：{{ team?.name || "" }}</span>
        </div>
        <NuxtLink to="/workspace/personal" class="ws-space-bar__switch">
          <Icon name="lucide:user" size="14" />
          切换到个人空间
        </NuxtLink>
      </div>
      <div class="ws-team-actions ws-team-actions--detail">
          <button v-if="canUpload" type="button" class="ws-team-btn ws-team-btn--primary" @click="showUpload = true">
            <Icon name="lucide:upload" size="16" />
            上传到团队
          </button>
          <div v-if="isOwner" class="ws-invite-code">
            <span class="ws-invite-code__label">邀请码：</span>
            <code class="ws-invite-code__value">{{ getTeamInviteCode(teamId) }}</code>
            <button
              type="button"
              class="ws-invite-code__copy"
              title="复制邀请码"
              @click="copyInviteCode"
            >
              <Icon name="lucide:copy" size="13" />
            </button>
          </div>
          <button v-if="!isOwner && isMember" type="button" class="ws-team-btn ws-team-btn--ghost ws-team-btn--danger" @click="handleLeave">
            <Icon name="lucide:log-out" size="16" />
            退出团队
          </button>
          <NuxtLink :to="`/workspace/teams/${teamId}/logs`" class="ws-team-btn ws-team-btn--ghost">
            <Icon name="lucide:history" size="16" />
            操作日志
          </NuxtLink>
        </div>

        <div class="ws-layout">
          <div class="ws-layout__main">

        <!-- Search & sort -->
        <div class="ws-toolbar">
          <div class="ws-toolbar__search">
            <Icon name="lucide:search" size="16" class="ws-toolbar__search-icon" />
            <input
              v-model="searchQuery"
              type="search"
              class="ws-toolbar__search-input"
              placeholder="搜索团队脚本..."
            >
          </div>

          <div class="ws-filter-bar">
            <select v-model="filterCategory" class="ws-filter-select">
              <option value="">全部分类</option>
              <option v-for="cat in SCRIPT_CATEGORIES" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
            <select v-model="filterLanguage" class="ws-filter-select">
              <option value="">全部语言</option>
              <option v-for="lang in SCRIPT_LANGUAGES" :key="lang" :value="lang">
                {{ lang }}
              </option>
            </select>
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
          </div>
        </div>

        <!-- Scripts list -->
        <div v-if="teamScripts.length > 0" class="ws-script-list">
          <WorkspaceWsScriptCard
            @edit="handleEditScript"
            v-for="script in pagedScripts"
            :key="script.id"
            :script="script"
            :deletable="canDeleteScript(script)"
            :editable="canEditScript(script)"
            :downloadable="canDownload"
            @delete="handleDeleteScript"
          />
        </div>

        <div v-else class="ws-empty">
          <Icon name="lucide:package" size="48" class="ws-empty__icon" />
          <h2 class="ws-empty__title">{{ searchQuery ? '没有匹配的脚本' : '团队还没有脚本' }}</h2>
          <p class="ws-empty__text">
            {{ searchQuery ? '试试其他关键词' : '上传第一个 .zip 脚本包，与团队成员共享' }}
          </p>
          <button v-if="!searchQuery" type="button" class="ws-empty__btn" @click="showUpload = true">
            <Icon name="lucide:upload" size="16" />
            上传第一个脚本
          </button>
        </div>

        <WorkspaceWsPagination
          v-if="teamScripts.length > PAGE_SIZE"
          :current-page="currentPage"
          :total-pages="totalPages"
          @page-change="currentPage = $event"
        />

          </div>
          <div class="ws-layout__sidebar">
        <div v-if="teamDetail?.members" class="ws-section">
          <div class="ws-section__head ws-section__head--clickable" @click="sectionMembersOpen = !sectionMembersOpen">
            <h2 class="ws-section__title">
              <Icon name="lucide:users" size="16" />
              团队成员
            </h2>
            <div class="ws-section__right">
              <span class="ws-section__count">{{ teamDetail.members.length }} 人</span>
              <Icon
                name="lucide:chevron-down"
                size="14"
                class="ws-section__chevron"
                :class="{ 'ws-section__chevron--open': sectionMembersOpen }"
              />
            </div>
          </div>
          <div v-if="sectionMembersOpen" class="ws-member-list">
            <div
              v-for="member in teamDetail.members"
              :key="member.id"
              class="ws-member"
            >
              <div class="ws-member__avatar">
                <span class="ws-member__avatar-text">{{ (member.displayName || member.email).slice(0, 2).toUpperCase() }}</span>
              </div>
              <div class="ws-member__info">
                <span class="ws-member__name">
                  {{ member.displayName }}
                  <span v-if="member.id === user?.id" class="ws-member__self">(你)</span>
                </span>
                <span class="ws-member__email">{{ member.email }}</span>
              </div>
              <span
                class="ws-member__badge"
                :class="roleBadgeClass(getMemberRole(member))"
              >{{ roleLabel(getMemberRole(member)) }}</span>
              <div class="ws-member__actions">
                <button
                  v-if="canSetRole(member)"
                  type="button"
                  class="ws-member__btn"
                  :title="getMemberRole(member) === 'admin' ? '撤销管理员' : '提升为管理员'"
                  @click="handleSetRole(member)"
                >
                  <Icon :name="getMemberRole(member) === 'admin' ? 'lucide:shield-off' : 'lucide:shield'" size="14" />
                </button>
                <button
                  v-if="canKick(member)"
                  type="button"
                  class="ws-member__btn ws-member__btn--danger"
                  title="踢出团队"
                  @click="handleKickMember(member)"
                >
                  <Icon name="lucide:log-out" size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ Permission Settings Panel ═══ (owner only) -->
        <div v-if="isOnlyOwner" class="ws-section">
          <div class="ws-section__head ws-section__head--clickable" @click="sectionPermissionsOpen = !sectionPermissionsOpen">
            <h2 class="ws-section__title">
              <Icon name="lucide:shield" size="16" />
              成员权限设置
            </h2>
            <div class="ws-section__right">
              <span class="ws-section__hint">对所有普通成员统一生效</span>
              <Icon
                name="lucide:chevron-down"
                size="14"
                class="ws-section__chevron"
                :class="{ 'ws-section__chevron--open': sectionPermissionsOpen }"
              />
            </div>
          </div>
          <div v-if="sectionPermissionsOpen" class="ws-permissions">
            <label class="ws-permission" v-for="perm in ([
              { key: 'upload', label: '允许上传脚本', icon: 'lucide:upload' },
              { key: 'edit', label: '允许编辑自己脚本', icon: 'lucide:pencil' },
              { key: 'delete', label: '允许删除自己脚本', icon: 'lucide:trash-2' },
              { key: 'download', label: '允许下载脚本', icon: 'lucide:download' },
            ])" :key="perm.key">
              <div class="ws-permission__info">
                <Icon :name="perm.icon" size="15" />
                <span>{{ perm.label }}</span>
              </div>
              <button
                type="button"
                class="ws-permission__toggle"
                :class="{ 'ws-permission__toggle--on': editingPermissions ? pendingPermissions[perm.key] : memberPermissions[perm.key] }"
                @click="
                  if (!editingPermissions) startEditPermissions();
                  pendingPermissions[perm.key] = !pendingPermissions[perm.key]
                "
              >
                <span class="ws-permission__toggle-knob" />
              </button>
            </label>
            <div v-if="editingPermissions" class="ws-permissions__actions">
              <button type="button" class="ws-permissions__cancel" @click="cancelEditPermissions">取消</button>
              <button type="button" class="ws-permissions__save" @click="savePermissions">保存设置</button>
            </div>
          </div>
        </div>

        <!-- ═══ Danger Zone ═══ (owner only) -->
        <div v-if="isOwner" class="ws-danger-zone">
          <div class="ws-danger-zone__head">
            <Icon name="lucide:alert-triangle" size="14" class="ws-danger-zone__icon" />
            <span class="ws-danger-zone__title">危险区域</span>
          </div>
          <p class="ws-danger-zone__desc">
            删除团队将移除所有脚本数据，此操作不可撤销。
          </p>
          <button
            type="button"
            class="ws-danger-zone__btn"
            @click="handleDeleteTeam"
          >
            <Icon name="lucide:trash-2" size="14" />
            删除这个团队
          </button>
        </div>

        </div> <!-- /.ws-layout__sidebar -->
        </div> <!-- /.ws-layout -->

      </template>

      <!-- Team not found -->
      <div v-else class="ws-error-state">
        <Icon name="lucide:search-x" size="48" class="ws-error-state__icon" />
        <h2 class="ws-error-state__title">团队不存在</h2>
        <p class="ws-error-state__text">该团队可能已被删除，或你尚未加入</p>
        <NuxtLink to="/workspace/teams" class="ws-error-state__link">
          返回团队列表
        </NuxtLink>
      </div>
    </div>

    <Teleport to="body">
      <WorkspaceWsUploadModal
        v-if="showUpload"
        @close="showUpload = false"
        @uploaded="handleUpload"
      />
    </Teleport>
    <Teleport to="body">
      <WorkspaceWsEditModal
        v-if="showEdit && editingScript"
        :script="editingScript"
        @close="showEdit = false"
        @saved="handleEditSave"
      />
    </Teleport>
  </div>
</template>

<style scoped>
.ws-page {
  min-height: 100vh;
}

.ws-page__body {
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px 24px 80px;
}

.ws-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 20px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-muted);
  transition: color 0.15s;
}

.ws-back:hover {
  color: var(--accent);
}

.ws-team-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.ws-team-header__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  background: var(--secondary-soft);
  flex-shrink: 0;
}

.ws-team-header__users-icon {
  color: var(--secondary);
}

.ws-team-header__info {
  flex: 1;
  min-width: 0;
}

.ws-team-header__name {
  margin: 0 0 4px;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text);
}

.ws-team-header__meta {
  margin: 0 0 6px;
  font-size: var(--text-sm);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ws-team-header__badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--secondary-soft);
  border: 1px solid var(--secondary-border);
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--secondary);
}

.ws-team-header__desc {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-snug);
}

.ws-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  margin-bottom: 16px;
  position: relative;
  z-index: 150;
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

.ws-team-actions--detail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.ws-layout {
  display: flex;
  gap: 28px;
  align-items: flex-start;
}

.ws-layout__main {
  flex: 1;
  min-width: 0;
}

.ws-layout__sidebar {
  width: 320px;
  flex-shrink: 0;
}

@media (max-width: 1100px) {
  .ws-layout__sidebar {
    width: 260px;
  }
}

@media (max-width: 640px) {
  .ws-layout {
    flex-direction: column;
  }
  .ws-layout__sidebar {
    width: 100%;
  }
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
  border-color: var(--border-strong);
  color: var(--text);
}

.ws-team-btn--danger {
  color: var(--danger);
}

.ws-team-btn--danger:hover {
  border-color: var(--danger-border);
  background: var(--danger-soft);
}

.ws-invite-code {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  font-size: var(--text-xs);
}

.ws-invite-code__label {
  color: var(--text-muted);
  white-space: nowrap;
}

.ws-invite-code__value {
  font-family: 'Courier New', monospace;
  font-size: var(--text-xs);
  color: var(--accent);
  letter-spacing: 0.02em;
  user-select: all;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

.ws-invite-code__copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.ws-invite-code__copy:hover {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: var(--accent-border);
}

/* ── Danger Zone ── */
.ws-danger-zone {
  margin-top: 32px;
  margin-bottom: 24px;
  padding: 18px 20px;
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-md);
  background: var(--danger-soft);
}

.ws-danger-zone__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.ws-danger-zone__icon {
  color: var(--danger);
}

.ws-danger-zone__title {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--danger);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ws-danger-zone__desc {
  margin: 0 0 12px;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: var(--leading-snug);
}

.ws-danger-zone__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-sm);
  background: var(--danger);
  font-size: var(--text-sm);
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: opacity 0.12s;
  font-family: inherit;
}

.ws-danger-zone__btn:hover {
  opacity: 0.9;
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

.ws-pagination {
  margin-top: 28px;
}

.ws-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}

.ws-error-state__icon {
  margin-bottom: 16px;
  color: var(--text-muted);
}

.ws-error-state__title {
  margin: 0 0 6px;
  font-size: var(--text-lg);
  font-weight: 600;
}

.ws-error-state__text {
  margin: 0 0 20px;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.ws-error-state__link {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  transition: border-color 0.15s;
}

.ws-error-state__link:hover {
  border-color: var(--accent-border);
}


.ws-space-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
}

.ws-space-bar__info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ws-space-bar__icon {
  color: var(--secondary);
}

.ws-space-bar__icon--team {
  color: var(--secondary);
}

.ws-space-bar__label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
}

.ws-space-bar__switch {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.ws-space-bar__switch:hover {
  border-color: var(--accent-border);
  color: var(--secondary);
  background: var(--accent-soft);
}

/* ── Section ── */
.ws-section {
  margin-bottom: 24px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  overflow: hidden;
}

.ws-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.ws-section__head--clickable {
  cursor: pointer;
  user-select: none;
}

.ws-section__head--clickable:hover {
  opacity: 0.8;
}

.ws-section__right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ws-section__chevron {
  color: var(--text-muted);
  transition: transform 0.2s ease;
}

.ws-section__chevron--open {
  transform: rotate(180deg);
}

.ws-section__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
}

.ws-section__count {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.ws-section__hint {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* ── Member List ── */
.ws-member-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ws-member {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  transition: background 0.1s;
  overflow: hidden;
}

.ws-member:hover {
  background: var(--bg-muted);
}

.ws-member__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--secondary-soft);
  flex-shrink: 0;
}

.ws-member__avatar-text {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--secondary);
}

.ws-member__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ws-member__name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ws-member__self {
  font-weight: 400;
  color: var(--text-muted);
  margin-left: 2px;
}

.ws-member__email {
  font-size: var(--text-xs);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ws-member__badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.625rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.ws-member__badge--owner {
  background: var(--secondary-soft);
  border: 1px solid var(--secondary-border);
  color: var(--secondary);
}

.ws-member__badge--admin {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--accent);
}

.ws-member__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.12s;
}

.ws-member:hover .ws-member__actions {
  opacity: 1;
}

.ws-member__btn {
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

.ws-member__btn:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.ws-member__btn--danger:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

/* ── Permission Toggles ── */
.ws-permissions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ws-permission {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.1s;
  overflow: hidden;
}

.ws-permission__info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-sm);
  color: var(--text);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ws-permission__toggle {
  position: relative;
  width: 36px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: var(--border-strong);
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}

.ws-permission__toggle--on {
  background: var(--accent);
}

.ws-permission__toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.ws-permission__toggle--on .ws-permission__toggle-knob {
  transform: translateX(16px);
}

.ws-permissions__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 8px 10px 4px;
  border-top: 1px solid var(--border);
  margin-top: 4px;
}

.ws-permissions__cancel {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.ws-permissions__save {
  padding: 6px 14px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--gradient-orange);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--btn-primary-text);
  cursor: pointer;
}

@media (max-width: 600px) {
  .ws-space-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* ── Delete Confirmation Modal ── */
.delete-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--overlay-bg);
  backdrop-filter: blur(8px);
}

.delete-modal {
  width: min(380px, calc(100vw - 32px));
  padding: 32px 28px 24px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  text-align: center;
  animation: modalIn 0.25s ease;
}

.delete-modal__icon {
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
}

.delete-modal__icon-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--danger-soft);
  color: var(--danger);
}

.delete-modal__title {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text);
}

.delete-modal__desc {
  margin: 0 0 20px;
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
  color: var(--text-secondary);
}

.delete-modal__desc strong {
  color: var(--text);
  font-weight: 600;
}

.delete-modal__input-group {
  margin-bottom: 20px;
  text-align: left;
}

.delete-modal__label {
  display: block;
  margin-bottom: 6px;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: var(--leading-snug);
}

.delete-modal__label strong {
  color: var(--text);
  font-weight: 600;
}

.delete-modal__input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.delete-modal__input:focus {
  border-color: var(--danger-border);
  box-shadow: 0 0 0 3px var(--danger-soft);
}

.delete-modal__input::placeholder {
  color: var(--text-muted);
}

.delete-modal__actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.delete-modal__cancel {
  flex: 1;
  padding: 9px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  transition: background 0.12s, border-color 0.12s;
  font-family: inherit;
}

.delete-modal__cancel:hover {
  background: var(--bg-muted);
  border-color: var(--border-strong);
}

.delete-modal__confirm {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 16px;
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-sm);
  background: var(--danger);
  font-size: var(--text-sm);
  font-weight: 600;
  color: #fff;
  transition: background 0.12s, opacity 0.12s;
  font-family: inherit;
}

.delete-modal__confirm:hover:not(:disabled) {
  opacity: 0.9;
}

.delete-modal__confirm:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Transition */
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
