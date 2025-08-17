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
    // Kauft ein Upgrade wenn genügend Chimes vorhanden sind
    buyUpgrade(upgradeId: string): boolean {
      const gameStore = useGameStore()
      const upgrade = this.shopUpgrades.find((u) => u.id === upgradeId)
      if (!upgrade) return false

      const cost = this.getUpgradeCost(upgrade)
      if (gameStore.chimes >= cost) {
        gameStore.chimes -= cost
        upgrade.level++
        if (upgrade.baseCPC != null) {
          gameStore.chimesPerClick = this.calculateTotalCPC()
          console.log('buyUpgrade gameStore.chimesPerClick: ', gameStore.chimesPerClick)
        }
        if (upgrade.baseCPS != null) {
          gameStore.chimesPerSecond = this.calculateTotalCPS()
          console.log('buyUpgrade gameStore.chimesPerSecond: ', gameStore.chimesPerSecond)
        }
        return true
      }
      return false
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
