<script setup lang="ts">
import pkg from '../../package.json'

console.log('app version', 'v' + pkg.version)

definePageMeta({
  layout: 'default'
})

useHead({
  title: 'Autoforge Hub'
})

const { isAuthenticated, hydrated } = useAuth()

watchEffect(() => {
  if (hydrated.value) {
    navigateTo('/workspace', { replace: true })
  }
})
</script>

<template>
  <div class="redirect-page" />
</template>

<style scoped>
.redirect-page {
  min-height: 100vh;
  background: var(--bg);
}
</style>
