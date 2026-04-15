<template>
  <Transition name="travel-fade">
    <div v-if="show" class="travel-hud">
      <!-- RPG-Frame-Wrapper (übernimmt Hover, Blur, Scale) -->
      <div class="minimap-frame" :class="{ 'minimap-frame--rescuing': isRescuing }">
        <!-- N-Kompass-Label -->
        <span class="minimap-n-label">N</span>

        <!-- Dekorativer SVG-Kompassring (nur visuell) -->
        <svg
          class="minimap-compass-svg"
          viewBox="0 0 220 220"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <mask id="bezelMask">
              <circle cx="110" cy="110" r="107" fill="white" />
              <circle cx="110" cy="110" r="91" fill="black" />
            </mask>
            <radialGradient id="bezelGrad" cx="50%" cy="50%" r="50%">
              <stop offset="83%" stop-color="#0b0703" />
              <stop offset="100%" stop-color="#1c1108" />
            </radialGradient>
            <filter id="goldGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <!-- Dunkler Bezel-Hintergrund -->
          <circle cx="110" cy="110" r="107" fill="url(#bezelGrad)" mask="url(#bezelMask)" />

          <!-- Rahmenringe -->
          <circle
            cx="110"
            cy="110"
            r="109"
            stroke="rgba(60,38,10,0.7)"
            stroke-width="1"
            fill="none"
          />
          <circle
            cx="110"
            cy="110"
            r="107"
            stroke="rgba(210,160,40,0.95)"
            stroke-width="1.8"
            fill="none"
            filter="url(#softGlow)"
          />
          <circle
            cx="110"
            cy="110"
            r="104"
            stroke="rgba(100,68,15,0.6)"
            stroke-width="0.8"
            fill="none"
          />
          <circle
            cx="110"
            cy="110"
            r="101"
            stroke="rgba(160,115,30,0.35)"
            stroke-width="0.6"
            fill="none"
          />

          <!-- Feine Kompassstriche (36×, alle 10°) -->
          <circle
            cx="110"
            cy="110"
            r="99.5"
            stroke="rgba(175,130,38,0.6)"
            stroke-dasharray="2.2 15.16"
            stroke-width="2"
            fill="none"
            transform="rotate(-90 110 110)"
          />
          <!-- Ordinalstriche (NE/SE/SW/NW) -->
          <circle
            cx="110"
            cy="110"
            r="99.5"
            stroke="rgba(210,165,48,0.8)"
            stroke-dasharray="5 151.27"
            stroke-width="2.5"
            fill="none"
            transform="rotate(-45 110 110)"
          />

          <!-- Innere Bezel-Kanten -->
          <circle
            cx="110"
            cy="110"
            r="92.5"
            stroke="rgba(205,158,42,0.55)"
            stroke-width="1"
            fill="none"
          />
          <circle
            cx="110"
            cy="110"
            r="91"
            stroke="rgba(50,32,8,0.9)"
            stroke-width="1.2"
            fill="none"
          />

          <!-- Ordinal-Nieten -->
          <circle cx="185" cy="35" r="3.5" fill="#120b02" stroke="#c8a030" stroke-width="1.5" />
          <circle cx="185" cy="185" r="3.5" fill="#120b02" stroke="#c8a030" stroke-width="1.5" />
          <circle cx="35" cy="185" r="3.5" fill="#120b02" stroke="#c8a030" stroke-width="1.5" />
          <circle cx="35" cy="35" r="3.5" fill="#120b02" stroke="#c8a030" stroke-width="1.5" />
        </svg>

        <!-- Kreisförmige Minimap (Logik unverändert) -->
        <div class="minimap-ring">
          <img
            ref="imgEl"
            src="/img/galaxie.png"
            style="display: none"
            alt=""
            @load="onImageLoad"
          />
          <canvas ref="canvasEl" class="map-canvas" />
          <div class="minimap-vignette" />
        </div>

        <!-- Stern-Zähler (nicht während Suchphase) -->
        <div
          v-if="!galaxyStore.isComplete && !galaxyStore.isBossSearchActive"
          class="minimap-planet-count"
        >
          ★ {{ galaxyStore.starsRescued }} / {{ galaxyStore.starsRequired }}
        </div>

        <!-- Ressourcen-Stern Indikator -->
        <div v-if="starGroupStore.hasActiveResourceStar" class="minimap-resource-star">
          ✦ Ressourcen-Stern
        </div>

        <!-- Suchphase-Label -->
        <div v-if="galaxyStore.isBossSearchActive" class="minimap-search-label">
          ???
        </div>

        <!-- Galaxy Complete Overlay -->
        <div
          v-if="
            galaxyStore.isComplete &&
            !galaxyStore.isGalaxyTransitioning &&
            !galaxyStore.pendingTransition
          "
          class="complete-overlay"
        >
          <span class="complete-badge">✦ Galaxie Befreit ✦</span>
          <button class="next-galaxy-btn" @click="galaxyStore.requestTransition()">
            » Nächste Galaxie «
          </button>
        </div>
      </div>

      <!-- Ankunfts-Countdown -->
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
import { useGameStore } from '../../../stores/gameStore'
import { useStarGroupStore } from '../../../stores/starGroupStore'
import { GALAXY_THEMES } from '../../../config/galaxyThemes'
import { GALAXY_TRANS_WARP_MS, GALAXY_TRANS_DECEL_MS } from '../../../config/constants'

// ── Zoom-Konfiguration ────────────────────────────────────────────────────
const MAP_WORLD_DEFAULT = 0.22 // Standard-Zoom (kleiner = weiter rein)
const MAP_WORLD_ZOOMED = 0.08 // Max-Zoom beim Planetanflug
const ZOOM_TRIGGER_MS = 20_000 // ab hier startet Zoom (20s vor Ankunft)
const ZOOM_FULL_MS = 1_000 // vollständig gezoomt (1s vor Ankunft)
const ZOOM_LERP_SPEED = 0.04 // Smooth-Faktor pro Frame (~60fps)

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

interface WarpParticle {
  angle: number
  dist: number
  speed: number
}

type HyperspacePhase = 'idle' | 'streaks' | 'flash' | 'fadeout'

// ─────────────────────────────────────────────────────────────────────────────
// RPG Planet Renderer
// ─────────────────────────────────────────────────────────────────────────────

const PLANET_PALETTES = [
  {
    base: '#d4723a',
    shadow: '#5a1a04',
    highlight: '#f4a870',
    atmo: 'rgba(220,100,40,0.5)',
    ring: false,
  }, // Mars/Wüste
  {
    base: '#5090d8',
    shadow: '#102860',
    highlight: '#90c8ff',
    atmo: 'rgba(70,140,240,0.45)',
    ring: false,
  }, // Eiswelt
  {
    base: '#42b850',
    shadow: '#0e3a14',
    highlight: '#80e888',
    atmo: 'rgba(50,200,70,0.4)',
    ring: false,
  }, // Dschungel
  {
    base: '#9050d0',
    shadow: '#200850',
    highlight: '#c080ff',
    atmo: 'rgba(150,70,220,0.45)',
    ring: true,
  }, // Gasriese lila
  {
    base: '#d04a14',
    shadow: '#480802',
    highlight: '#ff8040',
    atmo: 'rgba(220,80,20,0.5)',
    ring: false,
  }, // Lava
  {
    base: '#38a8cc',
    shadow: '#0a2840',
    highlight: '#70d8ff',
    atmo: 'rgba(50,180,220,0.4)',
    ring: false,
  }, // Ozean
  {
    base: '#98cc3a',
    shadow: '#203808',
    highlight: '#ccff60',
    atmo: 'rgba(160,220,50,0.4)',
    ring: false,
  }, // Gift/Sumpf
  {
    base: '#c89040',
    shadow: '#3a2004',
    highlight: '#ffcc70',
    atmo: 'rgba(210,160,50,0.4)',
    ring: true,
  }, // Gasriese gold
  {
    base: '#e05888',
    shadow: '#500820',
    highlight: '#ff90c0',
    atmo: 'rgba(220,80,130,0.45)',
    ring: false,
  }, // Kristall/Pink
  {
    base: '#40c8a8',
    shadow: '#0a2c20',
    highlight: '#80ffe0',
    atmo: 'rgba(50,200,170,0.4)',
    ring: false,
  }, // Tundra/Eis-Türkis
]

function drawPlanet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  state: 'unrescued' | 'rescued' | 'target',
  pulse = false,
) {
  const rng = seededRng(seed >>> 0)
  const pal = PLANET_PALETTES[Math.floor(rng() * PLANET_PALETTES.length)]

  // ── Atmosphärischer Glow (hinter allem) ──
  const glowMult = state === 'target' ? (pulse ? 2.5 : 2.1) : state === 'rescued' ? 1.9 : 1.55
  const glowR = r * glowMult
  const atmoGrad = ctx.createRadialGradient(x, y, r * 0.7, x, y, glowR)
  if (state === 'rescued') {
    atmoGrad.addColorStop(0, 'rgba(255,210,50,0.55)')
    atmoGrad.addColorStop(0.55, 'rgba(255,170,20,0.18)')
    atmoGrad.addColorStop(1, 'rgba(255,140,0,0)')
  } else if (state === 'target') {
    // Farbe der Atmosphäre + extra helles Flackern
    const baseAtmo = pal.atmo
    const dimAtmo = baseAtmo.replace(/[\d.]+\)$/, '0.12)')
    atmoGrad.addColorStop(0, baseAtmo)
    atmoGrad.addColorStop(0.55, dimAtmo)
    atmoGrad.addColorStop(1, 'rgba(0,0,0,0)')
  } else {
    const dimAtmo = pal.atmo.replace(/[\d.]+\)$/, '0.28)')
    atmoGrad.addColorStop(0, dimAtmo)
    atmoGrad.addColorStop(1, 'rgba(0,0,0,0)')
  }
  ctx.beginPath()
  ctx.arc(x, y, glowR, 0, Math.PI * 2)
  ctx.fillStyle = atmoGrad
  ctx.fill()

  // ── Planetenkugel mit Radial-Gradient (Beleuchtung oben-links) ──
  const lx = x - r * 0.3
  const ly = y - r * 0.32
  const bodyGrad = ctx.createRadialGradient(lx, ly, r * 0.05, x, y, r)
  if (state === 'rescued') {
    bodyGrad.addColorStop(0, '#ffffc8')
    bodyGrad.addColorStop(0.35, '#e8c040')
    bodyGrad.addColorStop(0.72, '#8a5810')
    bodyGrad.addColorStop(1, '#1e0e02')
  } else {
    bodyGrad.addColorStop(0, pal.highlight)
    bodyGrad.addColorStop(0.45, pal.base)
    bodyGrad.addColorStop(1, pal.shadow)
  }
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = bodyGrad
  ctx.fill()

  // ── Oberflächendetail: horizontale Bänder ──
  if (r >= 7) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, r - 0.5, 0, Math.PI * 2)
    ctx.clip()
    ctx.globalAlpha = state === 'rescued' ? 0.07 : 0.14
    ctx.beginPath()
    ctx.ellipse(x, y - r * 0.28, r * 0.88, r * 0.12, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.24, r * 0.82, r * 0.1, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fill()
    ctx.restore()
  }

  // ── Planetenring (Gasriesen) ──
  if (pal.ring && state !== 'rescued') {
    ctx.save()
    ctx.globalAlpha = state === 'target' ? (pulse ? 0.78 : 0.62) : 0.48
    // Äußerer Ring
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.75, r * 0.38, -0.28, 0, Math.PI * 2)
    ctx.strokeStyle = pal.highlight
    ctx.lineWidth = state === 'target' ? 2 : 1.3
    ctx.stroke()
    // Innerer Ring
    ctx.globalAlpha *= 0.5
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.42, r * 0.3, -0.28, 0, Math.PI * 2)
    ctx.lineWidth = 0.7
    ctx.stroke()
    ctx.restore()
  }

  // ── Rand-Stroke ──
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  if (state === 'target') {
    ctx.strokeStyle = pulse ? '#ffffff' : 'rgba(255,255,255,0.78)'
    ctx.lineWidth = pulse ? 2 : 1.5
    ctx.shadowColor = 'rgba(255,255,255,0.9)'
    ctx.shadowBlur = pulse ? 16 : 8
  } else if (state === 'rescued') {
    ctx.strokeStyle = '#fff8c0'
    ctx.lineWidth = 1.5
    ctx.shadowColor = 'rgba(255,210,60,0.85)'
    ctx.shadowBlur = 9
  } else {
    ctx.strokeStyle = 'rgba(200,210,235,0.62)'
    ctx.lineWidth = 1
    ctx.shadowBlur = 0
  }
  ctx.stroke()
  ctx.shadowBlur = 0

  // ── Ziel-Fadenkreuz & Ecken-Brackets ──
  if (state === 'target') {
    const gap = r + 3.5
    const arm = r * 0.7
    ctx.strokeStyle = pulse ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 1
    ctx.shadowColor = 'rgba(255,255,255,0.75)'
    ctx.shadowBlur = pulse ? 9 : 4
    ctx.beginPath()
    ctx.moveTo(x, y - gap - arm)
    ctx.lineTo(x, y - gap)
    ctx.moveTo(x, y + gap)
    ctx.lineTo(x, y + gap + arm)
    ctx.moveTo(x - gap - arm, y)
    ctx.lineTo(x - gap, y)
    ctx.moveTo(x + gap, y)
    ctx.lineTo(x + gap + arm, y)
    ctx.stroke()

    const bs = r * 0.55
    const bd = r + 3
    ctx.strokeStyle = pulse ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    // oben-links
    ctx.moveTo(x - bd, y - bd + bs)
    ctx.lineTo(x - bd, y - bd)
    ctx.lineTo(x - bd + bs, y - bd)
    // oben-rechts
    ctx.moveTo(x + bd - bs, y - bd)
    ctx.lineTo(x + bd, y - bd)
    ctx.lineTo(x + bd, y - bd + bs)
    // unten-rechts
    ctx.moveTo(x + bd, y + bd - bs)
    ctx.lineTo(x + bd, y + bd)
    ctx.lineTo(x + bd - bs, y + bd)
    // unten-links
    ctx.moveTo(x - bd + bs, y + bd)
    ctx.lineTo(x - bd, y + bd)
    ctx.lineTo(x - bd, y + bd - bs)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // ── Befreit-Stern ──
  if (state === 'rescued') {
    const fSize = Math.max(7, Math.round(r * 0.88))
    ctx.font = `bold ${fSize}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,255,255,0.94)'
    ctx.shadowColor = 'rgba(255,240,100,1)'
    ctx.shadowBlur = 6
    ctx.fillText('✦', x, y + 0.5)
    ctx.shadowBlur = 0
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default defineComponent({
  name: 'MiniMap',
  setup() {
    const galaxyStore = useGalaxyStore()
    const gameStore = useGameStore()
    const starGroupStore = useStarGroupStore()

    const canvasEl = ref<HTMLCanvasElement | null>(null)
    const imgEl = ref<HTMLImageElement | null>(null)
    const dotPositions = ref<DotPos[]>([])
    const rescueOrder = ref<number[]>([])
    const spawnPos = ref<DotPos>({ x: 0.5, y: 0.5 })
    const currentMapVisible = ref(MAP_WORLD_DEFAULT)

    let rafId: number | null = null
    let pulseFrame = 0
    let rafLastPulseMs = 0

    const TRAIL_MIN_DIST = 0.0008
    const TRAIL_MAX_PTS = 60
    let playerTrail: Array<{ wx: number; wy: number }> = []
    let trailLastPos = { wx: -1, wy: -1 }

    // ── Hyperspace warp state ──────────────────────────────────────────────
    let hyperspacePhase: HyperspacePhase = 'idle'
    let hyperspacePhaseStart = 0
    let hyperspaceTimeouts: number[] = []
    let warpLastFrameMs = 0
    let warpParticles: WarpParticle[] = []

    function initWarpParticles(w: number, h: number) {
      const cx = w / 2
      const cy = h / 2
      const maxR = Math.sqrt(cx * cx + cy * cy)
      warpParticles = []
      for (let i = 0; i < 90; i++) {
        warpParticles.push({
          angle: Math.random() * Math.PI * 2,
          dist: 1 + Math.random() * maxR * 0.15,
          speed: 25 + Math.random() * 70,
        })
      }
      warpLastFrameMs = performance.now()
    }

    function drawStreaksPhase(
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      timestamp: number,
    ) {
      const dt = Math.min((timestamp - warpLastFrameMs) / 1000, 0.05)
      warpLastFrameMs = timestamp
      const t = Math.min((Date.now() - hyperspacePhaseStart) / 2000, 1)
      const accel = 1 + t * t * t * 17
      const cx = w / 2
      const cy = h / 2
      const maxR = Math.sqrt(cx * cx + cy * cy)

      ctx.fillStyle = 'rgba(6, 4, 22, 0.75)'
      ctx.fillRect(0, 0, w, h)

      for (const p of warpParticles) {
        const tailLen = (4 + p.speed * 0.08) * accel
        const sx = cx + Math.cos(p.angle) * p.dist
        const sy = cy + Math.sin(p.angle) * p.dist
        const ex = cx + Math.cos(p.angle) * (p.dist + tailLen)
        const ey = cy + Math.sin(p.angle) * (p.dist + tailLen)

        const grad = ctx.createLinearGradient(sx, sy, ex, ey)
        grad.addColorStop(0, 'rgba(60, 100, 255, 0)')
        grad.addColorStop(0.4, 'rgba(200, 220, 255, 0.55)')
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.92)')

        ctx.beginPath()
        ctx.strokeStyle = grad
        ctx.lineWidth = 0.6 + accel * 0.25
        ctx.lineCap = 'round'
        ctx.moveTo(sx, sy)
        ctx.lineTo(ex, ey)
        ctx.stroke()

        p.dist += p.speed * accel * dt
        if (p.dist > maxR + 10) {
          p.dist = 1 + Math.random() * maxR * 0.08
          p.angle = Math.random() * Math.PI * 2
        }
      }
    }

    function drawFlashPhase(ctx: CanvasRenderingContext2D, w: number, h: number) {
      ctx.fillStyle = 'rgba(6, 4, 22, 1)'
      ctx.fillRect(0, 0, w, h)
      const t = Math.min((Date.now() - hyperspacePhaseStart) / 450, 1)
      ctx.fillStyle = `rgba(255, 255, 255, ${t * 0.85})`
      ctx.fillRect(0, 0, w, h)
    }

    function drawFadeoutPhase(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const t = Math.min((Date.now() - hyperspacePhaseStart) / 1000, 1)
      ctx.save()
      ctx.globalAlpha = t
      drawNormalMap(ctx, w, h)
      ctx.restore()
      const flashAlpha = (1 - t) * 0.85
      if (flashAlpha > 0.001) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`
        ctx.fillRect(0, 0, w, h)
      }
    }
    // ── End hyperspace helpers ─────────────────────────────────────────────

    const show = computed(
      () =>
        ((galaxyStore.championTravelState === 'traveling' ||
          galaxyStore.championTravelState === 'champion_available' ||
          galaxyStore.championTravelState === 'champion_spawned') &&
          !galaxyStore.pendingGalaxyBoss &&
          !galaxyStore.isComplete) ||
        galaxyStore.isBossSearchActive ||
        galaxyStore.isGalaxyTransitioning ||
        galaxyStore.isComplete,
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

    function generateDots() {
      const galaxyKey = galaxyStore.currentGalaxy
      const totalPlanets = galaxyStore.starsRequired
      const rng = seededRng(galaxyKey * 31337 + totalPlanets)
      const dots: DotPos[] = []
      for (let i = 0; i < totalPlanets; i++) {
        const angle = rng() * Math.PI * 2
        const r = Math.sqrt(rng()) * 0.32
        dots.push({ x: 0.5 + r * Math.cos(angle), y: 0.5 + r * Math.sin(angle) * 0.75 })
      }
      dotPositions.value = dots

      const spawnRng = seededRng(galaxyKey * 99997 + totalPlanets * 13)
      const angle = spawnRng() * Math.PI * 2
      const r = Math.sqrt(spawnRng()) * 0.3
      spawnPos.value = {
        x: 0.5 + r * Math.cos(angle),
        y: 0.5 + r * Math.sin(angle),
      }

      let originIdx = 0
      let nearestToSpawn = Infinity
      for (let i = 0; i < dots.length; i++) {
        const dx = dots[i].x - spawnPos.value.x
        const dy = dots[i].y - spawnPos.value.y
        const dist = dx * dx + dy * dy
        if (dist < nearestToSpawn) {
          nearestToSpawn = dist
          originIdx = i
        }
      }
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
      // Suchphase: Echtzeit-Interpolation zwischen Segment-Checkpoints
      if (galaxyStore.isBossSearchActive) {
        return galaxyStore.bossSearchInterpolatedPos
      }
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
          return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress }
        }
        return {
          x: spawnPos.value.x + (to.x - spawnPos.value.x) * progress,
          y: spawnPos.value.y + (to.y - spawnPos.value.y) * progress,
        }
      }
      const targetIdx = rescued < dots.length ? order[rescued] : -1
      if (targetIdx >= 0) return dots[targetIdx]
      if (rescued > 0) return dots[order[rescued - 1]]
      return spawnPos.value
    }

    function drawNormalMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const img = imgEl.value
      if (!img || !img.complete) return

      const dots = dotPositions.value
      const order = rescueOrder.value
      const rescued = Math.min(galaxyStore.starsRescued, dots.length)
      const isTraveling = galaxyStore.championTravelState === 'traveling'

      const player = getPlayerWorldPos(dots, order, rescued)
      const scale = w / currentMapVisible.value

      function wToC(wx: number, wy: number): [number, number] {
        return [w / 2 + (wx - player.x) * scale, h / 2 + (wy - player.y) * scale]
      }

      // Trail-Tracking
      const isMoving = isTraveling || galaxyStore.isBossSearchActive
      if (isMoving) {
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

      // Hintergrundbild
      const imgW = scale
      const imgH = scale
      const imgX = w / 2 - player.x * imgW
      const imgY = h / 2 - player.y * imgH
      ctx.drawImage(img, imgX, imgY, imgW, imgH)

      // Nebula-Farbtönung
      const theme = GALAXY_THEMES[galaxyStore.currentThemeIndex % GALAXY_THEMES.length]
      ctx.save()
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = theme.nebulaColors[0].replace(/,\s*[\d.]+\)/, ', 0.28)')
      ctx.fillRect(0, 0, w, h)
      ctx.restore()

      // Spieler-Spur
      if (playerTrail.length >= 2) {
        for (let i = 1; i < playerTrail.length; i++) {
          const ratio = i / (playerTrail.length - 1)
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

      // Verbindungspfad der befrieten Planeten
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

      // Gestrichelte Linie zum Ziel
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

      // ── Unbefreite Planeten ──────────────────────────────────────────────
      const rescuedSet = new Set(order.slice(0, rescued))
      const galaxySeed = galaxyStore.currentGalaxy * 10007
      for (let i = 0; i < dots.length; i++) {
        if (rescuedSet.has(i)) continue
        if (targetIdx === i) continue
        const [sx, sy] = wToC(dots[i].x, dots[i].y)
        drawPlanet(ctx, sx, sy, 8, galaxySeed + i, 'unrescued')
      }

      // ── Befreite Planeten ────────────────────────────────────────────────
      for (let i = 0; i < rescued; i++) {
        const [sx, sy] = wToC(dots[order[i]].x, dots[order[i]].y)
        drawPlanet(ctx, sx, sy, 10, galaxySeed + order[i], 'rescued')
      }

      // ── Suchphase: Spieler-Dot wird als pulsierender ?-Kreis dargestellt ──
      // (normaler Spieler-Dot weiter unten wird in diesem Fall übersprungen)

      // ── Final-Boss ──────────────────────────────────────────────────────
      if (galaxyStore.needsFinalBoss && !galaxyStore.isBossSearchActive) {
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

      // ── Ziel-Planet (pulsierend, mit RPG-Fadenkreuz) ────────────────────
      if (targetIdx >= 0 && isTraveling) {
        const [tx, ty] = wToC(dots[targetIdx].x, dots[targetIdx].y)
        drawPlanet(ctx, tx, ty, 11, galaxySeed + targetIdx, 'target', pulseFrame === 1)
      }

      // ── Spieler-Dot (normal) oder ?-Indikator (Suchphase) ───────────────
      if (galaxyStore.isBossSearchActive) {
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 400)
        // Äußere Ringe
        for (const [r, a] of [
          [20, 0.08 * pulse],
          [14, 0.18 * pulse],
          [10, 0.28 * pulse],
        ] as [number, number][]) {
          ctx.beginPath()
          ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(120,80,255,${a})`
          ctx.fill()
        }
        // Kern
        ctx.beginPath()
        ctx.arc(w / 2, h / 2, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#2a0f6a'
        ctx.fill()
        ctx.strokeStyle = `rgba(160,110,255,${0.8 + 0.2 * pulse})`
        ctx.lineWidth = 1.8
        ctx.stroke()
        // ?-Symbol
        ctx.font = 'bold 10px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = `rgba(200,160,255,${0.75 + 0.25 * pulse})`
        ctx.shadowColor = 'rgba(140,80,255,0.9)'
        ctx.shadowBlur = 8
        ctx.fillText('?', w / 2, h / 2)
        ctx.shadowBlur = 0
      } else {
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
      }

      // ── Richtungspfeil zum Ziel ──────────────────────────────────────────
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

    function drawCanvas(timestamp = performance.now()) {
      const canvas = canvasEl.value
      if (!canvas) return
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

      if (hyperspacePhase === 'streaks') {
        drawStreaksPhase(ctx, w, h, timestamp)
        return
      }
      if (hyperspacePhase === 'flash') {
        drawFlashPhase(ctx, w, h)
        return
      }
      if (hyperspacePhase === 'fadeout') {
        drawFadeoutPhase(ctx, w, h)
        return
      }

      const img = imgEl.value
      if (!img || !img.complete) return
      drawNormalMap(ctx, w, h)
    }

    function updateZoom() {
      const isBossPhase =
        galaxyStore.searchingForGalaxyBoss ||
        galaxyStore.needsFinalBoss ||
        galaxyStore.pendingGalaxyBoss

      let desired = MAP_WORLD_DEFAULT

      if (galaxyStore.championTravelState === 'traveling' && !isBossPhase) {
        const remaining = galaxyStore.travelRemainingMs
        if (remaining <= ZOOM_TRIGGER_MS) {
          const t = Math.max(
            0,
            Math.min(1, (ZOOM_TRIGGER_MS - remaining) / (ZOOM_TRIGGER_MS - ZOOM_FULL_MS)),
          )
          desired = MAP_WORLD_DEFAULT + (MAP_WORLD_ZOOMED - MAP_WORLD_DEFAULT) * t
        }
      }

      currentMapVisible.value += (desired - currentMapVisible.value) * ZOOM_LERP_SPEED
    }

    function rafTick(timestamp: number) {
      if (timestamp - rafLastPulseMs > 600) {
        pulseFrame = pulseFrame === 0 ? 1 : 0
        rafLastPulseMs = timestamp
      }
      updateZoom()
      drawCanvas(timestamp)
      if (show.value) {
        rafId = requestAnimationFrame(rafTick)
      } else {
        rafId = null
      }
    }

    function onImageLoad() {
      drawCanvas()
    }

    watch(
      () => [galaxyStore.currentGalaxy, galaxyStore.starsRequired],
      () => {
        playerTrail = []
        trailLastPos = { wx: -1, wy: -1 }
        generateDots()
      },
      { immediate: true },
    )

    watch(
      () => galaxyStore.currentThemeIndex,
      () => drawCanvas(),
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

    watch(
      () => galaxyStore.isGalaxyTransitioning,
      (active) => {
        if (!active) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const canvas = canvasEl.value
        const w = canvas?.offsetWidth ?? 180
        const h = canvas?.offsetHeight ?? 180
        for (const id of hyperspaceTimeouts) window.clearTimeout(id)
        hyperspaceTimeouts = []
        initWarpParticles(w, h)
        hyperspacePhase = 'streaks'
        hyperspacePhaseStart = Date.now()
        hyperspaceTimeouts.push(
          window.setTimeout(() => {
            hyperspacePhase = 'flash'
            hyperspacePhaseStart = Date.now()
          }, GALAXY_TRANS_WARP_MS),
          window.setTimeout(() => {
            hyperspacePhase = 'fadeout'
            hyperspacePhaseStart = Date.now()
          }, GALAXY_TRANS_WARP_MS + 500),
          window.setTimeout(() => {
            hyperspacePhase = 'idle'
            warpParticles = []
            currentMapVisible.value = MAP_WORLD_DEFAULT
          }, GALAXY_TRANS_WARP_MS + GALAXY_TRANS_DECEL_MS),
        )
      },
    )

    watch(
      () => gameStore.isHyperspaceActive,
      (active) => {
        if (!active) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const canvas = canvasEl.value
        const w = canvas?.offsetWidth ?? 180
        const h = canvas?.offsetHeight ?? 180
        for (const id of hyperspaceTimeouts) window.clearTimeout(id)
        hyperspaceTimeouts = []
        initWarpParticles(w, h)
        hyperspacePhase = 'streaks'
        hyperspacePhaseStart = Date.now()
        hyperspaceTimeouts.push(
          window.setTimeout(() => {
            hyperspacePhase = 'flash'
            hyperspacePhaseStart = Date.now()
          }, 2000),
          window.setTimeout(() => {
            hyperspacePhase = 'fadeout'
            hyperspacePhaseStart = Date.now()
          }, 2500),
          window.setTimeout(() => {
            hyperspacePhase = 'idle'
            warpParticles = []
            currentMapVisible.value = MAP_WORLD_DEFAULT
          }, 3500),
        )
      },
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
      for (const id of hyperspaceTimeouts) window.clearTimeout(id)
      hyperspaceTimeouts = []
    })

    return { show, isRescuing, countdown, canvasEl, imgEl, onImageLoad, galaxyStore, starGroupStore }
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

/* ── HUD-Container ── */
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
  gap: 10px;
  background: none;
  border: none;
}

.travel-hud:has(.minimap-frame:hover) {
  z-index: 20;
}

/* ── RPG-Frame-Wrapper ── */
.minimap-frame {
  position: relative;
  width: 220px;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  transform-origin: center bottom;
  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    filter 0.4s ease,
    opacity 0.4s ease;
  filter: drop-shadow(0 0 10px rgba(180, 130, 28, 0.45)) drop-shadow(0 0 3px rgba(90, 58, 10, 0.65));
  animation: minimap-pulse-glow 3.5s ease-in-out infinite;
}

.minimap-frame:hover {
  transform: scale(1.85);
  filter: drop-shadow(0 0 22px rgba(232, 192, 64, 0.75))
    drop-shadow(0 0 8px rgba(160, 110, 20, 0.9));
  animation: none;
}

.minimap-frame--rescuing {
  filter: blur(2.5px) drop-shadow(0 0 8px rgba(180, 130, 28, 0.3));
  opacity: 0.45;
  animation: none;
}

.minimap-frame--rescuing:hover {
  filter: blur(0.5px) drop-shadow(0 0 16px rgba(232, 192, 64, 0.55));
  opacity: 0.9;
}

@keyframes minimap-pulse-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 10px rgba(180, 130, 28, 0.45))
      drop-shadow(0 0 3px rgba(90, 58, 10, 0.65));
  }
  50% {
    filter: drop-shadow(0 0 16px rgba(210, 160, 40, 0.65))
      drop-shadow(0 0 6px rgba(120, 82, 15, 0.75));
  }
}

/* ── Kompass-SVG ── */
.minimap-compass-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}

/* ── N-Label ── */
.minimap-n-label {
  position: absolute;
  top: 3px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  font-weight: 700;
  font-family: Georgia, 'Times New Roman', serif;
  letter-spacing: 2px;
  color: #ffe080;
  text-shadow:
    0 0 10px rgba(232, 192, 64, 0.95),
    0 0 4px rgba(150, 100, 20, 0.8);
  z-index: 3;
  pointer-events: none;
  user-select: none;
}

/* ── Minimap-Kreis ── */
.minimap-ring {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.map-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.minimap-vignette {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle at center, transparent 52%, rgba(0, 0, 0, 0.65) 100%);
}

/* ── Planeten-Zähler (RPG-Stil) ── */
.minimap-planet-count {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffe484;
  letter-spacing: 0.18em;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  user-select: none;
  text-shadow:
    0 0 14px rgba(232, 192, 64, 0.95),
    0 0 6px rgba(255, 210, 60, 0.75),
    0 0 2px rgba(255, 240, 140, 0.5),
    0 1px 4px rgba(0, 0, 0, 0.98),
    0 2px 8px rgba(0, 0, 0, 0.85);
}

.minimap-resource-star {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.72rem;
  font-weight: 700;
  color: #ffd060;
  letter-spacing: 0.12em;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  user-select: none;
  animation: resource-star-pulse 1.4s ease-in-out infinite;
  text-shadow:
    0 0 10px rgba(255, 200, 50, 0.9),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

@keyframes resource-star-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* ── Suchphase-Label ── */
.minimap-search-label {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.05rem;
  font-weight: 700;
  color: #b090ff;
  letter-spacing: 0.22em;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  user-select: none;
  animation: search-label-pulse 1s ease-in-out infinite alternate;
  text-shadow:
    0 0 14px rgba(150, 80, 255, 0.95),
    0 0 6px rgba(120, 60, 255, 0.75),
    0 1px 4px rgba(0, 0, 0, 0.98);
}

@keyframes search-label-pulse {
  from { opacity: 0.6; }
  to   { opacity: 1; }
}

/* ── ETA-Anzeige ── */
.hud-eta {
  display: flex;
  align-items: center;
  gap: 6px;
  border-top: 1px solid rgba(180, 130, 35, 0.35);
  padding-top: 5px;
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

/* ── Galaxy Complete Overlay ── */
.complete-overlay {
  position: absolute;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: rgba(10, 6, 2, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 5;
  pointer-events: auto;
}

.complete-badge {
  font-size: 0.5rem;
  letter-spacing: 0.22em;
  color: #e8c040;
  text-transform: uppercase;
  text-shadow:
    0 0 14px rgba(232, 192, 64, 0.95),
    0 0 5px rgba(255, 210, 60, 0.7);
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%,
  100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
}

.next-galaxy-btn {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 4px;
  color: #fff;
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  padding: 7px 14px;
  cursor: pointer;
  text-transform: uppercase;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
  box-shadow: 0 2px 10px rgba(46, 122, 26, 0.55);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

.next-galaxy-btn:hover {
  background: linear-gradient(to bottom, #66d040, #3a9a22);
  box-shadow: 0 0 16px rgba(82, 184, 48, 0.75);
  transform: translateY(-1px);
}

.next-galaxy-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(46, 122, 26, 0.4);
}
</style>
