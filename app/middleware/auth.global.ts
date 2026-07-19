import { getCookie } from 'h3'

const PUBLIC_ROUTES = ['/login']
const AUTH_HINT_COOKIE = 'autoforge-auth'

export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, hydrated, loadSession } = useAuth()
  const isPublic = PUBLIC_ROUTES.includes(to.path)

  // SSR can't read localStorage; use the auth-hint cookie for first paint redirects.
  if (import.meta.server) {
    const event = useRequestEvent()
    const hasSessionHint = event ? Boolean(getCookie(event, AUTH_HINT_COOKIE)) : false
    if (isPublic) {
      if (hasSessionHint) {
        return navigateTo('/workspace', { replace: true })
      }
      return
    }
    if (!hasSessionHint) {
      const redirect = to.fullPath !== '/' ? to.fullPath : undefined
      return navigateTo({
        path: '/login',
        query: redirect ? { redirect } : undefined
      }, { replace: true })
    }
    return
  }

  if (!hydrated.value) {
    loadSession()
  }

  if (isPublic && isAuthenticated.value) {
    // Soft navigateTo during hydration can leave the SSR login page stuck;
    // force a full navigation (same approach as guest → /login below).
    if (useNuxtApp().isHydrating) {
      return navigateTo('/workspace', { replace: true, external: true })
    }
    return navigateTo('/workspace', { replace: true })
  }

  if (!isPublic && !isAuthenticated.value) {
    const redirect = to.fullPath !== '/' ? to.fullPath : undefined
    const dest = {
      path: '/login',
      query: redirect ? { redirect } : undefined
    }
    // Avoid broken layout swap when hydrating from a non-auth SSR page.
    if (useNuxtApp().isHydrating) {
      return navigateTo(dest, { external: true })
    }
    return navigateTo(dest)
  }
})
