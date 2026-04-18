<template>
  <canvas
    v-if="!prefersReducedMotion"
    ref="burstCanvas"
    class="burst-canvas"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useGalaxyStore } from '../../../stores/galaxyStore'

const BURST_DURATION_MS = 400
const BURST_RAY_COUNT = 18
const BURST_MAX_ALPHA = 0.65
const BURST_RAY_MIN_LEN = 0.18
const BURST_RAY_MAX_LEN = 0.42

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const galaxyStore = useGalaxyStore()
const burstCanvas = ref<HTMLCanvasElement | null>(null)

let burstRaf: number | null = null
let burstStart = 0
let burstAngleOffset = 0

function drawBurst(timestamp: number) {
  const canvas = burstCanvas.value
  if (!canvas) return

  const w = window.innerWidth
  const h = window.innerHeight
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const elapsed = timestamp - burstStart
  const t = Math.min(elapsed / BURST_DURATION_MS, 1)
  // fade-in then fade-out
  const alpha = t < 0.3
    ? (t / 0.3) * BURST_MAX_ALPHA
    : BURST_MAX_ALPHA * (1 - (t - 0.3) / 0.7)

  ctx.clearRect(0, 0, w, h)

  if (alpha <= 0) {
    burstRaf = null
    return
  }

  const cx = w / 2
  const cy = h / 2
  const maxLen = Math.hypot(cx, cy)

  for (let i = 0; i < BURST_RAY_COUNT; i++) {
    const angle = (i / BURST_RAY_COUNT) * Math.PI * 2 + burstAngleOffset
    const lenFrac = BURST_RAY_MIN_LEN + (i % 3) * ((BURST_RAY_MAX_LEN - BURST_RAY_MIN_LEN) / 2)
    const len = maxLen * lenFrac * (0.7 + t * 0.5)
    const ex = cx + Math.cos(angle) * len
    const ey = cy + Math.sin(angle) * len

    const grad = ctx.createLinearGradient(cx, cy, ex, ey)
    grad.addColorStop(0, `rgba(255, 220, 100, ${alpha})`)
    grad.addColorStop(0.5, `rgba(255, 255, 200, ${alpha * 0.6})`)
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)')

    ctx.beginPath()
    ctx.strokeStyle = grad
    ctx.lineWidth = 1.5 + (1 - t) * 2
    ctx.lineCap = 'round'
    ctx.moveTo(cx, cy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
  }

  // Center glow
  const glowR = 40 + t * 60
  const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
  glowGrad.addColorStop(0, `rgba(255, 230, 120, ${alpha * 0.9})`)
  glowGrad.addColorStop(0.4, `rgba(255, 200, 80, ${alpha * 0.3})`)
  glowGrad.addColorStop(1, 'rgba(255, 180, 40, 0)')
  ctx.beginPath()
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2)
  ctx.fillStyle = glowGrad
  ctx.fill()

  if (t < 1) {
    burstRaf = requestAnimationFrame(drawBurst)
  } else {
    const canvas = burstCanvas.value
    const ctx2 = canvas?.getContext('2d')
    if (ctx2 && canvas) ctx2.clearRect(0, 0, canvas.width, canvas.height)
    burstRaf = null
  }
}

function startBurst() {
  if (prefersReducedMotion) return
  if (burstRaf !== null) {
    cancelAnimationFrame(burstRaf)
    burstRaf = null
  }
  burstAngleOffset = (galaxyStore.rescueBurstAngleDeg * Math.PI) / 180
  burstStart = performance.now()
  burstRaf = requestAnimationFrame(drawBurst)
}

watch(
  () => galaxyStore.isRescueRotating,
  (active) => {
    if (active) startBurst()
  },
)

onBeforeUnmount(() => {
  if (burstRaf !== null) {
    cancelAnimationFrame(burstRaf)
    burstRaf = null
  }
})
</script>

<style scoped>
.burst-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 50;
}
</style>
