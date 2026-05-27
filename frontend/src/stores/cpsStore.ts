import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import type { TimePeriod } from '../types'
import { GAME_TICK_INTERVAL_MS, BUILDING_HISTORY_BUFFER_SIZE } from '../config/constants'

export const useCpsStore = defineStore('cps', {
  state: () => ({
    // Currently selected time period for the production chart
    selectedTimePeriod: '1min' as string,
    // Start time for the CPS tracking system
    startTime: Date.now(),

    // Stores CPS history data for various time periods as arrays
    productionHistories: {
      '1min': Array(BUILDING_HISTORY_BUFFER_SIZE).fill(0),
      '10min': Array(BUILDING_HISTORY_BUFFER_SIZE).fill(0),
      '1h': Array(BUILDING_HISTORY_BUFFER_SIZE).fill(0),
    } as Record<string, number[]>,

    // Tracks last update timestamps for each tracking period
    lastUpdateTimes: {
      '1min': 0,
      '10min': 0,
      '1h': 0,
    } as Record<string, number>,

    // Reference for the main CPS tracking timer
    mainTimer: null as ReturnType<typeof setInterval> | null,

    // Configuration of available time periods for CPS analysis
    timePeriods: [
      {
        key: '1min',
        label: '1 Minute',
        duration: 60,
        interval: GAME_TICK_INTERVAL_MS,
        dataPoints: BUILDING_HISTORY_BUFFER_SIZE,
      },
      {
        key: '10min',
        label: '10 Minutes',
        duration: 600,
        interval: 10000,
        dataPoints: BUILDING_HISTORY_BUFFER_SIZE,
      },
      {
        key: '1h',
        label: '1 Hour',
        duration: 3600,
        interval: 60000,
        dataPoints: BUILDING_HISTORY_BUFFER_SIZE,
      },
    ] as TimePeriod[],
  }),

  getters: {
    // Returns configuration for the currently selected analysis period
    currentPeriodConfig(): TimePeriod {
      return this.timePeriods.find((p) => p.key === this.selectedTimePeriod) || this.timePeriods[0]
    },

    // Returns CPS history data for the selected period
    currentProductionHistory(): number[] {
      return this.productionHistories[this.selectedTimePeriod] || []
    },

    // Finds the highest CPS value in the current history for graph scaling
    currentMaxHistoryValue(): number {
      return Math.max(...this.currentProductionHistory, 1)
    },
  },

  actions: {
    // Switches the active time period for CPS analysis
    setSelectedTimePeriod(periodKey: string) {
      this.selectedTimePeriod = periodKey
    },

    // Starts CPS tracking with initialization of all periods
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

    // Stops CPS tracking by clearing the timer
    stopProductionTracking() {
      this.stopTimer()
    },

    // Updates CPS histories for all periods based on configured intervals
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

    // Starts 1-second timer for continuous history updates
    startTimer() {
      if (this.mainTimer) {
        clearInterval(this.mainTimer)
      }

      this.mainTimer = setInterval(() => {
        this.updateAllHistories()
      }, GAME_TICK_INTERVAL_MS)

      document.addEventListener('visibilitychange', this._handleVisibilityChange)
    },

    // Stops the main timer and clears the timer reference
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
          }, GAME_TICK_INTERVAL_MS)
        }
      }
    },

    // Immediately updates the latest CPS value in all histories on change
    updateCurrentCPS(newCPS: number) {
      Object.keys(this.productionHistories).forEach((key) => {
        const history = this.productionHistories[key]
        if (history.length > 0) {
          history[history.length - 1] = newCPS || 0
        }
      })
    },

    _formatTimeSpan(seconds: number): string {
      if (seconds < 60) return `${Math.floor(seconds + 1)}s`
      if (seconds < 3600) return `${Math.floor(seconds / 60 + 1)}min`
      return `${Math.floor(seconds / 3600 + 1)}h`
    },

    // Creates start-point label for the CPS graph time axis
    getStartTimeLabel(): string {
      const history = this.currentProductionHistory
      if (history.length <= 1) return 'Start'
      const config = this.currentPeriodConfig
      const dataTimeSpan = (history.length - 1) * (config.interval / 1000)
      return this._formatTimeSpan(dataTimeSpan)
    },

    // Generates midpoint label for the CPS graph time axis
    getMidTimeLabel(): string {
      const history = this.currentProductionHistory
      if (history.length <= 1) return ''
      const config = this.currentPeriodConfig
      const dataTimeSpan = (history.length - 1) * (config.interval / 1000)
      return this._formatTimeSpan(dataTimeSpan / 2)
    },

    // Creates detailed tooltip text for CPS graph data points with timestamps
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
