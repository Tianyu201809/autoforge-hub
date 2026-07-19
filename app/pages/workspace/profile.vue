<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({ title: '编辑资料 - Autoforge Hub' })

type SettingsSection = 'profile' | 'security'

const { user, updateUser, getAvatarSrc, changePassword } = useAuth()
const displayName = ref(user.value?.displayName || '')
const avatarUrl = ref(user.value?.avatarUrl || '')
const saving = ref(false)
const message = ref('')
const errorMsg = ref('')
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const pwdSaving = ref(false)
const pwdMessage = ref('')
const pwdError = ref('')

const avatarSrc = computed(() => getAvatarSrc(avatarUrl.value))
const activeSection = ref<SettingsSection>('profile')
const profileSection = shallowRef<HTMLElement | null>(null)
const securitySection = shallowRef<HTMLElement | null>(null)
let sectionObserver: IntersectionObserver | null = null

const settingsSections = [
  { id: 'profile' as const, label: '公开资料', icon: 'lucide:user-round' },
  { id: 'security' as const, label: '密码与安全', icon: 'lucide:shield-check' },
]

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

// ─── Crop modal state ───
const cropFile = ref<File | null>(null)
const showCrop = ref(false)
const fileInputKey = ref(0)

async function saveProfile() {
  saving.value = true; message.value = ''; errorMsg.value = ''
  const token = localStorage.getItem('autoforge-token')
  if (!displayName.value.trim()) { errorMsg.value = '请输入显示名称'; saving.value = false; return }
  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ displayName: displayName.value.trim() })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message)
    const nextDisplayName = data.displayName || displayName.value.trim()
    displayName.value = nextDisplayName
    updateUser({ displayName: nextDisplayName })
    message.value = '个人资料已保存'
  } catch (error: unknown) { errorMsg.value = errorMessage(error, '保存失败') }
  saving.value = false
}

async function savePassword() {
  pwdSaving.value = true
  pwdMessage.value = ''
  pwdError.value = ''
  if (!oldPassword.value || !newPassword.value) {
    pwdError.value = '请填写旧密码和新密码'
    pwdSaving.value = false
    return
  }
  if (newPassword.value.length < 8) {
    pwdError.value = '密码至少需要 8 位'
    pwdSaving.value = false
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    pwdError.value = '两次输入的新密码不一致'
    pwdSaving.value = false
    return
  }
  const result = await changePassword(oldPassword.value, newPassword.value)
  if (!result.ok) {
    pwdError.value = result.error
  } else {
    pwdMessage.value = '密码已更新'
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  }
  pwdSaving.value = false
}

function selectAvatarFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  cropFile.value = file
  showCrop.value = true
}

async function uploadCroppedAvatar(blob: Blob) {
  showCrop.value = false
  cropFile.value = null
  message.value = ''
  errorMsg.value = ''

  const token = localStorage.getItem('autoforge-token')
  const formData = new FormData()
  const ext = blob.type === 'image/png' ? 'png' : 'webp'
  formData.append('file', blob, `avatar.${ext}`)
  try {
    const res = await fetch('/api/auth/avatar', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: formData
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message)
    avatarUrl.value = data.avatarUrl
    updateUser({ avatarUrl: data.avatarUrl })
    message.value = '头像已更新'
  } catch (error: unknown) {
    errorMsg.value = errorMessage(error, '上传失败')
  }
  // Reset file input so re-selecting the same file triggers change
  fileInputKey.value++
}

function cancelCrop() {
  showCrop.value = false
  cropFile.value = null
  fileInputKey.value++
}

function scrollToSection(section: SettingsSection) {
  activeSection.value = section
  const target = section === 'profile' ? profileSection.value : securitySection.value
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function setupSectionObserver() {
  if (!('IntersectionObserver' in window)) return

  sectionObserver = new IntersectionObserver((entries) => {
    const visibleEntry = entries
      .filter(entry => entry.isIntersecting)
      .sort((first, second) => first.boundingClientRect.top - second.boundingClientRect.top)[0]
    const section = visibleEntry?.target.getAttribute('data-section')
    if (section === 'profile' || section === 'security') activeSection.value = section
  }, { rootMargin: '-112px 0px -55% 0px', threshold: 0 })

  if (profileSection.value) sectionObserver.observe(profileSection.value)
  if (securitySection.value) sectionObserver.observe(securitySection.value)
}

// Sync avatar from server (session may predate avatarUrl support)
onMounted(async () => {
  setupSectionObserver()
  const token = localStorage.getItem('autoforge-token')
  if (!token) return
  try {
    const res = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })
    if (!res.ok) return
    const data = await res.json()
    if (data.avatarUrl) {
      avatarUrl.value = data.avatarUrl
      updateUser({ avatarUrl: data.avatarUrl })
    }
    if (data.displayName) displayName.value = data.displayName
  } catch { /* ignore */ }
})

onBeforeUnmount(() => {
  sectionObserver?.disconnect()
})
</script>

<template>
  <div class="profile-page">
    <WorkspaceWsHeader />
    <main class="profile-settings">
      <NuxtLink to="/workspace" class="profile-settings__back">
        <Icon name="lucide:arrow-left" size="15" aria-hidden="true" />
        返回工作区
      </NuxtLink>

      <div class="profile-settings__layout">
        <aside class="profile-settings__sidebar">
          <nav class="settings-nav" aria-label="个人设置">
            <p class="settings-nav__label">设置</p>
            <button
              v-for="section in settingsSections"
              :key="section.id"
              type="button"
              class="settings-nav__item"
              :class="{ 'settings-nav__item--active': activeSection === section.id }"
              :aria-current="activeSection === section.id ? 'page' : undefined"
              :aria-controls="`profile-settings-${section.id}`"
              @click="scrollToSection(section.id)"
            >
              <Icon :name="section.icon" size="16" aria-hidden="true" />
              <span>{{ section.label }}</span>
            </button>
          </nav>
        </aside>

        <div class="profile-settings__content">
          <section
            id="profile-settings-profile"
            ref="profileSection"
            class="settings-section"
            data-section="profile"
          >
            <header class="settings-section__header">
              <div>
                <p class="settings-section__kicker">Profile</p>
                <h2>公开资料</h2>
              </div>
              <p>管理他人在 AutoforgeHub 中看到的账户信息。</p>
            </header>

            <div class="profile-editor">
              <form class="settings-form" @submit.prevent="saveProfile">
                <div class="settings-form__field">
                  <label for="profile-display-name">显示名称</label>
                  <input
                    id="profile-display-name"
                    v-model="displayName"
                    type="text"
                    class="settings-input"
                    placeholder="输入显示名称"
                    maxlength="30"
                    :disabled="saving"
                    autocomplete="name"
                  >
                  <p class="settings-form__hint">此名称会显示在脚本、团队和账户菜单中，最多 30 个字符。</p>
                </div>

                <div class="settings-form__field">
                  <label for="profile-email">邮箱</label>
                  <input
                    id="profile-email"
                    :value="user?.email"
                    type="email"
                    class="settings-input settings-input--readonly"
                    readonly
                    aria-describedby="profile-email-hint"
                  >
                  <p id="profile-email-hint" class="settings-form__hint">登录邮箱由账户系统管理，暂不支持在此修改。</p>
                </div>

                <div v-if="message" class="settings-message settings-message--success" role="status">
                  <Icon name="lucide:circle-check" size="16" aria-hidden="true" />
                  {{ message }}
                </div>
                <div v-if="errorMsg" class="settings-message settings-message--error" role="alert">
                  <Icon name="lucide:circle-alert" size="16" aria-hidden="true" />
                  {{ errorMsg }}
                </div>

                <button type="submit" class="settings-button" :disabled="saving">
                  <Icon v-if="saving" name="lucide:loader-circle" size="16" class="settings-spinner" aria-hidden="true" />
                  {{ saving ? '保存中...' : '保存个人资料' }}
                </button>
              </form>

              <aside class="profile-avatar-panel" aria-label="头像设置">
                <p class="profile-avatar-panel__label">个人头像</p>
                <div class="profile-avatar-panel__wrap">
                  <img v-if="avatarSrc" :src="avatarSrc" :alt="`${displayName || '用户'}的头像`" class="profile-avatar-panel__image">
                  <span v-else class="profile-avatar-panel__fallback">{{ user?.displayName?.slice(0, 2)?.toUpperCase() || 'U' }}</span>
                  <label class="profile-avatar-panel__edit">
                    <Icon name="lucide:pencil" size="14" aria-hidden="true" />
                    <span>编辑</span>
                    <input
                      :key="fileInputKey"
                      type="file"
                      accept="image/png,image/jpg,image/jpeg,image/webp"
                      hidden
                      @change="selectAvatarFile"
                    >
                  </label>
                </div>
                <p class="profile-avatar-panel__hint">支持 JPG、PNG 或 WebP，上传后可裁剪。</p>
              </aside>
            </div>
          </section>

          <section
            id="profile-settings-security"
            ref="securitySection"
            class="settings-section settings-section--security"
            data-section="security"
          >
            <header class="settings-section__header">
              <div>
                <p class="settings-section__kicker">Security</p>
                <h2>密码与安全</h2>
              </div>
              <p>定期更新密码，保护你的脚本和团队数据。</p>
            </header>

            <form class="settings-form settings-form--security" @submit.prevent="savePassword">
              <div class="settings-form__field">
                <label for="current-password">当前密码</label>
                <input
                  id="current-password"
                  v-model="oldPassword"
                  type="password"
                  class="settings-input"
                  autocomplete="current-password"
                  :disabled="pwdSaving"
                >
              </div>
              <div class="settings-form__field">
                <label for="new-password">新密码</label>
                <input
                  id="new-password"
                  v-model="newPassword"
                  type="password"
                  class="settings-input"
                  placeholder="至少 8 位字符"
                  autocomplete="new-password"
                  :disabled="pwdSaving"
                  aria-describedby="new-password-hint"
                >
                <p id="new-password-hint" class="settings-form__hint">使用至少 8 位字符，建议混合字母、数字与符号。</p>
              </div>
              <div class="settings-form__field">
                <label for="confirm-password">确认新密码</label>
                <input
                  id="confirm-password"
                  v-model="confirmPassword"
                  type="password"
                  class="settings-input"
                  autocomplete="new-password"
                  :disabled="pwdSaving"
                >
              </div>

              <div v-if="pwdMessage" class="settings-message settings-message--success" role="status">
                <Icon name="lucide:circle-check" size="16" aria-hidden="true" />
                {{ pwdMessage }}
              </div>
              <div v-if="pwdError" class="settings-message settings-message--error" role="alert">
                <Icon name="lucide:circle-alert" size="16" aria-hidden="true" />
                {{ pwdError }}
              </div>

              <button type="submit" class="settings-button" :disabled="pwdSaving">
                <Icon v-if="pwdSaving" name="lucide:loader-circle" size="16" class="settings-spinner" aria-hidden="true" />
                {{ pwdSaving ? '更新中...' : '更新密码' }}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>

    <Teleport to="body">
      <WorkspaceAvatarCropModal
        v-if="showCrop && cropFile"
        :file="cropFile"
        @crop="uploadCroppedAvatar"
        @cancel="cancelCrop"
      />
    </Teleport>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
}

.profile-settings {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 36px 24px 88px;
}

.profile-settings__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 22px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-muted);
  transition: color 160ms ease, transform 160ms ease;
}

.profile-settings__back:hover {
  color: var(--accent);
  transform: translateX(-2px);
}

.profile-settings__layout {
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr);
  gap: 52px;
  align-items: start;
  padding-top: 30px;
}

.profile-settings__sidebar,
.profile-settings__content {
  min-width: 0;
}

.settings-nav {
  position: sticky;
  top: 82px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.settings-nav__label {
  margin: 0 0 7px;
  padding: 0 12px;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.settings-nav__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 12px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 550;
  text-align: left;
  color: var(--text-secondary);
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.settings-nav__item::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: -1px;
  width: 3px;
  border-radius: 999px;
  background: var(--accent);
  opacity: 0;
  transform: scaleY(0.45);
  transition: opacity 160ms ease, transform 160ms ease;
  content: '';
}

.settings-nav__item:hover {
  background: var(--bg-muted);
  color: var(--text);
}

.settings-nav__item--active {
  border-color: var(--border);
  background: var(--accent-soft);
  color: var(--text);
}

.settings-nav__item--active::before {
  opacity: 1;
  transform: scaleY(1);
}

.settings-nav__item:focus-visible,
.profile-settings__back:focus-visible,
.profile-avatar-panel__edit:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.settings-section {
  scroll-margin-top: 92px;
  animation: settings-section-in 360ms ease both;
}

.settings-section--security {
  margin-top: 64px;
  padding-top: 46px;
  border-top: 1px solid var(--border);
  animation-delay: 70ms;
}

.settings-section__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.settings-section__kicker {
  margin: 0 0 4px;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}

.settings-section__header h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  line-height: var(--leading-tight);
  letter-spacing: -0.035em;
  color: var(--text);
}

.settings-section__header > p {
  max-width: 330px;
  margin: 0 0 2px;
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
  text-align: right;
  color: var(--text-muted);
}

.profile-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: 48px;
  align-items: start;
  padding-top: 26px;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 21px;
  width: 100%;
  max-width: 570px;
}

.settings-form--security {
  padding-top: 26px;
}

.settings-form__field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.settings-form__field label,
.profile-avatar-panel__label {
  font-size: var(--text-sm);
  font-weight: 650;
  color: var(--text);
}

.settings-input {
  width: 100%;
  min-height: 39px;
  padding: 8px 11px;
  border: 1px solid var(--border-strong);
  border-radius: 7px;
  background: var(--bg-elevated);
  font: inherit;
  font-size: var(--text-base);
  color: var(--text);
  outline: none;
  box-shadow: var(--shadow-sm);
  transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
}

.settings-input:hover:not(:disabled):not(:read-only) {
  border-color: color-mix(in srgb, var(--border-strong) 55%, var(--accent));
}

.settings-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.settings-input--readonly {
  background: var(--bg-muted);
  color: var(--text-secondary);
  cursor: default;
}

.settings-input:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.settings-form__hint {
  margin: 0;
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
  color: var(--text-muted);
}

.settings-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: fit-content;
  max-width: 100%;
  padding: 9px 11px;
  border: 1px solid;
  border-radius: 7px;
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
}

.settings-message svg {
  flex: 0 0 auto;
  margin-top: 1px;
}

.settings-message--success {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);
}

.settings-message--error {
  border-color: var(--danger-border);
  background: var(--danger-soft);
  color: var(--danger);
}

.settings-button {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  padding: 7px 14px;
  border: 1px solid var(--accent-border);
  border-radius: 7px;
  background: var(--gradient-orange);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--btn-primary-text);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.12) inset, var(--shadow-sm);
  transition: transform 150ms ease, opacity 150ms ease, filter 150ms ease;
}

.settings-button:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.settings-button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.settings-button:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.profile-avatar-panel {
  min-width: 0;
}

.profile-avatar-panel__label {
  display: block;
  margin: 0 0 11px;
}

.profile-avatar-panel__wrap {
  position: relative;
  width: 132px;
  height: 132px;
}

.profile-avatar-panel__image,
.profile-avatar-panel__fallback {
  width: 132px;
  height: 132px;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.profile-avatar-panel__image {
  display: block;
  object-fit: cover;
}

.profile-avatar-panel__fallback {
  display: grid;
  place-items: center;
  background: var(--gradient-orange);
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--btn-primary-text);
}

.profile-avatar-panel__edit {
  position: absolute;
  right: -3px;
  bottom: 7px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border: 1px solid var(--border-strong);
  border-radius: 7px;
  background: var(--bg-elevated);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-secondary);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: border-color 150ms ease, color 150ms ease, transform 150ms ease;
}

.profile-avatar-panel__edit:hover {
  border-color: var(--accent-border);
  color: var(--accent);
  transform: translateY(-1px);
}

.profile-avatar-panel__hint {
  max-width: 165px;
  margin: 11px 0 0;
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
  color: var(--text-muted);
}

.settings-spinner {
  animation: spin 800ms linear infinite;
}

@keyframes settings-section-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .profile-settings__layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 32px;
    padding-top: 0;
  }

  .profile-settings__sidebar {
    position: sticky;
    top: var(--header-height);
    z-index: 20;
    margin: 0 -24px;
    padding: 12px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--header-bg);
    backdrop-filter: blur(16px);
  }

  .settings-nav {
    position: static;
    flex-direction: row;
    gap: 6px;
  }

  .settings-nav__label {
    display: none;
  }

  .settings-nav__item {
    justify-content: center;
    width: auto;
    min-width: 0;
    padding-inline: 14px;
  }

  .settings-nav__item::before {
    top: auto;
    right: 12px;
    bottom: -1px;
    left: 12px;
    width: auto;
    height: 3px;
    transform: scaleX(0.45);
  }

  .settings-nav__item--active::before {
    transform: scaleX(1);
  }

  .settings-section {
    scroll-margin-top: 132px;
  }

  .profile-editor {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
  }

  .profile-avatar-panel {
    grid-row: 1;
  }

  .profile-avatar-panel__hint {
    max-width: 240px;
  }
}

@media (max-width: 640px) {
  .profile-settings {
    padding: 24px 16px 64px;
  }

  .profile-settings__back {
    margin-bottom: 18px;
  }

  .profile-settings__sidebar {
    margin: 0 -16px;
    padding: 10px 16px;
  }

  .settings-nav {
    overflow-x: auto;
    scrollbar-width: none;
  }

  .settings-nav::-webkit-scrollbar {
    display: none;
  }

  .settings-nav__item {
    flex: 1 0 auto;
  }

  .settings-section__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 9px;
  }

  .settings-section__header > p {
    max-width: none;
    text-align: left;
  }

  .settings-section--security {
    margin-top: 48px;
    padding-top: 38px;
  }

  .profile-editor,
  .settings-form--security {
    padding-top: 22px;
  }

  .settings-button {
    align-self: stretch;
  }
}

@media (prefers-reduced-motion: reduce) {
  .profile-settings__back,
  .settings-nav__item,
  .settings-nav__item::before,
  .settings-section,
  .settings-input,
  .settings-button,
  .profile-avatar-panel__edit {
    transition: none;
    animation: none;
  }
}
</style>
