export default defineNuxtPlugin(async () => {
  const { loadSession } = useAuth()
  const { loadScripts } = useScripts()
  const { loadTeams } = useTeams()

  loadSession()

  if (import.meta.client) {
    const { seedMockData } = await import('~/data/mock-data')
    seedMockData()
    loadScripts()
    loadTeams()
  }
})
