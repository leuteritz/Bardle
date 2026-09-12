// Die Wormhole-Röhre des Universumssprungs — auf dem Sternfeld-Canvas, in
// derselben Schleife, ohne Verlauf je Strand und Frame.
//
// Geometrie: Scheiben in exponentieller Tiefe (v 0 fern … 1 nah). Ihr
// Mittelpunkt wandert vom Fluchtpunkt (fern) zur Bildmitte (nah), mit
// Ausbauchung — steht der Fokus neben der Mitte, KRÜMMT sich die Röhre. Die
// Wand ist EIN gebackener weicher Ring mit Lichtfasern, je Scheibe additiv
// gezeichnet (fern hell, nah dunkel: der Trichter); die Stränge sind
// Polylinien durch die Scheibenpunkte, verdrillt um den Roll.
import {
  UNIVERSE_HOP_EXIT_BRIGHT_ALPHA,
  UNIVERSE_HOP_EXIT_BRIGHT_STOP,
  UNIVERSE_HOP_EXIT_CORE_ALPHA,
  UNIVERSE_HOP_EXIT_HALO_ALPHA,
  UNIVERSE_HOP_EXIT_HALO_K,
  UNIVERSE_HOP_EXIT_MID_ALPHA,
  UNIVERSE_HOP_EXIT_MID_STOP,
  UNIVERSE_HOP_GROUP_LEAD_FRAC,
  UNIVERSE_HOP_GROUP_SWAY_FRAC,
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
  UNIVERSE_HOP_TUNNEL_BEND_OVERSHOOT,
  UNIVERSE_HOP_TUNNEL_BEND_POW,
  UNIVERSE_HOP_TUNNEL_BODY_ALPHA,
  UNIVERSE_HOP_TUNNEL_CYCLES_PER_SEC,
  UNIVERSE_HOP_TUNNEL_R_MAX_K,
  UNIVERSE_HOP_TUNNEL_R_MIN_FRAC,
  UNIVERSE_HOP_TUNNEL_RING_ALPHA,
  UNIVERSE_HOP_TUNNEL_RINGS,
  UNIVERSE_HOP_TUNNEL_ROLL_RAD_S,
  UNIVERSE_HOP_TUNNEL_SLICES,
  UNIVERSE_HOP_TUNNEL_STRANDS,
  UNIVERSE_HOP_WALL_ALPHA_FAR,
  UNIVERSE_HOP_WALL_ALPHA_NEAR,
  UNIVERSE_HOP_WALL_FAR_DIM,
  UNIVERSE_HOP_WALL_FIBERS,
  UNIVERSE_HOP_WALL_RING_WIDTH_FRAC,
  UNIVERSE_HOP_WALL_SPRITE_PX,
  UNIVERSE_MAP_PORTAL_RY,
  WORMHOLE_BRIGHT_LIFT,
  WORMHOLE_CORE_LIFT,
  WORMHOLE_DEEP_MIX,
} from '@/config/constants'
import { additiveDrawAlpha, persistentDrawAlpha } from '@/utils/orbit/galaxyWarp'
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
  /** Scheiben dieses Frames: Mittelpunkt und Radius — kein Allokieren je Frame. */
  sx: Float64Array
  sy: Float64Array
  sr: Float64Array
  /** Die Wand: gebacken beim Sprungstart (`bakeWormholeWall`), null ohne DOM. */
  wall: HTMLCanvasElement | null
  /** Ausgangslicht: EIN Verlauf im Einheitsradius, je Frame nur skaliert. */
  exit: CanvasGradient | null
}

export interface WormholeFrame {
  /** Fluchtpunkt in Canvas-px. */
  cx: number
  cy: number
  w: number
  h: number
  /** Abstand Fluchtpunkt → fernste Ecke. */
  far: number
  tunnelSec: number
  twist: number
  trailFade: number
  /** 0 … 1: Einblendung der Röhre. */
  tubeAlpha: number
  /** 0 … 1: das Ausgangslicht — 0 bis zum Reveal, die Röhre läuft in Dunkel aus. */
  exitLight: number
  exitR: number
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
    wall: null,
    exit: null,
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

/** Mittelpunkt-Anteil Fokus → Bildmitte je Tiefe: fern am Fokus, nah um die Kamera, dazwischen ausgebaucht. */
export function wormholeBendAt(v: number): number {
  return (
    Math.pow(v, UNIVERSE_HOP_TUNNEL_BEND_POW) +
    UNIVERSE_HOP_TUNNEL_BEND_OVERSHOOT * Math.sin(Math.PI * v)
  )
}

/**
 * Nachziehen der Gruppe (Sonne + Prozession) in die Kurve: ein kleiner Anteil des
 * Fokusabstands plus Schlingern quer dazu in Roll-Richtung — die Kamera folgt dem
 * Spieler, er bleibt nahe der Mitte. `dx/dy` = Fluchtpunkt minus Bildmitte, `lead` 0 … 1.
 */
export function wormholeGroupShift(
  dx: number,
  dy: number,
  roll: number,
  minEdge: number,
  lead: number,
  out: { x: number; y: number },
): void {
  const along = UNIVERSE_HOP_GROUP_LEAD_FRAC * lead
  const len = Math.hypot(dx, dy)
  const sway = (roll / UNIVERSE_HOP_TUNNEL_ROLL_RAD_S) * UNIVERSE_HOP_GROUP_SWAY_FRAC * minEdge * lead
  const px = len > 1e-6 ? -dy / len : 0
  const py = len > 1e-6 ? dx / len : 0
  out.x = dx * along + px * sway
  out.y = dy * along + py * sway
}

/** Deckkraft der Wand je Tiefe — fern hell, nah dunkel. */
export function wormholeWallAlphaAt(v: number): number {
  return (
    UNIVERSE_HOP_WALL_ALPHA_FAR + (UNIVERSE_HOP_WALL_ALPHA_NEAR - UNIVERSE_HOP_WALL_ALPHA_FAR) * v
  )
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
  twist: number,
): void {
  ctx.beginPath()
  const last = UNIVERSE_HOP_TUNNEL_SLICES - 1
  for (let k = from; k <= to; k++) {
    const v = k / last
    const th = tunnel.az[m]! + (twist + tunnel.spin[m]!) * (1 - v)
    const x = tunnel.sx[k]! + Math.cos(th) * tunnel.sr[k]!
    const y = tunnel.sy[k]! + Math.sin(th) * tunnel.sr[k]!
    if (k === from) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

function fillExit(
  ctx: CanvasRenderingContext2D,
  tunnel: WormholeTunnel,
  frame: WormholeFrame,
  r: number,
  alpha: number,
): void {
  ctx.save()
  ctx.translate(frame.cx, frame.cy)
  ctx.scale(r, r / UNIVERSE_MAP_PORTAL_RY)
  ctx.globalAlpha = alpha
  ctx.fillStyle = tunnel.exit!
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

/** Wand, Stränge, Rippen und Ausgangslicht — NACH dem Tor. */
export function drawWormholeTunnel(
  ctx: CanvasRenderingContext2D,
  tunnel: WormholeTunnel,
  frame: WormholeFrame,
): void {
  if (frame.tubeAlpha <= 0) return
  const s = UNIVERSE_HOP_TUNNEL_SLICES
  const last = s - 1
  const rMin = UNIVERSE_HOP_TUNNEL_R_MIN_FRAC * frame.far
  const ratio = UNIVERSE_HOP_TUNNEL_R_MAX_K / UNIVERSE_HOP_TUNNEL_R_MIN_FRAC
  const mx = frame.w / 2
  const my = frame.h / 2
  for (let k = 0; k < s; k++) {
    const v = k / last
    const b = wormholeBendAt(v)
    tunnel.sx[k] = frame.cx + (mx - frame.cx) * b
    tunnel.sy[k] = frame.cy + (my - frame.cy) * b
    tunnel.sr[k] = rMin * Math.pow(ratio, v)
  }
  const twist = frame.twist * UNIVERSE_HOP_STRAND_TWIST
  const ramp = frame.tubeAlpha
  const fade = frame.trailFade
  const p = tunnel.palette

  // Die Wand: je Scheibe der gebackene Ring, additiv, mit der Tiefe dunkler.
  if (tunnel.wall) {
    const px = UNIVERSE_HOP_WALL_SPRITE_PX
    ctx.globalCompositeOperation = 'lighter'
    for (let k = 1; k < s; k++) {
      const v = k / last
      const sc = (tunnel.sr[k]! * 2) / px
      ctx.setTransform(sc, 0, 0, sc, tunnel.sx[k]!, tunnel.sy[k]!)
      ctx.rotate(twist * (1 - v))
      // Die fernste Scheibe bleibt gedämpft, solange das Ende nicht zu sehen ist.
      const dim = k === 1 ? 1 - UNIVERSE_HOP_WALL_FAR_DIM * (1 - frame.exitLight) : 1
      ctx.globalAlpha = additiveDrawAlpha(wormholeWallAlphaAt(v) * ramp * dim, fade)
      ctx.drawImage(tunnel.wall, -px / 2, -px / 2, px, px)
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
  }

  // Die Stränge laufen aus dem dunklen Schlund (Scheibe 2) an der Kamera vorbei
  // (Scheibe last−1); geteilt in fern (dünn, hell) und nah (breit, matt) — Alpha
  // und Breite gelten je Pfad.
  const mid = Math.floor(last / 2)
  ctx.lineJoin = 'round'
  // Pass 1: Glow, additiv — überlappende Stränge blühen auf. Das nahe Segment
  // läuft bis zur letzten Scheibe (hinter dem Bildrand): ein Strichende im Bild
  // las sich als Balken.
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = `rgb(${p.bright})`
  ctx.lineCap = 'round'
  for (let m = 0; m < tunnel.az.length; m++) {
    const wk = tunnel.width[m]!
    ctx.globalAlpha = additiveDrawAlpha(UNIVERSE_HOP_STRAND_GLOW_ALPHA * ramp, fade)
    ctx.lineWidth = UNIVERSE_HOP_STRAND_GLOW_W_FAR * wk
    strokeStrand(ctx, tunnel, m, 2, mid, twist)
    ctx.globalAlpha = additiveDrawAlpha(
      UNIVERSE_HOP_STRAND_GLOW_ALPHA * UNIVERSE_HOP_STRAND_NEAR_ALPHA_K * ramp,
      fade,
    )
    ctx.lineWidth = UNIVERSE_HOP_STRAND_GLOW_W_NEAR * wk
    strokeStrand(ctx, tunnel, m, mid, last, twist)
  }
  ctx.globalCompositeOperation = 'source-over'
  // Pass 2: Kern, gestrichelt — der Versatz läuft in Pfadrichtung, also auf die Kamera zu.
  ctx.strokeStyle = `rgb(${p.core})`
  ctx.setLineDash([UNIVERSE_HOP_STRAND_DASH_PX, UNIVERSE_HOP_STRAND_GAP_PX])
  const flow = frame.tunnelSec * UNIVERSE_HOP_STRAND_FLOW_PX_S
  for (let m = 0; m < tunnel.az.length; m++) {
    const wk = tunnel.width[m]!
    const g = tunnel.gain[m]!
    ctx.lineDashOffset = -(flow + tunnel.phase[m]!)
    ctx.globalAlpha = persistentDrawAlpha(UNIVERSE_HOP_STRAND_CORE_ALPHA * g * ramp, fade)
    ctx.lineWidth = UNIVERSE_HOP_STRAND_CORE_W_FAR * wk
    strokeStrand(ctx, tunnel, m, 2, mid, twist)
    ctx.globalAlpha = persistentDrawAlpha(
      UNIVERSE_HOP_STRAND_CORE_ALPHA * UNIVERSE_HOP_STRAND_NEAR_ALPHA_K * g * ramp,
      fade,
    )
    ctx.lineWidth = UNIVERSE_HOP_STRAND_CORE_W_NEAR * wk
    strokeStrand(ctx, tunnel, m, mid, last, twist)
  }
  ctx.setLineDash([])
  ctx.lineDashOffset = 0
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'miter'
  // Rippen: die Echo-Ringe, zentriert auf der gebogenen Achse.
  ctx.strokeStyle = `rgb(${p.mid})`
  for (let i = 0; i < UNIVERSE_HOP_TUNNEL_RINGS; i++) {
    const u =
      (frame.tunnelSec * UNIVERSE_HOP_TUNNEL_CYCLES_PER_SEC + i / UNIVERSE_HOP_TUNNEL_RINGS) % 1
    const r = rMin * Math.pow(ratio, u)
    const b = wormholeBendAt(u)
    ctx.globalAlpha = persistentDrawAlpha(UNIVERSE_HOP_TUNNEL_RING_ALPHA * (1 - u) * ramp, fade)
    ctx.lineWidth = Math.max(1, r * 0.02)
    ctx.beginPath()
    ctx.arc(frame.cx + (mx - frame.cx) * b, frame.cy + (my - frame.cy) * b, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  // Ausgangslicht am Fokus, frontal entzerrt wie das Tor; darum ein weiter Hof (additiv).
  // Erst ab dem Reveal — das Ende zeigt sich am Ende.
  if (frame.exitLight <= 0) {
    ctx.globalAlpha = 1
    return
  }
  const light = frame.exitLight
  if (!tunnel.exit) {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    grad.addColorStop(0, `rgba(${p.core},${UNIVERSE_HOP_EXIT_CORE_ALPHA})`)
    grad.addColorStop(
      UNIVERSE_HOP_EXIT_BRIGHT_STOP,
      `rgba(${p.bright},${UNIVERSE_HOP_EXIT_BRIGHT_ALPHA})`,
    )
    grad.addColorStop(UNIVERSE_HOP_EXIT_MID_STOP, `rgba(${p.mid},${UNIVERSE_HOP_EXIT_MID_ALPHA})`)
    grad.addColorStop(1, `rgba(${p.mid},0)`)
    tunnel.exit = grad
  }
  ctx.globalCompositeOperation = 'lighter'
  fillExit(
    ctx,
    tunnel,
    frame,
    frame.exitR * UNIVERSE_HOP_EXIT_HALO_K,
    additiveDrawAlpha(UNIVERSE_HOP_EXIT_HALO_ALPHA * light, fade),
  )
  ctx.globalCompositeOperation = 'source-over'
  fillExit(ctx, tunnel, frame, frame.exitR, persistentDrawAlpha(light, fade))
  ctx.globalAlpha = 1
}
