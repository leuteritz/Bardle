import { defineStore } from 'pinia'
import type { PlanetType, StarType } from '../types'
import { pickConfig } from '../utils/planetDraw'
import { usePlanetBossStore } from './planetBossStore'
import { useGalaxyStore } from './galaxyStore'
import {
  RESOURCE_STAR_PLANET_COUNT,
  RESOURCE_STAR_DURATION_MS,
  STAR_ORBIT_SPEED_RESOURCE,
  STAR_ORBIT_SPEED_CHAMPION,
  STAR_ORBIT_SPEED_GALAXY_BOSS,
  PLANET_ORBIT_SPEED_MIN,
  PLANET_ORBIT_SPEED_RANGE,
  PLANET_ORBIT_SPEED_CHAMP_MIN,
  PLANET_ORBIT_SPEED_CHAMP_RANGE,
  PLANET_ORBIT_SPEED_EXTRA_MIN,
  PLANET_ORBIT_SPEED_EXTRA_RANGE,
  PLANET_ORBIT_SPEED_BOSS,
} from '../config/constants'

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
  spawnedAt?: number
  durationMs?: number
}

// Hält laufende Admin-Spawn-Timeouts pro Star-ID
const adminStarTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

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
    _buildResourcePlanetSlots(count: number): StarPlanetSlot[] {
      const bossStore = usePlanetBossStore()
      const slots: StarPlanetSlot[] = []
      for (let i = 0; i < count; i++) {
        const config = pickConfig()
        const planetId = `star-planet-${++planetIdCounter}`
        slots.push({
          planetId,
          type: config.type,
          isChampionPlanet: false,
          orbitAngle: (i / count) * Math.PI * 2,
          orbitSpeed: PLANET_ORBIT_SPEED_MIN + Math.random() * PLANET_ORBIT_SPEED_RANGE,
          orbitDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
          orbitRx: 85 + Math.random() * 25,
          orbitRy: 44 + Math.random() * 18,
          orbitTilt: Math.random() * 0.35,
          cleared: false,
        })
        bossStore.spawnBoss(planetId, config.type, false, true)
      }
      return slots
    },

    spawnResourceStar() {
      if (this.hasActiveResourceStar) return
      const star: StarGroup = {
        id: `star-${++starIdCounter}`,
        starType: 'resource',
        starAngle: Math.PI * 0.15 + Math.random() * Math.PI * 0.7,
        starDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
        orbitRx: 430,
        orbitRy: 188,
        orbitTilt: 0.27,
        orbitSpeed: STAR_ORBIT_SPEED_RESOURCE,
        planetSlots: this._buildResourcePlanetSlots(RESOURCE_STAR_PLANET_COUNT),
        spawnedAt: Date.now(),
        durationMs: RESOURCE_STAR_DURATION_MS,
      }
      this.activeStars.push(star)
    },

    // Admin: spawnt immer einen neuen Stern – kein Guard, zufällige Planetenanzahl 1–4.
    // Nutzt direkten setTimeout, da tickResourceStar() nur bei
    // championTravelState === 'traveling' läuft.
    forceSpawnResourceStar() {
      const galaxyStore = useGalaxyStore()
      const starId = `star-${++starIdCounter}`
      const star: StarGroup = {
        id: starId,
        starType: 'resource',
        starAngle: Math.PI * 0.15 + Math.random() * Math.PI * 0.7,
        starDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
        orbitRx: 430,
        orbitRy: 188,
        orbitTilt: 0.27,
        orbitSpeed: STAR_ORBIT_SPEED_RESOURCE,
        planetSlots: this._buildResourcePlanetSlots(1 + Math.floor(Math.random() * 4)),
        spawnedAt: Date.now(),
        durationMs: RESOURCE_STAR_DURATION_MS,
      }
      this.activeStars.push(star)

      // Header-Timer anzeigen
      galaxyStore.resourceStarActive = true
      galaxyStore.resourceStarDurationMs = RESOURCE_STAR_DURATION_MS
      galaxyStore.resourceStarElapsedMs = 0

      // Direkter Fallback-Timeout unabhängig von championTravelState
      const timeout = setTimeout(() => {
        adminStarTimeouts.delete(starId)
        galaxyStore.resourceStarActive = false
        galaxyStore.resourceStarElapsedMs = 0
        this._removeAdminResourceStar(starId)
      }, RESOURCE_STAR_DURATION_MS)
      adminStarTimeouts.set(starId, timeout)
    },

    _removeAdminResourceStar(starId: string) {
      const bossStore = usePlanetBossStore()
      const idx = this.activeStars.findIndex((s) => s.id === starId)
      if (idx === -1) return
      const star = this.activeStars[idx]
      for (const slot of star.planetSlots) {
        if (!slot.cleared) {
          slot.cleared = true
          bossStore.removeBoss(slot.planetId)
        }
      }
      setTimeout(() => {
        const currentIdx = this.activeStars.findIndex((s) => s.id === starId)
        if (currentIdx !== -1) this.activeStars.splice(currentIdx, 1)
      }, 600)
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
        orbitSpeed: PLANET_ORBIT_SPEED_CHAMP_MIN + Math.random() * PLANET_ORBIT_SPEED_CHAMP_RANGE,
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
          orbitSpeed: PLANET_ORBIT_SPEED_EXTRA_MIN + Math.random() * PLANET_ORBIT_SPEED_EXTRA_RANGE,
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
        orbitSpeed: STAR_ORBIT_SPEED_CHAMPION,
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
        starAngle: Math.PI * 0.15 + Math.random() * Math.PI * 0.7,
        starDirection: 1,
        orbitRx: 320,
        orbitRy: 138,
        orbitTilt: 0.14,
        orbitSpeed: STAR_ORBIT_SPEED_GALAXY_BOSS,
        planetSlots: [
          {
            planetId,
            type: config.type,
            isChampionPlanet: false,
            orbitAngle: 0,
            orbitSpeed: PLANET_ORBIT_SPEED_BOSS,
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
          // Admin-Timeout canceln falls vorhanden
          if (adminStarTimeouts.has(star.id)) {
            clearTimeout(adminStarTimeouts.get(star.id))
            adminStarTimeouts.delete(star.id)
          }
          const idx = this.activeStars.indexOf(star)
          if (idx !== -1) {
            setTimeout(() => {
              this.activeStars.splice(idx, 1)
            }, 1500)
          }
          if (star.starType === 'champion') {
            const galaxyStore = useGalaxyStore()
            galaxyStore.onChampionStarRescued()
          }
        }
        return
      }
    },

    // Entfernt ALLE Resource-Sterne (nicht nur den ersten)
    clearResourceStar() {
      const bossStore = usePlanetBossStore()
      const toRemove = this.activeStars.filter((s) => s.starType === 'resource')
      if (toRemove.length === 0) return

      for (const star of toRemove) {
        // Admin-Timeout canceln falls vorhanden
        if (adminStarTimeouts.has(star.id)) {
          clearTimeout(adminStarTimeouts.get(star.id))
          adminStarTimeouts.delete(star.id)
        }
        for (const slot of star.planetSlots) {
          if (!slot.cleared) {
            slot.cleared = true
            bossStore.removeBoss(slot.planetId)
          }
        }
        const starRef = star
        setTimeout(() => {
          const currentIdx = this.activeStars.indexOf(starRef)
          if (currentIdx !== -1) this.activeStars.splice(currentIdx, 1)
        }, 600)
      }
    },

    clearAll() {
      for (const timeout of adminStarTimeouts.values()) {
        clearTimeout(timeout)
      }
      adminStarTimeouts.clear()
      this.activeStars = []
    },
  },
})
