/**
 * Das Fleet-Band: eine Karte je EXPEDITION, nach Dringlichkeit geordnet.
 *
 * Eine Abbildung, keine Composable — sie braucht weder Refs noch Uhr. Und sie
 * kennt `now` NICHT: nach Ablaufzeit zu sortieren hiesse, das Band ordnet sich
 * jede Sekunde unter dem Zeiger um. Dringlichkeit trägt die Karte, nicht der Platz.
 */
import {
  buildVoyageRoster,
  rosterSubjectsOf,
  type VoyageRosterDeps,
} from '@/utils/game/voyageRoster'
import type {
  AvailableExpeditionSlot,
  ExpeditionMission,
  VoyageFleetCard,
  VoyageGalaxyState,
  VoyageRailRow,
} from '@/types'

/** Einsammelbar > ausliegend > unterwegs > still — ein Rang, eine Farbe.
 *  Zweiter Verbraucher neben dem Band: die Galaxienleiste. */
export function voyageGalaxyState(row: VoyageRailRow): VoyageGalaxyState {
  if (row.ready > 0) return 'ready'
  if (row.contracts > 0) return 'offer'
  if (row.inField > 0) return 'field'
  return 'quiet'
}

export interface VoyageFleetDeps {
  /** Die EINE Lohnrechnung, hereingereicht statt nachgebaut. */
  projectedReward: VoyageRosterDeps['projectedReward']
  /** Die Draft-Crew eines Vertrags, `null` je leerem Sitz. */
  seatsOf: (offer: AvailableExpeditionSlot) => (string | null)[]
  /** Chance 0..1 der Draft-Crew; `null` ohne besetzten Sitz. */
  offerOdds: VoyageRosterDeps['offerOdds']
  /** Ist überhaupt noch ein aktiver Slot frei? Gilt für ALLE Karten gleich. */
  canSend: boolean
}

/**
 * Was zuerst gesehen werden will: einsammeln > unterwegs > startbar > unbemannt.
 *
 * „Startbar" steht bewusst HINTER den laufenden Missionen, obwohl es eine Geste
 * verlangt und die laufende nur Geduld: `crewFor` bemannt jeden Vertrag
 * automatisch vor, also ist praktisch JEDER Vertrag startbar. Als Rang trägt das
 * keine Auskunft — es schöbe nur die Crews, die wirklich draussen sind, hinter
 * bis zu zehn Angebote. Startbereitschaft trägt deshalb die Kante der Karte,
 * nicht ihr Platz.
 */
const RANK = { ready: 0, failed: 0, field: 1, sendable: 2, offer: 3 } as const

function rankOf(card: Pick<VoyageFleetCard, 'row' | 'sendable'>): number {
  if (card.row.state === 'offer') return card.sendable ? RANK.sendable : RANK.offer
  return RANK[card.row.state]
}

/**
 * Eine Karte je Vertrag und je Mission, über ALLE Galaxien.
 *
 * `buildVoyageRoster` liefert die Zeile — dieselbe, die die Detailspalte zeigt;
 * hier kommt nur dazu, was eine Zeile nicht trägt: die Galaxie, an der sie hängt,
 * und die Crew, die auf ihr sitzt.
 */
export function buildVoyageFleetCards(
  rows: readonly VoyageRailRow[],
  offers: readonly AvailableExpeditionSlot[],
  missions: readonly ExpeditionMission[],
  deps: VoyageFleetDeps,
): VoyageFleetCard[] {
  const rowOf = new Map<number, VoyageRailRow>()
  for (const row of rows) rowOf.set(row.galaxy, row)

  // `seatsFilled` wird ABGELEITET, damit die Sitzliste die eine Quelle bleibt.
  const rosterDeps: VoyageRosterDeps = {
    projectedReward: deps.projectedReward,
    seatsFilled: (offer) => deps.seatsOf(offer).filter(Boolean).length,
    offerOdds: deps.offerOdds,
  }

  const offerOf = new Map<string, AvailableExpeditionSlot>()
  const missionOf = new Map<string, ExpeditionMission>()
  const galaxyOf = new Map<string, number>()

  const subjects = rosterSubjectsOf(offers, missions).filter((subject) => {
    // Alte Spielstände tragen `galaxy` auf der Mission nicht, und eine Galaxie
    // ohne Leistenzeile hat keinen Namen und keinen Akzent.
    const galaxy = subject.offer ? subject.offer.galaxy : subject.mission?.galaxy
    if (galaxy == null || !rowOf.has(galaxy)) return false
    galaxyOf.set(subject.pinKey, galaxy)
    if (subject.offer) offerOf.set(subject.pinKey, subject.offer)
    if (subject.mission) missionOf.set(subject.pinKey, subject.mission)
    return true
  })

  const cards: VoyageFleetCard[] = []
  for (const row of buildVoyageRoster(subjects, rosterDeps)) {
    const galaxy = galaxyOf.get(row.pinKey)
    const rail = galaxy == null ? undefined : rowOf.get(galaxy)
    if (galaxy == null || !rail) continue
    const offer = offerOf.get(row.pinKey)
    const seats = offer ? deps.seatsOf(offer) : []
    const sendable = !!offer && seats.length > 0 && seats.every(Boolean)
    cards.push({
      pinKey: row.pinKey,
      galaxy,
      galaxyName: rail.name,
      accent: rail.accent,
      tier: rail.tier,
      sendable,
      // `sendable` bleibt der Rang; blockiert ist eine ANSICHT davon. Kippte der
      // Rang mit dem Feldstand, ordnete sich das Band um, sobald jemand die
      // letzte Crew losschickt.
      blocked: sendable && !deps.canSend,
      row,
      crew: missionOf.get(row.pinKey)?.assignedChampions ?? [],
      seats,
    })
  }

  // Zweit- und Drittschlüssel ausdrücklich, statt sich auf die Sortierstabilität
  // zu verlassen: dieselbe Eingabe muss dieselbe Reihenfolge geben.
  cards.sort(
    (a, b) =>
      rankOf(a) - rankOf(b) ||
      b.galaxy - a.galaxy ||
      (a.pinKey < b.pinKey ? -1 : a.pinKey > b.pinKey ? 1 : 0),
  )
  return cards
}
