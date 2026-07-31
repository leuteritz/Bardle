<!-- frontend/src/components/idle/FpsOverlay.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { FPS_GOOD_THRESHOLD, FPS_POOR_THRESHOLD } from '@/config/constants'

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

/* Die Farbe ist die eigentliche Aussage: Bardle misst sich an der Framerate,
   also soll man einen Einbruch sehen, ohne die Zahl zu lesen. Grün = rund,
   Bernstein = spürbar, Rot = zäh. */
const state = computed(() => {
  if (fps.value >= FPS_GOOD_THRESHOLD) return 'good'
  if (fps.value >= FPS_POOR_THRESHOLD) return 'fair'
  return 'poor'
})

onMounted(() => {
  rafId = requestAnimationFrame(tick)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <span class="fps-overlay" :class="`fps-overlay--${state}`" aria-label="FPS Anzeige">
    {{ fps }} FPS
  </span>
</template>

<style scoped>
/* Größe, Laufweite und Grundlinie kommen von `.credit-row` in App.vue — der
   Zähler steht damit exakt so groß neben der Signatur wie diese selbst. */
.fps-overlay {
  font-size: inherit;
  white-space: nowrap;
  transition: color 0.4s ease;
}

.fps-overlay--good {
  color: #6ee06a;
  text-shadow:
    0 0 4px rgba(110, 224, 106, 0.55),
    0 0 12px rgba(60, 180, 80, 0.3);
}

.fps-overlay--fair {
  color: #e8c040;
  text-shadow:
    0 0 4px rgba(232, 192, 64, 0.55),
    0 0 12px rgba(200, 144, 64, 0.3);
}

.fps-overlay--poor {
  color: #ff7a62;
  text-shadow:
    0 0 4px rgba(255, 122, 98, 0.6),
    0 0 12px rgba(204, 96, 80, 0.35);
}
</style>
