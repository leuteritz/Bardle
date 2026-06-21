import { defineStore } from 'pinia'
import type { PlanetType, StarType } from '../types'
import { pickConfig } from '../utils/planetDraw'
import { usePlanetBossStore } from './planetBossStore'
import { useGalaxyStore } from './galaxyStore'
import { CHAMPION_ROLES } from '../config/championRoles'
import {
  RESOURCE_STAR_PLANET_COUNT,
  RESOURCE_STAR_DURATION_MS,
  CHAMPION_STAR_DURATION_MS,
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
  ORBIT_TIERS,
  STAR_PLANET_ORBIT_RX_MIN,
  STAR_PLANET_ORBIT_RX_RANGE,
  STAR_PLANET_ORBIT_RY_MIN,
  STAR_PLANET_ORBIT_RY_RANGE,
  STAR_PLANET_ORBIT_TILT_MAX,
  STAR_SPAWN_ANGLE_MIN_PI,
  STAR_SPAWN_ANGLE_RANGE_PI,
  STAR_FORCED_PLANET_MIN,
  STAR_FORCED_PLANET_RANGE,
  STAR_REMOVAL_DELAY_MS,
  STAR_DESPAWN_DELAY_MS,
  STAR_EXTRA_PLANET_MIN,
  STAR_EXTRA_PLANET_RANGE,
  CHAMPION_STAR_FIXED_ANGLE_FRAC_PI,
  CHAMP_PLANET_ORBIT_RX_MIN,
  CHAMP_PLANET_ORBIT_RX_RANGE,
  CHAMP_PLANET_ORBIT_RY_MIN,
  CHAMP_PLANET_ORBIT_RY_RANGE,
  CHAMP_PLANET_ORBIT_TILT_MAX,
  EXTRA_PLANET_ORBIT_RX_MIN,
  EXTRA_PLANET_ORBIT_RX_RANGE,
  EXTRA_PLANET_ORBIT_RY_MIN,
  EXTRA_PLANET_ORBIT_RY_RANGE,
  EXTRA_PLANET_ORBIT_TILT_MAX,
  GALAXY_BOSS_PLANET_ORBIT_RX,
  GALAXY_BOSS_PLANET_ORBIT_RY,
  GALAXY_BOSS_PLANET_ORBIT_TILT,
  RESOURCE_STAR_COLORS,
  ROLE_COLORS,
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
  starColor: [number, number, number]
}

const SPECTRAL_STAR_PALETTE: { weight: number; colors: [number, number, number][] }[] = [
  { weight: 0.30, colors: [[255, 96, 48], [255, 69, 0]] },
  { weight: 0.30, colors: [[255, 179, 71], [255, 160, 64]] },
  { weight: 0.20, colors: [[255, 244, 163], [255, 233, 122]] },
  { weight: 0.12, colors: [[245, 245, 255], [255, 255, 255]] },
  { weight: 0.08, colors: [[176, 200, 255], [202, 216, 255]] },
]

function pickStarColor(): [number, number, number] {
  const rand = Math.random()
  let cumulative = 0
  for (const category of SPECTRAL_STAR_PALETTE) {
    cumulative += category.weight
    if (rand < cumulative)
      return category.colors[Math.floor(Math.random() * category.colors.length)]
  }
  return SPECTRAL_STAR_PALETTE[SPECTRAL_STAR_PALETTE.length - 1].colors[0]
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function pickResourceStarColor(): [number, number, number] {
  return RESOURCE_STAR_COLORS[Math.floor(Math.random() * RESOURCE_STAR_COLORS.length)]
}

const adminStarTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

export const useStarGroupStore = defineStore('starGroup', {
  state: () => ({
    activeStars: [] as StarGroup[],
    starFightModalOpen: false,
    activeFightStarId: null as string | null,
    starFightPlanetQueue: [] as string[],
    starFightCurrentIndex: 0,
    hoveredTimerStarId: null as string | null,
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
    currentFightPlanetId(): string | null {
      if (!this.starFightModalOpen || !this.starFightPlanetQueue.length) return null
      return this.starFightPlanetQueue[this.starFightCurrentIndex] ?? null
    },
  },

  actions: {
    setHoveredTimerStar(id: string | null) {
      this.hoveredTimerStarId = id
    },

    openStarFightModal(starId: string) {
      const star = this.activeStars.find((s) => s.id === starId)
      if (!star) return
      const queue = star.planetSlots.filter((s) => !s.cleared).map((s) => s.planetId)
      if (!queue.length) return
      const bossStore = usePlanetBossStore()
      this.starFightModalOpen = true
      this.activeFightStarId = starId
      this.starFightPlanetQueue = queue
      this.starFightCurrentIndex = 0
      bossStore.selectedBossId = queue[0]
    },

    closeStarFightModal() {
      this.starFightModalOpen = false
      this.activeFightStarId = null
      this.starFightPlanetQueue = []
      this.starFightCurrentIndex = 0
    },

    advanceStarFight() {
      const bossStore = usePlanetBossStore()
      const nextIdx = this.starFightCurrentIndex + 1
      if (nextIdx >= this.starFightPlanetQueue.length) {
        this.closeStarFightModal()
        return
      }
      this.starFightCurrentIndex = nextIdx
      bossStore.selectedBossId = this.starFightPlanetQueue[nextIdx]
    },

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
          orbitRx: STAR_PLANET_ORBIT_RX_MIN + Math.random() * STAR_PLANET_ORBIT_RX_RANGE,
          orbitRy: STAR_PLANET_ORBIT_RY_MIN + Math.random() * STAR_PLANET_ORBIT_RY_RANGE,
          orbitTilt: Math.random() * STAR_PLANET_ORBIT_TILT_MAX,
          cleared: false,
        })
        bossStore.spawnBoss(planetId, config.type, false, true)
      }
      return slots
    },

    spawnResourceStar() {
      if (this.hasActiveResourceStar) return
      const tier = ORBIT_TIERS.star[1]
      const star: StarGroup = {
        id: `star-${++starIdCounter}`,
        starType: 'resource',
        starAngle: Math.PI * STAR_SPAWN_ANGLE_MIN_PI + Math.random() * Math.PI * STAR_SPAWN_ANGLE_RANGE_PI,
        starDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
        orbitRx: tier.rx,
        orbitRy: tier.ry,
        orbitTilt: tier.tiltRad,
        orbitSpeed: STAR_ORBIT_SPEED_RESOURCE,
        planetSlots: this._buildResourcePlanetSlots(RESOURCE_STAR_PLANET_COUNT),
        spawnedAt: Date.now(),
        durationMs: RESOURCE_STAR_DURATION_MS,
        starColor: pickResourceStarColor(),
      }
      this.activeStars.push(star)
    },

    forceSpawnResourceStar() {
      const galaxyStore = useGalaxyStore()
      const tier = ORBIT_TIERS.star[1]
      const starId = `star-${++starIdCounter}`
      const star: StarGroup = {
        id: starId,
        starType: 'resource',
        starAngle: Math.PI * STAR_SPAWN_ANGLE_MIN_PI + Math.random() * Math.PI * STAR_SPAWN_ANGLE_RANGE_PI,
        starDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
        orbitRx: tier.rx,
        orbitRy: tier.ry,
        orbitTilt: tier.tiltRad,
        orbitSpeed: STAR_ORBIT_SPEED_RESOURCE,
        planetSlots: this._buildResourcePlanetSlots(STAR_FORCED_PLANET_MIN + Math.floor(Math.random() * STAR_FORCED_PLANET_RANGE)),
        spawnedAt: Date.now(),
        durationMs: RESOURCE_STAR_DURATION_MS,
        starColor: pickResourceStarColor(),
      }
      this.activeStars.push(star)

      galaxyStore.resourceStarActive = true
      galaxyStore.resourceStarDurationMs = RESOURCE_STAR_DURATION_MS
      galaxyStore.resourceStarElapsedMs = 0

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
      if (this.activeFightStarId === starId) this.closeStarFightModal()
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

      const extraCount = STAR_EXTRA_PLANET_MIN + Math.floor(Math.random() * STAR_EXTRA_PLANET_RANGE)
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
        orbitDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
        orbitRx: CHAMP_PLANET_ORBIT_RX_MIN + Math.random() * CHAMP_PLANET_ORBIT_RX_RANGE,
        orbitRy: CHAMP_PLANET_ORBIT_RY_MIN + Math.random() * CHAMP_PLANET_ORBIT_RY_RANGE,
        orbitTilt: Math.random() * CHAMP_PLANET_ORBIT_TILT_MAX,
        cleared: false,
      })
      bossStore.spawnBoss(champId, champConfig.type, true)
      const champName = bossStore.activeBosses.find(b => b.planetId === champId)?.homePlanetChampion
      const role = champName ? CHAMPION_ROLES[champName] : undefined
      const champStarColor: [number, number, number] = role ? hexToRgb(ROLE_COLORS[role]) : [255, 255, 255]

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
          orbitRx: EXTRA_PLANET_ORBIT_RX_MIN + Math.random() * EXTRA_PLANET_ORBIT_RX_RANGE,
          orbitRy: EXTRA_PLANET_ORBIT_RY_MIN + Math.random() * EXTRA_PLANET_ORBIT_RY_RANGE,
          orbitTilt: Math.random() * EXTRA_PLANET_ORBIT_TILT_MAX,
          cleared: false,
        })
        bossStore.spawnBoss(planetId, config.type, false, false, true)
      }

      galaxyStore.championTravelState = 'champion_spawned'

      const tier = ORBIT_TIERS.star[0]
      const star: StarGroup = {
        id: `star-${++starIdCounter}`,
        starType: 'champion',
        starAngle: Math.PI * CHAMPION_STAR_FIXED_ANGLE_FRAC_PI,
        starDirection: 1,
        orbitRx: tier.rx,
        orbitRy: tier.ry,
        orbitTilt: tier.tiltRad,
        orbitSpeed: STAR_ORBIT_SPEED_CHAMPION,
        planetSlots,
        spawnedAt: Date.now(),
        durationMs: CHAMPION_STAR_DURATION_MS,
        starColor: champStarColor,
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
        starAngle: Math.PI * STAR_SPAWN_ANGLE_MIN_PI + Math.random() * Math.PI * STAR_SPAWN_ANGLE_RANGE_PI,
        starDirection: 1,
        orbitRx: ORBIT_TIERS.star[1].rx,
        orbitRy: ORBIT_TIERS.star[1].ry,
        orbitTilt: ORBIT_TIERS.star[1].tiltRad,
        orbitSpeed: STAR_ORBIT_SPEED_GALAXY_BOSS,
        planetSlots: [
          {
            planetId,
            type: config.type,
            isChampionPlanet: false,
            orbitAngle: 0,
            orbitSpeed: PLANET_ORBIT_SPEED_BOSS,
            orbitDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
            orbitRx: GALAXY_BOSS_PLANET_ORBIT_RX,
            orbitRy: GALAXY_BOSS_PLANET_ORBIT_RY,
            orbitTilt: GALAXY_BOSS_PLANET_ORBIT_TILT,
            cleared: false,
          },
        ],
        starColor: pickStarColor(),
      }

      this.activeStars.push(star)
    },

    onBossResult(planetId: string) {
      for (const star of this.activeStars) {
        const slot = star.planetSlots.find((p) => p.planetId === planetId)
        if (!slot) continue
        slot.cleared = true

        if (this.starFightModalOpen && this.activeFightStarId === star.id) {
          this.advanceStarFight()
        }

        if (star.planetSlots.every((p) => p.cleared)) {
          if (adminStarTimeouts.has(star.id)) {
            clearTimeout(adminStarTimeouts.get(star.id))
            adminStarTimeouts.delete(star.id)
          }
          const idx = this.activeStars.indexOf(star)
          if (idx !== -1) {
            setTimeout(() => {
              this.activeStars.splice(idx, 1)
            }, STAR_REMOVAL_DELAY_MS)
          }
          if (star.starType === 'champion') {
            const galaxyStore = useGalaxyStore()
            galaxyStore.onChampionStarRescued()
          }
        }
        return
      }
    },

    clearResourceStar() {
      const bossStore = usePlanetBossStore()
      const toRemove = this.activeStars.filter((s) => s.starType === 'resource')
      if (toRemove.length === 0) return

      for (const star of toRemove) {
        if (adminStarTimeouts.has(star.id)) {
          clearTimeout(adminStarTimeouts.get(star.id))
          adminStarTimeouts.delete(star.id)
        }
        if (this.activeFightStarId === star.id) this.closeStarFightModal()
        const starRef = star
        setTimeout(() => {
          for (const slot of starRef.planetSlots) {
            if (!slot.cleared) {
              slot.cleared = true
              bossStore.removeBoss(slot.planetId)
            }
          }
          // One JS tick later so the render loop sees allSlotsCleared and fires the vanish effect
          setTimeout(() => {
            const currentIdx = this.activeStars.indexOf(starRef)
            if (currentIdx !== -1) this.activeStars.splice(currentIdx, 1)
          }, 0)
        }, STAR_DESPAWN_DELAY_MS)
      }
    },

    tickChampionStar() {
      const galaxyStore = useGalaxyStore()
      if (galaxyStore.championTravelState !== 'champion_spawned') return
      const champion = this.activeStars.find((s) => s.starType === 'champion')
      if (!champion || champion.spawnedAt === undefined || champion.durationMs === undefined) return
      if (Date.now() >= champion.spawnedAt + champion.durationMs) {
        this.clearChampionStar()
      }
    },

    clearChampionStar() {
      const bossStore = usePlanetBossStore()
      const galaxyStore = useGalaxyStore()
      const toRemove = this.activeStars.filter((s) => s.starType === 'champion')
      if (toRemove.length === 0) return

      for (const star of toRemove) {
        if (this.activeFightStarId === star.id) this.closeStarFightModal()
        const starRef = star
        setTimeout(() => {
          for (const slot of starRef.planetSlots) {
            if (!slot.cleared) {
              slot.cleared = true
              bossStore.removeBoss(slot.planetId)
            }
          }
          // One JS tick later so the render loop sees allSlotsCleared and fires the vanish effect
          setTimeout(() => {
            const currentIdx = this.activeStars.indexOf(starRef)
            if (currentIdx !== -1) this.activeStars.splice(currentIdx, 1)
          }, 0)
        }, STAR_DESPAWN_DELAY_MS)
      }

      galaxyStore.onChampionStarExpired()
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
