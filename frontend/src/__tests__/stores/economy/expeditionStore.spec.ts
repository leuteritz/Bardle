import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import {
  EXPEDITION_HAZARD_PENALTY,
  EXPEDITION_ROLE_MATCH_PENALTY,
  EXPEDITION_LEDGER_RANKS,
} from '@/config/constants'
import type { AvailableExpeditionSlot, ExpeditionMission } from '@/types'

/** A contract with no hazards and a threshold the crew exactly meets. */
function makeOffer(over: Partial<AvailableExpeditionSlot> = {}): AvailableExpeditionSlot {
  return {
    id: 'avail-test',
    colorKey: 'gold',
    spawnedAt: Date.now(),
    availableUntil: Date.now() + 300_000,
    tier: 'common',
    name: 'Test Run',
    icon: 'game-icons:journey',
    baseReward: 100,
    durationSeconds: 60,
    requiredRoles: ['mid'],
    minPowerThreshold: 40,
    hazards: [],
    hazardThreshold: 0,
    ...over,
  }
}

function makeMission(over: Partial<ExpeditionMission> = {}): ExpeditionMission {
  return {
    id: 'exp-test',
    configId: 'avail-test',
    name: 'Test Run',
    description: '',
    icon: 'game-icons:journey',
    requiredRoles: ['mid'],
    assignedChampions: [{ name: 'Ahri', role: 'mid' }],
    durationSeconds: 60,
    startTime: Date.now() - 61_000,
    baseReward: 100,
    successChance: 1,
    status: 'success',
    reward: 100,
    colorKey: 'gold',
    tier: 'common',
    hazards: [],
    ...over,
  }
}

describe('expeditionStore — collecting a resolved mission', () => {
  beforeEach(() => setActivePinia(createPinia()))

  // Regression: collectExpedition read `expedition.champions`, a field that has
  // never existed on ExpeditionMission. It threw on EVERY collect, before the
  // mission could be spliced out — so the card stayed put while the chimes above
  // had already been paid, and clicking again paid them a second time.
  it('pays once and removes the mission from the field', () => {
    const exp = useExpeditionStore()
    const game = useGameStore()
    exp.activeExpeditions = [makeMission()]

    const before = game.chimes
    exp.collectExpedition('exp-test')

    expect(game.chimes).toBe(before + 100)
    expect(exp.activeExpeditions).toHaveLength(0)
    expect(exp.completedExpeditions).toHaveLength(1)
  })

  it('grants champion XP to everyone who went', () => {
    const exp = useExpeditionStore()
    const levels = useChampionLevelStore()
    exp.activeExpeditions = [makeMission()]

    const before = levels.progressOf('Ahri').xp
    exp.collectExpedition('exp-test')

    expect(levels.progressOf('Ahri').xp).toBeGreaterThan(before)
  })

  it('hands over the rolled spoils and counts towards the ledger', () => {
    const exp = useExpeditionStore()
    const inventory = useInventoryStore()
    exp.activeExpeditions = [
      makeMission({ spoils: { materials: [{ id: 'stardust', qty: 2 }], meep: 0 } }),
    ]

    exp.collectExpedition('exp-test')

    expect(inventory.collectedMaterials.stardust).toBe(2)
    expect(inventory.sourceTally.stardust).toEqual({ expedition: 2 })
    expect(exp.ledgerCompleted).toBe(1)
  })

  it('ignores a mission that is still running', () => {
    const exp = useExpeditionStore()
    const game = useGameStore()
    exp.activeExpeditions = [makeMission({ status: 'active', reward: 0 })]

    const before = game.chimes
    exp.collectExpedition('exp-test')

    expect(game.chimes).toBe(before)
    expect(exp.activeExpeditions).toHaveLength(1)
  })
})

describe('expeditionStore — success chance breakdown', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('sums to the total the dice use', () => {
    const exp = useExpeditionStore()
    const b = exp.chanceBreakdownFor([{ name: 'Ahri', role: 'mid' }], makeOffer())

    const sum = b.entries.reduce((acc, e) => acc + e.value, b.base)
    expect(b.total).toBeCloseTo(sum, 5)
  })

  it('charges the role-cover penalty when a required role has nobody who plays it', () => {
    const exp = useExpeditionStore()
    // Ahri is a mid — putting her in a top seat leaves top uncovered.
    const b = exp.chanceBreakdownFor(
      [{ name: 'Ahri', role: 'top' }],
      makeOffer({ requiredRoles: ['top'] }),
    )

    const line = b.entries.find((e) => e.id === 'roleMatch')
    expect(line?.value).toBe(-EXPEDITION_ROLE_MATCH_PENALTY)
  })

  it('charges nothing for role cover when the seat is played correctly', () => {
    const exp = useExpeditionStore()
    const b = exp.chanceBreakdownFor([{ name: 'Ahri', role: 'mid' }], makeOffer())

    expect(b.entries.find((e) => e.id === 'roleMatch')).toBeUndefined()
  })

  it('mitigates a stat hazard on a ramp rather than a cliff', () => {
    const exp = useExpeditionStore()
    const crew = [{ name: 'Ahri', role: 'mid' as const }]
    const focus = exp.crewStatOf(['Ahri'], 'focus')

    // Threshold at twice the crew's focus → exactly half the penalty remains.
    const half = exp.chanceBreakdownFor(
      crew,
      makeOffer({ hazards: ['voidStatic'], hazardThreshold: focus * 2 }),
    )
    const met = exp.chanceBreakdownFor(
      crew,
      makeOffer({ hazards: ['voidStatic'], hazardThreshold: focus }),
    )

    const halfLine = half.entries.find((e) => e.id === 'hazard:voidStatic')
    const metLine = met.entries.find((e) => e.id === 'hazard:voidStatic')

    expect(halfLine?.value).toBeCloseTo(-EXPEDITION_HAZARD_PENALTY / 2, 5)
    expect(metLine?.value).toBeCloseTo(0, 5)
  })

  it('answers the kinship hazard only when two of the crew share an origin', () => {
    const exp = useExpeditionStore()
    const offer = makeOffer({
      requiredRoles: ['mid', 'top'],
      hazards: ['ancientSeals'],
      hazardThreshold: 0,
    })

    // Ahri and Yasuo are both Ionia; Ahri and Darius (Noxus) are not.
    const kin = exp.chanceBreakdownFor(
      [
        { name: 'Ahri', role: 'mid' },
        { name: 'Yasuo', role: 'top' },
      ],
      offer,
    )
    const mixed = exp.chanceBreakdownFor(
      [
        { name: 'Ahri', role: 'mid' },
        { name: 'Darius', role: 'top' },
      ],
      offer,
    )

    expect(kin.entries.find((e) => e.id === 'hazard:ancientSeals')?.value).toBeCloseTo(0, 5)
    expect(mixed.entries.find((e) => e.id === 'hazard:ancientSeals')?.value).toBeCloseTo(
      -EXPEDITION_HAZARD_PENALTY,
      5,
    )
  })

  // The whole point of the rework: crew strength reads the champions' own stats
  // instead of a flat figure off the Bard's level, so levelling anyone moves it.
  it('rises when the crew levels up — champion stats are what it reads', () => {
    const exp = useExpeditionStore()
    const levels = useChampionLevelStore()
    const offer = makeOffer({ minPowerThreshold: 200 })

    const before = exp.chanceBreakdownFor([{ name: 'Ahri', role: 'mid' }], offer).total
    levels.ensure('Ahri')!.level = 25
    const after = exp.chanceBreakdownFor([{ name: 'Ahri', role: 'mid' }], offer).total

    expect(after).toBeGreaterThan(before)
  })

  it('clamps into the min/max band', () => {
    const exp = useExpeditionStore()
    const hopeless = exp.chanceBreakdownFor(
      [{ name: 'Ahri', role: 'top' }],
      makeOffer({
        requiredRoles: ['top'],
        minPowerThreshold: 100_000,
        hazards: ['voidStatic', 'sealedVault'],
        hazardThreshold: 100_000,
      }),
    )

    expect(hopeless.total).toBeGreaterThanOrEqual(0.05)
    expect(hopeless.total).toBeLessThanOrEqual(0.95)
  })
})

describe('expeditionStore — ledger', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts at the first rank and widens the operation as it climbs', () => {
    const exp = useExpeditionStore()
    expect(exp.ledgerRank.tier).toBe(1)
    expect(exp.maxActiveExpeditions).toBe(EXPEDITION_LEDGER_RANKS[0].activeSlots)

    const last = EXPEDITION_LEDGER_RANKS[EXPEDITION_LEDGER_RANKS.length - 1]
    exp.ledgerCompleted = last.required
    expect(exp.ledgerRank.tier).toBe(last.tier)
    expect(exp.maxActiveExpeditions).toBe(last.activeSlots)
    expect(exp.maxAvailableOffers).toBe(last.offerSlots)
    expect(exp.nextLedgerRank).toBeNull()
  })

  it('adds its standing bonus to the odds', () => {
    const exp = useExpeditionStore()
    const ranked = EXPEDITION_LEDGER_RANKS.find((r) => r.chanceBonus > 0)!
    exp.ledgerCompleted = ranked.required

    const b = exp.chanceBreakdownFor([{ name: 'Ahri', role: 'mid' }], makeOffer())
    expect(b.entries.find((e) => e.id === 'ledger')?.value).toBe(exp.ledgerRank.chanceBonus)
  })
})

describe('expeditionStore — crew drafting', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('keeps a champion in one seat at a time', () => {
    const exp = useExpeditionStore()
    const offer = makeOffer({ requiredRoles: ['mid', 'top'] })
    exp.availableExpeditions = [offer]

    exp.setCrewMember(offer, 0, 'Ahri')
    exp.setCrewMember(offer, 1, 'Ahri')

    expect(exp.crewFor(offer)).toEqual([null, 'Ahri'])
  })

  it('drops the draft once the contract is sent', () => {
    const exp = useExpeditionStore()
    const offer = makeOffer()
    exp.availableExpeditions = [offer]
    exp.setCrewMember(offer, 0, 'Ahri')

    expect(exp.startExpedition(offer.id, [{ name: 'Ahri', role: 'mid' }])).toBe(true)
    expect(exp.draftCrews[offer.id]).toBeUndefined()
    expect(exp.activeExpeditions).toHaveLength(1)
  })

  it('never offers a champion who is already in the field', () => {
    const exp = useExpeditionStore()
    exp.activeExpeditions = [makeMission({ status: 'active' })]

    expect(exp.eligibleChampions()).not.toContain('Ahri')
  })
})
