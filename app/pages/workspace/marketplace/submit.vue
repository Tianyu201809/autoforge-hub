<script setup lang="ts">
import gsap from 'gsap'
import type { Script } from '~/types/workspace'
import { MARKETPLACE_CATEGORIES, SCRIPT_LANGUAGES } from '~/types/workspace'

definePageMeta({ layout: 'default' })
useHead({ title: '提交插件 - Autoforge Hub' })

const { loadScripts, scripts, listLoading, addScript } = useScripts()
const { publish } = useMarketplace()
const { showTip } = useTip()

const step = ref(1)
const mode = ref<'pick' | 'upload'>('pick')
const selectedId = ref('')
const uploading = ref(false)
const publishing = ref(false)
const confirmPublic = ref(false)
const formError = ref('')
const panelRef = ref<HTMLElement | null>(null)
let gsapCtx: gsap.Context | null = null

const form = reactive({
  title: '',
  description: '',
  readme: '',
  category: '' as string,
  language: 'Python',
  tags: '' as string,
  icon: 'file-archive',
  iconColor: undefined as string | undefined,
})

const zipFile = ref<File | null>(null)
const uploadTitle = ref('')

const reducedMotion = computed(() =>
  import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
)

const selectableScripts = computed(() =>
  scripts.value.filter(s => !s.teamId && s.visibility !== 'public')
)

const selectedScript = computed(() =>
  selectableScripts.value.find(s => s.id === selectedId.value) || null
)

function parseTags(raw: string) {
  return raw.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean)
}

function animateStep() {
  gsapCtx?.revert()
  gsapCtx = gsap.context(() => {
    if (reducedMotion.value || !panelRef.value) return
    gsap.fromTo(
      panelRef.value,
      { opacity: 0, x: 24 },
      { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' }
    )
  })
}

watch(step, async () => {
  await nextTick()
  animateStep()
})

function fillFromScript(s: Script) {
  form.title = s.title
  form.description = s.description || ''
  form.readme = s.readme || ''
  form.category = s.category || ''
  form.language = s.language || 'Python'
  form.tags = (s.tags || []).join(', ')
  form.icon = s.icon || 'file-archive'
  form.iconColor = s.iconColor
}

async function goStep2FromPick() {
  formError.value = ''
  if (!selectedScript.value) {
    formError.value = '请选择一条个人脚本'
    return
  }
  fillFromScript(selectedScript.value)
  step.value = 2
}

async function goStep2FromUpload() {
  formError.value = ''
  if (!zipFile.value) {
    formError.value = '请选择 ZIP 文件'
    return
  }
  if (!uploadTitle.value.trim()) {
    formError.value = '请填写脚本标题'
    return
  }
  uploading.value = true
  try {
    const created = await addScript(
      uploadTitle.value.trim(),
      '',
      [],
      form.category || '其他',
      form.language || 'Python',
      form.icon,
      zipFile.value,
      undefined,
      form.iconColor,
      ''
    )
    if (!created) {
      formError.value = '上传失败，请检查 ZIP 规格后重试'
      return
    }
    selectedId.value = created.id
    fillFromScript(created)
    form.title = uploadTitle.value.trim()
    step.value = 2
  } finally {
    uploading.value = false
  }
}

function goStep3() {
  formError.value = ''
  if (!form.title.trim()) {
    formError.value = '标题不能为空'
    return
  }
  if (!form.category) {
    formError.value = '请选择分类'
    return
  }
  if (form.readme.trim().length < 20) {
    formError.value = '请完善 README（至少 20 字）'
    return
  }
  step.value = 3
}

async function submitPublish() {
  formError.value = ''
  if (!confirmPublic.value) {
    formError.value = '请确认公开发布'
    return
  }
  if (!selectedId.value) {
    formError.value = '缺少脚本'
    return
  }
  publishing.value = true
  try {
    const res = await publish({
      scriptId: selectedId.value,
      title: form.title.trim(),
      description: form.description.trim(),
      readme: form.readme,
      category: form.category,
      language: form.language,
      tags: parseTags(form.tags),
      icon: form.icon,
      iconColor: form.iconColor,
    })
    showTip('已发布到脚本集市', 'success')
    if (!reducedMotion.value && panelRef.value) {
      await gsap.to(panelRef.value, { opacity: 0.4, scale: 0.98, duration: 0.25 })
    }
    await navigateTo(`/workspace/marketplace/${res.id}`)
  } catch (e: any) {
    if (e?.statusCode === 409) {
      formError.value = '已在集市中'
      showTip('该脚本已在集市中', 'error')
      await navigateTo(`/workspace/marketplace/${selectedId.value}`)
      return
    }
    formError.value = e?.message || '发布失败'
  } finally {
    publishing.value = false
  }
}

onMounted(async () => {
  await loadScripts({ scope: 'personal', pageSize: 100 })
  await nextTick()
  animateStep()
})

onUnmounted(() => {
  gsapCtx?.revert()
})
</script>

<template>
  <div class="mp-shell">
    <WorkspaceWsHeader />
    <div class="mp-submit">
    <NuxtLink to="/workspace/marketplace" class="mp-submit__back">
      <Icon name="lucide:arrow-left" size="16" />
      返回集市
    </NuxtLink>

    <header class="mp-submit__head">
      <h1>提交插件</h1>
      <p>将个人脚本公开发布到脚本集市</p>
      <ol class="mp-submit__steps">
        <li :class="{ 'is-active': step === 1, 'is-done': step > 1 }">1. 选择来源</li>
        <li :class="{ 'is-active': step === 2, 'is-done': step > 2 }">2. 完善信息</li>
        <li :class="{ 'is-active': step === 3 }">3. 确认发布</li>
      </ol>
    </header>

    <div ref="panelRef" class="mp-submit__panel">
      <!-- Step 1 -->
      <div v-if="step === 1">
        <div class="mp-submit__modes">
          <button type="button" :class="{ 'is-active': mode === 'pick' }" @click="mode = 'pick'">从个人空间选择</button>
          <button type="button" :class="{ 'is-active': mode === 'upload' }" @click="mode = 'upload'">上传新 ZIP</button>
        </div>

        <template v-if="mode === 'pick'">
          <p v-if="listLoading" class="mp-submit__hint">加载个人脚本…</p>
          <p v-else-if="!selectableScripts.length" class="mp-submit__hint">暂无可上架脚本（已公开的不会列出）</p>
          <div v-else class="mp-submit__list">
            <label
              v-for="s in selectableScripts"
              :key="s.id"
              class="mp-submit__pick"
              :class="{ 'is-selected': selectedId === s.id }"
            >
              <input v-model="selectedId" type="radio" :value="s.id">
              <span class="mp-submit__pick-title">{{ s.title }}</span>
              <span class="mp-submit__pick-meta">{{ s.category || '未分类' }}</span>
            </label>
          </div>
          <div class="mp-submit__footer">
            <button type="button" class="mp-btn mp-btn--primary" @click="goStep2FromPick">下一步</button>
          </div>
        </template>

        <template v-else>
          <label class="mp-field">
            <span>标题</span>
            <input v-model="uploadTitle" type="text" placeholder="插件名称">
          </label>
          <label class="mp-field">
            <span>ZIP 文件</span>
            <input type="file" accept=".zip,application/zip" @change="(e: Event) => { zipFile = (e.target as HTMLInputElement).files?.[0] || null }">
          </label>
          <WsZipSpecGuide />
          <div class="mp-submit__footer">
            <button type="button" class="mp-btn mp-btn--primary" :disabled="uploading" @click="goStep2FromUpload">
              {{ uploading ? '上传中…' : '上传并继续' }}
            </button>
          </div>
        </template>
      </div>

      <!-- Step 2 -->
      <div v-else-if="step === 2">
        <label class="mp-field">
          <span>标题</span>
          <input v-model="form.title" type="text">
        </label>
        <label class="mp-field">
          <span>简述</span>
          <input v-model="form.description" type="text" placeholder="一句话介绍">
        </label>
        <div class="mp-field-row">
          <label class="mp-field">
            <span>分类</span>
            <select v-model="form.category">
              <option value="" disabled>请选择</option>
              <option v-for="c in MARKETPLACE_CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label class="mp-field">
            <span>语言</span>
            <select v-model="form.language">
              <option v-for="l in SCRIPT_LANGUAGES" :key="l" :value="l">{{ l }}</option>
            </select>
          </label>
        </div>
        <label class="mp-field">
          <span>标签（逗号分隔）</span>
          <input v-model="form.tags" type="text" placeholder="例如：csv, 清洗">
        </label>
        <WsIconPicker v-model="form.icon" v-model:color="form.iconColor" />
        <label class="mp-field">
          <span>README（Markdown，至少 20 字）</span>
          <textarea v-model="form.readme" rows="8" />
        </label>
        <div v-if="form.readme.trim()" class="mp-preview">
          <p class="mp-preview__label">预览</p>
          <WsMarkdown :source="form.readme" />
        </div>
        <div class="mp-submit__footer">
          <button type="button" class="mp-btn" @click="step = 1">上一步</button>
          <button type="button" class="mp-btn mp-btn--primary" @click="goStep3">下一步</button>
        </div>
      </div>

      <!-- Step 3 -->
      <div v-else>
        <div class="mp-confirm">
          <h3>{{ form.title }}</h3>
          <p>{{ form.description || '无简述' }}</p>
          <ul>
            <li>分类：{{ form.category }}</li>
            <li>语言：{{ form.language }}</li>
            <li>标签：{{ parseTags(form.tags).join('、') || '无' }}</li>
          </ul>
          <label class="mp-confirm__check">
            <input v-model="confirmPublic" type="checkbox">
            我确认将此脚本公开发布到脚本集市
          </label>
        </div>
        <div class="mp-submit__footer">
          <button type="button" class="mp-btn" @click="step = 2">上一步</button>
          <button type="button" class="mp-btn mp-btn--primary" :disabled="publishing" @click="submitPublish">
            {{ publishing ? '发布中…' : '确认发布' }}
          </button>
        </div>
      </div>

      <p v-if="formError" class="mp-submit__error">{{ formError }}</p>
    </div>
    </div>
  </div>
</template>

<style scoped>
.mp-shell {
  min-height: 100vh;
}

.mp-submit {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px 64px;
}

.mp-submit__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  font-size: var(--text-sm);
  color: var(--text-muted);
  text-decoration: none;
}

.mp-submit__head h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-2xl);
}

.mp-submit__head p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.mp-submit__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.mp-submit__steps .is-active {
  color: var(--accent);
  font-weight: 600;
}

.mp-submit__steps .is-done {
  color: var(--text-secondary);
}

.mp-submit__panel {
  margin-top: 20px;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
}

.mp-submit__modes {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.mp-submit__modes button {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-sm);
}

.mp-submit__modes button.is-active {
  color: var(--accent);
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.mp-submit__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow: auto;
}

.mp-submit__pick {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.mp-submit__pick.is-selected {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.mp-submit__pick-title {
  font-size: var(--text-sm);
  font-weight: 600;
}

.mp-submit__pick-meta {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.mp-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.mp-field input,
.mp-field select,
.mp-field textarea {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  color: var(--text);
  font: inherit;
}

.mp-field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.mp-preview {
  margin: 12px 0 16px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}

.mp-preview__label {
  margin: 0 0 8px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.mp-confirm h3 {
  margin: 0 0 8px;
  font-family: var(--font-display);
}

.mp-confirm ul {
  margin: 12px 0;
  padding-left: 18px;
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.mp-confirm__check {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: var(--text-sm);
  color: var(--text);
}

.mp-submit__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.mp-btn {
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  color: var(--text);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
}

.mp-btn--primary {
  border-color: var(--accent-border);
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
}

.mp-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mp-submit__hint,
.mp-submit__error {
  font-size: var(--text-sm);
  margin: 12px 0 0;
}

.mp-submit__error {
  color: var(--danger);
}

@media (max-width: 600px) {
  .mp-field-row {
    grid-template-columns: 1fr;
  }
}
</style>
