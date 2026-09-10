// Zeichen-Primitive und Farbpaletten der Minimap. Bewusst zustandslos und ohne
// Store-Zugriff: MiniMapCanvas bringt Kamera, Zeitachse und Spielzustand mit,
// hier stehen nur die Pinselstriche. Die Geometrie (Galaxie-Partikel, Punkte,
// Planeten) liegt daneben in minimapGalaxyGeometry.ts.
import type { SunBody } from '@/types'
import {
  BLACK_HOLE_DISC_TILT,
  COMET_PHASE_DATA,
  COMET_DISC_FILL,
  MINIMAP_WARP_ACCEL_GAIN,
  MINIMAP_WARP_ACCEL_MS,
  MINIMAP_WARP_TAIL_BASE_PX,
  MINIMAP_WARP_TAIL_SPEED_FACTOR,
  PLAYER_MARKER_HALO_EDGE,
  PLAYER_MARKER_HALO_FILL_ALPHA,
  PLAYER_MARKER_HALO_MAX_ALPHA,
  PLAYER_MARKER_HALO_MIN_ALPHA,
  PLAYER_MARKER_HALO_PERIOD_MS,
  PLAYER_MARKER_HALO_SCALE,
  PLAYER_MARKER_COMET_FRAME_CORNER_PX,
  PLAYER_MARKER_COMET_FRAME_SCALE,
  PLAYER_MARKER_COMET_FRAME_STROKE_PX,
  SUN_SPRITE_BODY_FRACTION,
} from '@/config/constants'
import { STAR_PALETTE } from './minimapGalaxyGeometry'
import { drawSunLayer } from '@/utils/fx/sunBodySprite'

export const ARRIVAL_TRANSITION_MS = 900

/** Sternenstriche im Hyperspace-Tunnel. */
const WARP_PARTICLE_COUNT = 90

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

/**
 * Leitfarben je Typ — nur noch der RUECKFALL, solange das Sprite eines Planeten
 * nicht gerastert ist. Sie stehen jetzt neben dem Painter
 * (`utils/planetDraw/types.ts`): Farbe und Zeichnung eines Typs hatten drei
 * Orte, an denen dasselbe stand.
 */
export { PLANET_TYPE_TINT as PLANET_TYPE_PALETTES } from '@/utils/planetDraw/types'

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

/** Same body and halo as the live Galaxy marker, rasterized for the minimap. */
export function drawPlayerSunMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  body: SunBody,
  nowMs: number,
  dpr: number,
) {
  const pulse = 0.5 + 0.5 * Math.sin((nowMs / PLAYER_MARKER_HALO_PERIOD_MS) * Math.PI * 2)
  const halo = ctx.createRadialGradient(x, y, 0, x, y, r * PLAYER_MARKER_HALO_SCALE)
  halo.addColorStop(0, `rgba(255, 220, 150, ${PLAYER_MARKER_HALO_FILL_ALPHA})`)
  halo.addColorStop(PLAYER_MARKER_HALO_EDGE, 'rgba(255, 220, 150, 0)')
  ctx.save()
  ctx.globalAlpha =
    PLAYER_MARKER_HALO_MIN_ALPHA +
    (PLAYER_MARKER_HALO_MAX_ALPHA - PLAYER_MARKER_HALO_MIN_ALPHA) * pulse
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(x, y, r * PLAYER_MARKER_HALO_SCALE, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  const px = (2 * r) / (body.kind === 'comet' ? COMET_DISC_FILL : SUN_SPRITE_BODY_FRACTION)
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
  drawSunLayer(ctx, 'core', body, px, dpr, x, y)
  if (body.kind === 'comet') drawCometFrame(ctx, x, y, r)
}

function drawCometFrame(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const half = r * PLAYER_MARKER_COMET_FRAME_SCALE
  const corner = Math.min(PLAYER_MARKER_COMET_FRAME_CORNER_PX, half * 0.5)
  const left = x - half
  const right = x + half
  const top = y - half
  const bottom = y + half

  ctx.save()
  ctx.strokeStyle = COMET_PHASE_DATA.accent
  ctx.lineWidth = PLAYER_MARKER_COMET_FRAME_STROKE_PX
  ctx.lineCap = 'round'
  const drawCorner = (
    startX: number,
    startY: number,
    midX: number,
    midY: number,
    endX: number,
    endY: number,
  ) => {
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(midX, midY)
    ctx.lineTo(endX, endY)
    ctx.stroke()
  }
  drawCorner(left + corner, top, left, top, left, top + corner)
  drawCorner(right - corner, top, right, top, right, top + corner)
  drawCorner(right, bottom - corner, right, bottom, right - corner, bottom)
  drawCorner(left + corner, bottom, left, bottom, left, bottom - corner)
  ctx.restore()
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
  drawPlayerSunMarker(ctx, x, y, r, body, nowMs, dpr)
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
  let focusX = 0
  let focusY = 0

  function init(w: number, h: number, courseFx = 0, courseFy = 0) {
    const minEdge = Math.min(w, h)
    focusX = w / 2 + courseFx * minEdge
    focusY = h / 2 + courseFy * minEdge
    const maxR = Math.max(
      Math.hypot(focusX, focusY),
      Math.hypot(w - focusX, focusY),
      Math.hypot(focusX, h - focusY),
      Math.hypot(w - focusX, h - focusY),
    )
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
    const t = Math.min((Date.now() - phaseStart) / MINIMAP_WARP_ACCEL_MS, 1)
    const accel = 1 + t * t * t * MINIMAP_WARP_ACCEL_GAIN
    const cx = focusX
    const cy = focusY
    const maxR = Math.max(
      Math.hypot(cx, cy),
      Math.hypot(w - cx, cy),
      Math.hypot(cx, h - cy),
      Math.hypot(w - cx, h - cy),
    )
    ctx.fillStyle = 'rgba(30, 16, 6, 0.75)'
    ctx.fillRect(0, 0, w, h)
    for (const p of particles) {
      const tailLen = (MINIMAP_WARP_TAIL_BASE_PX + p.speed * MINIMAP_WARP_TAIL_SPEED_FACTOR) * accel
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
