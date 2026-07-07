<template>
  <div
    class="auth-layout"
    style="display:flex;align-items:center;justify-content:center;min-height:100vh"
  >
    <div class="auth-layout__bg-grid" aria-hidden="true" />
    <div class="auth-layout__bg-glow auth-layout__bg-glow--1" aria-hidden="true" />
    <div class="auth-layout__bg-glow auth-layout__bg-glow--2" aria-hidden="true" />
    <div class="auth-layout__bg-glow auth-layout__bg-glow--3" aria-hidden="true" />
    <div class="auth-layout__theme">
      <HubThemeToggle />
    </div>
    <slot />
  </div>
</template>

<style scoped>
.auth-layout {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px 16px;
  background: var(--bg);
  overflow-y: auto;
}

.auth-layout__bg-grid {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(var(--border) 1px, transparent 1px),
    linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 64px 64px;
  opacity: 0.3;
  z-index: 0;
  animation: gridDrift 20s linear infinite;
}

.auth-layout__bg-glow {
  position: fixed;
  pointer-events: none;
  border-radius: 50%;
  z-index: 0;
  filter: blur(80px);
}

.auth-layout__bg-glow--1 {
  top: -100px;
  left: -80px;
  width: 400px;
  height: 400px;
  background: rgba(107, 76, 230, 0.12);
  animation: glowFloat 12s ease-in-out infinite alternate;
}

.auth-layout__bg-glow--2 {
  bottom: -120px;
  right: -60px;
  width: 350px;
  height: 350px;
  background: rgba(255, 140, 0, 0.08);
  animation: glowFloat 15s ease-in-out infinite alternate-reverse;
}

.auth-layout__bg-glow--3 {
  top: 40%;
  left: 50%;
  width: 300px;
  height: 300px;
  background: rgba(107, 76, 230, 0.06);
  animation: glowFloat 18s ease-in-out infinite alternate;
  transform: translate(-50%, -50%);
}

.auth-layout__theme {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 10;
}

@keyframes gridDrift {
  from { transform: translateY(0); }
  to { transform: translateY(-32px); }
}

@keyframes glowFloat {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(30px, -20px) scale(1.1); }
}
</style>
