import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/core/gameStore'
import { useCpsStore } from '@/stores/core/cpsStore'
import { useAugmentStore } from '@/stores/economy/augmentStore'
import { useItemStore } from '@/stores/economy/itemStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import type { ShopUpgrade, BuildingStat } from '@/types'
import { logger } from '@/utils/logger'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useSynergyStore } from '@/stores/champions/synergyStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import {
  SECONDS_PER_HOUR,
  EFFICIENCY_STARS_DIVISOR,
  EFFICIENCY_STARS_MAX,
  EFFICIENCY_STARS_MIN,
  SHOP_UPGRADE_CATALOG,
} from '@/config/constants'

export const useShopStore = defineStore('shop', {
  state: () => ({
    buyAmount: 1 as number | 'max',

    // Katalog aus config/constants.ts, hier nur um den Laufzeitstand ergänzt.
    shopUpgrades: SHOP_UPGRADE_CATALOG.map((def) => ({ ...def, level: 0 }) as ShopUpgrade),
  }),

  getters: {
    /** Alle CPS-Gebäude — auch ungekaufte. Basis für Auswahllisten (z. B. das
     *  Resonanz-Ziel eines Planeten), die den vollen Katalog zeigen müssen. */
    cpsBuildings(): ShopUpgrade[] {
      return this.shopUpgrades.filter((upgrade) => !!upgrade.baseCPS)
    },

    cpsProducingUpgrades(): ShopUpgrade[] {
      return this.shopUpgrades.filter((upgrade) => upgrade.baseCPS && upgrade.level > 0)
    },

    buildingStats(): BuildingStat[] {
      const gameStore = useGameStore()

      const upgrades = this.cpsProducingUpgrades.map((upgrade) => {
        const currentCPS = (upgrade.baseCPS || 0) * upgrade.level
        const lifetimeProduction =
          gameStore.totalBuildingProduction[upgrade.id] || currentCPS * SECONDS_PER_HOUR

        return {
          id: upgrade.id,
          name: upgrade.name,
          icon: upgrade.icon,
          level: upgrade.level,
          currentCPS,
          lifetimeProduction,
        }
      })

      const totalLifetime = upgrades.reduce(
        (total, building) => total + building.lifetimeProduction,
        0,
      )

      return upgrades
        .map((building): BuildingStat => {
          const productionPercentage =
            totalLifetime > 0 ? (building.lifetimeProduction / totalLifetime) * 100 : 0

          const rawStars = productionPercentage / EFFICIENCY_STARS_DIVISOR
          const efficiencyStars = Math.min(
            EFFICIENCY_STARS_MAX,
            Math.max(EFFICIENCY_STARS_MIN, Math.round(rawStars * 2) / 2),
          )

          return {
            ...building,
            efficiency: Math.round(productionPercentage),
            efficiencyStars,
            productionPercentage,
          }
        })
        .sort((a, b) => b.lifetimeProduction - a.lifetimeProduction)
    },

    totalLifetimeProduction(): number {
      const gameStore = useGameStore()
      return this.cpsProducingUpgrades.reduce((total, upgrade) => {
        const lifetimeProduction =
          gameStore.totalBuildingProduction[upgrade.id] ||
          (upgrade.baseCPS || 0) * upgrade.level * SECONDS_PER_HOUR
        return total + lifetimeProduction
      }, 0)
    },

    topProducer() {
      const top = this.buildingStats[0]
      return top || { name: 'None', icon: '/img/BardAbilities/BardChime.png' }
    },
  },

  actions: {
    setBuyAmount(amount: number | 'max') {
      this.buyAmount = amount
    },

    /**
     * CpS und CpC liegen gecacht im gameStore — nach jeder Änderung an einem
     * Faktor, der sie speist, neu rechnen.
     *
     * Steht hier, weil hier gerechnet wird: die Fassung lag wörtlich gleich im
     * drifterStore und im bardAbilityStore, und mit dem Chronicle wäre sie zum
     * dritten Mal abgeschrieben worden. Beide delegieren jetzt hierher und
     * behalten ihre eigene Action nur als Namen, den ihre Aufrufer schon kennen.
     */
    refreshRates() {
      const gameStore = useGameStore()
      const newCps = this.calculateTotalCPS()
      gameStore.chimesPerSecond = newCps
      gameStore.chimesPerClick = this.calculateTotalCPC()
      useCpsStore().updateCurrentCPS(newCps)
    },

    setBuildingLevel(index: number, value: number) {
      const upgrade = this.shopUpgrades[index]
      if (!upgrade) return
      upgrade.level = Math.max(0, value)
      const gameStore = useGameStore()
      gameStore.chimesPerSecond = this.calculateTotalCPS()
      gameStore.chimesPerClick = this.calculateTotalCPC()
    },

    getMaxAffordableAmount(upgrade: ShopUpgrade): number {
      const gameStore = useGameStore()
      const costMul = gameStore.activeModifier.buildingCostMultiplier ?? 1
      let maxAmount = 0
      let totalCost = 0
      let currentLevel = upgrade.level

      while (true) {
        const nextCost = Math.ceil(
          upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel) * costMul,
        )
        if (totalCost + nextCost > gameStore.chimes) break
        totalCost += nextCost
        maxAmount++
        currentLevel++
      }

      return maxAmount
    },

    getTotalUpgradeCost(upgrade: ShopUpgrade): number {
      let amount = this.buyAmount

      if (amount === 'max') {
        amount = this.getMaxAffordableAmount(upgrade)
      }

      if (typeof amount !== 'number' || amount <= 0) {
        return this.getUpgradeCost(upgrade)
      }

      let totalCost = 0
      let currentLevel = upgrade.level

      const gameStore = useGameStore()
      const costMul = gameStore.activeModifier.buildingCostMultiplier ?? 1

      for (let i = 0; i < amount; i++) {
        const cost = Math.ceil(
          upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel) * costMul,
        )
        totalCost += cost
        currentLevel++
      }

      return totalCost
    },

    buyUpgrade(upgradeId: string): number {
      const gameStore = useGameStore()
      const upgrade = this.shopUpgrades.find((u) => u.id === upgradeId)
      if (!upgrade) return 0

      let amount = this.buyAmount

      if (amount === 'max') {
        amount = this.getMaxAffordableAmount(upgrade)
      }

      if (typeof amount !== 'number' || amount <= 0) {
        amount = 1
      }

      const totalCost = this.getTotalUpgradeCost(upgrade)

      if (gameStore.chimes >= totalCost && amount > 0) {
        gameStore.chimes -= totalCost
        upgrade.level += amount

        if (upgrade.baseCPC != null) {
          gameStore.chimesPerClick = this.calculateTotalCPC()
        }
        if (upgrade.baseCPS != null) {
          const newCPS = this.calculateTotalCPS()
          gameStore.chimesPerSecond = newCPS
          useCpsStore().updateCurrentCPS(newCPS)
        }
        logger.info('Shop', `Bought ${upgrade.name} x${amount}`, {
          cost: totalCost,
          newLevel: upgrade.level,
        })
        return amount
      }
      return 0
    },

    getUpgradeCost(upgrade: ShopUpgrade): number {
      const gameStore = useGameStore()
      const costMul = gameStore.activeModifier.buildingCostMultiplier ?? 1
      return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level) * costMul)
    },

    canAffordUpgrade(upgrade: ShopUpgrade): boolean {
      const gameStore = useGameStore()
      const totalCost = this.getTotalUpgradeCost(upgrade)
      return gameStore.chimes >= totalCost && this.getActualBuyAmount(upgrade) > 0
    },

    getActualBuyAmount(upgrade: ShopUpgrade): number {
      let amount = this.buyAmount
      if (amount === 'max') {
        amount = this.getMaxAffordableAmount(upgrade)
      }
      return typeof amount === 'number' ? Math.max(0, amount) : 0
    },

    calculateTotalCPS(): number {
      const gameStore = useGameStore()
      const augmentStore = useAugmentStore()
      const planetShopStore = usePlanetShopStore()
      const mod = gameStore.activeModifier
      const resonanceMuls = planetShopStore.resonanceTowerBuildingMultipliers
      const baseCPS = this.shopUpgrades.reduce((total, upgrade) => {
        const universeMul = mod.buildingMultipliers?.[upgrade.id] ?? 1
        const resonanceMul = resonanceMuls[upgrade.id] ?? 1
        return total + (upgrade.baseCPS || 0) * upgrade.level * universeMul * resonanceMul
      }, 0)
      const itemStore = useItemStore()
      const bossStore = usePlanetBossStore()
      const synergyStore = useSynergyStore()
      const cpsMul =
        (mod.cpsMultiplier ?? 1) *
        augmentStore.temporaryCPSMultiplier *
        itemStore.totalCPSMultiplier *
        synergyStore.cpsSynergyMultiplier *
        bossStore.cpsPenaltyMultiplier
      const solar = useSolarUpgradeStore()
      const solarCPS = solar.cpsBonus
      const flightMul = solar.flightSpeedMultiplier
      const forgeMul = useStarForgeStore().cpsMult
      const treeMul = useMeepTreeStore().fx.cpsMult
      // Collected drifters (Errant Chime & co.) — timed, expires on its own
      const drifterMul = useDrifterStore().cpsMult
      // Fulfilled omen — timed, and earned in a different system than this one
      const omenMul = useOmenStore().cpsMult
      // Caretaker's Shrine (bard W) — the afterglow of a cast shrine
      const bardMul = useBardAbilityStore().cpsMult
      // Chime Keeper (chronicle) — permanent, earned by lifetime chimes
      const chronicleMul = useAchievementStore().cpsMult
      return Math.floor(
        (baseCPS + solarCPS) *
          gameStore.abilityCPSMultiplier *
          cpsMul *
          flightMul *
          forgeMul *
          treeMul *
          drifterMul *
          omenMul *
          bardMul *
          chronicleMul,
      )
    },

    calculateTotalCPC(): number {
      const gameStore = useGameStore()
      const mod = gameStore.activeModifier

      const solar = useSolarUpgradeStore()
      const upgradeBonus =
        this.shopUpgrades.reduce((total, upgrade) => {
          return total + (upgrade.baseCPC || 0) * upgrade.level
        }, 0) + solar.cpcBonus

      const baseCPC = mod.baseChimesPerClick ?? gameStore.baseChimesPerClick
      const cpcMul = mod.cpcMultiplier ?? 1
      const forge = useStarForgeStore()
      const tree = useMeepTreeStore().fx
      // Resonance / Midas Bell (Star Forge) + Worldbell (Meep Tree): clicks gain a fraction of total CpS
      const fromCpsPct = forge.cpcFromCpsPct + tree.cpcFromCpsPct
      const cpsPortion = fromCpsPct > 0 ? this.calculateTotalCPS() * fromCpsPct : 0
      // Ember Shard (drifter): multiplies the click value, not the CpS portion —
      // that share already carries the drifter CpS multiplier of its own.
      const drifterMul = useDrifterStore().cpcMult
      // Fulfilled omen — same reasoning as the drifter multiplier above.
      const omenMul = useOmenStore().cpcMult
      // Magical Journey (bard E) — the travel window multiplies clicks only,
      // for the same reason the drifter multiplier does: the CpS portion above
      // already carries its own multipliers.
      const bardMul = useBardAbilityStore().cpcMult
      return Math.floor(
        (baseCPC + upgradeBonus) *
          gameStore.abilityCPCMultiplier *
          cpcMul *
          forge.cpcMult *
          tree.cpcMult *
          drifterMul *
          omenMul *
          bardMul +
          cpsPortion,
      )
    },
  },
})
