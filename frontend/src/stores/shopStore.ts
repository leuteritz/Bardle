// Pinia Store Import und GameStore-Dependency für Zustandsverwaltung
import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'

// Icon-Importe für verschiedene Upgrade-Typen im Shop-System
import chimeClickerIcon from '/img/ChimesPerClick.png'
import glockenturmIcon from '/img/Glockenturm.png'
import klanggeneratorIcon from '/img/KlangGenerator.png'
import harmoniewerkIcon from '/img/HarmonieWerk.png'
import sphaerenMusikIcon from '/img/SphaerenMusik.png'
import zeitEchoIcon from '/img/ZeitEcho.png'

// Definiert die Struktur eines Shop-Upgrades mit Kosten, Level und Multiplikator
interface ShopUpgrade {
  id: string
  name: string
  baseCost: number
  baseCPC?: number
  baseCPS?: number
  level: number
  costMultiplier: number
  icon: string
}

// Definiert Statistik-Daten für Gebäude mit Effizienz und Produktionsanteil
interface BuildingStat {
  id: string
  name: string
  icon: string
  level: number
  currentCPS: number
  lifetimeProduction: number
  efficiency: number
  efficiencyStars: number
  productionPercentage: number
}

// Definiert Zeitraum-Konfiguration für CPS-Analyse mit Intervall und Datenpunkten
interface TimePeriod {
  key: string
  label: string
  duration: number
  interval: number
  dataPoints: number
}

export const useShopStore = defineStore('shop', {
  state: () => ({
    // Bestimmt die Anzahl gleichzeitig zu kaufender Upgrades
    buyAmount: 1 as number | 'max',

    // CPS-Analyse Daten
    // Aktuell ausgewählter Zeitraum für Produktions-Diagramm
    selectedTimePeriod: '1min' as string,
    // Startzeitpunkt für das CPS-Tracking-System
    startTime: Date.now(),

    // Speichert CPS-Verlaufsdaten für verschiedene Zeiträume als Array
    productionHistories: {
      '1min': Array(60).fill(0),
      '10min': Array(60).fill(0),
      '1h': Array(60).fill(0),
    } as Record<string, number[]>,

    // Verfolgt letzte Update-Zeitpunkte für jeden Tracking-Zeitraum
    lastUpdateTimes: {
      '1min': 0,
      '10min': 0,
      '1h': 0,
    } as Record<string, number>,

    // Referenz für den Haupt-Timer der CPS-Verfolgung
    mainTimer: null as ReturnType<typeof setInterval> | null,

    // Konfiguration verfügbarer Zeiträume für CPS-Analyse
    timePeriods: [
      {
        key: '1min',
        label: '1 Minute',
        duration: 60,
        interval: 1000,
        dataPoints: 60,
      },
      {
        key: '10min',
        label: '10 Minuten',
        duration: 600,
        interval: 10000,
        dataPoints: 60,
      },
      {
        key: '1h',
        label: '1 Stunde',
        duration: 3600,
        interval: 60000,
        dataPoints: 60,
      },
    ] as TimePeriod[],

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

    // Summiert die gesamte Lebenszeit-Produktion aller CPS-Gebäude
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

    // Gibt die Konfiguration des aktuell gewählten Analyse-Zeitraums zurück
    currentPeriodConfig(): TimePeriod {
      return this.timePeriods.find((p) => p.key === this.selectedTimePeriod) || this.timePeriods[0]
    },

    // Liefert die CPS-Verlaufsdaten für den gewählten Zeitraum
    currentProductionHistory(): number[] {
      return this.productionHistories[this.selectedTimePeriod] || []
    },

    // Findet den höchsten CPS-Wert in der aktuellen Historie für Graph-Skalierung
    currentMaxHistoryValue(): number {
      return Math.max(...this.currentProductionHistory, 1)
    },
  },

  actions: {
    // ========== UPGRADE FUNKTIONEN ==========

    // Setzt die gewünschte Kaufmenge für Upgrades
    setBuyAmount(amount: number | 'max') {
      this.buyAmount = amount
    },

    // Berechnet maximale Anzahl eines Upgrades die mit verfügbaren Chimes kaufbar ist
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

    // Berechnet Gesamtkosten für Upgrade-Kauf basierend auf buyAmount
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
          gameStore.chimesPerSecond = this.calculateTotalCPS()
        }
        return amount
      }
      return 0
    },

    // Summiert CPS-Werte aller Upgrades für automatische Chime-Generierung
    calculateTotalCPS(): number {
      return this.shopUpgrades.reduce((total, upgrade) => {
        return total + (upgrade.baseCPS || 0) * upgrade.level
      }, 0)
    },

    // Summiert CPC-Boni aller Upgrades zum Basis-Klickwert
    calculateTotalCPC(): number {
      const gameStore = useGameStore()

      const upgradeBonus = this.shopUpgrades.reduce((total, upgrade) => {
        return total + (upgrade.baseCPC || 0) * upgrade.level
      }, 0)

      return gameStore.baseChimesPerClick + upgradeBonus
    },

    // Berechnet aktuelle Kosten eines Upgrades basierend auf Level
    getUpgradeCost(upgrade: any): number {
      return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level))
    },

    // Prüft ob Upgrade mit aktuellen Chimes und buyAmount kaufbar ist
    canAffordUpgrade(upgrade: any): boolean {
      const gameStore = useGameStore()
      const totalCost = this.getTotalUpgradeCost(upgrade)
      return gameStore.chimes >= totalCost && this.getActualBuyAmount(upgrade) > 0
    },

    // Ermittelt tatsächliche Kaufmenge unter Berücksichtigung der max-Option
    getActualBuyAmount(upgrade: any): number {
      let amount = this.buyAmount
      if (amount === 'max') {
        amount = this.getMaxAffordableAmount(upgrade)
      }
      return typeof amount === 'number' ? Math.max(0, amount) : 0
    },

    // ========== CPS-ANALYSE FUNKTIONEN ==========

    // Wechselt den aktiven Zeitraum für die CPS-Analyse
    setSelectedTimePeriod(periodKey: string) {
      this.selectedTimePeriod = periodKey
    },

    // Startet das CPS-Tracking mit Initialisierung aller Zeiträume
    startProductionTracking() {
      const gameStore = useGameStore()
      const now = Date.now()
      this.startTime = now

      // Initialisiere letzte Update-Zeiten
      Object.keys(this.lastUpdateTimes).forEach((key) => {
        this.lastUpdateTimes[key] = now
      })

      // Setze ersten Datenpunkt
      const currentCPS = gameStore.chimesPerSecond || 0
      Object.keys(this.productionHistories).forEach((key) => {
        this.productionHistories[key][0] = currentCPS
      })

      this.startTimer()
    },

    // Stoppt das CPS-Tracking durch Timer-Bereinigung
    stopProductionTracking() {
      this.stopTimer()
    },

    // Aktualisiert CPS-Historien aller Zeiträume basierend auf konfigurierten Intervallen
    updateAllHistories() {
      const gameStore = useGameStore()
      const now = Date.now()
      const currentCPS = gameStore.chimesPerSecond || 0

      this.timePeriods.forEach((period) => {
        const timeSinceLastUpdate = now - this.lastUpdateTimes[period.key]

        if (timeSinceLastUpdate >= period.interval) {
          const history = this.productionHistories[period.key]

          if (history.length >= period.dataPoints) {
            history.shift()
          }

          history.push(currentCPS)
          this.lastUpdateTimes[period.key] = now
        }
      })
    },

    // Startet 1-Sekunden-Timer für kontinuierliche Historie-Updates
    startTimer() {
      if (this.mainTimer) {
        clearInterval(this.mainTimer)
      }

      this.mainTimer = setInterval(() => {
        this.updateAllHistories()
      }, 1000)
    },

    // Stoppt den Haupt-Timer und bereinigt Timer-Referenz
    stopTimer() {
      if (this.mainTimer) {
        clearInterval(this.mainTimer)
        this.mainTimer = null
      }
    },

    // Aktualisiert sofort den neuesten CPS-Wert in allen Historien bei Änderungen
    updateCurrentCPS(newCPS: number) {
      Object.keys(this.productionHistories).forEach((key) => {
        const history = this.productionHistories[key]
        if (history.length > 0) {
          history[history.length - 1] = newCPS || 0
        }
      })
    },

    // ========== HILFSFUNKTIONEN ==========

    // Berechnet verfügbare Tracking-Zeit für einen Zeitraum seit Start
    getAvailableTimeForPeriod(periodKey: string): number {
      const elapsedTime = (Date.now() - this.startTime) / 1000
      const config = this.timePeriods.find((p) => p.key === periodKey)

      if (!config) return 0
      return Math.min(elapsedTime, config.duration)
    },

    // Erstellt Startpunkt-Label für CPS-Graph-Zeitachse
    getStartTimeLabel(): string {
      const history = this.currentProductionHistory
      if (history.length <= 1) return 'Start'

      const config = this.currentPeriodConfig
      const dataTimeSpan = (history.length - 1) * (config.interval / 1000)

      if (dataTimeSpan < 60) {
        return `${Math.floor(dataTimeSpan + 1)}s`
      } else if (dataTimeSpan < 3600) {
        return `${Math.floor(dataTimeSpan / 60 + 1)}min`
      } else {
        return `${Math.floor(dataTimeSpan / 3600 + 1)}h`
      }
    },

    // Generiert Mittelpunkt-Label für CPS-Graph-Zeitachse
    getMidTimeLabel(): string {
      const history = this.currentProductionHistory
      if (history.length <= 1) return ''

      const config = this.currentPeriodConfig
      const dataTimeSpan = (history.length - 1) * (config.interval / 1000)
      const midTime = dataTimeSpan / 2

      if (midTime < 60) {
        return `${Math.floor(midTime + 1)}s`
      } else if (midTime < 3600) {
        return `${Math.floor(midTime / 60 + 1)}min`
      } else {
        return `${Math.floor(midTime / 3600 + 1)}h`
      }
    },

    // Erstellt detaillierte Tooltip-Texte für CPS-Graph-Datenpunkte mit Zeitangaben
    getTooltipText(value: number, index: number): string {
      const config = this.currentPeriodConfig
      const history = this.currentProductionHistory
      const timeAgo = (history.length - 1 - index) * (config.interval / 1000)

      if (timeAgo === 0) {
        return `${value} CPS (jetzt)`
      } else if (timeAgo < 60) {
        return `${value} CPS vor ${Math.floor(timeAgo)} Sekunden`
      } else if (timeAgo < 3600) {
        return `${value} CPS vor ${Math.floor(timeAgo / 60)} Minuten`
      } else {
        return `${value} CPS vor ${Math.floor(timeAgo / 3600)}h ${Math.floor((timeAgo % 3600) / 60)}min`
      }
    },
  },
})
