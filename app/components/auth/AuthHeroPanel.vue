<script setup lang="ts">
const heroRef = ref<HTMLElement | null>(null)
const tiltX = ref(0)
const tiltY = ref(0)
const reduceMotion = ref(false)

const steps = [
  { number: 1, text: '注册你的身份', active: true },
  { number: 2, text: '配置你的工作室', active: false },
  { number: 3, text: '完善你的资料', active: false }
]

onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

function onPointerMove(e: PointerEvent) {
  if (reduceMotion.value || !heroRef.value) return
  const rect = heroRef.value.getBoundingClientRect()
  const nx = (e.clientX - rect.left) / rect.width - 0.5
  const ny = (e.clientY - rect.top) / rect.height - 0.5
  tiltY.value = nx * 8
  tiltX.value = -ny * 6
}

function onPointerLeave() {
  tiltX.value = 0
  tiltY.value = 0
}
</script>

<template>
  <section
    ref="heroRef"
    class="auth-hero"
    aria-label="Autoforge Hub 介绍"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <div
      class="auth-hero__stage"
      :style="{
        '--tilt-x': `${tiltX}deg`,
        '--tilt-y': `${tiltY}deg`
      }"
    >
      <div class="auth-hero__mark auth-hero__reveal" style="--i: 0">
        <div class="auth-hero__logo-wrap">
          <div class="auth-hero__ring" aria-hidden="true" />
          <img
            src="/logo-mark-circle.png"
            alt=""
            class="auth-hero__logo"
            width="96"
            height="96"
          >
        </div>
        <div class="auth-hero__mark-text">
          <p class="auth-hero__eyebrow">Script workspace</p>
          <h1 class="auth-hero__name">
            Autoforge <em>Hub</em>
          </h1>
        </div>
      </div>

      <div class="auth-hero__copy auth-hero__reveal" style="--i: 1">
        <h2>和你的团队分享Autoforge脚本程序</h2>
        <p>三步激活工作室 — 注册身份、配置环境、完善资料，即可开始上传与协作。</p>
      </div>

      <ol class="auth-hero__timeline">
        <li
          v-for="(step, index) in steps"
          :key="step.number"
          class="auth-hero__timeline-item auth-hero__reveal"
          :class="{ 'auth-hero__timeline-item--active': step.active }"
          :style="{ '--i': index + 2 }"
        >
          <span class="auth-hero__timeline-num">{{ step.number }}</span>
          <span class="auth-hero__timeline-text">{{ step.text }}</span>
        </li>
      </ol>

      <div class="auth-hero__cta auth-hero__reveal" style="--i: 5">
        <AfDownloadLink variant="hero" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-hero {
  display: none;
  position: relative;
  z-index: 1;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: 32px 24px 32px 8px;
  perspective: 1400px;
}

.auth-hero__stage {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  max-width: 26rem;
  gap: 36px;
  transform-style: preserve-3d;
  transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.auth-hero__mark {
  display: flex;
  align-items: center;
  gap: 18px;
  transform: translateZ(36px);
}

.auth-hero__logo-wrap {
  position: relative;
  width: 108px;
  height: 108px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  animation: logoFloat 6s ease-in-out infinite;
}

.auth-hero__ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1.5px solid transparent;
  border-top-color: var(--accent);
  border-right-color: var(--secondary-border);
  border-bottom-color: var(--secondary);
  border-left-color: var(--accent-border);
  animation: ringSpin 12s linear infinite;
}

.auth-hero__logo {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: contain;
  display: block;
  box-shadow: var(--logo-shadow);
}

.auth-hero__mark-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.auth-hero__eyebrow {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
}

.auth-hero__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.85rem, 2.6vw, 2.35rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.05;
  color: var(--text);
}

.auth-hero__name em {
  font-style: normal;
  color: var(--accent);
}

.auth-hero__copy {
  transform: translateZ(24px);
}

.auth-hero__copy h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.65rem, 2.4vw, 2.15rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--text);
  max-width: 14ch;
}

.auth-hero__copy p {
  margin: 14px 0 0;
  max-width: 34ch;
  font-size: var(--text-sm);
  line-height: 1.65;
  color: var(--text-secondary);
}

.auth-hero__timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  max-width: 20rem;
  transform: translateZ(18px);
}

.auth-hero__timeline-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0 12px 4px;
  color: var(--text-secondary);
}

.auth-hero__timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 17px;
  top: 42px;
  bottom: -2px;
  width: 1px;
  background: linear-gradient(to bottom, var(--border-strong), transparent);
}

.auth-hero__timeline-item--active {
  color: var(--text);
}

.auth-hero__timeline-num {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  font-size: var(--text-xs);
  font-weight: 700;
  background: var(--bg-muted);
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.auth-hero__timeline-item--active .auth-hero__timeline-num {
  background: var(--gradient-orange);
  border-color: var(--accent-border);
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
}

.auth-hero__timeline-text {
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: -0.01em;
}

.auth-hero__cta {
  width: 100%;
  max-width: 20rem;
  transform: translateZ(28px);
}

.auth-hero__reveal {
  opacity: 0;
  transform: translateY(16px);
  animation: heroReveal 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: calc(0.12s + var(--i, 0) * 0.1s);
}

@media (min-width: 1024px) {
  .auth-hero {
    display: flex;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-hero__logo-wrap,
  .auth-hero__ring {
    animation: none;
  }

  .auth-hero__stage {
    transition: none;
  }

  .auth-hero__reveal {
    opacity: 1;
    transform: none;
    animation: none;
  }
}

@keyframes logoFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes ringSpin {
  to { transform: rotate(360deg); }
}

@keyframes heroReveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
