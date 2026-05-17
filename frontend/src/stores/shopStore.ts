import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useCpsStore } from './cpsStore'
import { useAugmentStore } from './augmentStore'
import { useItemStore } from './itemStore'
import { usePlanetBossStore } from './planetBossStore'
import type { ShopUpgrade, BuildingStat } from '../types'
import { logger } from '../utils/logger'
import { usePlanetShopStore } from './planetShopStore'
import { useSynergyStore } from './synergyStore'
import {
  SECONDS_PER_HOUR,
  EFFICIENCY_STARS_DIVISOR,
  EFFICIENCY_STARS_MAX,
  EFFICIENCY_STARS_MIN,
} from '../config/constants'

const chimeClickerIcon = '/img/ChimesPerClick.png'
const glockenturmIcon = '/img/Glockenturm.png'
const klanggeneratorIcon = '/img/KlangGenerator.png'
const harmoniewerkIcon = '/img/HarmonieWerk.png'
const sphaerenMusikIcon = '/img/SphaerenMusik.png'
const zeitEchoIcon = '/img/ZeitEcho.png'

export const useShopStore = defineStore('shop', {
  state: () => ({
    buyAmount: 1 as number | 'max',

    shopUpgrades: [
      {
        id: 'chimeClicker',
        name: 'Klicker',
        baseCost: 50,
        baseCPC: 1,
        level: 0,
        costMultiplier: 1.2,
        icon: chimeClickerIcon,
      } as ShopUpgrade,
      {
        id: 'glockenturm',
        name: 'Glockenturm',
        baseCost: 25,
        baseCPS: 1,
        level: 0,
        costMultiplier: 1.15,
        icon: glockenturmIcon,
      } as ShopUpgrade,
      {
        id: 'klanggenerator',
        name: 'Klang Generator',
        baseCost: 100,
        baseCPS: 3,
        level: 0,
        costMultiplier: 1.2,
        icon: klanggeneratorIcon,
      } as ShopUpgrade,
      {
        id: 'harmoniewerk',
        name: 'Harmonie Werk',
        baseCost: 500,
        baseCPS: 5,
        level: 0,
        costMultiplier: 1.25,
        icon: harmoniewerkIcon,
      } as ShopUpgrade,
      {
        id: 'sphaerenMusik',
        name: 'Sphären Musik',
        baseCost: 2500,
        baseCPS: 10,
        level: 0,
        costMultiplier: 1.3,
        icon: sphaerenMusikIcon,
      } as ShopUpgrade,
      {
        id: 'zeitEcho',
        name: 'Zeit Echo',
        baseCost: 10000,
        baseCPS: 25,
        level: 0,
        costMultiplier: 1.4,
        icon: zeitEchoIcon,
      } as ShopUpgrade,
    ],
  }),

  getters: {
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
      return top || { name: 'Keine', icon: '/img/BardAbilities/BardChime.png' }
    },
  },

  actions: {
    setBuyAmount(amount: number | 'max') {
      this.buyAmount = amount
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
      return Math.floor(baseCPS * gameStore.abilityCPSMultiplier * cpsMul)
    },

    calculateTotalCPC(): number {
      const gameStore = useGameStore()
      const mod = gameStore.activeModifier

      const upgradeBonus = this.shopUpgrades.reduce((total, upgrade) => {
        return total + (upgrade.baseCPC || 0) * upgrade.level
      }, 0)

      const baseCPC = mod.baseChimesPerClick ?? gameStore.baseChimesPerClick
      const cpcMul = mod.cpcMultiplier ?? 1
      return Math.floor((baseCPC + upgradeBonus) * gameStore.abilityCPCMultiplier * cpcMul)
    },
  },
})
