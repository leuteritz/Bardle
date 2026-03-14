// Pinia Store Import und GameStore-Dependency für Zustandsverwaltung
import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useCpsStore } from './cpsStore'
import type { ShopUpgrade, BuildingStat } from '../types'

// Icon-Importe für verschiedene Upgrade-Typen im Shop-System
import chimeClickerIcon from '/img/ChimesPerClick.png'
import glockenturmIcon from '/img/Glockenturm.png'
import klanggeneratorIcon from '/img/KlangGenerator.png'
import harmoniewerkIcon from '/img/HarmonieWerk.png'
import sphaerenMusikIcon from '/img/SphaerenMusik.png'
import zeitEchoIcon from '/img/ZeitEcho.png'

export const useShopStore = defineStore('shop', {
  state: () => ({
    // Bestimmt die Anzahl gleichzeitig zu kaufender Upgrades
    buyAmount: 1 as number | 'max',

    // Array aller verfügbaren Shop-Upgrades mit steigenden Kosten und Effekten
    shopUpgrades: [
      {
        id: 'chimeClicker',
        name: 'Klicker', // Erhöht Chimes pro Klick
        baseCost: 50,
        baseCPC: 1,
        level: 0,
        costMultiplier: 1.2,
        icon: chimeClickerIcon,
      } as ShopUpgrade,
      {
        id: 'glockenturm',
        name: 'Glockenturm', // Günstigste automatische Chime-Produktion
        baseCost: 25,
        baseCPS: 1,
        level: 0,
        costMultiplier: 1.15,
        icon: glockenturmIcon,
      } as ShopUpgrade,
      {
        id: 'klanggenerator',
        name: 'Klang Generator', // Mittlere Stufe der automatischen Produktion
        baseCost: 100,
        baseCPS: 3,
        level: 0,
        costMultiplier: 1.2,
        icon: klanggeneratorIcon,
      } as ShopUpgrade,
      {
        id: 'harmoniewerk',
        name: 'Harmonie Werk', // Fortgeschrittene Produktionseinheit
        baseCost: 500,
        baseCPS: 5,
        level: 0,
        costMultiplier: 1.25,
        icon: harmoniewerkIcon,
      } as ShopUpgrade,
      {
        id: 'sphaerenMusik',
        name: 'Sphären Musik', // Hochwertige Produktionseinheit
        baseCost: 2500,
        baseCPS: 10,
        level: 0,
        costMultiplier: 1.3,
        icon: sphaerenMusikIcon,
      } as ShopUpgrade,
      {
        id: 'zeitEcho',
        name: 'Zeit Echo', // Stärkste verfügbare Produktionseinheit
        baseCost: 10000,
        baseCPS: 25,
        level: 0,
        costMultiplier: 1.4,
        icon: zeitEchoIcon,
      } as ShopUpgrade,
    ],
  }),

  getters: {
    // Berechnet detaillierte Statistiken aller aktiven Gebäude mit Effizienz-Sternen
    buildingStats(): BuildingStat[] {
      const gameStore = useGameStore()

      const upgrades = this.shopUpgrades
        .filter((upgrade) => upgrade.baseCPS && upgrade.level > 0)
        .map((upgrade) => {
          const currentCPS = (upgrade.baseCPS || 0) * upgrade.level
          const lifetimeProduction =
            gameStore.totalBuildingProduction[upgrade.id] || currentCPS * 3600

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

          const rawStars = productionPercentage / 20
          const efficiencyStars = Math.min(5, Math.max(0.5, Math.round(rawStars * 2) / 2))

          return {
            ...building,
            efficiency: Math.round(productionPercentage),
            efficiencyStars,
            productionPercentage,
          }
        })
        .sort((a, b) => b.lifetimeProduction - a.lifetimeProduction)
    },

    // Summiert die gesamte Lebenszeit-Produktion aller CPS-Gebäude (ohne Ability-Bonus)
    totalLifetimeProduction(): number {
      const gameStore = useGameStore()
      return this.shopUpgrades
        .filter((upgrade) => upgrade.baseCPS && upgrade.level > 0)
        .reduce((total, upgrade) => {
          const lifetimeProduction =
            gameStore.totalBuildingProduction[upgrade.id] ||
            (upgrade.baseCPS || 0) * upgrade.level * 3600
          return total + lifetimeProduction
        }, 0)
    },

    // Ermittelt das produktivste Gebäude oder Fallback-Werte
    topProducer() {
      const top = this.buildingStats[0]
      return top || { name: 'Keine', icon: '/img/BardAbilities/BardChime.png' }
    },
  },

  actions: {
    // ========== UPGRADE FUNKTIONEN ==========

    // Setzt die gewünschte Kaufmenge für Upgrades
    setBuyAmount(amount: number | 'max') {
      this.buyAmount = amount
    },

    // Setzt das Level eines Gebäudes direkt und berechnet CPS/CPC neu (Admin-Funktion)
    setBuildingLevel(index: number, value: number) {
      const upgrade = this.shopUpgrades[index]
      if (!upgrade) return
      upgrade.level = Math.max(0, value)
      const gameStore = useGameStore()
      gameStore.chimesPerSecond = this.calculateTotalCPS()
      gameStore.chimesPerClick = this.calculateTotalCPC()
    },

    // Berechnet maximale Anzahl eines Upgrades die mit verfügbaren Chimes kaufbar ist
    getMaxAffordableAmount(upgrade: ShopUpgrade): number {
      const gameStore = useGameStore()
      let maxAmount = 0
      let totalCost = 0
      let currentLevel = upgrade.level

      while (true) {
        const nextCost = Math.ceil(
          upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel),
        )
        if (totalCost + nextCost > gameStore.chimes) {
          break
        }
        totalCost += nextCost
        maxAmount++
        currentLevel++
      }

      return maxAmount
    },

    // Berechnet Gesamtkosten für Upgrade-Kauf basierend auf buyAmount
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

      for (let i = 0; i < amount; i++) {
        const cost = Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel))
        totalCost += cost
        currentLevel++
      }

      return totalCost
    },

    // Führt Upgrade-Kauf durch und aktualisiert entsprechende CPC/CPS-Werte
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
        return amount
      }
      return 0
    },

    // Summiert CPS-Werte aller Upgrades und wendet Q-Ability-Bonus an
    calculateTotalCPS(): number {
      const gameStore = useGameStore()
      const baseCPS = this.shopUpgrades.reduce((total, upgrade) => {
        return total + (upgrade.baseCPS || 0) * upgrade.level
      }, 0)
      return Math.floor(baseCPS * gameStore.abilityCPSMultiplier)
    },

    // Summiert CPC-Boni aller Upgrades und wendet R-Ability-Bonus an
    calculateTotalCPC(): number {
      const gameStore = useGameStore()

      const upgradeBonus = this.shopUpgrades.reduce((total, upgrade) => {
        return total + (upgrade.baseCPC || 0) * upgrade.level
      }, 0)

      return Math.floor((gameStore.baseChimesPerClick + upgradeBonus) * gameStore.abilityCPCMultiplier)
    },

    // Berechnet aktuelle Kosten eines Upgrades basierend auf Level
    getUpgradeCost(upgrade: ShopUpgrade): number {
      return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level))
    },

    // Prüft ob Upgrade mit aktuellen Chimes und buyAmount kaufbar ist
    canAffordUpgrade(upgrade: ShopUpgrade): boolean {
      const gameStore = useGameStore()
      const totalCost = this.getTotalUpgradeCost(upgrade)
      return gameStore.chimes >= totalCost && this.getActualBuyAmount(upgrade) > 0
    },

    // Ermittelt tatsächliche Kaufmenge unter Berücksichtigung der max-Option
    getActualBuyAmount(upgrade: ShopUpgrade): number {
      let amount = this.buyAmount
      if (amount === 'max') {
        amount = this.getMaxAffordableAmount(upgrade)
      }
      return typeof amount === 'number' ? Math.max(0, amount) : 0
    },
  },
})
