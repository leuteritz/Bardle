import { defineStore } from 'pinia'
import { usePlanetBossStore } from './planetBossStore'
import { useGalaxyStore } from './galaxyStore'

export const usePlanetEventStore = defineStore('planetEvent', {
  state: () => ({}),

  actions: {
    // Called every second from gameStore.tick()
    // Star spawning is now handled by useStarSystem composable (watchers on galaxy state).
    checkAndMaybeSpawnEvent(_inGameTime: number, _universeProgress: number) {
      const bossStore = usePlanetBossStore()
      const galaxyStore = useGalaxyStore()

      // Keep boss enrage checks running
      if (bossStore.isBossActive) {
        bossStore.checkEnrage()
      }

      // Keep champion travel timer running
      galaxyStore.tickChampionTravel()
    },

    forceCheckExpiry() {
      const bossStore = usePlanetBossStore()
      bossStore.forceCheckExpiry()
    },
  },

  getters: {
    isEventActive(): boolean {
      const bossStore = usePlanetBossStore()
      return bossStore.isBossActive
    },
  },
})
