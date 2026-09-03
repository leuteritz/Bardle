/**
 * Wer in einer Galaxie geflogen ist — die Sitze ihrer Knotenkarte und der
 * Manifestreihe im Voyages-Atlas.
 *
 * Die Paarung selbst ist der ganze Inhalt: `attemptResults[i]` sagt, wie der
 * Versuch ausging, `starManifests[i]` sagt, wer ihn flog. Die Index-Gleichheit
 * ist der Vertrag des Manifests (`starManifest.spec.ts`) — hier wird sie
 * gelesen, nicht neu hergestellt. Deshalb ist die LAENGE `outcomes`: ein
 * kuerzeres Manifest-Array laesst Sitze ohne Namen, es verschluckt keinen.
 *
 * Kein `firmament`-Praefix mehr: seit die Manifestreihe des Voyages-Atlas
 * dieselbe Quelle liest, waere er eine Kopplung, die niemand sucht.
 */
import type { StarAttemptResult } from '@/stores/world/galaxyStore'
import type { ChampionRole, StarManifest } from '@/types'

export interface StarSeat {
  /** Anzeigename. Fehlt, wenn kein freigeschaltetes Tier mehr einen hergab. */
  champion?: string
  /** Faerbt Sternkern und Rollenwort — `starCoreTint`, nie das rohe ROLE_COLORS. */
  role?: ChampionRole
  /** Platz im FLUG, nicht in der gedeckelten Liste. Wer deckelt, verschiebt die
   *  Liste; „der dritte Stern" meint trotzdem weiter den dritten. */
  index: number
  lost: boolean
}

export interface StarSeats {
  seats: StarSeat[]
  /** Was der Deckel abschneidet — die Karte sagt die Zahl statt der Gesichter. */
  hidden: number
}

function seatAt(
  outcomes: readonly StarAttemptResult[],
  manifests: readonly StarManifest[],
  i: number,
): StarSeat {
  return {
    champion: manifests[i]?.champion,
    role: manifests[i]?.role,
    index: i,
    lost: outcomes[i] === 'failed',
  }
}

/**
 * Die Sitze in FLUGREIHENFOLGE, gedeckelt bei `max`.
 *
 * Ohne Manifeste bleibt die Liste LEER: ein Spielstand von vor dem Manifest hat
 * dort nie jemanden gefuehrt, und eine Reihe namenloser Kaesten behauptete
 * etwas anderes.
 */
export function starSeats(
  outcomes: readonly StarAttemptResult[] | undefined,
  manifests: readonly StarManifest[] | undefined,
  max: number,
): StarSeats {
  if (!outcomes?.length || !manifests?.length) return { seats: [], hidden: 0 }
  return {
    seats: outcomes.slice(0, max).map((_, i) => seatAt(outcomes, manifests, i)),
    hidden: Math.max(0, outcomes.length - max),
  }
}

/**
 * Dieselben Sitze, nach dem AUSGANG getrennt — die zwei Baender der
 * Manifestreihe im Voyages-Atlas.
 *
 * Ein gemeinsamer Deckel ueber beide Gruppen hat hier einmal die Geretteten
 * hinter das „+N" geschoben; getrennte Baender haben getrennte Deckel, und die
 * Frage stellt sich nicht mehr. Die Reihenfolge innerhalb einer Gruppe bleibt
 * die des Fluges: die Chronologie ist ihr Eigenwert.
 */
export function starSeatsSplit(
  outcomes: readonly StarAttemptResult[] | undefined,
  manifests: readonly StarManifest[] | undefined,
  maxFreed: number,
  maxLost: number = maxFreed,
): { freed: StarSeats; lost: StarSeats } {
  const empty = (): StarSeats => ({ seats: [], hidden: 0 })
  if (!outcomes?.length || !manifests?.length) return { freed: empty(), lost: empty() }

  const all = outcomes.map((_, i) => seatAt(outcomes, manifests, i))
  const cap = (group: StarSeat[], max: number): StarSeats => ({
    seats: group.slice(0, max),
    hidden: Math.max(0, group.length - max),
  })
  return {
    freed: cap(
      all.filter((s) => !s.lost),
      maxFreed,
    ),
    lost: cap(
      all.filter((s) => s.lost),
      maxLost,
    ),
  }
}
