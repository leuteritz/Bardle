<template>
  <img ref="imgEl" src="/img/galaxie.png" style="display: none" alt="" @load="onImageLoad" />
  <canvas ref="canvasEl" class="map-canvas" />
  <div class="minimap-vignette" />
</template>

<script lang="ts">
/* ── SCRIPT UNVERÄNDERT – identisch zur aktuellen Version ── */
import { defineComponent, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import { useGalaxyStore } from '../../../../stores/galaxyStore'
import { useGameStore } from '../../../../stores/gameStore'
import { useStarGroupStore } from '../../../../stores/starGroupStore'
import { GALAXY_THEMES } from '../../../../config/galaxyThemes'
import { GALAXY_TRANS_WARP_MS, GALAXY_TRANS_DECEL_MS } from '../../../../config/constants'

const MAP_WORLD_DEFAULT = 0.3
const MAP_WORLD_ZOOMED = 0.14
const ZOOM_TRIGGER_MS = 20_000
const ZOOM_FULL_MS = 1_000
const ZOOM_LERP_SPEED = 0.04

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

export default defineComponent({
  name: 'MiniMapCanvas',
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

    let hyperspacePhase: HyperspacePhase = 'idle'
    let hyperspacePhaseStart = 0
    let hyperspaceTimeouts: number[] = []
    let warpLastFrameMs = 0
    let warpParticles: WarpParticle[] = []

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

      const isMoving = isTraveling || galaxyStore.isBossSearchActive
      if (galaxyStore.isRescueRotating) {
        // nichts
      } else if (isMoving) {
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

      ctx.fillStyle = '#1a0c02'
      ctx.fillRect(0, 0, w, h)

      const imgW = scale
      const imgH = scale
      const imgX = w / 2 - player.x * imgW
      const imgY = h / 2 - player.y * imgH
      ctx.drawImage(img, imgX, imgY, imgW, imgH)

      const theme = GALAXY_THEMES[galaxyStore.currentThemeIndex % GALAXY_THEMES.length]
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = theme.nebulaColors[0].replace(/,\s*[\d.]+\)/, ', 0.28)')
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'

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

      const rescuedSet = new Set(order.slice(0, rescued))
      const galaxySeed = galaxyStore.currentGalaxy * 10007
      for (let i = 0; i < dots.length; i++) {
        if (rescuedSet.has(i)) continue
        if (targetIdx === i) continue
        const [sx, sy] = wToC(dots[i].x, dots[i].y)
        drawPlanet(ctx, sx, sy, 11, galaxySeed + i, 'unrescued')
      }
      for (let i = 0; i < rescued; i++) {
        const [sx, sy] = wToC(dots[order[i]].x, dots[order[i]].y)
        drawPlanet(ctx, sx, sy, 13, galaxySeed + order[i], 'rescued')
      }

      // Planeten des aktiven Champion-Sterns orbitieren um ihren Stern
      const championStar = starGroupStore.activeStars.find((s) => s.starType === 'champion')
      if (championStar && targetIdx >= 0) {
        const [csx, csy] = wToC(dots[targetIdx].x, dots[targetIdx].y)
        const nowSec = Date.now() / 1000
        const STAR_R = 14
        championStar.planetSlots.forEach((slot, idx) => {
          if (slot.cleared) return
          const planetR = Math.min(3 + idx * 0.8, STAR_R - 3)
          const orbitR = Math.max(STAR_R + planetR + 4, 22 + idx * 7)
          const speed = (0.35 + idx * 0.18) * slot.orbitDirection
          const angle = nowSec * speed + idx * Math.PI * 0.67
          const px = csx + Math.cos(angle) * orbitR
          const py = csy + Math.sin(angle) * orbitR * 0.55
          drawPlanet(ctx, px, py, planetR, galaxySeed + idx * 17, 'unrescued')
        })
      }

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

      if (targetIdx >= 0 && isTraveling) {
        const [tx, ty] = wToC(dots[targetIdx].x, dots[targetIdx].y)
        drawPlanet(ctx, tx, ty, 14, galaxySeed + targetIdx, 'target', pulseFrame === 1)
      }

      // Planetenanzahl-Label: nur wenn Champion-Stern aktiv (Anzahl bekannt)
      const showCountLabel =
        targetIdx >= 0 &&
        (galaxyStore.championTravelState === 'champion_spawned' ||
          (isTraveling && galaxyStore.travelRemainingMs <= 5_000))
      if (showCountLabel) {
        const [lx, ly] = wToC(dots[targetIdx].x, dots[targetIdx].y)
        const activeStar = starGroupStore.activeStars.find((s) => s.starType === 'champion')
        const planetCount = activeStar
          ? activeStar.planetSlots.filter((p) => !p.cleared).length
          : null
        if (planetCount !== null) {
          ctx.save()
          ctx.font = 'bold 9px serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = 'rgba(255,220,80,0.95)'
          ctx.shadowColor = 'rgba(0,0,0,0.9)'
          ctx.shadowBlur = 4
          ctx.fillText(`⬡ ${planetCount}`, lx, ly - 20)
          ctx.shadowBlur = 0
          ctx.restore()
        }
      }

      if (galaxyStore.isBossSearchActive) {
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 400)
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
        ctx.beginPath()
        ctx.arc(w / 2, h / 2, 8, 0, Math.PI * 2)
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
        ctx.fillText('?', w / 2, h / 2)
        ctx.shadowBlur = 0
      } else {
        ctx.shadowColor = 'rgba(232,192,64,0.95)'
        ctx.shadowBlur = 16
        ctx.beginPath()
        ctx.arc(w / 2, h / 2, 9, 0, Math.PI * 2)
        ctx.fillStyle = '#ffe060'
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.shadowBlur = 0
      }

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

    return { canvasEl, imgEl, onImageLoad }
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
  /* Vignette folgt der Kreisform: stärker oben-rechts, sanft ausblendend */
  background:
    radial-gradient(
      ellipse at 100% 0%,
      rgba(0, 0, 0, 0) 30%,
      rgba(0, 0, 0, 0.45) 75%,
      rgba(0, 0, 0, 0.7) 100%
    ),
    radial-gradient(ellipse at center, transparent 48%, rgba(0, 0, 0, 0.45) 100%);
}
</style>
