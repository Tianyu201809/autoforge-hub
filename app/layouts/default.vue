<template>
  <div class="layout">
    <!-- Nebula effect (dark) -->
    <div class="bg-nebula" aria-hidden="true">
      <div class="bg-nebula__orb bg-nebula__orb--1" />
      <div class="bg-nebula__orb bg-nebula__orb--2" />
      <div class="bg-nebula__orb bg-nebula__orb--3" />
      <div class="bg-nebula__orb bg-nebula__orb--4" />
      <div class="bg-nebula__stars" />
    </div>

    <!-- Leaves effect (light) -->
    <div class="bg-leaves" aria-hidden="true">
      <span class="bg-leaf" v-for="i in 15" :key="i" :style="getLeafStyle(i)" />
    </div>

    <div class="layout__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
function hash(n: number): number {
  // Simple deterministic hash from index
  return ((n * 9301 + 49297) % 233280) / 233280
}

function getLeafStyle(i: number) {
  const h = (x: number) => hash(i * 7 + x * 13)
  return {
    '--x': `${h(1) * 100}%`,
    '--delay': `${h(2) * 10}s`,
    '--duration': `${8 + h(3) * 12}s`,
    '--size': `${10 + h(4) * 14}px`,
    '--drift': `${(h(5) - 0.5) * 120}px`,
    '--opacity': `${0.15 + h(6) * 0.25}`,
    '--rotation': `${h(7) * 360}deg`,
  }
}
</script>

<style scoped>
.layout {
  position: relative;
  min-height: 100vh;
  background: var(--bg);
  overflow-x: hidden;
}

.layout__content {
  position: relative;
  z-index: 1;
}

/* ═══════════════════════════════════════
   NEBULA — dark mode only
   ═══════════════════════════════════════ */
.bg-nebula {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  opacity: var(--bg-nebula-opacity, 0);
  transition: opacity 0.8s ease;
}

.bg-nebula__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  will-change: transform, opacity;
  animation: nebulaPulse var(--dur, 12s) ease-in-out infinite alternate;
}

.bg-nebula__orb--1 {
  --dur: 14s;
  width: 600px;
  height: 600px;
  top: -10%;
  left: -8%;
  background: radial-gradient(circle, rgba(107, 76, 230, 0.25) 0%, transparent 70%);
  animation-name: nebulaDrift1;
}

.bg-nebula__orb--2 {
  --dur: 18s;
  width: 500px;
  height: 500px;
  top: 40%;
  right: -6%;
  background: radial-gradient(circle, rgba(255, 140, 0, 0.15) 0%, transparent 70%);
  animation-name: nebulaDrift2;
}

.bg-nebula__orb--3 {
  --dur: 16s;
  width: 450px;
  height: 450px;
  bottom: -8%;
  left: 30%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%);
  animation-name: nebulaDrift3;
}

.bg-nebula__orb--4 {
  --dur: 20s;
  width: 350px;
  height: 350px;
  top: 15%;
  left: 55%;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.10) 0%, transparent 70%);
  animation-name: nebulaDrift4;
}

/* Stars — subtle dot field using box-shadow */
.bg-nebula__stars {
  position: absolute;
  inset: 0;
}

.bg-nebula__stars::after {
  content: '';
  position: absolute;
  inset: 0;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: transparent;
  box-shadow:
    120px 80px 0 0 rgba(255, 255, 255, 0.3),
    340px 200px 0 0 rgba(255, 255, 255, 0.2),
    560px 140px 0 0 rgba(255, 255, 255, 0.25),
    780px 320px 0 0 rgba(255, 255, 255, 0.15),
    200px 450px 0 0 rgba(255, 255, 255, 0.2),
    480px 600px 0 0 rgba(255, 255, 255, 0.15),
    700px 520px 0 0 rgba(255, 255, 255, 0.25),
    920px 180px 0 0 rgba(255, 255, 255, 0.2),
    150px 700px 0 0 rgba(255, 255, 255, 0.18),
    420px 850px 0 0 rgba(255, 255, 255, 0.12),
    650px 750px 0 0 rgba(255, 255, 255, 0.22),
    880px 900px 0 0 rgba(255, 255, 255, 0.15),
    300px 1000px 0 0 rgba(255, 255, 255, 0.2),
    550px 1100px 0 0 rgba(255, 255, 255, 0.12),
    800px 1050px 0 0 rgba(255, 255, 255, 0.18),
    100px 1200px 0 0 rgba(255, 255, 255, 0.15),
    720px 1300px 0 0 rgba(255, 255, 255, 0.1),
    450px 1400px 0 0 rgba(255, 255, 255, 0.2),
    960px 1250px 0 0 rgba(255, 255, 255, 0.18),
    600px 1500px 0 0 rgba(255, 255, 255, 0.12);
  animation: starTwinkle 4s ease-in-out infinite alternate;
}

/* ═══════════════════════════════════════
   LEAVES — light mode only
   ═══════════════════════════════════════ */
.bg-leaves {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  opacity: var(--bg-leaves-opacity, 0);
  transition: opacity 0.8s ease;
}

.bg-leaf {
  position: absolute;
  bottom: -30px;
  left: var(--x, 50%);
  width: var(--size, 16px);
  height: calc(var(--size, 16px) * 1.4);
  border-radius: 0 80% 80% 80%;
  background: linear-gradient(135deg, rgba(34, 197, 94, var(--opacity, 0.2)), rgba(22, 163, 74, var(--opacity, 0.15)));
  transform: rotate(var(--rotation, 0deg));
  animation: leafFloat var(--duration, 12s) var(--delay, 0s) linear infinite;
  opacity: 0;
}

/* ═══════════════════════════════════════
   KEYFRAMES
   ═══════════════════════════════════════ */
@keyframes nebulaDrift1 {
  0% { transform: translate(0, 0) scale(1); opacity: 0.6; }
  100% { transform: translate(60px, 40px) scale(1.1); opacity: 0.9; }
}

@keyframes nebulaDrift2 {
  0% { transform: translate(0, 0) scale(1); opacity: 0.5; }
  100% { transform: translate(-40px, -30px) scale(1.15); opacity: 0.8; }
}

@keyframes nebulaDrift3 {
  0% { transform: translate(0, 0) scale(1); opacity: 0.4; }
  100% { transform: translate(30px, -50px) scale(1.2); opacity: 0.7; }
}

@keyframes nebulaDrift4 {
  0% { transform: translate(0, 0) scale(1); opacity: 0.3; }
  100% { transform: translate(-50px, 20px) scale(1.1); opacity: 0.6; }
}

@keyframes nebulaPulse {
  0% { filter: blur(80px); }
  100% { filter: blur(100px); }
}

@keyframes starTwinkle {
  0% { opacity: 0.3; }
  100% { opacity: 0.8; }
}

@keyframes leafFloat {
  0% {
    transform: translateY(0) translateX(0) rotate(var(--rotation, 0deg));
    opacity: 0;
  }
  5% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(calc(-100vh - 50px)) translateX(var(--drift, 0px)) rotate(calc(var(--rotation, 0deg) + 720deg));
    opacity: 0;
  }
}
</style>
