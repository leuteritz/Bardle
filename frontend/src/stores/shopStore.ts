import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'

export const useShopStore = defineStore('shop', {
  state: () => ({
    shopUpgrades: [
      {
        id: 'chimeCollector',
        name: 'Chime Sammler',
        baseCost: 25,
        baseCPS: 1,
        level: 0,

        costMultiplier: 1.15,
        icon: '🔔',
      },
      {
        id: 'meepFactory',
        name: 'Meep Fabrik',
        baseCost: 100,
        baseCPS: 3,
        level: 0,
        costMultiplier: 1.2,
        icon: '🌟',
      },
      {
        id: 'goldMine',
        name: 'Gold Mine',
        baseCost: 500,
        baseCPS: 5,
        level: 0,
        costMultiplier: 1.25,
        icon: '💰',
      },
      {
        id: 'cosmicPortal',
        name: 'Kosmisches Portal',
        baseCost: 2500,
        baseCPS: 10,
        level: 0,
        costMultiplier: 1.3,
        icon: '🌀',
      },
      {
        id: 'timeAccelerator',
        name: 'Zeit Beschleuniger',
        baseCost: 10000,
        baseCPS: 25,
        level: 0,
        costMultiplier: 1.4,
        icon: '⏰',
      },
    ],
  }),
  actions: {
    // Kauft ein Upgrade wenn genügend Chimes vorhanden sind
    buyUpgrade(upgradeId: string): boolean {
      const gameStore = useGameStore()
      const upgrade = this.shopUpgrades.find((u) => u.id === upgradeId)
      if (!upgrade) return false

      const cost = this.getUpgradeCost(upgrade)
      if (gameStore.chimes >= cost) {
        gameStore.chimes -= cost
        upgrade.level++
        gameStore.chimesPerSecond = this.calculateTotalCPS()
        return true
      }
      return false
    },

    // Berechnet die Gesamtanzahl der Chimes pro Sekunde
    calculateTotalCPS(): number {
      return this.shopUpgrades.reduce((total, upgrade) => {
        return total + upgrade.baseCPS * upgrade.level
      }, 0)
    },

    // Berechnet den aktuellen Preis für ein Upgrade
    getUpgradeCost(upgrade: any): number {
      return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level))
    },

    // Prüft ob der Spieler sich ein Upgrade leisten kann
    canAffordUpgrade(upgrade: any): boolean {
      const gameStore = useGameStore()
      return gameStore.chimes >= this.getUpgradeCost(upgrade)
    },
  },
})
