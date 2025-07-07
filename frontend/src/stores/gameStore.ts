import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', {
  state: () => ({
    chimes: 0,
    chimesForNextLevel: 10,
    meeps: 0,
    meepsPerSecond: 15,
    gold: 0,
    level: 1,
  }),
  actions: {
    addMeep() {
      this.meeps++
    },
    gernerateMeeps() {
      this.meeps += this.meepsPerSecond
    },
    addGold() {
      this.gold++
    },
    addChime() {
      this.chimes++
      this.calculateLevel()
    },
    calculateLevel() {
      if (this.chimes >= this.chimesForNextLevel) {
        this.level++
        this.chimesForNextLevel = this.level * 10
      }
    },
  },
  getters: {
    chimesToNextLevel(): number {
      return this.chimesForNextLevel - this.chimes
    },
    levelProgress(): number {
      const chimesForlastLevel = (this.level - 1) * 10
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
  },
})
