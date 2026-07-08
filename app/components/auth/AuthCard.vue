<script setup lang="ts">
defineProps<{
  subtitle: string
}>()
</script>

<template>
  <div class="auth-card">
    <div class="auth-card__glow auth-card__glow--purple" aria-hidden="true" />
    <div class="auth-card__glow auth-card__glow--orange" aria-hidden="true" />

    <div class="auth-card__inner">
      <div class="auth-card__brand">
        <img src="/logo.png" alt="" class="auth-card__logo" width="48" height="48">
        <h1 class="auth-card__title">
          Autoforge <span class="auth-card__title-accent">Hub</span>
        </h1>
        <p class="auth-card__subtitle">{{ subtitle }}</p>
      </div>

      <slot />
    </div>
  </div>
</template>

<style scoped>
.auth-card {
  position: relative;
  width: min(420px, calc(100vw - 32px));
  margin: 0 auto;
  animation: slideDown 0.25s ease;
}

.auth-card__glow {
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
  z-index: 0;
}

.auth-card__glow--purple {
  top: -60px;
  left: -40px;
  width: 220px;
  height: 140px;
  background: var(--hero-glow-purple);
  opacity: 0.85;
}

.auth-card__glow--orange {
  top: -20px;
  right: -30px;
  width: 180px;
  height: 110px;
  background: var(--hero-glow-orange);
  opacity: 0.85;
}

.auth-card__inner {
  position: relative;
  z-index: 1;
  padding: 28px 24px 24px;
  border: 1px solid var(--secondary-border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md), var(--shadow-glow-purple), var(--shadow-glow-orange);
}

.auth-card__brand {
  text-align: center;
  margin-bottom: 24px;
}

.auth-card__logo {
  margin-bottom: 12px;
  border-radius: 50%;
  box-shadow: var(--logo-shadow);
}

.auth-card__title {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.auth-card__title-accent {
  color: var(--accent);
}

.auth-card__subtitle {
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  color: var(--text-secondary);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
