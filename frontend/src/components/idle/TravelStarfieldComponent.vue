<template>
  <Teleport to="body">
    <canvas
      v-show="isAnimating"
      ref="canvasRef"
      class="travel-starfield-canvas"
      aria-hidden="true"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    active: boolean
    angleDeg: number
    duration?: number
  }>(),
  { duration: 2500 },
)

const emit = defineEmits<{ (e: 'travel-complete'): void }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isAnimating = ref(false)

// ── Reduced-motion check ──────────────────────────────────────────────────────
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ── Animation state ───────────────────────────────────────────────────────────
let rafId = 0
let startTime = 0

interface Star {
  angle: number   // radians, relative to vanishing point
  dist: number    // current distance from vanishing point
  speed: number   // base px/s
  prevDist: number
  biased: boolean // in the travel direction → faster
}

const STAR_COUNT = 280
let stars: Star[] = []

function speedMultiplier(t: number): number {
  if (t < 0.3) return (t / 0.3) * (t / 0.3)           // ease-in
  if (t < 0.7) return 1.0                               // peak
  const u = (t - 0.7) / 0.3
  return (1 - u) * (1 - u)                              // ease-out
}

function overlayAlpha(t: number): number {
  if (t < 0.15) return t / 0.15
  if (t < 0.85) return 1.0
  return 1 - (t - 0.85) / 0.15
}

function initStars(vpX: number, vpY: number, maxDist: number, angleRad: number): void {
  stars = []
  for (let i = 0; i < STAR_COUNT; i++) {
    // Bias: ~40% of stars are seeded in the travel-direction quadrant
    const biased = i < STAR_COUNT * 0.4
    const baseAngle = biased
      ? angleRad + (Math.random() - 0.5) * (Math.PI * 0.7)
      : Math.random() * Math.PI * 2

    const dist = Math.random() * maxDist * 0.6 + maxDist * 0.02
    const speed = 180 + Math.random() * 340
    stars.push({
      angle: baseAngle,
      dist,
      speed,
      prevDist: dist,
      biased,
    })
  }
}

function drawFrame(timestamp: number): void {
  const canvas = canvasRef.value
  if (!canvas) return

  const elapsed = timestamp - startTime
  const t = Math.min(elapsed / props.duration, 1)
  const dt = 1 / 60 // target dt; actual dt capped at 100ms below

  const W = canvas.width
  const H = canvas.height
  const angleRad = (props.angleDeg * Math.PI) / 180

  // Vanishing point slightly ahead in travel direction
  const VP_OFFSET = 55
  const vpX = W / 2 + VP_OFFSET * Math.cos(angleRad)
  const vpY = H / 2 + VP_OFFSET * Math.sin(angleRad)
  const maxDist = Math.sqrt(W * W + H * H) * 0.6

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const alpha = overlayAlpha(t)
  const spd = speedMultiplier(t)

  // Dark overlay (fades with animation)
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = `rgba(4, 3, 16, ${alpha * 0.82})`
  ctx.fillRect(0, 0, W, H)

  ctx.save()
  ctx.lineCap = 'round'

  for (const star of stars) {
    const starSpeedScale = star.biased ? 1.4 : 1.0
    const advance = star.speed * starSpeedScale * spd * dt * (props.duration / 1000) * 0.85

    star.prevDist = star.dist
    star.dist += advance

    if (star.dist > maxDist) {
      // Respawn near vanishing point
      star.dist = maxDist * 0.02 + Math.random() * maxDist * 0.06
      star.prevDist = star.dist
      star.angle = star.biased
        ? angleRad + (Math.random() - 0.5) * (Math.PI * 0.7)
        : Math.random() * Math.PI * 2
    }

    const sx = vpX + Math.cos(star.angle) * star.prevDist
    const sy = vpY + Math.sin(star.angle) * star.prevDist
    const ex = vpX + Math.cos(star.angle) * star.dist
    const ey = vpY + Math.sin(star.angle) * star.dist

    // Only draw if either end is on screen
    if (
      (sx < 0 && ex < 0) ||
      (sx > W && ex > W) ||
      (sy < 0 && ey < 0) ||
      (sy > H && ey > H)
    ) {
      continue
    }

    const streakLen = Math.hypot(ex - sx, ey - sy)
    const streakAlpha = Math.min(0.9, (streakLen / 40) * alpha)

    const grad = ctx.createLinearGradient(sx, sy, ex, ey)
    grad.addColorStop(0, `rgba(140, 185, 255, 0)`)
    grad.addColorStop(0.35, `rgba(190, 215, 255, ${streakAlpha * 0.55})`)
    grad.addColorStop(1, `rgba(240, 248, 255, ${streakAlpha})`)

    ctx.beginPath()
    ctx.strokeStyle = grad
    ctx.lineWidth = star.biased ? 1.1 : 0.75
    ctx.moveTo(sx, sy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
  }

  ctx.restore()

  if (t < 1) {
    rafId = requestAnimationFrame(drawFrame)
  } else {
    // Final clear
    ctx.clearRect(0, 0, W, H)
    isAnimating.value = false
    emit('travel-complete')
  }
}

function resizeCanvas(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

function startAnimation(): void {
  if (prefersReducedMotion) {
    emit('travel-complete')
    return
  }

  cancelAnimationFrame(rafId)
  isAnimating.value = true

  resizeCanvas()

  const angleRad = (props.angleDeg * Math.PI) / 180
  const W = window.innerWidth
  const H = window.innerHeight
  const VP_OFFSET = 55
  const vpX = W / 2 + VP_OFFSET * Math.cos(angleRad)
  const vpY = H / 2 + VP_OFFSET * Math.sin(angleRad)
  const maxDist = Math.sqrt(W * W + H * H) * 0.6

  initStars(vpX, vpY, maxDist, angleRad)
  startTime = performance.now()
  rafId = requestAnimationFrame(drawFrame)
}

watch(
  () => props.active,
  (active) => {
    if (active) startAnimation()
  },
)

onUnmounted(() => {
  cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.travel-starfield-canvas {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 15;
  width: 100%;
  height: 100%;
}
</style>
