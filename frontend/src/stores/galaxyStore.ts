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
    // ── NEU: Galaxy-Boss-Suchphase (Multi-Segment) ────────────────────────
    searchingForGalaxyBoss: false,
    galaxyBossJustSpawned: false,
    // Gesamtfortschritt
    bossSearchTotalElapsed: 0,
    bossSearchTotalDuration: 0,
    // Aktuelles Segment: Start- und Zielposition + Timing
    bossSearchCurrentX: 0.5,
    bossSearchCurrentY: 0.5,
    bossSearchTargetX: 0.5,
    bossSearchTargetY: 0.5,
    bossSearchSegmentStart: 0,
    bossSearchSegmentEnd: 0,
    bossSearchSegmentAngle: 0, // aktuelle Flugrichtung in Grad (für Sternfeld)
  }),

  getters: {
    isComplete(): boolean {
      return this.planetsRescued >= this.planetsRequired && this.galaxyBossDefeated
    },

    needsFinalBoss(): boolean {
      return this.planetsRescued >= this.planetsRequired && !this.galaxyBossDefeated
    },

    isBossSearchActive(): boolean {
      return this.searchingForGalaxyBoss && !this.pendingGalaxyBoss
    },

    bossSearchInterpolatedPos(): { x: number; y: number } {
      if (!this.searchingForGalaxyBoss) return { x: 0.5, y: 0.5 }
      const now = Date.now()
      const duration = this.bossSearchSegmentEnd - this.bossSearchSegmentStart
      const t = duration > 0 ? Math.max(0, Math.min(1, (now - this.bossSearchSegmentStart) / duration)) : 0
      return {
        x: this.bossSearchCurrentX + (this.bossSearchTargetX - this.bossSearchCurrentX) * t,
        y: this.bossSearchCurrentY + (this.bossSearchTargetY - this.bossSearchCurrentY) * t,
      }
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

    _startBossSearchSegment(fromX: number, fromY: number, angle: number) {
      const segDuration = 3500 + Math.random() * 4500
      const step = 0.07 + Math.random() * 0.09
      const rad = angle * (Math.PI / 180)
      const now = Date.now()
      this.bossSearchCurrentX = fromX
      this.bossSearchCurrentY = fromY
      this.bossSearchTargetX = Math.max(0.15, Math.min(0.85, fromX + Math.cos(rad) * step))
      this.bossSearchTargetY = Math.max(0.15, Math.min(0.85, fromY + Math.sin(rad) * step))
      this.bossSearchSegmentStart = now
      this.bossSearchSegmentEnd = now + segDuration
      this.bossSearchSegmentAngle = angle
    },

    onPlanetRescued() {
      if (this.planetsRescued >= this.planetsRequired) return
      this.planetsRescued++
      if (this.planetsRescued >= this.planetsRequired && !this.galaxyBossDefeated) {
        this.championTravelState = 'idle'
        // Starte Suchphase mit erstem zufälligen Segment
        this.searchingForGalaxyBoss = true
        this.bossSearchTotalElapsed = 0
        this.bossSearchTotalDuration = 15000 + Math.random() * 45000
        this._startBossSearchSegment(0.5, 0.5, Math.random() * 360)
      } else {
        this.startChampionTravel()
      }
    },

    tickBossSearch(deltaMs: number) {
      if (!this.searchingForGalaxyBoss) return
      this.bossSearchTotalElapsed += deltaMs
      if (this.bossSearchTotalElapsed >= this.bossSearchTotalDuration) {
        this.searchingForGalaxyBoss = false
        this.pendingGalaxyBoss = true
        this.galaxyBossJustSpawned = true
        setTimeout(() => {
          this.galaxyBossJustSpawned = false
        }, 5000)
        return
      }
      // Prüfe ob aktuelles Segment abgelaufen ist
      const now = Date.now()
      if (now >= this.bossSearchSegmentEnd) {
        const curX = this.bossSearchTargetX
        const curY = this.bossSearchTargetY
        // Neue Richtung: 60–300° Abweichung von aktueller (kein sofortiges Umkehren)
        const newAngle = (this.bossSearchSegmentAngle + 60 + Math.random() * 240) % 360
        this._startBossSearchSegment(curX, curY, newAngle)
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
      this.searchingForGalaxyBoss = false
      this.bossSearchTotalElapsed = 0
      this.bossSearchTotalDuration = 0
      this.galaxyBossJustSpawned = false
      this.currentThemeIndex = pickRandomThemeIndex(this.currentThemeIndex)
      this.startChampionTravel()
    },
  },
})
