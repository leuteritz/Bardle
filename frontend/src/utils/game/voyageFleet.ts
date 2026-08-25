/**
 * Der Fleet-Streifen: jede Galaxie, die gerade etwas trägt, nach Rang geordnet.
 *
 * Eine Abbildung, keine Composable — sie braucht weder Refs noch Uhr. Und sie
 * kennt `now` NICHT: nach Ablaufzeit zu sortieren hiesse, der Streifen ordnet sich
 * jede Sekunde unter dem Zeiger um. Dringlichkeit trägt die Zeile, nicht der Platz.
 */
import { buildVoyageRoster, rosterSubjectsOf, type VoyageRosterDeps } from '@/utils/game/voyageRoster'
import type {
  AvailableExpeditionSlot,
  ExpeditionMission,
  VoyageFleetCard,
  VoyageGalaxyState,
  VoyageRailRow,
} from '@/types'

/** Einsammelbar > ausliegend > unterwegs > still — ein Rang, eine Farbe. */
export function voyageGalaxyState(row: VoyageRailRow): VoyageGalaxyState {
  if (row.ready > 0) return 'ready'
  if (row.contracts > 0) return 'offer'
  if (row.inField > 0) return 'field'
  return 'quiet'
}

const RANK: Record<VoyageGalaxyState, number> = { ready: 0, offer: 1, field: 2, quiet: 3 }

interface GalaxyBucket {
  offers: AvailableExpeditionSlot[]
  missions: ExpeditionMission[]
}

/** Stille Galaxien erscheinen NICHT — sie tragen nichts, und die Leiste links
 *  listet sie ohnehin. */
export function buildVoyageFleet(
  rows: readonly VoyageRailRow[],
  offers: readonly AvailableExpeditionSlot[],
  missions: readonly ExpeditionMission[],
  deps: VoyageRosterDeps,
): VoyageFleetCard[] {
  // Eine Passage über beide Listen statt eines Filters je Galaxie.
  const byGalaxy = new Map<number, GalaxyBucket>()
  const bucket = (galaxy: number): GalaxyBucket => {
    let found = byGalaxy.get(galaxy)
    if (!found) {
      found = { offers: [], missions: [] }
      byGalaxy.set(galaxy, found)
    }
    return found
  }
  for (const offer of offers) bucket(offer.galaxy).offers.push(offer)
  for (const mission of missions) {
    if (mission.galaxy != null) bucket(mission.galaxy).missions.push(mission)
  }

  const cards: VoyageFleetCard[] = []

  for (const row of rows) {
    const state = voyageGalaxyState(row)
    if (state === 'quiet') continue
    const here = byGalaxy.get(row.galaxy) ?? { offers: [], missions: [] }
    cards.push({
      galaxy: row.galaxy,
      row,
      state,
      roster: buildVoyageRoster(rosterSubjectsOf(here.offers, here.missions), deps),
    })
  }

  // Zweitschlüssel ausdrücklich, statt sich auf die Sortierstabilität zu verlassen.
  cards.sort((a, b) => RANK[a.state] - RANK[b.state] || b.galaxy - a.galaxy)
  return cards
}
