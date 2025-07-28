import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', {
  state: () => ({
    gameSpeed: 1000,
    chimes: 0,
    chimesForNextLevel: 10,
    chimesPerClick: 2,
    chimesForMeep: 0,
    meeps: 0,
    meepsPerSecond: 0,
    gold: 0,
    level: 1,
    mmr: 1000,
    currentRank: {
      tier: 'Iron',
      division: 'IV',
      lp: 0,
    },
    meepChimeRequirement: 20,
    skillPoints: 0,
    abilityLevels: [0, 0, 0, 0], // Q, W, E, R
  }),
  actions: {
    addMeep() {
      this.meeps += this.chimesPerClick
      this.meepChimeRequirement = Math.max(20, Math.ceil(20 * Math.pow(this.meeps, 1.2)))
    },
    gernerateMeeps() {
      this.meeps += this.meepsPerSecond
    },
    addGold() {
      this.gold++
    },
    addChime() {
      console.log('addChime')
      this.chimes += this.chimesPerClick
      this.chimesForMeep += this.chimesPerClick
      this.calculateLevel()
    },
    calculateLevel() {
      while (this.chimes >= this.chimesForNextLevel) {
        this.level++
        this.chimesForNextLevel = Math.ceil(10 * Math.pow(this.level, 1.2))
        if (this.level % 2 === 0) {
          this.skillPoints++
        }
      }
    },
    upgradeAbility(index) {
      const maxLevel = 5
      if (this.skillPoints > 0 && this.abilityLevels[index] < maxLevel) {
        this.abilityLevels[index]++
        this.skillPoints--
      }
    },
  },
  getters: {
    chimesToNextLevel(): number {
      return this.chimesForNextLevel - this.chimes
    },

    // Verbesserte Fortschrittsberechnung
    levelProgress(): number {
      // Berechne Chimes die für das aktuelle Level benötigt wurden
      const chimesForCurrentLevel =
        this.level > 1 ? Math.ceil(10 * Math.pow(this.level - 1, 1.2)) : 0

      // Chimes die im aktuellen Level bereits gesammelt wurden
      const currentLevelChimes = this.chimes - chimesForCurrentLevel

      // Total Chimes die für das aktuelle Level benötigt werden
      const totalChimesThisLevel = this.chimesForNextLevel - chimesForCurrentLevel

      // Fortschritt als Prozent (0-100)
      return Math.min(100, Math.max(0, (currentLevelChimes / totalChimesThisLevel) * 100))
    },

    // Zusätzliche hilfreiche Getter
    currentLevelChimes(): number {
      const chimesForCurrentLevel =
        this.level > 1 ? Math.ceil(10 * Math.pow(this.level - 1, 1.2)) : 0
      return this.chimes - chimesForCurrentLevel
    },

    totalChimesThisLevel(): number {
      const chimesForCurrentLevel =
        this.level > 1 ? Math.ceil(10 * Math.pow(this.level - 1, 1.2)) : 0
      return this.chimesForNextLevel - chimesForCurrentLevel
    },

    totalPower(): number {
      return this.meeps * 100 + this.gold * 1000 + this.chimes * 1000
    },
  },
})
