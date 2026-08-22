import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useMissionStore } from '@/stores/progression/missionStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
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
import { MISSION_PREVIEW_COUNT, MISSION_CHIME_REWARD_CAP_SEC } from '@/config/constants'
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
    case 'shopBuildingLevels': {
      const shop = useShopStore()
      shop.shopUpgrades.forEach((u) => (u.level = 0))
      shop.shopUpgrades[0].level = value
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

/** Bringt die Leiter auf die Mission mit dieser ID und erfüllt sie. */
function fulfil(id: string) {
  const store = useMissionStore()
  const def = mission(id)
  store.index = MISSION_INDEX[id]
  setMetric(def.metric, def.target)
  store.tick()
}

describe('missionStore — the running rung', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts on the first mission of the ladder', () => {
    const store = useMissionStore()
    expect(store.index).toBe(0)
    expect(store.activeView?.id).toBe(MISSIONS[0].id)
    expect(store.activeView?.ratio).toBe(0)
    expect(store.claimReady).toBe(false)
  })

  it('does not arm below the target', () => {
    const store = useMissionStore()
    setMetric('clicks', mission('firstTouch').target - 1)
    store.tick()
    expect(store.claimReady).toBe(false)
    expect(store.activeView?.ratio).toBeLessThan(1)
  })

  it('arms at the target without advancing', () => {
    const store = useMissionStore()
    fulfil('firstTouch')
    expect(store.claimReady).toBe(true)
    expect(store.index).toBe(0)
    expect(store.activeView?.ratio).toBe(1)
  })

  it('caps the shown progress at the target', () => {
    const store = useMissionStore()
    setMetric('clicks', mission('firstTouch').target * 10)
    expect(store.activeView?.progress).toBe(mission('firstTouch').target)
    expect(store.activeView?.ratio).toBe(1)
  })

  it('advances only on claim', () => {
    const store = useMissionStore()
    fulfil('firstTouch')
    expect(store.claim()).toBe(true)
    expect(store.index).toBe(1)
    expect(store.claimReady).toBe(false)
    expect(store.totalMissionsClaimed).toBe(1)
    expect(store.lastClaimed.defId).toBe('firstTouch')
  })

  it('refuses to claim what is not armed', () => {
    const store = useMissionStore()
    expect(store.claim()).toBe(false)
    expect(store.index).toBe(0)
    expect(store.totalMissionsClaimed).toBe(0)
  })

  it('pays exactly once when claimed twice', () => {
    const store = useMissionStore()
    const game = useGameStore()
    fulfil('firstTouch')
    store.claim()
    const after = game.chimes
    expect(store.claim()).toBe(false)
    expect(game.chimes).toBe(after)
    expect(store.totalMissionsClaimed).toBe(1)
  })
})

describe('missionStore — payout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('credits all four chime fields and recalculates the level', () => {
    const store = useMissionStore()
    const game = useGameStore()
    const before = {
      chimes: game.chimes,
      universe: game.chimesForNextUniverse,
      total: game.totalChimesEarned,
      level: game.chimesEarnedForLevel,
    }
    fulfil('firstTouch')
    store.claim()

    const gain = game.chimes - before.chimes
    expect(gain, 'the flat floor should have paid').toBeGreaterThan(0)
    expect(game.chimesForNextUniverse - before.universe).toBeCloseTo(gain, 6)
    // `totalChimesEarned` trägt zusätzlich, was `fulfil` als Metrik gesetzt hat.
    expect(game.totalChimesEarned).toBeGreaterThanOrEqual(before.total + gain)
    expect(game.chimesEarnedForLevel - before.level).toBeCloseTo(gain, 6)
  })

  it('takes the largest of the three chime floors', () => {
    const store = useMissionStore()
    const game = useGameStore()
    // „The First Stone" zahlt max(80 flat, 40 Klicks). Ein hoher Klickwert muss
    // den festen Boden überholen, sonst ist die Staffelung wirkungslos.
    game.chimesPerClick = 1000
    store.index = MISSION_INDEX['firstStone']
    setMetric('shopBuildingLevels', mission('firstStone').target)
    store.tick()
    const before = game.chimes
    store.claim()
    expect(game.chimes - before).toBeGreaterThan(80)
  })

  it('caps the production-based reward', () => {
    const store = useMissionStore()
    const game = useGameStore()
    const def = mission('aBillionRings')
    expect(def.reward.chimes?.cpsSeconds).toBeDefined()
    store.index = MISSION_INDEX['aBillionRings']
    setMetric('chimesEarned', def.target)
    store.tick()
    const cps = game.chimesPerSecond
    const before = game.chimes
    store.claim()
    expect(game.chimes - before).toBeLessThanOrEqual(cps * MISSION_CHIME_REWARD_CAP_SEC + 1)
  })

  it('grants meeps through the store, not the raw field', () => {
    const store = useMissionStore()
    const game = useGameStore()
    const def = mission('oneWhoAnswered')
    const before = { meeps: game.meeps, total: game.totalMeepsEarned }
    fulfil('oneWhoAnswered')
    store.claim()
    expect(game.meeps - before.meeps).toBe(def.reward.meeps)
    expect(game.totalMeepsEarned - before.total).toBe(def.reward.meeps)
  })

  it('books materials under the wayfinder source', () => {
    const store = useMissionStore()
    const inventory = useInventoryStore()
    const def = mission('oneLessDark')
    const mat = def.reward.materials![0]
    fulfil('oneLessDark')
    store.claim()
    expect(inventory.collectedMaterials[mat.id]).toBeGreaterThanOrEqual(mat.qty)
    expect(inventory.sourceTally[mat.id]?.mission).toBe(mat.qty)
  })
})

describe('missionStore — preview and chaining', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows the agreed number of upcoming rungs', () => {
    const store = useMissionStore()
    expect(store.upcomingViews).toHaveLength(MISSION_PREVIEW_COUNT)
    expect(store.upcomingViews[0].id).toBe(MISSIONS[1].id)
  })

  it('runs out of preview rows at the end of the ladder', () => {
    const store = useMissionStore()
    store.index = MISSION_COUNT - 1
    expect(store.upcomingViews).toHaveLength(0)
  })

  it('goes silent once the ladder is walked', () => {
    const store = useMissionStore()
    store.index = MISSION_COUNT
    expect(store.isComplete).toBe(true)
    expect(store.activeView).toBeNull()
    expect(() => store.tick()).not.toThrow()
    expect(store.claim()).toBe(false)
  })

  it('re-arms immediately when the next rung is already met', () => {
    const store = useMissionStore()
    // Wer beide Ziele längst überschritten hat, bekommt die zweite Stufe als
    // zweiten Klick — nicht geschenkt, aber auch nicht erst im nächsten Takt.
    setMetric(MISSIONS[0].metric, MISSIONS[0].target)
    setMetric(MISSIONS[1].metric, MISSIONS[1].target)
    store.tick()
    expect(store.claimReady).toBe(true)
    store.claim()
    expect(store.index).toBe(1)
    expect(store.claimReady, 'the second rung should arm within the same claim').toBe(true)
  })
})

describe('missionStore — resilience', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps the latch when a run-scoped metric falls away', () => {
    // `shopBuildingLevels` fällt beim Prestige auf null. Eine erarbeitete
    // Belohnung darf dem Spieler nicht unter dem Cursor weggenommen werden.
    const store = useMissionStore()
    fulfil('firstStone')
    expect(store.claimReady).toBe(true)
    setMetric('shopBuildingLevels', 0)
    store.tick()
    expect(store.claimReady).toBe(true)
    expect(store.claim()).toBe(true)
  })

  it('survives an index beyond the catalogue', () => {
    const store = useMissionStore()
    store.index = MISSION_COUNT + 5
    expect(store.activeView).toBeNull()
    expect(store.upcomingViews).toHaveLength(0)
    expect(() => store.tick()).not.toThrow()
    expect(store.claim()).toBe(false)
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
    expect(store.claimReady).toBe(false)
  })
})

describe('missionStore — admin', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('arms the running mission on demand', () => {
    const store = useMissionStore()
    store.adminMakeClaimable()
    expect(store.claimReady).toBe(true)
    expect(store.claim()).toBe(true)
  })

  it('jumps to the start of a chapter', () => {
    const store = useMissionStore()
    store.adminJumpToChapter('deepField')
    expect(store.index).toBe(MISSION_CHAPTER_STARTS['deepField'])
    expect(store.claimReady).toBe(false)
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
    store.claimReady = true
    store.adminResetLadder()
    expect(store.index).toBe(0)
    expect(store.caughtUp).toBe(0)
    expect(store.claimReady).toBe(false)
  })
})
