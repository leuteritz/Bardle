/* ── Der Vorbeiflug an einem Landfall ─────────────────────────────────────────
   Ein Ort bewegt sich nicht. Das Schiff fliegt an ihm vorbei, und was der
   Spieler sieht, ist reine Parallaxe: weit weg zieht der Ort langsam und klein
   durchs Bild, querab schnell und gross, danach wieder weg.

   Deshalb steht hier keine Bahnkurve wie in `drifterPath`, sondern die Formel
   dahinter. Die zurückgelegte STRECKE läuft linear mit dem Fenster, gezeigt
   wird der WINKEL dazu (`theta = atan`), und die Grösse ist `cos(theta)` —
   dieselbe Rechnung, nach der ein Baum am Zugfenster vorbeizieht: an den Enden
   kriecht er, querab wischt er durch. Ein Ease-in-out wäre die Nachahmung
   davon, nicht die Sache selbst — es hätte den langsamen Anfang, aber nicht den
   Ruck in der Mitte, an dem man den Vorbeiflug überhaupt erkennt.

   Rein und ohne Store-Zugriff, damit die Spec ohne Pinia läuft.             */

import { seededRng } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  LANDFALL_LANES,
  LANDFALL_LANE_SEED_SALT,
  LANDFALL_FLYBY_THETA_MAX,
  LANDFALL_BODY_ALPHA_MIN,
  LANDFALL_BODY_ALPHA_EASE,
  LANDFALL_BODY_BASE_PX,
  LANDFALL_BODY_VP_REF_W,
  LANDFALL_BODY_SCALE_MIN,
  LANDFALL_BODY_SCALE_MAX,
  LANDFALL_CENTER_CLEARANCE,
  LANDFALL_THROUGH_CHANCE,
  LANDFALL_THROUGH_SCALE_MAX,
  LANDFALL_BODY_HIT_PADDING_PX,
} from '@/config/constants'
import { hudFreeBandOver, type HudFieldMetrics } from '@/utils/ui/hudField'
import { pushOutOfCenter, type DrifterFieldRect } from '@/utils/orbit/drifterPath'
import type { LandfallKindId, LandfallFlightMode } from '@/types'
import { depthPassPointAt, depthMotionReduced } from '@/utils/orbit/depthPass'

export interface LandfallLane {
  lane: number
  mirrored: boolean
  flightMode: LandfallFlightMode
}

export interface LandfallFlyPoint {
  x: number
  y: number
  /** 1 querab, `cos(THETA_MAX)` an den Enden. */
  scale: number
  alpha: number
}

/**
 * Welche Sehne der Ort dieser Etappe nimmt.
 *
 * EIGENER Seed-Strom (`LANDFALL_LANE_SEED_SALT`): der Strom in `landfallOnLeg`
 * hat eine feste Ziehreihenfolge und wird für jede archivierte Galaxie
 * nachgespielt. Ein zusätzlicher Zug dort verschöbe die ganze Chronik.
 */
export function landfallLaneFor(mapSeed: number, leg: number, kind?: LandfallKindId): LandfallLane {
  const rng = seededRng(mapSeed * LANDFALL_LANE_SEED_SALT + leg * 313 + 11)
  const lane = Math.min(LANDFALL_LANES.length - 1, Math.floor(rng() * LANDFALL_LANES.length))
  const mirrored = rng() < 0.5
  const chance = kind ? LANDFALL_THROUGH_CHANCE[kind] ?? 0 : 0
  return { lane, mirrored, flightMode: rng() < chance ? 'through' : 'flyby' }
}

export function landfallFlightModeFor(
  mapSeed: number,
  leg: number,
  kind: LandfallKindId,
  forced?: LandfallFlightMode,
): LandfallFlightMode {
  if (depthMotionReduced() || !LANDFALL_THROUGH_CHANCE[kind]) return 'flyby'
  return forced ?? landfallLaneFor(mapSeed, leg, kind).flightMode
}

/** Kantenlänge der Raute im Querab-Moment. Wächst mit dem Viewport statt mit
 *  `--hud-scale`, das bei 1 deckelt und den Ort auf 4K verlöre. */
export function landfallBodyPx(viewportW: number): number {
  const k = Math.min(
    LANDFALL_BODY_SCALE_MAX,
    Math.max(LANDFALL_BODY_SCALE_MIN, viewportW / LANDFALL_BODY_VP_REF_W),
  )
  return LANDFALL_BODY_BASE_PX * k
}

function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1)
}

/** Lage auf der Sehne (0..1) zum Fensterfortschritt `t`. Bei 0 und 1 exakt an
 *  den Enden, in der Mitte am schnellsten. */
export function landfallChordAt(t: number): number {
  return 0.5 + flybyAngle(t) / (2 * LANDFALL_FLYBY_THETA_MAX)
}

/** Sichtwinkel zum Ort. Die Strecke läuft linear (`weg`), der Winkel dazu ist
 *  ihr Arkustangens — das ist die ganze Parallaxe. */
function flybyAngle(t: number): number {
  const weg = (clamp01(t) - 0.5) * 2
  return Math.atan(weg * Math.tan(LANDFALL_FLYBY_THETA_MAX))
}

/**
 * Der GANZE Körper ins freie Band, nicht nur sein Mittelpunkt.
 *
 * `clampToHudContour` im Drifter-Modul schiebt erst, wenn die Mitte aus dem
 * Band fällt — die untere Hälfte darf dabei darunter stehen. Für eine Raute,
 * die querab 116 px misst, sind das bis zu 58 px hinter der Bottom-Bar. Die
 * Kante kommt weiterhin aus der EINEN Kontur, nur der Einzug ist der des
 * Körpers.
 */
function clampBodyIntoBand(
  xPx: number,
  yPx: number,
  radius: number,
  metrics: HudFieldMetrics,
): number {
  // Ein Punkt, der WIRKLICH aus dem Bild läuft, wird nicht zurückgeholt — dort
  // verlässt die Sehne die Bühne.
  if (yPx < 0 || yPx > metrics.viewportH) return yPx
  const band = hudFreeBandOver(xPx, radius, metrics)
  const oben = band.top + radius
  const unten = band.bottom - radius
  // Ein Band, das enger ist als der Körper: mittig setzen statt gar nicht.
  if (oben > unten) return (band.top + band.bottom) / 2
  return Math.min(Math.max(yPx, oben), unten)
}

/**
 * Wo der Ort zum Fensterfortschritt `t` steht, wie gross und wie hell.
 *
 * Geklemmt wird gegen die HUD-Kontur über die BREITE des Körpers bei der
 * AKTUELLEN Skala — querab ist er dreimal so breit wie an den Enden, und eine
 * Klemmung gegen die Spitzengrösse drückte ihn den ganzen Vorbeiflug lang
 * unnötig zur Bildmitte.
 */
export function landfallFlyPointAt(
  lane: number,
  mirrored: boolean,
  t: number,
  field: DrifterFieldRect,
  bodyPx: number,
  metrics?: HudFieldMetrics,
  flightMode: LandfallFlightMode = 'flyby',
  sunRadius = 0,
): LandfallFlyPoint {
  if (flightMode === 'through' && metrics) {
    const point = depthPassPointAt(lane, mirrored, t, bodyPx, LANDFALL_BODY_HIT_PADDING_PX,
      LANDFALL_THROUGH_SCALE_MAX, LANDFALL_CENTER_CLEARANCE, sunRadius, metrics)
    const proximity = point.scale / LANDFALL_THROUGH_SCALE_MAX
    return { ...point, alpha: LANDFALL_BODY_ALPHA_MIN + (1 - LANDFALL_BODY_ALPHA_MIN) * proximity }
  }
  const spur = LANDFALL_LANES[lane % LANDFALL_LANES.length]
  const theta = flybyAngle(t)
  const naehe = Math.cos(theta)
  const u = 0.5 + theta / (2 * LANDFALL_FLYBY_THETA_MAX)

  const dx = spur.to.x - spur.from.x
  const dy = spur.to.y - spur.from.y
  const laenge = Math.hypot(dx, dy) || 1
  const bogen = spur.bow * Math.sin(Math.PI * clamp01(u))
  const rohX = spur.from.x + dx * u + (-dy / laenge) * bogen
  const rohY = spur.from.y + dy * u + (dx / laenge) * bogen

  const gespiegelt = mirrored ? 1 - rohX : rohX
  const frei = pushOutOfCenter(gespiegelt, rohY, field, LANDFALL_CENTER_CLEARANCE)

  const x = field.left + frei.x * field.width
  let y = field.top + frei.y * field.height
  const radius = (bodyPx * naehe) / 2
  if (metrics) y = clampBodyIntoBand(x, y, radius, metrics)

  return {
    x,
    y,
    scale: naehe,
    alpha:
      LANDFALL_BODY_ALPHA_MIN +
      (1 - LANDFALL_BODY_ALPHA_MIN) * Math.pow(Math.max(0, naehe), LANDFALL_BODY_ALPHA_EASE),
  }
}
