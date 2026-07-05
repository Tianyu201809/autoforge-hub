<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({ title: '编辑资料 - Autoforge Hub' })

const { user } = useAuth()
const displayName = ref(user.value?.displayName || '')
const avatarUrl = ref(user.value?.avatarUrl || '')
const saving = ref(false)
const message = ref('')
const errorMsg = ref('')

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
    message.value = '保存成功'
  } catch (e: any) { errorMsg.value = e.message || '保存失败' }
  saving.value = false
}

async function changeAvatar(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const token = localStorage.getItem('autoforge-token')
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await fetch('/api/auth/avatar', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: formData
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message)
    avatarUrl.value = data.avatarUrl
    message.value = '头像已更新'
  } catch (e: any) { errorMsg.value = e.message || '上传失败' }
}
</script>

<template>
  <div class="profile-page">
    <WorkspaceWsHeader />
    <div class="profile-page__body">
      <NuxtLink to="/workspace" class="profile-page__back">
        <Icon name="lucide:arrow-left" size="16" /> 返回
      </NuxtLink>

      <h1 class="profile-page__title">编辑资料</h1>

      <div class="profile-card">
        <div class="profile-avatar">
          <div class="profile-avatar__wrap">
            <img v-if="avatarUrl" :src="'/api/files/avatars/' + avatarUrl" alt="" class="profile-avatar__img" />
            <span v-else class="profile-avatar__initials">{{ user?.displayName?.slice(0, 2)?.toUpperCase() || 'U' }}</span>
            <label class="profile-avatar__change">
              <Icon name="lucide:camera" size="16" />
              <input type="file" accept="image/png,image/jpg,image/jpeg,image/webp" hidden @change="changeAvatar" />
            </label>
          </div>
          <p class="profile-avatar__hint">点击相机图标更换头像</p>
        </div>

        <div class="profile-form">
          <div class="profile-form__field">
            <label class="profile-form__label">显示名称</label>
            <input v-model="displayName" type="text" class="profile-form__input" placeholder="输入显示名称" maxlength="30" :disabled="saving" />
          </div>
          <div class="profile-form__field">
            <label class="profile-form__label">邮箱</label>
            <input :value="user?.email" type="email" class="profile-form__input profile-form__input--readonly" disabled />
          </div>

          <div v-if="message" class="profile-form__msg profile-form__msg--success">{{ message }}</div>
          <div v-if="errorMsg" class="profile-form__msg profile-form__msg--error">{{ errorMsg }}</div>

          <button type="button" class="profile-form__submit" :disabled="saving" @click="saveProfile">
            <Icon v-if="saving" name="lucide:loader-circle" size="16" class="profile-form__spinner" />
            {{ saving ? '保存中...' : '保存修改' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page { min-height: 100vh; background: var(--bg); }
.profile-page__body { max-width: 560px; margin: 0 auto; padding: 32px 24px 80px; }
.profile-page__back { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 20px; font-size: var(--text-sm); color: var(--text-muted); }
.profile-page__back:hover { color: var(--accent); }
.profile-page__title { margin: 0 0 24px; font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 700; letter-spacing: -0.02em; color: var(--text); }

.profile-card { border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-elevated); box-shadow: var(--shadow-card); overflow: hidden; }
.profile-avatar { display: flex; flex-direction: column; align-items: center; padding: 32px 24px 24px; border-bottom: 1px solid var(--border); }
.profile-avatar__wrap { position: relative; width: 96px; height: 96px; }
.profile-avatar__img { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 3px solid var(--border-accent); }
.profile-avatar__initials { display: flex; align-items: center; justify-content: center; width: 96px; height: 96px; border-radius: 50%; background: var(--gradient-orange); font-size: 28px; font-weight: 700; color: var(--btn-primary-text); }
.profile-avatar__change { position: absolute; bottom: 0; right: 0; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: var(--bg-elevated); border: 2px solid var(--border-strong); color: var(--text-secondary); cursor: pointer; transition: background 0.15s, color 0.15s; }
.profile-avatar__change:hover { background: var(--accent); color: #fff; border-color: var(--accent-border); }
.profile-avatar__hint { margin: 10px 0 0; font-size: var(--text-xs); color: var(--text-muted); }

.profile-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.profile-form__field { display: flex; flex-direction: column; gap: 6px; }
.profile-form__label { font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); }
.profile-form__input { padding: 10px 14px; border: 1px solid var(--border-strong); border-radius: var(--radius-md); background: var(--bg-muted); font-family: inherit; font-size: var(--text-base); color: var(--text); outline: none; transition: border-color 0.15s; }
.profile-form__input:focus { border-color: var(--accent-border); box-shadow: var(--shadow-glow-orange); }
.profile-form__input--readonly { opacity: 0.6; cursor: not-allowed; }
.profile-form__msg { padding: 8px 12px; border-radius: var(--radius-sm); font-size: var(--text-sm); }
.profile-form__msg--success { background: var(--accent-soft); color: var(--accent); border: 1px solid var(--accent-border); }
.profile-form__msg--error { background: var(--danger-soft); color: var(--danger); border: 1px solid var(--danger-border); }
.profile-form__submit { display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px 20px; border: 1px solid var(--accent-border); border-radius: var(--radius-md); background: var(--gradient-orange); font-size: var(--text-base); font-weight: 600; color: var(--btn-primary-text); box-shadow: var(--shadow-glow-orange); transition: transform 0.15s, opacity 0.15s; }
.profile-form__submit:hover:not(:disabled) { transform: translateY(-1px); }
.profile-form__submit:disabled { opacity: 0.7; cursor: not-allowed; }
.profile-form__spinner { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
