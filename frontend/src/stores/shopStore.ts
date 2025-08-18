import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import chimeClickerIcon from '/img/ChimesPerClick.png'
import glockenturmIcon from '/img/Glockenturm.png'
import klanggeneratorIcon from '/img/KlangGenerator.png'
import harmoniewerkIcon from '/img/HarmonieWerk.png'
import sphaerenMusikIcon from '/img/SphaerenMusik.png'
import zeitEchoIcon from '/img/ZeitEcho.png'

export const useShopStore = defineStore('shop', {
  state: () => ({
    buyAmount: 1 as number | 'max', // Neue State-Variable
    shopUpgrades: [
      {
        id: 'chimeClicker',
        name: 'Klicker',
        baseCost: 50,
        baseCPC: 1,
        level: 0,
        costMultiplier: 1.2,
        icon: chimeClickerIcon,
      },
      {
        id: 'glockenturm',
        name: 'Glockenturm',
        baseCost: 25,
        baseCPS: 1,
        level: 0,
        costMultiplier: 1.15,
        icon: glockenturmIcon,
      },
      {
        id: 'klanggenerator',
        name: 'Klang Generator',
        baseCost: 100,
        baseCPS: 3,
        level: 0,
        costMultiplier: 1.2,
        icon: klanggeneratorIcon,
      },
      {
        id: 'harmoniewerk',
        name: 'Harmonie Werk',
        baseCost: 500,
        baseCPS: 5,
        level: 0,
        costMultiplier: 1.25,
        icon: harmoniewerkIcon,
      },
      {
        id: 'sphaerenMusik',
        name: 'Sphären Musik',
        baseCost: 2500,
        baseCPS: 10,
        level: 0,
        costMultiplier: 1.3,
        icon: sphaerenMusikIcon,
      },
      {
        id: 'zeitEcho',
        name: 'Zeit Echo',
        baseCost: 10000,
        baseCPS: 25,
        level: 0,
        costMultiplier: 1.4,
        icon: zeitEchoIcon,
      },
    ],
  }),
  actions: {
    // Setzt die gewählte Kaufmenge
    setBuyAmount(amount: number | 'max') {
      this.buyAmount = amount
    },

    // Berechnet wie viele Upgrades maximal gekauft werden können
    getMaxAffordableAmount(upgrade: any): number {
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

    // Berechnet die Gesamtkosten für den Kauf basierend auf buyAmount
    getTotalUpgradeCost(upgrade: any): number {
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

    // Erweiterte buyUpgrade-Funktion für mehrere Käufe
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
          console.log('buyUpgrade gameStore.chimesPerClick: ', gameStore.chimesPerClick)
        }
        if (upgrade.baseCPS != null) {
          gameStore.chimesPerSecond = this.calculateTotalCPS()
          console.log('buyUpgrade gameStore.chimesPerSecond: ', gameStore.chimesPerSecond)
        }
        return amount
      }
      return 0
    },

    // Berechnet die Gesamtanzahl der Chimes pro Sekunde
    calculateTotalCPS(): number {
      return this.shopUpgrades.reduce((total, upgrade) => {
        return total + (upgrade.baseCPS || 0) * upgrade.level
      }, 0)
    },

    // Berechnet die Gesamtanzahl der Chimes pro Klick
    calculateTotalCPC(): number {
      const gameStore = useGameStore()

      const upgradeBonus = this.shopUpgrades.reduce((total, upgrade) => {
        return total + (upgrade.baseCPC || 0) * upgrade.level
      }, 0)

      return gameStore.baseChimesPerClick + upgradeBonus
    },

    // Berechnet den aktuellen Preis für ein einzelnes Upgrade
    getUpgradeCost(upgrade: any): number {
      return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level))
    },

    // Prüft ob der Spieler sich die gewählte Anzahl an Upgrades leisten kann
    canAffordUpgrade(upgrade: any): boolean {
      const gameStore = useGameStore()
      const totalCost = this.getTotalUpgradeCost(upgrade)
      return gameStore.chimes >= totalCost && this.getActualBuyAmount(upgrade) > 0
    },

    // Hilfsfunktion um die tatsächliche Kaufmenge zu ermitteln
    getActualBuyAmount(upgrade: any): number {
      let amount = this.buyAmount
      if (amount === 'max') {
        amount = this.getMaxAffordableAmount(upgrade)
      }
      return typeof amount === 'number' ? Math.max(0, amount) : 0
    },
  },
})
