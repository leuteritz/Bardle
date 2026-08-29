/* ── Ein Universum als Scheibe ────────────────────────────────────────────────
   Vorlage ist die logarithmische Karte des beobachtbaren Universums: in der
   Mitte der eigene Ort, nach aussen ein Feld aus Galaxien, ganz aussen der
   gluehende Ring des kosmischen Netzes. Genau diese drei Ebenen malt sie.

   Warum ein Sprite und keine CSS-Ebenen: das Galaxienfeld und der Wall leben
   von vielen kleinen, unregelmaessigen Marken — als DOM waeren das je Zeile
   sechzig Elemente, zehn Zeilen also sechshundert fuer etwas, das stillsteht.
   Gerastert kostet die Scheibe nach dem Bau ein `drawImage` und danach nichts.

   Drei Regeln, die den Bau tragen:

   - **Nie `Math.random()`.** Jede Galaxienlage, jeder Bogen kommt aus der
     Universums-ID. Dieselbe Regel wie in `landfallSprite.ts` und `voidSprite.ts`
     — gewuerfelt saehe die Scheibe nach jedem Cache-Miss anders aus.
   - **Der Zustand steckt IM Feld, nicht in der Deckkraft.** `unlit` ist keine
     abgedunkelte Vollscheibe, sondern eine leere: dunkler Grund plus geisterhafter
     Wall. Ein Universum, das noch niemand betreten hat, hat noch kein Sternenfeld
     — das ist die Auskunft, und sie ist auf 34 px lesbar, eine Deckkraftstufe
     nicht.
   - **Der Tint bleibt drinnen.** Er faerbt Staub und Galaxien, nie eine Kante:
     als Ring konkurrierte er mit den fuenf Zustandsfarben der Firmament-Karte.

   Aufrufer: `components/bardProfil/firmament/UniverseDisc.vue`, und sonst
   niemand.                                                                    */

import {
  FIRMAMENT_FREED_COLOR,
  FIRMAMENT_HERE_COLOR,
  UNIVERSE_DISC_CACHE_MAX,
  UNIVERSE_DISC_CORE_R,
  UNIVERSE_DISC_DUST_R,
  UNIVERSE_DISC_FIELD_EXP,
  UNIVERSE_DISC_GALAXIES,
  UNIVERSE_DISC_MAX_DPR,
  UNIVERSE_DISC_RIM_ARCS,
  UNIVERSE_DISC_RIM_INNER,
  UNIVERSE_DISC_RIM_OUTER,
  UNIVERSE_DISC_RIM_W_MAX,
  UNIVERSE_DISC_RIM_W_MIN,
  UNIVERSE_DISC_RAIL_PX,
  UNIVERSE_DISC_SPIN_SEC,
} from '@/config/constants'
import { getUniverse } from '@/config/progression/universes'

/** Hier stehe ich · hier war ich · hier war ich nie. */
export type UniverseDiscState = 'current' | 'walked' | 'unlit'

/**
 * Die zwei Ebenen der Scheibe — und der Grund, warum es zwei sind.
 *
 * Sie drehen sich GLEICHSINNIG, aber der Wall mit halbem Tempo. Als EIN Sprite
 * ginge das nicht: eine Textur hat eine Drehung. Der Schnitt liegt deshalb da,
 * wo der Entwurf ihn zieht — `a + drift` fuer die Koerper, `rotate(drift * 0.5)`
 * fuer den Wall.
 *
 * Was rotationssymmetrisch ist (Grund, Staubschleier, Kern), faehrt beim Feld
 * mit; man sieht es nicht, und eine dritte Ebene dafuer waere eine Ebene mehr
 * je Scheibe fuer nichts.
 */
export type UniverseDiscLayer = 'field' | 'rim'

const TAU = Math.PI * 2

/* -- Das Tempo jeder Drehung im Firmament ------------------------------------
   Die Wahrnehmung einer Drehung haengt an ZWEI Groessen, und die beiden reinen
   Formen sind beide falsch:

   - gleiche Winkelrate (Dauer konstant) laesst die 180-px-Scheibe mit 9,4 px/s
     am Rand kreiseln;
   - gleiche Randgeschwindigkeit (Dauer proportional zu px) laesst sie 3,4 Grad
     in drei Sekunden drehen, also stillstehen.

   Genommen wird das geometrische Mittel: die Dauer waechst mit der WURZEL des
   Durchmessers. Doppelt so gross ist 1,41 mal so lang. Die Basis bleibt die
   gemessene Rail-Scheibe (34 px, 60 s, 1,78 px/s).                            */

/** Umlaufdauer in Sekunden fuer eine Scheibe dieser Kantenlaenge. */
export function universeDiscSpinSec(px: number): number {
  return UNIVERSE_DISC_SPIN_SEC * Math.sqrt(Math.max(1, px) / UNIVERSE_DISC_RAIL_PX)
}

/**
 * Wie fein die Scheibe bei dieser Kantenlaenge gezeichnet wird.
 *
 * Ohne das waere die grosse Scheibe die kleine, 5,3-fach vergroessert: achtzehn
 * Galaxien mit 5,8 bis 13,5 px Halbachse. Das liest sich als Kleckse, nicht als
 * Universum — und ausgerechnet in der Mitte der Buehne, wo man hinsieht.
 *
 * Die ZAHL waechst mit der Flaeche (d²), die GROESSE der einzelnen Marke faellt
 * mit d. Beides zusammen haelt die Dichte konstant und die Marke bei ihrer
 * gemessenen Kantenlaenge. Bei `UNIVERSE_DISC_RAIL_PX` ist d gleich 1 und alles
 * bitgleich zu vorher — die Leiste aendert sich nicht.
 */
export function universeDiscDetail(px: number): number {
  return Math.sqrt(Math.max(1, px) / UNIVERSE_DISC_RAIL_PX)
}

/* ── Determinismus ────────────────────────────────────────────────────────────
   Eine Hash-Folge statt eines rng: sie braucht keinen Zustand und ist von der
   AUFRUFREIHENFOLGE unabhaengig. Ein Zweig, der einen Zug mehr tut, verschoebe
   sonst jede folgende Galaxie.                                                */

/** 0..1 aus zwei ganzen Zahlen. */
export function jitter(a: number, b: number): number {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return h - Math.floor(h)
}

/** Der uebliche Fall: ein Wert in einer Spanne. */
function span(a: number, b: number, lo: number, hi: number): number {
  return lo + jitter(a, b) * (hi - lo)
}

/* ── Palette ──────────────────────────────────────────────────────────────── */

/** Der Wall ist warm — dieselbe Glut wie auf der Vorlage. Vier Toene reichen;
 *  mehr trennt bei einer Strichstaerke unter einem Pixel niemand mehr. */
const RIM_TONES = ['#ffe6bc', '#ffb45e', '#ff7a34', '#e8501c'] as const
/** Erloschen: derselbe Wall ohne Glut, im Ton der unbetretenen Bahn. */
const RIM_TONES_UNLIT = ['#6a5c44', '#544732', '#403626', '#2e2718'] as const

/** Warmes Licht neben dem Tint — sonst ist das Feld einfarbig und tot. */
const GALAXY_WHITE = '#f4ecd8'

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/* ── Ebenen ───────────────────────────────────────────────────────────────────
   Eine Funktion je Ebene, alle exportiert: die Spec zeichnet sie einzeln auf,
   und ein Zweig, der still nichts malt, faellt sonst niemandem auf.           */

/** Der Grund. Nicht flach schwarz — die Mitte der Vorlage ist heller als ihr
 *  Rand, und ohne dieses Gefaelle ist die Scheibe ein Loch. */
export function paintVoid(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, '#14110a')
  g.addColorStop(0.55, '#0c0a06')
  g.addColorStop(1, '#050403')
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, TAU)
  ctx.fillStyle = g
  ctx.fill()
}

/** Der milchige Mittelbereich: das Licht zwischen den Galaxien. */
export function paintDustVeil(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  tint: string,
): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * UNIVERSE_DISC_DUST_R)
  g.addColorStop(0, rgba(tint, 0.34))
  g.addColorStop(0.5, rgba(tint, 0.15))
  g.addColorStop(1, rgba(tint, 0))
  ctx.beginPath()
  ctx.arc(cx, cy, r * UNIVERSE_DISC_DUST_R, 0, TAU)
  ctx.fillStyle = g
  ctx.fill()
}

/**
 * Das Galaxienfeld.
 *
 * `UNIVERSE_DISC_GALAXIES` gilt bei der Kantenlaenge der Leiste; groessere
 * Scheiben tragen mehr und kleinere Marken (`universeDiscDetail`).
 *
 * Die Radien sind unterlinear verteilt (`UNIVERSE_DISC_FIELD_EXP`) — dieselbe
 * Ueberlegung wie bei der Spirale des Firmaments: gleichverteilt haengen zwei
 * Drittel am Rand und der Kern steht leer. Gemalt werden ELLIPSEN mit Winkel,
 * keine Punkte: ein Punktfeld liest sich als Sternenhimmel, und das ist eine
 * andere Groessenordnung.
 */
export function paintGalaxyField(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  tint: string,
  seed: number,
): void {
  const reach = r * (UNIVERSE_DISC_RIM_INNER - 0.07)
  const d = universeDiscDetail(r * 2)
  const count = Math.round(UNIVERSE_DISC_GALAXIES * d * d)
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count
    const rad = reach * Math.pow(t * span(seed, i, 0.75, 1.12), UNIVERSE_DISC_FIELD_EXP)
    const ang = jitter(seed * 7 + 3, i) * TAU
    const rx = (r * span(seed, i + 41, 0.032, 0.075)) / d
    const ry = rx * span(seed, i + 83, 0.34, 0.92)
    ctx.beginPath()
    ctx.ellipse(
      cx + Math.cos(ang) * rad,
      cy + Math.sin(ang) * rad,
      rx,
      ry,
      jitter(seed + 11, i) * Math.PI,
      0,
      TAU,
    )
    ctx.fillStyle = rgba(i % 3 === 0 ? GALAXY_WHITE : tint, span(seed, i + 127, 0.5, 0.95))
    ctx.fill()
  }
}

/**
 * Der eigene Ort in der Mitte.
 *
 * Gruen, solange der Bard dort steht — dieselbe Farbe, mit der die Karte „hier"
 * sagt; Gold, wenn der Lauf vorbei ist — dieselbe, mit der sie „befreit" sagt.
 * Zwei Farben, die der Spieler im Firmament ohnehin schon liest.
 */
export function paintCore(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  state: Exclude<UniverseDiscState, 'unlit'>,
): void {
  const tone = state === 'current' ? FIRMAMENT_HERE_COLOR : FIRMAMENT_FREED_COLOR
  const halo = r * 0.3
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, halo)
  g.addColorStop(0, rgba(tone, 0.55))
  g.addColorStop(0.45, rgba(tone, 0.18))
  g.addColorStop(1, rgba(tone, 0))
  ctx.beginPath()
  ctx.arc(cx, cy, halo, 0, TAU)
  ctx.fillStyle = g
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, r * UNIVERSE_DISC_CORE_R, 0, TAU)
  ctx.fillStyle = state === 'current' ? '#ffffff' : rgba(tone, 0.9)
  ctx.fill()
}

/**
 * Der Wall — das kosmische Netz am Rand.
 *
 * Kurze Boegen auf streuendem Radius, nicht ein geschlossener Ring: der Ring
 * las sich als Rahmen um eine Kachel, und genau das soll die Scheibe nicht
 * sein. `UNIVERSE_DISC_RIM_ARCS` (64) statt der 190 der grossen Platte — bei
 * 34 px waeren 190 wieder ein Strich.
 */
export function paintWebRim(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  state: UniverseDiscState,
): void {
  const lit = state !== 'unlit'
  const tones = lit ? RIM_TONES : RIM_TONES_UNLIT
  // Erloschen steht hoeher, als es aussieht: die Boegen sind dort so blass, dass
  // die Scheibe ohne diesen Zuschlag ein schwarzes Loch statt einer Welt waere.
  const peak = lit ? 0.82 : 0.5

  const glow = ctx.createRadialGradient(cx, cy, r * (UNIVERSE_DISC_RIM_INNER - 0.14), cx, cy, r)
  if (lit) {
    glow.addColorStop(0, 'rgba(255, 138, 64, 0)')
    glow.addColorStop(0.55, 'rgba(255, 146, 72, 0.14)')
    glow.addColorStop(0.88, 'rgba(255, 120, 48, 0.26)')
    glow.addColorStop(1, 'rgba(255, 96, 32, 0.09)')
  } else {
    glow.addColorStop(0, 'rgba(122, 108, 80, 0)')
    glow.addColorStop(0.88, 'rgba(122, 108, 80, 0.16)')
    glow.addColorStop(1, 'rgba(122, 108, 80, 0.05)')
  }
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, TAU)
  ctx.fillStyle = glow
  ctx.fill()

  ctx.lineCap = 'round'
  const d = universeDiscDetail(r * 2)
  const arcs = Math.round(UNIVERSE_DISC_RIM_ARCS * d * d)
  const step = TAU / arcs
  for (let i = 0; i < arcs; i++) {
    const a0 = i * step + span(i, 1, -0.4, 0.4) * step
    const arc = step * span(i, 2, 0.45, 1.5)
    const rad = r * span(i, 3, UNIVERSE_DISC_RIM_INNER, UNIVERSE_DISC_RIM_OUTER)
    ctx.beginPath()
    ctx.arc(cx, cy, rad, a0, a0 + arc)
    ctx.lineWidth = (r * span(i, 4, UNIVERSE_DISC_RIM_W_MIN, UNIVERSE_DISC_RIM_W_MAX)) / d
    ctx.strokeStyle = rgba(
      tones[Math.floor(jitter(i, 5) * tones.length)] ?? tones[0],
      span(i, 6, peak * 0.3, peak),
    )
    ctx.stroke()
  }
}

/* ── Cache ────────────────────────────────────────────────────────────────────
   Zehn Universen mal drei Zustaende mal zwei Groessen mal zwei EBENEN sind
   hundertzwanzig moegliche Schluessel; gleichzeitig im Bild stehen zweiund-
   zwanzig — zehn Zeilen und das Wappen, je zweimal. LRU wie beim
   Landfall-Sprite.                                                            */

const cache = new Map<string, HTMLCanvasElement>()

export function universeDiscKey(
  id: number,
  state: UniverseDiscState,
  layer: UniverseDiscLayer,
  px: number,
  dpr: number,
): string {
  return `${id}|${state}|${layer}|${px}|${dpr}`
}

/**
 * EINE Ebene der Scheibe, in der Kantenlaenge, in der sie steht.
 *
 * Die Mitte des Canvas ist die Mitte der Scheibe — und damit zugleich der
 * Drehpunkt, den das CSS als `transform-origin: 50% 50%` annimmt. Der Aufrufer
 * zeichnet unveraendert und skaliert nicht.
 */
export function buildUniverseDisc(
  id: number,
  state: UniverseDiscState,
  layer: UniverseDiscLayer,
  px: number,
  dpr: number,
): HTMLCanvasElement | null {
  const d = Math.max(1, Math.min(dpr, UNIVERSE_DISC_MAX_DPR))
  const key = universeDiscKey(id, state, layer, px, d)
  const hit = cache.get(key)
  if (hit) {
    cache.delete(key)
    cache.set(key, hit)
    return hit
  }

  const cv = document.createElement('canvas')
  cv.width = Math.max(1, Math.round(px * d))
  cv.height = Math.max(1, Math.round(px * d))
  const ctx = cv.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(d, 0, 0, d, 0, 0)

  const c = px / 2
  const r = px / 2
  const tint = getUniverse(id)?.tint ?? '#c8b890'

  ctx.save()
  ctx.beginPath()
  ctx.arc(c, c, r, 0, TAU)
  ctx.clip()
  if (layer === 'field') {
    // Der Grund ist DECKEND und muss unten liegen.
    paintVoid(ctx, c, c, r)
    if (state !== 'unlit') {
      paintDustVeil(ctx, c, c, r, tint)
      paintGalaxyField(ctx, c, c, r, tint, id)
      paintCore(ctx, c, c, r, state)
    }
  } else {
    // Glutverlauf und Boegen sind durchscheinend und komponieren ueber dem Feld.
    paintWebRim(ctx, c, c, r, state)
  }
  ctx.restore()

  cache.set(key, cv)
  if (cache.size > UNIVERSE_DISC_CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  return cv
}
