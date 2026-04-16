import { defineStore } from 'pinia'
import type { PlanetType, StarType } from '../types'
import { pickConfig } from '../utils/planetDraw'
import { usePlanetBossStore } from './planetBossStore'
import { useGalaxyStore } from './galaxyStore'
import { RESOURCE_STAR_PLANET_COUNT } from '../config/constants'

let starIdCounter = 0
let planetIdCounter = 0

export interface StarPlanetSlot {
  planetId: string
  type: PlanetType
  isChampionPlanet: boolean
  orbitAngle: number
  orbitSpeed: number
  orbitDirection: 1 | -1
  orbitRx: number
  orbitRy: number
  orbitTilt: number
  cleared: boolean
}

export interface StarGroup {
  id: string
  starType: StarType
  starAngle: number
  starDirection: 1 | -1
  orbitRx: number
  orbitRy: number
  orbitTilt: number
  orbitSpeed: number
  planetSlots: StarPlanetSlot[]
}

export const useStarGroupStore = defineStore('starGroup', {
  state: () => ({
    activeStars: [] as StarGroup[],
  }),

  getters: {
    hasActiveResourceStar(): boolean {
      return this.activeStars.some((s) => s.starType === 'resource')
    },
    hasActiveChampionStar(): boolean {
      return this.activeStars.some((s) => s.starType === 'champion')
    },
    hasActiveGalaxyBossStar(): boolean {
      return this.activeStars.some((s) => s.starType === 'galaxy_boss')
    },
  },

  actions: {
    spawnResourceStar() {
      if (this.hasActiveResourceStar) return
      const bossStore = usePlanetBossStore()
      const count = RESOURCE_STAR_PLANET_COUNT
      const planetSlots: StarPlanetSlot[] = []

      for (let i = 0; i < count; i++) {
        const config = pickConfig()
        const planetId = `star-planet-${++planetIdCounter}`
        planetSlots.push({
          planetId,
          type: config.type,
          isChampionPlanet: false,
          orbitAngle: (i / count) * Math.PI * 2,
          orbitSpeed: 0.00095 + Math.random() * 0.0005,
          orbitDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
          orbitRx: 85 + Math.random() * 25,
          orbitRy: 44 + Math.random() * 18,
          orbitTilt: Math.random() * 0.35,
          cleared: false,
        })
        bossStore.spawnBoss(planetId, config.type, false, true)
      }

      const star: StarGroup = {
        id: `star-${++starIdCounter}`,
        starType: 'resource',
        starAngle: Math.random() * Math.PI * 2,
        starDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
        orbitRx: 430,
        orbitRy: 188,
        orbitTilt: 0.27,
        orbitSpeed: 0.000042,
        planetSlots,
      }

      this.activeStars.push(star)
    },

    // Admin: spawnt immer einen neuen Stern – kein Guard, zufällige Planetenanzahl 1–4
    forceSpawnResourceStar() {
      const bossStore = usePlanetBossStore()
      const count = 1 + Math.floor(Math.random() * 4) // 1–4 Planeten
      const planetSlots: StarPlanetSlot[] = []

      for (let i = 0; i < count; i++) {
        const config = pickConfig()
        const planetId = `star-planet-${++planetIdCounter}`
        planetSlots.push({
          planetId,
          type: config.type,
          isChampionPlanet: false,
          orbitAngle: (i / count) * Math.PI * 2,
          orbitSpeed: 0.00095 + Math.random() * 0.0005,
          orbitDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
          orbitRx: 85 + Math.random() * 25,
          orbitRy: 44 + Math.random() * 18,
          orbitTilt: Math.random() * 0.35,
          cleared: false,
        })
        bossStore.spawnBoss(planetId, config.type, false, true)
      }

      const star: StarGroup = {
        id: `star-${++starIdCounter}`,
        starType: 'resource',
        starAngle: Math.random() * Math.PI * 2,
        starDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
        orbitRx: 430,
        orbitRy: 188,
        orbitTilt: 0.27,
        orbitSpeed: 0.000042,
        planetSlots,
      }

      this.activeStars.push(star)
    },

    spawnChampionStar() {
      if (this.hasActiveChampionStar) return
      const bossStore = usePlanetBossStore()
      const galaxyStore = useGalaxyStore()

      const extraCount = 2 + Math.floor(Math.random() * 2)
      const totalCount = 1 + extraCount
      const planetSlots: StarPlanetSlot[] = []

      const champConfig = pickConfig()
      const champId = `star-planet-${++planetIdCounter}`
      planetSlots.push({
        planetId: champId,
        type: champConfig.type,
        isChampionPlanet: true,
        orbitAngle: 0,
        orbitSpeed: 0.0009 + Math.random() * 0.0004,
        orbitDirection: 1,
        orbitRx: 92 + Math.random() * 22,
        orbitRy: 48 + Math.random() * 18,
        orbitTilt: Math.random() * 0.3,
        cleared: false,
      })
      bossStore.spawnBoss(champId, champConfig.type, true)

      for (let i = 1; i < totalCount; i++) {
        const config = pickConfig()
        const planetId = `star-planet-${++planetIdCounter}`
        planetSlots.push({
          planetId,
          type: config.type,
          isChampionPlanet: false,
          orbitAngle: (i / totalCount) * Math.PI * 2,
          orbitSpeed: 0.001 + Math.random() * 0.0005,
          orbitDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
          orbitRx: 80 + Math.random() * 30,
          orbitRy: 42 + Math.random() * 18,
          orbitTilt: Math.random() * 0.35,
          cleared: false,
        })
        bossStore.spawnBoss(planetId, config.type, false)
      }

      galaxyStore.championTravelState = 'champion_spawned'

      const star: StarGroup = {
        id: `star-${++starIdCounter}`,
        starType: 'champion',
        starAngle: Math.PI * 0.6,
        starDirection: 1,
        orbitRx: 370,
        orbitRy: 160,
        orbitTilt: 0.18,
        orbitSpeed: 0.000022,
        planetSlots,
      }

      this.activeStars.push(star)
    },

    spawnGalaxyBossStar() {
      if (this.hasActiveGalaxyBossStar) return
      const bossStore = usePlanetBossStore()

      const config = pickConfig()
      const planetId = `star-planet-${++planetIdCounter}`
      bossStore.spawnBoss(planetId, config.type, false)

      const star: StarGroup = {
        id: `star-${++starIdCounter}`,
        starType: 'galaxy_boss',
        starAngle: Math.random() * Math.PI * 2,
        starDirection: 1,
        orbitRx: 320,
        orbitRy: 138,
        orbitTilt: 0.14,
        orbitSpeed: 0.000012,
        planetSlots: [
          {
            planetId,
            type: config.type,
            isChampionPlanet: false,
            orbitAngle: 0,
            orbitSpeed: 0.0008,
            orbitDirection: 1,
            orbitRx: 38,
            orbitRy: 22,
            orbitTilt: 0.1,
            cleared: false,
          },
        ],
      }

      this.activeStars.push(star)
    },

    onBossResult(planetId: string) {
      for (const star of this.activeStars) {
        const slot = star.planetSlots.find((p) => p.planetId === planetId)
        if (!slot) continue
        slot.cleared = true
        if (star.planetSlots.every((p) => p.cleared)) {
          const idx = this.activeStars.indexOf(star)
          if (idx !== -1) {
            setTimeout(() => {
              this.activeStars.splice(idx, 1)
            }, 1500)
          }
        }
        return
      }
    },

    clearResourceStar() {
      const bossStore = usePlanetBossStore()
      const idx = this.activeStars.findIndex((s) => s.starType === 'resource')
      if (idx === -1) return
      const star = this.activeStars[idx]
      for (const slot of star.planetSlots) {
        if (!slot.cleared) {
          slot.cleared = true
          bossStore.removeBoss(slot.planetId)
        }
      }
      setTimeout(() => {
        const currentIdx = this.activeStars.indexOf(star)
        if (currentIdx !== -1) this.activeStars.splice(currentIdx, 1)
      }, 600)
    },

    clearAll() {
      this.activeStars = []
    },
  },
})
