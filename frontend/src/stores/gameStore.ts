import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', {
  state: () => ({
    meeps: 0,
    meepsPerSecond: 0,
    gold: 0,
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
  },
})
