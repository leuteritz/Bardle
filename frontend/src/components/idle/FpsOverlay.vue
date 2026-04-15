<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

// rAF läuft mit voller Monitor-Rate (240Hz), aber count wird nur erhöht
// wenn mindestens 16.67ms seit dem letzten gezählten Frame vergangen sind.
// Messfenster 1000ms → stabile ~60 FPS ohne setTimeout-Jitter.
const TARGET_FPS = 60
const FRAME_INTERVAL = 1000 / TARGET_FPS

const fps = ref(0)
let count = 0
let lastTime = 0
let lastFrameTime = 0
let rafId = 0

const tick = (now: number) => {
  // Frame nur zählen wenn Ziel-Intervall erreicht
  if (lastFrameTime === 0 || now - lastFrameTime >= FRAME_INTERVAL) {
    count++
    lastFrameTime = now

    if (lastTime === 0) lastTime = now
    const elapsed = now - lastTime

    // 1-Sekunden-Fenster → sehr stabile Anzeige
    if (elapsed >= 1000) {
      fps.value = Math.round((count * 1000) / elapsed)
      count = 0
      lastTime = now
    }
  }

  rafId = requestAnimationFrame(tick)
}

onMounted(() => {
  rafId = requestAnimationFrame(tick)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <div class="fps-overlay" aria-label="FPS Anzeige">{{ fps }} FPS</div>
</template>

<style scoped>
.fps-overlay {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  pointer-events: none;

  background: transparent;
  border: none;
  box-shadow: none;

  font-family: 'Trebuchet MS', 'Arial Black', system-ui, sans-serif;
  font-size: clamp(1.4rem, 2vw, 2.4rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  color: #f8e7a6;
  text-shadow:
    0 0 4px rgba(255, 214, 102, 0.7),
    0 0 10px rgba(255, 184, 77, 0.45),
    0 0 18px rgba(255, 140, 0, 0.25);
}

@media (max-width: 640px) {
  .fps-overlay {
    top: 0.75rem;
    right: 0.75rem;
    font-size: 1.25rem;
  }
}
</style>
