// Zeichen-Primitive und Farbpaletten der Minimap. Bewusst zustandslos und ohne
// Store-Zugriff: MiniMapCanvas bringt Kamera, Zeitachse und Spielzustand mit,
// hier stehen nur die Pinselstriche. Die Geometrie (Galaxie-Partikel, Punkte,
// Planeten) liegt daneben in minimapGalaxyGeometry.ts.
import type { PlanetType, SunBody } from '@/types'
import { BLACK_HOLE_DISC_TILT, COMET_DISC_FILL, SUN_SPRITE_BODY_FRACTION } from '@/config/constants'
import { STAR_PALETTE } from './minimapGalaxyGeometry'
import { drawSunLayer } from '@/utils/fx/sunBodySprite'

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
    base: `#${h(r)}${h(g)}${h(b)}`,
    shadow: `#${h(Math.round(r * 0.25))}${h(Math.round(g * 0.25))}${h(Math.round(b * 0.25))}`,
    highlight: `#${h(Math.min(255, Math.round(r * 0.6 + 102)))}${h(Math.min(255, Math.round(g * 0.6 + 102)))}${h(Math.min(255, Math.round(b * 0.6 + 102)))}`,
    atmo: `rgba(${r}, ${g}, ${b}, 0.55)`,
    ring: false,
  }
}

export function rolePaletteFromHex(hex: string): typeof STAR_PALETTE {
  const n = parseInt(hex.slice(1), 16)
  return rolePaletteFromRgb((n >> 16) & 255, (n >> 8) & 255, n & 255)
}

export const PLANET_TYPE_PALETTES: Record<PlanetType, typeof STAR_PALETTE> = {
  rocky: {
    base: '#8a7060',
    shadow: '#2a1808',
    highlight: '#b8a090',
    atmo: 'rgba(130,100,80,0.4)',
    ring: false,
  },
  ice: {
    base: '#90c8f0',
    shadow: '#104060',
    highlight: '#d0f0ff',
    atmo: 'rgba(80,160,240,0.4)',
    ring: false,
  },
  'gas-giant': {
    base: '#c87941',
    shadow: '#4a2010',
    highlight: '#e8aa70',
    atmo: 'rgba(200,120,60,0.45)',
    ring: false,
  },
  lava: {
    base: '#e05020',
    shadow: '#600800',
    highlight: '#ff8050',
    atmo: 'rgba(240,80,30,0.5)',
    ring: false,
  },
  ocean: {
    base: '#3080c0',
    shadow: '#082040',
    highlight: '#60c0f0',
    atmo: 'rgba(40,120,200,0.4)',
    ring: false,
  },
  desert: {
    base: '#c8a048',
    shadow: '#604010',
    highlight: '#f0d080',
    atmo: 'rgba(200,160,60,0.4)',
    ring: false,
  },
  jungle: {
    base: '#50a840',
    shadow: '#102808',
    highlight: '#90e870',
    atmo: 'rgba(60,180,50,0.4)',
    ring: false,
  },
  ringed: {
    base: '#9060c0',
    shadow: '#200840',
    highlight: '#c090f0',
    atmo: 'rgba(140,80,220,0.45)',
    ring: true,
  },
  crystal: {
    base: '#40d0c0',
    shadow: '#083838',
    highlight: '#b0fff0',
    atmo: 'rgba(70,220,200,0.45)',
    ring: false,
  },
  toxic: {
    base: '#94c428',
    shadow: '#243008',
    highlight: '#d8f070',
    atmo: 'rgba(160,220,50,0.45)',
    ring: false,
  },
  void: {
    base: '#402060',
    shadow: '#0a0418',
    highlight: '#a860e8',
    atmo: 'rgba(150,60,240,0.5)',
    ring: false,
  },
  aurora: {
    base: '#4878a0',
    shadow: '#0a1830',
    highlight: '#80ffd0',
    atmo: 'rgba(90,255,190,0.4)',
    ring: false,
  },
  shattered: {
    base: '#786450',
    shadow: '#1c1006',
    highlight: '#ffb060',
    atmo: 'rgba(255,140,50,0.4)',
    ring: false,
  },
  storm: {
    base: '#4a5a9a',
    shadow: '#0a0e28',
    highlight: '#aabcf0',
    atmo: 'rgba(110,150,255,0.45)',
    ring: false,
  },
  bloom: {
    base: '#f0a8c4',
    shadow: '#4a1c38',
    highlight: '#ffe0ec',
    atmo: 'rgba(255,170,200,0.45)',
    ring: false,
  },
  neon: {
    base: '#1e2630',
    shadow: '#04060a',
    highlight: '#8cf0ff',
    atmo: 'rgba(80,200,255,0.4)',
    ring: false,
  },
  obsidian: {
    base: '#2a2a32',
    shadow: '#040406',
    highlight: '#c8d0e8',
    atmo: 'rgba(180,190,220,0.3)',
    ring: false,
  },
  coral: {
    base: '#40c8c0',
    shadow: '#043045',
    highlight: '#a0f0e8',
    atmo: 'rgba(90,230,220,0.45)',
    ring: false,
  },
}

/**
 * Der Spielerkörper auf Minimap-Massstab — dieselben Painter wie im Orbit
 * (Detailstufe 0), gezeichnet aus dem Sprite-Cache. `r` ist der Körperradius;
 * die Box folgt aus SUN_SPRITE_BODY_FRACTION. Der Halo atmet über globalAlpha.
 */
export function drawPhaseSun(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  body: SunBody,
  nowMs: number,
  dpr: number,
) {
  const px = (2 * r) / (body.kind === 'comet' ? COMET_DISC_FILL : SUN_SPRITE_BODY_FRACTION)
  const pulse = 0.5 + 0.5 * Math.sin(nowMs / 540)
  if (body.kind === 'blackHole') {
    drawSunLayer(ctx, 'bhHalo', body, px, dpr, x, y)
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(1, BLACK_HOLE_DISC_TILT)
    drawSunLayer(ctx, 'bhDisc', body, px, dpr, 0, 0)
    ctx.restore()
    drawSunLayer(ctx, 'bhShadow', body, px, dpr, x, y)
    return
  }
  ctx.save()
  ctx.globalAlpha = 0.75 + 0.25 * pulse
  drawSunLayer(ctx, body.kind === 'comet' ? 'coma' : 'halo', body, px, dpr, x, y)
  ctx.restore()
  drawSunLayer(ctx, 'core', body, px, dpr, x, y)
}

/** Idle-Marker des Spielers — derselbe Körper, nur kleiner. */
export function drawMiniSun(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  body: SunBody,
  nowMs: number,
  dpr: number,
) {
  drawPhaseSun(ctx, x, y, r, body, nowMs, dpr)
}

/**
 * Offscreen-Ebene mit Schlüssel-Invalidierung. Für Inhalte, die nur von Kamera,
 * Seed, Auflösung und Spielstand abhängen — also KEINE Zeitkomponente haben:
 * einmal rastern, danach pro Frame nur noch ein `drawImage`. Ändert sich der
 * Schlüssel oder die Canvas-Größe, wird neu gerastert.
 *
 * `composite` gilt INNERHALB der Ebene (additiv für Partikelfelder); wie die
 * fertige Ebene auf den Hauptcanvas kommt, entscheidet der Aufrufer.
 */
export function createCachedLayer(composite: GlobalCompositeOperation = 'source-over') {
  let layer: HTMLCanvasElement | null = null
  let layerKey = ''

  function get(
    w: number,
    h: number,
    dpr: number,
    key: string,
    render: (c: CanvasRenderingContext2D) => void,
  ): HTMLCanvasElement {
    const pw = Math.max(1, Math.round(w * dpr))
    const ph = Math.max(1, Math.round(h * dpr))
    if (!layer) layer = document.createElement('canvas')
    const resized = layer.width !== pw || layer.height !== ph
    if (resized) {
      layer.width = pw
      layer.height = ph
    }
    if (!resized && layerKey === key) return layer

    const lctx = layer.getContext('2d')
    if (lctx) {
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      lctx.clearRect(0, 0, w, h)
      lctx.globalCompositeOperation = composite
      render(lctx)
    }
    layerKey = key
    return layer
  }

  function dispose() {
    layer = null
    layerKey = ''
  }

  return { get, dispose }
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
