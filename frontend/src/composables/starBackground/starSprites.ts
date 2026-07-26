import {
  STAR_SPRITE_CORE_R,
  STAR_SPRITE_HALO_SCALE,
  STAR_SPRITE_HALO_ALPHA,
  STAR_SPRITE_SUPERSAMPLE,
} from '@/config/constants'

/**
 * Vorgerenderte Stern-Sprites für den Hintergrund-Canvas.
 *
 * Vorher zeichnete `animateStars()` pro Frame ~1000 Canvas-Pfade: für jeden der
 * 400 Hintergrundsterne einen Kern-Kreis PLUS einen doppelt so großen Halo-Kreis,
 * dazu ~200 Cluster-Punkte. Jeder einzelne davon mit einem frisch gebauten
 * `rgba(…)`-String als `fillStyle` — also ~600 String-Allokationen und ebenso
 * viele CSS-Farb-Parses pro Frame. Gemessen: 2,9 ms/Frame und damit 82 % der
 * gesamten rAF-Last des Spiels (Orbit 85 fps ↔ Star-Fight-Modal 118 fps, weil
 * der Loop dort pausiert).
 *
 * Die Sternpalette hat nur 10 Farben (SPECTRAL_STAR_PALETTE). Pro Farbe wird
 * daher einmal ein kleines Offscreen-Canvas gerendert und danach nur noch per
 * `drawImage` geblittet:
 *   - Alpha-Variation (Twinkle, Distanz-Fade) → `ctx.globalAlpha`
 *   - Größenvariation (Distanz)               → Zielmaße von `drawImage`
 *
 * Die Sprites werden supersampled gerendert und immer verkleinert gezeichnet —
 * dadurch bleiben auch die kleinsten Sterne (Kernradius < 1 px) sauber.
 */

/** Kern-Sprite mit Halo (Hintergrundsterne). */
const starSprites = new Map<number, HTMLCanvasElement>()
/** Reiner Punkt ohne Halo (Cluster-Sterne). */
const dotSprites = new Map<number, HTMLCanvasElement>()

function colorKey(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b
}

/**
 * Kern (Alpha 1) + darübergelegter Halo (Alpha STAR_SPRITE_HALO_ALPHA) —
 * dieselbe Reihenfolge und dasselbe Alpha-Verhältnis wie die früheren zwei
 * Einzel-Fills, nur eben einmalig statt 60×/s.
 */
function buildStarSprite(r: number, g: number, b: number): HTMLCanvasElement {
  const ss = STAR_SPRITE_SUPERSAMPLE
  const haloR = STAR_SPRITE_CORE_R * STAR_SPRITE_HALO_SCALE
  const side = Math.ceil(haloR * 2 * ss)
  const cv = document.createElement('canvas')
  cv.width = side
  cv.height = side
  const c = cv.getContext('2d')
  if (c) {
    const center = side / 2
    const rgb = `${r},${g},${b}`
    c.beginPath()
    c.arc(center, center, STAR_SPRITE_CORE_R * ss, 0, Math.PI * 2)
    c.fillStyle = `rgb(${rgb})`
    c.fill()
    c.beginPath()
    c.arc(center, center, haloR * ss, 0, Math.PI * 2)
    c.fillStyle = `rgba(${rgb},${STAR_SPRITE_HALO_ALPHA})`
    c.fill()
  }
  return cv
}

function buildDotSprite(r: number, g: number, b: number): HTMLCanvasElement {
  const ss = STAR_SPRITE_SUPERSAMPLE
  const side = Math.ceil(STAR_SPRITE_CORE_R * 2 * ss)
  const cv = document.createElement('canvas')
  cv.width = side
  cv.height = side
  const c = cv.getContext('2d')
  if (c) {
    const center = side / 2
    c.beginPath()
    c.arc(center, center, STAR_SPRITE_CORE_R * ss, 0, Math.PI * 2)
    c.fillStyle = `rgb(${r},${g},${b})`
    c.fill()
  }
  return cv
}

/** Stern-Sprite (Kern + Halo) für eine Palettenfarbe — lazy gebaut, dann gecacht. */
export function starSprite(r: number, g: number, b: number): HTMLCanvasElement {
  const key = colorKey(r, g, b)
  let sprite = starSprites.get(key)
  if (!sprite) {
    sprite = buildStarSprite(r, g, b)
    starSprites.set(key, sprite)
  }
  return sprite
}

/** Punkt-Sprite (ohne Halo) für eine Palettenfarbe — lazy gebaut, dann gecacht. */
export function dotSprite(r: number, g: number, b: number): HTMLCanvasElement {
  const key = colorKey(r, g, b)
  let sprite = dotSprites.get(key)
  if (!sprite) {
    sprite = buildDotSprite(r, g, b)
    dotSprites.set(key, sprite)
  }
  return sprite
}

/**
 * Stern zeichnen. `coreR` ist der Radius, den der Kern haben soll — das Sprite
 * wird so skaliert, dass Kern und Halo dieselben Maße wie früher bekommen.
 */
export function drawStarSprite(
  ctx: CanvasRenderingContext2D,
  r: number,
  g: number,
  b: number,
  x: number,
  y: number,
  coreR: number,
  alpha: number,
): void {
  const half = coreR * STAR_SPRITE_HALO_SCALE
  ctx.globalAlpha = alpha
  ctx.drawImage(starSprite(r, g, b), x - half, y - half, half * 2, half * 2)
}

/** Cluster-Punkt zeichnen — `dotR` ist der gewünschte Radius. */
export function drawDotSprite(
  ctx: CanvasRenderingContext2D,
  r: number,
  g: number,
  b: number,
  x: number,
  y: number,
  dotR: number,
  alpha: number,
): void {
  ctx.globalAlpha = alpha
  ctx.drawImage(dotSprite(r, g, b), x - dotR, y - dotR, dotR * 2, dotR * 2)
}
