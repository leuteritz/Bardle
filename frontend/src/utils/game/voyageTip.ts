/**
 * Was der Hover-Tooltip einer Marke zeigt — die EINE Fassung für Hafen, Tor-Umfeld
 * und Fleet-Karte.
 *
 * ZEITFREI wie `voyageRoster.ts`: nur Stempel, kein fertiger Countdown. Und der
 * Lohn kommt als `deps.projectedReward` herein — eine zweite Rechnung löge,
 * sobald jemand ein Glied der Kette ergänzt.
 */
import {
  EXPEDITION_COLORS,
  EXPEDITION_HAZARD_BY_ID,
  EXPEDITION_SPOILS,
  MS_PER_SECOND,
  type ExpeditionTier,
} from '@/config/constants'
import type {
  AvailableExpeditionSlot,
  ExpeditionMission,
  VoyageRosterState,
  VoyageRosterSubject,
  VoyageTipView,
  VoyageTrackHazard,
} from '@/types'

export interface VoyageTipDeps {
  /** Die EINE Lohnrechnung, hereingereicht statt nachgebaut. */
  projectedReward: (m: Pick<ExpeditionMission, 'baseReward'>) => {
    success: number
    failure: number
  }
  /** Die Draft-Crew eines Vertrags, `null` je leerem Sitz. */
  seatsOf: (offer: AvailableExpeditionSlot) => (string | null)[]
  /** Erfolgschance 0..1 der Draft-Crew, `null` solange kein Sitz besetzt ist. */
  offerOdds: (offer: AvailableExpeditionSlot) => number | null
  destinationName: (galaxy: number) => string
}

/** Dieselben Glyphen, die `buildVoyageRoster` der Zeile gibt. */
const STATE_ICON: Record<VoyageRosterState, string> = {
  offer: 'ph:scroll-fill',
  field: 'game-icons:caravel',
  ready: 'ph:treasure-chest-fill',
  failed: 'ph:warning-fill',
}

function accentOf(colorKey: string | undefined): string {
  return (EXPEDITION_COLORS.find((c) => c.key === colorKey) ?? EXPEDITION_COLORS[0]).primary
}

function hazardsOf(ids: readonly string[] | undefined): VoyageTrackHazard[] {
  return (ids ?? [])
    .map((id) => EXPEDITION_HAZARD_BY_ID[id as keyof typeof EXPEDITION_HAZARD_BY_ID])
    .filter(Boolean)
    .map((def) => ({
      id: def.id,
      name: def.name,
      icon: def.icon,
      requirement: def.requirement,
    }))
}

export function buildVoyageTip(
  subject: VoyageRosterSubject,
  deps: VoyageTipDeps,
): VoyageTipView | null {
  const offer = subject.offer
  if (offer) {
    const seats = deps.seatsOf(offer)
    const odds = deps.offerOdds(offer)
    return {
      pinKey: subject.pinKey,
      name: offer.name,
      icon: offer.icon,
      accent: accentOf(offer.colorKey),
      state: 'offer',
      stateLabel: `${offer.tier} contract`,
      stateIcon: STATE_ICON.offer,
      destination: deps.destinationName(offer.galaxy),
      tier: offer.tier,
      expiresAt: offer.availableUntil,
      endsAt: null,
      spanMs: null,
      durationSeconds: offer.durationSeconds,
      odds: odds === null ? null : Math.round(odds * 100),
      reward: deps.projectedReward(offer).success,
      rewardPrefix: '',
      spoils: EXPEDITION_SPOILS[offer.tier],
      payout: null,
      hazards: hazardsOf(offer.hazards),
      seatsFilled: seats.filter(Boolean).length,
      seatsTotal: offer.requiredRoles.length,
      crew: seats.filter((n): n is string => !!n),
    }
  }

  const mission = subject.mission
  if (!mission) return null

  const tier: ExpeditionTier = mission.tier ?? 'common'
  const running = mission.status === 'active'
  const won = mission.status === 'success'
  const state: VoyageRosterState = running ? 'field' : won ? 'ready' : 'failed'
  const spanMs = Math.max(1, mission.durationSeconds * MS_PER_SECOND)

  return {
    pinKey: subject.pinKey,
    name: mission.name,
    icon: mission.icon,
    accent: accentOf(mission.colorKey),
    state,
    stateLabel: running ? 'In the field' : won ? 'Returned' : 'Lost',
    stateIcon: STATE_ICON[state],
    destination: deps.destinationName(mission.galaxy ?? 1),
    tier,
    expiresAt: null,
    endsAt: running ? mission.startTime + spanMs : null,
    spanMs: running ? spanMs : null,
    durationSeconds: mission.durationSeconds,
    odds: Math.round(mission.successChance * 100),
    // Die laufende Mission zeigt die PROGNOSE, die aufgeloeste den Betrag, der
    // schon auf dem Konto liegt.
    reward: running ? deps.projectedReward(mission).success : mission.reward,
    rewardPrefix: running ? '' : '+',
    spoils: EXPEDITION_SPOILS[tier],
    // Gewuerfelt wird erst bei der Aufloesung; solange laeuft, gilt die Erwartung.
    payout: running ? null : (mission.spoils ?? null),
    hazards: hazardsOf(mission.hazards),
    seatsFilled: null,
    seatsTotal: null,
    crew: mission.assignedChampions.map((c) => c.name),
  }
}
