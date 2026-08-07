<template>
  <canvas v-if="!prefersReducedMotion" ref="canvasEl" class="supernova-canvas" aria-hidden="true" />
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useActionToast } from '@/composables/ui/useActionToast'
import {
  SUPERNOVA_DURATION_MS,
  SUPERNOVA_FLASH_FRACTION,
  SUPERNOVA_RING_COUNT,
  SUPERNOVA_SHARD_COUNT,
  SUPERNOVA_COLLAPSE_START,
  SUPERNOVA_CORE_COLOR,
  SUPERNOVA_SHELL_COLOR,
  SUPERNOVA_EJECTA_COLOR,
} from '@/config/constants'

/**
 * The one moment the sun stops being a sun. Plays exactly once, when Requiem —
 * the red giant — evolves into Collapse: a blinding flash, shock rings and an
 * ejecta shell tearing outwards, then everything falling back in and snapping
 * shut on the new black hole.
 *
 * Driven by solarUpgradeStore.supernovaTrigger, a counter that is deliberately
 * NOT persisted — reloading a save that is already collapsed must not replay it.
 *
 * Sibling in spirit to StarSystemRescueTransition: one canvas, one rAF loop that
 * exists only while the animation runs, nothing left behind afterwards.
 */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const solarStore = useSolarUpgradeStore()
const { showToast } = useActionToast()
const canvasEl = ref<HTMLCanvasElement | null>(null)

interface Shard {
  /** Direction of flight, radians. */
  angle: number
  /** Share of the maximum radius this shard reaches (0…1). */
  reach: number
  /** Trail length as a share of the shard's own distance. */
  tail: number
  /** Sideways drift over the whole flight, radians — the shell is not a circle. */
  drift: number
  /** Line thickness in px. */
  weight: number
}

let shards: Shard[] = []
let raf: number | null = null
let startedAt = 0

function buildShards(): Shard[] {
  return Array.from({ length: SUPERNOVA_SHARD_COUNT }, (_, i) => ({
    // Golden-angle base keeps the shell evenly covered, the jitter keeps it from
    // looking like a spoke wheel.
    angle: i * 2.399963 + Math.random() * 0.5,
    // Deliberately short of the screen edge: a shell that flies out of the
    // viewport leaves the second half of the transition empty, and the whole
    // point of the second half is watching it get dragged back in.
    reach: 0.3 + Math.random() * 0.42,
    tail: 0.16 + Math.random() * 0.24,
    drift: (Math.random() - 0.5) * 0.5,
    weight: 1 + Math.random() * 2.4,
  }))
}

const easeOut = (v: number) => 1 - Math.pow(1 - v, 3)
const easeIn = (v: number) => v * v * v

function draw(timestamp: number) {
  const canvas = canvasEl.value
  if (!canvas) {
    raf = null
    return
  }

  const w = window.innerWidth
  const h = window.innerHeight
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    raf = null
    return
  }

  const t = Math.min((timestamp - startedAt) / SUPERNOVA_DURATION_MS, 1)
  ctx.clearRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2
  const maxR = Math.hypot(cx, cy)
  // The whole overlay dissolves over the last stretch so the black hole that is
  // already rendered underneath takes over without a cut.
  const fade = t > 0.88 ? 1 - (t - 0.88) / 0.12 : 1

  ctx.save()
  ctx.globalAlpha = fade

  // ── 1. Flash — the shock breaking out of the star's surface ────────────────
  if (t < SUPERNOVA_FLASH_FRACTION) {
    const ft = t / SUPERNOVA_FLASH_FRACTION
    const alpha = (ft < 0.25 ? ft / 0.25 : 1 - (ft - 0.25) / 0.75) * 0.92
    const flash = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
    flash.addColorStop(0, `rgba(255,255,255,${alpha.toFixed(3)})`)
    flash.addColorStop(0.35, `rgba(230,245,255,${(alpha * 0.7).toFixed(3)})`)
    flash.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = flash
    ctx.fillRect(0, 0, w, h)
  }

  // ── 2. Shock rings ─────────────────────────────────────────────────────────
  for (let i = 0; i < SUPERNOVA_RING_COUNT; i++) {
    const rt = (t - i * 0.07) / 0.58
    if (rt <= 0 || rt >= 1) continue
    const radius = maxR * easeOut(rt) * 1.05
    const alpha = Math.pow(1 - rt, 1.6) * 0.5
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.strokeStyle = hexAlpha(i === 0 ? SUPERNOVA_CORE_COLOR : SUPERNOVA_SHELL_COLOR, alpha)
    ctx.lineWidth = 1 + 11 * (1 - rt)
    ctx.stroke()
  }

  // ── 3. Ejecta — out, then dragged back in ──────────────────────────────────
  const outward = Math.min(t, SUPERNOVA_COLLAPSE_START) / SUPERNOVA_COLLAPSE_START
  const collapse =
    t <= SUPERNOVA_COLLAPSE_START
      ? 0
      : (t - SUPERNOVA_COLLAPSE_START) / (1 - SUPERNOVA_COLLAPSE_START)
  // Falling matter picks up angular momentum — the shell visibly winds up as it
  // is pulled back, which is what sells "a black hole formed" over "it faded".
  const swirl = easeIn(collapse) * 1.9

  for (const s of shards) {
    const peak = maxR * s.reach
    const dist = peak * easeOut(outward) * (1 - easeIn(collapse))
    if (dist <= 2) continue
    const angle = s.angle + s.drift * outward + swirl
    const inner = dist * (1 - s.tail)

    const grad = ctx.createLinearGradient(
      cx + Math.cos(angle) * inner,
      cy + Math.sin(angle) * inner,
      cx + Math.cos(angle) * dist,
      cy + Math.sin(angle) * dist,
    )
    // Matter falling back in heats up rather than fading — the shell dims as it
    // expands, then brightens again on the way down.
    const headAlpha = Math.min(1, (1 - outward * 0.4) * (1 + collapse * 0.8))
    grad.addColorStop(0, hexAlpha(SUPERNOVA_EJECTA_COLOR, 0))
    grad.addColorStop(0.55, hexAlpha(SUPERNOVA_EJECTA_COLOR, headAlpha * 0.55))
    grad.addColorStop(1, hexAlpha(SUPERNOVA_CORE_COLOR, headAlpha))

    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
    ctx.lineTo(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist)
    ctx.strokeStyle = grad
    ctx.lineWidth = s.weight
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  // ── 4. The hole closing ────────────────────────────────────────────────────
  if (collapse > 0) {
    // Contracting ring — the shell's leading edge closing on the new horizon.
    // Without it the implosion has no silhouette of its own, because the black
    // hole underneath is already black.
    const ringR = maxR * 0.34 * (1 - easeIn(collapse)) + maxR * 0.05
    ctx.beginPath()
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
    ctx.strokeStyle = hexAlpha(SUPERNOVA_SHELL_COLOR, 0.5 * Math.sin(collapse * Math.PI))
    ctx.lineWidth = 2 + 8 * collapse
    ctx.stroke()

    const coreR = maxR * 0.16 * easeOut(collapse)
    // Accretion glow gathering at the centre …
    const halo = ctx.createRadialGradient(cx, cy, coreR * 0.4, cx, cy, coreR * 2.4)
    halo.addColorStop(0, hexAlpha(SUPERNOVA_CORE_COLOR, 0.55 * collapse))
    halo.addColorStop(0.4, hexAlpha(SUPERNOVA_EJECTA_COLOR, 0.35 * collapse))
    halo.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.beginPath()
    ctx.arc(cx, cy, coreR * 2.4, 0, Math.PI * 2)
    ctx.fillStyle = halo
    ctx.fill()

    // … and the horizon itself, opening as a true void inside that glow.
    ctx.beginPath()
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, collapse * 1.6).toFixed(3)})`
    ctx.fill()

    ctx.beginPath()
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
    ctx.strokeStyle = hexAlpha(SUPERNOVA_CORE_COLOR, 0.85 * collapse)
    ctx.lineWidth = 2 + 3 * collapse
    ctx.stroke()
  }

  ctx.restore()

  if (t >= 1) {
    ctx.clearRect(0, 0, w, h)
    raf = null
    return
  }
  raf = requestAnimationFrame(draw)
}

/** #rrggbb + alpha → rgba(). The palette constants are plain hex. */
function hexAlpha(hex: string, alpha: number): string {
  const v = parseInt(hex.slice(1), 16)
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a.toFixed(3)})`
}

watch(
  () => solarStore.supernovaTrigger,
  (value) => {
    if (!value) return
    showToast('The star has collapsed — a black hole remains', 'event')
    if (prefersReducedMotion) return
    shards = buildShards()
    startedAt = performance.now()
    if (raf === null) raf = requestAnimationFrame(draw)
  },
)

onBeforeUnmount(() => {
  if (raf !== null) cancelAnimationFrame(raf)
  raf = null
})
</script>

<style scoped>
.supernova-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  /* Above the Bard tab (z 125) and the Herald (9500) — the evolve button that
     triggers this lives inside the Star Forge panel, so the explosion has to
     cover it. Still below the pause and offline overlays. */
  z-index: 9600;
}
</style>
