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
 * Dieselben Sitze, aber der Deckel wirft VERLORENE zuerst weg — von hinten,
 * und nie den letzten.
 *
 * `starSeats` schneidet vorn ab. Ein Lauf mit drei fruehen Verlusten zeigte
 * damit drei rote Kacheln und versteckte drei gerettete Champions hinter dem
 * „+N" — auf einer Reihe, deren ganze Aussage ist, WEN der Bard hier rausgeholt
 * hat.
 *
 * Der letzte Verlust bleibt aber STEHEN. Im Browser gemessen: eine 7/1-Galaxie
 * auf sechs Plaetzen zeigte sechs goldene Kacheln, waehrend das Datenband
 * darunter `7/1` meldete — die Reihe behauptete einen makellosen Lauf. Ein
 * Beleg, dass hier etwas schiefging, kostet genau eine Kachel.
 *
 * Die Reihenfolge der behaltenen Sitze bleibt die des Fluges: die Chronologie
 * ist ihr Eigenwert.
 */
export function starSeatsFreedFirst(
  outcomes: readonly StarAttemptResult[] | undefined,
  manifests: readonly StarManifest[] | undefined,
  max: number,
): StarSeats {
  if (!outcomes?.length || !manifests?.length) return { seats: [], hidden: 0 }

  const keep = new Set(outcomes.map((_, i) => i))
  let lostLeft = outcomes.filter((o) => o === 'failed').length
  for (let i = outcomes.length - 1; i >= 0 && keep.size > max && lostLeft > 1; i--) {
    if (outcomes[i] === 'failed') {
      keep.delete(i)
      lostLeft--
    }
  }
  // Reicht das nicht, faellt von hinten alles — auch der letzte Verlust.
  for (let i = outcomes.length - 1; i >= 0 && keep.size > max; i--) {
    keep.delete(i)
  }

  return {
    seats: [...keep].sort((a, b) => a - b).map((i) => seatAt(outcomes, manifests, i)),
    hidden: Math.max(0, outcomes.length - keep.size),
  }
}
