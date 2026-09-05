import {
  STAR_SPRITE_CORE_R,
  STAR_SPRITE_HALO_SCALE,
  STAR_SPRITE_HALO_ALPHA,
  STAR_SPRITE_SUPERSAMPLE,
  STAR_BG_FOG_TIERS,
  STAR_BG_FOG_RGB,
  STAR_BG_WARM_RGB,
  STAR_BG_WARM_MIX,
  STAR_BG_BLOOM_SPRITE_PX,
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
 * Die Sternpalette hat nur 10 Farben (SPECTRAL_STAR_PALETTE). Pro Farbe und
 * Tiefenstufe wird daher einmal ein kleines Offscreen-Canvas gerendert und
 * danach nur noch per `drawImage` geblittet:
 *   - Alpha-Variation (Twinkle, Distanz-Fade) → `ctx.globalAlpha`
 *   - Größenvariation (Distanz)               → Zielmaße von `drawImage`
 *
 * Die Sprites werden supersampled gerendert und immer verkleinert gezeichnet —
 * dadurch bleiben auch die kleinsten Sterne (Kernradius < 1 px) sauber.
 *
 * Tiefe: ferne Sterne sind in STAR_BG_FOG_RGB gemischt, die nahe Stufe leicht
 * warm — drei Stufen, kein Verlauf pro Frame.
 */

/** Kern-Sprite mit Halo (Hintergrundsterne), Schlüssel = Farbe | Stufe. */
const starSprites = new Map<number, HTMLCanvasElement>()
/** Reiner Punkt ohne Halo (Cluster-Sterne). */
const dotSprites = new Map<number, HTMLCanvasElement>()
/** Weicher Schein um die hellsten nahen Sterne. */
const bloomSprites = new Map<number, HTMLCanvasElement>()

const LAST_TIER = STAR_BG_FOG_TIERS.length - 1

function colorKey(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b
}

/** Tiefenstufe aus der normierten Distanz (0 = Fokus, 1 = Rand). */
export function starFogTier(norm: number): number {
  for (let i = 0; i < LAST_TIER; i++) if (norm <= STAR_BG_FOG_TIERS[i].maxNorm) return i
  return LAST_TIER
}

function tierColor(r: number, g: number, b: number, tier: number): [number, number, number] {
  const t = STAR_BG_FOG_TIERS[tier]
  const [fr, fg, fb] = tier === LAST_TIER ? STAR_BG_WARM_RGB : STAR_BG_FOG_RGB
  const m = tier === LAST_TIER ? STAR_BG_WARM_MIX : t.mix
  return [
    Math.round(r + (fr - r) * m),
    Math.round(g + (fg - g) * m),
    Math.round(b + (fb - b) * m),
  ]
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

/** Radialer Schein plus zwei leise Beugungskreuze — kein shadowBlur. */
function buildBloomSprite(r: number, g: number, b: number): HTMLCanvasElement {
  const side = STAR_BG_BLOOM_SPRITE_PX
  const cv = document.createElement('canvas')
  cv.width = side
  cv.height = side
  const c = cv.getContext('2d')
  if (c) {
    const center = side / 2
    const rgb = `${r},${g},${b}`
    const glow = c.createRadialGradient(center, center, 0, center, center, center)
    glow.addColorStop(0, `rgba(${rgb},0.55)`)
    glow.addColorStop(0.35, `rgba(${rgb},0.18)`)
    glow.addColorStop(1, `rgba(${rgb},0)`)
    c.fillStyle = glow
    c.fillRect(0, 0, side, side)
    const cross = c.createLinearGradient(0, center, side, center)
    cross.addColorStop(0, `rgba(${rgb},0)`)
    cross.addColorStop(0.5, `rgba(${rgb},0.35)`)
    cross.addColorStop(1, `rgba(${rgb},0)`)
    c.fillStyle = cross
    c.fillRect(0, center - 0.6, side, 1.2)
    const crossV = c.createLinearGradient(center, 0, center, side)
    crossV.addColorStop(0, `rgba(${rgb},0)`)
    crossV.addColorStop(0.5, `rgba(${rgb},0.35)`)
    crossV.addColorStop(1, `rgba(${rgb},0)`)
    c.fillStyle = crossV
    c.fillRect(center - 0.6, 0, 1.2, side)
  }
  return cv
}

/** Stern-Sprite (Kern + Halo) für eine Palettenfarbe und Tiefenstufe — lazy gebaut, dann gecacht. */
export function starSprite(r: number, g: number, b: number, tier = LAST_TIER): HTMLCanvasElement {
  const key = colorKey(r, g, b) | (tier << 24)
  let sprite = starSprites.get(key)
  if (!sprite) {
    const [tr, tg, tb] = tierColor(r, g, b, tier)
    sprite = buildStarSprite(tr, tg, tb)
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

export function bloomSprite(r: number, g: number, b: number): HTMLCanvasElement {
  const key = colorKey(r, g, b)
  let sprite = bloomSprites.get(key)
  if (!sprite) {
    sprite = buildBloomSprite(r, g, b)
    bloomSprites.set(key, sprite)
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
  tier = LAST_TIER,
): void {
  const half = coreR * STAR_SPRITE_HALO_SCALE
  ctx.globalAlpha = alpha
  ctx.drawImage(starSprite(r, g, b, tier), x - half, y - half, half * 2, half * 2)
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

/** Bloom zeichnen — `radius` ist der halbe Durchmesser des Scheins. */
export function drawBloomSprite(
  ctx: CanvasRenderingContext2D,
  r: number,
  g: number,
  b: number,
  x: number,
  y: number,
  radius: number,
  alpha: number,
): void {
  ctx.globalAlpha = alpha
  ctx.drawImage(bloomSprite(r, g, b), x - radius, y - radius, radius * 2, radius * 2)
}
