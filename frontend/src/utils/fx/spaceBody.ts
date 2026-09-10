/* ── Die EINE Werkzeugkiste für Körper im Sonnenlicht ─────────────────────────
   Drifter, Landfall und Void rastern ihre Körper mit denselben Bausteinen:
   Hash statt rng, eine geteilte Rauschkachel, Terminator per `source-atop`,
   LRU-Cache, und ein Blit in ein eigenes Canvas je Host — ein Canvas kann nur
   an EINER DOM-Stelle hängen, ein Drifter steht aber im Flug, auf der
   Infokarte und in neun Admin-Kacheln zugleich.                               */

import {
  SPACE_BODY_AMBIENT_ALPHA,
  SPACE_BODY_AMBIENT_RGB,
  SPACE_BODY_LUMPY_POINTS,
  SPACE_BODY_NOISE_TILE_PX,
  SPACE_BODY_SPRITE_MAX_DPR,
} from '@/config/constants'

const TAU = Math.PI * 2

export interface BodyPalette {
  hi: string
  mid: string
  low: string
  edge: string
}

export type BodyPaint<P = BodyPalette> = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  pal: P,
  detail: 0 | 1 | 2,
) => void

/* ── Determinismus ──────────────────────────────────────────────────────────── */

/** 0..1 aus zwei ganzen Zahlen. Kein Zustand, keine Reihenfolge. */
export function jitter(a: number, b: number): number {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return h - Math.floor(h)
}

/** −1..1 — der übliche Fall, wenn etwas um eine Mittellage streuen soll. */
export function sway(a: number, b: number): number {
  return jitter(a, b) * 2 - 1
}

/* ── Rauschkachel ───────────────────────────────────────────────────────────── */

let noiseTile: HTMLCanvasElement | null = null

/** EINMAL je Sitzung gebaut; als Muster gefüllt kostet Rauschen einen `fill`. */
export function getNoiseTile(): HTMLCanvasElement | null {
  if (noiseTile) return noiseTile
  const size = SPACE_BODY_NOISE_TILE_PX
  const cv = document.createElement('canvas')
  cv.width = size
  cv.height = size
  const ctx = cv.getContext('2d')
  if (!ctx) return null
  const img = ctx.createImageData(size, size)
  for (let i = 0; i < size * size; i++) {
    const v = Math.round(jitter(i % size, Math.floor(i / size)) * 255)
    img.data[i * 4] = v
    img.data[i * 4 + 1] = v
    img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  noiseTile = cv
  return cv
}

/** Rauschen über den zuletzt gelegten Pfad — `source-atop`, verlässt die
 *  Silhouette nie. */
export function grain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
): void {
  const tile = getNoiseTile()
  if (!tile) return
  const pattern = ctx.createPattern(tile, 'repeat')
  if (!pattern) return
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = alpha
  ctx.fillStyle = pattern
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
  ctx.restore()
}

/* ── Silhouetten-Bausteine ──────────────────────────────────────────────────── */

/** Ein unrunder Körper — eine Kartoffel, kein Kreis. `wobble` ist der Anteil,
 *  um den ein Punkt vom Radius abweichen darf. */
export function lumpyPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  wobble: number,
  points = SPACE_BODY_LUMPY_POINTS,
): void {
  ctx.beginPath()
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2
    const rr = r * (1 + sway(seed, i) * wobble)
    const px = x + Math.cos(a) * rr
    const py = y + Math.sin(a) * rr
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

/** Grundfüllung eines festen Körpers: hell oben links, dunkel unten rechts.
 *  Das ist FORM, nicht Licht — die Sonnenseite macht der Terminator. */
export function bodyFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hi: string,
  mid: string,
  low: string,
): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.34, y - r * 0.36, r * 0.06, x, y, r * 1.04)
  g.addColorStop(0, hi)
  g.addColorStop(0.46, mid)
  g.addColorStop(1, low)
  return g
}

/** Krater: dunkle Schale mit hellem Gegenrand. */
export function crater(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  edge: string,
): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(8, 6, 4, 0.42)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y, r, Math.PI * 0.9, Math.PI * 1.9)
  ctx.strokeStyle = edge
  ctx.globalAlpha = 0.34
  ctx.lineWidth = Math.max(0.6, r * 0.3)
  ctx.stroke()
  ctx.globalAlpha = 1
}

/**
 * Die Sonnenseite — als LETZTER Pass über alles, was das Motiv gemalt hat.
 * Licht aus Richtung 0 Grad (LINKS); der Aufrufer dreht den Sprite auf den
 * Lichtwinkel. Die Schattenseite bekommt eine kühle Gegenfüllung: Sternenlicht,
 * kein reines Schwarz.
 */
export function paintTerminator(ctx: CanvasRenderingContext2D, span: number, r: number): void {
  const cx = span / 2
  const cy = span / 2
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  const g = ctx.createLinearGradient(cx - r, cy, cx + r, cy)
  g.addColorStop(0, 'rgba(255, 250, 236, 0.4)')
  g.addColorStop(0.12, 'rgba(255, 250, 236, 0.12)')
  g.addColorStop(0.28, 'rgba(255, 250, 236, 0)')
  g.addColorStop(0.46, 'rgba(4, 3, 2, 0)')
  g.addColorStop(0.7, 'rgba(4, 3, 2, 0.48)')
  g.addColorStop(1, 'rgba(4, 3, 2, 0.84)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, span, span)
  const ambient = ctx.createLinearGradient(cx, cy, cx + r, cy)
  ambient.addColorStop(0, `rgba(${SPACE_BODY_AMBIENT_RGB}, 0)`)
  ambient.addColorStop(1, `rgba(${SPACE_BODY_AMBIENT_RGB}, ${SPACE_BODY_AMBIENT_ALPHA})`)
  ctx.fillStyle = ambient
  ctx.fillRect(0, 0, span, span)
  ctx.restore()
}

/* ── Bau, Cache, Blit ───────────────────────────────────────────────────────── */

export function clampSpriteDpr(dpr: number): number {
  return Math.max(1, Math.min(dpr || 1, SPACE_BODY_SPRITE_MAX_DPR))
}

/** Ein Canvas mit `span` × `spanY` CSS-Pixeln, Rasterung mal `dpr`, Transform gesetzt. */
export function newSpriteCanvas(
  span: number,
  dpr: number,
  spanY = span,
): { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const cv = document.createElement('canvas')
  cv.width = Math.max(1, Math.round(span * dpr))
  cv.height = Math.max(1, Math.round(spanY * dpr))
  const ctx = cv.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { cv, ctx }
}

export interface SpriteCache {
  get(key: string): HTMLCanvasElement | undefined
  set(key: string, cv: HTMLCanvasElement): void
  clear(): void
  readonly size: number
}

/** LRU: `get` frischt auf, `set` wirft den ältesten Eintrag hinaus. */
export function createSpriteCache(max: number): SpriteCache {
  const map = new Map<string, HTMLCanvasElement>()
  return {
    get(key) {
      const hit = map.get(key)
      if (!hit) return undefined
      map.delete(key)
      map.set(key, hit)
      return hit
    },
    set(key, cv) {
      map.delete(key)
      map.set(key, cv)
      while (map.size > max) {
        const oldest = map.keys().next().value
        if (oldest === undefined) break
        map.delete(oldest)
      }
    },
    clear() {
      map.clear()
    },
    get size() {
      return map.size
    },
  }
}

/** Den Cache-Eintrag EINMAL in ein eigenes Canvas des Hosts malen. `null` leert. */
export function blitSprite(host: HTMLElement, sprite: HTMLCanvasElement | null): void {
  if (!sprite) {
    host.replaceChildren()
    return
  }
  let cv = host.firstElementChild as HTMLCanvasElement | null
  if (!cv || cv.tagName !== 'CANVAS') {
    cv = document.createElement('canvas')
    host.replaceChildren(cv)
  }
  cv.width = sprite.width
  cv.height = sprite.height
  const ctx = cv.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, cv.width, cv.height)
  ctx.drawImage(sprite, 0, 0)
}

/* ── Selbstleuchter-Bausteine (Sterne, Spielerkörper) ─────────────────────── */

export type Rgb = readonly [number, number, number]

export function mix(rgb: Rgb, to: number, t: number): Rgb {
  return [
    Math.round(rgb[0] + (to - rgb[0]) * t),
    Math.round(rgb[1] + (to - rgb[1]) * t),
    Math.round(rgb[2] + (to - rgb[2]) * t),
  ]
}

export function rgba(rgb: Rgb, a: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.closePath()
}

export function haloGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rgb: Rgb,
  reach: number,
  alpha: number,
): void {
  const g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r * reach)
  g.addColorStop(0, rgba(rgb, alpha))
  g.addColorStop(0.3, rgba(rgb, alpha * 0.45))
  g.addColorStop(1, rgba(rgb, 0))
  circle(ctx, x, y, r * reach)
  ctx.fillStyle = g
  ctx.fill()
}

/** Ein weicher Nebelfetzen: unrunde Kontur, Verlauf läuft zum Rand aus. */
export function wisp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  rgb: Rgb,
  alpha: number,
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(rgb, alpha))
  g.addColorStop(0.55, rgba(rgb, alpha * 0.5))
  g.addColorStop(1, rgba(rgb, 0))
  lumpyPath(ctx, x, y, r, seed, 0.28, 24)
  ctx.fillStyle = g
  ctx.fill()
}

/** Ein Zacken von `from` bis `to` (Radien), Breite am Fuss `w`. */
export function spike(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  a: number,
  from: number,
  to: number,
  w: number,
): void {
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const nx = -sa * w
  const ny = ca * w
  ctx.beginPath()
  ctx.moveTo(x + ca * from + nx, y + sa * from + ny)
  ctx.lineTo(x + ca * to, y + sa * to)
  ctx.lineTo(x + ca * from - nx, y + sa * from - ny)
  ctx.closePath()
}

export function rayGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rgb: Rgb,
  from: number,
  to: number,
  alpha: number,
): CanvasGradient {
  const g = ctx.createRadialGradient(x, y, r * from, x, y, r * to)
  g.addColorStop(0, rgba(mix(rgb, 255, 0.6), alpha))
  g.addColorStop(0.45, rgba(rgb, alpha * 0.55))
  g.addColorStop(1, rgba(rgb, 0))
  return g
}

/** Eine Protuberanz: ein Bogen, der auf dem Rand aufsetzt und nach aussen wölbt. */
export function flareLoop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  br: number,
  a: number,
  spread: number,
  rise: number,
): void {
  const a1 = a - spread
  const a2 = a + spread
  const top = br * (1 + rise)
  ctx.beginPath()
  ctx.moveTo(x + Math.cos(a1) * br * 0.96, y + Math.sin(a1) * br * 0.96)
  ctx.bezierCurveTo(
    x + Math.cos(a1) * top,
    y + Math.sin(a1) * top,
    x + Math.cos(a2) * top,
    y + Math.sin(a2) * top,
    x + Math.cos(a2) * br * 0.96,
    y + Math.sin(a2) * br * 0.96,
  )
}

/* ── Rollende Oberfläche: Streifen statt Drehung ─────────────────────────── */

/** Ein Streifen trägt ZWEI Perioden: `translateX(50 %)` fährt genau eine, die
 *  Naht bleibt unsichtbar. `(x, y)` ist die Streifenmitte. */
export interface Strip {
  x0: number
  y0: number
  w: number
  h: number
  period: number
  br: number
}

export function makeStrip(
  x: number,
  y: number,
  br: number,
  period: number,
  periods: number,
  h: number,
): Strip {
  const w = period * periods
  return { x0: x - w / 2, y0: y - h / 2, w, h, period, br }
}

/** Längengrad 0..P eines Motivs. */
export function wrapLon(s: Strip, lon: number): number {
  return ((lon % s.period) + s.period) % s.period
}

/** Eine Konvektionszelle: heller Kern, dunkler Saum. */
export function granule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cr: number,
  hi: Rgb,
  lo: Rgb,
  alpha: number,
  rim = 0.7,
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, cr)
  g.addColorStop(0, rgba(hi, alpha))
  g.addColorStop(0.55, rgba(hi, 0))
  g.addColorStop(0.82, rgba(lo, alpha * rim))
  g.addColorStop(1, rgba(lo, 0))
  circle(ctx, x, y, cr)
  ctx.fillStyle = g
  ctx.fill()
}

/** Zellen über EINE Periode, jede doppelt (bei cx und cx + P) — die Naht ist unsichtbar. */
export function granulationStrip(
  ctx: CanvasRenderingContext2D,
  s: Strip,
  cell: number,
  seed: number,
  hi: Rgb,
  lo: Rgb,
  alpha: number,
  cap: number,
  rim: number,
): void {
  const step = cell * 1.7
  const cols = Math.ceil(s.period / step)
  const rows = Math.ceil(s.h / (step * 0.88))
  let n = 0
  for (let gy = 0; gy <= rows && n < cap; gy++) {
    const off = (gy & 1) * step * 0.5
    for (let gx = 0; gx < cols && n < cap; gx++) {
      const cx = wrapLon(s, gx * step + off + sway(seed, gx * 31 + gy) * step * 0.35)
      const cy = gy * step * 0.88 + sway(seed, gx + gy * 47) * step * 0.35
      if (cy < 0 || cy > s.h) continue
      const cr = cell * (0.7 + jitter(seed, gx * 7 + gy * 13) * 0.6)
      granule(ctx, s.x0 + cx, s.y0 + cy, cr, hi, lo, alpha, rim)
      granule(ctx, s.x0 + cx + s.period, s.y0 + cy, cr, hi, lo, alpha, rim)
      n += 2
    }
  }
}

/** Sonnenflecken im Streifen: Umbra plus Penumbra, ohne Randstauchung — die
 *  übernimmt die Kreismaske am Slot. */
export function stripSpots(
  ctx: CanvasRenderingContext2D,
  s: Strip,
  seed: number,
  groups: number,
  dark: Rgb,
  margin: number,
  sizeK = 0.05,
): void {
  const reach = Math.max(0, s.h / 2 - margin)
  for (let g = 0; g < groups; g++) {
    const lon = jitter(seed, 700 + g) * s.period
    const lat = s.h / 2 + sway(seed, 710 + g) * reach
    const spots = 1 + Math.floor(jitter(seed, 720 + g) * 3)
    for (let k = 0; k < spots; k++) {
      const px = wrapLon(s, lon + sway(seed, 730 + g * 5 + k) * s.br * 0.12)
      const py = lat + sway(seed, 740 + g * 5 + k) * s.br * 0.06
      const size = s.br * sizeK * (0.6 + jitter(seed, 750 + g * 5 + k) * 0.8)
      const ang = sway(seed, 760 + g * 5 + k) * 0.6
      for (const dx of [0, s.period]) {
        const cx = s.x0 + px + dx
        const cy = s.y0 + py
        ctx.beginPath()
        ctx.ellipse(cx, cy, size * 2.1, size * 1.7, ang, 0, TAU)
        ctx.fillStyle = rgba(dark, 0.32)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(cx, cy, size, size * 0.82, ang, 0, TAU)
        ctx.fillStyle = rgba(mix(dark, 0, 0.5), 0.88)
        ctx.fill()
      }
    }
  }
}

/** Auslauf oben und unten — die Bänder überlappen, keine Naht darf stehen. */
export function fadeStripEdges(ctx: CanvasRenderingContext2D, s: Strip, fade: number): void {
  const f = s.h > 0 ? Math.min(0.45, fade / s.h) : 0
  const g = ctx.createLinearGradient(0, s.y0, 0, s.y0 + s.h)
  g.addColorStop(0, 'rgba(0, 0, 0, 0)')
  g.addColorStop(f, 'rgba(0, 0, 0, 1)')
  g.addColorStop(1 - f, 'rgba(0, 0, 0, 1)')
  g.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = g
  ctx.fillRect(s.x0, s.y0, s.w, s.h)
  ctx.restore()
}

/** Felskorn im Streifen — dieselbe Sprenkelung wie `grain`, nur wandernd und
 *  nahtlos (jedes Korn bei `lon` UND `lon + period`). Stünde das Korn weiter
 *  still im Kern, liefen die Krater über eine stehende Oberfläche, und der
 *  Fels drehte sich nicht mit. */
export function stripGrain(
  ctx: CanvasRenderingContext2D,
  s: Strip,
  seed: number,
  count: number,
  hi: Rgb,
  lo: Rgb,
  alpha: number,
): void {
  // Vier Ziehungen je Korn mit Schrittweite 4 — dieselbe Basis für alle vier
  // liefe sonst über die Nachbarn und zöge sichtbare Diagonalen ins Korn.
  for (let i = 0; i < count; i++) {
    const k = 1600 + i * 4
    const lon = jitter(seed, k) * s.period
    const lat = jitter(seed, k + 1) * s.h
    const gr = s.br * (0.006 + jitter(seed, k + 2) * 0.018)
    const up = sway(seed, k + 3) > 0
    // Der Ton kommt aus der Palette, nicht aus Schwarz und Weiss — sonst wird
    // aus dem Fels Streusel.
    ctx.fillStyle = rgba(up ? hi : lo, up ? alpha : alpha * 1.3)
    for (const dx of [0, s.period]) {
      ctx.beginPath()
      ctx.arc(s.x0 + lon + dx, s.y0 + lat, gr, 0, TAU)
      ctx.fill()
    }
  }
}
