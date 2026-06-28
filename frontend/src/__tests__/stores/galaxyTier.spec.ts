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
  CHAMPION_TIERS,
  CHAMPION_TIERS_BY_STAR,
} from '../../config/championTiers'
import { CHAMPION_DATA } from '../../config/championData'
import {
  MAX_STAR_LEVEL,
  GALAXY_POOL_MIN,
  GALAXY_POOL_MAX,
  CHAMPION_TIER_CHIMES_PRICE,
  CHAMPION_TIER_REQUIRED_GALAXY,
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

  it('exposes one champion tier per star level 1..MAX_STAR_LEVEL', () => {
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

  it('has a strictly ascending Chimes price per tier (★1..★12)', () => {
    expect(CHAMPION_TIER_CHIMES_PRICE).toHaveLength(MAX_STAR_LEVEL)
    for (let i = 1; i < CHAMPION_TIER_CHIMES_PRICE.length; i++) {
      expect(CHAMPION_TIER_CHIMES_PRICE[i]).toBeGreaterThan(CHAMPION_TIER_CHIMES_PRICE[i - 1])
    }
  })
})

describe('Champion Tier galaxy-unlock curve', () => {
  it('covers all 12 tiers, starts at galaxy 1, and is non-decreasing', () => {
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

describe('galaxyStore — tier progression', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('rolls a 2-4 champion pool matching the galaxy star level', () => {
    const store = useGalaxyStore()
    store.currentGalaxy = 1 // → star level 1
    store.rollGalaxyChampionPool()

    expect(store.currentGalaxyChampionPool.length).toBeGreaterThanOrEqual(GALAXY_POOL_MIN)
    expect(store.currentGalaxyChampionPool.length).toBeLessThanOrEqual(GALAXY_POOL_MAX)
    for (const name of store.currentGalaxyChampionPool) {
      expect(getChampionStarLevel(name)).toBe(1)
    }
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
