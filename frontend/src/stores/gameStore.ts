import { defineStore } from 'pinia'
import { useShopStore } from './shopStore'
import { usePlanetEventStore } from './planetEventStore'
import { universes } from '../config/universes'
import {
  LEVEL_BASE,
  LEVEL_EXPONENT,
  MEEP_BASE_COST,
  MEEP_COST_EXPONENT,
  MAX_ABILITY_LEVEL,
} from '../config/constants'
import type { BuildingProduction, TotalBuildingProduction, ShopUpgrade, Expedition, ModifierEffects } from '../types'

function chimeThresholdForLevel(level: number, exponent: number = LEVEL_EXPONENT): number {
  return level > 0 ? Math.ceil(LEVEL_BASE * Math.pow(level, exponent)) : 0
}

let _shopStore: ReturnType<typeof useShopStore> | null = null
let _planetEventStore: ReturnType<typeof usePlanetEventStore> | null = null

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
    isExpeditionModalOpen: false,
    isEncyclopediaOpen: false,

    activeExpedition: null as Expedition | null,
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
          const meepCostMod = this.activeModifier.meepCostMultiplier ?? 1
          this.meepChimeRequirement = Math.ceil(baseCost * this.abilityMeepCostMultiplier * meepCostMod)
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
      const exponent = this.activeModifier.levelExponent ?? LEVEL_EXPONENT
      const spInterval = this.activeModifier.skillPointInterval ?? 2
      while (this.chimes >= this.chimesForNextLevel) {
        this.level++
        this.chimesForNextLevel = Math.ceil(LEVEL_BASE * Math.pow(this.level, exponent))
        if (this.level % spInterval === 0) {
          this.skillPoints++
        }
      }
    },

    // Setzt das Level einer Fähigkeit direkt (Admin-Funktion)
    setAbilityLevel(index: number, value: number) {
      const maxLevel = this.activeModifier.maxAbilityLevel ?? MAX_ABILITY_LEVEL
      this.abilityLevels[index] = Math.max(0, Math.min(maxLevel, value))
      if (!_shopStore) _shopStore = useShopStore()
      this.chimesPerSecond = _shopStore.calculateTotalCPS()
      this.chimesPerClick = _shopStore.calculateTotalCPC()
    },

    // Erhöht das Level einer Fähigkeit wenn Skillpunkte verfügbar sind
    upgradeAbility(index) {
      const maxLevel = this.activeModifier.maxAbilityLevel ?? MAX_ABILITY_LEVEL
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
      if (!_planetEventStore) _planetEventStore = usePlanetEventStore()
      _planetEventStore.checkAndMaybeSpawnEvent(this.inGameTime, this.universeRescueProgress)
    },

    // Setzt den Modal-Status für UI-Effekte
    setCPSModalOpen(isOpen: boolean) {
      this.isCPSModalOpen = isOpen
    },

    setExpeditionModalOpen(isOpen: boolean) {
      this.isExpeditionModalOpen = isOpen
    },

    toggleEncyclopedia() {
      this.isEncyclopediaOpen = !this.isEncyclopediaOpen
    },

    // Schickt Meeps auf eine Portal-Expedition
    startExpedition(
      universeId: number,
      universeName: string,
      meepsSent: number,
      durationMs: number,
      reward: number,
    ) {
      if (this.activeExpedition || meepsSent < 1 || meepsSent > this.meeps) return
      this.meeps -= meepsSent
      this.activeExpedition = {
        universeId,
        universeName,
        meepsSent,
        startTime: Date.now(),
        durationMs,
        reward,
        collected: false,
      }
    },

    // Sammelt abgeschlossene Expedition ein
    collectExpedition() {
      if (!this.activeExpedition) return
      if (Date.now() < this.activeExpedition.startTime + this.activeExpedition.durationMs) return
      this.chimes += this.activeExpedition.reward
      this.meeps += this.activeExpedition.meepsSent
      this.activeExpedition = null
      this.calculateLevel()
    },
  },

  getters: {
    // Aktiver Universe-Modifier (leer wenn Universe 1)
    activeModifier(): ModifierEffects {
      return universes[this.currentUniverse - 1]?.modifier?.effects ?? {}
    },

    // Berechnet die verbleibenden Chimes bis zum nächsten Level
    chimesToNextLevel(): number {
      return this.chimesForNextLevel - this.chimes
    },

    // Schwellenwert am Anfang des aktuellen Levels (gemeinsame Basis)
    chimesAtLevelStart(): number {
      const exponent = this.activeModifier.levelExponent ?? LEVEL_EXPONENT
      return chimeThresholdForLevel(this.level - 1, exponent)
    },

    // Berechnet die Chimes die im aktuellen Level gesammelt wurden
    currentLevelChimes(): number {
      return this.chimes - this.chimesAtLevelStart
    },

    // Berechnet die Gesamtanzahl der Chimes die für das aktuelle Level benötigt werden
    totalChimesThisLevel(): number {
      return this.chimesForNextLevel - this.chimesAtLevelStart
    },

    // Berechnet den Fortschritt im aktuellen Level als Prozent
    levelProgress(): number {
      return Math.min(
        100,
        Math.max(0, (this.currentLevelChimes / this.totalChimesThisLevel) * 100),
      )
    },

    // Berechnet die Gesamtkampfkraft des Spielers
    totalPower(): number {
      const meepPowerMod = this.activeModifier.meepPowerMultiplier ?? 1
      const eloPowerMod = this.activeModifier.eloPowerMultiplier ?? 1
      return Math.floor((this.meeps * 100 * meepPowerMod + this.abilityPowerBonus) * eloPowerMod)
    },

    // Ability-Multiplikatoren für Q/W/E/R-Effekte
    abilityCPSMultiplier(): number {
      const perLevel = this.activeModifier.abilityCPSPerLevel ?? 0.15
      return 1 + this.abilityLevels[0] * perLevel
    },
    abilityPowerBonus(): number {
      const perLevel = this.activeModifier.abilityPowerPerLevel ?? 300
      return this.abilityLevels[1] * perLevel
    },
    abilityMeepCostMultiplier(): number {
      const perLevel = this.activeModifier.abilityMeepCostPerLevel ?? 0.1
      return Math.max(0.5, 1 - this.abilityLevels[2] * perLevel)
    },
    abilityCPCMultiplier(): number {
      const perLevel = this.activeModifier.abilityCPCPerLevel ?? 0.25
      return 1 + this.abilityLevels[3] * perLevel
    },

    // Berechnet den Fortschritt zur Universumsrettung als Prozent
    universeRescueProgress(): number {
      return Math.min(100, (this.chimesForNextUniverse / this.chimesToUniverseRescue) * 100)
    },

    // Gibt die Gesamtanzahl der Universen zurück
    totalUniverses(): number {
      return universes.length
    },

    // Ob die aktive Expedition abgeschlossen ist
    isExpeditionComplete(): boolean {
      if (!this.activeExpedition) return false
      return Date.now() >= this.activeExpedition.startTime + this.activeExpedition.durationMs
    },

    // Fortschritt der aktiven Expedition in Prozent (0–100)
    expeditionProgress(): number {
      if (!this.activeExpedition) return 0
      const elapsed = Date.now() - this.activeExpedition.startTime
      return Math.min(100, (elapsed / this.activeExpedition.durationMs) * 100)
    },
  },
})
