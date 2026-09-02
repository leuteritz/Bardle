/**
 * Die Bahn des Firmaments — wo eine Galaxie auf der Karte steht.
 *
 * Reine Rechnung, kein DOM, kein Store: die Karte reicht ihr den Bestand und
 * bekommt normierte Koordinaten zurueck. Die Umrechnung in Pixel macht die
 * Fit-Box, damit dieselbe Bahn auf jeder Buehnengroesse dieselbe Form hat —
 * dieselbe Trennung wie `galaxyPlaneToWorld` und die Galaxieplatte.
 *
 * EINE Bahn je Universum. Die Galaxienkette selbst laeuft ueber das Prestige
 * hinweg durch (`executePrestigeReset` fasst `completedGalaxies` nicht an) —
 * geschnitten wird sie erst hier, am Feld `record.universe`. Jede Bahn beginnt
 * wieder bei Start; wo ein Universum endete, steht ein Portal — aber nicht auf
 * der Bahn, sondern im schwarzen Raum ausserhalb der Scheibe
 * (`firmamentPortalSpot`). Diese Datei sagt nur, DASS es eines gibt.
 *
 * Der Nenner ist dabei fuer ALLE Bahnen derselbe: der Knotenabstand bleibt
 * ueber einen Universumswechsel hinweg gleich, und wer weiter kam, kommt weiter
 * nach aussen. Eine Bahn, die ihre Scheibe selbst ausfuellte, saehe mit fuenf
 * Galaxien aus wie eine mit dreissig.
 *
 * Der Winkel ist dabei GEWUERFELT, nicht gezaehlt: ein fester Schritt legte die
 * Knoten auf eine Spirale, und jeder sass dort, wo man ihn nach dem vorigen
 * erwartet. Der Radius waechst weiter monoton mit dem Index.
 */

import {
  FIRMAMENT_MAP_INSET_PX,
  FIRMAMENT_NODE_R_BASE,
  FIRMAMENT_NODE_R_PER_STAR,
  FIRMAMENT_PATH_MIN_SPAN,
  FIRMAMENT_PATH_R0,
  FIRMAMENT_PATH_R1,
  FIRMAMENT_PATH_RADIUS_EXP,
  FIRMAMENT_ROAD_BOW,
  FIRMAMENT_SCATTER_MIN_SEP,
  FIRMAMENT_SCATTER_STEP_MAX,
  FIRMAMENT_SCATTER_STEP_MIN,
  FIRMAMENT_SCATTER_TRIES,
  FIRMAMENT_SCATTER_T_WOBBLE,
  FIRMAMENT_START_CLEAR_X,
  FIRMAMENT_START_CLEAR_Y0,
  FIRMAMENT_START_CLEAR_Y1,
  FIRMAMENT_UNLIT_AHEAD,
} from '@/config/constants'
import { jitter } from '@/utils/fx/universeDisc'
import { universes } from '@/config/progression/universes'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { UniverseRunRecord } from '@/types'

export type FirmamentNodeState = 'freed' | 'current' | 'unlit'

export interface FirmamentNode {
  galaxy: number
  state: FirmamentNodeState
  /** Lage auf der Bahn, normiert: Mitte (0.5, 0.5), Rand 1. */
  nx: number
  ny: number
  angle: number
  /** 0..1 vom Kern zum Rand. */
  radius: number
  /** Was die Galaxie verlangt (`computeRequired`), nicht was sie hergab. */
  stars: number
  rescued: number
  lost: number
  landfalls: number
  themeIndex: number
  /** Gemalter Koerperradius in Referenzpixeln, vor Massstab. */
  bodyR: number
  record: CompletedGalaxyRecord | null
}

/**
 * Wo ein Universum endete — hoechstens EINES je Bahn.
 *
 * Ohne Lage: der Ausgang steht als grosses Portal im schwarzen Raum ausserhalb
 * der Scheibe, und dessen Stelle rechnet `firmamentPortalSpot` aus den
 * Buehnenmassen. Die Bahn sagt nur noch, DASS es einen gibt und wohin er fuehrt.
 */
export interface FirmamentDeparture {
  /** Das Universum, in das es weiterging. */
  toUniverse: number
  /** Wie oft dieses Universum betreten wurde — die Bahn traegt alle Besuche. */
  visits: number
  run: UniverseRunRecord
}

export interface FirmamentPath {
  nodes: FirmamentNode[]
  departure: FirmamentDeparture | null
}

export interface FirmamentFitBox {
  cx: number
  cy: number
  /** Radius, auf den `radius: 1` faellt. */
  r: number
}

export interface FirmamentInput {
  completed: readonly CompletedGalaxyRecord[]
  runs: readonly UniverseRunRecord[]
  /** Die Bahn, die gezeigt wird. */
  universe: number
  /** Wo der Bard steht — nur DORT haengen laufende Galaxie und Vorausplaetze an. */
  currentUniverse: number
  currentGalaxy: number
  /** Sterne, die die laufende Galaxie schon hergab. */
  currentRescued: number
  currentLost: number
  currentLandfalls: number
  currentThemeIndex: number
  /** `computeRequired` — hereingereicht, damit die Rechnung rein bleibt. */
  starsOf: (galaxy: number) => number
}

/** Die groesste zentrierte Kreisflaeche der Buehne. Die Bahn ist rund; eine
 *  seitenverhaeltnis-gebundene Box wie bei der Galaxieplatte liesse links und
 *  rechts Rand stehen, den die Spirale braucht. */
export function firmamentFitBox(
  w: number,
  h: number,
  inset = FIRMAMENT_MAP_INSET_PX,
): FirmamentFitBox {
  return {
    cx: w / 2,
    cy: h / 2,
    r: Math.max(1, Math.min(w, h) / 2 - inset),
  }
}

export interface FirmamentSpot {
  nx: number
  ny: number
  angle: number
  radius: number
}

/* Kanaele des Hashes — getrennt, damit Radius, Weite und Richtung nicht
   aneinanderhaengen. Dasselbe Mittel wie in `firmamentPortalSpot`.            */
const RADIUS_SALT = 3
const STEP_SALT = 11
const SIGN_SALT = 23
const BOW_SALT = 37

/** Radius des `i`-ten Platzes. Die Auslenkung sitzt im PARAMETER und bleibt
 *  unter dem halben Platzabstand: der Radius ist monoton, Platz 0 liegt exakt
 *  auf `_R0`. Ohne sie laegen die Knoten auf Ringen. */
function spotRadius(i: number, span: number): number {
  if (span <= 1) return FIRMAMENT_PATH_R0
  const w = i === 0 ? 0 : (jitter(i, RADIUS_SALT) * 2 - 1) * FIRMAMENT_SCATTER_T_WOBBLE
  const t = Math.min(1, Math.max(0, (i + w) / (span - 1)))
  return (
    FIRMAMENT_PATH_R0 +
    (FIRMAMENT_PATH_R1 - FIRMAMENT_PATH_R0) * Math.pow(t, FIRMAMENT_PATH_RADIUS_EXP)
  )
}

/** Das Feld, das dem START-Label gehoert. */
export function firmamentInStartField(nx: number, ny: number): boolean {
  return (
    Math.abs(nx) < FIRMAMENT_START_CLEAR_X &&
    ny > FIRMAMENT_START_CLEAR_Y0 &&
    ny < FIRMAMENT_START_CLEAR_Y1
  )
}

/** Schneidet die Sehne zwischen zwei Plaetzen das Feld des Labels? Slab-
 *  Verfahren statt Abtastung — eine Abtastung uebersieht den flachen Schnitt. */
export function firmamentChordHitsStart(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  const d = [bx - ax, by - ay]
  const p = [ax, ay]
  const lo = [-FIRMAMENT_START_CLEAR_X, FIRMAMENT_START_CLEAR_Y0]
  const hi = [FIRMAMENT_START_CLEAR_X, FIRMAMENT_START_CLEAR_Y1]
  let t0 = 0
  let t1 = 1
  for (let k = 0; k < 2; k++) {
    if (Math.abs(d[k]) < 1e-12) {
      if (p[k] < lo[k] || p[k] > hi[k]) return false
      continue
    }
    const a = (lo[k] - p[k]) / d[k]
    const b = (hi[k] - p[k]) / d[k]
    t0 = Math.max(t0, Math.min(a, b))
    t1 = Math.min(t1, Math.max(a, b))
    if (t0 > t1) return false
  }
  return true
}

/**
 * Der Kontrollpunkt eines Bahnabschnitts: die Sehnenmitte, radial ausgelenkt.
 *
 * Die Skalierung ist massstabsfrei — die Platte rechnet dieselbe Formel in
 * Bildschirmkoordinaten um `box.cx/cy`. Sie steht hier, weil der Ablehnungspass
 * den GEMALTEN Bogen freihalten muss und nicht die gerade Sehne.
 */
export function firmamentRoadCtrl(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  i: number,
): { x: number; y: number } {
  const bow = 1 + (jitter(i, BOW_SALT) * 2 - 1) * FIRMAMENT_ROAD_BOW
  return { x: ((ax + bx) / 2) * bow, y: ((ay + by) / 2) * bow }
}

/**
 * Die Plaetze einer Bahn mit `span` Knoten — EINE Streuung fuer alle Universen.
 *
 * Platz 0 steht senkrecht ueber der Mitte, danach wandert der Winkel in
 * gewuerfelter Weite und Richtung. Der Mindestabstand ist deshalb ERZWUNGEN und
 * nicht mehr eine Folge der Regelmaessigkeit: ein Kandidat faellt durch, wenn er
 * einem gesetzten Knoten zu nahe kommt, im Feld des START-Labels liegt oder
 * sein BOGEN hindurchlaeuft. Ohne die dritte Bedingung liefen ueber alle Spannen
 * 571 Bahnzuege quer ueber das Wort; gegen die gerade Sehne gepruaeft blieben
 * 229 Kurvenpunkte in 24 Spannen uebrig, darunter 11 und 19.
 */
export function firmamentSpots(span: number): FirmamentSpot[] {
  const out: FirmamentSpot[] = []
  let prev = -Math.PI / 2
  for (let i = 0; i < span; i++) {
    const radius = spotRadius(i, span)
    if (i === 0) {
      out.push({ nx: 0, ny: -radius, angle: prev, radius })
      continue
    }

    let best: FirmamentSpot | null = null
    let bestGap = -1
    for (let k = 0; k < FIRMAMENT_SCATTER_TRIES; k++) {
      const step =
        FIRMAMENT_SCATTER_STEP_MIN +
        jitter(i * 2 + 1, STEP_SALT + k) *
          (FIRMAMENT_SCATTER_STEP_MAX - FIRMAMENT_SCATTER_STEP_MIN)
      const angle = prev + (jitter(i * 2 + 1, SIGN_SALT + k) < 0.5 ? -step : step)
      const nx = Math.cos(angle) * radius
      const ny = Math.sin(angle) * radius
      if (firmamentInStartField(nx, ny)) continue
      // Eine quadratische Bezier liegt in der Huelle von Anfang, Kontrollpunkt
      // und Ende — drei Sehnen genuegen fuer den ganzen Bogen.
      const a = out[i - 1]
      const c = firmamentRoadCtrl(a.nx, a.ny, nx, ny, i)
      if (
        firmamentChordHitsStart(a.nx, a.ny, c.x, c.y) ||
        firmamentChordHitsStart(c.x, c.y, nx, ny) ||
        firmamentChordHitsStart(a.nx, a.ny, nx, ny)
      ) {
        continue
      }

      let gap = Infinity
      for (const o of out) gap = Math.min(gap, Math.hypot(nx - o.nx, ny - o.ny))
      if (gap >= FIRMAMENT_SCATTER_MIN_SEP) {
        best = { nx, ny, angle, radius }
        break
      }
      if (gap > bestGap) {
        bestGap = gap
        best = { nx, ny, angle, radius }
      }
    }

    if (!best) {
      const angle = prev + FIRMAMENT_SCATTER_STEP_MIN
      best = { nx: Math.cos(angle) * radius, ny: Math.sin(angle) * radius, angle, radius }
    }
    out.push(best)
    prev = best.angle
  }
  return out
}

/** Der Boden fuer einen Datensatz ohne Feld. Nach der Migration kann er nicht
 *  greifen — aber ein Datensatz, dem sie fehlte, darf auf KEINER Bahn fehlen. */
function universeOf(record: CompletedGalaxyRecord): number {
  return record.universe ?? universes[0].id
}

/** Alle Besuche eines Universums, aelteste zuerst. Exportiert, weil die Chronik
 *  des Kopfbands ueber dieselben Laeufe summiert — zwei Filter, die dasselbe
 *  meinen, laufen still auseinander. */
export function runsOfUniverse(
  runs: readonly UniverseRunRecord[],
  universe: number,
): UniverseRunRecord[] {
  return runs.filter((r) => r.universe === universe).sort((a, b) => a.completedAt - b.completedAt)
}

/** Plaetze, die eine Bahn auf der Spirale belegt. Nur Knoten — das Portal steht
 *  nicht darauf und braucht deshalb auch keinen reservierten Platz. */
function slotsOf(input: FirmamentInput, universe: number): number {
  let n = 0
  let hasCurrent = false
  for (const r of input.completed) {
    if (universeOf(r) !== universe) continue
    n++
    if (r.galaxy === input.currentGalaxy) hasCurrent = true
  }
  if (universe === input.currentUniverse) {
    if (!hasCurrent) n++
    return n + FIRMAMENT_UNLIT_AHEAD
  }
  return n
}

/** Der gemeinsame Nenner: die laengste Bahn ueber alle Universen. */
function spanOf(input: FirmamentInput): number {
  const seen = new Set<number>([input.currentUniverse, input.universe])
  for (const r of input.completed) seen.add(universeOf(r))
  let max = 0
  for (const u of seen) max = Math.max(max, slotsOf(input, u))
  return Math.max(FIRMAMENT_PATH_MIN_SPAN, max)
}

/**
 * Die Bahn eines Universums: was darin befreit wurde, dahinter — nur im
 * laufenden — die aktuelle Galaxie und `FIRMAMENT_UNLIT_AHEAD` unbeleuchtete
 * Plaetze.
 *
 * Die Kette ist nach GALAXIENUMMER geordnet, nicht nach Zeitstempel — ein
 * Admin-Sprung traegt einen spaeteren Stempel als eine hoehere Nummer, und die
 * Bahn ist der Weg, nicht das Tagebuch.
 *
 * Eine vergangene Bahn endet, wo sie endete: dort gibt es kein „davor", also
 * auch keine Vorausplaetze.
 */
export function buildFirmamentPath(input: FirmamentInput): FirmamentPath {
  const isHere = input.universe === input.currentUniverse
  const freed = input.completed
    .filter((r) => universeOf(r) === input.universe)
    .sort((a, b) => a.galaxy - b.galaxy)
  const seen = new Set(freed.map((r) => r.galaxy))

  const rows: Array<Omit<FirmamentNode, 'nx' | 'ny' | 'angle' | 'radius' | 'bodyR'>> = freed.map(
    (r) => ({
      galaxy: r.galaxy,
      state: 'freed' as const,
      stars: input.starsOf(r.galaxy),
      rescued: r.attemptResults.filter((a) => a !== 'failed').length,
      lost: r.attemptResults.filter((a) => a === 'failed').length,
      landfalls: r.landfallResults?.filter((l) => l.cleared).length ?? 0,
      themeIndex: r.themeIndex,
      record: r,
    }),
  )

  if (isHere) {
    // Die laufende Galaxie steht nur dann eigens da, wenn sie nicht schon
    // archiviert ist — ein Admin-Replay legt beides gleichzeitig vor.
    if (!seen.has(input.currentGalaxy)) {
      rows.push({
        galaxy: input.currentGalaxy,
        state: 'current',
        stars: input.starsOf(input.currentGalaxy),
        rescued: input.currentRescued,
        lost: input.currentLost,
        landfalls: input.currentLandfalls,
        themeIndex: input.currentThemeIndex,
        record: null,
      })
    }

    const last = rows.length ? rows[rows.length - 1].galaxy : input.currentGalaxy
    for (let i = 1; i <= FIRMAMENT_UNLIT_AHEAD; i++) {
      rows.push({
        galaxy: last + i,
        state: 'unlit',
        stars: input.starsOf(last + i),
        rescued: 0,
        lost: 0,
        landfalls: 0,
        themeIndex: -1,
        record: null,
      })
    }
  }

  const spots = firmamentSpots(spanOf(input))

  const nodes = rows.map((row, i) => {
    const p = spots[i]
    return {
      ...row,
      nx: p.nx,
      ny: p.ny,
      angle: p.angle,
      radius: p.radius,
      bodyR:
        row.state === 'unlit'
          ? FIRMAMENT_NODE_R_BASE
          : FIRMAMENT_NODE_R_BASE + row.stars * FIRMAMENT_NODE_R_PER_STAR,
    }
  })

  return { nodes, departure: buildDeparture(input, nodes.length) }
}

/**
 * Das Tor am Ende einer vergangenen Bahn.
 *
 * Genommen wird der SPAETESTE Lauf des Universums — ein Ort kann mehrfach
 * besucht werden, und die Bahn traegt alle Besuche; `visits` zaehlt sie.
 * `toUniverse` ist das Universum des chronologisch naechsten Laufs, sonst das
 * laufende: dorthin ging der Weg weiter.
 *
 * Kein Tor bekommt, wer keinen Lauf mehr im Archiv hat — `UNIVERSE_RUN_HISTORY_LIMIT`
 * schiebt alte hinaus. Dort ist die Auskunft verloren, nicht falsch.
 */
function buildDeparture(input: FirmamentInput, nodeCount: number): FirmamentDeparture | null {
  if (input.universe === input.currentUniverse || nodeCount === 0) return null
  const mine = runsOfUniverse(input.runs, input.universe)
  if (!mine.length) return null

  const run = mine[mine.length - 1]
  const later = input.runs
    .filter((r) => r.completedAt > run.completedAt)
    .sort((a, b) => a.completedAt - b.completedAt)
  return {
    toUniverse: later.length ? later[0].universe : input.currentUniverse,
    visits: mine.length,
    run,
  }
}
