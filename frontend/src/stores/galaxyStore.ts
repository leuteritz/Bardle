import { defineStore } from 'pinia'
import { GALAXY_THEMES } from '../config/galaxyThemes'

function computeRequired(galaxy: number): number {
  return 3 + (galaxy - 1) * 2 // 3, 5, 7, 9, 11, ...
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
    currentThemeIndex: 0,
  }),

  getters: {
    // All regular planets done AND galaxy boss killed
    isComplete(): boolean {
      return this.planetsRescued >= this.planetsRequired && this.galaxyBossDefeated
    },

    // All regular planets done but galaxy boss not yet defeated
    needsFinalBoss(): boolean {
      return this.planetsRescued >= this.planetsRequired && !this.galaxyBossDefeated
    },
  },

  actions: {
    onPlanetRescued() {
      if (this.planetsRescued >= this.planetsRequired) return
      this.planetsRescued++
      if (this.planetsRescued >= this.planetsRequired && !this.galaxyBossDefeated) {
        this.pendingGalaxyBoss = true
      }
    },

    onGalaxyBossDefeated() {
      this.galaxyBossDefeated = true
      this.pendingGalaxyBoss = false
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
    },
  },
})
