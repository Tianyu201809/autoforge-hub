<script setup lang="ts">
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
