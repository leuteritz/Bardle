import { describe, it, expect } from 'vitest'
import { buildVoyageTip, type VoyageTipDeps } from '@/utils/game/voyageTip'
import type { AvailableExpeditionSlot, ExpeditionMission } from '@/types'

/**
 * Der Tooltip liest, was eine Marke trägt. Zwei Zusagen hält diese Spec: die
 * Sicht ist ZEITFREI (Stempel statt Ziffernblatt), und der Lohn ist der von
 * `projectedReward` — eine zweite Rechnung löge, sobald jemand ein Glied der
 * Kette ergänzt.
 */

function slot(over: Partial<AvailableExpeditionSlot> = {}): AvailableExpeditionSlot {
  return {
    id: 'avail-rare-1700000000000-42',
    colorKey: 'gold',
    availableUntil: 1700000300000,
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

function deps(over: Partial<VoyageTipDeps> = {}): VoyageTipDeps {
  return {
    projectedReward: (m) => ({ success: m.baseReward * 2, failure: Math.floor(m.baseReward * 0.1) }),
    seatsOf: () => ['Ahri', null],
    offerOdds: () => 0.71,
    destinationName: (galaxy) => `Theme ${galaxy}`,
    ...over,
  }
}

describe('voyageTip', () => {
  it('liest den Vertrag: Lohn aus projectedReward, Sitze gezählt, Gefahr aufgelöst', () => {
    const view = buildVoyageTip({ pinKey: 'k', offer: slot(), mission: null }, deps())

    expect(view).not.toBeNull()
    expect(view!.state).toBe('offer')
    expect(view!.reward).toBe(1000)
    expect(view!.rewardPrefix).toBe('')
    expect(view!.seatsFilled).toBe(1)
    expect(view!.seatsTotal).toBe(2)
    expect(view!.crew).toEqual(['Ahri'])
    expect(view!.odds).toBe(71)
    expect(view!.destination).toBe('Theme 5')
    expect(view!.hazards).toHaveLength(1)
    expect(view!.hazards[0]).toMatchObject({ id: 'voidStatic', name: 'Void Static' })
    expect(view!.hazards[0].requirement).toBeTruthy()
  })

  it('lässt die Chance offen, solange kein Sitz besetzt ist', () => {
    const view = buildVoyageTip(
      { pinKey: 'k', offer: slot(), mission: null },
      deps({ seatsOf: () => [null, null], offerOdds: () => null }),
    )
    expect(view!.odds).toBeNull()
    expect(view!.seatsFilled).toBe(0)
  })

  it('zeigt bei der laufenden Mission die PROGNOSE und den Endstempel', () => {
    const s = slot()
    const view = buildVoyageTip({ pinKey: 'k', offer: null, mission: missionFrom(s) }, deps())

    expect(view!.state).toBe('field')
    expect(view!.reward).toBe(1000)
    expect(view!.rewardPrefix).toBe('')
    expect(view!.endsAt).toBe(1700000010000 + 120_000)
    expect(view!.spanMs).toBe(120_000)
    expect(view!.expiresAt).toBeNull()
    expect(view!.odds).toBe(62)
    expect(view!.crew).toEqual(['Ahri', 'Ahri'])
  })

  it('zeigt bei der aufgelösten Mission den Betrag, der schon gezahlt ist', () => {
    const s = slot()
    const won = buildVoyageTip(
      { pinKey: 'k', offer: null, mission: missionFrom(s, { status: 'success', reward: 1234 }) },
      deps(),
    )
    expect(won!.state).toBe('ready')
    expect(won!.reward).toBe(1234)
    expect(won!.rewardPrefix).toBe('+')
    expect(won!.endsAt).toBeNull()
    expect(won!.spanMs).toBeNull()

    const lost = buildVoyageTip(
      { pinKey: 'k', offer: null, mission: missionFrom(s, { status: 'failed', reward: 50 }) },
      deps(),
    )
    expect(lost!.state).toBe('failed')
    expect(lost!.stateLabel).toBe('Lost')
  })

  it('ist ZEITFREI — kein `now`, nur Stempel', () => {
    // Zwei Argumente: Subjekt und Abhängigkeiten. Eine Uhr gehört nicht dazu.
    expect(buildVoyageTip.length).toBe(2)

    const offer = slot()
    const view = buildVoyageTip({ pinKey: 'k', offer, mission: null }, deps())
    expect(view!.expiresAt).toBe(offer.availableUntil)
    for (const value of Object.values(view!)) {
      expect(String(value)).not.toMatch(/^\d+:\d\d$/)
    }
  })

  it('gibt null, wo weder Vertrag noch Mission liegt', () => {
    expect(buildVoyageTip({ pinKey: 'k', offer: null, mission: null }, deps())).toBeNull()
  })
})
