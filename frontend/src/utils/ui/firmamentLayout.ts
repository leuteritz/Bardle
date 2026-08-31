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
 * Und der Windungsvorrat haengt AM Nenner statt fest zu stehen: der
 * Winkelschritt ist die Groesse, die gleich bleibt. Zwei feste Windungen sind
 * auf fuenf Knoten 180 Grad je Schritt — die Bahn sprang quer ueber die Scheibe
 * und las sich als Zickzack.
 */

import {
  FIRMAMENT_MAP_INSET_PX,
  FIRMAMENT_NODE_R_BASE,
  FIRMAMENT_NODE_R_PER_STAR,
  FIRMAMENT_PATH_MIN_SPAN,
  FIRMAMENT_SPIRAL_R0,
  FIRMAMENT_SPIRAL_R1,
  FIRMAMENT_SPIRAL_RADIUS_EXP,
  FIRMAMENT_SPIRAL_STEP_TURNS,
  FIRMAMENT_SPIRAL_TURNS,
  FIRMAMENT_UNLIT_AHEAD,
} from '@/config/constants'
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

/**
 * Der Windungsvorrat einer Bahn mit `span` Plaetzen.
 *
 * Der Winkelschritt ist die feste Groesse, nicht die Windungszahl: zwei
 * Windungen auf fuenf Knoten sind 180 Grad je Schritt, und die Bahn springt
 * quer ueber die Scheibe. Gedeckelt bleibt sie bei `FIRMAMENT_SPIRAL_TURNS` —
 * ab dort ruecken die Knoten wieder zusammen, und die Trefferflaechen-Wand aus
 * `firmamentLayout.spec.ts` gilt unveraendert.
 */
export function firmamentSpiralTurns(span: number): number {
  return Math.min(FIRMAMENT_SPIRAL_TURNS, Math.max(1, span - 1) * FIRMAMENT_SPIRAL_STEP_TURNS)
}

/** Ein Punkt der Bahn bei `t` (0 = Kern, 1 = Rand). */
export function firmamentPointAt(
  t: number,
  turns: number = FIRMAMENT_SPIRAL_TURNS,
): {
  nx: number
  ny: number
  angle: number
  radius: number
} {
  const f = Math.min(1, Math.max(0, t))
  const angle = f * turns * Math.PI * 2 - Math.PI / 2
  const radius =
    FIRMAMENT_SPIRAL_R0 +
    (FIRMAMENT_SPIRAL_R1 - FIRMAMENT_SPIRAL_R0) * Math.pow(f, FIRMAMENT_SPIRAL_RADIUS_EXP)
  return { nx: Math.cos(angle) * radius, ny: Math.sin(angle) * radius, angle, radius }
}

/** Der Boden fuer einen Datensatz ohne Feld. Nach der Migration kann er nicht
 *  greifen — aber ein Datensatz, dem sie fehlte, darf auf KEINER Bahn fehlen. */
function universeOf(record: CompletedGalaxyRecord): number {
  return record.universe ?? universes[0].id
}

function runsOfUniverse(runs: readonly UniverseRunRecord[], universe: number): UniverseRunRecord[] {
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

  const span = spanOf(input)
  const turns = firmamentSpiralTurns(span)
  const at = (i: number) => firmamentPointAt(i / (span - 1), turns)

  const nodes = rows.map((row, i) => {
    const p = at(i)
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
