export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'autoforge-theme'

function readStoredTheme(): ThemeMode {
  if (import.meta.client) {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  }
  return 'dark'
}

function applyThemeToDocument(mode: ThemeMode) {
  if (!import.meta.client) return

  document.documentElement.setAttribute('data-theme', mode)

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', mode === 'light' ? '#fafafa' : '#08080c')
  }
}

export function useTheme() {
  const theme = useState<ThemeMode>('hub-theme', () => {
    if (import.meta.client) {
      const attr = document.documentElement.getAttribute('data-theme')
      if (attr === 'light' || attr === 'dark') return attr
    }
    return 'dark'
  })

  function setTheme(mode: ThemeMode) {
    theme.value = mode
    applyThemeToDocument(mode)
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, mode)
    }
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function initTheme() {
    setTheme(readStoredTheme())
  }

  const isDark = computed(() => theme.value === 'dark')
  const isLight = computed(() => theme.value === 'light')

  return {
    theme,
    isDark,
    isLight,
    setTheme,
    toggleTheme,
    initTheme
  }
}
