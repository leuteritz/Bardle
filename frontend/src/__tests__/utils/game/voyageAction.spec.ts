import { describe, it, expect } from 'vitest'
import { voyageMarkAction, type VoyageActionDeps } from '@/utils/game/voyageAction'
import {
  VOYAGE_ACTION_BLOCK_EXPIRED,
  VOYAGE_ACTION_BLOCK_NO_CREW,
  VOYAGE_ACTION_BLOCK_NO_SLOT,
} from '@/config/constants'
import type { AvailableExpeditionSlot, ExpeditionMission, VoyageRosterSubject } from '@/types'

/**
 * Seit die Detailspalte gefallen ist, IST diese Funktion der Sendeknopf — und
 * zugleich die Ansage der Hover-Karte. Die Zusage der Datei: sie meldet genau
 * dann `send`, wenn `expeditionStore.startExpedition` durchginge. Ein `send`,
 * das dort scheitert, wäre ein Klick ohne Wirkung und ohne Grund.
 */

const NOW = 1700000100000

function slot(over: Partial<AvailableExpeditionSlot> = {}): AvailableExpeditionSlot {
  return {
    id: 'avail-rare-1700000000000-42',
    colorKey: 'gold',
    availableUntil: NOW + 60000,
    spawnedAt: 1700000000000,
    galaxy: 5,
    tier: 'rare',
    name: 'Ancient Ionia Trek',
    icon: 'game-icons:orbital',
    baseReward: 500,
    durationSeconds: 120,
    requiredRoles: ['TOP', 'MID'],
    minPowerThreshold: 200,
    hazards: ['voidStatic'],
    hazardThreshold: 40,
    ...over,
  }
}

function missionFrom(
  s: AvailableExpeditionSlot,
  over: Partial<ExpeditionMission> = {},
): ExpeditionMission {
  return {
    id: `exp-${s.id}-1700000010000`,
    configId: s.id,
    name: s.name,
    description: '',
    icon: s.icon,
    requiredRoles: s.requiredRoles,
    assignedChampions: s.requiredRoles.map((role) => ({ name: 'Ahri', role })),
    durationSeconds: s.durationSeconds,
    startTime: 1700000010000,
    baseReward: s.baseReward,
    successChance: 0.62,
    status: 'active',
    reward: 0,
    colorKey: s.colorKey,
    galaxy: s.galaxy,
    tier: s.tier,
    hazards: [...s.hazards],
    ...over,
  }
}

const offerSubject = (s: AvailableExpeditionSlot): VoyageRosterSubject => ({
  pinKey: s.id,
  offer: s,
  mission: null,
})
const missionSubject = (m: ExpeditionMission): VoyageRosterSubject => ({
  pinKey: m.configId,
  offer: null,
  mission: m,
})

function deps(over: Partial<VoyageActionDeps> = {}): VoyageActionDeps {
  return {
    crewFor: () => ['Ahri', 'Garen'],
    canStart: true,
    offersWait: false,
    now: NOW,
    ...over,
  }
}

describe('voyageMarkAction', () => {
  it('schickt einen vollbesetzten Vertrag los', () => {
    const s = slot()
    const a = voyageMarkAction(offerSubject(s), deps())
    expect(a).toEqual({ kind: 'send', offerId: s.id, crew: ['Ahri', 'Garen'] })
  })

  it('sperrt, solange kein Missionsplatz frei ist', () => {
    const a = voyageMarkAction(offerSubject(slot()), deps({ canStart: false }))
    expect(a).toEqual({ kind: 'blocked', reason: VOYAGE_ACTION_BLOCK_NO_SLOT })
  })

  it('sperrt bei unbesetztem Sitz', () => {
    const a = voyageMarkAction(offerSubject(slot()), deps({ crewFor: () => ['Ahri', null] }))
    expect(a).toEqual({ kind: 'blocked', reason: VOYAGE_ACTION_BLOCK_NO_CREW })
  })

  it('sperrt einen abgelaufenen Vertrag', () => {
    const s = slot({ availableUntil: NOW - 1 })
    expect(voyageMarkAction(offerSubject(s), deps())).toEqual({
      kind: 'blocked',
      reason: VOYAGE_ACTION_BLOCK_EXPIRED,
    })
  })

  it('haelt einen abgelaufenen Vertrag offen, solange die Konstellation steht', () => {
    // Cartographer's Pact — dieselbe Ausnahme wie in `startExpedition`.
    const s = slot({ availableUntil: NOW - 1 })
    expect(voyageMarkAction(offerSubject(s), deps({ offersWait: true }))).toMatchObject({
      kind: 'send',
    })
  })

  it('meldet die laufende Mission als wartend, mit ihrem Endstempel', () => {
    const m = missionFrom(slot())
    expect(voyageMarkAction(missionSubject(m), deps())).toEqual({
      kind: 'waiting',
      endsAt: m.startTime + m.durationSeconds * 1000,
    })
  })

  it('laesst die zurueckgekehrte Mission einsammeln — Erfolg wie Verlust', () => {
    const s = slot()
    const won = missionFrom(s, { status: 'success', reward: 2720 })
    expect(voyageMarkAction(missionSubject(won), deps())).toEqual({
      kind: 'collect',
      missionId: won.id,
      reward: 2720,
      success: true,
    })

    const lost = missionFrom(s, { status: 'failure', reward: 320 })
    expect(voyageMarkAction(missionSubject(lost), deps())).toMatchObject({
      kind: 'collect',
      success: false,
    })
  })

  it('nennt den Slot-Deckel VOR der Crew — dieselbe Reihenfolge wie der Store', () => {
    // Beides falsch: der Spieler soll den Grund lesen, den er zuerst beheben
    // muss. `startExpedition` prueft den Deckel als Erstes.
    const a = voyageMarkAction(
      offerSubject(slot()),
      deps({ canStart: false, crewFor: () => [null, null] }),
    )
    expect(a).toEqual({ kind: 'blocked', reason: VOYAGE_ACTION_BLOCK_NO_SLOT })
  })
})
