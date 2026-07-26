// Zeichen-Primitive und Farbpaletten der Minimap. Bewusst zustandslos und ohne
// Store-Zugriff: MiniMapCanvas bringt Kamera, Zeitachse und Spielzustand mit,
// hier stehen nur die Pinselstriche. Die Geometrie (Galaxie-Partikel, Punkte,
// Planeten) liegt daneben in minimapGalaxyGeometry.ts.
import type { PlanetType } from '@/types'
import { STAR_PHASE_DATA } from '@/config/constants'
import { STAR_PALETTE } from './minimapGalaxyGeometry'
import { hexToRgba } from '@/utils/format'

export const ARRIVAL_TRANSITION_MS = 900

/** Sternenstriche im Hyperspace-Tunnel. */
const WARP_PARTICLE_COUNT = 90

/**
 * "You are here" player signature: stars are filled dots, only the player
 * carries gold rings — a crisp pulsing ring plus an expanding gold ping
 * (tighter and gold, so it never reads as the role-colored target beacon).
 */
export function drawPlayerRing(
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

export interface WarpParticle {
  angle: number
  dist: number
  speed: number
}

export type HyperspacePhase = 'idle' | 'streaks' | 'flash' | 'fadeout'

export function rolePaletteFromRgb(r: number, g: number, b: number): typeof STAR_PALETTE {
  const h = (v: number) => v.toString(16).padStart(2, '0')
  return {
    base:      `#${h(r)}${h(g)}${h(b)}`,
    shadow:    `#${h(Math.round(r * 0.25))}${h(Math.round(g * 0.25))}${h(Math.round(b * 0.25))}`,
    highlight: `#${h(Math.min(255, Math.round(r * 0.6 + 102)))}${h(Math.min(255, Math.round(g * 0.6 + 102)))}${h(Math.min(255, Math.round(b * 0.6 + 102)))}`,
    atmo:      `rgba(${r}, ${g}, ${b}, 0.55)`,
    ring:      false,
  }
}

export function rolePaletteFromHex(hex: string): typeof STAR_PALETTE {
  const n = parseInt(hex.slice(1), 16)
  return rolePaletteFromRgb((n >> 16) & 255, (n >> 8) & 255, n & 255)
}

export const PLANET_TYPE_PALETTES: Record<PlanetType, typeof STAR_PALETTE> = {
  'rocky':     { base: '#8a7060', shadow: '#2a1808', highlight: '#b8a090', atmo: 'rgba(130,100,80,0.4)',   ring: false },
  'ice':       { base: '#90c8f0', shadow: '#104060', highlight: '#d0f0ff', atmo: 'rgba(80,160,240,0.4)',  ring: false },
  'gas-giant': { base: '#c87941', shadow: '#4a2010', highlight: '#e8aa70', atmo: 'rgba(200,120,60,0.45)', ring: false },
  'lava':      { base: '#e05020', shadow: '#600800', highlight: '#ff8050', atmo: 'rgba(240,80,30,0.5)',   ring: false },
  'ocean':     { base: '#3080c0', shadow: '#082040', highlight: '#60c0f0', atmo: 'rgba(40,120,200,0.4)',  ring: false },
  'desert':    { base: '#c8a048', shadow: '#604010', highlight: '#f0d080', atmo: 'rgba(200,160,60,0.4)',  ring: false },
  'jungle':    { base: '#50a840', shadow: '#102808', highlight: '#90e870', atmo: 'rgba(60,180,50,0.4)',   ring: false },
  'ringed':    { base: '#9060c0', shadow: '#200840', highlight: '#c090f0', atmo: 'rgba(140,80,220,0.45)', ring: true  },
  'crystal':   { base: '#40d0c0', shadow: '#083838', highlight: '#b0fff0', atmo: 'rgba(70,220,200,0.45)', ring: false },
  'toxic':     { base: '#94c428', shadow: '#243008', highlight: '#d8f070', atmo: 'rgba(160,220,50,0.45)', ring: false },
  'void':      { base: '#402060', shadow: '#0a0418', highlight: '#a860e8', atmo: 'rgba(150,60,240,0.5)',  ring: false },
  'aurora':    { base: '#4878a0', shadow: '#0a1830', highlight: '#80ffd0', atmo: 'rgba(90,255,190,0.4)',  ring: false },
  'shattered': { base: '#786450', shadow: '#1c1006', highlight: '#ffb060', atmo: 'rgba(255,140,50,0.4)',  ring: false },
  'storm':     { base: '#4a5a9a', shadow: '#0a0e28', highlight: '#aabcf0', atmo: 'rgba(110,150,255,0.45)', ring: false },
  'bloom':     { base: '#f0a8c4', shadow: '#4a1c38', highlight: '#ffe0ec', atmo: 'rgba(255,170,200,0.45)', ring: false },
  'neon':      { base: '#1e2630', shadow: '#04060a', highlight: '#8cf0ff', atmo: 'rgba(80,200,255,0.4)',  ring: false },
  'obsidian':  { base: '#2a2a32', shadow: '#040406', highlight: '#c8d0e8', atmo: 'rgba(180,190,220,0.3)', ring: false },
  'coral':     { base: '#40c8c0', shadow: '#043045', highlight: '#a0f0e8', atmo: 'rgba(90,230,220,0.45)', ring: false },
}

/** Small pulsing sun marker (player origin / idle position) in the mock's gold palette. */
export function drawMiniSun(
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


/** Player sun rendered in its current phase palette (STAR_PHASE_DATA). */
export function drawPhaseSun(
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

export function smoothstep(v: number, a: number, b: number): number {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Realistic star in the destination's role/champion palette — same visual
 *  family as the arrival sun, so the zoom hand-over reads as one object. */
export function drawRoleStar(
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

export function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// ── Hyperspace-Warp ────────────────────────────────────────────────────────
// Der Partikelzustand lebt in der Closure der Factory: MiniMapCanvas hält nur
// noch die Phase und ihren Startzeitpunkt.
export function createWarpEffect() {
  let particles: WarpParticle[] = []
  let lastFrameMs = 0

  function init(w: number, h: number) {
    const cx = w / 2
    const cy = h / 2
    const maxR = Math.sqrt(cx * cx + cy * cy)
    particles = []
    for (let i = 0; i < WARP_PARTICLE_COUNT; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        dist: 1 + Math.random() * maxR * 0.15,
        speed: 25 + Math.random() * 70,
      })
    }
    lastFrameMs = performance.now()
  }

  function drawStreaks(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    timestamp: number,
    phaseStart: number,
  ) {
    const dt = Math.min((timestamp - lastFrameMs) / 1000, 0.05)
    lastFrameMs = timestamp
    const t = Math.min((Date.now() - phaseStart) / 2000, 1)
    const accel = 1 + t * t * t * 17
    const cx = w / 2
    const cy = h / 2
    const maxR = Math.sqrt(cx * cx + cy * cy)
    ctx.fillStyle = 'rgba(30, 16, 6, 0.75)'
    ctx.fillRect(0, 0, w, h)
    for (const p of particles) {
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

  function drawFlash(ctx: CanvasRenderingContext2D, w: number, h: number, phaseStart: number) {
    ctx.fillStyle = 'rgba(30, 16, 6, 1)'
    ctx.fillRect(0, 0, w, h)
    const t = Math.min((Date.now() - phaseStart) / 450, 1)
    ctx.fillStyle = `rgba(255, 255, 255, ${t * 0.85})`
    ctx.fillRect(0, 0, w, h)
  }

  /** Partikel verwerfen — beim Verlassen des Warps, damit der nächste Sprung frisch startet. */
  function reset() {
    particles = []
  }

  return { init, reset, drawStreaks, drawFlash }
}
