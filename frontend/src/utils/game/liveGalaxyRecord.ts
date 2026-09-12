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
import type { DotPos } from '@/components/bottom/minimap/minimapGalaxyGeometry'

export interface LiveGalaxyState {
  galaxy: number
  mapSeed: number
  themeIndex: number
  universe: number
  attemptResults: StarAttemptResult[]
  landfallResults: LandfallOutcome[]
  incidentResults: GalaxyIncident[]
  starManifests: StarManifest[]
  starPositions: DotPos[]
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
    starPositions: state.starPositions.map((p) => ({ ...p })),
    durationSeconds: 0,
    completedAt: 0,
  }
}
