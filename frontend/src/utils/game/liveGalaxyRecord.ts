/**
 * Die LAUFENDE Galaxie als Datensatz — der einzige synthetische im Spiel.
 *
 * `paintGalaxy` verlangt einen `CompletedGalaxyRecord`, und die Galaxie, in der
 * der Spieler gerade fliegt, ist per Definition keiner. Sie so zu bauen, wie sie
 * beim Abschluss ins Archiv geht, ist die einzige Fassung, die nicht auseinander
 * laufen kann: dieselbe Feldliste wie `galaxyStore.maybeRecordCompletion()`.
 *
 * Zwei Felder trägt die Form, nicht der Inhalt: `durationSeconds` und
 * `completedAt` sind 0, weil der Lauf nicht fertig ist. `paintGalaxy` liest
 * beide nie — wer diesen Datensatz woanders hinreicht, prüft das zuerst.
 */
import type { CompletedGalaxyRecord, StarAttemptResult } from '@/stores/world/galaxyStore'
import type { GalaxyIncident, LandfallOutcome, StarManifest } from '@/types'

export interface LiveGalaxyState {
  galaxy: number
  mapSeed: number
  themeIndex: number
  universe: number
  attemptResults: StarAttemptResult[]
  landfallResults: LandfallOutcome[]
  incidentResults: GalaxyIncident[]
  starManifests: StarManifest[]
}

export function liveGalaxyRecord(state: LiveGalaxyState): CompletedGalaxyRecord {
  return {
    galaxy: state.galaxy,
    mapSeed: state.mapSeed,
    themeIndex: state.themeIndex,
    universe: state.universe,
    attemptResults: [...state.attemptResults],
    landfallResults: [...state.landfallResults],
    incidentResults: state.incidentResults.map((e) => ({ ...e })),
    starManifests: state.starManifests.map((m) => ({ ...m })),
    durationSeconds: 0,
    completedAt: 0,
  }
}
