import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useStarForgeStore } from '../../stores/starForgeStore'
import { useSolarUpgradeStore } from '../../stores/solarUpgradeStore'
import { useGameStore } from '../../stores/gameStore'
import { useInventoryStore } from '../../stores/inventoryStore'
import {
  FORGE_BRANCH_BASE_MAX_LEVEL,
  FORGE_BRANCH_MAX_LEVEL_CAP,
  FORGE_BRANCH_UNLOCK_PHASE,
  FORGE_LEAF_UNLOCK_PHASE,
  FORGE_LEAF_MAX_LEVEL,
  FORGE_LEAF_AMPLIFY_PER_LEVEL,
  FORGE_BARGAIN_RESTOCK_MS,
} from '../../config/constants'
import { getForgeNode, FORGE_RELICS, FORGE_CONSTELLATIONS } from '../../config/starForge'

/** Puts the game into a state where `solarSails` (branch of flightSpeed) is buyable. */
function unlockBranchPrereqs(nodeId = 'solarSails') {
  const solar = useSolarUpgradeStore()
  solar.starPhase = FORGE_BRANCH_UNLOCK_PHASE
  solar.flightSpeedLevel = 1
  solar.maxHpLevel = 1
  solar.chimesPerClickLevel = 1
  solar.chimesPerSecondLevel = 1
  solar.dmgPerClickLevel = 1
  const game = useGameStore()
  game.chimes = 1_000_000
  const inventory = useInventoryStore()
  inventory.collectedMaterials = {
    stardust: 999,
    moon_crystal: 999,
    nebula_quartz: 999,
    solar_essence: 999,
    void_shard: 999,
    dark_matter: 999,
  }
  return nodeId
}

describe('starForgeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ─── Node gating ─────────────────────────────────────────────────────────────

  describe('nodeUnlocked', () => {
    it('branch locked below unlock phase', () => {
      const store = useStarForgeStore()
      const solar = useSolarUpgradeStore()
      solar.starPhase = FORGE_BRANCH_UNLOCK_PHASE - 1
      solar.flightSpeedLevel = 3
      expect(store.nodeUnlocked('solarSails')).toBe(false)
    })

    it('branch locked while parent root is level 0', () => {
      const store = useStarForgeStore()
      const solar = useSolarUpgradeStore()
      solar.starPhase = FORGE_BRANCH_UNLOCK_PHASE
      solar.flightSpeedLevel = 0
      expect(store.nodeUnlocked('solarSails')).toBe(false)
    })

    it('branch unlocked at phase + parent level 1', () => {
      const store = useStarForgeStore()
      unlockBranchPrereqs()
      expect(store.nodeUnlocked('solarSails')).toBe(true)
    })

    it('leaf requires phase 4 AND parent branch level 2', () => {
      const store = useStarForgeStore()
      unlockBranchPrereqs()
      const solar = useSolarUpgradeStore()
      solar.starPhase = FORGE_LEAF_UNLOCK_PHASE
      store.branchLevels.solarSails = 1
      expect(store.nodeUnlocked('auroraWake')).toBe(false)
      store.branchLevels.solarSails = 2
      expect(store.nodeUnlocked('auroraWake')).toBe(true)
    })
  })

  // ─── Cost formulas ───────────────────────────────────────────────────────────

  describe('costs', () => {
    it('gold cost follows base * mult^level', () => {
      const store = useStarForgeStore()
      const def = getForgeNode('solarSails')!
      expect(store.nodeGoldCost('solarSails')).toBe(def.baseCost)
      store.branchLevels.solarSails = 2
      expect(store.nodeGoldCost('solarSails')).toBe(
        Math.ceil(def.baseCost * Math.pow(def.costMultiplier, 2)),
      )
    })

    it('material cost scales with the next level', () => {
      const store = useStarForgeStore()
      expect(store.nodeMaterialCost('solarSails')).toEqual({ stardust: 4 })
      store.branchLevels.solarSails = 2
      expect(store.nodeMaterialCost('solarSails')).toEqual({ stardust: 12 })
    })
  })

  // ─── Max level scaling ───────────────────────────────────────────────────────

  describe('nodeMaxLevel', () => {
    it('branch max level grows +1 per phase past unlock, capped', () => {
      const store = useStarForgeStore()
      const solar = useSolarUpgradeStore()
      solar.starPhase = FORGE_BRANCH_UNLOCK_PHASE
      expect(store.nodeMaxLevel('solarSails')).toBe(FORGE_BRANCH_BASE_MAX_LEVEL)
      solar.starPhase = FORGE_BRANCH_UNLOCK_PHASE + 1
      expect(store.nodeMaxLevel('solarSails')).toBe(FORGE_BRANCH_BASE_MAX_LEVEL + 1)
      solar.starPhase = 6
      expect(store.nodeMaxLevel('solarSails')).toBe(FORGE_BRANCH_MAX_LEVEL_CAP)
    })

    it('leaf max level is constant', () => {
      const store = useStarForgeStore()
      expect(store.nodeMaxLevel('auroraWake')).toBe(FORGE_LEAF_MAX_LEVEL)
    })
  })

  // ─── buyNode ─────────────────────────────────────────────────────────────────

  describe('buyNode', () => {
    it('deducts gold + materials and raises the level', () => {
      const store = useStarForgeStore()
      unlockBranchPrereqs()
      const game = useGameStore()
      const inventory = useInventoryStore()
      const goldBefore = game.chimes
      const dustBefore = inventory.collectedMaterials.stardust
      expect(store.buyNode('solarSails')).toBe(true)
      expect(store.branchLevels.solarSails).toBe(1)
      expect(game.chimes).toBe(goldBefore - 1_500)
      expect(inventory.collectedMaterials.stardust).toBe(dustBefore - 4)
    })

    it('refuses when locked or unaffordable', () => {
      const store = useStarForgeStore()
      expect(store.buyNode('solarSails')).toBe(false)
      unlockBranchPrereqs()
      useGameStore().chimes = 0
      expect(store.buyNode('solarSails')).toBe(false)
    })

    it('refuses past max level', () => {
      const store = useStarForgeStore()
      unlockBranchPrereqs()
      store.branchLevels.solarSails = FORGE_BRANCH_BASE_MAX_LEVEL
      expect(store.buyNode('solarSails')).toBe(false)
    })
  })

  // ─── Effects incl. leaf amplify ──────────────────────────────────────────────

  describe('effect getters', () => {
    it('branchEffect = level × perLevel × leaf amplifier', () => {
      const store = useStarForgeStore()
      const def = getForgeNode('moonOrbit')!
      store.branchLevels.moonOrbit = 2
      expect(store.branchEffect('moonOrbit')).toBeCloseTo(2 * def.effectPerLevel)
      store.leafLevels.midnightTide = 2
      expect(store.branchEffect('moonOrbit')).toBeCloseTo(
        2 * def.effectPerLevel * (1 + 2 * FORGE_LEAF_AMPLIFY_PER_LEVEL),
      )
    })

    it('offlineEarningsMult folds branch + relic + constellation', () => {
      const store = useStarForgeStore()
      expect(store.offlineEarningsMult).toBe(1)
      store.branchLevels.moonOrbit = 1 // +10%
      store.relicLevels.echoOfTheVoid = 1 // +20%
      store.forgedConstellations.push('eternalCadence') // +15%
      expect(store.offlineEarningsMult).toBeCloseTo(1.45)
    })

    it('dwellMult is clamped at 0.5', () => {
      const store = useStarForgeStore()
      store.branchLevels.allegro = 5
      store.leafLevels.timeWeaver = 3
      // 5 lvl × 5% × 1.75 amp = 43.75% → 0.5625, above clamp
      expect(store.dwellMult).toBeCloseTo(0.5625)
    })

    it('solarUpgradeStore.dwellTimeMultiplier reads the forge', () => {
      const store = useStarForgeStore()
      const solar = useSolarUpgradeStore()
      store.branchLevels.allegro = 2 // −10%
      expect(solar.dwellTimeMultiplier).toBeCloseTo(0.9)
    })
  })

  // ─── Relics ──────────────────────────────────────────────────────────────────

  describe('forgeRelic', () => {
    it('requires the branch at required level', () => {
      const store = useStarForgeStore()
      unlockBranchPrereqs()
      const relic = FORGE_RELICS.find((r) => r.id === 'choirOfChampions')!
      store.branchLevels[relic.requiresNode] = relic.requiresLevel - 1
      expect(store.canForgeRelic('choirOfChampions')).toBe(false)
      store.branchLevels[relic.requiresNode] = relic.requiresLevel
      expect(store.canForgeRelic('choirOfChampions')).toBe(true)
      expect(store.forgeRelic('choirOfChampions')).toBe(true)
      expect(store.relicLevel('choirOfChampions')).toBe(1)
      // championDpsMult: warcry 3×5% + relic 15% = 1.30
      expect(store.championDpsMult).toBeCloseTo(1.3)
    })

    it('stops at maxLevel', () => {
      const store = useStarForgeStore()
      unlockBranchPrereqs()
      const relic = FORGE_RELICS.find((r) => r.id === 'choirOfChampions')!
      store.branchLevels[relic.requiresNode] = relic.requiresLevel
      store.relicLevels.choirOfChampions = relic.maxLevel
      expect(store.canForgeRelic('choirOfChampions')).toBe(false)
    })
  })

  // ─── Constellations ──────────────────────────────────────────────────────────

  describe('forgeConstellation', () => {
    it('requires both branches at level 3 and forges once', () => {
      const store = useStarForgeStore()
      unlockBranchPrereqs()
      const def = FORGE_CONSTELLATIONS.find((c) => c.id === 'stellarWind')!
      store.branchLevels[def.nodeA] = 3
      store.branchLevels[def.nodeB] = 2
      expect(store.canForgeConstellation('stellarWind')).toBe(false)
      store.branchLevels[def.nodeB] = 3
      expect(store.canForgeConstellation('stellarWind')).toBe(true)
      expect(store.forgeConstellation('stellarWind')).toBe(true)
      expect(store.cpsMult).toBeCloseTo(1.18)
      expect(store.canForgeConstellation('stellarWind')).toBe(false)
    })
  })

  // ─── Cosmic Bargain ──────────────────────────────────────────────────────────

  describe('cosmic bargain', () => {
    it('tick rolls a deal and sets the restock timer', () => {
      const store = useStarForgeStore()
      expect(store.activeDeal).toBeNull()
      store.tick()
      expect(store.activeDeal).not.toBeNull()
      expect(store.bargainRestockAt).toBeGreaterThan(Date.now())
      expect(store.bargainRestockAt).toBeLessThanOrEqual(Date.now() + FORGE_BARGAIN_RESTOCK_MS)
    })

    it('reroll costs 1 dark matter and swaps the deal', () => {
      const store = useStarForgeStore()
      store.tick()
      const inventory = useInventoryStore()
      inventory.collectedMaterials = { dark_matter: 0 }
      expect(store.rerollBargain()).toBe(false)
      inventory.collectedMaterials = { dark_matter: 2 }
      const before = store.bargainDealId
      expect(store.rerollBargain()).toBe(true)
      expect(inventory.collectedMaterials.dark_matter).toBe(1)
      expect(store.bargainDealId).not.toBe(before)
    })

    it('buff deals activate a timed buff that doubles the rate', () => {
      const store = useStarForgeStore()
      unlockBranchPrereqs()
      store.bargainDealId = 'tempoSurge'
      store.bargainRestockAt = Date.now() + FORGE_BARGAIN_RESTOCK_MS
      store.bargainPurchased = false
      expect(store.buyBargain()).toBe(true)
      expect(store.buffActive('cpsX2')).toBe(true)
      expect(store.cpsMult).toBeCloseTo(2)
      expect(store.bargainPurchased).toBe(true)
      expect(store.buyBargain()).toBe(false)
      // Expiry
      store.activeBuffs[0].expiresAt = Date.now() - 1
      store.tick()
      expect(store.buffActive('cpsX2')).toBe(false)
    })

    it('material deals add the bundle to the inventory', () => {
      const store = useStarForgeStore()
      unlockBranchPrereqs()
      const inventory = useInventoryStore()
      inventory.collectedMaterials = {}
      useGameStore().chimes = 100_000
      store.bargainDealId = 'stellarCache'
      store.bargainRestockAt = Date.now() + FORGE_BARGAIN_RESTOCK_MS
      store.bargainPurchased = false
      expect(store.buyBargain()).toBe(true)
      expect(inventory.collectedMaterials.stardust).toBe(12)
      expect(inventory.collectedMaterials.solar_essence).toBe(1)
    })
  })
})
