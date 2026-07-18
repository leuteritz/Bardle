<template>
  <canvas ref="canvasEl" class="map-canvas" />
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import { resetCanvasIfContextLost } from '@/utils/canvasContext'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useGameStore } from '@/stores/gameStore'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { livePlanetAngles } from '@/composables/useStarSystem'
import type { StarPlanetSlot } from '@/stores/starGroupStore'
import type { PlanetType } from '@/types'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
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
  MINIMAP_GALAXY_FADE,
  MINIMAP_NEARFIELD_FADE,
  MINIMAP_NEARFIELD_STARS,
  MINIMAP_NEARFIELD_SPREAD,
  MINIMAP_TARGET_BASE_R,
  MINIMAP_TARGET_MAX_R,
  MINIMAP_WAIT_SUN_R,
  MINIMAP_GALAXY_CORE_RADIUS,
} from '@/config/constants'
import {
  seededRng,
  type DotPos,
  galaxyGeo,
  galaxyPlaneToWorld,
  getGalaxyParticles,
  GALAXY_PARTICLE_COLORS,
  minimapAccentForTheme,
  STAR_PALETTE,
  drawPlanet,
  generateGalaxyDots,
} from './minimapGalaxyGeometry'

const ARRIVAL_TRANSITION_MS = 900

/**
 * "You are here" player signature: stars are filled dots, only the player
 * carries gold rings — a crisp pulsing ring plus an expanding gold ping
 * (tighter and gold, so it never reads as the role-colored target beacon).
 */
function drawPlayerRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  nowMs: number,
) {
  const pulse = 0.5 + 0.5 * Math.sin(nowMs / 500)
  ctx.beginPath()
  ctx.arc(x, y, r * (1.05 + 0.1 * pulse), 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(232, 192, 64, 0.9)'
  ctx.lineWidth = 1.6
  ctx.stroke()

  const pingT = (nowMs / 1400) % 1
  ctx.beginPath()
  ctx.arc(x, y, r * (1.2 + pingT * 1.1), 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(232, 192, 64, ${((1 - pingT) * 0.5).toFixed(3)})`
  ctx.lineWidth = 1.2
  ctx.stroke()
}

interface WarpParticle {
  angle: number
  dist: number
  speed: number
}

type HyperspacePhase = 'idle' | 'streaks' | 'flash' | 'fadeout'

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

/** Realistic star in the destination's role/champion palette — same visual
 *  family as the arrival sun, so the zoom hand-over reads as one object. */
function drawRoleStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  pal: typeof STAR_PALETTE,
  nowMs: number,
) {
  const pulse = 0.5 + 0.5 * Math.sin(nowMs / 700)

  // Corona
  const coroR = r * (2.8 + 0.4 * pulse)
  const corona = ctx.createRadialGradient(x, y, r * 0.8, x, y, coroR)
  corona.addColorStop(0, pal.atmo)
  corona.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.beginPath()
  ctx.arc(x, y, coroR, 0, Math.PI * 2)
  ctx.fillStyle = corona
  ctx.fill()

  // Inner halo
  const halo = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 1.9)
  halo.addColorStop(0, 'rgba(255,255,255,0.5)')
  halo.addColorStop(0.45, pal.atmo)
  halo.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.beginPath()
  ctx.arc(x, y, r * 1.9, 0, Math.PI * 2)
  ctx.fillStyle = halo
  ctx.fill()

  // Body — hot white core toward the role color
  const body = ctx.createRadialGradient(x - r * 0.25, y - r * 0.28, r * 0.05, x, y, r)
  body.addColorStop(0, '#ffffff')
  body.addColorStop(0.3, pal.highlight)
  body.addColorStop(0.65, pal.base)
  body.addColorStop(1, pal.shadow)
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = body
  ctx.fill()

  // Rim
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(255,255,255,${(0.35 + 0.15 * pulse).toFixed(3)})`
  ctx.lineWidth = 1
  ctx.stroke()
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
    // dotPositions[i] = world position of champion-star attempt i (in visit
    // order); the last entry is the upcoming target while the run is active.
    const dotPositions = ref<DotPos[]>([])
    const spawnPos = ref<DotPos>({ x: 0.5, y: 0.5 })

    let rafId: number | null = null
    // Camera (world-space center + zoom). zoom 1 = whole galaxy visible;
    // during the final travel phase it eases toward the destination star.
    const camera = { x: 0.5, y: 0.5, zoom: 1 }
    let prevCamZoom = 1

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
          !galaxyStore.bossPhaseActive &&
          !galaxyStore.isComplete) ||
        galaxyStore.bossPhaseActive ||
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
      ctx.fillStyle = 'rgba(30, 16, 6, 0.75)'
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
      ctx.fillStyle = 'rgba(30, 16, 6, 1)'
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
      // One dot per past attempt (rescued or failed) + the upcoming target.
      // Placement lives in minimapGalaxyGeometry so the archived-galaxy
      // snapshot renderer reproduces the exact same layout.
      const { spawn, dots } = generateGalaxyDots(
        galaxyStore.mapSeed,
        galaxyStore.attemptResults.length + 1,
      )
      spawnPos.value = spawn
      dotPositions.value = dots
    }

    function getPlayerWorldPos(dots: DotPos[], attempts: number): { x: number; y: number } {
      // Docked at the boss star in the galaxy core
      if (galaxyStore.bossPhaseActive || galaxyStore.isComplete) return { x: 0.5, y: 0.5 }
      const from = attempts > 0 && dots.length >= attempts ? dots[attempts - 1] : spawnPos.value
      if (galaxyStore.isRescueRotating) return from
      const target = galaxyStore.travelingToGalaxyBoss
        ? { x: 0.5, y: 0.5 }
        : attempts < dots.length
          ? dots[attempts]
          : null
      const state = galaxyStore.championTravelState
      if (state === 'traveling' && target) {
        const startTime = galaxyStore.championTravelStartTime
        const duration = galaxyStore.championTravelDurationMs
        const progress =
          startTime > 0 && duration > 0 ? Math.min((Date.now() - startTime) / duration, 1) : 0
        return {
          x: from.x + (target.x - from.x) * progress,
          y: from.y + (target.y - from.y) * progress,
        }
      }
      const arrived = state === 'champion_available' || state === 'champion_spawned'
      if (arrived && target) return target
      return from
    }

    function drawNormalMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const dots = dotPositions.value
      const results = galaxyStore.attemptResults
      const attempts = Math.min(results.length, dots.length)
      const isTraveling = galaxyStore.championTravelState === 'traveling'
      const nowMs = Date.now()
      // Only the NEXT star is revealed — and only once a role has been chosen
      // for it. Every star already visited stays as a rescued/failed marker.
      const roleChosen = !!galaxyStore.nextStarRole && !galaxyStore.pendingRoleSelection
      const targetIdx =
        galaxyStore.starsRescued < galaxyStore.starsRequired && attempts < dots.length && roleChosen
          ? attempts
          : -1
      // Final leg: after the last champion star the destination is the fixed
      // boss star at the galaxy core.
      const bossTravel = galaxyStore.travelingToGalaxyBoss
      const travelDest = bossTravel
        ? { x: 0.5, y: 0.5 }
        : targetIdx >= 0
          ? dots[targetIdx]
          : null

      // Static map with a soft camera: world coords (0..1) map onto the
      // canvas relative to the camera center + zoom (no rotation). At
      // zoom 1 / center (0.5, 0.5) the whole galaxy is visible; the base
      // stays fully transparent so the flat unified bar background IS the
      // map background — no sprites or tints of its own.
      const cam = camera
      function wToC(wx: number, wy: number): [number, number] {
        return [w / 2 + (wx - cam.x) * w * cam.zoom, h / 2 + (wy - cam.y) * h * cam.zoom]
      }

      // Overview content fades out while the camera zooms onto the target —
      // late enough that the player visibly flies THROUGH the galaxy body.
      const farAlpha = 1 - smoothstep(cam.zoom, MINIMAP_GALAXY_FADE[0], MINIMAP_GALAXY_FADE[1])

      // Zoom velocity → motion streaks while the camera dives in
      const zoomVel = cam.zoom - prevCamZoom
      prevCamZoom = cam.zoom
      const streaking = zoomVel > 0.002 && cam.zoom > 1.6
      function drawStarParticle(px: number, py: number, size: number, rgb: string, a: number) {
        const style = `rgba(${rgb}, ${a.toFixed(3)})`
        if (streaking) {
          const dx = px - w / 2
          const dy = py - h / 2
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 1) {
            const len = Math.min(16, zoomVel * dist * 0.5)
            if (len > 0.8) {
              ctx.beginPath()
              ctx.strokeStyle = style
              ctx.lineWidth = size
              ctx.lineCap = 'round'
              ctx.moveTo(px, py)
              ctx.lineTo(px + (dx / dist) * len, py + (dy / dist) * len)
              ctx.stroke()
              return
            }
          }
        }
        ctx.beginPath()
        ctx.arc(px, py, size, 0, Math.PI * 2)
        ctx.fillStyle = style
        ctx.fill()
      }

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

      // ── Procedural spiral galaxy (no sprite): precomputed seeded particles
      // (bulge / two arms / knots / haze) drawn additively over a two-layer
      // core glow. Follows the camera and fades with the overview layer.
      // Static (no rotation) so the rescue stars stay pinned to the arms.
      const geo = galaxyGeo(galaxyStore.mapSeed)
      const themeAccent = minimapAccentForTheme(galaxyStore.currentThemeIndex)
      if (farAlpha > 0.01) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        const [gcx, gcy] = wToC(0.5, 0.5)
        const coreR = MINIMAP_GALAXY_CORE_RADIUS * w * cam.zoom
        const coreBright = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, coreR * 0.55)
        coreBright.addColorStop(0, `rgba(255, 240, 200, ${(0.35 * farAlpha).toFixed(3)})`)
        coreBright.addColorStop(1, 'rgba(255, 240, 200, 0)')
        ctx.fillStyle = coreBright
        ctx.fillRect(gcx - coreR, gcy - coreR, coreR * 2, coreR * 2)
        const halo = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, coreR * 1.9)
        halo.addColorStop(0, `rgba(240, 205, 140, ${(0.1 * farAlpha).toFixed(3)})`)
        halo.addColorStop(1, 'rgba(240, 205, 140, 0)')
        ctx.fillStyle = halo
        ctx.fillRect(gcx - coreR * 2, gcy - coreR * 2, coreR * 4, coreR * 4)

        for (const p of getGalaxyParticles(galaxyStore.mapSeed)) {
          const wp = galaxyPlaneToWorld(geo, p.angle, p.r)
          const [px, py] = wToC(wp.x, wp.y)
          const rgb = p.color === 2 ? themeAccent : GALAXY_PARTICLE_COLORS[p.color]
          drawStarParticle(px, py, p.size, rgb, p.alpha * farAlpha)
        }
        ctx.restore()
      }

      // ── Near-field star field around the destination: fades in while the
      // galaxy body thins out → depth during the fly-through, replaces the
      // old galaxy-near sprite. Expands naturally with the camera zoom.
      const nearAlpha = smoothstep(
        cam.zoom,
        MINIMAP_NEARFIELD_FADE[0],
        MINIMAP_NEARFIELD_FADE[1],
      )
      if (nearAlpha > 0.01 && travelDest) {
        const anchor = travelDest
        const nfRng = seededRng(
          galaxyStore.currentGalaxy * 7717 + (bossTravel ? 911 : targetIdx) * 131,
        )
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        for (let i = 0; i < MINIMAP_NEARFIELD_STARS; i++) {
          const wx = anchor.x + (nfRng() - 0.5) * 2 * MINIMAP_NEARFIELD_SPREAD
          const wy = anchor.y + (nfRng() - 0.5) * 2 * MINIMAP_NEARFIELD_SPREAD
          const size = 0.5 + nfRng() * 1.3
          const tint = nfRng()
          const a = (0.25 + nfRng() * 0.5) * nearAlpha
          const [px, py] = wToC(wx, wy)
          drawStarParticle(px, py, size, tint < 0.6 ? '255, 246, 228' : themeAccent, a)
        }
        ctx.restore()
      }

      // Flown route so far: spawn point → every visited star, in visit order
      if (attempts >= 1 && farAlpha > 0.01) {
        ctx.save()
        ctx.globalAlpha = farAlpha
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(232, 192, 64, 0.55)'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const [spx, spy] = wToC(spawnPos.value.x, spawnPos.value.y)
        ctx.moveTo(spx, spy)
        for (let i = 0; i < attempts; i++) {
          const [sx, sy] = wToC(dots[i].x, dots[i].y)
          ctx.lineTo(sx, sy)
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
      if (travelDest && isTraveling) {
        const from = attempts > 0 ? dots[attempts - 1] : spawnPos.value
        const [x0, y0] = wToC(from.x, from.y)
        const [x2, y2] = wToC(travelDest.x, travelDest.y)
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

      // Overview markers belong to the galaxy overview → fade with it.
      // Only stars already visited are drawn: rescued ✦ or failed ✕ — the
      // upcoming target is rendered separately, future stars stay hidden.
      const galaxySeed = galaxyStore.currentGalaxy * 10007
      if (farAlpha > 0.01) {
        ctx.save()
        ctx.globalAlpha = farAlpha
        for (let i = 0; i < attempts; i++) {
          const [sx, sy] = wToC(dots[i].x, dots[i].y)
          if (results[i] === 'failed') {
            drawPlanet(ctx, sx, sy, 9, galaxySeed + i, 'failed')
          } else {
            drawPlanet(ctx, sx, sy, 11, galaxySeed + i, 'rescued')
          }
        }
        ctx.restore()
      }

      // Galaxy-boss star at the core: hidden while champion stars remain —
      // it reveals itself (pulsing, route-linked) once the last star is saved.
      // The marker survives the camera dive (grows with the zoom like the
      // champion target); only the route line fades with the overview.
      if (galaxyStore.needsFinalBoss) {
        const [bx, by] = wToC(0.5, 0.5)
        if (attempts > 0 && farAlpha > 0.01 && isTraveling) {
          ctx.save()
          ctx.globalAlpha = farAlpha
          const last = dots[attempts - 1]
          const [lx, ly] = wToC(last.x, last.y)
          ctx.beginPath()
          ctx.setLineDash([4, 4])
          ctx.strokeStyle = 'rgba(255,80,30,0.55)'
          ctx.lineWidth = 1.5
          ctx.moveTo(lx, ly)
          ctx.lineTo(bx, by)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.restore()
        }
        const bossScale =
          1 + 1.1 * smoothstep(cam.zoom, MINIMAP_NEARFIELD_FADE[0], MINIMAP_ZOOM_MAX)
        const bossPulse = 0.8 + 0.2 * Math.sin(nowMs / 420)
        for (const [r, a] of [
          [22, 0.08],
          [16, 0.18],
          [12, 0.32],
        ] as [number, number][]) {
          ctx.beginPath()
          ctx.arc(bx, by, r * bossScale, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(200,30,10,${(a * bossPulse).toFixed(3)})`
          ctx.fill()
        }
        ctx.beginPath()
        ctx.arc(bx, by, 9 * bossScale, 0, Math.PI * 2)
        ctx.fillStyle = '#9b1020'
        ctx.fill()
        ctx.strokeStyle = '#ff4020'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(bx, by, 5 * bossScale, 0, Math.PI * 2)
        ctx.fillStyle = '#1a0404'
        ctx.fill()
        ctx.font = `bold ${Math.round(9 * bossScale)}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ff6040'
        ctx.fillText('☠', bx, by)
      }

      // Next-target star, in the color of the role chosen for it — visible
      // from the moment the role is confirmed (departure spin, flight, …).
      if (targetIdx >= 0) {
        const [tx, ty] = wToC(dots[targetIdx].x, dots[targetIdx].y)
        const champStar = starGroupStore.activeStars.find((s) => s.starType === 'champion')
        const nextRole = galaxyStore.nextStarRole
        let targetPal: typeof STAR_PALETTE = STAR_PALETTE
        if (champStar) {
          targetPal = rolePaletteFromRgb(...champStar.starColor)
        } else if (nextRole && ROLE_COLORS[nextRole]) {
          targetPal = rolePaletteFromHex(ROLE_COLORS[nextRole])
        }
        // Small in the far overview (comet-relative scale), growing only
        // moderately with the zoom — the arrival crossfade bridges the
        // remaining size gap to the arrival sun
        const targetR =
          MINIMAP_TARGET_BASE_R +
          (MINIMAP_TARGET_MAX_R - MINIMAP_TARGET_BASE_R) *
            smoothstep(cam.zoom, MINIMAP_NEARFIELD_FADE[0], MINIMAP_ZOOM_MAX)
        drawRoleStar(ctx, tx, ty, targetR, targetPal, nowMs)

        // Expanding beacon rings in the destination's role color — draws the
        // eye more reliably than a text label and scales with the zoom
        for (let ring = 0; ring < 2; ring++) {
          const ringT = (nowMs / 1800 + ring / 2) % 1
          const ringR = targetR * (1.3 + ringT * 1.6)
          const ringA = (1 - ringT) * 0.6
          ctx.beginPath()
          ctx.arc(tx, ty, ringR, 0, Math.PI * 2)
          ctx.strokeStyle = hexToRgba(targetPal.base, ringA)
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }

      if (flight) {
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
        drawPlayerRing(ctx, hx, hy, headR * 2.2, nowMs)
      } else if (!galaxyStore.isRescueRotating && !galaxyStore.pendingRoleSelection) {
        // Idle: player-sun at the current position (the waiting screen draws
        // its own departure beacon at the flight origin instead)
        const player = getPlayerWorldPos(dots, attempts)
        const [px, py] = wToC(player.x, player.y)
        drawMiniSun(ctx, px, py, MINIMAP_IDLE_SUN_R, nowMs)
        drawPlayerRing(ctx, px, py, MINIMAP_IDLE_SUN_R * 1.5, nowMs)
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
      space.addColorStop(0, 'rgba(10, 6, 2, 0.88)')
      space.addColorStop(0.72, 'rgba(10, 6, 2, 0.5)')
      space.addColorStop(1, 'rgba(10, 6, 2, 0)')
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

    /** World position the next flight departs from (last visited star or spawn). */
    function getFlightOrigin(): DotPos {
      const dots = dotPositions.value
      const attempts = Math.min(galaxyStore.attemptResults.length, dots.length)
      return attempts > 0 ? dots[attempts - 1] : spawnPos.value
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
      // Render at device-pixel resolution so the map stays crisp on
      // HiDPI/Retina displays; all drawing keeps using CSS-pixel coords.
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const pw = Math.round(w * dpr)
      const ph = Math.round(h * dpr)
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw
        canvas.height = ph
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
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
      // galaxy map — the camera then glides back out through the near field.
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
      const attempts = Math.min(galaxyStore.attemptResults.length, dots.length)
      const target = galaxyStore.travelingToGalaxyBoss
        ? { x: 0.5, y: 0.5 }
        : galaxyStore.starsRescued < galaxyStore.starsRequired && attempts < dots.length
          ? dots[attempts]
          : null
      const isArrived =
        (galaxyStore.championTravelState === 'champion_available' ||
          galaxyStore.championTravelState === 'champion_spawned') &&
        !galaxyStore.isRescueRotating &&
        !galaxyStore.pendingRoleSelection

      if (galaxyStore.bossPhaseActive) {
        // Docked at the boss star → hold the zoom on the galaxy core
        dz = MINIMAP_ZOOM_MAX
        dx = 0.5
        dy = 0.5
      } else if (isArrived && target) {
        dz = MINIMAP_ZOOM_MAX
        dx = target.x
        dy = target.y
      } else if (galaxyStore.championTravelState === 'traveling' && target) {
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

      // Zoom out noticeably slower than in, so the near-field star field stays
      // readable for a moment on the way back to the galaxy overview
      const lerp = dz < camera.zoom ? MINIMAP_ZOOM_OUT_LERP : MINIMAP_ZOOM_LERP
      camera.zoom += (dz - camera.zoom) * lerp
      camera.x += (dx - camera.x) * lerp
      camera.y += (dy - camera.y) * lerp
    }

    function rafTick(timestamp: number) {
      updateCamera()
      drawCanvas(timestamp)
      if (show.value) {
        rafId = requestAnimationFrame(rafTick)
      } else {
        rafId = null
      }
    }

    watch(
      () => [
        galaxyStore.currentGalaxy,
        galaxyStore.mapSeed,
        galaxyStore.attemptResults.length,
      ],
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
          rafId = requestAnimationFrame(rafTick)
        }
      },
      { immediate: true },
    )

    // Deliberately the BASE pause signal (not the idle variant): the minimap
    // keeps flying to the next star while a bard tab is open — the "universe
    // keeps moving in the background" feel must survive the idle-layer pause.
    const { isRenderingPaused } = useRenderingPaused()

    watch(isRenderingPaused, (paused) => {
      if (paused) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
      } else if (show.value && rafId === null) {
        resetCanvasIfContextLost(canvasEl.value)
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
        drawCanvas()
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

    return { canvasEl }
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
</style>
