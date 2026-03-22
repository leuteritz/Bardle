import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import type { TimePeriod } from '../types'

export const useCpsStore = defineStore('cps', {
  state: () => ({
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
  }),

  getters: {
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
    // Wechselt den aktiven Zeitraum für die CPS-Analyse
    setSelectedTimePeriod(periodKey: string) {
      this.selectedTimePeriod = periodKey
    },

    // Startet das CPS-Tracking mit Initialisierung aller Zeiträume
    startProductionTracking() {
      const gameStore = useGameStore()
      const now = Date.now()
      this.startTime = now

      Object.keys(this.lastUpdateTimes).forEach((key) => {
        this.lastUpdateTimes[key] = now
      })

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

      document.addEventListener('visibilitychange', this._handleVisibilityChange)
    },

    // Stoppt den Haupt-Timer und bereinigt Timer-Referenz
    stopTimer() {
      if (this.mainTimer) {
        clearInterval(this.mainTimer)
        this.mainTimer = null
      }
      document.removeEventListener('visibilitychange', this._handleVisibilityChange)
    },

    _handleVisibilityChange() {
      if (document.hidden) {
        if (this.mainTimer) {
          clearInterval(this.mainTimer)
          this.mainTimer = null
        }
      } else {
        if (!this.mainTimer) {
          this.mainTimer = setInterval(() => {
            this.updateAllHistories()
          }, 1000)
        }
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
