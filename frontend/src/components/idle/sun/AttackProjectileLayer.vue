<!-- frontend/src/components/idle/sun/AttackProjectileLayer.vue -->
<template>
  <Teleport to="body">
    <canvas ref="canvasEl" class="projectile-layer" aria-hidden="true" />
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { ProjectileShot } from '@/composables/useProjectileSystem'

// Canvas statt SVG: Die frühere SVG-Variante renderte pro Schuss 7+ Elemente
// mit mehrstufigen feGaussianBlur-Filtern, die jeden Frame neu gerastert
// wurden. Der additive Glow ('lighter') mit Gradients erzielt denselben
// Neon-Look zu einem Bruchteil der Kosten und skaliert auf viele Schüsse.
const props = defineProps<{ shots: ProjectileShot[] }>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let hadShots = false

const rgbCache = new Map<string, [number, number, number]>()
function rgba(hex: string, alpha: number): string {
  let c = rgbCache.get(hex)
  if (!c) {
    c = [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ]
    rgbCache.set(hex, c)
  }
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`
}

function resize() {
  const cv = canvasEl.value
  if (!cv || !ctx) return
  const dpr = window.devicePixelRatio || 1
  cv.width = window.innerWidth * dpr
  cv.height = window.innerHeight * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function drawShot(c: CanvasRenderingContext2D, shot: ProjectileShot) {
  const trail = shot.trailColor ?? '#cc4444'
  const head = shot.headColor ?? '#ff7777'
  const o = shot.opacity

  // Äußerer Halo-Schweif (breite, weiche Aureole)
  c.strokeStyle = rgba(trail, 0.16 * o)
  c.lineWidth = 11
  c.beginPath()
  c.moveTo(shot.tailX, shot.tailY)
  c.lineTo(shot.headX, shot.headY)
  c.stroke()

  // Mittlerer Schweif mit Farbverlauf
  const grad = c.createLinearGradient(shot.tailX, shot.tailY, shot.headX, shot.headY)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.4, rgba(trail, 0.15 * o))
  grad.addColorStop(1, rgba(trail, 0.85 * o))
  c.strokeStyle = grad
  c.lineWidth = 5
  c.beginPath()
  c.moveTo(shot.tailX, shot.tailY)
  c.lineTo(shot.headX, shot.headY)
  c.stroke()

  // Innerer heller Schweif-Kern
  c.strokeStyle = `rgba(255,255,255,${0.5 * o})`
  c.lineWidth = 1.5
  c.beginPath()
  c.moveTo(shot.tailX, shot.tailY)
  c.lineTo(shot.headX, shot.headY)
  c.stroke()

  // Glühender Kopf: ein Radial-Gradient ersetzt Halo, Glühschichten und Kern
  const rg = c.createRadialGradient(shot.headX, shot.headY, 0, shot.headX, shot.headY, 16)
  rg.addColorStop(0, `rgba(255,255,255,${0.9 * o})`)
  rg.addColorStop(0.2, rgba(head, 0.9 * o))
  rg.addColorStop(0.55, rgba(head, 0.35 * o))
  rg.addColorStop(1, rgba(head, 0))
  c.fillStyle = rg
  c.beginPath()
  c.arc(shot.headX, shot.headY, 16, 0, Math.PI * 2)
  c.fill()

  // Kreuz-Glanzlichter an der Spitze
  c.strokeStyle = `rgba(255,255,255,${0.6 * o})`
  c.lineWidth = 1
  c.beginPath()
  c.moveTo(shot.headX - 7, shot.headY)
  c.lineTo(shot.headX + 7, shot.headY)
  c.moveTo(shot.headX, shot.headY - 7)
  c.lineTo(shot.headX, shot.headY + 7)
  c.stroke()
}

function draw() {
  raf = requestAnimationFrame(draw)
  if (!ctx || !canvasEl.value) return
  const shots = props.shots
  if (shots.length === 0 && !hadShots) return
  hadShots = shots.length > 0

  // Leeren Canvas ausblenden, damit der Compositor ihn überspringt
  canvasEl.value.style.display = shots.length > 0 ? '' : 'none'

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  for (const shot of shots) drawShot(ctx, shot)
  ctx.globalCompositeOperation = 'source-over'
}

onMounted(() => {
  ctx = canvasEl.value?.getContext('2d') ?? null
  resize()
  window.addEventListener('resize', resize)
  raf = requestAnimationFrame(draw)
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  cancelAnimationFrame(raf)
})
</script>

<style scoped>
.projectile-layer {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 55;
}
</style>
