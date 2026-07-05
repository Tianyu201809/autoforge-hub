const PUBLIC_ROUTES = ['/login']

export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, hydrated, loadSession } = useAuth()

  if (import.meta.server) {
    return
  }

  if (!hydrated.value) {
    loadSession()
  }

  const isPublic = PUBLIC_ROUTES.includes(to.path)

  if (isPublic && isAuthenticated.value) {
    return navigateTo('/')
  }

  if (!isPublic && !isAuthenticated.value) {
    const redirect = to.fullPath !== '/' ? to.fullPath : undefined
    return navigateTo({
      path: '/login',
      query: redirect ? { redirect } : undefined
    })
  }
})
