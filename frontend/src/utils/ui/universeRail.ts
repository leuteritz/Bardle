/**
 * Die Karten der Universumsleiste — eine je Universum, immer alle zehn.
 *
 * Rein und ZEITFREI, wie `voyageRoster`: der Aufrufer reicht den Bestand herein
 * und bekommt Karten zurueck. Sie stehen hier und nicht in der Leiste, weil ZWEI
 * Leser sie brauchen — die Liste und ihr Griff, der auch dann noch sagen muss,
 * wie viele Universen begangen sind, wenn die Liste weggefahren ist. Eine zweite
 * Zaehlung im Griff liefe still gegen die Liste.
 *
 * Waehlbar ist, was INHALT hat, nicht was Auskunft hat: `pickable` haengt an den
 * Galaxien des Universums. Damit gibt es keinen leeren Buehnenzustand — eine
 * Bahn ohne Knoten kann gar nicht erst gewaehlt werden.
 *
 * Die Karte liest, was das ARCHIV haelt. Die laufende Uhr steht im Kopfband —
 * der einzigen Stelle des Reiters, die je Tick neu baut. Zoege jemand
 * `liveSeconds` hier herein, rechneten zehn Karten je Einkommens-Tick neu.
 *
 * Die Sterne kommen aus `record.attemptResults`, nicht aus `buildUniversePath`:
 * dieselbe Zaehlung, ohne die Spiralstreuung zehnmal zu betreten.
 */

import { universes } from '@/config/progression/universes'
import { universeOfRecord } from '@/utils/game/galaxyUniverseBackfill'
import { formatCompactDuration, toRoman } from '@/utils/ui/format'
import {
  MS_PER_SECOND,
  UNIVERSE_RAIL_ELAPSED_NOW,
  UNIVERSE_RAIL_PROGRESS_FLOOR,
  UNIVERSE_RAIL_UNKNOWN,
} from '@/config/constants'
import type { UniverseDiscState } from '@/utils/fx/universeDisc'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { UniverseRunRecord } from '@/types'

export interface UniverseRailRow {
  id: number
  /** Wie es heisst, ist seine Nummer — `universeLabel(id)` baut die Zeile. */
  roman: string
  tint: string
  walked: boolean
  current: boolean
  picked: boolean
  pickable: boolean
  discState: UniverseDiscState
  /** Die Zustandszeile unter dem Namen. */
  state: string
  /** Die drei Ablesungen, roh — die Karte SETZT sie, sie rechnet nicht. */
  galaxies: number
  rescued: number
  lost: number
  /** Schon formatiert und zeitfrei: `now`, `2h 14m` oder `—`. */
  elapsed: string
  /** 0..1, geklemmt — der Anteil des Balkens. */
  progress: number
  /** Der ganze gesprochene Satz, fuer `aria-label`. */
  note: string
}

export interface UniverseRailInput {
  completed: readonly CompletedGalaxyRecord[]
  runs: readonly UniverseRunRecord[]
  currentUniverse: number
  /** Die gezeigte Bahn — der Ansichtszustand, nie leer. */
  selectedUniverse: number
  /** Sterne der LAUFENDEN Galaxie. Sie sind gerettet oder verloren, auch wenn
   *  ihr Kern noch steht — das Kopfband zaehlt sie ebenso mit. */
  currentRescued: number
  currentLost: number
}

interface Tally {
  galaxies: number
  rescued: number
  lost: number
}

export function buildUniverseRailRows(input: UniverseRailInput): UniverseRailRow[] {
  /* EINE Schleife ueber das Archiv: Galaxien und Sterne je Bahn. */
  const byUniverse = new Map<number, Tally>()
  for (const r of input.completed) {
    const u = universeOfRecord(r)
    const acc = byUniverse.get(u) ?? { galaxies: 0, rescued: 0, lost: 0 }
    acc.galaxies++
    for (const a of r.attemptResults) {
      if (a === 'failed') acc.lost++
      else acc.rescued++
    }
    byUniverse.set(u, acc)
  }

  /* Ein Ort kann MEHRFACH besucht werden — Dauer und Besuche summieren ueber
     alle Laeufe, wie die Chronik es tut. */
  const runsByUniverse = new Map<number, { seconds: number; visits: number }>()
  for (const run of input.runs) {
    const acc = runsByUniverse.get(run.universe) ?? { seconds: 0, visits: 0 }
    acc.seconds += run.durationSeconds
    acc.visits++
    runsByUniverse.set(run.universe, acc)
  }

  /* Der Nenner des Balkens: die tiefste Bahn. Er beantwortet die eine Frage, die
     das Kopfband nicht kann — es zeigt immer nur ein Universum. */
  let deepest = UNIVERSE_RAIL_PROGRESS_FLOOR
  for (const t of byUniverse.values()) deepest = Math.max(deepest, t.galaxies)

  return universes.map((u) => {
    const current = u.id === input.currentUniverse
    const tally = byUniverse.get(u.id)
    const past = runsByUniverse.get(u.id)
    const galaxies = tally?.galaxies ?? 0
    const rescued = (tally?.rescued ?? 0) + (current ? input.currentRescued : 0)
    const lost = (tally?.lost ?? 0) + (current ? input.currentLost : 0)
    const walked = current || past !== undefined || galaxies > 0

    const state = current
      ? 'you are here'
      : galaxies > 0
        ? 'visited'
        : past
          ? 'walked · nothing freed'
          : 'not yet walked'

    const elapsed = current
      ? UNIVERSE_RAIL_ELAPSED_NOW
      : past
        ? formatCompactDuration(past.seconds * MS_PER_SECOND)
        : UNIVERSE_RAIL_UNKNOWN

    return {
      id: u.id,
      roman: toRoman(u.id),
      tint: u.tint,
      walked,
      current,
      picked: input.selectedUniverse === u.id,
      pickable: current || galaxies > 0,
      /** Die Scheibe traegt den Zustand selbst — leer heisst nie betreten. */
      discState: (current ? 'current' : walked ? 'walked' : 'unlit') as UniverseDiscState,
      state,
      galaxies,
      rescued,
      lost,
      elapsed,
      progress: Math.min(1, galaxies / deepest),
      note: walked
        ? `${state}, ${galaxies} freed, ${rescued} stars rescued, ${lost} lost`
        : state,
    }
  })
}
