/* ── Nachtrag für übersprungene Aufbrüche ─────────────────────────────────────
   Ein Admin-Sprung setzt `currentUniverse`, lässt `gameStore.universeRuns` aber
   leer — das Feld wird nur beim echten Prestige geschrieben. Das Firmament
   steht dann auf fünfzig Galaxien und NULL Toren, und jede Zeile der
   Universumsleiste ausser der laufenden liest „not yet walked".

   Die Gegenfigur zu `galaxyArchiveBackfill.ts`, und rein aus demselben Grund:
   die Records nur als Typ, kein Store, damit die Spec ohne Pinia läuft.

   Der Vertrag, an dem alles hängt: ein Lauf bekommt seinen Platz auf der Bahn
   über `completedAt`, und die Regel dafür steht in `buildFirmamentGates`. Also
   wird der Stempel AUS dem Archiv abgeleitet, nicht daneben gerechnet —
   `gateRecordIndex` spiegelt dieselbe Suche, und die Spec hält beide
   gegeneinander. */

import { seededRng } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  ADMIN_ARCHIVE_RECENT_GAP_MS,
  ADMIN_UNIVERSE_CHIMES_SALT,
  ADMIN_UNIVERSE_ORDER_SALT,
  ADMIN_UNIVERSE_OVERSHOOT,
  ADMIN_UNIVERSE_PROVIDENCE_SALT,
  UNIVERSE_RESCUE_COST_MULTIPLIER,
  UNIVERSE_RESCUE_INITIAL_COST,
  UNIVERSE_RUN_HISTORY_LIMIT,
} from '@/config/constants'
import { universes } from '@/config/progression/universes'
import { PROVIDENCE_AXES } from '@/config/progression/providences'
import { drawUnique } from '@/utils/game/voyageLegs'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { UniverseRunRecord } from '@/types'

type Rng = () => number

export function universeOrderRng(currentUniverse: number): Rng {
  return seededRng(currentUniverse * ADMIN_UNIVERSE_ORDER_SALT + 1)
}

export function universeChimesRng(currentUniverse: number): Rng {
  return seededRng(currentUniverse * ADMIN_UNIVERSE_CHIMES_SALT + 1)
}

export function universeProvidenceRng(currentUniverse: number): Rng {
  return seededRng(currentUniverse * ADMIN_UNIVERSE_PROVIDENCE_SALT + 1)
}

/**
 * Wo ein Lauf sein Tor bekäme — dieselbe Suche wie in `buildFirmamentGates`:
 * der LETZTE Datensatz, der nicht nach dem Aufbruch liegt. `-1` heisst „vor
 * allem, was archiviert ist", dort gibt es kein Tor.
 */
export function gateRecordIndex(
  records: readonly CompletedGalaxyRecord[],
  completedAt: number,
): number {
  let idx = -1
  for (let i = 0; i < records.length; i++) {
    if (records[i].completedAt <= completedAt) idx = i
  }
  return idx
}

/** Der Stempel, der ein Tor genau hinter `boundary` setzt. */
function stampAfter(records: readonly CompletedGalaxyRecord[], boundary: number): number {
  const here = records[boundary].completedAt
  const next = records[boundary + 1]
  if (!next) return here + Math.floor(ADMIN_ARCHIVE_RECENT_GAP_MS / 2)
  // Das Minimum ist Pflicht, nicht Vorsicht: bei einer Millisekunde Abstand
  // fiele der Mittelwert auf den NÄCHSTEN Datensatz, und das Tor sässe auf dem
  // falschen Knoten.
  return Math.min(Math.floor((here + next.completedAt) / 2), next.completedAt - 1)
}

/**
 * Die Aufbrüche, die ein Sprung überspringt.
 *
 * Welche Universen: alle aus dem Katalog ausser dem laufenden, die noch keinen
 * Lauf haben — NICHT `currentUniverse - 1` Stück. Das wäre eine Leiterrechnung,
 * und die Universen sind ausdrücklich keine Leiter, sondern eine Auswahl. Beide
 * ergeben heute dieselbe Zahl; diese überlebt eine Katalogänderung.
 *
 * Universum 1 zuerst — dort beginnt jedes Spiel —, der Rest gemischt.
 *
 * Der Deckel `UNIVERSE_RUN_HISTORY_LIMIT` greift HIER und nie im Store: ein
 * `splice` am Bestand würfe den ältesten Lauf weg, also ausgerechnet
 * Universum 1, und dessen Leistenzeile stünde wieder auf „not yet walked".
 * Gekappt wird der Nachtrag.
 */
export function buildBackfillUniverseRuns(
  records: readonly CompletedGalaxyRecord[],
  currentUniverse: number,
  existing: readonly UniverseRunRecord[],
): UniverseRunRecord[] {
  if (records.length === 0) return []

  const walked = new Set(existing.map((run) => run.universe))
  const missing = universes
    .map((u) => u.id)
    .filter((id) => id !== currentUniverse && !walked.has(id))
  if (missing.length === 0) return []

  const orderRng = universeOrderRng(currentUniverse)
  const head = missing.filter((id) => id === 1)
  const rest = missing.filter((id) => id !== 1)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(orderRng() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  const order = [...head, ...rest]

  // Plätze, die ein bestehender Lauf schon beansprucht — zwei Tore auf einer
  // Marke wären nicht mehr zu trennen, `buildFirmamentGates` verwirft das
  // zweite stillschweigend.
  const taken = new Set(existing.map((run) => gateRecordIndex(records, run.completedAt)))
  const free: number[] = []
  for (let i = 0; i < records.length; i++) if (!taken.has(i)) free.push(i)

  const count = Math.min(
    order.length,
    free.length,
    Math.max(0, UNIVERSE_RUN_HISTORY_LIMIT - existing.length),
  )
  if (count === 0) return []

  const chimesRng = universeChimesRng(currentUniverse)
  const providenceRng = universeProvidenceRng(currentUniverse)
  const providencePool = PROVIDENCE_AXES.flatMap((axis) => axis.names)
  const usedProvidences = new Set(existing.map((run) => run.providence ?? ''))

  const out: UniverseRunRecord[] = []
  let from = 0
  for (let k = 0; k < count; k++) {
    // Das LETZTE Tor sitzt auf dem letzten Datensatz. Das ist die tragende
    // Wahl: dahinter liegt nur noch die frisch betretene Galaxie, und die
    // Basislinie des laufenden Universums darf deshalb bei null anfangen.
    const boundary = free[Math.floor(((k + 1) * free.length) / count) - 1]
    const segment = records.slice(from, boundary + 1)
    from = boundary + 1

    out.push({
      universe: order[k],
      durationSeconds: segment.reduce((sum, r) => sum + r.durationSeconds, 0),
      // `=== 'rescued'`, wie `adminBackfillArchive` `totalStarsRescued` bucht —
      // zwei Zählweisen für dieselbe Zahl laufen auseinander.
      starsRescued: segment.reduce(
        (sum, r) => sum + r.attemptResults.filter((a) => a === 'rescued').length,
        0,
      ),
      galaxiesFreed: segment.length,
      chimes: Math.round(
        UNIVERSE_RESCUE_INITIAL_COST *
          UNIVERSE_RESCUE_COST_MULTIPLIER ** k *
          (1 + chimesRng() * ADMIN_UNIVERSE_OVERSHOOT),
      ),
      providence: drawUnique(providencePool, usedProvidences, providenceRng),
      completedAt: stampAfter(records, boundary),
    })
  }
  return out
}
