export type TipType = 'success' | 'error' | 'info'

export interface TipState {
  visible: boolean
  message: string
  type: TipType
}

const DEFAULT_DURATION_MS = 3200

let hideTimer: ReturnType<typeof setTimeout> | null = null

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

export function useTip() {
  const tip = useState<TipState>('af-global-tip', () => ({
    visible: false,
    message: '',
    type: 'success',
  }))

  function hideTip() {
    clearHideTimer()
    tip.value = { ...tip.value, visible: false }
  }

  function showTip(
    message: string,
    type: TipType = 'success',
    durationMs = DEFAULT_DURATION_MS
  ) {
    clearHideTimer()
    tip.value = { visible: true, message, type }
    if (durationMs > 0) {
      hideTimer = setTimeout(() => {
        tip.value = { ...tip.value, visible: false }
        hideTimer = null
      }, durationMs)
    }
  }

  return { tip, showTip, hideTip }
}
