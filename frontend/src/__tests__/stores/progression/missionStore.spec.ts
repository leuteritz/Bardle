import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useMissionStore } from '@/stores/progression/missionStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import {
  MISSIONS,
  MISSION_COUNT,
  MISSION_INDEX,
  MISSION_CHAPTER_STARTS,
  getMission,
} from '@/config/progression/missions'
import { MISSION_CHIME_REWARD_CAP_SEC } from '@/config/constants'
import { useHerald } from '@/composables/ui/useHerald'
import { progressMetricValue } from '@/utils/game/progressMetrics'
import type { MissionDef, ProgressMetricId } from '@/types'

/** Die Mission zu einer ID — schlägt laut fehl, wenn eine umbenannt wurde. */
function mission(id: string): MissionDef {
  const found = getMission(id)
  expect(found, `mission "${id}" missing from MISSIONS`).toBeDefined()
  return found!
}

/**
 * Setzt eine Metrik auf einen Wert. EINE Stelle je Metrik, als Gegenstück zum
 * `switch` in `utils/game/progressMetrics.ts`: laufen Katalog und Auflösung
 * auseinander, fällt es hier auf und nicht erst im Spiel.
 */
function setMetric(metric: ProgressMetricId, value: number) {
  switch (metric) {
    case 'chimesEarned':
      useGameStore().totalChimesEarned = value
      break
    case 'clicks':
      useGameStore().totalClicks = value
      break
    case 'meepsEarned':
      useGameStore().totalMeepsEarned = value
      break
    case 'materialsCollected':
      useInventoryStore().totalMaterialsCollected = value
      break
    case 'solarRayLevels': {
      useSolarUpgradeStore().chimesPerSecondLevel = value
      break
    }
    case 'bardLevel':
      useGameStore().level = value
      break
    case 'abilityCasts':
      useBardAbilityStore().totalCasts = value
      break
    case 'prestiges':
      useGameStore().totalPrestiges = value
      break
    case 'meepNodesBought':
      useMeepTreeStore().bought = Array.from({ length: value }, (_, i) => `node_${i}`)
      break
    case 'starsRescued':
      useGalaxyStore().totalStarsRescued = value
      break
    case 'galaxiesFreed':
      useGalaxyStore().totalGalaxyBossesDefeated = value
      break
    case 'planetsCleared':
      useStarGroupStore().totalPlanetsCleared = value
      break
    case 'driftersCollected':
      useDrifterStore().totalDriftersCollected = value
      break
    case 'riftsSealed':
      useVoidStore().totalRiftsSealed = value
      break
    case 'planetSlotsOwned': {
      const shop = usePlanetShopStore()
      shop.slots.forEach((s, i) => (s.purchased = i < value))
      break
    }
    case 'planetLevels': {
      // Nur den ersten Slot anfassen, `purchased` der übrigen NICHT
      // zurücksetzen: sonst nähme diese Metrik `planetSlotsOwned` wieder weg,
      // und ein Durchlauf über den ganzen Katalog bliebe irgendwo hängen.
      const shop = usePlanetShopStore()
      shop.slots[0].purchased = true
      shop.slots[0].level = value
      break
    }
    case 'bossesDefeated':
      usePlanetBossStore().totalBossesDefeated = value
      break
    case 'starPhase':
      useSolarUpgradeStore().starPhase = value
      break
    case 'forgeLevels':
      useStarForgeStore().branchLevels = { seed: value }
      break
    case 'championsRecruited':
      useBattleStore().ownedChampions = Array.from({ length: value }, (_, i) => `Champ${i}`)
      break
    case 'championLevelsGained':
      useChampionLevelStore().totalLevelsBought = value
      break
    case 'teamSlotsFilled':
      useBattleStore().headerSlots = [null, null, null, null, null].map((_, i) =>
        i < value ? `Champ${i}` : null,
      )
      break
    case 'battleWins':
      useBattleStore().totalWins = value
      break
    case 'championKills':
      useBattleStore().totalKills = value
      break
    case 'expeditionsCompleted':
      useExpeditionStore().totalExpeditionsSucceeded = value
      break
  }
}

/** Bringt die Leiter auf diese Stufe und erfüllt ihre Metrik — ohne Takt. */
function arm(id: string) {
  const def = mission(id)
  useMissionStore().index = MISSION_INDEX[id]
  setMetric(def.metric, def.target)
}

/** Dasselbe, und der Takt löst sie ein. */
function fulfil(id: string) {
  arm(id)
  useMissionStore().tick()
}

describe('missionStore — the running rung', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useHerald().reset()
  })

  it('starts on the first mission of the ladder', () => {
    const store = useMissionStore()
    expect(store.index).toBe(0)
    expect(store.activeView?.id).toBe(MISSIONS[0].id)
    expect(store.activeView?.ratio).toBe(0)
  })

  it('leaves an unmet rung alone', () => {
    const store = useMissionStore()
    setMetric('clicks', mission('firstTouch').target - 1)
    store.tick()
    expect(store.index).toBe(0)
    expect(store.totalMissionsClaimed).toBe(0)
    expect(store.activeView?.ratio).toBeLessThan(1)
  })

  it('claims the moment the target is met', () => {
    const store = useMissionStore()
    fulfil('firstTouch')
    expect(store.index).toBe(1)
    expect(store.totalMissionsClaimed).toBe(1)
    expect(store.lastClaimed.defId).toBe('firstTouch')
  })

  it('caps the shown progress at the target', () => {
    const store = useMissionStore()
    setMetric('clicks', mission('firstTouch').target * 10)
    expect(store.activeView?.progress).toBe(mission('firstTouch').target)
    expect(store.activeView?.ratio).toBe(1)
  })

  it('does not pay the same rung twice', () => {
    const store = useMissionStore()
    const game = useGameStore()
    fulfil('firstTouch')
    const after = game.chimes
    store.tick()
    expect(game.chimes).toBe(after)
    expect(store.totalMissionsClaimed).toBe(1)
  })

  it('stamps the claim and raises the sequence', () => {
    const store = useMissionStore()
    fulfil('firstTouch')
    expect(store.lastClaimed.seq).toBe(1)
    fulfil('firstLight')
    expect(store.lastClaimed.seq).toBe(2)
    expect(store.lastClaimed.defId).toBe('firstLight')
  })

  it('announces a ceremony, not a receipt', () => {
    const { current, receipts } = useHerald()
    fulfil('firstTouch')
    expect(current.value?.headline).toBe(mission('firstTouch').name)
    expect(current.value?.subline).toContain('chimes')
    expect(receipts.value).toHaveLength(0)
  })
})

describe('missionStore — payout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useHerald().reset()
  })

  it('credits all four chime fields and recalculates the level', () => {
    const game = useGameStore()
    const before = {
      chimes: game.chimes,
      universe: game.chimesForNextUniverse,
      total: game.totalChimesEarned,
      level: game.chimesEarnedForLevel,
    }
    fulfil('firstTouch')

    const gain = game.chimes - before.chimes
    expect(gain, 'the flat floor should have paid').toBeGreaterThan(0)
    expect(game.chimesForNextUniverse - before.universe).toBeCloseTo(gain, 6)
    // `totalChimesEarned` trägt zusätzlich, was `fulfil` als Metrik gesetzt hat.
    expect(game.totalChimesEarned).toBeGreaterThanOrEqual(before.total + gain)
    expect(game.chimesEarnedForLevel - before.level).toBeCloseTo(gain, 6)
  })

  it('takes the largest of the three chime floors', () => {
    const game = useGameStore()
    // „The First Stone" zahlt max(80 flat, 40 Klicks). Ein hoher Klickwert muss
    // den festen Boden überholen, sonst ist die Staffelung wirkungslos.
    game.chimesPerClick = 1000
    arm('firstStone')
    const before = game.chimes
    useMissionStore().tick()
    expect(game.chimes - before).toBeGreaterThan(80)
  })

  it('caps the production-based reward', () => {
    const game = useGameStore()
    const def = mission('aBillionRings')
    expect(def.reward.chimes?.cpsSeconds).toBeDefined()
    arm('aBillionRings')
    const cps = game.chimesPerSecond
    const before = game.chimes
    useMissionStore().tick()
    expect(game.chimes - before).toBeLessThanOrEqual(cps * MISSION_CHIME_REWARD_CAP_SEC + 1)
  })

  it('grants meeps through the store, not the raw field', () => {
    const game = useGameStore()
    const def = mission('oneWhoAnswered')
    const before = { meeps: game.meeps, total: game.totalMeepsEarned }
    fulfil('oneWhoAnswered')
    expect(game.meeps - before.meeps).toBe(def.reward.meeps)
    expect(game.totalMeepsEarned - before.total).toBe(def.reward.meeps)
  })

  it('books materials under the wayfinder source', () => {
    const inventory = useInventoryStore()
    const def = mission('oneLessDark')
    const mat = def.reward.materials![0]
    fulfil('oneLessDark')
    expect(inventory.collectedMaterials[mat.id]).toBeGreaterThanOrEqual(mat.qty)
    expect(inventory.sourceTally[mat.id]?.mission).toBe(mat.qty)
  })
})

describe('missionStore — the ladder walk', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useHerald().reset()
  })

  it('goes silent once the ladder is walked', () => {
    const store = useMissionStore()
    store.index = MISSION_COUNT
    expect(store.isComplete).toBe(true)
    expect(store.activeView).toBeNull()
    expect(() => store.tick()).not.toThrow()
    expect(store.totalMissionsClaimed).toBe(0)
    expect(store.lastClaimed.seq).toBe(0)
  })

  it('walks one rung per tick', () => {
    const store = useMissionStore()
    setMetric(MISSIONS[0].metric, MISSIONS[0].target)
    setMetric(MISSIONS[1].metric, MISSIONS[1].target)
    store.tick()
    expect(store.index).toBe(1)
    expect(store.totalMissionsClaimed).toBe(1)
    store.tick()
    expect(store.index).toBe(2)
    expect(store.totalMissionsClaimed).toBe(2)
  })

  it('does not cascade through its own chime reward', () => {
    // „First Touch" zahlt flat, und dieselben Chimes erfüllen „First Light".
    // Ohne die Ein-Stufe-Regel liefe ein einziger Takt durch beide.
    const store = useMissionStore()
    setMetric('clicks', mission('firstTouch').target)
    setMetric('chimesEarned', mission('firstLight').target - 1)
    store.tick()
    expect(store.index).toBe(1)
    expect(store.totalMissionsClaimed).toBe(1)
    expect(
      progressMetricValue('chimesEarned'),
      'the reward must actually have met the next rung, else this test proves nothing',
    ).toBeGreaterThanOrEqual(mission('firstLight').target)
    store.tick()
    expect(store.index).toBe(2)
  })

  it('ends the ladder on the last rung', () => {
    const store = useMissionStore()
    const last = MISSIONS[MISSION_COUNT - 1]
    store.index = MISSION_COUNT - 1
    setMetric(last.metric, last.target)
    store.tick()
    expect(store.index).toBe(MISSION_COUNT)
    expect(store.isComplete).toBe(true)
    expect(store.activeView).toBeNull()
    expect(store.lastClaimed.seq).toBe(1)
  })
})

describe('missionStore — resilience', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useHerald().reset()
  })

  it('does not pay a rung whose run-scoped metric fell away', () => {
    // Ohne Latche gibt es kein Versprechen, das gebrochen werden könnte: das
    // Fenster zwischen „erfüllt" und „ausgezahlt" ist einen Takt breit.
    const store = useMissionStore()
    arm('firstStone')
    setMetric('solarRayLevels', 0)
    store.tick()
    expect(store.index).toBe(MISSION_INDEX['firstStone'])
    expect(store.totalMissionsClaimed).toBe(0)
  })

  it('survives an index beyond the catalogue', () => {
    const store = useMissionStore()
    store.index = MISSION_COUNT + 5
    expect(store.activeView).toBeNull()
    expect(() => store.tick()).not.toThrow()
    expect(store.totalMissionsClaimed).toBe(0)
  })
})

describe('missionStore — silent catch-up', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does nothing on a fresh save', () => {
    const store = useMissionStore()
    store.catchUpSilently()
    expect(store.index).toBe(0)
    expect(store.caughtUp).toBe(0)
  })

  it('skips without paying anything out', () => {
    const store = useMissionStore()
    const game = useGameStore()
    setMetric('clicks', 10_000)
    const before = game.chimes
    store.catchUpSilently()
    expect(store.index).toBe(1)
    expect(store.caughtUp).toBe(1)
    expect(game.chimes, 'catch-up must never pay').toBe(before)
    expect(store.totalMissionsClaimed).toBe(0)
  })

  it('stops at the first unmet rung', () => {
    const store = useMissionStore()
    for (const m of MISSIONS) setMetric(m.metric, m.target)
    store.catchUpSilently()
    expect(store.index).toBe(MISSION_COUNT)
    expect(store.caughtUp).toBe(MISSION_COUNT)
  })
})

describe('missionStore — admin', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useHerald().reset()
  })

  it('claims the running rung on demand, met or not', () => {
    const store = useMissionStore()
    const game = useGameStore()
    const before = game.chimes
    store.adminClaimNow()
    expect(store.index).toBe(1)
    expect(store.totalMissionsClaimed).toBe(1)
    expect(game.chimes).toBeGreaterThan(before)
    expect(store.lastClaimed.seq).toBe(1)
  })

  it('does nothing past the end of the ladder', () => {
    const store = useMissionStore()
    store.index = MISSION_COUNT
    expect(() => store.adminClaimNow()).not.toThrow()
    expect(store.totalMissionsClaimed).toBe(0)
  })

  it('jumps to the start of a chapter', () => {
    const store = useMissionStore()
    store.adminJumpToChapter('deepField')
    expect(store.index).toBe(MISSION_CHAPTER_STARTS['deepField'])
  })

  it('ignores an unknown chapter', () => {
    const store = useMissionStore()
    store.adminJumpToChapter('nowhere')
    expect(store.index).toBe(0)
  })

  it('clears the catch-up count on reset', () => {
    const store = useMissionStore()
    store.index = 12
    store.caughtUp = 12
    store.adminResetLadder()
    expect(store.index).toBe(0)
    expect(store.caughtUp).toBe(0)
  })
})
