/**
 * Was ein Klick auf eine Marke tut — die EINE Regel für Karte und Hover-Karte.
 *
 * ZEITFREI im selben Sinn wie `voyageTip.ts`: sie liefert Stempel, kein
 * fertiges Ziffernblatt. Die Wachen spiegeln `expeditionStore.startExpedition`
 * in derselben Reihenfolge — ein `send`, das dort scheitert, wäre ein Klick
 * ohne Wirkung und ohne Grund.
 */
import {
  VOYAGE_ACTION_BLOCK_EXPIRED,
  VOYAGE_ACTION_BLOCK_NO_CREW,
  VOYAGE_ACTION_BLOCK_NO_SLOT,
  MS_PER_SECOND,
} from '@/config/constants'
import type { AvailableExpeditionSlot, VoyageMarkAction, VoyageRosterSubject } from '@/types'

export interface VoyageActionDeps {
  /** Die Draft- bzw. Auto-Crew eines Vertrags, `null` je leerem Sitz. */
  crewFor: (offer: AvailableExpeditionSlot) => (string | null)[]
  /** Ist noch ein Missionsplatz frei? */
  canStart: boolean
  /** Cartographer's Pact: dann ist das Zeitfenster kein Tor mehr. */
  offersWait: boolean
  now: number
}

export function voyageMarkAction(
  subject: VoyageRosterSubject,
  deps: VoyageActionDeps,
): VoyageMarkAction {
  const mission = subject.mission
  if (mission) {
    if (mission.status !== 'active') {
      return {
        kind: 'collect',
        missionId: mission.id,
        reward: mission.reward,
        success: mission.status === 'success',
      }
    }
    return { kind: 'waiting', endsAt: mission.startTime + mission.durationSeconds * MS_PER_SECOND }
  }

  const offer = subject.offer
  if (!offer) return { kind: 'blocked', reason: VOYAGE_ACTION_BLOCK_EXPIRED }

  if (!deps.canStart) return { kind: 'blocked', reason: VOYAGE_ACTION_BLOCK_NO_SLOT }
  if (!deps.offersWait && offer.availableUntil < deps.now) {
    return { kind: 'blocked', reason: VOYAGE_ACTION_BLOCK_EXPIRED }
  }

  const crew = deps.crewFor(offer)
  if (crew.length !== offer.requiredRoles.length || crew.some((c) => !c)) {
    return { kind: 'blocked', reason: VOYAGE_ACTION_BLOCK_NO_CREW }
  }

  return { kind: 'send', offerId: offer.id, crew: crew as string[] }
}
