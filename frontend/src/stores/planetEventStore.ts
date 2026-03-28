import { defineStore } from 'pinia'
import type { PlanetType } from '../types'
import {
  PLANET_EVENT_BASE_CHANCE,
  PLANET_EVENT_PRESTIGE_BONUS,
  PLANET_EVENT_CHECK_INTERVAL,
} from '../config/constants'
import { usePlanetBossStore } from './planetBossStore'
import { logger } from '../utils/logger'

export const usePlanetEventStore = defineStore('planetEvent', {
  state: () => ({
    pendingRescue: false,
    lastEventCheckSecond: 0,
  }),

  actions: {
    // Called every second from gameStore.tick()
    checkAndMaybeSpawnEvent(inGameTime: number, universeProgress: number) {
      const bossStore = usePlanetBossStore()

      // Check if current boss has expired (enrage timer)
      if (bossStore.isBossActive) {
        bossStore.checkEnrage()
      }

      // Roll for new event every N in-game seconds
      if (inGameTime - this.lastEventCheckSecond < PLANET_EVENT_CHECK_INTERVAL) return
      if (bossStore.activeBoss || this.pendingRescue) return

      this.lastEventCheckSecond = inGameTime

      const chance =
        PLANET_EVENT_BASE_CHANCE + (universeProgress / 100) * PLANET_EVENT_PRESTIGE_BONUS
      if (Math.random() > chance) return

      this.pendingRescue = true
      logger.info('Planet', 'Planet boss event spawned')
    },

    forceCheckExpiry() {
      const bossStore = usePlanetBossStore()
      bossStore.forceCheckExpiry()
    },

    // Called by composable once a planet is ready — delegates to boss store
    activatePlanetRescue(planetId: string, planetType: PlanetType) {
      if (!this.pendingRescue) return

      const bossStore = usePlanetBossStore()
      bossStore.spawnBoss(planetId, planetType)
      this.pendingRescue = false
    },
  },

  getters: {
    isEventActive(): boolean {
      const bossStore = usePlanetBossStore()
      return bossStore.isBossActive
    },
  },
})
