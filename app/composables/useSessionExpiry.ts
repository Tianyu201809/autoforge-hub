const LOGIN_PATH = '/login'

export function useSessionExpiry() {
  const visible = useState('session-expiry-dialog-visible', () => false)

  function show() {
    if (!import.meta.client || window.location.pathname === LOGIN_PATH) return
    if (!localStorage.getItem('autoforge-token')) return
    visible.value = true
  }

  async function returnToLogin() {
    const { logout } = useAuth()
    logout()
    visible.value = false
    await navigateTo(LOGIN_PATH)
  }

  return { visible, show, returnToLogin }
}
