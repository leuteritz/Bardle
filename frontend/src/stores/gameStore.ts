import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', {
  state: () => ({
    chimes: 0,
    meeps: 0,
    meepsPerSecond: 0,
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
      const newLevel = Math.floor(this.chimes / 10) + 1
      if (newLevel > this.level) {
        this.level = newLevel
      }
    },
  },
  getters: {
    chimesToNextLevel(): number {
      const chimesForNextLevel = this.level * 10
      return chimesForNextLevel - this.chimes
    },
    levelProgress(): number {
      const chimesForCurrentLevel = (this.level - 1) * 10
      const chimesForNextLevel = this.level * 10
      const progress = this.chimes - chimesForCurrentLevel
      const total = chimesForNextLevel - chimesForCurrentLevel
      return Math.min(100, Math.max(0, (progress / total) * 100))
    },
  },
})
