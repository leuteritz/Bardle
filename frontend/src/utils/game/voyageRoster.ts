/**
 * Was auf einer Karte liegt, als Zeilen — die EINE Fassung für Detailspalte und
 * Fleet-Brett.
 *
 * ZEITFREI: keine Zeile trägt einen fertigen Countdown, nur Zeitstempel. Sonst
 * hinge die ganze Liste an der Sekunde und würde bei jedem Takt neu gebaut.
 */
import { EXPEDITION_COLORS, MS_PER_SECOND } from '@/config/constants'
import { pinKeyOf } from '@/utils/game/voyageSites'
import type {
  AvailableExpeditionSlot,
  ExpeditionMission,
  VoyageRosterRow,
  VoyageRosterSubject,
} from '@/types'

export interface VoyageRosterDeps {
  /** Die EINE Lohnrechnung, hereingereicht statt nachgebaut. */
  projectedReward: (m: Pick<ExpeditionMission, 'baseReward'>) => { success: number; failure: number }
  /** Besetzte Sitze der Draft-Crew. */
  seatsFilled: (offer: AvailableExpeditionSlot) => number
}

function accentOf(colorKey: string | undefined): string {
  return (EXPEDITION_COLORS.find((c) => c.key === colorKey) ?? EXPEDITION_COLORS[0]).primary
}

/** Rohe Subjekte zu Roster-Eingängen — das Brett hat keine Ankerplätze. */
export function rosterSubjectsOf(
  offers: readonly AvailableExpeditionSlot[],
  missions: readonly ExpeditionMission[],
): VoyageRosterSubject[] {
  return [
    ...offers.map((offer) => ({ pinKey: pinKeyOf(offer), offer, mission: null })),
    ...missions.map((mission) => ({ pinKey: pinKeyOf(mission), offer: null, mission })),
  ]
}

/** Einsammelbar > ausliegend > unterwegs. Drei Eimer statt einer Sortierung —
 *  innerhalb eines Rangs bleibt die Reihenfolge der Marken erhalten. */
export function buildVoyageRoster(
  subjects: readonly VoyageRosterSubject[],
  deps: VoyageRosterDeps,
): VoyageRosterRow[] {
  const ready: VoyageRosterRow[] = []
  const offers: VoyageRosterRow[] = []
  const field: VoyageRosterRow[] = []

  for (const subject of subjects) {
    const offer = subject.offer
    if (offer) {
      const filled = deps.seatsFilled(offer)
      const total = offer.requiredRoles.length
      offers.push({
        pinKey: subject.pinKey,
        name: offer.name,
        icon: offer.icon,
        state: 'offer',
        accent: accentOf(offer.colorKey),
        chipIcon: 'ph:scroll-fill',
        chip: offer.tier,
        reward: deps.projectedReward(offer).success,
        rewardPrefix: '',
        seatsFilled: filled,
        seatsTotal: total,
        expiresAt: offer.availableUntil,
        endsAt: null,
        spanMs: null,
        odds: null,
        crewCount: null,
        ariaLead: `${offer.name}, ${offer.tier} contract, ${filled} of ${total} seats crewed`,
      })
      continue
    }

    const mission = subject.mission
    if (!mission) continue
    const crewCount = mission.assignedChampions.length

    if (mission.status === 'active') {
      const spanMs = Math.max(1, mission.durationSeconds * MS_PER_SECOND)
      field.push({
        pinKey: subject.pinKey,
        name: mission.name,
        icon: mission.icon,
        state: 'field',
        accent: accentOf(mission.colorKey),
        chipIcon: 'game-icons:caravel',
        chip: 'in field',
        reward: null,
        rewardPrefix: '',
        seatsFilled: null,
        seatsTotal: null,
        expiresAt: null,
        endsAt: mission.startTime + spanMs,
        spanMs,
        odds: Math.round(mission.successChance * 100),
        crewCount,
        ariaLead: `${mission.name}, in the field, ${crewCount} crew`,
      })
      continue
    }

    const won = mission.status === 'success'
    ready.push({
      pinKey: subject.pinKey,
      name: mission.name,
      icon: mission.icon,
      state: won ? 'ready' : 'failed',
      accent: accentOf(mission.colorKey),
      chipIcon: won ? 'ph:treasure-chest-fill' : 'ph:warning-fill',
      chip: won ? 'ready' : 'failed',
      reward: mission.reward,
      rewardPrefix: '+',
      seatsFilled: null,
      seatsTotal: null,
      expiresAt: null,
      endsAt: null,
      spanMs: null,
      odds: null,
      crewCount,
      ariaLead: `${mission.name}, ${won ? 'ready to collect' : 'failed, salvage only'}, ${crewCount} crew home`,
    })
  }

  return [...ready, ...offers, ...field]
}
