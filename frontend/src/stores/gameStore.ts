import { defineStore } from 'pinia'
import { useShopStore } from './shopStore'
import { universes } from '../config/universes'
import { LEVEL_BASE, LEVEL_EXPONENT, MEEP_BASE_COST, MEEP_COST_EXPONENT } from '../config/constants'
import type { BuildingProduction, TotalBuildingProduction, ShopUpgrade } from '../types'

function chimeThresholdForLevel(level: number): number {
  return level > 0 ? Math.ceil(LEVEL_BASE * Math.pow(level, LEVEL_EXPONENT)) : 0
}

let _shopStore: ReturnType<typeof useShopStore> | null = null

export const useGameStore = defineStore('game', {
  state: () => ({
    gameSpeed: 1000,
    inGameTime: 0,

    chimes: 0,
    chimesPerSecond: 0,
    chimesForNextLevel: LEVEL_BASE,
    chimesPerClick: 20,
    baseChimesPerClick: 20,
    chimesForMeep: 0,
    chimesForNextUniverse: 0,
    chimesToUniverseRescue: 100000,
    meeps: 0,
    meepChimeRequirement: MEEP_BASE_COST,

    level: 1,

    skillPoints: 0,
    abilityLevels: [0, 0, 0, 0], // Q=CPS, W=Power, E=MeepCost, R=CPC

    currentUniverse: 1,
    prestigeAvailable: false,

    buildingProductionHistory: {} as BuildingProduction,
    totalBuildingProduction: {} as TotalBuildingProduction,

    // Modal Status für UI-Effekte
    isCPSModalOpen: false,
  }),
  actions: {
    // Fügt einen Meep hinzu wenn genügend Chimes gesammelt wurden
    addMeep() {
      if (this.chimesForMeep >= this.meepChimeRequirement) {
        setTimeout(() => {
          this.meeps += 1
          const baseCost = Math.max(
            MEEP_BASE_COST,
            Math.ceil(MEEP_BASE_COST * Math.pow(this.meeps, MEEP_COST_EXPONENT)),
          )
          this.meepChimeRequirement = Math.ceil(baseCost * this.abilityMeepCostMultiplier)
          this.chimesForMeep = 0
        }, 100)
      }
    },

    // Fügt Chimes hinzu und aktualisiert alle abhängigen Werte
    addChime() {
      this.chimes += this.chimesPerClick
      this.chimesForMeep += this.chimesPerClick
      this.chimesForNextUniverse += this.chimesPerClick
      this.calculateLevel()
      this.addMeep()
      this.checkPrestigeAvailability()
    },

    // Berechnet das aktuelle Level basierend auf gesammelten Chimes
    calculateLevel() {
      while (this.chimes >= this.chimesForNextLevel) {
        this.level++
        this.chimesForNextLevel = Math.ceil(LEVEL_BASE * Math.pow(this.level, LEVEL_EXPONENT))
        if (this.level % 2 === 0) {
          this.skillPoints++
        }
      }
    },

    // Erhöht das Level einer Fähigkeit wenn Skillpunkte verfügbar sind
    upgradeAbility(index) {
      const maxLevel = 5
      if (this.skillPoints > 0 && this.abilityLevels[index] < maxLevel) {
        this.abilityLevels[index]++
        this.skillPoints--
        // Recalculate CPS and CPC after ability upgrade
        if (!_shopStore) _shopStore = useShopStore()
        this.chimesPerSecond = _shopStore.calculateTotalCPS()
        this.chimesPerClick = _shopStore.calculateTotalCPC()
      }
    },

    trackBuildingProduction() {
      // Dynamischer Import um Zirkular-Dependency zu vermeiden
      if (!_shopStore) _shopStore = useShopStore()
      const shopStore = _shopStore

      shopStore.shopUpgrades.forEach((upgrade: ShopUpgrade) => {
        if (upgrade.baseCPS && upgrade.level > 0) {
          const production = (upgrade.baseCPS || 0) * upgrade.level

          // Initialisiere Arrays falls nicht vorhanden
          if (!this.buildingProductionHistory[upgrade.id]) {
            this.buildingProductionHistory[upgrade.id] = []
            this.totalBuildingProduction[upgrade.id] = 0
          }

          // Füge aktuelle Produktion zur Historie hinzu
          this.buildingProductionHistory[upgrade.id].push(production)
          this.totalBuildingProduction[upgrade.id] += production

          // Begrenze Historie auf letzte 60 Einträge
          if (this.buildingProductionHistory[upgrade.id].length > 60) {
            this.buildingProductionHistory[upgrade.id].shift()
          }
        }
      })
    },

    // Prüft ob Prestige verfügbar ist
    checkPrestigeAvailability() {
      if (
        !this.prestigeAvailable &&
        this.chimesForNextUniverse >= this.chimesToUniverseRescue &&
        this.currentUniverse < this.totalUniverses
      ) {
        this.prestigeAvailable = true
      }
    },

    // Führt Prestige durch: wechselt Universum und setzt Spielstand zurück
    triggerPrestige() {
      if (!this.prestigeAvailable || this.currentUniverse >= this.totalUniverses) return
      this.currentUniverse++
      this.chimesToUniverseRescue = Math.ceil(this.chimesToUniverseRescue * 2)
      this.chimesForNextUniverse = 0
      this.prestigeAvailable = false
      // Reset resources
      this.chimes = 0
      this.chimesForMeep = 0
      this.level = 1
      this.chimesForNextLevel = LEVEL_BASE
      this.meeps = 0
      this.meepChimeRequirement = MEEP_BASE_COST
      this.skillPoints = 0
      this.abilityLevels = [0, 0, 0, 0]
      this.buildingProductionHistory = {}
      this.totalBuildingProduction = {}
      // Reset shop buildings and recalculate
      if (!_shopStore) _shopStore = useShopStore()
      _shopStore.shopUpgrades.forEach((u) => {
        u.level = 0
      })
      this.chimesPerSecond = _shopStore.calculateTotalCPS()
      this.chimesPerClick = _shopStore.calculateTotalCPC()
    },

    // Verarbeitet passive Einnahmen pro Sekunde
    tick() {
      this.inGameTime++
      const cps = this.chimesPerSecond
      if (cps > 0) {
        this.chimes += cps
        this.chimesForMeep += cps
        this.chimesForNextUniverse += cps
        this.calculateLevel()
        this.addMeep()
        this.trackBuildingProduction()
      }
      this.checkPrestigeAvailability()
    },

    // Setzt den Modal-Status für UI-Effekte
    setCPSModalOpen(isOpen: boolean) {
      this.isCPSModalOpen = isOpen
    },
  },

  getters: {
    // Berechnet die verbleibenden Chimes bis zum nächsten Level
    chimesToNextLevel(): number {
      return this.chimesForNextLevel - this.chimes
    },

    // Berechnet den Fortschritt im aktuellen Level als Prozent
    levelProgress(): number {
      const chimesForCurrentLevel = chimeThresholdForLevel(this.level - 1)
      const currentLevelChimes = this.chimes - chimesForCurrentLevel
      const totalChimesThisLevel = this.chimesForNextLevel - chimesForCurrentLevel
      return Math.min(100, Math.max(0, (currentLevelChimes / totalChimesThisLevel) * 100))
    },

    // Berechnet die Chimes die im aktuellen Level gesammelt wurden
    currentLevelChimes(): number {
      const chimesForCurrentLevel = chimeThresholdForLevel(this.level - 1)
      return this.chimes - chimesForCurrentLevel
    },

    // Berechnet die Gesamtanzahl der Chimes die für das aktuelle Level benötigt werden
    totalChimesThisLevel(): number {
      const chimesForCurrentLevel = chimeThresholdForLevel(this.level - 1)
      return this.chimesForNextLevel - chimesForCurrentLevel
    },

    // Berechnet die Gesamtkampfkraft des Spielers
    totalPower(): number {
      return this.meeps * 100 + this.abilityPowerBonus
    },

    // Ability-Multiplikatoren für Q/W/E/R-Effekte
    abilityCPSMultiplier(): number {
      return 1 + this.abilityLevels[0] * 0.15 // Q: +15% CPS pro Level
    },
    abilityPowerBonus(): number {
      return this.abilityLevels[1] * 300 // W: +300 Kampfkraft pro Level
    },
    abilityMeepCostMultiplier(): number {
      return Math.max(0.5, 1 - this.abilityLevels[2] * 0.1) // E: -10% Meep-Kosten pro Level
    },
    abilityCPCMultiplier(): number {
      return 1 + this.abilityLevels[3] * 0.25 // R: +25% CPC pro Level
    },

    // Berechnet den Fortschritt zur Universumsrettung als Prozent
    universeRescueProgress(): number {
      return Math.min(100, (this.chimesForNextUniverse / this.chimesToUniverseRescue) * 100)
    },

    // Gibt die Gesamtanzahl der Universen zurück
    totalUniverses(): number {
      return universes.length
    },
  },
})
