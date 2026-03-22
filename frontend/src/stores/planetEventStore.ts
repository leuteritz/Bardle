import { defineStore } from 'pinia'
import type { PlanetRescueEvent, PlanetType } from '../types'
import {
  PLANET_RESCUE_DURATION_MIN,
  PLANET_RESCUE_DURATION_MAX,
  PLANET_RESCUE_CLICKS_MIN,
  PLANET_RESCUE_CLICKS_MAX,
  PLANET_RESCUE_BASE_REWARD,
  PLANET_EVENT_BASE_CHANCE,
  PLANET_EVENT_PRESTIGE_BONUS,
  PLANET_EVENT_CHECK_INTERVAL,
  PLANET_MATERIAL_CHANCE,
  CHAMPION_HOME_PLANET_CHANCE,
} from '../config/constants'
import { pickMaterial } from '../config/materials'
import { CHAMPION_HOME_PLANETS } from '../config/championHomePlanets'
import { useBattleStore } from './battleStore'
import { logger } from '../utils/logger'

export const usePlanetEventStore = defineStore('planetEvent', {
  state: () => ({
    activePlanetEvent: null as PlanetRescueEvent | null,
    pendingRescue: false,
    lastEventCheckSecond: 0,
    rescueModalOpen: false,
    lastDroppedMaterialId: null as string | null,
  }),

  actions: {
    // Called every second from gameStore.tick()
    checkAndMaybeSpawnEvent(inGameTime: number, universeProgress: number) {
      // Check if current event has expired
      if (
        this.activePlanetEvent &&
        !this.activePlanetEvent.saved &&
        !this.activePlanetEvent.expired
      ) {
        const elapsed = Date.now() - this.activePlanetEvent.startTime
        if (elapsed >= this.activePlanetEvent.durationMs) {
          this.activePlanetEvent.expired = true
          this.rescueModalOpen = false
          logger.info('Planet', 'Planet event expired')
          setTimeout(() => {
            this.activePlanetEvent = null
          }, 900)
          return
        }
      }

      // Roll for new event every 60 in-game seconds
      if (inGameTime - this.lastEventCheckSecond < PLANET_EVENT_CHECK_INTERVAL) return
      if (this.activePlanetEvent || this.pendingRescue) return

      this.lastEventCheckSecond = inGameTime

      const chance =
        PLANET_EVENT_BASE_CHANCE + (universeProgress / 100) * PLANET_EVENT_PRESTIGE_BONUS
      if (Math.random() > chance) return

      this.pendingRescue = true
      logger.info('Planet', 'Planet rescue event spawned')
    },

    // Neue Action hinzufügen
    forceCheckExpiry() {
      if (
        this.activePlanetEvent &&
        !this.activePlanetEvent.saved &&
        !this.activePlanetEvent.expired
      ) {
        const elapsed = Date.now() - this.activePlanetEvent.startTime
        if (elapsed >= this.activePlanetEvent.durationMs) {
          this.activePlanetEvent.expired = true
          this.rescueModalOpen = false
          setTimeout(() => {
            this.activePlanetEvent = null
          }, 900)
        }
      }
    },

    // Called by composable once a planet is ready — finalises the event
    // reward + clicks are calculated internally based on difficulty
    activatePlanetRescue(planetId: string, planetType: PlanetType) {
      if (!this.pendingRescue) return

      // Random duration between min and max
      const duration =
        PLANET_RESCUE_DURATION_MIN +
        Math.random() * (PLANET_RESCUE_DURATION_MAX - PLANET_RESCUE_DURATION_MIN)

      // Random click count between min and max
      const clicksRequired =
        PLANET_RESCUE_CLICKS_MIN +
        Math.floor(Math.random() * (PLANET_RESCUE_CLICKS_MAX - PLANET_RESCUE_CLICKS_MIN + 1))

      // Difficulty = clicks per second (range ~0.5 to ~3.0)
      const clicksPerSecond = clicksRequired / (duration / 1000)
      const minCps = PLANET_RESCUE_CLICKS_MIN / (PLANET_RESCUE_DURATION_MAX / 1000) // ~0.5
      const maxCps = PLANET_RESCUE_CLICKS_MAX / (PLANET_RESCUE_DURATION_MIN / 1000) // ~3.0
      const difficulty = Math.min(1, Math.max(0, (clicksPerSecond - minCps) / (maxCps - minCps)))

      // Reward scales from BASE (easy) to BASE * 5 (hardest)
      const reward = Math.floor(PLANET_RESCUE_BASE_REWARD * (1 + difficulty * 4))

      // Material drop — only some planets carry materials
      const hasMaterial = Math.random() < PLANET_MATERIAL_CHANCE
      const potentialMaterialId = hasMaterial ? pickMaterial().id : undefined
      const assignedDropChance = hasMaterial ? 0.2 + Math.random() * 0.4 : undefined

      // Champion home planet — roll for a champion discovery
      let homePlanetChampion: string | undefined = undefined
      if (Math.random() < CHAMPION_HOME_PLANET_CHANCE) {
        const battleStore = useBattleStore()
        const candidates = CHAMPION_HOME_PLANETS.filter(
          (c) =>
            c.planetType === planetType &&
            !battleStore.ownedChampions.includes(c.championName) &&
            !battleStore.recruitableChampions.some((r) => r.name === c.championName),
        )
        if (candidates.length > 0) {
          homePlanetChampion = candidates[Math.floor(Math.random() * candidates.length)].championName
        }
      }

      this.activePlanetEvent = {
        planetId,
        planetType,
        startTime: Date.now(),
        durationMs: duration,
        reward,
        clicksRequired,
        clicksMade: 0,
        saved: false,
        expired: false,
        ...(potentialMaterialId !== undefined && { potentialMaterialId }),
        ...(assignedDropChance !== undefined && { assignedDropChance }),
        ...(homePlanetChampion && { homePlanetChampion }),
      }
      this.pendingRescue = false
      this.lastDroppedMaterialId = null
      logger.info('Planet', `Rescue activated: ${planetType}`, {
        clicksRequired,
        reward,
        duration: Math.round(duration / 1000) + 's',
      })
    },

    openRescueModal() {
      this.rescueModalOpen = true
    },

    closeRescueModal() {
      this.rescueModalOpen = false
    },

    // Called on each player click — returns true when all clicks completed
    registerClick(): boolean {
      const ev = this.activePlanetEvent
      if (!ev || ev.saved || ev.expired) return false
      ev.clicksMade++
      if (ev.clicksMade >= ev.clicksRequired) {
        ev.saved = true
        this.rescueModalOpen = false
        setTimeout(() => {
          this.activePlanetEvent = null
        }, 600)
        return true
      }
      return false
    },
  },

  getters: {
    isEventActive(): boolean {
      return (
        this.activePlanetEvent !== null &&
        !this.activePlanetEvent.saved &&
        !this.activePlanetEvent.expired
      )
    },
  },
})
