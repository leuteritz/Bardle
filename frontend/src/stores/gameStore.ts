import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', {
  state: () => ({
    chimes: 0,
    chimesForNextLevel: 10,
    chimesPerClick: 1,
    chimesForMeep: 0,
    meeps: 0,
    meepsPerSecond: 0,
    gold: 0,
    level: 1,
    mmr: 1000,
    currentRank: {
      tier: 'Diamond',
      division: 'I',
      lp: 0,
    },
    meepChimeRequirement: 20,
    skillPoints: 0,
    abilityLevels: [0, 0, 0, 0], // Q, W, E, R
  }),
  actions: {
    addMeep() {
      this.meeps++
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
      this.chimes++
      this.chimesForMeep++
      this.calculateLevel()
    },
    calculateLevel() {
      if (this.chimes >= this.chimesForNextLevel) {
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
    levelProgress(): number {
      const chimesForlastLevel = Math.ceil(10 * Math.pow(this.level - 1, 1.2))
      const progress = this.chimes - chimesForlastLevel
      const total = this.chimesForNextLevel - chimesForlastLevel
      // console.log(
      //   'chimesForNextLevel: ' + this.chimesForNextLevel,
      //   'chimesForlastLevel: ' + chimesForlastLevel,
      //   'progress: ' + progress,
      //   'total: ' + total,
      // )
      return Math.min(100, Math.max(0, (progress / total) * 100))
    },
    totalPower(): number {
      return this.meeps * 100 + this.gold * 1000 + this.chimes * 1000
    },
  },
})
