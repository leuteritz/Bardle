// Pinia Store Import und GameStore-Dependency für Zustandsverwaltung
import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useCpsStore } from './cpsStore'
import type { ShopUpgrade, BuildingStat, PermanentUpgrade } from '../types'

// Icon-Importe für verschiedene Upgrade-Typen im Shop-System
const chimeClickerIcon = '/img/ChimesPerClick.png'
const glockenturmIcon = '/img/Glockenturm.png'
const klanggeneratorIcon = '/img/KlangGenerator.png'
const harmoniewerkIcon = '/img/HarmonieWerk.png'
const sphaerenMusikIcon = '/img/SphaerenMusik.png'
const zeitEchoIcon = '/img/ZeitEcho.png'

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

    // Einmalige Upgrades — dauerhafter Effekt nach einmaligem Kauf
    permanentUpgrades: [
      {
        id: 'klick-training',
        name: 'Klick Training',
        description: 'Grundlegende Klick-Technik — erhöht Chimes pro Klick um 10 %.',
        icon: '👆',
        cost: 200,
        purchased: false,
        effect: { type: 'cpcMultiplier', value: 1.1 },
      },
      {
        id: 'goldener-rhythmus',
        name: 'Goldener Rhythmus',
        description: 'Jeder Klick bringt 50 % mehr Chimes durch goldene Harmonie.',
        icon: '✨',
        cost: 1500,
        purchased: false,
        effect: { type: 'cpcMultiplier', value: 1.5 },
      },
      {
        id: 'meister-klick',
        name: 'Meister Klick',
        description: 'Meisterhafter Klick-Stil — verdoppelt dauerhaft die Chimes pro Klick.',
        icon: '💥',
        cost: 8000,
        purchased: false,
        effect: { type: 'cpcMultiplier', value: 2 },
      },
      {
        id: 'rhythmus-boost',
        name: 'Rhythmus Boost',
        description: 'Erhöht die Gesamtproduktion aller Gebäude um 15 %.',
        icon: '🎵',
        cost: 500,
        purchased: false,
        effect: { type: 'cpsMultiplier', value: 1.15 },
      },
      {
        id: 'chime-resonanz',
        name: 'Chime Resonanz',
        description: 'Resonante Schwingungen verstärken die Chime-Produktion um 25 %.',
        icon: '🔔',
        cost: 3000,
        purchased: false,
        effect: { type: 'cpsMultiplier', value: 1.25 },
      },
      {
        id: 'bardischer-nachhall',
        name: 'Bardischer Nachhall',
        description: 'Bards Musik hallt durch die Dimensionen — verdoppelt dauerhaft alle CPS.',
        icon: '🎶',
        cost: 75000,
        purchased: false,
        effect: { type: 'cpsMultiplier', value: 2 },
      },
      {
        id: 'glockenturm-resonanz',
        name: 'Glockenturm Resonanz',
        description: 'Glockentürme resonieren synchron und verdoppeln ihre Produktion.',
        icon: '🏰',
        cost: 2000,
        purchased: false,
        effect: { type: 'buildingBoost', value: 2, buildingId: 'glockenturm' },
        requirement: { buildingId: 'glockenturm', minLevel: 10 },
      },
      {
        id: 'klang-synchro',
        name: 'Klang Synchro',
        description: 'Klang Generatoren arbeiten in perfekter Synchronisation und erzeugen doppelt so viele Chimes.',
        icon: '🔊',
        cost: 8000,
        purchased: false,
        effect: { type: 'buildingBoost', value: 2, buildingId: 'klanggenerator' },
        requirement: { buildingId: 'klanggenerator', minLevel: 5 },
      },
      {
        id: 'harmonisches-gleichgewicht',
        name: 'Harmonisches Gleichgewicht',
        description: 'Harmonie Werke erreichen perfektes Gleichgewicht und produzieren doppelt so viele Chimes.',
        icon: '⚖️',
        cost: 30000,
        purchased: false,
        effect: { type: 'buildingBoost', value: 2, buildingId: 'harmoniewerk' },
        requirement: { buildingId: 'harmoniewerk', minLevel: 5 },
      },
      {
        id: 'sphären-resonanz',
        name: 'Sphären Resonanz',
        description: 'Sphären Musiken schwingen im kosmischen Einklang und verdoppeln ihre Ausgabe.',
        icon: '🌠',
        cost: 150000,
        purchased: false,
        effect: { type: 'buildingBoost', value: 2, buildingId: 'sphaerenMusik' },
        requirement: { buildingId: 'sphaerenMusik', minLevel: 3 },
      },
      {
        id: 'zeitkompression',
        name: 'Zeitkompression',
        description: 'Zeit Echos komprimieren die Zeitlinie und verdoppeln dauerhaft ihre Chime-Produktion.',
        icon: '⏳',
        cost: 800000,
        purchased: false,
        effect: { type: 'buildingBoost', value: 2, buildingId: 'zeitEcho' },
        requirement: { buildingId: 'zeitEcho', minLevel: 3 },
      },
    ] as PermanentUpgrade[],
  }),

  getters: {
    // Produkt aller gekauften cpsMultiplier-Effekte aus permanentUpgrades
    permanentCPSMultiplier(): number {
      return this.permanentUpgrades
        .filter((u) => u.purchased && u.effect.type === 'cpsMultiplier')
        .reduce((product, u) => product * u.effect.value, 1)
    },

    // Produkt aller gekauften cpcMultiplier-Effekte aus permanentUpgrades
    permanentCPCMultiplier(): number {
      return this.permanentUpgrades
        .filter((u) => u.purchased && u.effect.type === 'cpcMultiplier')
        .reduce((product, u) => product * u.effect.value, 1)
    },

    // Gibt alle Upgrades zurück die CPS produzieren und mindestens Level 1 haben
    cpsProducingUpgrades(): ShopUpgrade[] {
      return this.shopUpgrades.filter((upgrade) => upgrade.baseCPS && upgrade.level > 0)
    },

    // Berechnet detaillierte Statistiken aller aktiven Gebäude mit Effizienz-Sternen
    buildingStats(): BuildingStat[] {
      const gameStore = useGameStore()

      const upgrades = this.cpsProducingUpgrades
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
      return this.cpsProducingUpgrades
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
      const costMul = gameStore.activeModifier.buildingCostMultiplier ?? 1
      let maxAmount = 0
      let totalCost = 0
      let currentLevel = upgrade.level

      while (true) {
        const nextCost = Math.ceil(
          upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel) * costMul,
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

      const gameStore = useGameStore()
      const costMul = gameStore.activeModifier.buildingCostMultiplier ?? 1

      for (let i = 0; i < amount; i++) {
        const cost = Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel) * costMul)
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

    // Berechnet Multiplikator für ein bestimmtes Gebäude aus permanentUpgrades
    getPermanentBuildingMultiplier(buildingId: string): number {
      return this.permanentUpgrades
        .filter(
          (u) => u.purchased && u.effect.type === 'buildingBoost' && u.effect.buildingId === buildingId,
        )
        .reduce((product, u) => product * u.effect.value, 1)
    },

    // Prüft ob die Gebäude-Bedingung eines permanentUpgrades erfüllt ist
    isPermanentUpgradeRequirementMet(id: string): boolean {
      const upgrade = this.permanentUpgrades.find((u) => u.id === id)
      if (!upgrade?.requirement) return true
      const building = this.shopUpgrades.find((u) => u.id === upgrade.requirement!.buildingId)
      return !!building && building.level >= upgrade.requirement.minLevel
    },

    // Prüft ob ein permanentUpgrade kaufbar ist (nicht gekauft, Bedingung erfüllt, genug Chimes)
    canAffordPermanentUpgrade(id: string): boolean {
      const upgrade = this.permanentUpgrades.find((u) => u.id === id)
      if (!upgrade || upgrade.purchased) return false
      if (!this.isPermanentUpgradeRequirementMet(id)) return false
      const gameStore = useGameStore()
      return gameStore.chimes >= upgrade.cost
    },

    // Kauft ein permanentUpgrade und wendet den Effekt sofort an
    buyPermanentUpgrade(id: string): boolean {
      const upgrade = this.permanentUpgrades.find((u) => u.id === id)
      if (!upgrade || upgrade.purchased) return false
      if (!this.isPermanentUpgradeRequirementMet(id)) return false
      const gameStore = useGameStore()
      if (gameStore.chimes < upgrade.cost) return false
      gameStore.chimes -= upgrade.cost
      upgrade.purchased = true
      gameStore.chimesPerSecond = this.calculateTotalCPS()
      gameStore.chimesPerClick = this.calculateTotalCPC()
      return true
    },

    // Summiert CPS-Werte aller Upgrades und wendet Q-Ability-Bonus an
    calculateTotalCPS(): number {
      const gameStore = useGameStore()
      const mod = gameStore.activeModifier
      const baseCPS = this.shopUpgrades.reduce((total, upgrade) => {
        const universeMul = mod.buildingMultipliers?.[upgrade.id] ?? 1
        const permBuildingMul = this.getPermanentBuildingMultiplier(upgrade.id)
        return total + (upgrade.baseCPS || 0) * upgrade.level * universeMul * permBuildingMul
      }, 0)
      const cpsMul = (mod.cpsMultiplier ?? 1) * this.permanentCPSMultiplier
      return Math.floor(baseCPS * gameStore.abilityCPSMultiplier * cpsMul)
    },

    // Summiert CPC-Boni aller Upgrades und wendet R-Ability-Bonus an
    calculateTotalCPC(): number {
      const gameStore = useGameStore()
      const mod = gameStore.activeModifier

      const upgradeBonus = this.shopUpgrades.reduce((total, upgrade) => {
        return total + (upgrade.baseCPC || 0) * upgrade.level
      }, 0)

      const baseCPC = mod.baseChimesPerClick ?? gameStore.baseChimesPerClick
      const cpcMul = (mod.cpcMultiplier ?? 1) * this.permanentCPCMultiplier
      return Math.floor(
        (baseCPC + upgradeBonus) * gameStore.abilityCPCMultiplier * cpcMul,
      )
    },

    // Berechnet aktuelle Kosten eines Upgrades basierend auf Level
    getUpgradeCost(upgrade: ShopUpgrade): number {
      const gameStore = useGameStore()
      const costMul = gameStore.activeModifier.buildingCostMultiplier ?? 1
      return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level) * costMul)
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
