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
/* Das FPS-Overlay sitzt ganz oben links in der Ecke.
   Die rechte Gutter-Spalte gehört komplett dem EventLogOverlay. */
.fps-overlay {
  position: fixed;
  top: 0.5rem;
  left: 0.75rem;
  z-index: 9999;
  pointer-events: none;

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
  .fps-overlay {
    font-size: 1rem;
  }
}
</style>
