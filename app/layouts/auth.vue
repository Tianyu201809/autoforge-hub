<template>
  <div class="auth-layout">
    <div class="auth-layout__download">
      <AfDownloadLink />
    </div>
    <div class="auth-layout__theme">
      <HubThemeToggle />
    </div>
    <slot />
  </div>
</template>

<style scoped>
.auth-layout {
  position: relative;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

.auth-layout__download {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 20;
}

.auth-layout__theme {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 20;
}

/* Desktop: download lives inside left hero CTA */
@media (min-width: 1024px) {
  .auth-layout__download {
    display: none;
  }
}
</style>
