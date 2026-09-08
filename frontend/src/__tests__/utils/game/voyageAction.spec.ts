import { describe, it, expect } from 'vitest'
import {
  isVoyageCardArmed,
  voyageGestureLabel,
  voyageMarkAction,
  type VoyageActionDeps,
} from '@/utils/game/voyageAction'
import {
  VOYAGE_ACTION_BLOCK_EXPIRED,
  VOYAGE_ACTION_BLOCK_NO_CREW,
  VOYAGE_ACTION_BLOCK_NO_SLOT,
  VOYAGE_ACTION_COLLECT_LABEL,
  VOYAGE_ACTION_SEND_LABEL,
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

/**
 * Der zweite Klick auf eine Fleet-Karte. Die Bedingung steht neben der Regel,
 * die er ausfuehrt — sonst gaebe es zwei Stellen, an denen entschieden wird,
 * was ein Klick tut.
 */
describe('isVoyageCardArmed', () => {
  it('ist scharf, sobald die Karte die gewaehlte Marke IST', () => {
    expect(isVoyageCardArmed(3, 'a', 3, 'a')).toBe(true)
  })

  it('springt beim ersten Klick — andere Marke, dieselbe Galaxie', () => {
    expect(isVoyageCardArmed(3, 'b', 3, 'a')).toBe(false)
  })

  /**
   * Die Galaxiepruefung ist nicht doppelt gemoppelt: `runMarkAction` sucht in
   * den Marken der GEWAEHLTEN Galaxie, und die Auswahl kann der Marke einen
   * Zug hinterherhinken.
   */
  it('entwaffnet, solange eine andere Galaxie auf der Buehne steht', () => {
    expect(isVoyageCardArmed(4, 'a', 3, 'a')).toBe(false)
  })

  it('ist ohne Marke nie scharf', () => {
    expect(isVoyageCardArmed(3, null, 3, null)).toBe(false)
  })
})

/**
 * Marke und Fleet-Karte haengen dieselbe Nachschrift an ihren Namen. Zweimal
 * ausgeschrieben liefen sie auseinander, sobald ein Ausgang dazukaeme — und
 * zwar lautlos, weil sie nur in der Vorlesung steht.
 */
describe('voyageGestureLabel', () => {
  it('spricht die Sprache der Aktionslabels', () => {
    expect(voyageGestureLabel({ kind: 'send', offerId: 'a', crew: ['Ahri'] })).toBe(
      ` — ${VOYAGE_ACTION_SEND_LABEL.toLowerCase()}`,
    )
    expect(
      voyageGestureLabel({ kind: 'collect', missionId: 'm', reward: 1, success: true }),
    ).toBe(` — ${VOYAGE_ACTION_COLLECT_LABEL.toLowerCase()}`)
  })

  it('nennt bei einer Sperre den GRUND, nicht die Geste', () => {
    expect(voyageGestureLabel({ kind: 'blocked', reason: VOYAGE_ACTION_BLOCK_NO_SLOT })).toBe(
      ` — ${VOYAGE_ACTION_BLOCK_NO_SLOT}`,
    )
  })

  it('schweigt, wo nichts zu tun ist', () => {
    expect(voyageGestureLabel({ kind: 'waiting', endsAt: 1 })).toBe('')
    expect(voyageGestureLabel(null)).toBe('')
  })
})
