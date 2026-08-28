/**
 * Die Bahn des Firmaments — wo eine Galaxie auf der Karte steht.
 *
 * Reine Rechnung, kein DOM, kein Store: die Karte reicht ihr den Bestand und
 * bekommt normierte Koordinaten zurueck. Die Umrechnung in Pixel macht die
 * Fit-Box, damit dieselbe Bahn auf jeder Buehnengroesse dieselbe Form hat —
 * dieselbe Trennung wie `galaxyPlaneToWorld` und die Galaxieplatte.
 *
 * Der Vertrag, an dem alles haengt: **eine durchgehende Kette**. Galaxien
 * laufen ueber das Prestige hinweg weiter (`executePrestigeReset` fasst
 * `completedGalaxies` nicht an), Universen sind eine PARALLELE Achse. Ein
 * Universumswechsel ist deshalb ein TOR auf der Bahn, kein eigener Abschnitt.
 */

import {
  FIRMAMENT_MAP_INSET_PX,
  FIRMAMENT_NODE_R_BASE,
  FIRMAMENT_NODE_R_PER_STAR,
  FIRMAMENT_SPIRAL_R0,
  FIRMAMENT_SPIRAL_R1,
  FIRMAMENT_SPIRAL_RADIUS_EXP,
  FIRMAMENT_SPIRAL_TURNS,
  FIRMAMENT_UNLIT_AHEAD,
} from '@/config/constants'
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

export interface FirmamentGate {
  universe: number
  /** Index des letzten Knotens VOR dem Tor. */
  afterIndex: number
  nx: number
  ny: number
  angle: number
  run: UniverseRunRecord
}

export interface FirmamentFitBox {
  cx: number
  cy: number
  /** Radius, auf den `radius: 1` faellt. */
  r: number
}

export interface FirmamentInput {
  completed: readonly CompletedGalaxyRecord[]
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

/** Ein Punkt der Bahn bei `t` (0 = Kern, 1 = Rand). */
export function firmamentPointAt(t: number): {
  nx: number
  ny: number
  angle: number
  radius: number
} {
  const f = Math.min(1, Math.max(0, t))
  const angle = f * FIRMAMENT_SPIRAL_TURNS * Math.PI * 2 - Math.PI / 2
  const radius =
    FIRMAMENT_SPIRAL_R0 +
    (FIRMAMENT_SPIRAL_R1 - FIRMAMENT_SPIRAL_R0) * Math.pow(f, FIRMAMENT_SPIRAL_RADIUS_EXP)
  return { nx: Math.cos(angle) * radius, ny: Math.sin(angle) * radius, angle, radius }
}

/**
 * Die Knotenkette: alles Befreite, die laufende Galaxie, dann
 * `FIRMAMENT_UNLIT_AHEAD` unbeleuchtete Plaetze.
 *
 * Die Kette ist nach GALAXIENUMMER geordnet, nicht nach Zeitstempel — ein
 * Admin-Sprung traegt einen spaeteren Stempel als eine hoehere Nummer, und die
 * Bahn ist der Weg, nicht das Tagebuch.
 */
export function buildFirmamentNodes(input: FirmamentInput): FirmamentNode[] {
  const freed = [...input.completed].sort((a, b) => a.galaxy - b.galaxy)
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

  const n = rows.length
  return rows.map((row, i) => {
    const p = firmamentPointAt(n > 1 ? i / (n - 1) : 0)
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
}

/**
 * Wo ein Universum endete.
 *
 * Der Lauf traegt einen Wanduhr-Stempel, jede befreite Galaxie auch. Das Tor
 * sitzt hinter der letzten Galaxie, die VOR dem Aufbruch befreit wurde.
 *
 * Zwei Faelle liefern bewusst kein Tor, statt eines zu erfinden:
 * ein Lauf, der `UNIVERSE_RUN_HISTORY_LIMIT` aus dem Archiv geschoben hat, und
 * ein Lauf, dessen Galaxien in keinem Datensatz mehr stehen. Beides ist wahr —
 * dort ist die Auskunft verloren, nicht falsch.
 */
export function buildFirmamentGates(
  nodes: readonly FirmamentNode[],
  runs: readonly UniverseRunRecord[],
): FirmamentGate[] {
  if (!nodes.length || !runs.length) return []
  const out: FirmamentGate[] = []
  const used = new Set<number>()

  for (const run of [...runs].sort((a, b) => a.completedAt - b.completedAt)) {
    let idx = -1
    for (let i = 0; i < nodes.length; i++) {
      const rec = nodes[i].record
      if (rec && rec.completedAt <= run.completedAt) idx = i
    }
    // Kein Knoten davor, oder das Tor stuende auf demselben Platz wie ein
    // frueheres: zwei Universen auf einer Marke waeren nicht mehr zu trennen.
    if (idx < 0 || idx >= nodes.length - 1 || used.has(idx)) continue
    used.add(idx)
    const a = nodes[idx]
    const b = nodes[idx + 1]
    out.push({
      universe: run.universe,
      afterIndex: idx,
      nx: (a.nx + b.nx) / 2,
      ny: (a.ny + b.ny) / 2,
      angle: (a.angle + b.angle) / 2,
      run,
    })
  }
  return out
}

/** Signatur der Tore — sie gehoert in den `paintKey`, und sie kennt nur
 *  LAENGEN und Nummern: ein nachgetragener Lauf aendert die Kette, nicht die
 *  Farbe, und ein Zeitstempel taugt nicht als Schluessel. */
export function firmamentGateSignature(gates: readonly FirmamentGate[]): string {
  return gates.length ? gates.map((g) => `${g.universe}@${g.afterIndex}`).join('.') : '-'
}
