// Die Prozession — die Bühne reist mit.
//
// Im Flug (Galaxien-Warp wie Universumssprung) verlassen Planeten und Champions
// ihre Bahnen und ordnen sich perspektivisch entlang der Flugachse: wer voraus
// fliegt, steht klein nahe am Fluchtpunkt, wer zurückfällt, groß am Rand. Das
// ist dieselbe Perspektive, die auch die Sternstriche fahren — ein zweites
// Bildgesetz auf derselben Bühne hätte sich als Fehler gelesen.
//
// Reine Geometrie: kein DOM, kein Store, keine Uhr. Den Mischwert liefern die
// beiden Flugmaschinen als `procession` im gemeinsamen `WarpFlightOut`; die
// Sternfeld-Schleife legt ihn samt Fluchtpunkt hier ab, die beiden
// Orbit-Schleifen lesen ihn (Muster `flightLive.ts` — der KURS wohnt dort, die
// AUFSTELLUNG hier; zwei Zwecke, zwei Dateien).
//
// Die Prozession ist eine reine RENDER-Verbiegung. `ls.x`/`ls.y`,
// `planetOrbitPhases`, `activePlayerPlanetPositions` und `setChampionScreenPos`
// bleiben auf der BAHN: `roleBehaviorStore` (Support-Heal, Jungle-Buff) und
// `voidContact` rechnen im Flug weiter ABSTÄNDE gegen diese Zahlen, und ein
// gestauchter Zug ließe sie auf alles zugleich feuern.
import {
  PROCESSION_BAND_CHAMPION,
  PROCESSION_BAND_PLANET,
  PROCESSION_DEPTH_FAR,
  PROCESSION_DEPTH_NEAR,
  PROCESSION_REACH_MAX_FRAC,
  PROCESSION_SCALE_K,
  PROCESSION_SCALE_MAX,
  PROCESSION_SCALE_MIN,
  PROCESSION_SPREAD_MAX,
  PROCESSION_SPREAD_MIN,
  PROCESSION_SUN_CLEAR_K,
  PROCESSION_SWELL_AMP,
  PROCESSION_SWELL_PHI,
  PROCESSION_SWELL_SEC_MAX,
  PROCESSION_SWELL_SEC_MIN,
  PROCESSION_TRAIL_LEN_K_MAX,
  PROCESSION_TRAIL_LEN_K_MIN,
  PROCESSION_TRAIL_REACH_REF,
} from '@/config/constants'

const TAU = Math.PI * 2
/** Goldener Winkel — der Kranz ist gestreut, nicht geteilt (Muster `fieldSpot`). */
const GOLDEN_ANGLE = 2.39996322972865332

/**
 * Welches Tiefenband ein Körper zieht. Das ist die Ebenen-Wand, nicht Geschmack:
 * `.planet-orbit-front` (z 7) liegt über `.champion-orbit-front` (z 6), beide
 * sind eigene Stapelkontexte. Also Planeten nach vorn, Champions voraus —
 * perspektivisch stimmt genau das.
 */
export const PROCESSION_LANE_PLANET = 0
export const PROCESSION_LANE_CHAMPION = 1
export type ProcessionLane = typeof PROCESSION_LANE_PLANET | typeof PROCESSION_LANE_CHAMPION

export interface ProcessionSlot {
  /** Klein = dicht an der Kamera (groß, weit außen), groß = voraus (klein, am Fluchtpunkt). */
  depth: number
  /** Abstand von der Flugachse als Anteil der kurzen Kante, VOR der Teilung durch die Tiefe. */
  spread: number
  /** Winkel um die Achse. */
  phi: number
  /** Eigene Periode des Wogens — sonst atmen alle im Takt. */
  swellSec: number
  /** Phase des Wogens. */
  seed: number
  /** Rang in der Tiefe, 0 = am nächsten. Trägt den z-index INNERHALB der Ebene. */
  rank: number
}

export interface ProcessionSpot {
  x: number
  y: number
  scale: number
}

/** Ein Körper, wie ihn die Sternfeld-Schleife für seinen Schweif braucht. */
export interface ProcessionBody {
  x: number
  y: number
  /** Dargestellter Halbmesser in px. */
  r: number
  cr: number
  cg: number
  cb: number
}

/**
 * Flüchtiger Zustand außerhalb von Pinia (wie `flightLive`): je Frame von der
 * Sternfeld-Schleife geschrieben (`t`, Fluchtpunkt, `sec`) und von den beiden
 * Orbit-Schleifen gelesen; die Körperlisten laufen andersherum — die
 * Orbit-Schleifen füllen sie, die Sternfeld-Schleife zeichnet daraus die
 * Schweife. Ein Frame Versatz ist der Preis dafür, dass kein zusätzliches
 * Canvas und keine zwölf Compositor-Ebenen entstehen.
 */
export const processionLive = {
  /** 0 = Bahn, 1 = volle Prozession. */
  t: 0,
  /** Fluchtpunkt in Bildschirmkoordinaten — Helm-Drift UND Flugkurs, wie ihn der Tunnel zeichnet. */
  focusX: 0,
  focusY: 0,
  /** Kurze Kante in px. */
  minEdge: 0,
  /** Flugzeit für das Wogen — EINE Uhr, sonst driftet der Zug in zwei Hälften auseinander. */
  sec: 0,
  /** Solange wahr, friert die Bühne ihre Ebenen-Zuordnung ein. */
  active: false,
  /** Der Spielerkörper: Halbmesser und Ton, gemeldet von `SunComponent`. */
  sunR: 0,
  sunRed: 255,
  sunGreen: 210,
  sunBlue: 140,
  planets: [] as ProcessionBody[],
  planetCount: 0,
  champions: [] as ProcessionBody[],
  championCount: 0,
}

export function resetProcessionLive(): void {
  processionLive.t = 0
  processionLive.focusX = 0
  processionLive.focusY = 0
  processionLive.minEdge = 0
  processionLive.sec = 0
  processionLive.active = false
  processionLive.planetCount = 0
  processionLive.championCount = 0
}

/** Holt den Eintrag oder legt ihn an — die Listen wachsen einmal und bleiben. */
export function processionBodyAt(list: ProcessionBody[], i: number): ProcessionBody {
  let b = list[i]
  if (!b) {
    b = { x: 0, y: 0, r: 0, cr: 255, cg: 255, cb: 255 }
    list[i] = b
  }
  return b
}

/** Ein Wert je Index — kein LCG, dessen Kette bei einem Seed je Index kollabierte. */
function hash01(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

/**
 * Der Platz eines Körpers — allein aus seinem Index, nie aus seiner momentanen
 * Bahnposition: sonst zöge er bei jedem Aufbruch einen anderen Platz und die
 * Prozession sähe nie zweimal gleich aus.
 */
export function processionSlot(index: number, count: number, lane: ProcessionLane): ProcessionSlot {
  const n = Math.max(1, count)
  const i = ((index % n) + n) % n
  const band = lane === PROCESSION_LANE_PLANET ? PROCESSION_BAND_PLANET : PROCESSION_BAND_CHAMPION
  // Einer allein steht in der Mitte seines Bandes, nicht an dessen Kante.
  const u = n === 1 ? 0.5 : i / (n - 1)
  const span = PROCESSION_DEPTH_FAR - PROCESSION_DEPTH_NEAR
  const depth = PROCESSION_DEPTH_NEAR + (band[0] + u * (band[1] - band[0])) * span
  const h = hash01(index * 3 + lane * 17 + 1)
  const g = hash01(index * 7 + lane * 29 + 5)
  return {
    depth,
    spread: PROCESSION_SPREAD_MIN + h * (PROCESSION_SPREAD_MAX - PROCESSION_SPREAD_MIN),
    phi: (index * GOLDEN_ANGLE + lane * 1.9) % TAU,
    swellSec: PROCESSION_SWELL_SEC_MIN + g * (PROCESSION_SWELL_SEC_MAX - PROCESSION_SWELL_SEC_MIN),
    seed: h * TAU,
    rank: i,
  }
}

/**
 * Wo der Körper im Flug steht. `fx`/`fy` ist der Fluchtpunkt, `cx`/`cy` die
 * Bildmitte (dort steht der Spielerkörper), `minEdge` die kurze Kante — der
 * Platz ist ein ANTEIL und übersteht damit jeden Resize. `out` wird in place
 * beschrieben, es fällt keine Allokation je Frame an.
 */
export function processionSpot(
  slot: ProcessionSlot,
  sec: number,
  fx: number,
  fy: number,
  cx: number,
  cy: number,
  minEdge: number,
  sunR: number,
  out: ProcessionSpot,
): ProcessionSpot {
  const depth =
    slot.depth * (1 + PROCESSION_SWELL_AMP * Math.sin((sec * TAU) / slot.swellSec + slot.seed))
  const phi =
    slot.phi +
    PROCESSION_SWELL_PHI * Math.sin((sec * TAU) / (slot.swellSec * 1.37) + slot.seed * 1.7)
  const d = Math.max(0.05, depth)
  // Netz gegen das Wogen: kein Körper verlässt das Bild, auch nicht bei weit
  // versetztem Fluchtpunkt.
  const reach = Math.min((slot.spread * minEdge) / d, PROCESSION_REACH_MAX_FRAC * minEdge)
  let x = fx + Math.cos(phi) * reach
  let y = fy + Math.sin(phi) * reach
  // Der Fluchtpunkt liegt regelmäßig IM Spielerkörper — ohne diesen Boden
  // steckte der Vorderste in der Korona. Geschoben wird radial von der MITTE
  // weg, dort steht die Sonne.
  const clear = sunR * PROCESSION_SUN_CLEAR_K
  if (clear > 0) {
    const ox = x - cx
    const oy = y - cy
    const dist = Math.hypot(ox, oy)
    if (dist < clear) {
      // Genau im Mittelpunkt gibt es keine Richtung — dann trägt der Slotwinkel.
      const a = dist > 0.001 ? Math.atan2(oy, ox) : phi
      x = cx + Math.cos(a) * clear
      y = cy + Math.sin(a) * clear
    }
  }
  out.x = x
  out.y = y
  out.scale = clamp(PROCESSION_SCALE_K / d, PROCESSION_SCALE_MIN, PROCESSION_SCALE_MAX)
  return out
}

/**
 * Die Länge des Schweifs in px: nah am Fluchtpunkt kurz, außen lang — dieselbe
 * Perspektive wie bei den Sternstrichen. `dx`/`dy` zeigt vom Fluchtpunkt zum
 * Körper, `bodyR` ist der dargestellte Halbmesser.
 */
export function processionTrailLength(
  dx: number,
  dy: number,
  bodyR: number,
  minEdge: number,
): number {
  const ref = Math.max(1, minEdge * PROCESSION_TRAIL_REACH_REF)
  const k = clamp(Math.hypot(dx, dy) / ref, 0, 1)
  return (
    bodyR * (PROCESSION_TRAIL_LEN_K_MIN + (PROCESSION_TRAIL_LEN_K_MAX - PROCESSION_TRAIL_LEN_K_MIN) * k)
  )
}

/**
 * Die Richtung, in die sich der Körper bewegt — vom Fluchtpunkt weg.
 * `drawStreakSprite` legt den Schweif entgegen diesem Winkel, also zum
 * Fluchtpunkt hin: der Nachlauf, genau wie bei einem Sternstrich.
 */
export function processionTrailAngle(dx: number, dy: number): number {
  return Math.atan2(dy, dx)
}
