// Die Wormhole-Röhre des Universumssprungs — auf dem Sternfeld-Canvas, in
// derselben Schleife, ohne Verlauf je Strand und Frame.
//
// Geometrie kommt aus utils/orbit/wormholePath.ts: Scheiben, Rippen und der
// Ausgang liegen im KAMERARAUM (Einheit Röhrenradius), hier fällt nur noch die
// Perspektive (÷ z). Die Wand ist EIN gebackener weicher Ring mit Lichtfasern,
// je Scheibe als Ellipse gezeichnet (schräg gesehene Ringe kippen in der Ecke
// weg), additiv, nah matt, fern hell, ganz fern Nebel. Die Stränge sind
// Polylinien durch die exakt projizierten Scheibenpunkte — sie biegen um die
// Ecke. Der Ausgang ist die Endscheibe der Bahn, darin das gebackene Zielfeld.
import {
  UNIVERSE_HOP_EXIT_BRIGHT_ALPHA,
  UNIVERSE_HOP_EXIT_BRIGHT_STOP,
  UNIVERSE_HOP_EXIT_CORE_ALPHA,
  UNIVERSE_HOP_EXIT_HALO_ALPHA,
  UNIVERSE_HOP_EXIT_HALO_K,
  UNIVERSE_HOP_EXIT_INNER_ALPHA,
  UNIVERSE_HOP_EXIT_MID_ALPHA,
  UNIVERSE_HOP_EXIT_MID_STOP,
  UNIVERSE_HOP_EXIT_PEEK_ALPHA,
  UNIVERSE_HOP_EXIT_R_K,
  UNIVERSE_HOP_EXIT_R_MAX_FRAC,
  UNIVERSE_HOP_STRAND_CORE_ALPHA,
  UNIVERSE_HOP_STRAND_CORE_W_FAR,
  UNIVERSE_HOP_STRAND_CORE_W_NEAR,
  UNIVERSE_HOP_STRAND_DASH_PX,
  UNIVERSE_HOP_STRAND_FLOW_PX_S,
  UNIVERSE_HOP_STRAND_GAP_PX,
  UNIVERSE_HOP_STRAND_GLOW_ALPHA,
  UNIVERSE_HOP_STRAND_GLOW_W_FAR,
  UNIVERSE_HOP_STRAND_GLOW_W_NEAR,
  UNIVERSE_HOP_STRAND_NEAR_ALPHA_K,
  UNIVERSE_HOP_STRAND_SPIN_RAD,
  UNIVERSE_HOP_STRAND_TWIST,
  UNIVERSE_HOP_TUNNEL_BODY_ALPHA,
  UNIVERSE_HOP_TUNNEL_RING_ALPHA,
  UNIVERSE_HOP_TUNNEL_SIGHT,
  UNIVERSE_HOP_TUNNEL_SLICES,
  UNIVERSE_HOP_TUNNEL_SQUASH_MIN,
  UNIVERSE_HOP_TUNNEL_STRANDS,
  UNIVERSE_HOP_TUNNEL_Z_NEAR,
  UNIVERSE_HOP_WALL_FIBERS,
  UNIVERSE_HOP_WALL_RING_WIDTH_FRAC,
  UNIVERSE_HOP_WALL_SPRITE_PX,
  UNIVERSE_MAP_PORTAL_RY,
  WORMHOLE_BRIGHT_LIFT,
  WORMHOLE_CORE_LIFT,
  WORMHOLE_DEEP_MIX,
} from '@/config/constants'
import { additiveDrawAlpha, persistentDrawAlpha } from '@/utils/orbit/galaxyWarp'
import type { WormholeView } from '@/utils/orbit/wormholePath'
import { hexToRgb } from '@/utils/ui/format'

/** Vier Töne als `r, g, b` — EINMAL je Sprung aus dem Zielton gemischt. */
export interface WormholePalette {
  deep: string
  mid: string
  bright: string
  core: string
}

export interface WormholeTunnel {
  palette: WormholePalette
  /** Je Strand: Azimut, Spiralneigung (rad zur Ferne), Breitenfaktor, Dash-Phase in px, Helligkeit. */
  az: Float64Array
  spin: Float64Array
  width: Float64Array
  phase: Float64Array
  gain: Float64Array
  /** Scheiben dieses Frames im Bild: Mittelpunkt, Radius (0 = unsichtbar), Quetschung, Drehung. */
  sx: Float64Array
  sy: Float64Array
  sr: Float64Array
  sq: Float64Array
  sa: Float64Array
  /** Strangpunkte dieses Frames, Strand × Scheibe; NaN = hinter der Kamera. */
  px: Float64Array
  py: Float64Array
  /** Die Wand: gebacken beim Sprungstart (`bakeWormholeWall`), null ohne DOM. */
  wall: HTMLCanvasElement | null
  /** Ausgang: Saum und Hof als EIN Verlauf je im Einheitsradius, je Frame nur skaliert. */
  exit: CanvasGradient | null
  halo: CanvasGradient | null
}

export interface WormholeFrame {
  w: number
  h: number
  /** Brennweite in px. */
  focal: number
  view: WormholeView
  tunnelSec: number
  /** Bank der Kamera in rad — dreht die Fasern der Wand zur Spirale. */
  twist: number
  trailFade: number
  /** 0 … 1: Einblendung der Röhre. */
  tubeAlpha: number
  /** 0 … 1: das Ausgangslicht — 0 bis hinter der letzten Ecke. */
  exitLight: number
  /** Das gebackene Zielfeld (Schlund-Sprite des Tors): Ringdurchmesser und Kantenlänge in px; null ohne. */
  peek: HTMLCanvasElement | null
  peekPx: number
  peekSpan: number
}

const DEEP_BASE: [number, number, number] = [5, 5, 11]
const WHITE: [number, number, number] = [255, 255, 255]

function mixTriple(a: [number, number, number], b: [number, number, number], k: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * k)
  const g = Math.round(a[1] + (b[1] - a[1]) * k)
  const bl = Math.round(a[2] + (b[2] - a[2]) * k)
  return `${r}, ${g}, ${bl}`
}

export function wormholePalette(tintHex: string): WormholePalette {
  const tint = hexToRgb(tintHex)
  return {
    deep: mixTriple(tint, DEEP_BASE, WORMHOLE_DEEP_MIX),
    mid: tint.join(', '),
    bright: mixTriple(tint, WHITE, WORMHOLE_BRIGHT_LIFT),
    core: mixTriple(tint, WHITE, WORMHOLE_CORE_LIFT),
  }
}

export function createWormholeTunnel(tintHex: string, rand: () => number): WormholeTunnel {
  const n = UNIVERSE_HOP_TUNNEL_STRANDS
  const az = new Float64Array(n)
  const spin = new Float64Array(n)
  const width = new Float64Array(n)
  const phase = new Float64Array(n)
  const gain = new Float64Array(n)
  const step = (Math.PI * 2) / n
  for (let i = 0; i < n; i++) {
    az[i] = i * step + (rand() - 0.5) * step * 0.8
    spin[i] = (rand() * 2 - 1) * UNIVERSE_HOP_STRAND_SPIN_RAD
    width[i] = 0.7 + rand() * 0.6
    phase[i] = rand() * (UNIVERSE_HOP_STRAND_DASH_PX + UNIVERSE_HOP_STRAND_GAP_PX)
    gain[i] = 0.6 + rand() * 0.4
  }
  const s = UNIVERSE_HOP_TUNNEL_SLICES
  return {
    palette: wormholePalette(tintHex),
    az,
    spin,
    width,
    phase,
    gain,
    sx: new Float64Array(s),
    sy: new Float64Array(s),
    sr: new Float64Array(s),
    sq: new Float64Array(s),
    sa: new Float64Array(s),
    px: new Float64Array(n * s),
    py: new Float64Array(n * s),
    wall: null,
    exit: null,
    halo: null,
  }
}

/**
 * Die Wand: ein weicher Ring (Radialverlauf) mit radialen Lichtfasern, um
 * (mid, mid) mit Aussenradius r. Kein shadowBlur — die Weichheit ist der Verlauf.
 */
export function paintWormholeWall(
  ctx: CanvasRenderingContext2D,
  mid: number,
  r: number,
  palette: WormholePalette,
  rand: () => number,
): void {
  const inner = r * (1 - UNIVERSE_HOP_WALL_RING_WIDTH_FRAC)
  const grad = ctx.createRadialGradient(mid, mid, inner, mid, mid, r)
  grad.addColorStop(0, `rgba(${palette.mid},0)`)
  grad.addColorStop(0.35, `rgba(${palette.mid},0.45)`)
  grad.addColorStop(0.65, `rgba(${palette.bright},0.6)`)
  grad.addColorStop(1, `rgba(${palette.bright},0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, mid * 2, mid * 2)
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = `rgb(${palette.core})`
  for (let i = 0; i < UNIVERSE_HOP_WALL_FIBERS; i++) {
    const a = rand() * Math.PI * 2
    const r0 = inner + rand() * (r - inner) * 0.3
    const r1 = r0 + (r - r0) * (0.5 + rand() * 0.5)
    ctx.globalAlpha = 0.25 + rand() * 0.35
    ctx.lineWidth = 0.8 + rand() * 2.2
    ctx.beginPath()
    ctx.moveTo(mid + Math.cos(a) * r0, mid + Math.sin(a) * r0)
    ctx.lineTo(mid + Math.cos(a) * r1, mid + Math.sin(a) * r1)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

/** Backt die Wand einmal je Sprung; null, wo es kein 2D-Canvas gibt. */
export function bakeWormholeWall(tunnel: WormholeTunnel, rand: () => number): void {
  const px = UNIVERSE_HOP_WALL_SPRITE_PX
  const cv = document.createElement('canvas')
  cv.width = px
  cv.height = px
  const ctx = cv.getContext('2d')
  if (!ctx) return
  paintWormholeWall(ctx, px / 2, px / 2, tunnel.palette, rand)
  tunnel.wall = cv
}

/** Quetschung eines Rings mit Tangente t am Ort c, gesehen aus dem Ursprung. */
export function ringSquash(
  cx: number,
  cy: number,
  cz: number,
  tx: number,
  ty: number,
  tz: number,
): number {
  const len = Math.hypot(cx, cy, cz) || 1
  const k = Math.abs((cx * tx + cy * ty + cz * tz) / len)
  return k < UNIVERSE_HOP_TUNNEL_SQUASH_MIN ? UNIVERSE_HOP_TUNNEL_SQUASH_MIN : k
}

/** Drehung der Ellipse: die kurze Achse liegt auf der ins Bild projizierten Tangente. */
export function ringAngle(tx: number, ty: number): number {
  return Math.atan2(-ty, tx)
}

/** Scheiben in den Bildraum — Radius 0 heisst: nicht zeichnen. */
export function projectWormholeSlices(tunnel: WormholeTunnel, frame: WormholeFrame): void {
  const v = frame.view
  const mx = frame.w / 2
  const my = frame.h / 2
  const focal = frame.focal
  const rMax = Math.min(frame.w, frame.h) * 4
  for (let k = 0; k < v.n; k++) {
    const z = v.cz[k]!
    if (z < UNIVERSE_HOP_TUNNEL_Z_NEAR || v.fog[k]! <= 0) {
      tunnel.sr[k] = 0
      continue
    }
    const r = focal / z
    if (r > rMax) {
      tunnel.sr[k] = 0
      continue
    }
    tunnel.sx[k] = mx + (focal * v.cx[k]!) / z
    tunnel.sy[k] = my - (focal * v.cy[k]!) / z
    tunnel.sr[k] = r
    tunnel.sq[k] = ringSquash(v.cx[k]!, v.cy[k]!, z, v.tx[k]!, v.ty[k]!, v.tz[k]!)
    tunnel.sa[k] = ringAngle(v.tx[k]!, v.ty[k]!)
  }
}

/** Strangpunkte: exakt projizierte Punkte auf jeder Scheibe — die Fasern biegen um die Ecke. */
function projectStrands(tunnel: WormholeTunnel, frame: WormholeFrame): void {
  const v = frame.view
  const n = v.n
  const last = n - 1
  const mx = frame.w / 2
  const my = frame.h / 2
  const focal = frame.focal
  const twist = frame.twist * UNIVERSE_HOP_STRAND_TWIST
  for (let m = 0; m < tunnel.az.length; m++) {
    const base = m * n
    for (let k = 0; k < n; k++) {
      const i = base + k
      if (v.cz[k]! < UNIVERSE_HOP_TUNNEL_Z_NEAR || v.fog[k]! <= 0) {
        tunnel.px[i] = NaN
        continue
      }
      const th = tunnel.az[m]! + (twist + tunnel.spin[m]!) * (k / last)
      const c = Math.cos(th)
      const s = Math.sin(th)
      const x = v.cx[k]! + c * v.rx[k]! + s * v.ux[k]!
      const y = v.cy[k]! + c * v.ry[k]! + s * v.uy[k]!
      const z = v.cz[k]! + c * v.rz[k]! + s * v.uz[k]!
      if (z < UNIVERSE_HOP_TUNNEL_Z_NEAR) {
        tunnel.px[i] = NaN
        continue
      }
      tunnel.px[i] = mx + (focal * x) / z
      tunnel.py[i] = my - (focal * y) / z
    }
  }
}

/** Der dunkle Röhrenkörper — VOR dem Tor zeichnen, damit Kehlenlicht und Stränge darüber liegen. */
export function drawWormholeBody(
  ctx: CanvasRenderingContext2D,
  tunnel: WormholeTunnel,
  frame: WormholeFrame,
): void {
  if (frame.tubeAlpha <= 0) return
  ctx.globalAlpha = persistentDrawAlpha(
    UNIVERSE_HOP_TUNNEL_BODY_ALPHA * frame.tubeAlpha,
    frame.trailFade,
  )
  ctx.fillStyle = `rgb(${tunnel.palette.deep})`
  ctx.fillRect(0, 0, frame.w, frame.h)
  ctx.globalAlpha = 1
}

function strokeStrand(
  ctx: CanvasRenderingContext2D,
  tunnel: WormholeTunnel,
  m: number,
  from: number,
  to: number,
): void {
  ctx.beginPath()
  const base = m * UNIVERSE_HOP_TUNNEL_SLICES
  let open = false
  for (let k = from; k <= to; k++) {
    const x = tunnel.px[base + k]!
    if (Number.isNaN(x)) {
      open = false
      continue
    }
    const y = tunnel.py[base + k]!
    if (open) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
    open = true
  }
  ctx.stroke()
}

function exitGradients(ctx: CanvasRenderingContext2D, tunnel: WormholeTunnel): void {
  const p = tunnel.palette
  // Der Saum: innen fast offen (das Zielfeld liegt darunter), am Rand der helle Kern.
  const rim = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  rim.addColorStop(0, `rgba(${p.mid},${UNIVERSE_HOP_EXIT_INNER_ALPHA})`)
  rim.addColorStop(UNIVERSE_HOP_EXIT_MID_STOP, `rgba(${p.mid},${UNIVERSE_HOP_EXIT_MID_ALPHA})`)
  rim.addColorStop(
    UNIVERSE_HOP_EXIT_BRIGHT_STOP,
    `rgba(${p.bright},${UNIVERSE_HOP_EXIT_BRIGHT_ALPHA})`,
  )
  rim.addColorStop(1, `rgba(${p.core},${UNIVERSE_HOP_EXIT_CORE_ALPHA})`)
  tunnel.exit = rim
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  halo.addColorStop(0, `rgba(${p.bright},1)`)
  halo.addColorStop(0.5, `rgba(${p.mid},0.4)`)
  halo.addColorStop(1, `rgba(${p.mid},0)`)
  tunnel.halo = halo
}

/** Wand, Stränge, Rippen und Ausgang — NACH dem Tor. */
export function drawWormholeTunnel(
  ctx: CanvasRenderingContext2D,
  tunnel: WormholeTunnel,
  frame: WormholeFrame,
): void {
  if (frame.tubeAlpha <= 0) return
  const view = frame.view
  const s = view.n
  const last = s - 1
  projectWormholeSlices(tunnel, frame)
  projectStrands(tunnel, frame)
  const ramp = frame.tubeAlpha
  const fade = frame.trailFade
  const p = tunnel.palette
  const mx = frame.w / 2
  const my = frame.h / 2
  const focal = frame.focal

  // Die Wand: je Scheibe der gebackene Ring als Ellipse, additiv, fern hell, ganz fern Nebel.
  if (tunnel.wall) {
    const px = UNIVERSE_HOP_WALL_SPRITE_PX
    ctx.globalCompositeOperation = 'lighter'
    for (let k = 0; k < s; k++) {
      const r = tunnel.sr[k]!
      if (r <= 0) continue
      const sc = (r * 2) / px
      ctx.setTransform(1, 0, 0, 1, tunnel.sx[k]!, tunnel.sy[k]!)
      ctx.rotate(tunnel.sa[k]!)
      ctx.scale(sc * tunnel.sq[k]!, sc)
      ctx.rotate(frame.twist * (k / last))
      ctx.globalAlpha = additiveDrawAlpha(view.fog[k]! * ramp, fade)
      ctx.drawImage(tunnel.wall, -px / 2, -px / 2, px, px)
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
  }

  // Die Stränge: nah (Scheibe 0 … mid) breit und matt, fern (mid … last) dünn und hell.
  const mid = Math.floor(last / 2)
  ctx.lineJoin = 'round'
  // Pass 1: Glow, additiv — überlappende Stränge blühen auf.
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = `rgb(${p.bright})`
  ctx.lineCap = 'round'
  for (let m = 0; m < tunnel.az.length; m++) {
    const wk = tunnel.width[m]!
    ctx.globalAlpha = additiveDrawAlpha(UNIVERSE_HOP_STRAND_GLOW_ALPHA * ramp, fade)
    ctx.lineWidth = UNIVERSE_HOP_STRAND_GLOW_W_FAR * wk
    strokeStrand(ctx, tunnel, m, mid, last)
    ctx.globalAlpha = additiveDrawAlpha(
      UNIVERSE_HOP_STRAND_GLOW_ALPHA * UNIVERSE_HOP_STRAND_NEAR_ALPHA_K * ramp,
      fade,
    )
    ctx.lineWidth = UNIVERSE_HOP_STRAND_GLOW_W_NEAR * wk
    strokeStrand(ctx, tunnel, m, 0, mid)
  }
  ctx.globalCompositeOperation = 'source-over'
  // Pass 2: Kern, gestrichelt — der Versatz läuft auf die Kamera zu.
  ctx.strokeStyle = `rgb(${p.core})`
  ctx.setLineDash([UNIVERSE_HOP_STRAND_DASH_PX, UNIVERSE_HOP_STRAND_GAP_PX])
  const flow = frame.tunnelSec * UNIVERSE_HOP_STRAND_FLOW_PX_S
  for (let m = 0; m < tunnel.az.length; m++) {
    const wk = tunnel.width[m]!
    const g = tunnel.gain[m]!
    ctx.lineDashOffset = flow + tunnel.phase[m]!
    ctx.globalAlpha = persistentDrawAlpha(UNIVERSE_HOP_STRAND_CORE_ALPHA * g * ramp, fade)
    ctx.lineWidth = UNIVERSE_HOP_STRAND_CORE_W_FAR * wk
    strokeStrand(ctx, tunnel, m, mid, last)
    ctx.globalAlpha = persistentDrawAlpha(
      UNIVERSE_HOP_STRAND_CORE_ALPHA * UNIVERSE_HOP_STRAND_NEAR_ALPHA_K * g * ramp,
      fade,
    )
    ctx.lineWidth = UNIVERSE_HOP_STRAND_CORE_W_NEAR * wk
    strokeStrand(ctx, tunnel, m, 0, mid)
  }
  ctx.setLineDash([])
  ctx.lineDashOffset = 0
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'miter'
  // Rippen: weltfeste Ringe, projiziert als Ellipsen — sie rauschen auf die Kamera zu.
  ctx.strokeStyle = `rgb(${p.mid})`
  for (let i = 0; i < view.ribN; i++) {
    const z = view.ribZ[i]!
    if (z < UNIVERSE_HOP_TUNNEL_Z_NEAR) continue
    const r = focal / z
    const sq = ringSquash(
      view.ribX[i]!,
      view.ribY[i]!,
      z,
      view.ribTx[i]!,
      view.ribTy[i]!,
      view.ribTz[i]!,
    )
    const depth = z / UNIVERSE_HOP_TUNNEL_SIGHT
    ctx.globalAlpha = persistentDrawAlpha(
      UNIVERSE_HOP_TUNNEL_RING_ALPHA * (1 - (depth > 1 ? 1 : depth)) * ramp,
      fade,
    )
    ctx.lineWidth = Math.max(1, r * 0.02)
    ctx.beginPath()
    ctx.ellipse(
      mx + (focal * view.ribX[i]!) / z,
      my - (focal * view.ribY[i]!) / z,
      r * sq,
      r,
      ringAngle(view.ribTx[i]!, view.ribTy[i]!),
      0,
      Math.PI * 2,
    )
    ctx.stroke()
  }
  // Der Ausgang: die Endscheibe der Bahn — erst hinter der letzten Ecke, darin das Zielfeld.
  if (frame.exitLight <= 0 || view.ez < UNIVERSE_HOP_TUNNEL_Z_NEAR) {
    ctx.globalAlpha = 1
    return
  }
  const light = frame.exitLight
  if (!tunnel.exit) exitGradients(ctx, tunnel)
  const r = Math.min(
    (focal * UNIVERSE_HOP_EXIT_R_K) / view.ez,
    UNIVERSE_HOP_EXIT_R_MAX_FRAC * Math.min(frame.w, frame.h),
  )
  const ex = mx + (focal * view.ex) / view.ez
  const ey = my - (focal * view.ey) / view.ez
  const sq = ringSquash(view.ex, view.ey, view.ez, view.etx, view.ety, view.etz)
  const sa = ringAngle(view.etx, view.ety)
  // Hof, additiv, unter dem Saum.
  ctx.save()
  ctx.translate(ex, ey)
  ctx.rotate(sa)
  ctx.scale(r * UNIVERSE_HOP_EXIT_HALO_K * sq, r * UNIVERSE_HOP_EXIT_HALO_K)
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = additiveDrawAlpha(UNIVERSE_HOP_EXIT_HALO_ALPHA * light, fade)
  ctx.fillStyle = tunnel.halo!
  ctx.fillRect(-1, -1, 2, 2)
  ctx.globalCompositeOperation = 'source-over'
  ctx.restore()
  // Das Zielfeld, in die Scheibe geschnitten und wie das Tor frontal entzerrt.
  ctx.save()
  ctx.translate(ex, ey)
  ctx.rotate(sa)
  ctx.scale(sq, 1)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.clip()
  if (frame.peek) {
    const sc = (r * 2) / frame.peekPx
    ctx.scale(sc, sc / UNIVERSE_MAP_PORTAL_RY)
    ctx.globalAlpha = persistentDrawAlpha(UNIVERSE_HOP_EXIT_PEEK_ALPHA * light, fade)
    ctx.drawImage(
      frame.peek,
      -frame.peekSpan / 2,
      -frame.peekSpan / 2,
      frame.peekSpan,
      frame.peekSpan,
    )
    ctx.scale(1 / sc, UNIVERSE_MAP_PORTAL_RY / sc)
  }
  ctx.scale(r, r)
  ctx.globalAlpha = persistentDrawAlpha(light, fade)
  ctx.fillStyle = tunnel.exit!
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
  ctx.globalAlpha = 1
}
