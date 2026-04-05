<template>
  <div v-if="isAnimating" class="absolute inset-0 z-30 universe-overlay" ref="containerRef">
    <canvas ref="universeCanvas" class="universe-canvas" />
    <Transition name="planet-found-fade">
      <div v-if="showPlanetFound" class="planet-found-overlay">
        <span class="planet-found-icon">🪐</span>
        <span class="planet-found-text">PLANET GEFUNDEN!</span>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onUnmounted, nextTick } from 'vue'

// ─── Constants ────────────────────────────────────────────────────────────────

const ANIM_DURATION = 5000
const SLOW_AT = 3500
const PLANET_TEXT_MS = 3600
const STAR_COUNT = 300

const PLANET_PALETTES: Array<[string, string]> = [
  ['#3060c8', '#2255ff'],
  ['#c85020', '#ff5500'],
  ['#c02828', '#ff2020'],
  ['#28a050', '#20d060'],
  ['#8030b8', '#8000ff'],
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface Star {
  x: number
  y: number
  z: number
  pz: number
}

interface PlanetDef {
  startDelay: number
  ix: number
  iy: number
  vx: number
  vy: number
  size: number
  color: string
  glow: string
  rot: number
  rotSpeed: number
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function lighten(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt)},${Math.min(255, b + amt)})`
}

function darken(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgb(${Math.max(0, r - amt)},${Math.max(0, g - amt)},${Math.max(0, b - amt)})`
}

// ─── Scene builders ───────────────────────────────────────────────────────────

function buildStars(W: number, H: number): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: (Math.random() - 0.5) * W * 2,
    y: (Math.random() - 0.5) * H * 2,
    z: Math.random() * W,
    pz: W,
  }))
}

function buildPlanets(W: number, H: number): PlanetDef[] {
  const count = 2 + Math.floor(Math.random() * 2)
  return Array.from({ length: count }, (_, i) => {
    const [color, glow] = PLANET_PALETTES[Math.floor(Math.random() * PLANET_PALETTES.length)]
    const goRight = Math.random() < 0.5
    const size = 32 + Math.random() * 56
    return {
      startDelay: 200 + i * 700 + Math.random() * 300,
      ix: goRight ? -size * 3 : W + size * 3,
      iy: H * (0.18 + Math.random() * 0.64),
      vx: goRight ? 0.055 + Math.random() * 0.045 : -(0.055 + Math.random() * 0.045),
      vy: (Math.random() - 0.5) * 0.025,
      size,
      color,
      glow,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.028,
    }
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default defineComponent({
  name: 'PlanetSearchComponent',

  props: {
    variant: {
      type: Number,
      default: 0, // 0–4, passend zu planetVariant in BattleResultComponent
    },
  },

  setup(props, { expose }) {
    const isAnimating = ref(false)
    const showPlanetFound = ref(false)
    const universeCanvas = ref<HTMLCanvasElement | null>(null)
    const containerRef = ref<HTMLElement | null>(null)

    let rafId: number | null = null
    let planetFoundTimer: ReturnType<typeof setTimeout> | null = null

    // ── Canvas render loop ────────────────────────────────────────────────────

    function runCanvasAnimation(canvas: HTMLCanvasElement, variant: number): Promise<void> {
      return new Promise<void>((resolve) => {
        const ctx = canvas.getContext('2d')!
        const W = canvas.width
        const H = canvas.height
        const CX = W / 2
        const CY = H / 2
        const MAXZ = W

        const stars = buildStars(W, H)
        const planets = buildPlanets(W, H)
        const t0 = performance.now()

        function frame(now: number) {
          const elapsed = now - t0
          if (elapsed >= ANIM_DURATION) {
            ctx.clearRect(0, 0, W, H)
            resolve()
            return
          }

          const warp =
            elapsed < SLOW_AT ? 1.0 : 1.0 - ((elapsed - SLOW_AT) / (ANIM_DURATION - SLOW_AT)) * 0.95
          const speed = warp * 20 + 0.4

          ctx.fillStyle = '#0a0a0f'
          ctx.fillRect(0, 0, W, H)

          // Stars
          for (const s of stars) {
            s.pz = s.z
            s.z -= speed
            if (s.z <= 0) {
              s.x = (Math.random() - 0.5) * W * 2
              s.y = (Math.random() - 0.5) * H * 2
              s.z = MAXZ
              s.pz = MAXZ
              continue
            }
            const sx = (s.x / s.z) * W + CX
            const sy = (s.y / s.z) * H + CY
            const px = (s.x / s.pz) * W + CX
            const py = (s.y / s.pz) * H + CY
            if (sx < 0 || sx > W || sy < 0 || sy > H) continue
            const bright = 1 - s.z / MAXZ
            const alpha = 0.12 + bright * 0.88
            const rv = Math.floor(185 + bright * 70)
            const gv = Math.floor(205 + bright * 50)
            if (warp > 0.22) {
              ctx.strokeStyle = `rgba(${rv},${gv},255,${alpha})`
              ctx.lineWidth = Math.max(0.4, bright * 2.2)
              ctx.beginPath()
              ctx.moveTo(px, py)
              ctx.lineTo(sx, sy)
              ctx.stroke()
            } else {
              ctx.fillStyle = `rgba(${rv},${gv},255,${alpha})`
              ctx.beginPath()
              ctx.arc(sx, sy, Math.max(0.5, bright * 1.8), 0, Math.PI * 2)
              ctx.fill()
            }
          }

          // Planets
          for (const p of planets) {
            if (elapsed < p.startDelay) continue
            const pe = elapsed - p.startDelay
            const px = p.ix + p.vx * pe * warp
            const py = p.iy + p.vy * pe * warp
            p.rot += p.rotSpeed
            if (px < -p.size * 3 || px > W + p.size * 3) continue

            const [gr, gg, gb] = hexToRgb(p.glow)

            // Outer glow halo
            const og = ctx.createRadialGradient(px, py, p.size * 0.6, px, py, p.size * 2.6)
            og.addColorStop(0, `rgba(${gr},${gg},${gb},0.35)`)
            og.addColorStop(1, `rgba(${gr},${gg},${gb},0)`)
            ctx.fillStyle = og
            ctx.beginPath()
            ctx.arc(px, py, p.size * 2.6, 0, Math.PI * 2)
            ctx.fill()

            // Planet body
            const bg = ctx.createRadialGradient(
              px - p.size * 0.32,
              py - p.size * 0.38,
              0,
              px,
              py,
              p.size,
            )
            bg.addColorStop(0, lighten(p.color, 55))
            bg.addColorStop(0.5, p.color)
            bg.addColorStop(1, darken(p.color, 65))
            ctx.fillStyle = bg
            ctx.beginPath()
            ctx.arc(px, py, p.size, 0, Math.PI * 2)
            ctx.fill()

            // Shadow band
            ctx.save()
            ctx.translate(px, py)
            ctx.rotate(p.rot)
            ctx.fillStyle = 'rgba(0,0,0,0.16)'
            ctx.beginPath()
            ctx.ellipse(0, p.size * 0.16, p.size * 0.94, p.size * 0.13, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()

            // Rim
            ctx.strokeStyle = `rgba(${gr},${gg},${gb},0.55)`
            ctx.lineWidth = 1.8
            ctx.beginPath()
            ctx.arc(px, py, p.size + 2, 0, Math.PI * 2)
            ctx.stroke()
          }

          // Warp-exit vignette + destination glow
          if (elapsed > SLOW_AT) {
            const t = (elapsed - SLOW_AT) / (ANIM_DURATION - SLOW_AT)

            // Vignette (unverändert)
            const vg = ctx.createRadialGradient(
              CX,
              CY,
              Math.min(W, H) * 0.18,
              CX,
              CY,
              Math.max(W, H) * 0.78,
            )
            vg.addColorStop(0, 'rgba(10,10,15,0)')
            vg.addColorStop(1, `rgba(10,10,15,${t * 0.7})`)
            ctx.fillStyle = vg
            ctx.fillRect(0, 0, W, H)

            const zR = 38 + t * 96
            const za = t * 0.92

            // ── Zielplanet in der richtigen Varianten-Farbe ────────────────────
            const pColor = PLANET_PALETTES[variant][0]
            const pGlow = PLANET_PALETTES[variant][1]
            const [gr, gg, gb] = hexToRgb(pGlow)

            // Äußerer Glow-Halo
            const zg = ctx.createRadialGradient(CX, CY, zR * 0.4, CX, CY, zR * 2.4)
            zg.addColorStop(0, `rgba(${gr},${gg},${gb},${za * 0.45})`)
            zg.addColorStop(1, `rgba(${gr},${gg},${gb},0)`)
            ctx.fillStyle = zg
            ctx.beginPath()
            ctx.arc(CX, CY, zR * 2.4, 0, Math.PI * 2)
            ctx.fill()

            // Planetenkörper (gleiche Logik wie Flyby-Planeten)
            const zb = ctx.createRadialGradient(CX - zR * 0.3, CY - zR * 0.35, 0, CX, CY, zR)
            zb.addColorStop(0, lighten(pColor, 55))
            zb.addColorStop(0.5, pColor)
            zb.addColorStop(1, darken(pColor, 65))
            ctx.fillStyle = zb
            ctx.beginPath()
            ctx.arc(CX, CY, zR, 0, Math.PI * 2)
            ctx.fill()

            // Rim
            ctx.strokeStyle = `rgba(${gr},${gg},${gb},${za * 0.75})`
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(CX, CY, zR + 2, 0, Math.PI * 2)
            ctx.stroke()
          }

          rafId = requestAnimationFrame(frame)
        }

        rafId = requestAnimationFrame(frame)
      })
    }

    // ── Stop helper ───────────────────────────────────────────────────────────

    function stopAnimation(): void {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      if (planetFoundTimer) {
        clearTimeout(planetFoundTimer)
        planetFoundTimer = null
      }
    }

    // ── Public trigger ────────────────────────────────────────────────────────

    async function trigger(): Promise<void> {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (isAnimating.value) return

      isAnimating.value = true
      showPlanetFound.value = false
      await nextTick()

      const canvas = universeCanvas.value
      if (!canvas) {
        isAnimating.value = false
        return
      }

      const parent = canvas.parentElement as HTMLElement
      canvas.width = parent.offsetWidth || 420
      canvas.height = parent.offsetHeight || 320

      planetFoundTimer = setTimeout(() => {
        showPlanetFound.value = true
      }, PLANET_TEXT_MS)

      await runCanvasAnimation(canvas, props.variant) // ← variant übergeben

      if (planetFoundTimer) {
        clearTimeout(planetFoundTimer)
        planetFoundTimer = null
      }
      showPlanetFound.value = false
      isAnimating.value = false
    }

    onUnmounted(stopAnimation)

    expose({ trigger })

    return { isAnimating, showPlanetFound, universeCanvas, containerRef }
  },
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   UNIVERSE ANIMATION OVERLAY
   ═══════════════════════════════════════════ */
.universe-overlay {
  background: #0a0a0f;
  border-radius: 4px;
  overflow: hidden;
}

.universe-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* ── Planet found banner ── */
.planet-found-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  pointer-events: none;
}

.planet-found-icon {
  font-size: 52px;
  filter: drop-shadow(0 0 20px rgba(100, 165, 255, 0.8));
  animation: planetBob 1.2s ease-in-out infinite;
}

.planet-found-text {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 4px;
  color: #a0c8ff;
  text-shadow:
    0 0 16px rgba(100, 165, 255, 0.9),
    0 0 32px rgba(100, 165, 255, 0.5);
}

/* ── Transition ── */
.planet-found-fade-enter-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}
.planet-found-fade-enter-from {
  opacity: 0;
  transform: scale(0.88) translateY(8px);
}

/* ── Keyframes ── */
@keyframes planetBob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .planet-found-icon {
    animation: none !important;
  }
  .planet-found-fade-enter-active {
    transition: none !important;
  }
}
</style>
