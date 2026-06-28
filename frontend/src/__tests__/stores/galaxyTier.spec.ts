import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  tierOf,
  firstGalaxyOfTier,
  starLevelForGalaxy,
  computeTierUnlockCost,
  useGalaxyStore,
} from '../../stores/galaxyStore'
import { useGameStore } from '../../stores/gameStore'
import { useInventoryStore } from '../../stores/inventoryStore'
import {
  getChampionStarLevel,
  requiredGalaxyForTier,
  unlockedChampionTierCount,
  tierSpawnWeights,
  championTierSpawnPercent,
  CHAMPION_TIERS,
  CHAMPION_TIERS_BY_STAR,
} from '../../config/championTiers'
import { CHAMPION_DATA } from '../../config/championData'
import {
  MAX_STAR_LEVEL,
  CHAMPION_TIER_CHIMES_PRICE,
  CHAMPION_TIER_REQUIRED_GALAXY,
  TIER_SPAWN_WEIGHTS,
} from '../../config/constants'

describe('Galaxy Tier helpers', () => {
  describe('tierOf', () => {
    it('groups galaxies into the fixed tier layout', () => {
      // Tier 1 = G1-2, Tier 2 = G3-5, Tier 3 = G6-8, Tier 4 = G9-11
      expect(tierOf(1)).toBe(1)
      expect(tierOf(2)).toBe(1)
      expect(tierOf(3)).toBe(2)
      expect(tierOf(5)).toBe(2)
      expect(tierOf(6)).toBe(3)
      expect(tierOf(8)).toBe(3)
      expect(tierOf(9)).toBe(4)
    })
  })

  describe('firstGalaxyOfTier', () => {
    it('returns the first galaxy of each tier', () => {
      expect(firstGalaxyOfTier(1)).toBe(1)
      expect(firstGalaxyOfTier(2)).toBe(3)
      expect(firstGalaxyOfTier(3)).toBe(6)
      expect(firstGalaxyOfTier(4)).toBe(9)
    })

    it('is the inverse of tierOf at tier boundaries', () => {
      for (let t = 1; t <= 6; t++) {
        expect(tierOf(firstGalaxyOfTier(t))).toBe(t)
      }
    })
  })

  describe('starLevelForGalaxy', () => {
    it('matches galaxy number, clamped to MAX_STAR_LEVEL', () => {
      expect(starLevelForGalaxy(1)).toBe(1)
      expect(starLevelForGalaxy(MAX_STAR_LEVEL)).toBe(MAX_STAR_LEVEL)
      expect(starLevelForGalaxy(MAX_STAR_LEVEL + 1)).toBe(MAX_STAR_LEVEL)
      expect(starLevelForGalaxy(100)).toBe(MAX_STAR_LEVEL)
    })
  })

  describe('computeTierUnlockCost', () => {
    it('tier 1 is free', () => {
      expect(computeTierUnlockCost(1)).toEqual({ chimes: 0, material: {} })
    })

    it('grows geometrically from tier 2', () => {
      const t2 = computeTierUnlockCost(2)
      const t3 = computeTierUnlockCost(3)
      expect(t2.chimes).toBe(50_000)
      expect(t3.chimes).toBe(160_000)
      expect(t3.chimes).toBeGreaterThan(t2.chimes)
      // material amounts also scale up
      for (const id of Object.keys(t2.material)) {
        expect(t3.material[id]).toBeGreaterThan(t2.material[id])
      }
    })
  })
})

describe('Champion Tiers', () => {
  it('every champion resolves to a star level within 1..MAX_STAR_LEVEL', () => {
    for (const name of Object.keys(CHAMPION_DATA)) {
      const star = getChampionStarLevel(name)
      expect(star).toBeGreaterThanOrEqual(1)
      expect(star).toBeLessThanOrEqual(MAX_STAR_LEVEL)
    }
  })
})

describe('Explicit champion tiers (championData)', () => {
  const names = Object.keys(CHAMPION_DATA)

  it('every champion declares an explicit championTier', () => {
    for (const name of names) {
      expect(CHAMPION_DATA[name].championTier, `${name} is missing championTier`).toBeDefined()
    }
  })

  it('getChampionStarLevel matches the explicit championTier star level', () => {
    for (const name of names) {
      const id = CHAMPION_DATA[name].championTier!
      expect(getChampionStarLevel(name)).toBe(CHAMPION_TIERS[id].starLevel)
    }
  })
})

describe('Champion Tier coverage + economy', () => {
  const names = Object.keys(CHAMPION_DATA)

  it('exposes one champion tier per star level 1..MAX_STAR_LEVEL (6 tiers)', () => {
    expect(MAX_STAR_LEVEL).toBe(6)
    expect(CHAMPION_TIERS_BY_STAR).toHaveLength(MAX_STAR_LEVEL)
    expect(CHAMPION_TIERS_BY_STAR.map((t) => t.starLevel)).toEqual(
      Array.from({ length: MAX_STAR_LEVEL }, (_, i) => i + 1),
    )
  })

  it('fills every tier (no empty cosmic tier)', () => {
    const used = new Set(names.map((n) => getChampionStarLevel(n)))
    for (let s = 1; s <= MAX_STAR_LEVEL; s++) {
      expect(used.has(s)).toBe(true)
    }
  })

  it('has a strictly ascending Chimes price per tier (★1..★6)', () => {
    expect(CHAMPION_TIER_CHIMES_PRICE).toHaveLength(MAX_STAR_LEVEL)
    for (let i = 1; i < CHAMPION_TIER_CHIMES_PRICE.length; i++) {
      expect(CHAMPION_TIER_CHIMES_PRICE[i]).toBeGreaterThan(CHAMPION_TIER_CHIMES_PRICE[i - 1])
    }
  })
})

describe('Champion Tier galaxy-unlock curve', () => {
  it('covers all 6 tiers, starts at galaxy 1, and is non-decreasing', () => {
    expect(CHAMPION_TIER_REQUIRED_GALAXY).toHaveLength(MAX_STAR_LEVEL)
    expect(CHAMPION_TIER_REQUIRED_GALAXY[0]).toBe(1)
    for (let i = 1; i < CHAMPION_TIER_REQUIRED_GALAXY.length; i++) {
      expect(CHAMPION_TIER_REQUIRED_GALAXY[i]).toBeGreaterThanOrEqual(
        CHAMPION_TIER_REQUIRED_GALAXY[i - 1],
      )
    }
  })

  it('grows super-linearly (later tiers gated beyond their star level)', () => {
    // Beyond the first few tiers, the required galaxy outpaces the tier number,
    // so the curve is steeper than linear.
    expect(requiredGalaxyForTier(MAX_STAR_LEVEL)).toBeGreaterThan(MAX_STAR_LEVEL)
  })

  it('requiredGalaxyForTier matches the curve and clamps out of range', () => {
    for (let t = 1; t <= MAX_STAR_LEVEL; t++) {
      expect(requiredGalaxyForTier(t)).toBe(CHAMPION_TIER_REQUIRED_GALAXY[t - 1])
    }
    expect(requiredGalaxyForTier(MAX_STAR_LEVEL + 5)).toBe(
      CHAMPION_TIER_REQUIRED_GALAXY[MAX_STAR_LEVEL - 1],
    )
  })
})

describe('Weighted champion-tier spawn', () => {
  it('TIER_SPAWN_WEIGHTS: each row sums to 100, descends, and Tier 1 is highest', () => {
    expect(TIER_SPAWN_WEIGHTS).toHaveLength(MAX_STAR_LEVEL)
    TIER_SPAWN_WEIGHTS.forEach((row, i) => {
      expect(row).toHaveLength(i + 1) // row N-1 covers N unlocked tiers
      expect(row.reduce((a, b) => a + b, 0)).toBe(100)
      for (let j = 1; j < row.length; j++) {
        expect(row[j - 1]).toBeGreaterThanOrEqual(row[j]) // descending
      }
      expect(row[0]).toBe(Math.max(...row)) // Tier 1 always highest
    })
  })

  it('unlockedChampionTierCount grows cumulatively with the galaxy, clamped 1..6', () => {
    // CHAMPION_TIER_REQUIRED_GALAXY = [1, 3, 6, 10, 15, 21]
    expect(unlockedChampionTierCount(1)).toBe(1)
    expect(unlockedChampionTierCount(2)).toBe(1)
    expect(unlockedChampionTierCount(3)).toBe(2)
    expect(unlockedChampionTierCount(6)).toBe(3)
    expect(unlockedChampionTierCount(10)).toBe(4)
    expect(unlockedChampionTierCount(15)).toBe(5)
    expect(unlockedChampionTierCount(21)).toBe(6)
    expect(unlockedChampionTierCount(999)).toBe(6) // clamped to MAX
  })

  it('tierSpawnWeights returns the row for the unlocked-tier count', () => {
    expect(tierSpawnWeights(1)).toEqual([100])
    expect(tierSpawnWeights(2)).toEqual([70, 30])
    expect(tierSpawnWeights(6)).toEqual(TIER_SPAWN_WEIGHTS[5])
  })

  it('championTierSpawnPercent: weight when unlocked, null when locked', () => {
    // Galaxy 3 → 2 tiers unlocked → [70, 30]
    expect(championTierSpawnPercent(1, 3)).toBe(70)
    expect(championTierSpawnPercent(2, 3)).toBe(30)
    expect(championTierSpawnPercent(3, 3)).toBeNull() // Tier 3 not yet unlocked at G3
    // Galaxy 1 → only Tier 1 spawns at 100%
    expect(championTierSpawnPercent(1, 1)).toBe(100)
    expect(championTierSpawnPercent(2, 1)).toBeNull()
  })
})

describe('galaxyStore — tier progression', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('blocks requestTransition while the next tier is locked', () => {
    const store = useGalaxyStore()
    // Sit at the last galaxy of tier 1 (G2). Advancing → tier 2 (locked).
    store.currentGalaxy = 2
    store.starsRescued = store.starsRequired
    store.galaxyBossDefeated = true

    expect(store.nextTierLocked).toBe(true)
    store.requestTransition()
    expect(store.pendingTransition).toBe(false)
  })

  it('unlockNextTier spends Chimes + Material and bumps the unlocked tier', () => {
    const store = useGalaxyStore()
    const gameStore = useGameStore()
    const inventoryStore = useInventoryStore()

    store.currentGalaxy = 2 // nextTier = 2
    const cost = store.tierUnlockCost
    gameStore.chimes = cost.chimes + 1234
    inventoryStore.collectedMaterials = {}
    for (const [id, amount] of Object.entries(cost.material)) {
      inventoryStore.collectedMaterials[id] = amount + 5
    }

    expect(store.nextTierLocked).toBe(true)
    const ok = store.unlockNextTier()

    expect(ok).toBe(true)
    expect(store.unlockedTier).toBe(2)
    expect(store.tierJustUnlocked).toBe(true)
    expect(gameStore.chimes).toBe(1234)
    for (const id of Object.keys(cost.material)) {
      expect(inventoryStore.collectedMaterials[id]).toBe(5) // started at amount+5, spent amount
    }

    // After unlocking, the warp is no longer blocked.
    store.starsRescued = store.starsRequired
    store.galaxyBossDefeated = true
    expect(store.nextTierLocked).toBe(false)
    store.requestTransition()
    expect(store.pendingTransition).toBe(true)
  })

  it('unlockNextTier fails when the player cannot afford it', () => {
    const store = useGalaxyStore()
    const gameStore = useGameStore()
    store.currentGalaxy = 2
    gameStore.chimes = 0
    expect(store.unlockNextTier()).toBe(false)
    expect(store.unlockedTier).toBe(1)
  })
})

describe('adminJumpToGalaxy', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('teleports to galaxy N with consistent per-galaxy state', () => {
    const store = useGalaxyStore()
    store.starsRescued = 99
    store.galaxyBossDefeated = true
    store.adminJumpToGalaxy(5)
    expect(store.currentGalaxy).toBe(5)
    expect(store.starsRequired).toBe(7) // computeRequired(5) = 5 + 2
    expect(store.starsRescued).toBe(0)
    expect(store.galaxyBossDefeated).toBe(false)
    expect(store.unlockedTier).toBeGreaterThanOrEqual(tierOf(5))
  })

  it('clamps non-positive / fractional targets to galaxy 1', () => {
    const store = useGalaxyStore()
    store.adminJumpToGalaxy(0)
    expect(store.currentGalaxy).toBe(1)
    store.adminJumpToGalaxy(3.9)
    expect(store.currentGalaxy).toBe(3)
  })

  it('unlocks the matching champion tier (galaxy gate)', () => {
    const store = useGalaxyStore()
    store.adminJumpToGalaxy(55) // max required galaxy → every tier unlocked
    for (const tier of CHAMPION_TIERS_BY_STAR) {
      expect(store.currentGalaxy >= requiredGalaxyForTier(tier.starLevel)).toBe(true)
    }
  })
})
