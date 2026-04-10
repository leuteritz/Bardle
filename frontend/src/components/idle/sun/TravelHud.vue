<template>
  <Transition name="travel-fade">
    <div v-if="show" class="travel-hud">
      <!-- Kreisförmige Minimap: nur das runde Canvas, kein Rahmen, kein BG -->
      <div class="minimap-ring" :class="{ 'minimap-ring--rescuing': isRescuing }">
        <img ref="imgEl" src="/img/galaxie.png" style="display: none" alt="" @load="onImageLoad" />
        <canvas ref="canvasEl" class="map-canvas" />

        <!-- Vignette-Overlay für Tiefe -->
        <div class="minimap-vignette" />
      </div>

      <!-- Ankunfts-Countdown: nur während der Reise, kein Container-BG -->
      <div v-if="!isRescuing" class="hud-eta">
        <span class="hud-eta-label">ETA</span>
        <span class="hud-eta-separator">·</span>
        <span class="hud-eta-value">{{ countdown }}</span>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useGalaxyStore } from '../../../stores/galaxyStore'

const MAP_WORLD_VISIBLE = 0.22

function seededRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

interface DotPos {
  x: number
  y: number
}

export default defineComponent({
  name: 'TravelHud',
  setup() {
    const galaxyStore = useGalaxyStore()

    const canvasEl = ref<HTMLCanvasElement | null>(null)
    const imgEl = ref<HTMLImageElement | null>(null)
    const dotPositions = ref<DotPos[]>([])
    const rescueOrder = ref<number[]>([])

    let rafId: number | null = null
    let pulseFrame = 0
    let rafLastPulseMs = 0

    // ── Trail (distanzbasiert) ────────────────────────────────────────────────
    const TRAIL_MIN_DIST = 0.0008
    const TRAIL_MAX_PTS = 60
    let playerTrail: Array<{ wx: number; wy: number }> = []
    let trailLastPos = { wx: -1, wy: -1 }

    // ── Computed ──────────────────────────────────────────────────────────────
    const show = computed(
      () =>
        (galaxyStore.championTravelState === 'traveling' ||
          galaxyStore.championTravelState === 'champion_available' ||
          galaxyStore.championTravelState === 'champion_spawned') &&
        !galaxyStore.pendingGalaxyBoss &&
        !galaxyStore.isComplete,
    )

    const isRescuing = computed(
      () =>
        galaxyStore.championTravelState === 'champion_available' ||
        galaxyStore.championTravelState === 'champion_spawned',
    )

    const countdown = computed(() => {
      const ms = galaxyStore.travelRemainingMs
      const s = Math.ceil(ms / 1000)
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      return `${m}:${String(sec).padStart(2, '0')}`
    })

    // ── Dot-Generierung ───────────────────────────────────────────────────────
    function generateDots() {
      const galaxyKey = galaxyStore.currentGalaxy
      const totalPlanets = galaxyStore.planetsRequired
      const rng = seededRng(galaxyKey * 31337 + totalPlanets)
      const dots: DotPos[] = []
      for (let i = 0; i < totalPlanets; i++) {
        const angle = rng() * Math.PI * 2
        const r = Math.sqrt(rng()) * 0.32
        dots.push({ x: 0.5 + r * Math.cos(angle), y: 0.5 + r * Math.sin(angle) * 0.75 })
      }
      dotPositions.value = dots

      const originRng = seededRng(galaxyKey * 99991 + totalPlanets * 7)
      const originIdx = Math.floor(originRng() * totalPlanets)
      const order: number[] = [originIdx]
      const visited = new Set<number>([originIdx])
      while (order.length < totalPlanets) {
        const last = order[order.length - 1]
        const lastDot = dots[last]
        let nearest = -1
        let nearestDist = Infinity
        for (let i = 0; i < dots.length; i++) {
          if (visited.has(i)) continue
          const dx = dots[i].x - lastDot.x
          const dy = dots[i].y - lastDot.y
          const dist = dx * dx + dy * dy
          if (dist < nearestDist) {
            nearestDist = dist
            nearest = i
          }
        }
        if (nearest === -1) break
        order.push(nearest)
        visited.add(nearest)
      }
      rescueOrder.value = order
    }

    function getPlayerWorldPos(
      dots: DotPos[],
      order: number[],
      rescued: number,
    ): { x: number; y: number } {
      const state = galaxyStore.championTravelState

      if (state === 'traveling') {
        const startTime = galaxyStore.championTravelStartTime
        const duration = galaxyStore.championTravelDurationMs
        const progress =
          startTime > 0 && duration > 0 ? Math.min((Date.now() - startTime) / duration, 1) : 0

        const toIdx = rescued < dots.length ? order[rescued] : -1
        const to = toIdx >= 0 ? dots[toIdx] : { x: 0.5, y: 0.5 }

        if (rescued > 0) {
          const from = dots[order[rescued - 1]]
          return {
            x: from.x + (to.x - from.x) * progress,
            y: from.y + (to.y - from.y) * progress,
          }
        }
        return { x: 0.5 + (to.x - 0.5) * progress, y: 0.5 + (to.y - 0.5) * progress }
      }

      const targetIdx = rescued < dots.length ? order[rescued] : -1
      if (targetIdx >= 0) return dots[targetIdx]
      if (rescued > 0) return dots[order[rescued - 1]]
      return { x: 0.5, y: 0.5 }
    }

    // ── Canvas-Zeichnung ──────────────────────────────────────────────────────
    function drawCanvas() {
      const canvas = canvasEl.value
      if (!canvas) return
      const img = imgEl.value
      if (!img || !img.complete) return

      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      if (w === 0 || h === 0) return

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)

      const dots = dotPositions.value
      const order = rescueOrder.value
      const rescued = Math.min(galaxyStore.planetsRescued, dots.length)
      const isTraveling = galaxyStore.championTravelState === 'traveling'

      const player = getPlayerWorldPos(dots, order, rescued)
      const scale = w / MAP_WORLD_VISIBLE

      function wToC(wx: number, wy: number): [number, number] {
        return [w / 2 + (wx - player.x) * scale, h / 2 + (wy - player.y) * scale]
      }

      // Trail aktualisieren (distanzbasiert)
      if (isTraveling) {
        const dx = player.x - trailLastPos.wx
        const dy = player.y - trailLastPos.wy
        const moved = Math.sqrt(dx * dx + dy * dy)
        if (trailLastPos.wx === -1 || moved > TRAIL_MIN_DIST) {
          playerTrail.push({ wx: player.x, wy: player.y })
          if (playerTrail.length > TRAIL_MAX_PTS) playerTrail.shift()
          trailLastPos = { wx: player.x, wy: player.y }
        }
      } else {
        playerTrail = []
        trailLastPos = { wx: -1, wy: -1 }
      }

      // Galaxienbild zeichnen
      const imgW = scale
      const imgH = scale
      const imgX = w / 2 - player.x * imgW
      const imgY = h / 2 - player.y * imgH
      ctx.drawImage(img, imgX, imgY, imgW, imgH)

      // ── Spieler-Trail ──────────────────────────────────────────────────────
      if (playerTrail.length >= 2) {
        for (let i = 1; i < playerTrail.length; i++) {
          const ratio = i / (playerTrail.length - 1) // 0 = ältester, 1 = neuester Punkt
          const alpha = ratio * 0.8
          const lw = ratio * 3.5 + 0.4
          const [x1, y1] = wToC(playerTrail[i - 1].wx, playerTrail[i - 1].wy)
          const [x2, y2] = wToC(playerTrail[i].wx, playerTrail[i].wy)
          ctx.beginPath()
          ctx.strokeStyle = `rgba(255, 210, 55, ${alpha})`
          ctx.lineWidth = lw
          ctx.lineCap = 'round'
          ctx.shadowColor = `rgba(255, 180, 30, ${ratio * 0.5})`
          ctx.shadowBlur = ratio * 6
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
        ctx.shadowBlur = 0
      }

      // Verbindungslinien zwischen geretteten Planeten
      if (rescued >= 2) {
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(232, 192, 64, 0.55)'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        for (let i = 0; i < rescued; i++) {
          const [sx, sy] = wToC(dots[order[i]].x, dots[order[i]].y)
          if (i === 0) ctx.moveTo(sx, sy)
          else ctx.lineTo(sx, sy)
        }
        ctx.stroke()
      }

      // Gestrichelte Linie vom letzten geretteten Planeten zum Ziel
      const targetIdx = rescued < dots.length ? order[rescued] : -1
      if (targetIdx >= 0 && isTraveling && rescued > 0) {
        const [lx, ly] = wToC(dots[order[rescued - 1]].x, dots[order[rescued - 1]].y)
        const [tx, ty] = wToC(dots[targetIdx].x, dots[targetIdx].y)
        ctx.beginPath()
        ctx.setLineDash([3, 5])
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.lineWidth = 1.5
        ctx.moveTo(lx, ly)
        ctx.lineTo(tx, ty)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Ungerettete Dots (hollow white)
      const rescuedSet = new Set(order.slice(0, rescued))
      for (let i = 0; i < dots.length; i++) {
        if (rescuedSet.has(i)) continue
        if (targetIdx === i) continue
        const [sx, sy] = wToC(dots[i].x, dots[i].y)
        ctx.beginPath()
        ctx.arc(sx, sy, 6, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(200,200,220,0.75)'
        ctx.lineWidth = 1.2
        ctx.stroke()
      }

      // Gerettete Dots (gold)
      for (let i = 0; i < rescued; i++) {
        const [sx, sy] = wToC(dots[order[i]].x, dots[order[i]].y)
        ctx.beginPath()
        ctx.arc(sx, sy, 9, 0, Math.PI * 2)
        ctx.fillStyle = '#e8c040'
        ctx.fill()
        ctx.strokeStyle = '#fff8c0'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Galaxy-Boss-Marker
      if (galaxyStore.needsFinalBoss) {
        const [bx, by] = wToC(0.5, 0.5)
        if (rescued > 0) {
          const last = dots[order[rescued - 1]]
          const [lx, ly] = wToC(last.x, last.y)
          ctx.beginPath()
          ctx.setLineDash([4, 4])
          ctx.strokeStyle = 'rgba(255,80,30,0.55)'
          ctx.lineWidth = 1.5
          ctx.moveTo(lx, ly)
          ctx.lineTo(bx, by)
          ctx.stroke()
          ctx.setLineDash([])
        }
        for (const [r, a] of [
          [22, 0.08],
          [16, 0.18],
          [12, 0.32],
        ] as [number, number][]) {
          ctx.beginPath()
          ctx.arc(bx, by, r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(200,30,10,${a})`
          ctx.fill()
        }
        ctx.beginPath()
        ctx.arc(bx, by, 9, 0, Math.PI * 2)
        ctx.fillStyle = '#9b1020'
        ctx.fill()
        ctx.strokeStyle = '#ff4020'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(bx, by, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#1a0404'
        ctx.fill()
        ctx.font = 'bold 9px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ff6040'
        ctx.fillText('☠', bx, by)
      }

      // Zielplanet: pulsierender weißer Marker
      if (targetIdx >= 0 && isTraveling) {
        const [tx, ty] = wToC(dots[targetIdx].x, dots[targetIdx].y)
        const pulse = pulseFrame === 1
        // Äußerer Pulsring
        ctx.beginPath()
        ctx.arc(tx, ty, pulse ? 16 : 12, 0, Math.PI * 2)
        ctx.fillStyle = pulse ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'
        ctx.fill()
        // Innerer Dot
        ctx.shadowColor = 'rgba(255,255,255,0.9)'
        ctx.shadowBlur = pulse ? 18 : 10
        ctx.beginPath()
        ctx.arc(tx, ty, 8, 0, Math.PI * 2)
        ctx.fillStyle = pulse ? 'rgba(255,255,255,0.98)' : 'rgba(220,220,240,0.8)'
        ctx.fill()
        ctx.shadowBlur = 0
        // Fadenkreuz-Marker
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(tx, ty - 18)
        ctx.lineTo(tx, ty - 11)
        ctx.moveTo(tx - 4, ty - 14)
        ctx.lineTo(tx + 4, ty - 14)
        ctx.stroke()
      }

      // Spieler-Dot: immer in der Mitte
      ctx.shadowColor = 'rgba(232,192,64,0.95)'
      ctx.shadowBlur = 16
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, 7, 0, Math.PI * 2)
      ctx.fillStyle = '#ffe060'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.shadowBlur = 0

      // Richtungspfeil vom Spieler zum Ziel
      if (targetIdx >= 0 && isTraveling) {
        const [tx, ty] = wToC(dots[targetIdx].x, dots[targetIdx].y)
        const dx = tx - w / 2
        const dy = ty - h / 2
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 14) {
          const nx = dx / dist
          const ny = dy / dist
          const ax = w / 2 + nx * 11
          const ay = h / 2 + ny * 11
          ctx.beginPath()
          ctx.moveTo(ax, ay)
          ctx.lineTo(ax - ny * 3 - nx * 4, ay + nx * 3 - ny * 4)
          ctx.lineTo(ax + ny * 3 - nx * 4, ay - nx * 3 - ny * 4)
          ctx.closePath()
          ctx.fillStyle = 'rgba(255,230,80,0.85)'
          ctx.fill()
        }
      }
    }

    // ── rAF-Loop ──────────────────────────────────────────────────────────────
    function rafTick(timestamp: number) {
      if (timestamp - rafLastPulseMs > 600) {
        pulseFrame = pulseFrame === 0 ? 1 : 0
        rafLastPulseMs = timestamp
      }
      drawCanvas()
      if (show.value) {
        rafId = requestAnimationFrame(rafTick)
      } else {
        rafId = null
      }
    }

    function onImageLoad() {
      drawCanvas()
    }

    // ── Watches ───────────────────────────────────────────────────────────────
    watch(
      () => [galaxyStore.currentGalaxy, galaxyStore.planetsRequired],
      () => {
        generateDots()
      },
      { immediate: true },
    )

    watch(
      show,
      (val) => {
        if (val && rafId === null) {
          rafLastPulseMs = 0
          rafId = requestAnimationFrame(rafTick)
        }
      },
      { immediate: true },
    )

    onMounted(() => {
      nextTick(() => {
        if (imgEl.value?.complete) drawCanvas()
      })
    })

    onUnmounted(() => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    })

    return { show, isRescuing, countdown, canvasEl, imgEl, onImageLoad }
  },
})
</script>

<style scoped>
/* ── Einblend-Animation ── */
.travel-fade-enter-active,
.travel-fade-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}
.travel-fade-enter-from,
.travel-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

.travel-hud {
  position: fixed;
  bottom: 10vh;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
}

/* Z-Index hochsetzen wenn Map gehovert */
.travel-hud:has(.minimap-ring:hover) {
  z-index: 20;
}

/* ── Kreis ── */
.minimap-ring {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  pointer-events: auto;
  cursor: crosshair;
  transform-origin: center bottom;
  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    filter 0.4s ease,
    opacity 0.4s ease;
}

.minimap-ring:hover {
  transform: scale(1.85);
}

.minimap-ring--rescuing {
  filter: blur(2.5px);
  opacity: 0.45;
}

.minimap-ring--rescuing:hover {
  filter: blur(0.5px);
  opacity: 0.9;
}

/* Canvas füllt den gesamten Kreis */
.map-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* Innere Vignette */
.minimap-vignette {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle at center, transparent 55%, rgba(0, 0, 0, 0.55) 100%);
}

/* ── ETA-Anzeige ── */
.hud-eta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hud-eta-label {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #9a6e28;
  filter: drop-shadow(0 0 5px rgba(160, 100, 30, 0.7));
}

.hud-eta-separator {
  color: #5a3a10;
  font-size: 0.75rem;
  line-height: 1;
}

.hud-eta-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  line-height: 1;
  text-shadow:
    0 0 14px rgba(220, 175, 40, 0.8),
    0 1px 3px rgba(0, 0, 0, 0.95);
}
</style>
