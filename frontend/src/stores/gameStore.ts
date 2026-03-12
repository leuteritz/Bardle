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

    gold: 0,
    level: 1,

    skillPoints: 0,
    abilityLevels: [0, 0, 0, 0], // Q, W, E, R

    currentUniverse: 1,

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
          this.meepChimeRequirement = Math.max(
            MEEP_BASE_COST,
            Math.ceil(MEEP_BASE_COST * Math.pow(this.meeps, MEEP_COST_EXPONENT)),
          )
          this.chimesForMeep = 0
        }, 100)
      }
    },

    // Fügt Gold hinzu
    addGold() {
      this.gold++
    },

    // Fügt Chimes hinzu und aktualisiert alle abhängigen Werte
    addChime() {
      this.chimes += this.chimesPerClick
      this.chimesForMeep += this.chimesPerClick
      this.chimesForNextUniverse += this.chimesPerClick
      this.calculateLevel()
      this.addMeep()
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
      return this.meeps * 100 + this.gold * 1000 + this.chimes * 1000
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
