<template>
  <div
    ref="starsContainer"
    class="stars"
    id="stars"
    v-show="!prefersReducedMotion"
    aria-hidden="true"
  >
    <div :class="{ 'nebulas-paused': !windowFocused || nebulasPaused }">
      <div class="nebula nebula-1"></div>
      <div class="nebula nebula-2"></div>
      <div class="nebula nebula-3"></div>
      <div class="nebula nebula-4"></div>
      <div class="nebula nebula-5"></div>
      <div class="nebula nebula-6"></div>
    </div>

    <canvas
      ref="starCanvas"
      class="star-canvas"
      :class="{ 'star-canvas-hidden': !windowFocused }"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useStarBackground } from '../../composables/starBackground'
import { useWindowFocus } from '../../composables/useWindowFocus'

const { starsContainer, starCanvas, prefersReducedMotion } = useStarBackground()
const { windowFocused, onFocusChange } = useWindowFocus()

const NEBULA_IDLE_TIMEOUT = 30_000
const nebulasPaused = ref(false)
let idleTimer: ReturnType<typeof setTimeout> | null = null

function clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
}

function startIdleTimer() {
  clearIdleTimer()
  idleTimer = setTimeout(() => {
    nebulasPaused.value = true
  }, NEBULA_IDLE_TIMEOUT)
}

function resetIdleTimer() {
  if (!windowFocused.value) return
  nebulasPaused.value = false
  startIdleTimer()
}

let removeFocusListener: (() => void) | null = null

onMounted(() => {
  if (windowFocused.value) {
    startIdleTimer()
  }

  removeFocusListener = onFocusChange((focused) => {
    if (focused) {
      nebulasPaused.value = false
      startIdleTimer()
    } else {
      clearIdleTimer()
      nebulasPaused.value = true
    }
  })

  window.addEventListener('pointermove', resetIdleTimer, { passive: true })
  window.addEventListener('keydown', resetIdleTimer)
  window.addEventListener('pointerdown', resetIdleTimer, { passive: true })
})

onBeforeUnmount(() => {
  removeFocusListener?.()
  window.removeEventListener('pointermove', resetIdleTimer)
  window.removeEventListener('keydown', resetIdleTimer)
  window.removeEventListener('pointerdown', resetIdleTimer)
  clearIdleTimer()
})
</script>

<style>
.stars {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  pointer-events: none !important;
  z-index: 1 !important;
  overflow: hidden !important;
}

.star-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  opacity: 1;
  transition: opacity 300ms ease;
}

.star-canvas-hidden {
  opacity: 0 !important;
  transition: none !important;
}

.galaxy {
  position: absolute;
  pointer-events: none;
  z-index: 2;
  will-change: transform, opacity, filter;
  mix-blend-mode: screen;
  filter: blur(0.5px) brightness(1.1) saturate(1.3);
}

.emission-nebula {
  position: absolute;
  pointer-events: none;
  z-index: 2;
  will-change: transform, opacity;
  mix-blend-mode: screen;
  filter: blur(2px) brightness(1.2) saturate(1.5);
}

.ion-cloud {
  position: absolute;
  pointer-events: none;
  z-index: 2;
  will-change: transform, opacity;
  mix-blend-mode: screen;
  filter: blur(5px) brightness(1.1) saturate(1.3);
}

@keyframes galaxyEnter {
  0% {
    opacity: 0;
    scale: 0.75;
    filter: blur(3px) brightness(0.8);
  }
  100% {
    opacity: 0.82;
    scale: 1;
    filter: blur(0.4px) brightness(1.15) saturate(1.4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .galaxy {
    animation: none !important;
  }
}

.planet-orbit-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
.planet-orbit-back {
  z-index: 3;
}
.planet-orbit-front {
  z-index: 7;
}

/* ─── Nebula ──────────────────────────────────────────────────────────────── */

.nebula {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  mix-blend-mode: screen;
  will-change: transform;
}

.nebula-1 {
  width: 700px;
  height: 580px;
  top: -10%;
  left: 5%;
  background: radial-gradient(
    ellipse,
    var(--nebula-1-color, rgba(88, 28, 135, 0.18)) 0%,
    transparent 70%
  );
  animation: nebulaFloat1 90s ease-in-out infinite;
}
.nebula-2 {
  width: 800px;
  height: 620px;
  top: 40%;
  right: -5%;
  background: radial-gradient(
    ellipse,
    var(--nebula-2-color, rgba(6, 78, 130, 0.16)) 0%,
    transparent 70%
  );
  animation: nebulaFloat2 110s ease-in-out infinite;
}
.nebula-3 {
  width: 600px;
  height: 700px;
  bottom: -5%;
  left: 30%;
  background: radial-gradient(
    ellipse,
    var(--nebula-3-color, rgba(14, 116, 144, 0.15)) 0%,
    transparent 70%
  );
  animation: nebulaFloat3 80s ease-in-out infinite;
}
.nebula-4 {
  width: 550px;
  height: 520px;
  top: 20%;
  left: 45%;
  background: radial-gradient(
    ellipse,
    var(--nebula-4-color, rgba(131, 24, 67, 0.14)) 0%,
    transparent 70%
  );
  animation: nebulaFloat4 125s ease-in-out infinite;
}
.nebula-5 {
  width: 650px;
  height: 500px;
  top: -5%;
  right: 10%;
  background: radial-gradient(
    ellipse,
    var(--nebula-5-color, rgba(6, 130, 150, 0.15)) 0%,
    transparent 70%
  );
  animation: nebulaFloat5 105s ease-in-out infinite;
}
.nebula-6 {
  width: 550px;
  height: 480px;
  bottom: 5%;
  left: -5%;
  background: radial-gradient(
    ellipse,
    var(--nebula-6-color, rgba(180, 80, 20, 0.13)) 0%,
    transparent 70%
  );
  animation: nebulaFloat6 95s ease-in-out infinite;
}

@keyframes nebulaFloat1 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(4%, 6%) scale(1.08);
  }
  66% {
    transform: translate(-3%, 3%) scale(0.95);
  }
}
@keyframes nebulaFloat2 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  40% {
    transform: translate(-5%, -4%) scale(1.06);
  }
  70% {
    transform: translate(3%, -7%) scale(0.97);
  }
}
@keyframes nebulaFloat3 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(6%, -5%) scale(1.1);
  }
}
@keyframes nebulaFloat4 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  30% {
    transform: translate(-4%, 5%) scale(0.92);
  }
  60% {
    transform: translate(5%, 2%) scale(1.05);
  }
}
@keyframes nebulaFloat5 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  35% {
    transform: translate(-5%, 4%) scale(1.07);
  }
  70% {
    transform: translate(3%, -3%) scale(0.96);
  }
}
@keyframes nebulaFloat6 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  40% {
    transform: translate(6%, -5%) scale(1.09);
  }
  75% {
    transform: translate(-3%, 4%) scale(0.94);
  }
}

@media (prefers-reduced-motion: reduce) {
  .nebula,
  .emission-nebula,
  .ion-cloud {
    animation: none !important;
  }
}

.nebulas-paused .nebula,
.nebulas-paused .emission-nebula,
.nebulas-paused .ion-cloud {
  animation-play-state: paused !important;
}

/* ─── Planets ─────────────────────────────────────────────────────────────── */

.planet {
  position: absolute;
  pointer-events: none;
  z-index: 2;
  will-change: transform, opacity, filter;
}

.planet--rescue {
  pointer-events: none;
  cursor: default;
  z-index: 4;
  animation: planetDistress 2s ease-in-out infinite !important;
  filter: drop-shadow(0 0 8px rgba(255, 120, 0, 0.7)) drop-shadow(0 0 18px rgba(255, 60, 0, 0.4));
}

.planet--rescue--galaxy {
  animation: planetDistressGalaxy 1.6s ease-in-out infinite !important;
  filter: drop-shadow(0 0 10px rgba(180, 60, 255, 0.85))
    drop-shadow(0 0 24px rgba(140, 20, 220, 0.55)) !important;
}

@keyframes planetLifecycle {
  0% {
    opacity: 0;
    scale: 0.05;
  }
  10% {
    opacity: 0.9;
  }
  80% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    scale: 2;
  }
}

@keyframes planetDistress {
  0%,
  100% {
    filter: drop-shadow(0 0 8px rgba(255, 120, 0, 0.7)) drop-shadow(0 0 18px rgba(255, 60, 0, 0.4));
  }
  50% {
    filter: drop-shadow(0 0 14px rgba(255, 60, 0, 1)) drop-shadow(0 0 30px rgba(255, 80, 0, 0.6));
  }
}

@keyframes planetDistressGalaxy {
  0%,
  100% {
    filter: drop-shadow(0 0 10px rgba(180, 60, 255, 0.85))
      drop-shadow(0 0 24px rgba(140, 20, 220, 0.55));
  }
  50% {
    filter: drop-shadow(0 0 18px rgba(210, 80, 255, 1))
      drop-shadow(0 0 40px rgba(160, 40, 255, 0.75)) drop-shadow(0 0 60px rgba(100, 0, 200, 0.35));
  }
}

.stars--rescue-active {
  z-index: 100 !important;
  pointer-events: none !important;
}
.stars--rescue-active .planet--rescue {
  pointer-events: auto !important;
  cursor: pointer !important;
}

@media (prefers-reduced-motion: reduce) {
  .planet,
  .planet--rescue,
  .planet--rescue--galaxy {
    animation: none !important;
  }
}
</style>
