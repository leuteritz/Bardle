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
  WARP_DOPPLER_AHEAD_NORM,
  WARP_DOPPLER_BEHIND_NORM,
  WARP_DOPPLER_BLUE_MIX,
  WARP_DOPPLER_BLUE_RGB,
  WARP_DOPPLER_RED_MIX,
  WARP_DOPPLER_RED_RGB,
  WARP_STREAK_SPRITE_H_PX,
  WARP_STREAK_SPRITE_LEN_PX,
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
 *
 * Streaks (Warp, Hyperspace): dieselbe Idee. Vorher war das die letzte
 * Pfad-Schleife pro Stern — 400 `moveTo/lineTo/stroke` mit 400 frischen
 * `rgba(…)`-Strings je Warp-Frame. Jetzt ist ein Strich eine gecachte Kapsel
 * mit Verlauf (Schweif transparent → heller Kopf), gedreht und gestreckt über
 * EIN `setTransform` + EIN `drawImage`. Die Doppler-Stufe (voraus blau-weiß,
 * hinten warm) steckt wie die Tiefe im Sprite-Schlüssel.
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
  return [Math.round(r + (fr - r) * m), Math.round(g + (fg - g) * m), Math.round(b + (fb - b) * m)]
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

/* ── Streaks ────────────────────────────────────────────────────────────────── */

/** Doppler-Stufen: 0 = voraus (blau-weiß), 1 = seitlich (eigen), 2 = hinten (warm). */
export const WARP_DOPPLER_OWN = 1
const streakSprites = new Map<number, HTMLCanvasElement>()

/**
 * Doppler-Stufe aus der normierten Distanz zum Fluchtpunkt. `gain` 0…1 lässt
 * die Zonen aus dem Nichts wachsen: bei 0 ist alles „seitlich", bei 1 gelten
 * die vollen Schwellen — kein Farbsprung, wenn die Tönung einblendet.
 */
export function warpDopplerTier(norm: number, gain = 1): number {
  if (gain <= 0) return WARP_DOPPLER_OWN
  if (norm < WARP_DOPPLER_AHEAD_NORM * gain) return 0
  if (norm > 1 - (1 - WARP_DOPPLER_BEHIND_NORM) * gain) return 2
  return WARP_DOPPLER_OWN
}

function dopplerColor(r: number, g: number, b: number, tier: number): [number, number, number] {
  if (tier === WARP_DOPPLER_OWN) return [r, g, b]
  const [fr, fg, fb] = tier === 0 ? WARP_DOPPLER_BLUE_RGB : WARP_DOPPLER_RED_RGB
  const m = tier === 0 ? WARP_DOPPLER_BLUE_MIX : WARP_DOPPLER_RED_MIX
  return [Math.round(r + (fr - r) * m), Math.round(g + (fg - g) * m), Math.round(b + (fb - b) * m)]
}

/**
 * Kapsel, Kopf rechts: der Verlauf läuft vom transparenten Schweif über die
 * Sternfarbe in einen fast weißen Kopf — der Strich liest sich als Bewegung
 * ZUM Kopf hin, nicht als Balken.
 */
function buildStreakSprite(r: number, g: number, b: number): HTMLCanvasElement {
  const w = WARP_STREAK_SPRITE_LEN_PX
  const h = WARP_STREAK_SPRITE_H_PX
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const c = cv.getContext('2d')
  if (c) {
    const rgb = `${r},${g},${b}`
    const head = `${Math.round(r + (255 - r) * 0.6)},${Math.round(g + (255 - g) * 0.6)},${Math.round(b + (255 - b) * 0.6)}`
    const grad = c.createLinearGradient(0, 0, w, 0)
    grad.addColorStop(0, `rgba(${rgb},0)`)
    grad.addColorStop(0.55, `rgba(${rgb},0.45)`)
    grad.addColorStop(0.9, `rgba(${rgb},0.9)`)
    grad.addColorStop(1, `rgba(${head},1)`)
    const rad = h / 2
    c.beginPath()
    c.moveTo(rad, 0)
    c.lineTo(w - rad, 0)
    c.arc(w - rad, rad, rad, -Math.PI / 2, Math.PI / 2)
    c.lineTo(rad, h)
    c.arc(rad, rad, rad, Math.PI / 2, (Math.PI * 3) / 2)
    c.closePath()
    c.fillStyle = grad
    c.fill()
  }
  return cv
}

/** Streak-Sprite für eine Palettenfarbe und Doppler-Stufe — lazy gebaut, dann gecacht. */
export function streakSprite(
  r: number,
  g: number,
  b: number,
  doppler = WARP_DOPPLER_OWN,
): HTMLCanvasElement {
  const key = colorKey(r, g, b) | (doppler << 24)
  let sprite = streakSprites.get(key)
  if (!sprite) {
    const [dr, dg, db] = dopplerColor(r, g, b, doppler)
    sprite = buildStreakSprite(dr, dg, db)
    streakSprites.set(key, sprite)
  }
  return sprite
}

/**
 * Strich zeichnen: Kopf bei (x, y), Schweif `len` px entgegen `angle`.
 * Setzt die Transformation und lässt sie stehen — der Aufrufer setzt nach der
 * Schleife EINMAL `ctx.setTransform(1, 0, 0, 1, 0, 0)` zurück; ein Reset je
 * Stern wäre die Hälfte der Arbeit umsonst.
 */
export function drawStreakSprite(
  ctx: CanvasRenderingContext2D,
  r: number,
  g: number,
  b: number,
  x: number,
  y: number,
  angle: number,
  len: number,
  width: number,
  alpha: number,
  doppler = WARP_DOPPLER_OWN,
): void {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  ctx.globalAlpha = alpha
  ctx.setTransform(cos, sin, -sin, cos, x, y)
  ctx.drawImage(streakSprite(r, g, b, doppler), -len, -width / 2, len, width)
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
