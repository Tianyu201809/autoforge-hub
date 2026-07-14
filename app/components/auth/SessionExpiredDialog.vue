<script setup lang="ts">
const { visible, returnToLogin } = useSessionExpiry()
</script>

<template>
  <Teleport to="body">
    <Transition name="session-expiry">
      <div v-if="visible" class="session-expiry__overlay">
        <section class="session-expiry__dialog" role="alertdialog" aria-modal="true" aria-labelledby="session-expiry-title" aria-describedby="session-expiry-description">
          <div class="session-expiry__icon" aria-hidden="true"><Icon name="lucide:shield-alert" size="23" /></div>
          <h2 id="session-expiry-title">登录已失效</h2>
          <p id="session-expiry-description">为保障账号安全，请重新登录后继续操作。</p>
          <button type="button" class="session-expiry__action" @click="returnToLogin">返回登录 <Icon name="lucide:arrow-right" size="16" /></button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.session-expiry__overlay { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 24px; background: rgba(4, 4, 8, 0.78); backdrop-filter: blur(5px); }
.session-expiry__dialog { width: min(100%, 390px); padding: 32px; border: 1px solid var(--border-strong, var(--border)); border-radius: var(--radius-lg); background: var(--bg-elevated); box-shadow: 0 28px 90px rgba(0, 0, 0, 0.55), var(--shadow-glow-purple); text-align: center; }
.session-expiry__icon { display: grid; width: 48px; height: 48px; margin: 0 auto 16px; place-items: center; border: 1px solid var(--danger-border); border-radius: 16px; background: var(--danger-soft); color: var(--danger); }
h2 { margin: 0; font-family: var(--font-display); font-size: var(--text-xl); color: var(--text); }
p { margin: 8px 0 24px; color: var(--text-muted); font-size: var(--text-sm); line-height: var(--leading-relaxed); }
.session-expiry__action { display: inline-flex; width: 100%; align-items: center; justify-content: center; gap: 8px; padding: 11px 16px; border: 1px solid var(--accent-border); border-radius: var(--radius-sm); background: var(--accent); color: var(--bg); font: inherit; font-size: var(--text-sm); font-weight: 700; cursor: pointer; transition: filter 0.15s ease, transform 0.15s ease; }
.session-expiry__action:hover { filter: brightness(1.08); transform: translateY(-1px); }
.session-expiry__action:focus-visible { outline: 2px solid var(--text); outline-offset: 3px; }
.session-expiry-enter-active, .session-expiry-leave-active { transition: opacity 0.18s ease; }
.session-expiry-enter-active .session-expiry__dialog, .session-expiry-leave-active .session-expiry__dialog { transition: transform 0.18s ease, opacity 0.18s ease; }
.session-expiry-enter-from, .session-expiry-leave-to { opacity: 0; }
.session-expiry-enter-from .session-expiry__dialog, .session-expiry-leave-to .session-expiry__dialog { opacity: 0; transform: translateY(12px) scale(0.98); }
@media (prefers-reduced-motion: reduce) { .session-expiry-enter-active, .session-expiry-leave-active, .session-expiry-enter-active .session-expiry__dialog, .session-expiry-leave-active .session-expiry__dialog { transition-duration: 0.01ms; } }
</style>
