<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const fps = ref(0)

let frameCount = 0
let lastTime = performance.now()
let rafId = 0

const loop = (now: number) => {
  frameCount++

  const elapsed = now - lastTime
  if (elapsed >= 500) {
    fps.value = Math.round((frameCount * 1000) / elapsed)
    frameCount = 0
    lastTime = now
  }

  rafId = window.requestAnimationFrame(loop)
}

onMounted(() => {
  rafId = window.requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(rafId)
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
