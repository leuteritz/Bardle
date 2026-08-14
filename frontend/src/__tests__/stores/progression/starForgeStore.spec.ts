import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import {
  FORGE_BRANCH_BASE_MAX_LEVEL,
  FORGE_BRANCH_MAX_LEVEL_CAP,
  FORGE_BRANCH_UNLOCK_PHASE,
  FORGE_LEAF_UNLOCK_PHASE,
  FORGE_LEAF_MAX_LEVEL,
  FORGE_LEAF_AMPLIFY_PER_LEVEL,
  FORGE_BARGAIN_RESTOCK_MS,
  FORGE_BOUGH_PARENT_MIN_LEVEL,
  FORGE_BOUGH_COST_MULTIPLIER,
  STAR_PHASE_FINAL_INDEX,
} from '@/config/constants'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { getForgeNode, FORGE_RELICS, FORGE_CONSTELLATIONS } from '@/config/progression/starForge'

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
      solar.starPhase = 5 // Finale — last phase index
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
      store.forgedConstellations.push('eternalOrbit') // +15%
      expect(store.offlineEarningsMult).toBeCloseTo(1.45)
    })

    it('dwellMult is clamped at 0.5', () => {
      const store = useStarForgeStore()
      store.branchLevels.quickening = 5
      store.leafLevels.timeWeaver = 3
      // 5 lvl × 5% × 1.75 amp = 43.75% → 0.5625, above clamp
      expect(store.dwellMult).toBeCloseTo(0.5625)
    })

    it('solarUpgradeStore.dwellTimeMultiplier reads the forge', () => {
      const store = useStarForgeStore()
      const solar = useSolarUpgradeStore()
      store.branchLevels.quickening = 2 // −10%
      expect(solar.dwellTimeMultiplier).toBeCloseTo(0.9)
    })
  })

  // ─── Relics ──────────────────────────────────────────────────────────────────

  describe('forgeRelic', () => {
    it('requires the branch at required level', () => {
      const store = useStarForgeStore()
      unlockBranchPrereqs()
      const relic = FORGE_RELICS.find((r) => r.id === 'hostOfChampions')!
      store.branchLevels[relic.requiresNode] = relic.requiresLevel - 1
      expect(store.canForgeRelic('hostOfChampions')).toBe(false)
      store.branchLevels[relic.requiresNode] = relic.requiresLevel
      expect(store.canForgeRelic('hostOfChampions')).toBe(true)
      expect(store.forgeRelic('hostOfChampions')).toBe(true)
      expect(store.relicLevel('hostOfChampions')).toBe(1)
      // championDpsMult: warcry 3×5% + relic 15% = 1.30
      expect(store.championDpsMult).toBeCloseTo(1.3)
    })

    it('stops at maxLevel', () => {
      const store = useStarForgeStore()
      unlockBranchPrereqs()
      const relic = FORGE_RELICS.find((r) => r.id === 'hostOfChampions')!
      store.branchLevels[relic.requiresNode] = relic.requiresLevel
      store.relicLevels.hostOfChampions = relic.maxLevel
      expect(store.canForgeRelic('hostOfChampions')).toBe(false)
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
      store.bargainDealId = 'stellarSurge'
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

  // ── Ring 4: der endlose Ring ────────────────────────────────────────────────
  describe('boughs', () => {
    /** Endphase, Elternzweig ausgewachsen, Kasse voll. */
    function unlockBough(boughId = 'sleeplessOrbit') {
      unlockBranchPrereqs()
      const solar = useSolarUpgradeStore()
      solar.starPhase = STAR_PHASE_FINAL_INDEX
      const store = useStarForgeStore()
      const def = getForgeNode(boughId)!
      store.branchLevels[def.parentId] = FORGE_BOUGH_PARENT_MIN_LEVEL
      useGameStore().chimes = 1e18
      return { store, def }
    }

    it('kennt keine Obergrenze und wird deshalb nie „maxed"', () => {
      const { store, def } = unlockBough()
      expect(store.nodeMaxLevel(def.id)).toBe(Infinity)
      for (let i = 0; i < 30; i++) expect(store.buyNode(def.id)).toBe(true)
      expect(store.nodeLevel(def.id)).toBe(30)
      // Der Zustand, an dem die Liste „✦ MAX" zeigt, kann hier nicht eintreten.
      expect(store.nodeLevel(def.id) >= store.nodeMaxLevel(def.id)).toBe(false)
    })

    it('verlangt kein Material und wächst geometrisch im Preis', () => {
      const { store, def } = unlockBough()
      expect(store.nodeMaterialCost(def.id)).toEqual({})

      const first = store.nodeGoldCost(def.id)
      store.buyNode(def.id)
      const second = store.nodeGoldCost(def.id)
      expect(second / first).toBeCloseTo(FORGE_BOUGH_COST_MULTIPLIER, 5)
    })

    it('bleibt zu, solange sein Elternzweig nicht ausgewachsen ist', () => {
      const { store, def } = unlockBough()
      store.branchLevels[def.parentId] = FORGE_BOUGH_PARENT_MIN_LEVEL - 1
      expect(store.nodeUnlocked(def.id)).toBe(false)
      store.branchLevels[def.parentId] = FORGE_BOUGH_PARENT_MIN_LEVEL
      expect(store.nodeUnlocked(def.id)).toBe(true)
    })

    it('trägt KEINEN Blatt-Verstärker — sonst wäre die Wirkung multiplikativ', () => {
      // Genau die Invariante, die den endlosen Ring sicher macht: liefe ein
      // Bough durch `branchEffect`, verdoppelte ein Blatt auf Stufe 4 einen
      // unbegrenzten Term gratis.
      const { store, def } = unlockBough()
      store.buyNode(def.id)
      store.buyNode(def.id)
      const before = store.boughEffect(def.id)

      const leaf = store.leafOfBranch(def.parentId)
      if (leaf) store.leafLevels[leaf.id] = FORGE_LEAF_MAX_LEVEL

      expect(store.boughEffect(def.id)).toBe(before)
      expect(store.boughEffect(def.id)).toBe(2 * def.effectPerLevel)
      // Und die Gegenrichtung: `branchEffect` weist einen Bough ab.
      expect(store.branchEffect(def.id)).toBe(0)
    })

    it('addiert sich in den Baum-Term, statt ihn zu multiplizieren', () => {
      // Der Elternzweig `tidalDrift` steht durch `unlockBough` bereits auf
      // seiner Mindeststufe — sein Beitrag ist also schon in `base` drin.
      const { store } = unlockBough('endlessTide')
      const def = getForgeNode('endlessTide')!
      const base = store.cpsMult

      store.buyNode('endlessTide')
      const afterOne = store.cpsMult
      store.buyNode('endlessTide')
      const afterTwo = store.cpsMult

      // Jede Stufe legt DENSELBEN Betrag drauf. Genau daran hängt die
      // Sicherheit des endlosen Rings: linearer Ertrag gegen geometrische
      // Kosten. Multiplikativ wäre der zweite Schritt grösser als der erste.
      expect(afterOne - base).toBeCloseTo(def.effectPerLevel / 100, 9)
      expect(afterTwo - afterOne).toBeCloseTo(afterOne - base, 9)
      expect(afterTwo).toBeLessThan(base * (1 + def.effectPerLevel / 100) ** 2)
    })

    it('bucht die Max-HP des Adamant Core beim Kauf', () => {
      const { store } = unlockBough('adamantCore')
      const def = getForgeNode('adamantCore')!
      const player = usePlayerStore()
      const before = player.maxHP
      store.buyNode('adamantCore')
      store.buyNode('adamantCore')
      expect(player.maxHP).toBe(before + 2 * def.effectPerLevel)
    })

    it('zählt NICHT in die Codex-Metrik forgeLevels', () => {
      // Eine unbegrenzte Zahl dort machte jede Bahn-Schwelle trivial, und der
      // Lohn der Bahn senkt seinerseits die Materialkosten des Baums.
      const { store, def } = unlockBough()
      const achievements = useAchievementStore()
      const before = achievements.metricValue('forgeLevels')
      store.buyNode(def.id)
      expect(achievements.metricValue('forgeLevels')).toBe(before)
    })
  })
})
