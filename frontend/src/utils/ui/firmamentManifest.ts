/**
 * Wer in einer Galaxie geflogen ist — die Sitze ihrer Knotenkarte.
 *
 * Die Paarung selbst ist der ganze Inhalt: `attemptResults[i]` sagt, wie der
 * Versuch ausging, `starManifests[i]` sagt, wer ihn flog. Die Index-Gleichheit
 * ist der Vertrag des Manifests (`starManifest.spec.ts`) — hier wird sie
 * gelesen, nicht neu hergestellt. Deshalb ist die LAENGE `outcomes`: ein
 * kuerzeres Manifest-Array laesst Sitze ohne Namen, es verschluckt keinen.
 */
import type { StarAttemptResult } from '@/stores/world/galaxyStore'
import type { StarManifest } from '@/types'

export interface FirmamentStarSeat {
  /** Anzeigename. Fehlt, wenn kein freigeschaltetes Tier mehr einen hergab. */
  champion?: string
  lost: boolean
}

export interface FirmamentStarSeats {
  seats: FirmamentStarSeat[]
  /** Was der Deckel abschneidet — die Karte sagt die Zahl statt der Gesichter. */
  hidden: number
}

/**
 * Die Sitze in FLUGREIHENFOLGE, gedeckelt bei `max`.
 *
 * Ohne Manifeste bleibt die Liste LEER: ein Spielstand von vor dem Manifest hat
 * dort nie jemanden gefuehrt, und eine Reihe namenloser Kaesten behauptete
 * etwas anderes.
 */
export function firmamentStarSeats(
  outcomes: readonly StarAttemptResult[] | undefined,
  manifests: readonly StarManifest[] | undefined,
  max: number,
): FirmamentStarSeats {
  if (!outcomes?.length || !manifests?.length) return { seats: [], hidden: 0 }
  return {
    seats: outcomes.slice(0, max).map((outcome, i) => ({
      champion: manifests[i]?.champion,
      lost: outcome === 'failed',
    })),
    hidden: Math.max(0, outcomes.length - max),
  }
}
