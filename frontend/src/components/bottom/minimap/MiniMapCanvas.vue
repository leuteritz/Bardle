<template>
  <img ref="imgFarEl" src="/img/galaxy-far.png" style="display: none" alt="" @load="onImageLoad" />
  <img ref="imgNearEl" src="/img/galaxy-near.png" style="display: none" alt="" @load="onImageLoad" />
  <canvas ref="canvasEl" class="map-canvas" />
  <div class="minimap-vignette" />
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useGameStore } from '@/stores/gameStore'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { livePlanetAngles } from '@/composables/useStarSystem'
import type { StarPlanetSlot } from '@/stores/starGroupStore'
import type { PlanetType } from '@/types'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { GALAXY_THEMES } from '@/config/galaxyThemes'
import {
  GALAXY_TRANS_WARP_MS,
  GALAXY_TRANS_DECEL_MS,
  STAR_PHASE_DATA,
  RESCUE_ROTATION_DURATION_MS,
  ROLE_COLORS,
  MINIMAP_FLIGHTPATH_BEND,
  MINIMAP_COMET_HEAD_R,
  MINIMAP_COMET_TAIL_LEN,
  MINIMAP_COMET_TAIL_SEGMENTS,
  MINIMAP_IDLE_SUN_R,
  MINIMAP_TWINKLE_COUNT,
  MINIMAP_ZOOM_TRIGGER_MS,
  MINIMAP_ZOOM_MAX,
  MINIMAP_ZOOM_LERP,
  MINIMAP_ZOOM_OUT_LERP,
  MINIMAP_DEPARTURE_TRANSITION_MS,
  MINIMAP_LAYER2_WORLD_SCALE,
  MINIMAP_LAYER1_FADE,
  MINIMAP_LAYER2_FADE,
  MINIMAP_TARGET_BASE_R,
  MINIMAP_WAIT_SUN_R,
} from '@/config/constants'

const ARRIVAL_TRANSITION_MS = 900

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

const STAR_PALETTE = {
  base: '#e87820',
  shadow: '#5a1802',
  highlight: '#ffb860',
  atmo: 'rgba(240,140,30,0.6)',
  ring: false,
}

function rolePaletteFromRgb(r: number, g: number, b: number): typeof STAR_PALETTE {
  const h = (v: number) => v.toString(16).padStart(2, '0')
  return {
    base:      `#${h(r)}${h(g)}${h(b)}`,
    shadow:    `#${h(Math.round(r * 0.25))}${h(Math.round(g * 0.25))}${h(Math.round(b * 0.25))}`,
    highlight: `#${h(Math.min(255, Math.round(r * 0.6 + 102)))}${h(Math.min(255, Math.round(g * 0.6 + 102)))}${h(Math.min(255, Math.round(b * 0.6 + 102)))}`,
    atmo:      `rgba(${r}, ${g}, ${b}, 0.55)`,
    ring:      false,
  }
}

function rolePaletteFromHex(hex: string): typeof STAR_PALETTE {
  const n = parseInt(hex.slice(1), 16)
  return rolePaletteFromRgb((n >> 16) & 255, (n >> 8) & 255, n & 255)
}

const PLANET_PALETTES = [
  {
    base: '#d4723a',
    shadow: '#5a1a04',
    highlight: '#f4a870',
    atmo: 'rgba(220,100,40,0.5)',
    ring: false,
  },
  {
    base: '#5090d8',
    shadow: '#102860',
    highlight: '#90c8ff',
    atmo: 'rgba(70,140,240,0.45)',
    ring: false,
  },
  {
    base: '#42b850',
    shadow: '#0e3a14',
    highlight: '#80e888',
    atmo: 'rgba(50,200,70,0.4)',
    ring: false,
  },
  {
    base: '#9050d0',
    shadow: '#200850',
    highlight: '#c080ff',
    atmo: 'rgba(150,70,220,0.45)',
    ring: true,
  },
  {
    base: '#d04a14',
    shadow: '#480802',
    highlight: '#ff8040',
    atmo: 'rgba(220,80,20,0.5)',
    ring: false,
  },
  {
    base: '#38a8cc',
    shadow: '#0a2840',
    highlight: '#70d8ff',
    atmo: 'rgba(50,180,220,0.4)',
    ring: false,
  },
  {
    base: '#98cc3a',
    shadow: '#203808',
    highlight: '#ccff60',
    atmo: 'rgba(160,220,50,0.4)',
    ring: false,
  },
  {
    base: '#c89040',
    shadow: '#3a2004',
    highlight: '#ffcc70',
    atmo: 'rgba(210,160,50,0.4)',
    ring: true,
  },
  {
    base: '#e05888',
    shadow: '#500820',
    highlight: '#ff90c0',
    atmo: 'rgba(220,80,130,0.45)',
    ring: false,
  },
  {
    base: '#40c8a8',
    shadow: '#0a2c20',
    highlight: '#80ffe0',
    atmo: 'rgba(50,200,170,0.4)',
    ring: false,
  },
]

const PLANET_TYPE_PALETTES: Record<PlanetType, typeof STAR_PALETTE> = {
  'rocky':     { base: '#8a7060', shadow: '#2a1808', highlight: '#b8a090', atmo: 'rgba(130,100,80,0.4)',   ring: false },
  'ice':       { base: '#90c8f0', shadow: '#104060', highlight: '#d0f0ff', atmo: 'rgba(80,160,240,0.4)',  ring: false },
  'gas-giant': { base: '#c87941', shadow: '#4a2010', highlight: '#e8aa70', atmo: 'rgba(200,120,60,0.45)', ring: false },
  'lava':      { base: '#e05020', shadow: '#600800', highlight: '#ff8050', atmo: 'rgba(240,80,30,0.5)',   ring: false },
  'ocean':     { base: '#3080c0', shadow: '#082040', highlight: '#60c0f0', atmo: 'rgba(40,120,200,0.4)',  ring: false },
  'desert':    { base: '#c8a048', shadow: '#604010', highlight: '#f0d080', atmo: 'rgba(200,160,60,0.4)',  ring: false },
  'jungle':    { base: '#50a840', shadow: '#102808', highlight: '#90e870', atmo: 'rgba(60,180,50,0.4)',   ring: false },
  'ringed':    { base: '#9060c0', shadow: '#200840', highlight: '#c090f0', atmo: 'rgba(140,80,220,0.45)', ring: true  },
}

function drawPlanet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  state: 'unrescued' | 'rescued' | 'target',
  pulse = false,
  palOverride?: typeof STAR_PALETTE,
) {
  const rng = seededRng(seed >>> 0)
  const pal = palOverride ?? PLANET_PALETTES[Math.floor(rng() * PLANET_PALETTES.length)]
  const glowMult = state === 'target' ? (pulse ? 2.5 : 2.1) : state === 'rescued' ? 1.9 : 1.55
  const glowR = r * glowMult
  const atmoGrad = ctx.createRadialGradient(x, y, r * 0.7, x, y, glowR)
  if (state === 'rescued') {
    atmoGrad.addColorStop(0, 'rgba(255,210,50,0.55)')
    atmoGrad.addColorStop(0.55, 'rgba(255,170,20,0.18)')
    atmoGrad.addColorStop(1, 'rgba(255,140,0,0)')
  } else if (state === 'target') {
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

  if (pal.ring && state !== 'rescued') {
    ctx.save()
    ctx.globalAlpha = state === 'target' ? (pulse ? 0.78 : 0.62) : 0.48
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.75, r * 0.38, -0.28, 0, Math.PI * 2)
    ctx.strokeStyle = pal.highlight
    ctx.lineWidth = state === 'target' ? 2 : 1.3
    ctx.stroke()
    ctx.globalAlpha *= 0.5
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.42, r * 0.3, -0.28, 0, Math.PI * 2)
    ctx.lineWidth = 0.7
    ctx.stroke()
    ctx.restore()
  }

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
    ctx.moveTo(x - bd, y - bd + bs)
    ctx.lineTo(x - bd, y - bd)
    ctx.lineTo(x - bd + bs, y - bd)
    ctx.moveTo(x + bd - bs, y - bd)
    ctx.lineTo(x + bd, y - bd)
    ctx.lineTo(x + bd, y - bd + bs)
    ctx.moveTo(x + bd, y + bd - bs)
    ctx.lineTo(x + bd, y + bd)
    ctx.lineTo(x + bd - bs, y + bd)
    ctx.moveTo(x - bd + bs, y + bd)
    ctx.lineTo(x - bd, y + bd)
    ctx.lineTo(x - bd, y + bd - bs)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

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

/** Small pulsing sun marker (player origin / idle position) in the mock's gold palette. */
function drawMiniSun(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  nowMs: number,
) {
  const pulse = 0.5 + 0.5 * Math.sin(nowMs / 540)
  const glowR = r * (2.4 + 0.5 * pulse)
  const glow = ctx.createRadialGradient(x, y, r * 0.4, x, y, glowR)
  glow.addColorStop(0, `rgba(255, 180, 60, ${0.4 + 0.2 * pulse})`)
  glow.addColorStop(1, 'rgba(255, 180, 60, 0)')
  ctx.beginPath()
  ctx.arc(x, y, glowR, 0, Math.PI * 2)
  ctx.fillStyle = glow
  ctx.fill()

  const body = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r)
  body.addColorStop(0, '#fff6d8')
  body.addColorStop(0.58, '#ffcf5a')
  body.addColorStop(1, '#c8791f')
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = body
  ctx.fill()
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** Player sun rendered in its current phase palette (STAR_PHASE_DATA). */
function drawPhaseSun(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  phase: (typeof STAR_PHASE_DATA)[number],
  nowMs: number,
) {
  const pulseMs = (parseFloat(phase.pulseSpeed) * 1000) / (Math.PI * 2)
  const pulse = 0.5 + 0.5 * Math.sin(nowMs / pulseMs)

  // Outer corona
  const coroR = r * (3.2 + 0.4 * pulse)
  const outerCorona = ctx.createRadialGradient(x, y, r * 0.85, x, y, coroR)
  outerCorona.addColorStop(0, hexToRgba(phase.glow1, 0.32))
  outerCorona.addColorStop(0.5, hexToRgba(phase.glow2, 0.09))
  outerCorona.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.beginPath()
  ctx.arc(x, y, coroR, 0, Math.PI * 2)
  ctx.fillStyle = outerCorona
  ctx.fill()

  // Inner halo
  const innerHalo = ctx.createRadialGradient(x, y, r * 0.55, x, y, r * 2.2)
  innerHalo.addColorStop(0, hexToRgba(phase.core, 0.6))
  innerHalo.addColorStop(0.4, hexToRgba(phase.glow1, 0.22))
  innerHalo.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.beginPath()
  ctx.arc(x, y, r * 2.2, 0, Math.PI * 2)
  ctx.fillStyle = innerHalo
  ctx.fill()

  // Body
  const bodyGrad = ctx.createRadialGradient(x - r * 0.28, y - r * 0.3, r * 0.05, x, y, r)
  bodyGrad.addColorStop(0, phase.core)
  bodyGrad.addColorStop(0.5, phase.mid)
  bodyGrad.addColorStop(1, phase.edge)
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = bodyGrad
  ctx.fill()

  // Rim highlight
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(255,255,220,${(0.35 + 0.15 * pulse).toFixed(3)})`
  ctx.lineWidth = 1.2
  ctx.stroke()
}

function smoothstep(v: number, a: number, b: number): number {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export default defineComponent({
  name: 'MiniMapCanvas',
  setup() {
    const galaxyStore = useGalaxyStore()
    const gameStore = useGameStore()
    const starGroupStore = useStarGroupStore()
    const planetBossStore = usePlanetBossStore()
    const solarUpgradeStore = useSolarUpgradeStore()

    const championImageCache = new Map<string, HTMLImageElement>()

    function getOrLoadChampionImage(name: string): HTMLImageElement | null {
      if (championImageCache.has(name)) return championImageCache.get(name)!
      const img = new Image()
      img.src = `/img/champion/${name}.jpg`
      img.onload = () => championImageCache.set(name, img)
      return null
    }

    const canvasEl = ref<HTMLCanvasElement | null>(null)
    const imgFarEl = ref<HTMLImageElement | null>(null)
    const imgNearEl = ref<HTMLImageElement | null>(null)
    const dotPositions = ref<DotPos[]>([])
    const rescueOrder = ref<number[]>([])
    const spawnPos = ref<DotPos>({ x: 0.5, y: 0.5 })

    let rafId: number | null = null
    let pulseFrame = 0
    let rafLastPulseMs = 0

    // Camera (world-space center + zoom). zoom 1 = whole galaxy visible;
    // during the final travel phase it eases toward the destination star.
    const camera = { x: 0.5, y: 0.5, zoom: 1 }

    let hyperspacePhase: HyperspacePhase = 'idle'
    let hyperspacePhaseStart = 0
    let hyperspaceTimeouts: number[] = []
    let warpLastFrameMs = 0
    let warpParticles: WarpParticle[] = []
    let arrivalTransitionStart = -1
    let departureTransitionStart = -1

    const show = computed(
      () =>
        galaxyStore.pendingRoleSelection ||
        galaxyStore.isRescueRotating ||
        ((galaxyStore.championTravelState === 'traveling' ||
          galaxyStore.championTravelState === 'champion_available' ||
          galaxyStore.championTravelState === 'champion_spawned') &&
          !galaxyStore.pendingGalaxyBoss &&
          !galaxyStore.isComplete) ||
        galaxyStore.isBossSearchActive ||
        galaxyStore.pendingGalaxyBoss ||
        galaxyStore.isGalaxyTransitioning ||
        galaxyStore.isComplete,
    )

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
      if (galaxyStore.isBossSearchActive) return galaxyStore.bossSearchInterpolatedPos
      if (galaxyStore.isRescueRotating) {
        if (rescued > 0) return dots[order[rescued - 1]]
        return spawnPos.value
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
      const img = imgFarEl.value
      if (!img || !img.complete) return
      const dots = dotPositions.value
      const order = rescueOrder.value
      const rescued = Math.min(galaxyStore.starsRescued, dots.length)
      const isTraveling = galaxyStore.championTravelState === 'traveling'
      const nowMs = Date.now()
      const targetIdx = rescued < dots.length ? order[rescued] : -1

      // Static map with a soft camera: world coords (0..1) map onto the
      // canvas relative to the camera center + zoom (no rotation). At
      // zoom 1 / center (0.5, 0.5) the whole galaxy is visible; the base
      // stays transparent so the unified bar background shows through.
      const cam = camera
      function wToC(wx: number, wy: number): [number, number] {
        return [w / 2 + (wx - cam.x) * w * cam.zoom, h / 2 + (wy - cam.y) * h * cam.zoom]
      }

      // Layered zoom: layer 1 (far overview) fades out while layer 2
      // (deep star field anchored on the target star) fades in beneath it.
      const farAlpha = 1 - smoothstep(cam.zoom, MINIMAP_LAYER1_FADE[0], MINIMAP_LAYER1_FADE[1])
      const nearAlpha = smoothstep(cam.zoom, MINIMAP_LAYER2_FADE[0], MINIMAP_LAYER2_FADE[1])

      // Layer 1 — galaxy overview sprite, centered on world 0.5/0.5
      if (farAlpha > 0.01) {
        const iw = img.naturalWidth || img.width
        const ih = img.naturalHeight || img.height
        if (iw > 0 && ih > 0) {
          const cover = Math.max(w / iw, h / ih) * 1.08
          const dw = iw * cover * cam.zoom
          const dh = ih * cover * cam.zoom
          const [gx, gy] = wToC(0.5, 0.5)
          ctx.globalAlpha = 0.9 * farAlpha
          ctx.drawImage(img, gx - dw / 2, gy - dh / 2, dw, dh)
          ctx.globalAlpha = 1
        }
      }

      // Layer 2 — deep star field growing out of the destination
      const nearImg = imgNearEl.value
      if (nearAlpha > 0.01 && nearImg && nearImg.complete) {
        const niw = nearImg.naturalWidth || nearImg.width
        const nih = nearImg.naturalHeight || nearImg.height
        if (niw > 0 && nih > 0) {
          const anchor = targetIdx >= 0 ? dots[targetIdx] : { x: 0.5, y: 0.5 }
          const coverN = Math.max(w / niw, h / nih) * 1.08 * MINIMAP_LAYER2_WORLD_SCALE
          const dw = niw * coverN * cam.zoom
          const dh = nih * coverN * cam.zoom
          const [gx, gy] = wToC(anchor.x, anchor.y)
          ctx.globalAlpha = 0.92 * nearAlpha
          ctx.drawImage(nearImg, gx - dw / 2, gy - dh / 2, dw, dh)
          ctx.globalAlpha = 1
        }
      }

      const theme = GALAXY_THEMES[galaxyStore.currentThemeIndex % GALAXY_THEMES.length]
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = theme.nebulaColors[0].replace(/,\s*[\d.]+\)/, ', 0.18)')
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'

      // Seeded twinkling background stars
      const twRng = seededRng(galaxyStore.currentGalaxy * 52361 + 7)
      for (let i = 0; i < MINIMAP_TWINKLE_COUNT; i++) {
        const tx = twRng() * w
        const ty = twRng() * h
        const phase = twRng() * Math.PI * 2
        const period = 2200 + twRng() * 2600
        const size = 0.8 + twRng() * 1.0
        const tint = twRng()
        const a = 0.2 + 0.55 * (0.5 + 0.5 * Math.sin((nowMs / period) * Math.PI * 2 + phase))
        ctx.beginPath()
        ctx.arc(tx, ty, size, 0, Math.PI * 2)
        ctx.fillStyle =
          tint < 0.33
            ? `rgba(255, 233, 176, ${a.toFixed(3)})`
            : tint < 0.66
              ? `rgba(207, 224, 255, ${a.toFixed(3)})`
              : `rgba(255, 255, 255, ${a.toFixed(3)})`
        ctx.fill()
      }

      if (rescued >= 2 && farAlpha > 0.01) {
        ctx.save()
        ctx.globalAlpha = farAlpha
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
        ctx.restore()
      }

      // Current flight leg as a curved, dashed gold path (origin → next star)
      let flight: {
        x0: number
        y0: number
        cx: number
        cy: number
        x2: number
        y2: number
      } | null = null
      if (targetIdx >= 0 && isTraveling) {
        const from = rescued > 0 ? dots[order[rescued - 1]] : spawnPos.value
        const [x0, y0] = wToC(from.x, from.y)
        const [x2, y2] = wToC(dots[targetIdx].x, dots[targetIdx].y)
        const dx = x2 - x0
        const dy = y2 - y0
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > 1) {
          const bend = len * MINIMAP_FLIGHTPATH_BEND
          const cx = (x0 + x2) / 2 - (dy / len) * bend
          const cy = (y0 + y2) / 2 + (dx / len) * bend
          flight = { x0, y0, cx, cy, x2, y2 }
          ctx.beginPath()
          ctx.setLineDash([4, 7])
          ctx.lineDashOffset = -((nowMs / 55) % 11)
          ctx.strokeStyle = 'rgba(255, 210, 120, 0.4)'
          ctx.lineWidth = 2
          ctx.lineCap = 'round'
          ctx.moveTo(x0, y0)
          ctx.quadraticCurveTo(cx, cy, x2, y2)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.lineDashOffset = 0
        }
      }

      // Overview markers belong to layer 1 → fade with the far layer
      const rescuedSet = new Set(order.slice(0, rescued))
      const galaxySeed = galaxyStore.currentGalaxy * 10007
      if (farAlpha > 0.01) {
        ctx.save()
        ctx.globalAlpha = farAlpha
        for (let i = 0; i < dots.length; i++) {
          if (rescuedSet.has(i)) continue
          if (targetIdx === i) continue
          const [sx, sy] = wToC(dots[i].x, dots[i].y)
          drawPlanet(ctx, sx, sy, 9, galaxySeed + i, 'unrescued', false, STAR_PALETTE)
        }
        for (let i = 0; i < rescued; i++) {
          const [sx, sy] = wToC(dots[order[i]].x, dots[order[i]].y)
          drawPlanet(ctx, sx, sy, 11, galaxySeed + order[i], 'rescued')
        }
        ctx.restore()
      }

      if (galaxyStore.needsFinalBoss && !galaxyStore.isBossSearchActive && farAlpha > 0.01) {
        ctx.save()
        ctx.globalAlpha = farAlpha
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
        ctx.restore()
      }

      if (targetIdx >= 0 && isTraveling) {
        const [tx, ty] = wToC(dots[targetIdx].x, dots[targetIdx].y)
        const champStar = starGroupStore.activeStars.find((s) => s.starType === 'champion')
        const nextRole = galaxyStore.nextStarRole
        let targetPal: typeof STAR_PALETTE = STAR_PALETTE
        if (champStar) {
          targetPal = rolePaletteFromRgb(...champStar.starColor)
        } else if (nextRole && ROLE_COLORS[nextRole]) {
          targetPal = rolePaletteFromHex(ROLE_COLORS[nextRole])
        }
        // the destination grows with the camera zoom so the full zoom-in
        // hands over seamlessly to the arrival star (≈ ARRIVAL_STAR_R)
        const targetR = MINIMAP_TARGET_BASE_R * cam.zoom
        drawPlanet(
          ctx,
          tx,
          ty,
          targetR,
          galaxySeed + targetIdx,
          'target',
          pulseFrame === 1,
          targetPal,
        )

        // Expanding beacon rings in the destination's role color — draws the
        // eye more reliably than a text label and scales with the zoom
        for (let ring = 0; ring < 2; ring++) {
          const ringT = (nowMs / 1800 + ring / 2) % 1
          const ringR = targetR * (1.3 + ringT * 1.6)
          const ringA = (1 - ringT) * 0.45
          ctx.beginPath()
          ctx.arc(tx, ty, ringR, 0, Math.PI * 2)
          ctx.strokeStyle = hexToRgba(targetPal.base, ringA)
          ctx.lineWidth = 1.6
          ctx.stroke()
        }
      }

      if (galaxyStore.isBossSearchActive) {
        // Purple search marker at the interpolated search position
        const searchPos = galaxyStore.bossSearchInterpolatedPos
        const [bx, by] = wToC(searchPos.x, searchPos.y)
        const pulse = 0.6 + 0.4 * Math.sin(nowMs / 400)
        for (const [r, a] of [
          [20, 0.08 * pulse],
          [14, 0.18 * pulse],
          [10, 0.28 * pulse],
        ] as [number, number][]) {
          ctx.beginPath()
          ctx.arc(bx, by, r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(120,80,255,${a})`
          ctx.fill()
        }
        ctx.beginPath()
        ctx.arc(bx, by, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#2a0f6a'
        ctx.fill()
        ctx.strokeStyle = `rgba(160,110,255,${0.8 + 0.2 * pulse})`
        ctx.lineWidth = 1.8
        ctx.stroke()
        ctx.font = 'bold 10px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = `rgba(200,160,255,${0.75 + 0.25 * pulse})`
        ctx.shadowColor = 'rgba(140,80,255,0.9)'
        ctx.shadowBlur = 8
        ctx.fillText('?', bx, by)
        ctx.shadowBlur = 0
      } else if (flight) {
        // Player comet travelling along the quadratic flight path:
        // glowing white-gold head + tapering tail along the flown route
        const startTime = galaxyStore.championTravelStartTime
        const duration = galaxyStore.championTravelDurationMs
        const t =
          startTime > 0 && duration > 0 ? Math.min((nowMs - startTime) / duration, 1) : 0
        const qx = (tt: number) => {
          const m = 1 - tt
          return m * m * flight.x0 + 2 * m * tt * flight.cx + tt * tt * flight.x2
        }
        const qy = (tt: number) => {
          const m = 1 - tt
          return m * m * flight.y0 + 2 * m * tt * flight.cy + tt * tt * flight.y2
        }

        // Tail: sample the curve backwards from the current position
        const legLen = Math.hypot(flight.x2 - flight.x0, flight.y2 - flight.y0)
        const tailT =
          legLen > 1
            ? Math.min(t, (MINIMAP_COMET_TAIL_LEN * Math.sqrt(cam.zoom)) / legLen)
            : 0
        if (tailT > 0.0001) {
          ctx.lineCap = 'round'
          for (let i = MINIMAP_COMET_TAIL_SEGMENTS; i >= 1; i--) {
            const f1 = i / MINIMAP_COMET_TAIL_SEGMENTS
            const f0 = (i - 1) / MINIMAP_COMET_TAIL_SEGMENTS
            const t1 = Math.max(0, t - tailT * f1)
            const t0 = Math.max(0, t - tailT * f0)
            const nearHead = 1 - f1
            ctx.beginPath()
            ctx.strokeStyle = `rgba(255, 214, 120, ${(nearHead * 0.85).toFixed(3)})`
            ctx.lineWidth = 0.4 + nearHead * 2.8
            ctx.shadowColor = 'rgba(255, 190, 80, 0.6)'
            ctx.shadowBlur = nearHead * 5
            ctx.moveTo(qx(t1), qy(t1))
            ctx.lineTo(qx(t0), qy(t0))
            ctx.stroke()
          }
          ctx.shadowBlur = 0
        }

        // Head: hot white core with warm gold glow
        const hx = qx(t)
        const hy = qy(t)
        const headR = MINIMAP_COMET_HEAD_R * Math.sqrt(cam.zoom)
        const headGlow = ctx.createRadialGradient(hx, hy, 0, hx, hy, headR * 3.2)
        headGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
        headGlow.addColorStop(0.35, 'rgba(255, 216, 112, 0.65)')
        headGlow.addColorStop(1, 'rgba(255, 190, 80, 0)')
        ctx.beginPath()
        ctx.arc(hx, hy, headR * 3.2, 0, Math.PI * 2)
        ctx.fillStyle = headGlow
        ctx.fill()
        ctx.beginPath()
        ctx.arc(hx, hy, headR, 0, Math.PI * 2)
        ctx.fillStyle = '#fff8e8'
        ctx.fill()
      } else if (!galaxyStore.isRescueRotating && !galaxyStore.pendingRoleSelection) {
        // Idle: player-sun at the current position (the waiting screen draws
        // its own departure beacon at the flight origin instead)
        const player = getPlayerWorldPos(dots, order, rescued)
        const [px, py] = wToC(player.x, player.y)
        drawMiniSun(ctx, px, py, MINIMAP_IDLE_SUN_R, nowMs)
      }
    }

    function drawChampionPortrait(
      ctx: CanvasRenderingContext2D,
      px: number,
      py: number,
      r: number,
      slot: { planetId?: string; isChampionPlanet?: boolean },
      alpha: number,
    ) {
      if (!slot.isChampionPlanet || !slot.planetId) return
      const boss = planetBossStore.activeBosses.find((b) => b.planetId === slot.planetId)
      if (!boss?.homePlanetChampion) return
      const img = getOrLoadChampionImage(boss.homePlanetChampion)
      if (!img) return
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(px, py, r * 0.88, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(img, px - r, py - r, r * 2, r * 2)
      ctx.restore()
      // gold ring around champion planet
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.strokeStyle = '#e8c040'
      ctx.lineWidth = 1.2
      ctx.shadowColor = 'rgba(232,192,64,0.8)'
      ctx.shadowBlur = 4
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.restore()
    }

    function drawArrivalView(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const cx = w / 2
      const cy = h / 2
      const nowMs = Date.now()

      // Deep-space glow that fades out toward the edges so the unified
      // bar background stays visible around the star system
      const space = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.62)
      space.addColorStop(0, 'rgba(6, 4, 14, 0.88)')
      space.addColorStop(0.72, 'rgba(6, 4, 14, 0.5)')
      space.addColorStop(1, 'rgba(6, 4, 14, 0)')
      ctx.fillStyle = space
      ctx.fillRect(0, 0, w, h)

      // Seeded background star field
      const bgRng = seededRng(galaxyStore.currentGalaxy * 77771)
      for (let i = 0; i < 60; i++) {
        const bx = bgRng() * w
        const by = bgRng() * h
        const br = 0.5 + bgRng() * 0.7
        const ba = 0.2 + bgRng() * 0.4
        const bc = 180 + Math.floor(bgRng() * 75)
        ctx.beginPath()
        ctx.arc(bx, by, br, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${bc}, ${bc + 10}, 255, ${ba.toFixed(2)})`
        ctx.fill()
      }

      // Star color from store (RGB 0-255)
      const championStar = starGroupStore.activeStars.find((s) => s.starType === 'champion')
      const [sr, sg, sb] = championStar?.starColor ?? [255, 160, 60]

      // Hover state — drives visual enhancements
      const isHovered = !!championStar && starGroupStore.hoveredTimerStarId === championStar.id
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const hoverGlowMult = isHovered ? 1.18 : 1.0
      const hoverBodyMult = isHovered ? 1.06 : 1.0
      const hoverBlurMult = isHovered ? 1.35 : 1.0
      const hoverAlphaBoost = isHovered ? 0.12 : 0.0
      const hoverSpeedMult = isHovered && !reducedMotion ? 1.55 : 1.0
      const hoverPlanetAlpha = isHovered ? 0.62 : 0.45

      // Pulse animation
      const pulse = 0.5 + 0.5 * Math.sin(nowMs / 900)
      const ARRIVAL_STAR_R = 46

      // Outer corona (large diffuse glow)
      const coroR = ARRIVAL_STAR_R * (3.6 + 0.4 * pulse) * hoverGlowMult
      const outerCorona = ctx.createRadialGradient(cx, cy, ARRIVAL_STAR_R * 0.85, cx, cy, coroR)
      outerCorona.addColorStop(0, `rgba(${sr}, ${sg}, ${sb}, ${0.28 + hoverAlphaBoost})`)
      outerCorona.addColorStop(0.45, `rgba(${sr}, ${Math.max(0, sg - 40)}, 0, ${0.08 + hoverAlphaBoost * 0.5})`)
      outerCorona.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.beginPath()
      ctx.arc(cx, cy, coroR, 0, Math.PI * 2)
      ctx.fillStyle = outerCorona
      ctx.fill()

      // Inner halo (tighter, warmer)
      const innerHalo = ctx.createRadialGradient(
        cx,
        cy,
        ARRIVAL_STAR_R * 0.6,
        cx,
        cy,
        ARRIVAL_STAR_R * 2.2,
      )
      innerHalo.addColorStop(0, 'rgba(255, 230, 190, 0.6)')
      innerHalo.addColorStop(0.4, `rgba(${sr}, ${sg}, ${sb}, ${0.25 + hoverAlphaBoost})`)
      innerHalo.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.beginPath()
      ctx.arc(cx, cy, ARRIVAL_STAR_R * 2.2, 0, Math.PI * 2)
      ctx.fillStyle = innerHalo
      ctx.fill()

      // Build planet slot list
      const galaxySeed = galaxyStore.currentGalaxy * 10007
      const rawSlots = championStar?.planetSlots.filter((s) => !s.cleared) ?? []

      type ArrivalSlot = {
        orbitDirection: 1 | -1
        planetId?: string
        type?: PlanetType
        isChampionPlanet?: boolean
      }
      let slots: ArrivalSlot[]
      if (rawSlots.length > 0) {
        slots = (rawSlots as StarPlanetSlot[]).map((s) => ({
          orbitDirection: s.orbitDirection,
          planetId: s.planetId,
          type: s.type,
          isChampionPlanet: s.isChampionPlanet,
        }))
      } else {
        const previewRng = seededRng(
          galaxyStore.currentGalaxy * 997 + galaxyStore.starsRescued * 31,
        )
        const previewCount = 3 + Math.floor(previewRng() * 2)
        slots = Array.from({ length: previewCount }, () => ({
          orbitDirection: (previewRng() < 0.5 ? 1 : -1) as 1 | -1,
        }))
      }

      // Compute planet positions for this frame (speed boosted when hovered)
      const planetData = slots.map((slot, idx) => {
        const isChamp = slot.isChampionPlanet ?? false
        const planetR = isChamp ? 18 : 6 + idx * 2.5

        const orbitRx = ARRIVAL_STAR_R + 28 + idx * 26
        const orbitRy = orbitRx * 0.48

        // Sync with main UI: read live angle from useStarSystem; fallback to time-based
        const liveAngle = slot.planetId ? livePlanetAngles.get(slot.planetId) : undefined
        let angle: number
        if (liveAngle !== undefined) {
          angle = liveAngle
        } else {
          const speed = slot.orbitDirection * (0.32 + idx * 0.15) * hoverSpeedMult
          angle = (nowMs / 1000) * speed + idx * Math.PI * 0.67
        }

        return {
          px: cx + Math.cos(angle) * orbitRx,
          py: cy + Math.sin(angle) * orbitRy,
          orbitRx,
          orbitRy,
          planetR,
          idx,
        }
      })

      // Orbit ellipses (dashed, subtle — slightly more visible when hovered)
      planetData.forEach(({ orbitRx, orbitRy }) => {
        ctx.save()
        ctx.globalAlpha = isHovered ? 0.18 : 0.1
        ctx.beginPath()
        ctx.ellipse(cx, cy, orbitRx, orbitRy, 0, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(140, 160, 220, 1)'
        ctx.lineWidth = 0.7
        ctx.setLineDash([3, 5])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      })

      // Behind-planets (py < cy) drawn first at reduced opacity (brighter when hovered)
      planetData.forEach(({ px, py, planetR, idx }) => {
        if (py >= cy) return
        const slot = slots[idx]
        const typePal = slot.type ? PLANET_TYPE_PALETTES[slot.type] : undefined
        ctx.save()
        ctx.globalAlpha = hoverPlanetAlpha
        drawPlanet(ctx, px, py, planetR, galaxySeed + idx * 17, 'unrescued', false, typePal)
        ctx.restore()
        drawChampionPortrait(ctx, px, py, planetR, slot, hoverPlanetAlpha)
      })

      // Star body (on top of behind-planets, below foreground-planets)
      const pulseGlow = (1 + 0.12 * pulse) * hoverBodyMult
      const bodyGrad = ctx.createRadialGradient(
        cx - ARRIVAL_STAR_R * 0.28,
        cy - ARRIVAL_STAR_R * 0.25,
        2,
        cx,
        cy,
        ARRIVAL_STAR_R * pulseGlow,
      )
      bodyGrad.addColorStop(0, '#fff8f0')
      bodyGrad.addColorStop(
        0.22,
        `rgb(${Math.min(255, sr + 30)}, ${Math.min(255, sg + 15)}, ${sb})`,
      )
      bodyGrad.addColorStop(0.65, `rgb(${sr}, ${sg}, ${Math.max(0, sb - 20)})`)
      bodyGrad.addColorStop(1, `rgb(${Math.max(0, sr - 90)}, ${Math.max(0, sg - 70)}, 0)`)
      ctx.shadowColor = `rgba(${sr}, ${sg}, ${sb}, 0.9)`
      ctx.shadowBlur = ARRIVAL_STAR_R * (1.6 + 0.3 * pulse) * hoverBlurMult
      ctx.beginPath()
      ctx.arc(cx, cy, ARRIVAL_STAR_R * pulseGlow, 0, Math.PI * 2)
      ctx.fillStyle = bodyGrad
      ctx.fill()
      ctx.shadowBlur = 0

      // Foreground planets (py >= cy) at full opacity
      planetData.forEach(({ px, py, planetR, idx }) => {
        if (py < cy) return
        const slot = slots[idx]
        const typePal = slot.type ? PLANET_TYPE_PALETTES[slot.type] : undefined
        drawPlanet(ctx, px, py, planetR, galaxySeed + idx * 17, 'unrescued', false, typePal)
        drawChampionPortrait(ctx, px, py, planetR, slot, 1)
      })

    }

    function drawRotationTransition(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const nowMs = Date.now()
      const elapsed = Math.max(0, nowMs - galaxyStore.rescueRotationStartTime)
      const t = Math.min(elapsed / RESCUE_ROTATION_DURATION_MS, 1)
      const te = easeInOut(t)

      // The galaxy map stays visible throughout — the waiting screen already
      // shows it. The player sun glides from the center to the flight origin,
      // shrinking down to the small departure marker while launch streaks fire.
      drawNormalMap(ctx, w, h)

      if (te < 0.99) {
        const fade = 1 - te
        const origin = getFlightOrigin()
        const bx = w / 2 + (origin.x * w - w / 2) * te
        const by = h / 2 + (origin.y * h - h / 2) * te
        const sunR = MINIMAP_WAIT_SUN_R + (MINIMAP_IDLE_SUN_R - MINIMAP_WAIT_SUN_R) * te

        // Contrast scrim fades out as the sun docks at its departure point
        drawSunScrim(ctx, bx, by, sunR, fade)

        const phase = STAR_PHASE_DATA[solarUpgradeStore.starPhase] ?? STAR_PHASE_DATA[0]
        drawPhaseSun(ctx, bx, by, sunR, phase, nowMs)

        // Radial launch streaks (grow longer as t increases, then fade out)
        const numStreaks = 8
        const streakBaseLen = sunR * (1.2 + te * 5)
        const streakAlpha = te * 0.55 * fade
        const streakOffset = galaxyStore.rescueRotationDirection * te * Math.PI * 0.5
        for (let i = 0; i < numStreaks; i++) {
          const angle = (i / numStreaks) * Math.PI * 2 + streakOffset
          const startR = sunR * 1.15
          const endR = startR + streakBaseLen
          const sx = bx + Math.cos(angle) * startR
          const sy = by + Math.sin(angle) * startR
          const ex = bx + Math.cos(angle) * endR
          const ey = by + Math.sin(angle) * endR
          const grad = ctx.createLinearGradient(sx, sy, ex, ey)
          grad.addColorStop(0, `rgba(255, 210, 120, ${streakAlpha.toFixed(3)})`)
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.beginPath()
          ctx.strokeStyle = grad
          ctx.lineWidth = 1.2
          ctx.moveTo(sx, sy)
          ctx.lineTo(ex, ey)
          ctx.stroke()
        }
      }
    }

    /** World position the next flight departs from (last rescued star or spawn). */
    function getFlightOrigin(): DotPos {
      const dots = dotPositions.value
      const order = rescueOrder.value
      const rescued = Math.min(galaxyStore.starsRescued, dots.length)
      return rescued > 0 ? dots[order[rescued - 1]] : spawnPos.value
    }

    /** Dark radial scrim behind the sun so it stays readable on the golden
     *  galaxy sprite (yellow-on-yellow contrast fix). */
    function drawSunScrim(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      r: number,
      alpha: number,
    ) {
      const scrim = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5)
      scrim.addColorStop(0, `rgba(6, 4, 14, ${(0.65 * alpha).toFixed(3)})`)
      scrim.addColorStop(0.6, `rgba(6, 4, 14, ${(0.42 * alpha).toFixed(3)})`)
      scrim.addColorStop(1, 'rgba(6, 4, 14, 0)')
      ctx.beginPath()
      ctx.arc(x, y, r * 3.5, 0, Math.PI * 2)
      ctx.fillStyle = scrim
      ctx.fill()
    }

    function drawWaitingState(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const nowMs = Date.now()
      const cx = w / 2
      const cy = h / 2

      // The galaxy overview IS the waiting screen — the flight departs from
      // here once a role is chosen ("Choose your Role" label is a DOM overlay).
      drawNormalMap(ctx, w, h)

      // Centered player sun in its current phase state, on a dark scrim
      drawSunScrim(ctx, cx, cy, MINIMAP_WAIT_SUN_R, 1)

      // Expanding gold ripple rings — "waiting for input" beacon
      for (let ring = 0; ring < 3; ring++) {
        const rippleT = (nowMs / 2200 + ring / 3) % 1
        const rippleR = MINIMAP_WAIT_SUN_R * (1.5 + rippleT * 2.5)
        const rippleA = (1 - rippleT) * 0.3
        ctx.beginPath()
        ctx.arc(cx, cy, rippleR, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(232,192,64,${rippleA.toFixed(3)})`
        ctx.lineWidth = 1.4
        ctx.stroke()
      }

      const phase = STAR_PHASE_DATA[solarUpgradeStore.starPhase] ?? STAR_PHASE_DATA[0]
      drawPhaseSun(ctx, cx, cy, MINIMAP_WAIT_SUN_R, phase, nowMs)
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
      if (galaxyStore.pendingRoleSelection) {
        drawWaitingState(ctx, w, h)
        return
      }
      if (galaxyStore.isRescueRotating) {
        drawRotationTransition(ctx, w, h)
        return
      }
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
      const img = imgFarEl.value
      if (!img || !img.complete) return

      const isArrived =
        galaxyStore.championTravelState === 'champion_available' ||
        galaxyStore.championTravelState === 'champion_spawned'
      if (isArrived) {
        const elapsed =
          arrivalTransitionStart >= 0
            ? Date.now() - arrivalTransitionStart
            : ARRIVAL_TRANSITION_MS
        const t = easeInOut(Math.min(1, elapsed / ARRIVAL_TRANSITION_MS))
        if (t < 1) {
          drawNormalMap(ctx, w, h)
          ctx.save()
          ctx.globalAlpha = t
          drawArrivalView(ctx, w, h)
          ctx.restore()
        } else {
          drawArrivalView(ctx, w, h)
        }
        return
      }

      // Departure crossfade: star system fades out over the (still zoomed-in)
      // galaxy map — the camera then glides back out through layer 2.
      if (departureTransitionStart >= 0) {
        const elapsed = Date.now() - departureTransitionStart
        if (elapsed < MINIMAP_DEPARTURE_TRANSITION_MS) {
          const t = easeInOut(Math.min(1, elapsed / MINIMAP_DEPARTURE_TRANSITION_MS))
          drawNormalMap(ctx, w, h)
          ctx.save()
          ctx.globalAlpha = 1 - t
          drawArrivalView(ctx, w, h)
          ctx.restore()
          return
        }
        departureTransitionStart = -1
      }

      drawNormalMap(ctx, w, h)
    }

    function updateCamera() {
      // Desired camera per frame: full galaxy by default; during the final
      // MINIMAP_ZOOM_TRIGGER_MS of a flight ease onto the destination star so
      // the camera is fully zoomed exactly at arrival 0:00. After clearing a
      // star the same lerp glides back out to the whole galaxy.
      let dz = 1
      let dx = 0.5
      let dy = 0.5

      const dots = dotPositions.value
      const order = rescueOrder.value
      const rescued = Math.min(galaxyStore.starsRescued, dots.length)
      const targetIdx = rescued < dots.length ? order[rescued] : -1
      const target = targetIdx >= 0 ? dots[targetIdx] : null
      const isArrived =
        galaxyStore.championTravelState === 'champion_available' ||
        galaxyStore.championTravelState === 'champion_spawned'
      const isBossPhase =
        galaxyStore.searchingForGalaxyBoss ||
        galaxyStore.needsFinalBoss ||
        galaxyStore.pendingGalaxyBoss

      if (isArrived && target) {
        dz = MINIMAP_ZOOM_MAX
        dx = target.x
        dy = target.y
      } else if (
        galaxyStore.championTravelState === 'traveling' &&
        !isBossPhase &&
        target
      ) {
        const remaining = galaxyStore.travelRemainingMs
        if (remaining <= MINIMAP_ZOOM_TRIGGER_MS) {
          const tz = easeInOut(
            Math.max(0, Math.min(1, 1 - remaining / MINIMAP_ZOOM_TRIGGER_MS)),
          )
          dz = 1 + (MINIMAP_ZOOM_MAX - 1) * tz
          dx = 0.5 + (target.x - 0.5) * tz
          dy = 0.5 + (target.y - 0.5) * tz
        }
      }

      // Zoom out noticeably slower than in, so the layer-2 star field stays
      // readable for a moment on the way back to the galaxy overview
      const lerp = dz < camera.zoom ? MINIMAP_ZOOM_OUT_LERP : MINIMAP_ZOOM_LERP
      camera.zoom += (dz - camera.zoom) * lerp
      camera.x += (dx - camera.x) * lerp
      camera.y += (dy - camera.y) * lerp
    }

    function rafTick(timestamp: number) {
      if (timestamp - rafLastPulseMs > 600) {
        pulseFrame = pulseFrame === 0 ? 1 : 0
        rafLastPulseMs = timestamp
      }
      updateCamera()
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
      () => generateDots(),
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

    const { isRenderingPaused } = useRenderingPaused()

    watch(isRenderingPaused, (paused) => {
      if (paused) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
      } else if (show.value && rafId === null) {
        rafLastPulseMs = 0
        rafId = requestAnimationFrame(rafTick)
      }
    })

    watch(
      () => galaxyStore.isGalaxyTransitioning,
      (active) => {
        if (!active) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const canvas = canvasEl.value
        const w = canvas?.offsetWidth ?? 440
        const h = canvas?.offsetHeight ?? 440
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
            camera.x = 0.5
            camera.y = 0.5
            camera.zoom = 1
            departureTransitionStart = -1
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
        const w = canvas?.offsetWidth ?? 440
        const h = canvas?.offsetHeight ?? 440
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
            camera.x = 0.5
            camera.y = 0.5
            camera.zoom = 1
          }, 3500),
        )
      },
    )

    watch(
      () => galaxyStore.championTravelState,
      (state, prevState) => {
        const arrived = state === 'champion_available' || state === 'champion_spawned'
        const wasArrived =
          prevState === 'champion_available' || prevState === 'champion_spawned'
        if (arrived && arrivalTransitionStart === -1) {
          arrivalTransitionStart = Date.now()
          departureTransitionStart = -1
        } else if (!arrived) {
          arrivalTransitionStart = -1
          // leaving the star system → crossfade back onto the galaxy map
          if (wasArrived) departureTransitionStart = Date.now()
        }
      },
    )

    onMounted(() => {
      nextTick(() => {
        if (imgFarEl.value?.complete) drawCanvas()
      })
    })

    onUnmounted(() => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      for (const id of hyperspaceTimeouts) window.clearTimeout(id)
      hyperspaceTimeouts = []
      arrivalTransitionStart = -1
      departureTransitionStart = -1
    })

    return { canvasEl, imgFarEl, imgNearEl, onImageLoad }
  },
})
</script>

<style scoped>
.map-canvas {
  display: block;
  width: 100%;
  height: 100%;
  /* Canvas erbt den clip-path des Wrappers – keine eigene Rundung nötig */
}

.minimap-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* very soft edge shading only — the unified bar background must stay
     recognizable across the whole minimap area */
  background: radial-gradient(ellipse at center, transparent 58%, rgba(0, 0, 0, 0.22) 100%);
}
</style>
