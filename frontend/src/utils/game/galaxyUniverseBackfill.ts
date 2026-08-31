/* ── Nachtrag: in welchem Universum eine Galaxie befreit wurde ────────────────
   `CompletedGalaxyRecord.universe` gibt es erst, seit das Firmament eine Bahn je
   Universum zeigt. Jeder Spielstand davor trägt das Feld nicht, und ohne es
   läge der ganze Altbestand auf einer einzigen Bahn.

   Abgeleitet wird es aus denselben Wanduhr-Stempeln, aus denen
   `universeRunBackfill` seine Tore setzt — nur in der Gegenrichtung: dort
   „welcher Datensatz liegt vor diesem Lauf", hier „welcher Lauf liegt hinter
   diesem Datensatz". Die Spec hält beide gegeneinander.

   Rein, die Records nur als Typ, kein Store — damit sie ohne Pinia läuft. */

import { universes } from '@/config/progression/universes'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { UniverseRunRecord } from '@/types'

/**
 * Das Universum, in dem eine Galaxie mit diesem Stempel befreit wurde: der
 * ERSTE Lauf, der nicht vor ihr endete. Hinter dem letzten Lauf liegt das
 * laufende Universum.
 *
 * Vor dem ältesten erhaltenen Lauf gilt dessen Universum — er BEENDET es, also
 * wurde alles davor darin befreit. Nur wenn `UNIVERSE_RUN_HISTORY_LIMIT`
 * nachweislich Läufe aus dem Archiv geschoben hat (`totalPrestiges` zählt mehr
 * Aufbrüche, als Läufe übrig sind), wäre das eine Lüge: dann stammen die
 * ältesten Galaxien aus Universen, von denen kein Lauf mehr zeugt, und sie
 * gehen an den Anfang des Katalogs.
 */
export function universeOfCompletion(
  runs: readonly UniverseRunRecord[],
  completedAt: number,
  currentUniverse: number,
  totalPrestiges: number,
): number {
  if (!runs.length) return currentUniverse
  const sorted = [...runs].sort((a, b) => a.completedAt - b.completedAt)
  const idx = sorted.findIndex((run) => run.completedAt >= completedAt)
  if (idx < 0) return currentUniverse
  if (idx === 0 && totalPrestiges > sorted.length) return universes[0].id
  return sorted[idx].universe
}

/**
 * Trägt `universe` nach, wo es fehlt.
 *
 * Idempotent, und zwar ohne Flag: das Feld IST die Erkennung. Ein Datensatz,
 * der es trägt, bleibt unangetastet — ein zweiter Durchlauf ist ein No-op, und
 * ein gespeicherter Merker wäre eine zweite Wahrheit über denselben Umstand.
 *
 * `overwrite` gehört allein dem Admin-Nachtrag: der erfindet die Läufe gerade
 * erst, und ein älterer Stempel stünde quer zu Grenzen, die es vorher nicht gab.
 */
export function assignRecordUniverses(
  records: readonly CompletedGalaxyRecord[],
  runs: readonly UniverseRunRecord[],
  currentUniverse: number,
  totalPrestiges: number,
  opts?: { overwrite?: boolean },
): CompletedGalaxyRecord[] {
  const overwrite = opts?.overwrite ?? false
  return records.map((record) => {
    if (!overwrite && record.universe !== undefined) return record
    return {
      ...record,
      universe: universeOfCompletion(runs, record.completedAt, currentUniverse, totalPrestiges),
    }
  })
}
