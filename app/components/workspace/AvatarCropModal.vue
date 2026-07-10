<script setup lang="ts">
// ─── Props & Emits ───
const props = defineProps<{
  /** 用户选择的原始图片文件 */
  file: File
}>()

const emit = defineEmits<{
  crop: [blob: Blob]
  cancel: []
}>()

// ─── Image loading ───
const objectUrl = URL.createObjectURL(props.file)
const imgElement = new Image()

const imgLoaded = ref(false)

// Image natural dimensions (set after load)
const imgNatural = ref({ w: 0, h: 0 })

// MUST set onload before src to avoid race condition with cached images
imgElement.onload = () => {
  imgNatural.value = { w: imgElement.naturalWidth, h: imgElement.naturalHeight }
  imgLoaded.value = true
  // Auto-center
  resetPan()
}
imgElement.src = objectUrl

// ─── Crop state ───
const CROP_SIZE = 240          // crop circle diameter in px
const MIN_ZOOM = 0.25
const MAX_ZOOM = 4

const zoom = ref(1.5)           // current zoom level
const panX = ref(0)             // horizontal pan offset (px)
const panY = ref(0)             // vertical pan offset (px)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const panStart = ref({ x: 0, y: 0 })

const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

function resetPan() {
  panX.value = 0
  panY.value = 0
  if (imgLoaded.value) {
    // Fit the longer edge of the image into the crop circle
    const maxDim = Math.max(imgNatural.value.w, imgNatural.value.h)
    zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, CROP_SIZE / maxDim))
  } else {
    zoom.value = 1.5
  }
}

// ─── Mouse / Touch handlers ───
function onPointerDown(e: PointerEvent) {
  isDragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY }
  panStart.value = { x: panX.value, y: panY.value }
  const el = containerRef.value
  if (el) el.setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value) return
  const dx = e.clientX - dragStart.value.x
  const dy = e.clientY - dragStart.value.y
  panX.value = panStart.value.x + dx
  panY.value = panStart.value.y + dy
}

function onPointerUp(_e: PointerEvent) {
  isDragging.value = false
}

// ─── Wheel zoom ───
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.08 : 0.08
  zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value + delta))
}

// ─── Confirm crop ───
async function confirmCrop() {
  const container = containerRef.value
  const canvas = canvasRef.value
  if (!container || !canvas || !imgLoaded.value) return

  const rect = container.getBoundingClientRect()
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  const halfCrop = CROP_SIZE / 2

  // The visible image position in the container
  const scale = zoom.value
  const imgW = imgNatural.value.w * scale
  const imgH = imgNatural.value.h * scale

  // Image top-left in container coordinates
  const imgLeft = (rect.width - imgW) / 2 + panX.value
  const imgTop = (rect.height - imgH) / 2 + panY.value

  // Crop circle center → which pixel in the original image?
  const cropCenterImgX = (centerX - imgLeft) / scale
  const cropCenterImgY = (centerY - imgTop) / scale

  // Extract the square region centered at that point
  const outputSize = 256
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, outputSize, outputSize)

  // Draw the cropped circular region
  ctx.save()
  ctx.beginPath()
  ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  // Source rect: the visible region within the crop circle
  const srcLeft = cropCenterImgX - halfCrop / scale
  const srcTop = cropCenterImgY - halfCrop / scale
  const srcSize = (CROP_SIZE / scale)

  ctx.drawImage(
    imgElement,
    srcLeft, srcTop, srcSize, srcSize,
    0, 0, outputSize, outputSize,
  )
  ctx.restore()

  // Convert to blob
  canvas.toBlob((blob) => {
    if (blob) emit('crop', blob)
  }, 'image/webp', 0.9)
}

// ─── Cleanup ───
onUnmounted(() => {
  URL.revokeObjectURL(objectUrl)
})
</script>

<template>
  <Teleport to="body">
    <div class="crop-overlay" @click.self="emit('cancel')">
      <div class="crop-modal" role="dialog" aria-label="裁剪头像">
        <!-- Header -->
        <div class="crop-modal__head">
          <h2 class="crop-modal__title">裁剪头像</h2>
          <p class="crop-modal__desc">拖动图片或使用滚轮缩放，选择最佳裁剪区域</p>
        </div>

        <!-- Crop area -->
        <div
          ref="containerRef"
          class="crop-stage"
          :class="{ 'crop-stage--dragging': isDragging }"
          @pointerdown.prevent="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel.prevent="onWheel"
        >
          <img
            v-if="imgLoaded"
            :src="objectUrl"
            class="crop-stage__img"
            :style="{
              transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${zoom})`,
            }"
            draggable="false"
            alt="裁剪预览"
          >
          <div v-else class="crop-stage__loading">
            <Icon name="lucide:loader-circle" size="32" class="crop-stage__spinner" />
          </div>

          <!-- Crop circle overlay -->
          <svg class="crop-stage__mask" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <mask id="cropMask">
                <rect width="100" height="100" fill="white" />
                <circle cx="50" cy="50" r="48" fill="black" />
              </mask>
            </defs>
            <rect width="100" height="100" fill="rgba(4,4,8,0.65)" mask="url(#cropMask)" />
          </svg>

          <!-- Crop circle ring -->
          <div class="crop-stage__ring" aria-hidden="true" />
          <div class="crop-stage__crosshair" aria-hidden="true" />
        </div>

        <!-- Zoom slider -->
        <div class="crop-zoom">
          <Icon name="lucide:minus" size="14" class="crop-zoom__icon" />
          <input
            type="range"
            class="crop-zoom__slider"
            :min="MIN_ZOOM"
            :max="MAX_ZOOM"
            step="0.01"
            v-model.number="zoom"
          >
          <Icon name="lucide:plus" size="14" class="crop-zoom__icon" />
        </div>

        <!-- Actions -->
        <div class="crop-actions">
          <button type="button" class="crop-actions__cancel" @click="emit('cancel')">
            取消
          </button>
          <button type="button" class="crop-actions__confirm" @click="confirmCrop">
            <Icon name="lucide:check" size="16" />
            确认裁剪
          </button>
        </div>
      </div>
    </div>

    <!-- Hidden canvas for crop processing -->
    <canvas ref="canvasRef" hidden />
  </Teleport>
</template>

<style scoped>
/* ─── Overlay ─── */
.crop-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 4, 8, 0.78);
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}

/* ─── Modal ─── */
.crop-modal {
  width: min(92vw, 480px);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), var(--shadow-glow-purple);
  overflow: hidden;
  animation: modalRise 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.crop-modal__head {
  padding: 24px 24px 0;
  text-align: center;
}

.crop-modal__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
}

.crop-modal__desc {
  margin: 6px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: var(--leading-snug);
}

/* ─── Crop Stage ─── */
.crop-stage {
  position: relative;
  width: 280px;
  height: 280px;
  margin: 20px auto;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-muted);
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.crop-stage--dragging {
  cursor: grabbing;
}

.crop-stage__img {
  position: absolute;
  top: 50%;
  left: 50%;
  width: auto;
  height: auto;
  max-width: none;
  max-height: none;
  transform-origin: center center;
  will-change: transform;
  pointer-events: none;
}

.crop-stage__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.crop-stage__spinner {
  animation: spin 0.8s linear infinite;
}

/* ─── SVG mask overlay ─── */
.crop-stage__mask {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* ─── Crop circle ring ─── */
.crop-stage__ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 240px;
  height: 240px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06), 0 0 30px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  animation: ringPulse 2s ease-in-out infinite;
}

/* ─── Crosshair ─── */
.crop-stage__crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1px;
  height: 1px;
  pointer-events: none;
}
.crop-stage__crosshair::before,
.crop-stage__crosshair::after {
  content: '';
  position: absolute;
  background: rgba(255, 255, 255, 0.3);
}
.crop-stage__crosshair::before {
  top: -16px;
  left: 0;
  width: 1px;
  height: 32px;
}
.crop-stage__crosshair::after {
  top: 0;
  left: -16px;
  width: 32px;
  height: 1px;
}

/* ─── Zoom ─── */
.crop-zoom {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 24px 20px;
}

.crop-zoom__icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.crop-zoom__slider {
  -webkit-appearance: none;
  appearance: none;
  width: 160px;
  height: 4px;
  border-radius: 4px;
  background: var(--border-strong);
  outline: none;
  cursor: pointer;
}

.crop-zoom__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--brand-orange);
  border: 2px solid var(--bg-elevated);
  box-shadow: 0 0 0 1px var(--accent-border), 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.12s;
}

.crop-zoom__slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.crop-zoom__slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--brand-orange);
  border: 2px solid var(--bg-elevated);
  box-shadow: 0 0 0 1px var(--accent-border);
  cursor: pointer;
}

/* ─── Actions ─── */
.crop-actions {
  display: flex;
  gap: 10px;
  padding: 0 24px 24px;
}

.crop-actions__cancel {
  flex: 1;
  padding: 10px 0;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: transparent;
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.crop-actions__cancel:hover {
  background: var(--bg-muted);
  color: var(--text);
}

.crop-actions__confirm {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  background: var(--gradient-orange);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--btn-primary-text);
  box-shadow: var(--shadow-glow-orange);
  cursor: pointer;
  transition: transform 0.15s, opacity 0.15s;
}

.crop-actions__confirm:hover {
  transform: translateY(-1px);
}

.crop-actions__confirm:active {
  transform: translateY(0);
}

/* ─── Animations ─── */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalRise {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes ringPulse {
  0%, 100% { border-color: rgba(255, 255, 255, 0.18); }
  50% { border-color: rgba(255, 255, 255, 0.28); }
}

/* ─── Responsive ─── */
@media (max-width: 480px) {
  .crop-stage {
    width: 220px;
    height: 220px;
  }
  .crop-stage__ring {
    width: 185px;
    height: 185px;
  }
  .crop-modal {
    width: 96vw;
  }
}
</style>
