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
  VOYAGE_ACTION_COLLECT_LABEL,
  VOYAGE_ACTION_SEND_LABEL,
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
  now: number
}

/**
 * Was die Vorlesung an den Namen haengt. Marke und Fleet-Karte tragen dieselbe
 * Geste, also auch dasselbe Wort — zweimal ausgeschrieben liefen sie
 * auseinander, sobald ein Ausgang dazukaeme.
 */
export function voyageGestureLabel(action: VoyageMarkAction | null | undefined): string {
  if (!action) return ''
  if (action.kind === 'send') return ` — ${VOYAGE_ACTION_SEND_LABEL.toLowerCase()}`
  if (action.kind === 'collect') return ` — ${VOYAGE_ACTION_COLLECT_LABEL.toLowerCase()}`
  return action.kind === 'blocked' ? ` — ${action.reason}` : ''
}

/**
 * Wann die Fleet-Karte HANDELT statt nur zu springen.
 *
 * Sie steht hier, nicht in der Komponente: wer diese Bedingung nachbaut, baut
 * die zweite Stelle, an der entschieden wird, was ein Klick tut.
 *
 * Beide Haelften sind noetig. Der `pinKey` allein genuegte nicht — er ist ueber
 * alle Galaxien eindeutig, aber `runMarkAction` sucht in den Marken der
 * GEWAEHLTEN Galaxie; ohne die Galaxiepruefung liefe der Klick ins Leere,
 * sobald die Auswahl noch nachzieht.
 */
export function isVoyageCardArmed(
  galaxy: number,
  pinKey: string | null,
  selectedGalaxy: number,
  selectedKey: string | null,
): boolean {
  return pinKey !== null && pinKey === selectedKey && galaxy === selectedGalaxy
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
  if (offer.availableUntil < deps.now) {
    return { kind: 'blocked', reason: VOYAGE_ACTION_BLOCK_EXPIRED }
  }

  const crew = deps.crewFor(offer)
  if (crew.length !== offer.requiredRoles.length || crew.some((c) => !c)) {
    return { kind: 'blocked', reason: VOYAGE_ACTION_BLOCK_NO_CREW }
  }

  return { kind: 'send', offerId: offer.id, crew: crew as string[] }
}
