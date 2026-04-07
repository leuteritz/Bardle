import { defineStore } from 'pinia'
import type { PlanetType } from '../types'
import {
  PLANET_EVENT_BASE_CHANCE,
  PLANET_EVENT_PRESTIGE_BONUS,
  PLANET_EVENT_CHECK_INTERVAL,
  PLANET_MAX_COUNT,
} from '../config/constants'
import { usePlanetBossStore } from './planetBossStore'
import { useGalaxyStore } from './galaxyStore'
import { logger } from '../utils/logger'

export const usePlanetEventStore = defineStore('planetEvent', {
  state: () => ({
    pendingRescue: false,
    pendingRescueIsChampion: false,
    lastEventCheckSecond: 0,
  }),

  actions: {
    // Called every second from gameStore.tick()
    checkAndMaybeSpawnEvent(inGameTime: number, universeProgress: number) {
      const bossStore = usePlanetBossStore()
      const galaxyStore = useGalaxyStore()

      // Check if current boss has expired (enrage timer)
      if (bossStore.isBossActive) {
        bossStore.checkEnrage()
      }

      // Advance champion travel timer (real-time based)
      galaxyStore.tickChampionTravel()

      const activeBossCount = bossStore.activeBosses.filter((b) => !b.defeated && !b.expired).length

      // Priority 1: Galaxy final boss — bypass interval, spawn immediately
      if (galaxyStore.pendingGalaxyBoss && !this.pendingRescue && activeBossCount === 0) {
        this.pendingRescue = true
        this.pendingRescueIsChampion = false
        logger.info('Planet', 'Galaxy final boss triggered')
        return
      }

      // Priority 2: Champion planet — travel complete, spawn immediately
      if (galaxyStore.championTravelState === 'champion_available' && !this.pendingRescue) {
        this.pendingRescue = true
        this.pendingRescueIsChampion = true
        logger.info('Planet', 'Champion planet spawning — travel complete')
        return
      }

      // Priority 3: Normal planet — only during active travel
      if (galaxyStore.championTravelState !== 'traveling') return

      // Roll for new event every N in-game seconds
      if (inGameTime - this.lastEventCheckSecond < PLANET_EVENT_CHECK_INTERVAL) return
      if (activeBossCount >= PLANET_MAX_COUNT || this.pendingRescue) return

      this.lastEventCheckSecond = inGameTime

      const chance =
        PLANET_EVENT_BASE_CHANCE + (universeProgress / 100) * PLANET_EVENT_PRESTIGE_BONUS
      if (Math.random() > chance) return

      this.pendingRescue = true
      this.pendingRescueIsChampion = false
      logger.info('Planet', 'Normal planet spawned during champion travel')
    },

    forceCheckExpiry() {
      const bossStore = usePlanetBossStore()
      bossStore.forceCheckExpiry()
    },

    // Called by composable once a planet is ready — delegates to boss store
    activatePlanetRescue(planetId: string, planetType: PlanetType) {
      if (!this.pendingRescue) return

      const bossStore = usePlanetBossStore()
      bossStore.spawnBoss(planetId, planetType, this.pendingRescueIsChampion)

      // Mark travel state so no second champion spawns until fight resolves
      if (this.pendingRescueIsChampion) {
        const galaxyStore = useGalaxyStore()
        galaxyStore.championTravelState = 'champion_spawned'
      }

      this.pendingRescue = false
      this.pendingRescueIsChampion = false
    },
  },

  getters: {
    isEventActive(): boolean {
      const bossStore = usePlanetBossStore()
      return bossStore.isBossActive
    },
  },
})
