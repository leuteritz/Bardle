/**
 * Die Zeilen der Universumsleiste — eine je Universum, immer alle zehn.
 *
 * Rein und ZEITFREI, wie `voyageRoster`: der Aufrufer reicht den Bestand herein
 * und bekommt Zeilen zurueck. Sie stehen hier und nicht in der Leiste, weil ZWEI
 * Leser sie brauchen — die Liste und ihr Griff, der auch dann noch sagen muss,
 * wie viele Universen begangen sind, wenn die Liste weggefahren ist. Eine zweite
 * Zaehlung im Griff liefe still gegen die Liste.
 *
 * Waehlbar ist, was INHALT hat, nicht was Auskunft hat: `pickable` haengt an den
 * Galaxien des Universums. Damit gibt es keinen leeren Buehnenzustand — eine
 * Bahn ohne Knoten kann gar nicht erst gewaehlt werden.
 */

import { universes } from '@/config/progression/universes'
import { formatCompactDuration, toRoman } from '@/utils/ui/format'
import { MS_PER_SECOND } from '@/config/constants'
import type { UniverseDiscState } from '@/utils/fx/universeDisc'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { UniverseRunRecord } from '@/types'

export interface FirmamentRailRow {
  id: number
  /** Wie es heisst, ist seine Nummer — `universeLabel(id)` baut die Zeile. */
  roman: string
  tint: string
  walked: boolean
  current: boolean
  picked: boolean
  pickable: boolean
  note: string
  discState: UniverseDiscState
}

export interface FirmamentRailInput {
  completed: readonly CompletedGalaxyRecord[]
  runs: readonly UniverseRunRecord[]
  currentUniverse: number
  /** Die gezeigte Bahn — der Ansichtszustand, nie leer. */
  selectedUniverse: number
}

export function buildFirmamentRailRows(input: FirmamentRailInput): FirmamentRailRow[] {
  /* Der letzte Lauf JE Universum: ein Ort kann mehrfach besucht werden, die
     Leiste zeigt eine Zeile je Ort, nicht je Besuch. */
  const runByUniverse = new Map<number, { galaxiesFreed: number; durationSeconds: number }>()
  for (const run of input.runs) {
    runByUniverse.set(run.universe, {
      galaxiesFreed: run.galaxiesFreed,
      durationSeconds: run.durationSeconds,
    })
  }

  /* Dieselbe Zaehlung wie `buildFirmamentPath`, samt Boden fuer einen Datensatz
     ohne Feld. */
  const galaxiesByUniverse = new Map<number, number>()
  for (const r of input.completed) {
    const u = r.universe ?? universes[0].id
    galaxiesByUniverse.set(u, (galaxiesByUniverse.get(u) ?? 0) + 1)
  }

  return universes.map((u) => {
    const current = u.id === input.currentUniverse
    const past = runByUniverse.get(u.id)
    const galaxies = galaxiesByUniverse.get(u.id) ?? 0
    const walked = current || past !== undefined || galaxies > 0
    return {
      id: u.id,
      roman: toRoman(u.id),
      tint: u.tint,
      walked,
      current,
      picked: input.selectedUniverse === u.id,
      pickable: current || galaxies > 0,
      note: current
        ? `you are here · ${galaxies} freed`
        : galaxies > 0
          ? `${galaxies} freed${past ? ` · ${formatCompactDuration(past.durationSeconds * MS_PER_SECOND)}` : ''}`
          : past
            ? 'walked · no galaxies freed'
            : 'not yet walked',
      /** Die Scheibe traegt den Zustand selbst — leer heisst nie betreten. */
      discState: (current ? 'current' : walked ? 'walked' : 'unlit') as UniverseDiscState,
    }
  })
}
