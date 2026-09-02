/* ── Penumbra ─────────────────────────────────────────────────────────────────
   Der Raum jenseits der Scheibe: Stroeme in EINER Hauptrichtung, hinter der
   Scheibe hindurch, dazu wenige Motes, die darauf reiten. Keine Sterne — dort
   ist kein Universum. Ein Bake je Buehnengroesse, kein Frame.

   EIN `seededRng`-Strom, feste Ziehreihenfolge: drei Phasen, dann je Band
   (Quer-Jitter, Laengsversatz, Breite, Alpha, warm/kalt), dann je Mote
   (Band, Punkt, Seitenversatz, rx, Achsverhaeltnis). */

import { seededRng } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  FIRMAMENT_PENUMBRA_ALPHA_MAX,
  FIRMAMENT_PENUMBRA_ALPHA_MIN,
  FIRMAMENT_PENUMBRA_BAND_GAP,
  FIRMAMENT_PENUMBRA_BAND_W_MAX,
  FIRMAMENT_PENUMBRA_BAND_W_MIN,
  FIRMAMENT_PENUMBRA_BANDS_MAX,
  FIRMAMENT_PENUMBRA_BANDS_MIN,
  FIRMAMENT_PENUMBRA_BLUR_PASSES,
  FIRMAMENT_PENUMBRA_DAMP_IN,
  FIRMAMENT_PENUMBRA_DAMP_OUT,
  FIRMAMENT_PENUMBRA_DISC_DAMP,
  FIRMAMENT_PENUMBRA_FLOW_DEG,
  FIRMAMENT_PENUMBRA_GROUND,
  FIRMAMENT_PENUMBRA_INK_COLD,
  FIRMAMENT_PENUMBRA_INK_WARM,
  FIRMAMENT_PENUMBRA_MAX_STEPS,
  FIRMAMENT_PENUMBRA_MOTE_ALPHA,
  FIRMAMENT_PENUMBRA_MOTE_INK,
  FIRMAMENT_PENUMBRA_MOTE_RATIO_MAX,
  FIRMAMENT_PENUMBRA_MOTE_RATIO_MIN,
  FIRMAMENT_PENUMBRA_MOTE_RX,
  FIRMAMENT_PENUMBRA_MOTES_MAX,
  FIRMAMENT_PENUMBRA_MOTES_PER_BAND,
  FIRMAMENT_PENUMBRA_OVERSCAN,
  FIRMAMENT_PENUMBRA_SEED_JITTER,
  FIRMAMENT_PENUMBRA_STEP,
  FIRMAMENT_PENUMBRA_WARM_SHARE,
  FIRMAMENT_PENUMBRA_WAVES,
  FIRMAMENT_PLATE_REF_R,
} from '@/config/constants'
import { firmamentFitBox } from '@/utils/ui/firmamentLayout'
import { hexToRgb } from '@/utils/ui/format'

type Vec = { x: number; y: number }
type Flow = (x: number, y: number) => Vec
type Bounds = { x0: number; y0: number; x1: number; y1: number }

function ink(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${+alpha.toFixed(3)})`
}

const lerp = (lo: number, hi: number, t: number) => lo + (hi - lo) * t

/** Hauptrichtung plus Rotation eines Skalarpotentials — divergenzfrei, und
 *  mit Summe der Amplituden < 1 weicht kein Punkt weiter als atan(ΣA) ab. */
function penumbraFlow(w: number, h: number, phases: readonly number[]): Flow {
  const a = (FIRMAMENT_PENUMBRA_FLOW_DEG * Math.PI) / 180
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  const L = Math.min(w, h)
  const waves = FIRMAMENT_PENUMBRA_WAVES.map(([lam, amp, deg], i) => {
    const t = a + (deg * Math.PI) / 180
    return {
      nx: Math.cos(t),
      ny: Math.sin(t),
      kappa: (2 * Math.PI) / (lam * L),
      amp,
      phi: phases[i] ?? 0,
    }
  })
  return (x, y) => {
    let vx = dx
    let vy = dy
    for (const wv of waves) {
      const c = wv.amp * Math.cos(wv.kappa * (wv.nx * x + wv.ny * y) + wv.phi)
      vx += c * wv.ny
      vy -= c * wv.nx
    }
    return { x: vx, y: vy }
  }
}

function inside(p: Vec, b: Bounds): boolean {
  return p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1
}

function march(flow: Flow, from: Vec, step: number, b: Bounds, sign: 1 | -1): Vec[] {
  const out: Vec[] = []
  let p = from
  for (let i = 0; i < FIRMAMENT_PENUMBRA_MAX_STEPS; i++) {
    const v = flow(p.x, p.y)
    const m = Math.hypot(v.x, v.y) || 1
    p = { x: p.x + (sign * step * v.x) / m, y: p.y + (sign * step * v.y) / m }
    out.push(p)
    if (!inside(p, b)) break
  }
  return out
}

/** Vor- und rueckwaerts vom Saatpunkt, bis der Ueberstand verlassen ist. */
function streamline(flow: Flow, seed: Vec, step: number, b: Bounds): Vec[] {
  const back = march(flow, seed, step, b, -1).reverse()
  return [...back, seed, ...march(flow, seed, step, b, 1)]
}

/** Drei Zuege wachsender Breite, fallender Deckkraft — Weichheit ohne
 *  `ctx.filter`, aussen zuerst. */
function strokeBand(
  ctx: CanvasRenderingContext2D,
  pts: Vec[],
  coreW: number,
  hex: string,
  coreAlpha: number,
): void {
  for (const [wMul, aMul] of FIRMAMENT_PENUMBRA_BLUR_PASSES) {
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.strokeStyle = ink(hex, coreAlpha * aMul)
    ctx.lineWidth = coreW * wMul
    ctx.stroke()
  }
}

export function paintFirmamentPenumbra(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
): void {
  const fit = firmamentFitBox(w, h)
  const k = fit.r / FIRMAMENT_PLATE_REF_R
  const L = Math.min(w, h)
  const ov = L * FIRMAMENT_PENUMBRA_OVERSCAN
  const bounds: Bounds = { x0: -ov, y0: -ov, x1: w + ov, y1: h + ov }
  const rng = seededRng(seed)

  const flow = penumbraFlow(w, h, [rng(), rng(), rng()].map((p) => p * Math.PI * 2))

  const a = (FIRMAMENT_PENUMBRA_FLOW_DEG * Math.PI) / 180
  const d: Vec = { x: Math.cos(a), y: Math.sin(a) }
  const perp: Vec = { x: -d.y, y: d.x }
  // Die Sehne der Senkrechten im Ueberstand: daran haengt die Zahl, und jede
  // Saat liegt INNEN — von aussen bricht der Marsch nach einem Schritt ab.
  const span =
    2 * Math.min((w / 2 + ov) / (Math.abs(perp.x) || 1e-9), (h / 2 + ov) / (Math.abs(perp.y) || 1e-9))
  const n = Math.min(
    FIRMAMENT_PENUMBRA_BANDS_MAX,
    Math.max(FIRMAMENT_PENUMBRA_BANDS_MIN, Math.round(span / (FIRMAMENT_PENUMBRA_BAND_GAP * k))),
  )
  const step = FIRMAMENT_PENUMBRA_STEP * k

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const bands: { pts: Vec[]; w: number }[] = []
  for (let i = 0; i < n; i++) {
    // Stratifiziert: nie zwei Baender uebereinander, das verdoppelte die Tinte.
    const u = ((i + 0.5 + (rng() - 0.5) * FIRMAMENT_PENUMBRA_SEED_JITTER) / n - 0.5) * span
    const along = (rng() - 0.5) * L * 0.5
    const coreW = lerp(FIRMAMENT_PENUMBRA_BAND_W_MIN, FIRMAMENT_PENUMBRA_BAND_W_MAX, rng()) * k
    const alpha = lerp(FIRMAMENT_PENUMBRA_ALPHA_MIN, FIRMAMENT_PENUMBRA_ALPHA_MAX, rng())
    const hex = rng() < FIRMAMENT_PENUMBRA_WARM_SHARE
      ? FIRMAMENT_PENUMBRA_INK_WARM
      : FIRMAMENT_PENUMBRA_INK_COLD
    const seedPt: Vec = {
      x: fit.cx + perp.x * u + d.x * along,
      y: fit.cy + perp.y * u + d.y * along,
    }
    const pts = streamline(flow, seedPt, step, bounds)
    strokeBand(ctx, pts, coreW, hex, alpha)
    bands.push({ pts, w: coreW })
  }

  // Motes reiten den Strom: Neigung = das Segment, auf dem sie sitzen.
  const clear = fit.r * FIRMAMENT_PENUMBRA_DAMP_OUT
  const motes = Math.min(FIRMAMENT_PENUMBRA_MOTES_MAX, n * FIRMAMENT_PENUMBRA_MOTES_PER_BAND)
  ctx.fillStyle = ink(FIRMAMENT_PENUMBRA_MOTE_INK, FIRMAMENT_PENUMBRA_MOTE_ALPHA)
  for (let j = 0; j < motes; j++) {
    const band = bands[Math.min(n - 1, Math.floor(rng() * n))]
    const idx = Math.min(band.pts.length - 2, Math.floor(rng() * (band.pts.length - 1)))
    const side = (rng() - 0.5) * 2.4 * band.w
    const rx = FIRMAMENT_PENUMBRA_MOTE_RX * k * (0.7 + rng() * 0.7)
    const ratio = lerp(FIRMAMENT_PENUMBRA_MOTE_RATIO_MIN, FIRMAMENT_PENUMBRA_MOTE_RATIO_MAX, rng())
    const p0 = band.pts[idx]
    const p1 = band.pts[idx + 1]
    const tilt = Math.atan2(p1.y - p0.y, p1.x - p0.x)
    const x = p0.x - Math.sin(tilt) * side
    const y = p0.y + Math.cos(tilt) * side
    if (Math.hypot(x - fit.cx, y - fit.cy) < clear) continue
    if (x < 0 || x > w || y < 0 || y > h) continue
    ctx.beginPath()
    ctx.ellipse(x, y, rx, rx * ratio, tilt, 0, Math.PI * 2)
    ctx.fill()
  }

  // Der Auslauf zur Platte: dunkel zu nichts, ein Schatten, keine Kante.
  const pool = ctx.createRadialGradient(
    fit.cx,
    fit.cy,
    fit.r * FIRMAMENT_PENUMBRA_DAMP_IN,
    fit.cx,
    fit.cy,
    fit.r * FIRMAMENT_PENUMBRA_DAMP_OUT,
  )
  pool.addColorStop(0, ink(FIRMAMENT_PENUMBRA_GROUND, FIRMAMENT_PENUMBRA_DISC_DAMP))
  pool.addColorStop(1, ink(FIRMAMENT_PENUMBRA_GROUND, 0))
  ctx.fillStyle = pool
  ctx.beginPath()
  ctx.rect(0, 0, w, h)
  ctx.fill()
}
