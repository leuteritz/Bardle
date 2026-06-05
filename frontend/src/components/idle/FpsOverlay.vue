<!-- frontend/src/components/idle/FpsOverlay.vue -->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const fps = ref(0)
let count = 0
let lastTime = 0
let rafId = 0

const tick = (now: number) => {
  count++
  if (lastTime === 0) lastTime = now
  const elapsed = now - lastTime
  if (elapsed >= 1000) {
    fps.value = Math.round((count * 1000) / elapsed)
    count = 0
    lastTime = now
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
/*
  Das FPS-Overlay sitzt neben dem rechten Rand des Headers (max 1400px, zentriert).
  Positionierung: Viewport-Mitte + halbe Header-Breite + kleiner Abstand.
  So wandert es mit dem Header-Rand mit, egal wie breit der Screen ist.
*/
.fps-overlay {
  position: fixed;
  top: 0.5rem;
  /* rechts neben Header: gleiche Formel wie EventLogOverlay, aber weiter oben */
  left: calc(50% + min(700px, 50vw - 0.5rem) + 8px);
  z-index: 9999;
  pointer-events: none;

  /* Inline rechts ausrichten, damit es am Header-Rand klebt */
  transform: translateX(0);

  background: transparent;
  border: none;
  box-shadow: none;

  font-size: clamp(0.72rem, 0.9vw, 1rem);
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

@media (max-width: 1200px) {
  /* Auf kleinen Screens zurück nach ganz rechts */
  .fps-overlay {
    left: auto;
    right: 0.75rem;
    top: 0.75rem;
    font-size: 1rem;
  }
}
</style>
