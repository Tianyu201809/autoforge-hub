export default defineNuxtPlugin(async () => {
  const { loadSession } = useAuth()
  loadSession()
})
