<script setup lang="ts">
import gsap from 'gsap'

const props = defineProps<{
  active: boolean
}>()

const rootRef = ref<HTMLElement | null>(null)
const timeline = shallowRef<gsap.core.Timeline | null>(null)
const hasPlayedOnce = ref(false)

/** 是否开启减弱动效 */
function prefersReducedMotion(): boolean {
  if (!import.meta.client) return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 清理当前 timeline */
function killTimeline() {
  timeline.value?.kill()
  timeline.value = null
}

/** 将可动画节点重置为初始态（重播前） */
function resetAnimState(root: HTMLElement) {
  const nodes = root.querySelectorAll<HTMLElement>('[data-anim]')
  gsap.set(nodes, { clearProps: 'all' })
  gsap.set(root.querySelectorAll<HTMLElement>('[data-anim="bg"]'), { opacity: 0, scale: 0.98 })
  gsap.set(root.querySelectorAll<HTMLElement>('[data-anim="hero"]'), { opacity: 0, y: 12 })
  gsap.set(root.querySelectorAll<HTMLElement>('[data-anim="card-ok"]'), { opacity: 0, x: -18 })
  gsap.set(root.querySelectorAll<HTMLElement>('[data-anim="card-bad"]'), { opacity: 0, x: 18 })
  gsap.set(root.querySelectorAll<HTMLElement>('[data-anim="tree"]'), { opacity: 0, y: 8 })
  gsap.set(root.querySelectorAll<HTMLElement>('[data-anim="manifest"]'), { opacity: 0, y: 10 })
  gsap.set(root.querySelectorAll<HTMLElement>('[data-anim="chip"]'), { opacity: 0, scale: 0.85 })
}

/** 播放入场 timeline；重播时跳过背景段 */
function playIntro(full: boolean) {
  const root = rootRef.value
  if (!root || !import.meta.client) return

  killTimeline()

  if (prefersReducedMotion()) {
    gsap.set(root.querySelectorAll<HTMLElement>('[data-anim]'), { opacity: 1, x: 0, y: 0, scale: 1 })
    hasPlayedOnce.value = true
    return
  }

  resetAnimState(root)

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete: () => {
      hasPlayedOnce.value = true
    }
  })

  if (full) {
    tl.to(root.querySelectorAll('[data-anim="bg"]'), {
      opacity: 1,
      scale: 1,
      duration: 0.45
    }, 0)
  } else {
    gsap.set(root.querySelectorAll('[data-anim="bg"]'), { opacity: 1, scale: 1 })
  }

  tl.to(root.querySelectorAll('[data-anim="hero"]'), {
    opacity: 1,
    y: 0,
    duration: 0.4,
    stagger: 0.06
  }, full ? 0.12 : 0)
    .to(root.querySelectorAll('[data-anim="card-ok"]'), {
      opacity: 1,
      x: 0,
      duration: 0.42
    }, '-=0.18')
    .to(root.querySelectorAll('[data-anim="card-bad"]'), {
      opacity: 1,
      x: 0,
      duration: 0.42
    }, '<')
    .to(root.querySelectorAll('[data-anim="tree"]'), {
      opacity: 1,
      y: 0,
      duration: 0.28,
      stagger: 0.05
    }, '-=0.12')
    .to(root.querySelectorAll('[data-anim="manifest"]'), {
      opacity: 1,
      y: 0,
      duration: 0.35
    }, '-=0.1')
    .to(root.querySelectorAll('[data-anim="chip"]'), {
      opacity: 1,
      scale: 1,
      duration: 0.28,
      stagger: 0.05,
      ease: 'back.out(1.6)'
    }, '-=0.12')

  timeline.value = tl
}

onMounted(() => {
  if (props.active) {
    playIntro(true)
  }
})

watch(
  () => props.active,
  (active, wasActive) => {
    if (active && wasActive === false) {
      nextTick(() => playIntro(false))
    } else if (!active) {
      killTimeline()
    }
  }
)

onBeforeUnmount(() => {
  killTimeline()
})
</script>

<template>
  <div ref="rootRef" class="zip-spec">
    <div class="zip-spec__atmosphere" data-anim="bg" aria-hidden="true">
      <div class="zip-spec__grid" />
      <div class="zip-spec__glow" />
    </div>

    <div class="zip-spec__scroll">
      <header class="zip-spec__hero">
        <p class="zip-spec__eyebrow" data-anim="hero">Must follow · script-spec</p>
        <h3 class="zip-spec__title" data-anim="hero">
          导入的 zip 须严格按脚本包规范生成
        </h3>
        <p class="zip-spec__lead" data-anim="hero">
          Autoforge 脚本是目录包，必须包含 <code>autoforge.json</code> 与入口文件；入口须导出
          <code>run</code>。Hub 以 zip 传递，解压后须能定位到含清单的包根。
        </p>
      </header>

      <div class="zip-spec__layout-grid">
        <div class="zip-spec__card zip-spec__card--ok" data-anim="card-ok">
          <div class="zip-spec__card-label">
            <Icon name="lucide:check-circle-2" size="14" />
            支持
          </div>
          <ul class="zip-spec__list">
            <li>zip 根目录直接含 <code>autoforge.json</code> + 入口文件</li>
            <li>zip 内仅一层目录，该目录含 <code>autoforge.json</code></li>
          </ul>
        </div>
        <div class="zip-spec__card zip-spec__card--bad" data-anim="card-bad">
          <div class="zip-spec__card-label">
            <Icon name="lucide:x-circle" size="14" />
            不支持
          </div>
          <ul class="zip-spec__list">
            <li>多顶层目录</li>
            <li>缺少 <code>autoforge.json</code></li>
          </ul>
        </div>
      </div>

      <section class="zip-spec__section">
        <h4 class="zip-spec__section-title" data-anim="tree">最小包结构</h4>
        <pre class="zip-spec__tree" aria-label="最小脚本包目录结构"><span data-anim="tree">my-script/</span>
<span data-anim="tree">├── autoforge.json</span>
<span data-anim="tree">├── README.md          ← 可选</span>
<span data-anim="tree">└── index.mjs</span></pre>
        <p class="zip-spec__note" data-anim="tree">
          若有 README，须与 <code>autoforge.json</code> 位于同一包根一并打入 zip。
          <code>readme.md</code> / 子目录 README / 清单声明路径 — 本期不支持。
        </p>
      </section>

      <section class="zip-spec__section">
        <h4 class="zip-spec__section-title" data-anim="manifest">清单最低要求</h4>
        <pre class="zip-spec__json" data-anim="manifest">{
  "autoforge": "1.0",
  "name": "我的脚本",
  "description": "脚本说明",
  "version": "1.0.0",
  "entry": "index.mjs"
}</pre>
        <p class="zip-spec__note" data-anim="manifest">
          必填：<code>autoforge</code>、<code>name</code>。常用：<code>entry</code>（默认
          <code>index.mjs</code>）、<code>description</code>、<code>version</code>。
        </p>
      </section>

      <div class="zip-spec__chips" role="list">
        <span class="zip-spec__chip" data-anim="chip" role="listitem">勿打 node_modules/</span>
        <span class="zip-spec__chip" data-anim="chip" role="listitem">勿打 .venv/</span>
        <span class="zip-spec__chip" data-anim="chip" role="listitem">仅 .zip</span>
        <span class="zip-spec__chip" data-anim="chip" role="listitem">最大 20MB</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.zip-spec {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(120% 80% at 10% -10%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 55%),
    radial-gradient(90% 70% at 100% 100%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 50%),
    var(--bg-muted);
}

.zip-spec__atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.98);
}

.zip-spec__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(color-mix(in srgb, var(--border-strong) 55%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--border-strong) 55%, transparent) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, #000 20%, transparent 75%);
  opacity: 0.45;
}

.zip-spec__glow {
  position: absolute;
  top: -20%;
  right: -10%;
  width: 55%;
  height: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%);
  filter: blur(8px);
}

.zip-spec__scroll {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  padding: 14px 14px 16px;
  overflow-y: auto;
}

.zip-spec__hero {
  margin-bottom: 14px;
}

.zip-spec__eyebrow {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  opacity: 0;
}

.zip-spec__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
  line-height: 1.35;
  color: var(--text);
  opacity: 0;
}

.zip-spec__lead {
  margin: 8px 0 0;
  font-size: var(--text-xs);
  line-height: 1.55;
  color: var(--text-secondary);
  opacity: 0;
}

.zip-spec__lead code,
.zip-spec__list code,
.zip-spec__note code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92em;
  padding: 0 3px;
  border-radius: 3px;
  background: var(--accent-soft);
  color: var(--accent);
}

.zip-spec__layout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}

.zip-spec__card {
  padding: 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  opacity: 0;
}

.zip-spec__card--ok {
  border-color: color-mix(in srgb, #2f9e6b 50%, var(--border));
  background: color-mix(in srgb, #2f9e6b 9%, var(--bg-elevated));
}

.zip-spec__card--bad {
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
  background: color-mix(in srgb, var(--danger) 8%, var(--bg-elevated));
}

.zip-spec__card-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
  font-size: var(--text-xs);
  font-weight: 700;
}

.zip-spec__card--ok .zip-spec__card-label {
  color: #2f9e6b;
}

.zip-spec__card--bad .zip-spec__card-label {
  color: var(--danger);
}

.zip-spec__list {
  margin: 0;
  padding-left: 16px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.zip-spec__list li + li {
  margin-top: 4px;
}

.zip-spec__section {
  margin-bottom: 14px;
}

.zip-spec__section-title {
  margin: 0 0 6px;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text);
  opacity: 0;
}

.zip-spec__tree,
.zip-spec__json {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1.55;
  color: var(--text);
  overflow-x: auto;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border) 60%, transparent);
}

.zip-spec__tree span {
  display: block;
  opacity: 0;
}

.zip-spec__json {
  opacity: 0;
}

.zip-spec__note {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
  opacity: 0;
}

.zip-spec__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.zip-spec__chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: var(--bg-elevated);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  opacity: 0;
  transform: scale(0.85);
}

@media (max-width: 800px) {
  .zip-spec__layout-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .zip-spec__atmosphere,
  .zip-spec__eyebrow,
  .zip-spec__title,
  .zip-spec__lead,
  .zip-spec__card,
  .zip-spec__section-title,
  .zip-spec__tree span,
  .zip-spec__json,
  .zip-spec__note,
  .zip-spec__chip {
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>
