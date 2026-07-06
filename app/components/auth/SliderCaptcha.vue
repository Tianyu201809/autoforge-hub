<script setup lang="ts">
const props = defineProps<{
  token: string
  targetPosition: number // 0-100
  disabled?: boolean
}>()

const emit = defineEmits<{
  verified: [position: number]
  refresh: []
}>()

// ── Drag state ──────────────────────────────────────────
const trackRef = ref<HTMLElement | null>(null)
const pieceRef = ref<HTMLElement | null>(null)

const isDragging = ref(false)
const currentPosition = ref(0) // 0-100, where the piece currently is
const isVerified = ref(false)
const isShaking = ref(false)

const trackWidth = ref(0)

// ── Resize observer for track width ─────────────────────
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (trackRef.value) {
    trackWidth.value = trackRef.value.offsetWidth
    resizeObserver = new ResizeObserver(([entry]) => {
      trackWidth.value = entry.contentRect.width
    })
    resizeObserver.observe(trackRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

// ── Drag handlers ───────────────────────────────────────
let startPointerX = 0
let startPiecePos = 0

function onPointerDown(e: PointerEvent) {
  if (isVerified.value || props.disabled) return
  isDragging.value = true
  startPointerX = e.clientX
  startPiecePos = currentPosition.value

  // Capture pointer for smooth tracking
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value || !trackRef.value) return

  const deltaX = e.clientX - startPointerX
  const deltaPercent = (deltaX / trackWidth.value) * 100
  const newPos = Math.max(0, Math.min(100, startPiecePos + deltaPercent))
  currentPosition.value = newPos
}

function onPointerUp() {
  if (!isDragging.value) return
  isDragging.value = false

  // Check if within tolerance of target
  const diff = Math.abs(currentPosition.value - props.targetPosition)
  if (diff <= 5) {
    // Snap to target
    currentPosition.value = props.targetPosition
    isVerified.value = true
    emit('verified', currentPosition.value)
  } else {
    // Shake and reset
    isShaking.value = true
    setTimeout(() => {
      isShaking.value = false
      currentPosition.value = 0
    }, 500)
  }
}

// ── Puzzle piece style ──────────────────────────────────
const pieceStyle = computed(() => {
  const pos = currentPosition.value
  return {
    left: `calc(${pos}% - ${16 + (pos / 100) * 20}px)`,
    transform: 'translateY(-50%)',
  }
})

// Gap style
const gapStyle = computed(() => {
  return {
    left: `${props.targetPosition}%`,
  }
})

function handleRefresh() {
  if (isVerified.value) return
  currentPosition.value = 0
  emit('refresh')
}

// ── Track pattern CSS ───────────────────────────────────
const trackPattern = computed(() => {
  // Generate a unique pattern based on targetPosition for visual variety
  const seed = Math.round(props.targetPosition * 10)
  return seed
})
</script>

<template>
  <div
    class="slider-captcha"
    :class="{
      'slider-captcha--verified': isVerified,
      'slider-captcha--disabled': disabled,
    }"
  >
    <!-- Label -->
    <div class="slider-captcha__header">
      <span class="slider-captcha__label">安全验证</span>
      <button
        type="button"
        class="slider-captcha__refresh"
        :disabled="disabled || isVerified"
        @click="handleRefresh"
        :title="'刷新验证码'"
      >
        <Icon name="lucide:refresh-cw" size="14" />
      </button>
    </div>

    <!-- Track -->
    <div
      ref="trackRef"
      class="slider-captcha__track"
      :class="{ 'slider-captcha__track--shaking': isShaking }"
    >
      <!-- Background pattern layer -->
      <div class="slider-captcha__pattern" aria-hidden="true">
        <div
          v-for="i in 12"
          :key="i"
          class="slider-captcha__pattern-bar"
          :style="{ animationDelay: `${i * 0.08}s` }"
        />
      </div>

      <!-- Gap indicator (target) -->
      <div class="slider-captcha__gap" :style="gapStyle" aria-hidden="true">
        <div class="slider-captcha__gap-inner">
          <Icon name="lucide:unlock" size="14" />
        </div>
      </div>

      <!-- Draggable puzzle piece -->
      <div
        ref="pieceRef"
        class="slider-captcha__piece"
        :class="{
          'slider-captcha__piece--dragging': isDragging,
          'slider-captcha__piece--verified': isVerified,
        }"
        :style="pieceStyle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div class="slider-captcha__piece-inner">
          <Icon
            v-if="isVerified"
            name="lucide:check"
            size="16"
            class="slider-captcha__piece-icon"
          />
          <Icon
            v-else
            name="lucide:arrow-right-to-line"
            size="16"
            class="slider-captcha__piece-icon"
          />
        </div>
      </div>

      <!-- Track progress fill -->
      <div
        class="slider-captcha__fill"
        :style="{ width: `${Math.min(currentPosition, targetPosition)}%` }"
        aria-hidden="true"
      />
    </div>

    <!-- Hint text -->
    <p class="slider-captcha__hint">
      <template v-if="isVerified">✓ 验证通过</template>
      <template v-else>拖动滑块至目标位置完成验证</template>
    </p>
  </div>
</template>

<style scoped>
/* ── Container ──────────────────────────────────────── */
.slider-captcha {
  --captcha-track-h: 44px;
  --captcha-piece-size: 36px;
  --captcha-gap-size: 28px;

  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: captchaReveal 0.4s ease both;
}

.slider-captcha--disabled {
  opacity: 0.6;
  pointer-events: none;
}

/* ── Header ─────────────────────────────────────────── */
.slider-captcha__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.slider-captcha__label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.slider-captcha__refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s, background 0.2s, transform 0.2s;
}

.slider-captcha__refresh:hover:not(:disabled) {
  color: var(--accent);
  background: var(--accent-soft);
  transform: rotate(180deg);
}

.slider-captcha__refresh:disabled {
  cursor: not-allowed;
}

/* ── Track ──────────────────────────────────────────── */
.slider-captcha__track {
  position: relative;
  height: var(--captcha-track-h);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  border: 1px solid var(--border-strong);
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  touch-action: none;
}

.slider-captcha__track--shaking {
  animation: captchaShake 0.5s ease;
}

/* ── Pattern background ─────────────────────────────── */
.slider-captcha__pattern {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  opacity: 0.15;
  pointer-events: none;
}

.slider-captcha__pattern-bar {
  flex: 1;
  height: 60%;
  border-radius: 2px;
  background: linear-gradient(
    180deg,
    var(--brand-purple-light) 0%,
    var(--brand-orange) 100%
  );
  animation: patternPulse 2.4s ease-in-out infinite alternate;
}

/* ── Fill (progress behind piece) ───────────────────── */
.slider-captcha__fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255, 140, 0, 0.15) 0%,
    rgba(255, 140, 0, 0.06) 100%
  );
  pointer-events: none;
  transition: width 0.05s linear;
}

/* ── Gap indicator (target) ─────────────────────────── */
.slider-captcha__gap {
  position: absolute;
  top: 50%;
  width: var(--captcha-gap-size);
  height: var(--captcha-gap-size);
  transform: translate(-50%, -50%);
  z-index: 2;
  pointer-events: none;
}

.slider-captcha__gap-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 6px;
  border: 2px dashed rgba(255, 140, 0, 0.35);
  background: rgba(255, 140, 0, 0.06);
  color: rgba(255, 140, 0, 0.35);
  animation: gapPulse 2s ease-in-out infinite;
  transition: border-color 0.3s, background 0.3s, color 0.3s;
}

.slider-captcha--verified .slider-captcha__gap-inner {
  border-color: rgba(74, 222, 128, 0.6);
  background: rgba(74, 222, 128, 0.1);
  color: rgba(74, 222, 128, 0.7);
}

/* ── Puzzle piece ───────────────────────────────────── */
.slider-captcha__piece {
  position: absolute;
  top: 50%;
  z-index: 3;
  cursor: grab;
  touch-action: none;
}

.slider-captcha__piece--dragging {
  cursor: grabbing;
}

.slider-captcha__piece-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--captcha-piece-size);
  height: var(--captcha-piece-size);
  border-radius: 8px;
  background: var(--gradient-orange);
  color: var(--btn-primary-text);
  box-shadow:
    0 2px 8px rgba(255, 140, 0, 0.4),
    0 0 20px rgba(255, 140, 0, 0.15);
  transition: transform 0.2s, box-shadow 0.2s, border-radius 0.3s;
}

.slider-captcha__piece:hover:not(.slider-captcha__piece--verified) .slider-captcha__piece-inner {
  transform: scale(1.05);
}

.slider-captcha__piece--dragging .slider-captcha__piece-inner {
  transform: scale(1.08);
  box-shadow:
    0 4px 16px rgba(255, 140, 0, 0.5),
    0 0 30px rgba(255, 140, 0, 0.2);
}

.slider-captcha__piece--verified .slider-captcha__piece-inner {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow:
    0 2px 8px rgba(34, 197, 94, 0.4),
    0 0 20px rgba(34, 197, 94, 0.15);
}

.slider-captcha__piece-icon {
  transition: transform 0.3s;
}

.slider-captcha__piece--verified .slider-captcha__piece-icon {
  animation: checkPop 0.35s ease both;
}

/* ── Hint text ──────────────────────────────────────── */
.slider-captcha__hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-align: center;
  transition: color 0.3s;
}

.slider-captcha--verified .slider-captcha__hint {
  color: #4ade80;
  font-weight: 500;
}

/* ── Animations ─────────────────────────────────────── */
@keyframes captchaReveal {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes captchaShake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-6px); }
  30% { transform: translateX(6px); }
  45% { transform: translateX(-4px); }
  60% { transform: translateX(4px); }
  75% { transform: translateX(-2px); }
  90% { transform: translateX(2px); }
}

@keyframes patternPulse {
  from { opacity: 0.3; transform: scaleY(0.8); }
  to { opacity: 1; transform: scaleY(1); }
}

@keyframes gapPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.06);
    opacity: 1;
  }
}

@keyframes checkPop {
  0% { transform: scale(0); }
  60% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
</style>
