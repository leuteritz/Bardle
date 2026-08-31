/* ── Das Abflugportal ─────────────────────────────────────────────────────────
   Der Ausgang eines Universums, im schwarzen Raum jenseits der Galaxienscheibe.

   DREI Sprites, und der Schnitt folgt einer Regel: was sich unter Drehung nicht
   aendert, gehoert nicht ins drehende Sprite, und was pulst, gehoert in ein
   eigenes Canvas mit derselben Geometrie (Muster `buildLandfallBeacon`).

   - `maw` — Teich, Krone, Schlund (ein DURCHGANG: innen leuchtet das Ziel),
     Fernsterne. Steht, und liegt HINTER dem Wirbel.
   - `rim` — Ring, Schwellensaum, Kernfunke, Ankerfunken. Steht, liegt DAVOR.
   - `swirl` — Wirbelarme und Motes. Dreht per CSS. Nichts Rotationssymmetrisches
     hier hinein: das draehte sichtbar nicht und kostete trotzdem eine Ebene.
   - `halo` — EIN Verlauf, dessen Gipfel auf dem Ring liegt. Pulst per `opacity`.

   Dazu die Spur als eigener Streifen. Kein Frame, keine Uhr, kein
   `Math.random()` — alles aus `seed` und Index, sonst saehe das Portal nach
   jedem Cache-Verwurf anders aus.

   Vorlage der Anatomie ist `paintCoreGate` in `galaxyLandmarks.ts`; ihre
   Begruendungen gelten hier unveraendert und stehen an den Ebenen. */

import {
  FIRMAMENT_PORTAL_ARMS,
  FIRMAMENT_PORTAL_ARM_IN,
  FIRMAMENT_PORTAL_ARM_OUT,
  FIRMAMENT_PORTAL_AURA_SPAN,
  FIRMAMENT_PORTAL_CACHE_MAX,
  FIRMAMENT_PORTAL_CORE_R,
  FIRMAMENT_PORTAL_CROWN_GAP,
  FIRMAMENT_PORTAL_CROWN_SPAN,
  FIRMAMENT_PORTAL_FAR_STARS,
  FIRMAMENT_PORTAL_HALO_ALPHA,
  FIRMAMENT_PORTAL_MAX_BACKING_PX,
  FIRMAMENT_PORTAL_MOTES,
  FIRMAMENT_PORTAL_PHOTON_R,
  FIRMAMENT_PORTAL_POOL_SPAN,
  FIRMAMENT_PORTAL_RY,
  FIRMAMENT_PORTAL_RIM_SPAN,
  FIRMAMENT_PORTAL_SPRITE_SPAN,
  FIRMAMENT_PORTAL_SWIRL_SPAN,
  FIRMAMENT_PORTAL_TRAIL_ALPHA,
  FIRMAMENT_PORTAL_TRAIL_DASH,
  FIRMAMENT_PORTAL_TRAIL_GAP,
  FIRMAMENT_PORTAL_TRAIL_LEN,
  FIRMAMENT_PORTAL_TRAIL_START,
  FIRMAMENT_PORTAL_TRAIL_STRANDS,
  FIRMAMENT_PORTAL_TRAIL_W,
  FIRMAMENT_MAX_DPR,
} from '@/config/constants'
import { jitter } from '@/utils/fx/universeDisc'

export type PortalLayer = 'maw' | 'swirl' | 'rim' | 'halo'

/** `rgb(...)`-Zerlegung eines Hex-Tons, damit die Verlaeufe eigene Deckkraft
 *  bekommen. Dieselbe Rechnung wie `fade()` in `firmamentPlate.ts`. */
function ink(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** −1..1 aus zwei Zahlen, zustandslos: ein Zweig, der einen Zug mehr tut,
 *  verschoebe sonst jeden folgenden. */
function sway(a: number, b: number): number {
  return jitter(a, b) * 2 - 1
}

/**
 * Der Durchgang: alles, was HINTER dem Wirbel liegt.
 *
 * Die Reihenfolge traegt die Aussage: der Schlund kommt VOR dem Ring, sonst
 * liest sich der Ring als Scheibe statt als Durchgang.
 */
export function paintPortalMaw(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  tint: string,
  seed: number,
): void {
  ctx.save()
  ctx.translate(cx, cy)

  // Schattenteich. Das Portal steht auf dem Sternfeld des Grundes — ein Loch in
  // einem Leuchten ist kein Loch. Er kommt VOR der Krone, damit die auf
  // gedaempftem Grund steht statt darin zu verschwinden.
  const span = r * FIRMAMENT_PORTAL_POOL_SPAN
  const pool = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, span)
  pool.addColorStop(0, 'rgba(6, 5, 4, 0.62)')
  pool.addColorStop(0.55, 'rgba(6, 5, 4, 0.4)')
  pool.addColorStop(1, 'rgba(6, 5, 4, 0)')
  ctx.beginPath()
  ctx.arc(0, 0, span, 0, Math.PI * 2)
  ctx.fillStyle = pool
  ctx.fill()

  // Zersprungene Krone: zwei Boegen mit Luecke — ein GESCHLOSSENER Ring laese
  // sich als Planetenring. Zweimal gestrichen, erst dunkel und breiter: ohne die
  // Unterlage verschwindet die duenne Linie ueber dem Sternfeld.
  const crownRx = r * FIRMAMENT_PORTAL_CROWN_SPAN
  const gap = FIRMAMENT_PORTAL_CROWN_GAP
  const tilt = sway(seed, 139) * 0.4
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass === 0 ? 'rgba(6, 5, 4, 0.7)' : ink(tint, 0.85)
    ctx.lineWidth = r * (pass === 0 ? 0.06 : 0.032)
    for (const base of [0, Math.PI]) {
      ctx.beginPath()
      ctx.ellipse(0, 0, crownRx, crownRx * 0.55, tilt, base + gap / 2, base + Math.PI - gap / 2)
      ctx.stroke()
    }
  }

  // Der Schlund ist ein DURCHGANG, kein Loch: innen leuchtet das Zieluniversum,
  // zum Rand hin wird die Schwelle dunkel. Ein schwarzer Schlund funktioniert
  // im Galaxiekern, wo Glut dahinterliegt — hier steht er auf dem schwarzen
  // Sternfeld, und Schwarz auf Schwarz ist keine Tiefe, sondern nichts.
  //
  // `_RY` ist nicht die flache 0,42 der Landmarke auf der Galaxiekarte: dort
  // fliegt man hindurch, hier sieht man hinein.
  const ry = r * FIRMAMENT_PORTAL_RY
  const maw = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  maw.addColorStop(0, ink(tint, 0.32))
  maw.addColorStop(0.4, ink(tint, 0.14))
  maw.addColorStop(0.72, 'rgba(3, 2, 6, 0.8)')
  maw.addColorStop(1, 'rgba(3, 2, 6, 0.94)')
  ctx.beginPath()
  ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = maw
  ctx.fill()

  // Die Sterne des anderen Universums. Sie sind der Beleg, dass man HINDURCH
  // sieht — ohne sie ist der Verlauf nur ein Farbfleck.
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2)
  ctx.clip()
  for (let i = 0; i < FIRMAMENT_PORTAL_FAR_STARS; i++) {
    const a = jitter(i + seed, 191) * Math.PI * 2
    const rr = Math.sqrt(jitter(i + seed, 193)) * r * 0.82
    ctx.beginPath()
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * FIRMAMENT_PORTAL_RY, r * 0.009, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(236, 243, 255, ${(0.45 + jitter(i + seed, 197) * 0.45).toFixed(2)})`
    ctx.fill()
  }
  ctx.restore()

  ctx.restore()
}

/**
 * Die Fassung: was VOR dem Wirbel liegt.
 *
 * Sie ist vom Schlund getrennt, weil die drehenden Arme dazwischen gehoeren —
 * in einem Sprite mit ihm deckte der fast undurchsichtige Schlund sie zu, und
 * der Wirbel eines Portals, den man nicht sieht, ist kein Wirbel.
 */
export function paintPortalRim(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  tint: string,
): void {
  const ry = r * FIRMAMENT_PORTAL_RY
  ctx.save()
  ctx.translate(cx, cy)

  // Der Ring. `shadowBlur` ist hier erlaubt — EINMAL gebacken, nie in einer
  // laufenden Animation.
  ctx.beginPath()
  ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2)
  ctx.strokeStyle = tint
  ctx.lineWidth = r * 0.075
  ctx.shadowColor = ink(tint, 0.7)
  ctx.shadowBlur = r * 0.3
  ctx.stroke()
  ctx.shadowBlur = 0

  // Die Schwelle: ein feiner Saum knapp INNEN am Ring, wo das Licht des Ziels
  // die Kante trifft. Er sitzt dort und nicht bei einem halben Radius — ein
  // zweiter Ring in der Mitte machte aus dem Durchgang eine Zielscheibe.
  ctx.beginPath()
  ctx.ellipse(
    0,
    0,
    r * FIRMAMENT_PORTAL_PHOTON_R,
    ry * FIRMAMENT_PORTAL_PHOTON_R,
    0,
    0,
    Math.PI * 2,
  )
  ctx.strokeStyle = ink(tint, 0.5)
  ctx.lineWidth = Math.max(0.8, r * 0.016)
  ctx.stroke()

  // Kernfunke: ohne ihn liest sich der Schlund als Loch IM BILD statt als Tiefe.
  ctx.beginPath()
  ctx.arc(0, 0, r * FIRMAMENT_PORTAL_CORE_R, 0, Math.PI * 2)
  ctx.fillStyle = ink(tint, 0.9)
  ctx.fill()

  // Zwei Ankerfunken auf den Scheiteln — sie geben dem Ring seine Achse.
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.arc(side * r, 0, r * 0.035, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 244, 200, 0.9)'
    ctx.fill()
  }

  ctx.restore()
}

/**
 * Die drehende Ebene: NUR was seine Drehung zeigt.
 *
 * Ein Arm mit hartem Ende waere eine Speiche, deshalb laufen beide Enden aus
 * (Bauart `paintLens`). Die Motes machen die Drehung ueberhaupt erst ablesbar —
 * dieselbe Rolle wie die Lichtpunkte im Filamentgewebe.
 */
export function paintPortalSwirl(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  tint: string,
  seed: number,
): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.lineCap = 'round'

  const start = jitter(seed, 149) * Math.PI * 2
  const rIn = r * FIRMAMENT_PORTAL_ARM_IN
  const rOut = r * FIRMAMENT_PORTAL_ARM_OUT

  for (let i = 0; i < FIRMAMENT_PORTAL_ARMS; i++) {
    const a0 = start + (i * Math.PI * 2) / FIRMAMENT_PORTAL_ARMS
    const sweep = 1.1 + jitter(i + seed, 151) * 0.6
    const a1 = a0 + sweep
    const ax = Math.cos(a0) * rIn
    const ay = Math.sin(a0) * rIn
    const bx = Math.cos(a1) * rOut
    const by = Math.sin(a1) * rOut
    // Der Kontrollpunkt liegt nach aussen versetzt — daraus wird die Kruemmung,
    // die einen Arm von einer Sehne unterscheidet.
    const mid = (a0 + a1) / 2
    const bow = (rIn + rOut) / 2 + r * (0.12 + jitter(i + seed, 157) * 0.14)

    const g = ctx.createLinearGradient(ax, ay, bx, by)
    g.addColorStop(0, ink(tint, 0))
    g.addColorStop(0.45, ink(tint, 0.28 + jitter(i + seed, 163) * 0.22))
    g.addColorStop(1, ink(tint, 0))
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.quadraticCurveTo(Math.cos(mid) * bow, Math.sin(mid) * bow, bx, by)
    ctx.strokeStyle = g
    ctx.lineWidth = r * (0.05 + jitter(i + seed, 151) * 0.06)
    ctx.stroke()
  }

  for (let i = 0; i < FIRMAMENT_PORTAL_MOTES; i++) {
    const a = start + jitter(i + seed, 167) * Math.PI * 2
    const rr = r * (0.5 + jitter(i + seed, 173) * 0.45)
    ctx.beginPath()
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.014, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 244, 200, 0.85)'
    ctx.fill()
  }

  ctx.restore()
}

/** Der Halo — EIN Verlauf, dessen Gipfel auf dem Ringradius liegt: das Leuchten
 *  atmet AM Ring, nicht als Nebelball darum. Rotationssymmetrisch, deshalb ein
 *  eigenes Canvas statt einer Ebene im drehenden Sprite. */
export function paintPortalHalo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  r: number,
  tint: string,
): void {
  const peak = Math.min(0.95, r / outer)
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, outer)
  g.addColorStop(0, ink(tint, 0))
  g.addColorStop(Math.max(0, peak - 0.19), ink(tint, 0.1))
  g.addColorStop(peak, ink(tint, FIRMAMENT_PORTAL_HALO_ALPHA))
  g.addColorStop(Math.min(1, peak + 0.19), ink(tint, 0.12))
  g.addColorStop(1, ink(tint, 0))
  ctx.beginPath()
  ctx.arc(cx, cy, outer, 0, Math.PI * 2)
  ctx.fillStyle = g
  ctx.fill()
}

/**
 * Die Spur: vom Portal nach INNEN, und sie loest sich vor der Scheibe auf.
 *
 * Sie setzt bewusst an nichts an. Die Bahn dreht, das Portal steht — ein
 * Ansatzpunkt am Bahnende waere in Sekunden woanders. Und der Scheibenrand
 * taugt auch nicht: `box.r` springt mit jeder Zoomstufe, und eine stehende
 * Linie, die den drehenden Filamentsaum beruehrt, zieht eine Naht, die man erst
 * nach einer halben Umdrehung sieht.
 *
 * Lokale Koordinaten: `x = 0` ist die Portalmitte, `y` ist zentriert.
 */
export function paintPortalTrail(
  ctx: CanvasRenderingContext2D,
  cy: number,
  r: number,
  tint: string,
  seed: number,
): void {
  const from = r * FIRMAMENT_PORTAL_TRAIL_START
  const to = r * FIRMAMENT_PORTAL_TRAIL_LEN
  const wide = r * FIRMAMENT_PORTAL_TRAIL_W

  const g = ctx.createLinearGradient(from, 0, to, 0)
  g.addColorStop(0, ink(tint, FIRMAMENT_PORTAL_TRAIL_ALPHA))
  g.addColorStop(0.45, ink(tint, 0.16))
  g.addColorStop(1, ink(tint, 0))

  // STEHENDES Strichmuster: ein laufender `lineDashOffset` waere eine
  // Frame-Schleife fuer eine Auskunft, die die Form schon traegt.
  ctx.save()
  ctx.setLineDash([r * FIRMAMENT_PORTAL_TRAIL_DASH, r * FIRMAMENT_PORTAL_TRAIL_GAP])
  ctx.lineCap = 'round'
  ctx.strokeStyle = g

  for (let i = 0; i < FIRMAMENT_PORTAL_TRAIL_STRANDS; i++) {
    const drift = sway(i + seed, 179) * wide * 0.4
    ctx.beginPath()
    ctx.moveTo(from, cy)
    ctx.quadraticCurveTo((from + to) / 2, cy + drift * 0.5, to, cy + drift)
    ctx.lineWidth = Math.max(0.9, r * (0.016 + jitter(i + seed, 181) * 0.014))
    ctx.stroke()
  }

  ctx.restore()
}

const cache = new Map<string, HTMLCanvasElement>()

/** `seed` und `tint` sind GETRENNT: der Ort haengt an der Bahn, die Farbe am
 *  Ziel. Ein `universe`-Argument allein waere die Falle. */
export function portalSpriteKey(
  layer: PortalLayer,
  seed: number,
  tint: string,
  px: number,
  dpr: number,
): string {
  return `${layer}|${seed}|${tint}|${px}|${dpr}`
}

/** Kantenlaenge des Sprites zu einem Ringdurchmesser `px`. Je Ebene eigen: das
 *  stehende Sprite muss den Schattenteich fassen, das drehende nur die Arme. */
export function portalSpriteSpan(layer: PortalLayer, px: number): number {
  const factor =
    layer === 'halo'
      ? FIRMAMENT_PORTAL_AURA_SPAN
      : layer === 'swirl'
        ? FIRMAMENT_PORTAL_SWIRL_SPAN
        : layer === 'rim'
          ? FIRMAMENT_PORTAL_RIM_SPAN
          : FIRMAMENT_PORTAL_SPRITE_SPAN
  return Math.round(px * factor)
}

function backingDpr(span: number, dpr: number): number {
  return Math.max(1, Math.min(dpr, FIRMAMENT_MAX_DPR, FIRMAMENT_PORTAL_MAX_BACKING_PX / span))
}

function touch(key: string): HTMLCanvasElement | undefined {
  const hit = cache.get(key)
  if (!hit) return undefined
  cache.delete(key)
  cache.set(key, hit)
  return hit
}

function keep(key: string, cv: HTMLCanvasElement): HTMLCanvasElement {
  cache.set(key, cv)
  if (cache.size > FIRMAMENT_PORTAL_CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  return cv
}

export function buildPortalSprite(
  layer: PortalLayer,
  seed: number,
  tint: string,
  px: number,
  dpr: number,
): HTMLCanvasElement | null {
  const span = portalSpriteSpan(layer, px)
  const d = backingDpr(span, dpr)
  const key = portalSpriteKey(layer, seed, tint, px, d)
  const hit = touch(key)
  if (hit) return hit

  const cv = document.createElement('canvas')
  cv.width = Math.max(1, Math.round(span * d))
  cv.height = Math.max(1, Math.round(span * d))
  const ctx = cv.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(d, 0, 0, d, 0, 0)

  const mid = span / 2
  const r = px / 2
  if (layer === 'maw') paintPortalMaw(ctx, mid, mid, r, tint, seed)
  else if (layer === 'swirl') paintPortalSwirl(ctx, mid, mid, r, tint, seed)
  else if (layer === 'rim') paintPortalRim(ctx, mid, mid, r, tint)
  else paintPortalHalo(ctx, mid, mid, mid, r, tint)

  return keep(key, cv)
}

/** Die Spur ist ein STREIFEN, kein Quadrat: zentriert braeuchte sie die
 *  vierfache Flaeche fuer eine Linie. */
export function buildPortalTrail(
  seed: number,
  tint: string,
  px: number,
  dpr: number,
): HTMLCanvasElement | null {
  const r = px / 2
  const w = Math.round(r * FIRMAMENT_PORTAL_TRAIL_LEN)
  const h = Math.max(1, Math.round(r * FIRMAMENT_PORTAL_TRAIL_W))
  const d = backingDpr(w, dpr)
  const key = portalSpriteKey('maw', seed, `trail-`, px, d)
  const hit = touch(key)
  if (hit) return hit

  const cv = document.createElement('canvas')
  cv.width = Math.max(1, Math.round(w * d))
  cv.height = Math.max(1, Math.round(h * d))
  const ctx = cv.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(d, 0, 0, d, 0, 0)

  paintPortalTrail(ctx, h / 2, r, tint, seed)
  return keep(key, cv)
}

export function clearPortalSpriteCache(): void {
  cache.clear()
}
