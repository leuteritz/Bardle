import { defineStore } from 'pinia'

export const useMeepStore = defineStore('meep', {
  state: () => ({
    meeps: 0,
  }),
  actions: {
    addMeep() {
      this.meeps++
    },
  },
})
