import { defineStore } from 'pinia'
import { GALAXY_THEMES } from '../config/galaxyThemes'
import { CHAMPION_TRAVEL_BASE_MS, CHAMPION_TRAVEL_SCALE_MS } from '../config/constants'

export type ChampionTravelState = 'idle' | 'traveling' | 'champion_available' | 'champion_spawned'

function computeRequired(galaxy: number): number {
  return 3 + (galaxy - 1) * 2
}

function pickRandomThemeIndex(current: number): number {
  if (GALAXY_THEMES.length <= 1) return 0
  let next: number
  do {
    next = Math.floor(Math.random() * GALAXY_THEMES.length)
  } while (next === current)
  return next
}

export const useGalaxyStore = defineStore('galaxy', {
  state: () => ({
    currentGalaxy: 1,
    planetsRescued: 0,
    planetsRequired: 3,
    galaxyBossDefeated: false,
    pendingGalaxyBoss: false,
    pendingTransition: false,
    isGalaxyTransitioning: false,
    currentThemeIndex: 0,
    // Champion travel state machine
    championTravelState: 'traveling' as ChampionTravelState,
    championTravelStartTime: 0,
    championTravelDurationMs: CHAMPION_TRAVEL_BASE_MS,
    _travelTickMs: 0,
    // ── NEU: Champion-Ankunfts-Signal ──────────────────────────────────────
    championJustArrived: false,
  }),

  getters: {
    isComplete(): boolean {
      return this.planetsRescued >= this.planetsRequired && this.galaxyBossDefeated
    },

    needsFinalBoss(): boolean {
      return this.planetsRescued >= this.planetsRequired && !this.galaxyBossDefeated
    },

    travelProgressPercent(): number {
      void this._travelTickMs
      if (this.championTravelState !== 'traveling') return 0
      if (this.championTravelDurationMs <= 0 || this.championTravelStartTime === 0) return 0
      const elapsed = Date.now() - this.championTravelStartTime
      return Math.min(100, (elapsed / this.championTravelDurationMs) * 100)
    },

    travelRemainingMs(): number {
      void this._travelTickMs
      if (this.championTravelState !== 'traveling') return 0
      if (this.championTravelStartTime === 0) return this.championTravelDurationMs
      const elapsed = Date.now() - this.championTravelStartTime
      return Math.max(0, this.championTravelDurationMs - elapsed)
    },
  },

  actions: {
    startChampionTravel() {
      const duration = CHAMPION_TRAVEL_BASE_MS + (this.currentGalaxy - 1) * CHAMPION_TRAVEL_SCALE_MS
      this.championTravelState = 'traveling'
      this.championTravelStartTime = Date.now()
      this.championTravelDurationMs = duration
    },

    tickChampionTravel() {
      if (this.championTravelState !== 'traveling') return
      const now = Date.now()
      this._travelTickMs = now
      if (this.championTravelStartTime === 0) {
        this.championTravelStartTime = now
        return
      }
      const elapsed = now - this.championTravelStartTime
      if (elapsed >= this.championTravelDurationMs) {
        this.championTravelState = 'champion_available'
        // ── NEU: Ankunfts-Signal setzen, nach 4 s automatisch zurücksetzen ──
        this.championJustArrived = true
        setTimeout(() => {
          this.championJustArrived = false
        }, 4000)
      }
    },

    onPlanetRescued() {
      if (this.planetsRescued >= this.planetsRequired) return
      this.planetsRescued++
      if (this.planetsRescued >= this.planetsRequired && !this.galaxyBossDefeated) {
        this.championTravelState = 'idle'
        this.pendingGalaxyBoss = true
      } else {
        this.startChampionTravel()
      }
    },

    onGalaxyBossDefeated() {
      this.galaxyBossDefeated = true
      this.pendingGalaxyBoss = false
    },

    setGalaxyTransitioning(val: boolean) {
      this.isGalaxyTransitioning = val
    },

    requestTransition() {
      if (!this.isComplete || this.pendingTransition) return
      this.pendingTransition = true
    },

    commitAdvance() {
      this.currentGalaxy++
      this.planetsRescued = 0
      this.planetsRequired = computeRequired(this.currentGalaxy)
      this.galaxyBossDefeated = false
      this.pendingGalaxyBoss = false
      this.pendingTransition = false
      this.currentThemeIndex = pickRandomThemeIndex(this.currentThemeIndex)
      this.startChampionTravel()
    },
  },
})
