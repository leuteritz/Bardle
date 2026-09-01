/**
 * Was EINE Bahn hergab — die Chronik des Kopfbands.
 *
 * Rein und ZEITFREI, im Rezept von `firmamentRail.ts` und `voyageRoster.ts`:
 * der Aufrufer reicht den Bestand herein und bekommt Ablesungen zurueck. Die
 * Uhr bleibt draussen, sonst baute sich das Band im Sekundentakt neu.
 *
 * Warum das hier steht und nicht im Band: das Band ist eine Ansicht, und die
 * Frage, was ein Universum hergab, ist keine Darstellungsfrage. Sie ist
 * ausserdem die einzige Stelle des Reiters, die eine Spec binden kann, ohne
 * eine Komponente zu montieren.
 *
 * Ein Universum kann MEHRFACH besucht werden. Die Galaxien umspannen ohnehin
 * alle Besuche (`completedGalaxies` traegt nur das Universum, nicht den
 * Besuch) — Chimes und Zeit deshalb ebenso, als Summe ueber alle Laeufe. Alles
 * andere waere eine Bahn, deren Zahlen verschiedene Zeitraeume meinen.
 */

import { runsOfUniverse } from '@/utils/ui/firmamentLayout'
import type { FirmamentNode } from '@/utils/ui/firmamentLayout'
import type { UniverseRunRecord } from '@/types'

/** Der Aufbruch — nur auf der LAUFENDEN Bahn. Eine vergangene ist aufgebrochen,
 *  ihr Fortschritt ist kein Fortschritt mehr, sondern ein Ergebnis. */
export interface FirmamentDepartureProgress {
  raised: number
  goal: number
  /** 0..100, schon geklemmt — dieselbe Zahl, die die Unterkante fuellt. */
  percent: number
  /** Spielsekunden bis zum Aufbruch. `null` heisst: ohne Produktion keine
   *  Ankunft. `0` heisst: er steht offen. */
  etaSeconds: number | null
}

export interface FirmamentChronicle {
  /** Befreite Galaxien dieser Bahn. Die LAUFENDE zaehlt nicht mit — sie ist
   *  noch nicht befreit, und der Knoten sagt das auch. */
  galaxies: number
  /** Sterne der Bahn, die laufende Galaxie eingeschlossen: ihre Sterne SIND
   *  gerettet oder verloren, auch wenn ihr Kern noch steht. */
  rescued: number
  lost: number
  /** Wie oft dieses Universum betreten wurde, das laufende Mal mitgezaehlt. */
  visits: number
  /** Chimes, die hier bis zum Aufbruch erhoben wurden — ueber alle Besuche.
   *  `null`, wenn `UNIVERSE_RUN_HISTORY_LIMIT` den Lauf aus dem Archiv
   *  geschoben hat: dort ist die Auskunft verloren, nicht null. */
  chimes: number | null
  /** Spielsekunden in diesem Universum, ueber alle Besuche. Dieselbe
   *  `null`-Regel. */
  seconds: number | null
  departure: FirmamentDepartureProgress | null
}

export interface FirmamentChronicleInput {
  /** Die Knoten der GEZEIGTEN Bahn, wie `buildFirmamentPath` sie legt. */
  nodes: readonly FirmamentNode[]
  runs: readonly UniverseRunRecord[]
  universe: number
  currentUniverse: number
  /** Chimes des laufenden Durchgangs und was der Aufbruch verlangt. */
  liveChimes: number
  liveGoal: number
  /** Spielsekunden im laufenden Durchgang (`gameStore.universeRunStats`). */
  liveSeconds: number
  chimesPerSecond: number
}

export function buildFirmamentChronicle(input: FirmamentChronicleInput): FirmamentChronicle {
  const isHere = input.universe === input.currentUniverse

  let galaxies = 0
  let rescued = 0
  let lost = 0
  for (const n of input.nodes) {
    if (n.state === 'unlit') continue
    if (n.state === 'freed') galaxies++
    rescued += n.rescued
    lost += n.lost
  }

  const past = runsOfUniverse(input.runs, input.universe)
  /* Ein Universum ohne Lauf im Archiv ist nicht leer, sondern unbekannt — es sei
     denn, man steht darin: dann traegt der laufende Durchgang die Zahlen. */
  const known = past.length > 0 || isHere
  const chimes = known
    ? past.reduce((sum, r) => sum + r.chimes, 0) + (isHere ? input.liveChimes : 0)
    : null
  const seconds = known
    ? past.reduce((sum, r) => sum + r.durationSeconds, 0) + (isHere ? input.liveSeconds : 0)
    : null

  return {
    galaxies,
    rescued,
    lost,
    visits: past.length + (isHere ? 1 : 0),
    chimes,
    seconds,
    departure: isHere ? departureOf(input) : null,
  }
}

function departureOf(input: FirmamentChronicleInput): FirmamentDepartureProgress {
  const left = Math.max(0, input.liveGoal - input.liveChimes)
  return {
    raised: input.liveChimes,
    goal: input.liveGoal,
    percent:
      input.liveGoal > 0
        ? Math.min(100, Math.max(0, (input.liveChimes / input.liveGoal) * 100))
        : 100,
    etaSeconds: left <= 0 ? 0 : input.chimesPerSecond > 0 ? left / input.chimesPerSecond : null,
  }
}
