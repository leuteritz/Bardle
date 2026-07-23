import { defineStore } from 'pinia'
import type { PlanetType, StarType } from '../types'
import { pickConfig } from '../utils/planetDraw'
import { usePlanetBossStore } from './planetBossStore'
import { useGalaxyStore } from './galaxyStore'
import { CHAMPION_ROLES } from '../config/championRoles'
import {
  RESOURCE_STAR_PLANET_COUNT,
  RESOURCE_STAR_DURATION_MS,
  RESOURCE_STAR_MAX_CONCURRENT,
  CHAMPION_STAR_DURATION_MS,
  STAR_ORBIT_SPEED_RESOURCE,
  STAR_ORBIT_SPEED_CHAMPION,
  STAR_ORBIT_SPEED_GALAXY_BOSS,
  STAR_ORBIT_SPEED_BOSS_ESCORT,
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
  GALAXY_BOSS_ESCORT_PLANET_ORBIT_RX,
  GALAXY_BOSS_ESCORT_PLANET_ORBIT_RY,
  GALAXY_BOSS_ESCORT_PLANET_ORBIT_TILT,
  GALAXY_BOSS_WAVE_SIZE,
  GALAXY_BOSS_EXTRA_PLANET_MIN,
  GALAXY_BOSS_EXTRA_PLANET_RANGE,
  GALAXY_BOSS_ESCORT_PLANET_MIN,
  GALAXY_BOSS_ESCORT_PLANET_RANGE,
  GALAXY_BOSS_STAR_COLORS,
  GALAXY_BOSS_ESCORT_COLORS,
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

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function pickResourceStarColor(): [number, number, number] {
  return RESOURCE_STAR_COLORS[Math.floor(Math.random() * RESOURCE_STAR_COLORS.length)]
}

// Resource-Stars, deren Despawn bereits läuft (Slots geräumt, Entfernung nach
// STAR_DESPAWN_DELAY_MS eingeplant) — verhindert doppeltes Einplanen pro Tick.
const resourceDespawnScheduled = new Set<string>()

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
    activeResourceStarCount(): number {
      return this.activeStars.filter((s) => s.starType === 'resource').length
    },
    hasActiveChampionStar(): boolean {
      return this.activeStars.some((s) => s.starType === 'champion')
    },
    hasActiveGalaxyBossStar(): boolean {
      return this.activeStars.some((s) => s.starType === 'galaxy_boss')
    },
    // Eskorten der aktuellen Welle, die noch kämpfen (bereits besiegte Sterne
    // hängen bis zum Removal-Delay noch in activeStars → über Slots zählen).
    aliveBossEscortCount(): number {
      return this.activeStars.filter(
        (s) => s.starType === 'boss_escort' && s.planetSlots.some((p) => !p.cleared),
      ).length
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
      const bossStore = usePlanetBossStore()
      // Hauptplanet immer ans Ende — Champion-Rettung bzw. Galaxieboss ist das
      // Finale des Sterns, seine Belohnung kommt zuletzt
      const isMainSlot = (s: StarPlanetSlot) =>
        s.isChampionPlanet ||
        (bossStore.activeBosses.find((b) => b.planetId === s.planetId)?.isGalaxyBoss ?? false)
      const openSlots = star.planetSlots.filter((s) => !s.cleared)
      const queue = [
        ...openSlots.filter((s) => !isMainSlot(s)),
        ...openSlots.filter(isMainSlot),
      ].map((s) => s.planetId)
      if (!queue.length) return
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
      if (this.activeResourceStarCount >= RESOURCE_STAR_MAX_CONCURRENT) return
      const tier = ORBIT_TIERS.star[1]
      const star: StarGroup = {
        id: `star-${++starIdCounter}`,
        starType: 'resource',
        starAngle:
          Math.PI * STAR_SPAWN_ANGLE_MIN_PI + Math.random() * Math.PI * STAR_SPAWN_ANGLE_RANGE_PI,
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

    // Admin-Testbutton: erzwingt einen Resource-Star unabhängig vom Limit.
    // Despawn läuft über denselben Timer-Tick wie regulär gespawnte Sterne.
    forceSpawnResourceStar() {
      const tier = ORBIT_TIERS.star[1]
      const star: StarGroup = {
        id: `star-${++starIdCounter}`,
        starType: 'resource',
        starAngle:
          Math.PI * STAR_SPAWN_ANGLE_MIN_PI + Math.random() * Math.PI * STAR_SPAWN_ANGLE_RANGE_PI,
        starDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
        orbitRx: tier.rx,
        orbitRy: tier.ry,
        orbitTilt: tier.tiltRad,
        orbitSpeed: STAR_ORBIT_SPEED_RESOURCE,
        planetSlots: this._buildResourcePlanetSlots(
          STAR_FORCED_PLANET_MIN + Math.floor(Math.random() * STAR_FORCED_PLANET_RANGE),
        ),
        spawnedAt: Date.now(),
        durationMs: RESOURCE_STAR_DURATION_MS,
        starColor: pickResourceStarColor(),
      }
      this.activeStars.push(star)
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
      const champName = bossStore.activeBosses.find(
        (b) => b.planetId === champId,
      )?.homePlanetChampion
      const role = champName ? CHAMPION_ROLES[champName] : undefined
      const champStarColor: [number, number, number] = role
        ? hexToRgb(ROLE_COLORS[role])
        : [255, 255, 255]

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
      // Der Boss ist das Finale: solange noch Eskorten-Wellen ausstehen,
      // erscheint er nicht (Choreografie siehe useStarSystem-Watcher)
      if (useGalaxyStore().bossEscortsRemaining > 0) return
      const bossStore = usePlanetBossStore()

      // Boss-Planet (das Finale, in der Fight-Queue immer zuletzt) …
      const config = pickConfig()
      const planetId = `star-planet-${++planetIdCounter}`
      bossStore.spawnBoss(planetId, config.type, false, false, false, { isGalaxyBoss: true })

      const planetSlots: StarPlanetSlot[] = [
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
      ]

      // … plus zufällig viele Zusatzplaneten wie bei einem Champion-Stern.
      // Enrage-frei (isBossEscort), damit der Endkampf nicht softlocken kann.
      const extraCount =
        GALAXY_BOSS_EXTRA_PLANET_MIN + Math.floor(Math.random() * GALAXY_BOSS_EXTRA_PLANET_RANGE)
      const totalCount = 1 + extraCount
      for (let i = 1; i < totalCount; i++) {
        const extraConfig = pickConfig()
        const extraId = `star-planet-${++planetIdCounter}`
        planetSlots.push({
          planetId: extraId,
          type: extraConfig.type,
          isChampionPlanet: false,
          orbitAngle: (i / totalCount) * Math.PI * 2,
          orbitSpeed: PLANET_ORBIT_SPEED_EXTRA_MIN + Math.random() * PLANET_ORBIT_SPEED_EXTRA_RANGE,
          orbitDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
          orbitRx: EXTRA_PLANET_ORBIT_RX_MIN + Math.random() * EXTRA_PLANET_ORBIT_RX_RANGE,
          orbitRy: EXTRA_PLANET_ORBIT_RY_MIN + Math.random() * EXTRA_PLANET_ORBIT_RY_RANGE,
          orbitTilt: Math.random() * EXTRA_PLANET_ORBIT_TILT_MAX,
          cleared: false,
        })
        bossStore.spawnBoss(extraId, extraConfig.type, false, false, false, { isBossEscort: true })
      }

      const star: StarGroup = {
        id: `star-${++starIdCounter}`,
        starType: 'galaxy_boss',
        starAngle:
          Math.PI * STAR_SPAWN_ANGLE_MIN_PI + Math.random() * Math.PI * STAR_SPAWN_ANGLE_RANGE_PI,
        starDirection: 1,
        orbitRx: ORBIT_TIERS.star[1].rx,
        orbitRy: ORBIT_TIERS.star[1].ry,
        orbitTilt: ORBIT_TIERS.star[1].tiltRad,
        orbitSpeed: STAR_ORBIT_SPEED_GALAXY_BOSS,
        planetSlots,
        starColor:
          GALAXY_BOSS_STAR_COLORS[Math.floor(Math.random() * GALAXY_BOSS_STAR_COLORS.length)],
      }

      this.activeStars.push(star)
    },

    // Nächste Eskorten-Welle des Galaxieboss-Endkampfs. Wird reaktiv ausgelöst
    // (useStarSystem-Watcher), sobald keine Eskorte mehr lebt und laut
    // galaxyStore noch welche ausstehen — auch nach einem Reload.
    spawnBossEscortWave() {
      const galaxyStore = useGalaxyStore()
      const remaining = galaxyStore.bossEscortsRemaining
      if (remaining <= 0 || this.aliveBossEscortCount > 0) return
      const bossStore = usePlanetBossStore()

      const count = Math.min(GALAXY_BOSS_WAVE_SIZE, remaining)
      const baseAngle = Math.random() * Math.PI * 2
      for (let i = 0; i < count; i++) {
        // Jede Eskorte hat zufällig viele Planeten (1-3) auf gestaffelten
        // Ring-Orbits — enrage-frei wie der ganze Endkampf
        const planetCount =
          GALAXY_BOSS_ESCORT_PLANET_MIN +
          Math.floor(Math.random() * GALAXY_BOSS_ESCORT_PLANET_RANGE)
        const planetSlots: StarPlanetSlot[] = []
        for (let p = 0; p < planetCount; p++) {
          const config = pickConfig()
          const planetId = `star-planet-${++planetIdCounter}`
          planetSlots.push({
            planetId,
            type: config.type,
            isChampionPlanet: false,
            orbitAngle: Math.random() * Math.PI * 2,
            orbitSpeed: PLANET_ORBIT_SPEED_BOSS,
            orbitDirection: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
            orbitRx: GALAXY_BOSS_ESCORT_PLANET_ORBIT_RX * (1 + p * 0.6),
            orbitRy: GALAXY_BOSS_ESCORT_PLANET_ORBIT_RY * (1 + p * 0.6),
            orbitTilt: GALAXY_BOSS_ESCORT_PLANET_ORBIT_TILT,
            cleared: false,
          })
          bossStore.spawnBoss(planetId, config.type, false, false, false, { isBossEscort: true })
        }

        // Eskorten flankieren den Boss: gleichmäßig über den engeren Stern-Orbit
        // verteilt, abwechselnde Laufrichtung
        const tier = ORBIT_TIERS.star[0]
        this.activeStars.push({
          id: `star-${++starIdCounter}`,
          starType: 'boss_escort',
          starAngle: baseAngle + (i / count) * Math.PI * 2,
          starDirection: (i % 2 === 0 ? 1 : -1) as 1 | -1,
          orbitRx: tier.rx,
          orbitRy: tier.ry,
          orbitTilt: tier.tiltRad,
          orbitSpeed: STAR_ORBIT_SPEED_BOSS_ESCORT,
          planetSlots,
          starColor:
            GALAXY_BOSS_ESCORT_COLORS[Math.floor(Math.random() * GALAXY_BOSS_ESCORT_COLORS.length)],
        })
      }
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
          // Im Timeout per ID suchen — ein eingefrorener Index zeigt auf den
          // falschen Stern, sobald zwischenzeitlich gespawnt/entfernt wurde
          // (z. B. mehrere Eskorten gleichzeitig durch Splash-Damage besiegt).
          setTimeout(() => {
            const currentIdx = this.activeStars.findIndex((s) => s.id === star.id)
            if (currentIdx !== -1) this.activeStars.splice(currentIdx, 1)
          }, STAR_REMOVAL_DELAY_MS)
          if (star.starType === 'champion') {
            const galaxyStore = useGalaxyStore()
            galaxyStore.onChampionStarRescued()
          }
          if (star.starType === 'boss_escort') {
            // Eskorten sind enrage-frei → hier zählt immer ein echter Sieg
            useGalaxyStore().onBossEscortDefeated()
          }
          if (star.starType === 'galaxy_boss') {
            // Der Galaxieboss gilt erst als besiegt, wenn ALLE Planeten seines
            // Sterns gerettet sind — nicht schon beim Kill des Boss-Planeten
            useGalaxyStore().onGalaxyBossDefeated()
          }
        }
        return
      }
    },

    // Läuft im 1s-Game-Tick (auch während Pause): despawnt jeden Resource-Star,
    // dessen Despawn-Timer abgelaufen ist ODER dessen Planeten alle gerettet/
    // gekillt wurden. So verschwinden Sterne auch während der Pause korrekt.
    tickResourceStars() {
      const now = Date.now()
      for (const star of this.activeStars) {
        if (star.starType !== 'resource') continue
        if (resourceDespawnScheduled.has(star.id)) continue
        const allCleared = star.planetSlots.every((s) => s.cleared)
        const expired =
          star.spawnedAt !== undefined &&
          star.durationMs !== undefined &&
          now >= star.spawnedAt + star.durationMs
        if (allCleared || expired) {
          this._despawnResourceStar(star.id)
        }
      }
    },

    _despawnResourceStar(starId: string) {
      const bossStore = usePlanetBossStore()
      const star = this.activeStars.find((s) => s.id === starId)
      if (!star) return
      resourceDespawnScheduled.add(starId)
      if (this.activeFightStarId === starId) this.closeStarFightModal()
      // Slots sofort räumen → Kampf endet, und der Render-Loop sieht
      // allSlotsCleared und zündet den Vanish-Effekt.
      for (const slot of star.planetSlots) {
        if (!slot.cleared) {
          slot.cleared = true
          bossStore.removeBoss(slot.planetId)
        }
      }
      setTimeout(() => {
        const idx = this.activeStars.findIndex((s) => s.id === starId)
        if (idx !== -1) this.activeStars.splice(idx, 1)
        resourceDespawnScheduled.delete(starId)
      }, STAR_DESPAWN_DELAY_MS)
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
      resourceDespawnScheduled.clear()
      this.activeStars = []
    },
  },
})
