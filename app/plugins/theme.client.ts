export default defineNuxtPlugin(() => {
  const stored = localStorage.getItem('autoforge-theme')
  const theme = stored === 'light' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme)
})
