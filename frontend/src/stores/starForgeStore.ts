import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { usePlayerStore } from './playerStore'
import { useShopStore } from './shopStore'
import { useInventoryStore } from './inventoryStore'
import { useSolarUpgradeStore } from './solarUpgradeStore'
import type { ForgeActiveBuff, ForgeBargainDef, ForgeNodeDef } from '../types'
import {
  FORGE_NODES,
  FORGE_LEAVES,
  FORGE_RELICS,
  FORGE_CONSTELLATIONS,
  FORGE_BARGAINS,
  getForgeNode,
  getForgeRelic,
  getForgeConstellation,
  getForgeBargain,
} from '../config/starForge'
import {
  FORGE_BRANCH_BASE_MAX_LEVEL,
  FORGE_BRANCH_MAX_LEVEL_CAP,
  FORGE_BRANCH_UNLOCK_PHASE,
  FORGE_BRANCH_PARENT_MIN_LEVEL,
  FORGE_LEAF_MAX_LEVEL,
  FORGE_LEAF_PARENT_MIN_LEVEL,
  FORGE_LEAF_AMPLIFY_PER_LEVEL,
  FORGE_CONSTELLATION_REQUIRED_LEVEL,
  FORGE_BARGAIN_RESTOCK_MS,
  FORGE_BARGAIN_REROLL_MATERIAL,
  FORGE_BARGAIN_REROLL_COST,
} from '../config/constants'
import type { SolarBranchId } from './solarUpgradeStore'

/** Caps so stacked effects can never break the game loop. */
const MIN_DAMAGE_TAKEN_MULT = 0.25
const MIN_DWELL_MULT = 0.5
const MIN_EXPEDITION_MULT = 0.4
const MAX_DOUBLE_CLICK_CHANCE = 0.8

export const useStarForgeStore = defineStore('starForge', {
  state: () => ({
    /** Ring-2 node levels, keyed by ForgeNodeDef id. */
    branchLevels: {} as Record<string, number>,
    /** Ring-3 node levels, keyed by ForgeNodeDef id. */
    leafLevels: {} as Record<string, number>,
    /** Relic levels, keyed by ForgeRelicDef id (0/absent = not forged). */
    relicLevels: {} as Record<string, number>,
    forgedConstellations: [] as string[],
    /** Cosmic Bargain — current deal, restock timestamp, bought-this-cycle flag. */
    bargainDealId: '' as string,
    bargainRestockAt: 0 as number,
    bargainPurchased: false as boolean,
    activeBuffs: [] as ForgeActiveBuff[],
    /** Reactive clock — advanced by gameStore.tick() once per second. */
    forgeNow: Date.now() as number,
  }),

  getters: {
    // ── Tree nodes ────────────────────────────────────────────────────────────
    nodeLevel(state): (id: string) => number {
      return (id) => state.branchLevels[id] ?? state.leafLevels[id] ?? 0
    },

    nodeMaxLevel(): (id: string) => number {
      return (id) => {
        const def = getForgeNode(id)
        if (!def) return 0
        if (def.tier === 'leaf') return FORGE_LEAF_MAX_LEVEL
        const phase = useSolarUpgradeStore().starPhase
        const extra = Math.max(0, phase - FORGE_BRANCH_UNLOCK_PHASE)
        return Math.min(FORGE_BRANCH_MAX_LEVEL_CAP, FORGE_BRANCH_BASE_MAX_LEVEL + extra)
      }
    },

    /** Parent level of a node — solar root level for branches, branch level for leaves. */
    nodeParentLevel(): (def: ForgeNodeDef) => number {
      return (def) => {
        if (def.tier === 'branch') {
          return useSolarUpgradeStore().branchLevel(def.parentId as SolarBranchId)
        }
        return this.nodeLevel(def.parentId)
      }
    },

    nodeUnlocked(): (id: string) => boolean {
      return (id) => {
        const def = getForgeNode(id)
        if (!def) return false
        if (useSolarUpgradeStore().starPhase < def.phase) return false
        const required =
          def.tier === 'branch' ? FORGE_BRANCH_PARENT_MIN_LEVEL : FORGE_LEAF_PARENT_MIN_LEVEL
        return this.nodeParentLevel(def) >= required
      }
    },

    nodeGoldCost(): (id: string) => number {
      return (id) => {
        const def = getForgeNode(id)
        if (!def) return Infinity
        return Math.ceil(def.baseCost * Math.pow(def.costMultiplier, this.nodeLevel(id)))
      }
    },

    /** Material cost for the NEXT level — base quantities × next level. */
    nodeMaterialCost(): (id: string) => Record<string, number> {
      return (id) => {
        const def = getForgeNode(id)
        if (!def) return {}
        const nextLevel = this.nodeLevel(id) + 1
        const scaled: Record<string, number> = {}
        for (const [matId, qty] of Object.entries(def.materialCost)) {
          scaled[matId] = qty * nextLevel
        }
        return scaled
      }
    },

    canAffordNode(): (id: string) => boolean {
      return (id) => {
        if (!this.nodeUnlocked(id)) return false
        if (this.nodeLevel(id) >= this.nodeMaxLevel(id)) return false
        if (useGameStore().chimes < this.nodeGoldCost(id)) return false
        return useInventoryStore().hasMaterials(this.nodeMaterialCost(id))
      }
    },

    /** Leaf attached to a branch (uniform amplify mechanic). */
    leafOfBranch(): (branchId: string) => ForgeNodeDef | undefined {
      return (branchId) => FORGE_LEAVES.find((l) => l.parentId === branchId)
    },

    /** Branch effect value incl. its leaf amplifier: level × perLevel × (1 + leaf × 25%). */
    branchEffect(state): (branchId: string) => number {
      return (branchId) => {
        const def = getForgeNode(branchId)
        if (!def || def.tier !== 'branch') return 0
        const level = state.branchLevels[branchId] ?? 0
        if (level === 0) return 0
        const leafDef = this.leafOfBranch(branchId)
        const leafLevel = leafDef ? (state.leafLevels[leafDef.id] ?? 0) : 0
        const amp = 1 + leafLevel * FORGE_LEAF_AMPLIFY_PER_LEVEL
        return level * def.effectPerLevel * amp
      }
    },

    // ── Relics & constellations ───────────────────────────────────────────────
    relicLevel(state): (id: string) => number {
      return (id) => state.relicLevels[id] ?? 0
    },

    relicEffect(): (id: string) => number {
      return (id) => {
        const def = getForgeRelic(id)
        if (!def) return 0
        return this.relicLevel(id) * def.effectPerLevel
      }
    },

    relicGoldCost(): (id: string) => number {
      return (id) => {
        const def = getForgeRelic(id)
        if (!def) return Infinity
        return Math.ceil(def.goldCost * Math.pow(def.goldMultiplier, this.relicLevel(id)))
      }
    },

    relicMaterialCost(): (id: string) => Record<string, number> {
      return (id) => {
        const def = getForgeRelic(id)
        if (!def) return {}
        const nextLevel = this.relicLevel(id) + 1
        const scaled: Record<string, number> = {}
        for (const [matId, qty] of Object.entries(def.materialCost)) {
          scaled[matId] = qty * nextLevel
        }
        return scaled
      }
    },

    /** Branch requirement met (independent of cost) — lets the UI explain locks. */
    relicRequirementMet(): (id: string) => boolean {
      return (id) => {
        const def = getForgeRelic(id)
        if (!def) return false
        return this.nodeLevel(def.requiresNode) >= def.requiresLevel
      }
    },

    canForgeRelic(): (id: string) => boolean {
      return (id) => {
        const def = getForgeRelic(id)
        if (!def) return false
        if (this.relicLevel(id) >= def.maxLevel) return false
        if (!this.relicRequirementMet(id)) return false
        if (useGameStore().chimes < this.relicGoldCost(id)) return false
        return useInventoryStore().hasMaterials(this.relicMaterialCost(id))
      }
    },

    constellationForged(state): (id: string) => boolean {
      return (id) => state.forgedConstellations.includes(id)
    },

    constellationRequirementMet(): (id: string) => boolean {
      return (id) => {
        const def = getForgeConstellation(id)
        if (!def) return false
        return (
          this.nodeLevel(def.nodeA) >= FORGE_CONSTELLATION_REQUIRED_LEVEL &&
          this.nodeLevel(def.nodeB) >= FORGE_CONSTELLATION_REQUIRED_LEVEL
        )
      }
    },

    canForgeConstellation(): (id: string) => boolean {
      return (id) => {
        const def = getForgeConstellation(id)
        if (!def) return false
        if (this.constellationForged(id)) return false
        if (!this.constellationRequirementMet(id)) return false
        if (useGameStore().chimes < def.goldCost) return false
        return useInventoryStore().hasMaterials(def.materialCost)
      }
    },

    // ── Cosmic Bargain ────────────────────────────────────────────────────────
    activeDeal(state): ForgeBargainDef | null {
      return getForgeBargain(state.bargainDealId) ?? null
    },

    bargainPrice(): (def: ForgeBargainDef) => number {
      return (def) => Math.round(def.basePrice * (1 - def.discountPct))
    },

    bargainRestockRemainingMs(state): number {
      return Math.max(0, state.bargainRestockAt - state.forgeNow)
    },

    canBuyBargain(): boolean {
      const def = this.activeDeal
      if (!def || this.bargainPurchased) return false
      if (useGameStore().chimes < this.bargainPrice(def)) return false
      if (def.kind === 'gold' && def.materials) {
        return useInventoryStore().hasMaterials(def.materials)
      }
      return true
    },

    canRerollBargain(): boolean {
      const inventory = useInventoryStore()
      return (
        (inventory.collectedMaterials[FORGE_BARGAIN_REROLL_MATERIAL] ?? 0) >=
        FORGE_BARGAIN_REROLL_COST
      )
    },

    buffActive(state): (buffId: 'cpcX2' | 'cpsX2') => boolean {
      return (buffId) => state.activeBuffs.some((b) => b.id === buffId && b.expiresAt > state.forgeNow)
    },

    // ── Effect getters (one per integration point) ────────────────────────────
    /** Multiplier on expedition durations (< 1 = faster). */
    expeditionSpeedMult(): number {
      return Math.max(
        MIN_EXPEDITION_MULT,
        1 - (this.branchEffect('solarSails') + this.relicEffect('stellarCompass')) / 100,
      )
    },

    /** Multiplier on offline earnings. */
    offlineEarningsMult(): number {
      const eternal = this.constellationForged('eternalCadence') ? 15 : 0
      return 1 + (this.branchEffect('moonOrbit') + this.relicEffect('echoOfTheVoid') + eternal) / 100
    },

    /** Extra hours added to the offline-progress cap (Echo of the Void). */
    offlineMaxHoursBonus(): number {
      return this.relicLevel('echoOfTheVoid') > 0 ? 4 : 0
    },

    /** HP restored to the sun per second. */
    hpRegenPerSec(): number {
      const regen = this.branchEffect('regeneration')
      return this.constellationForged('eternalCadence') ? regen * 2 : regen
    },

    /** Multiplier on incoming damage (< 1 = less damage). */
    damageTakenMult(): number {
      const bulwark = this.constellationForged('bulwarkChoir') ? 0.9 : 1
      return Math.max(MIN_DAMAGE_TAKEN_MULT, (1 - this.branchEffect('aegis') / 100) * bulwark)
    },

    /** Chance (0–1) that a click counts twice. */
    doubleClickChance(): number {
      return Math.min(MAX_DOUBLE_CLICK_CHANCE, this.branchEffect('goldenEcho') / 100)
    },

    /** Fraction of CpS added to every click (Resonance + Midas Bell). */
    cpcFromCpsPct(): number {
      return (this.branchEffect('resonance') + this.relicEffect('midasBell')) / 100
    },

    /** Multiplier on the material drop chance. */
    materialDropMult(): number {
      return 1 + this.branchEffect('cometMiner') / 100
    },

    /** Extra materials per successful drop (Prospector's Song). */
    extraDropCount(): number {
      return this.constellationForged('prospectorsSong') ? 1 : 0
    },

    /** Multiplier on star-phase dwell times (< 1 = faster phases). */
    dwellMult(): number {
      return Math.max(MIN_DWELL_MULT, 1 - this.branchEffect('allegro') / 100)
    },

    /** Multiplier on orbiting champion DPS (Warcry + Choir of Champions + Hunter's Vigil). */
    championDpsMult(): number {
      const vigil = this.constellationForged('huntersVigil') ? 10 : 0
      return 1 + (this.branchEffect('warcry') + this.relicEffect('choirOfChampions') + vigil) / 100
    },

    /** Multiplier on damage dealt to bosses (Shatter + Ember Crown). */
    bossDamageMult(): number {
      return 1 + (this.branchEffect('shatter') + this.relicEffect('emberCrown')) / 100
    },

    /** Fraction of click damage splashed to all enemies (Percussive Nova). */
    clickSplashPct(): number {
      return this.constellationForged('percussiveNova') ? 0.1 : 0
    },

    /** Multiplier on total CpS (Stellar Wind + Tempo Surge buff). */
    cpsMult(): number {
      const stellar = this.constellationForged('stellarWind') ? 1.18 : 1
      const buff = this.buffActive('cpsX2') ? 2 : 1
      return stellar * buff
    },

    /** Multiplier on total CpC (Golden Tempest + Midas Cadence buff). */
    cpcMult(): number {
      const tempest = this.constellationForged('goldenTempest') ? 1.12 : 1
      return tempest * (this.buffActive('cpcX2') ? 2 : 1)
    },
  },

  actions: {
    /** Advance the reactive clock, expire buffs, restock the bargain.
     *  Called by gameStore.tick() once per second. */
    tick(): void {
      this.forgeNow = Date.now()
      const hadBuffs = this.activeBuffs.length > 0
      this.activeBuffs = this.activeBuffs.filter((b) => b.expiresAt > this.forgeNow)
      if (hadBuffs && this.activeBuffs.length === 0) this.recalcRates()
      // Restock also when a persisted deal id no longer exists in the pool —
      // otherwise the shop would show no deal until the next restock window.
      if (!this.activeDeal || this.forgeNow >= this.bargainRestockAt) {
        this.restockBargain()
      }
    },

    restockBargain(): void {
      const pool = FORGE_BARGAINS.filter((b) => b.id !== this.bargainDealId)
      const pick = pool[Math.floor(Math.random() * pool.length)] ?? FORGE_BARGAINS[0]
      this.bargainDealId = pick.id
      this.bargainPurchased = false
      this.bargainRestockAt = Date.now() + FORGE_BARGAIN_RESTOCK_MS
    },

    buyNode(id: string): boolean {
      if (!this.canAffordNode(id)) return false
      const def = getForgeNode(id)
      if (!def) return false
      const gameStore = useGameStore()
      const inventory = useInventoryStore()
      const materials = this.nodeMaterialCost(id)
      if (!inventory.removeMaterials(materials)) return false
      gameStore.chimes -= this.nodeGoldCost(id)
      if (def.tier === 'branch') {
        this.branchLevels[id] = (this.branchLevels[id] ?? 0) + 1
      } else {
        this.leafLevels[id] = (this.leafLevels[id] ?? 0) + 1
      }
      this.recalcRates()
      return true
    },

    forgeRelic(id: string): boolean {
      if (!this.canForgeRelic(id)) return false
      const def = getForgeRelic(id)
      if (!def) return false
      const gameStore = useGameStore()
      const inventory = useInventoryStore()
      if (!inventory.removeMaterials(this.relicMaterialCost(id))) return false
      gameStore.chimes -= this.relicGoldCost(id)
      this.relicLevels[id] = this.relicLevel(id) + 1
      if (id === 'heartOfTheStar') {
        usePlayerStore().maxHP += def.effectPerLevel
      }
      this.recalcRates()
      return true
    },

    forgeConstellation(id: string): boolean {
      if (!this.canForgeConstellation(id)) return false
      const def = getForgeConstellation(id)
      if (!def) return false
      const gameStore = useGameStore()
      const inventory = useInventoryStore()
      if (!inventory.removeMaterials(def.materialCost)) return false
      gameStore.chimes -= def.goldCost
      this.forgedConstellations.push(id)
      this.recalcRates()
      return true
    },

    buyBargain(): boolean {
      if (!this.canBuyBargain) return false
      const def = this.activeDeal
      if (!def) return false
      const gameStore = useGameStore()
      const inventory = useInventoryStore()
      const price = this.bargainPrice(def)
      if (def.kind === 'gold' && def.materials && !inventory.removeMaterials(def.materials)) {
        return false
      }
      gameStore.chimes -= price

      switch (def.kind) {
        case 'buff':
          if (def.buffId && def.durationMs) {
            this.activeBuffs = this.activeBuffs.filter((b) => b.id !== def.buffId)
            this.activeBuffs.push({ id: def.buffId, expiresAt: Date.now() + def.durationMs })
          }
          break
        case 'materials': {
          const bundle: Record<string, number> = def.materials ?? {}
          for (const [matId, qty] of Object.entries(bundle)) {
            for (let i = 0; i < qty; i++) inventory.addMaterial(matId)
          }
          break
        }
        case 'gold':
          gameStore.chimes += def.goldReward ?? 0
          break
        case 'dwellSkip': {
          const solar = useSolarUpgradeStore()
          const remaining = solar.phaseDwellRemainingMs
          solar.phaseEnteredAt -= Math.floor(remaining * (def.dwellSkipPct ?? 0))
          solar.tickDwell()
          break
        }
        case 'heal': {
          const player = usePlayerStore()
          player.currentHP = player.maxHP
          break
        }
      }

      this.bargainPurchased = true
      this.recalcRates()
      return true
    },

    rerollBargain(): boolean {
      if (!this.canRerollBargain) return false
      const inventory = useInventoryStore()
      if (!inventory.removeMaterials({ [FORGE_BARGAIN_REROLL_MATERIAL]: FORGE_BARGAIN_REROLL_COST })) {
        return false
      }
      this.restockBargain()
      return true
    },

    /** Push forge multipliers into the cached CpS/CpC values. */
    recalcRates(): void {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()
    },
  },
})

/** Ids used by UI iteration — re-exported so components import from one place. */
export { FORGE_NODES, FORGE_RELICS, FORGE_CONSTELLATIONS }
