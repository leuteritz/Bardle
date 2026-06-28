import { defineStore } from 'pinia'
import { useSolarUpgradeStore } from './solarUpgradeStore'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'
import { useBattleStore } from './battleStore'
import { GALAXY_THEMES } from '../config/galaxyThemes'
import { CHAMPION_DATA } from '../config/championData'
import { getChampionStarLevel } from '../config/championTiers'
import type { ChampionRole } from '../types'
import {
  CHAMPION_TRAVEL_BASE_MS,
  CHAMPION_TRAVEL_SCALE_MS,
  RESOURCE_STAR_INTERVAL_MS,
  RESOURCE_STAR_DURATION_MS,
  GALAXY_STARS_BASE_REQUIRED,
  GALAXY_CHAMPION_ARRIVAL_SIGNAL_MS,
  GALAXY_BOSS_SEARCH_SEG_MIN_MS,
  GALAXY_BOSS_SEARCH_SEG_RANGE_MS,
  GALAXY_BOSS_SEARCH_STEP_MIN,
  GALAXY_BOSS_SEARCH_STEP_RANGE,
  GALAXY_BOSS_SEARCH_BOUNDARY_MIN,
  GALAXY_BOSS_SEARCH_BOUNDARY_MAX,
  GALAXY_BOSS_TOTAL_SEARCH_MIN_MS,
  GALAXY_BOSS_TOTAL_SEARCH_RANGE_MS,
  GALAXY_BOSS_SPAWN_ANIM_MS,
  GALAXY_BOSS_SEARCH_ANGLE_MIN_DEG,
  GALAXY_BOSS_SEARCH_ANGLE_RANGE_DEG,
  MAX_STAR_LEVEL,
  GALAXY_POOL_MIN,
  GALAXY_POOL_MAX,
  TIER_UNLOCK_CHIMES_BASE,
  TIER_UNLOCK_CHIMES_GROWTH,
  TIER_UNLOCK_MATERIAL_GROWTH,
  TIER_UNLOCK_MATERIAL_BASE,
} from '../config/constants'

export type ChampionTravelState = 'idle' | 'traveling' | 'champion_available' | 'champion_spawned'

export interface TierUnlockCost {
  chimes: number
  material: Record<string, number>
}

function computeRequired(galaxy: number): number {
  return GALAXY_STARS_BASE_REQUIRED + (galaxy - 1)
}

// ── Galaxy Tier helpers (pure, exported for tests) ──────────────────────────
// Fixed grouping: Tier 1 = G1-2, then every later tier spans 3 galaxies
// (T2 = G3-5, T3 = G6-8, …).
export function tierOf(galaxy: number): number {
  return galaxy <= 2 ? 1 : 2 + Math.floor((galaxy - 3) / 3)
}

export function firstGalaxyOfTier(tier: number): number {
  return tier <= 1 ? 1 : 3 + (tier - 2) * 3
}

// Galaxy N targets star level N, clamped to the finite champion pool ceiling.
export function starLevelForGalaxy(galaxy: number): number {
  return Math.min(Math.max(1, galaxy), MAX_STAR_LEVEL)
}

// Tier 1 is free. From tier 2 up, Chimes + Material grow geometrically.
export function computeTierUnlockCost(tier: number): TierUnlockCost {
  if (tier <= 1) return { chimes: 0, material: {} }
  const exp = tier - 2
  const chimes = Math.ceil(TIER_UNLOCK_CHIMES_BASE * Math.pow(TIER_UNLOCK_CHIMES_GROWTH, exp))
  const material: Record<string, number> = {}
  for (const [id, base] of Object.entries(TIER_UNLOCK_MATERIAL_BASE)) {
    material[id] = Math.ceil(base * Math.pow(TIER_UNLOCK_MATERIAL_GROWTH, exp))
  }
  return { chimes, material }
}

function pickRandomThemeIndex(current: number): number {
  if (GALAXY_THEMES.length <= 1) return 0
  let next: number
  do {
    next = Math.floor(Math.random() * GALAXY_THEMES.length)
  } while (next === current)
  return next
}

export const useGalaxyStore = defineStore('galaxy', {
  state: () => ({
    currentGalaxy: 1,
    starsRescued: 0,
    starsRequired: GALAXY_STARS_BASE_REQUIRED,
    // ── Galaxy Tier system ──
    unlockedTier: 1, // highest tier the player has paid to unlock
    currentGalaxyChampionPool: [] as string[], // 2-4 champions rolled for this galaxy
    tierJustUnlocked: false, // transient flag → UI plays the unlock celebration, then resets
    galaxyBossDefeated: false,
    pendingGalaxyBoss: false,
    pendingTransition: false,
    isGalaxyTransitioning: false,
    currentThemeIndex: 0,
    // Role selection modal
    pendingRoleSelection: true,
    nextStarRole: null as ChampionRole | null,
    // Champion travel state machine
    championTravelState: 'idle' as ChampionTravelState,
    championTravelStartTime: 0,
    championTravelDurationMs: CHAMPION_TRAVEL_BASE_MS,
    championTravelBaseDurationMs: CHAMPION_TRAVEL_BASE_MS,
    _travelTickMs: 0,
    // Champion-Ankunfts-Signal
    championJustArrived: false,
    // Galaxy-Boss-Suchphase (Multi-Segment)
    searchingForGalaxyBoss: false,
    galaxyBossJustSpawned: false,
    // Gesamtfortschritt
    bossSearchTotalElapsed: 0,
    bossSearchTotalDuration: 0,
    // Aktuelles Segment: Start- und Zielposition + Timing
    bossSearchCurrentX: 0.5,
    bossSearchCurrentY: 0.5,
    bossSearchTargetX: 0.5,
    bossSearchTargetY: 0.5,
    bossSearchSegmentStart: 0,
    bossSearchSegmentEnd: 0,
    bossSearchSegmentAngle: 0,
    // Ressourcen-Stern Flyby
    resourceStarActive: false,
    resourceStarElapsedMs: 0,
    resourceStarDurationMs: 0,
    pendingResourceStars: 0,
    pendingChampionStar: false,
    // Champion-Rettungs-Rotationsanimation
    rescueRotationPhase: 'idle' as 'idle' | 'rotating',
    rescueRotationStartTime: 0,
    rescueRotationDirection: 1 as 1 | -1,
    rescueBurstAngleDeg: 0,
    travelPendingAfterRotation: false,
  }),

  getters: {
    isComplete(): boolean {
      return this.starsRescued >= this.starsRequired && this.galaxyBossDefeated
    },

    // ── Galaxy Tier getters ──
    currentTier(): number {
      return tierOf(this.currentGalaxy)
    },

    nextTier(): number {
      return tierOf(this.currentGalaxy + 1)
    },

    // Star level of the current galaxy → which champion pool spawns here.
    requiredStarLevel(): number {
      return starLevelForGalaxy(this.currentGalaxy)
    },

    // True when warping to the next galaxy would cross into a tier the player
    // has not yet paid to unlock.
    nextTierLocked(): boolean {
      return this.nextTier > this.currentTier && this.nextTier > this.unlockedTier
    },

    // Cost to unlock the next (locked) tier.
    tierUnlockCost(): TierUnlockCost {
      return computeTierUnlockCost(this.nextTier)
    },

    // Galaxy is complete AND the next tier (if any) is unlocked.
    canAdvance(): boolean {
      return this.isComplete && !this.nextTierLocked
    },

    needsFinalBoss(): boolean {
      return this.starsRescued >= this.starsRequired && !this.galaxyBossDefeated
    },

    isRescueRotating(): boolean {
      return this.rescueRotationPhase === 'rotating'
    },

    isBossSearchActive(): boolean {
      return this.searchingForGalaxyBoss && !this.pendingGalaxyBoss
    },

    bossSearchInterpolatedPos(): { x: number; y: number } {
      if (!this.searchingForGalaxyBoss) return { x: 0.5, y: 0.5 }
      const now = Date.now()
      const duration = this.bossSearchSegmentEnd - this.bossSearchSegmentStart
      const t = duration > 0 ? Math.max(0, Math.min(1, (now - this.bossSearchSegmentStart) / duration)) : 0
      return {
        x: this.bossSearchCurrentX + (this.bossSearchTargetX - this.bossSearchCurrentX) * t,
        y: this.bossSearchCurrentY + (this.bossSearchTargetY - this.bossSearchCurrentY) * t,
      }
    },

    effectiveTravelDurationMs(): number {
      const base =
        this.championTravelBaseDurationMs > 0
          ? this.championTravelBaseDurationMs
          : this.championTravelDurationMs
      return Math.max(1000, Math.round(base / useSolarUpgradeStore().flightSpeedMultiplier))
    },

    travelProgressPercent(): number {
      void this._travelTickMs
      if (this.championTravelState !== 'traveling') return 0
      const dur = this.effectiveTravelDurationMs
      if (dur <= 0 || this.championTravelStartTime === 0) return 0
      const elapsed = Date.now() - this.championTravelStartTime
      return Math.min(100, (elapsed / dur) * 100)
    },

    travelRemainingMs(): number {
      void this._travelTickMs
      if (this.championTravelState !== 'traveling') return 0
      if (this.championTravelStartTime === 0) return this.effectiveTravelDurationMs
      const elapsed = Date.now() - this.championTravelStartTime
      return Math.max(0, this.effectiveTravelDurationMs - elapsed)
    },

    resourceStarRemainingMs(): number {
      return this.resourceStarActive ? Math.max(0, this.resourceStarDurationMs) : 0
    },

    starsBackgroundPaused(): boolean {
      if (this.rescueRotationPhase === 'rotating') return false
      return this.pendingRoleSelection || this.championTravelState === 'champion_spawned'
    },
  },

  actions: {
    requestRoleSelection() {
      this.nextStarRole = null
      this.pendingRoleSelection = true
    },

    confirmRoleSelection(role: ChampionRole) {
      this.nextStarRole = role
      this.pendingRoleSelection = false
      this.travelPendingAfterRotation = true
      this.startRescueRotation()
    },

    startChampionTravel() {
      const baseDuration = CHAMPION_TRAVEL_BASE_MS + (this.currentGalaxy - 1) * CHAMPION_TRAVEL_SCALE_MS
      this.championTravelBaseDurationMs = baseDuration
      this.championTravelState = 'traveling'
      this.championTravelStartTime = Date.now()
      this.championTravelDurationMs = Math.round(baseDuration / useSolarUpgradeStore().flightSpeedMultiplier)
    },

    tickChampionTravel() {
      if (this.championTravelState !== 'traveling') return
      const now = Date.now()
      this._travelTickMs = now
      if (this.championTravelStartTime === 0) {
        this.championTravelStartTime = now
        return
      }
      const elapsed = now - this.championTravelStartTime
      if (elapsed >= this.effectiveTravelDurationMs) {
        this.championTravelState = 'champion_available'
        this.championJustArrived = true
        setTimeout(() => {
          this.championJustArrived = false
        }, GALAXY_CHAMPION_ARRIVAL_SIGNAL_MS)
      }
    },

    tickResourceStar(deltaMs: number) {
      if (this.championTravelState !== 'traveling') return
      if (this.resourceStarActive) {
        this.resourceStarDurationMs -= deltaMs
        if (this.resourceStarDurationMs <= 0) {
          this.resourceStarActive = false
          this.resourceStarElapsedMs = 0
        }
      } else {
        this.resourceStarElapsedMs += deltaMs
        if (this.resourceStarElapsedMs >= RESOURCE_STAR_INTERVAL_MS) {
          this.resourceStarActive = true
          this.resourceStarDurationMs = RESOURCE_STAR_DURATION_MS
          this.resourceStarElapsedMs = 0
        }
      }
    },

    _startBossSearchSegment(fromX: number, fromY: number, angle: number) {
      const segDuration = GALAXY_BOSS_SEARCH_SEG_MIN_MS + Math.random() * GALAXY_BOSS_SEARCH_SEG_RANGE_MS
      const step = GALAXY_BOSS_SEARCH_STEP_MIN + Math.random() * GALAXY_BOSS_SEARCH_STEP_RANGE
      const rad = angle * (Math.PI / 180)
      const now = Date.now()
      this.bossSearchCurrentX = fromX
      this.bossSearchCurrentY = fromY
      this.bossSearchTargetX = Math.max(GALAXY_BOSS_SEARCH_BOUNDARY_MIN, Math.min(GALAXY_BOSS_SEARCH_BOUNDARY_MAX, fromX + Math.cos(rad) * step))
      this.bossSearchTargetY = Math.max(GALAXY_BOSS_SEARCH_BOUNDARY_MIN, Math.min(GALAXY_BOSS_SEARCH_BOUNDARY_MAX, fromY + Math.sin(rad) * step))
      this.bossSearchSegmentStart = now
      this.bossSearchSegmentEnd = now + segDuration
      this.bossSearchSegmentAngle = angle
    },

    startRescueRotation() {
      this.rescueRotationPhase = 'rotating'
      this.rescueRotationStartTime = Date.now()
      this.rescueRotationDirection = Math.random() < 0.5 ? 1 : -1
      this.rescueBurstAngleDeg = Math.random() * 360
    },

    endRescueRotation() {
      this.rescueRotationPhase = 'idle'
      this.rescueRotationStartTime = 0
      if (this.travelPendingAfterRotation) {
        this.travelPendingAfterRotation = false
        this.startChampionTravel()
      }
    },

    onChampionStarRescued() {
      if (this.starsRescued >= this.starsRequired) return
      this.starsRescued++
      if (this.starsRescued >= this.starsRequired && !this.galaxyBossDefeated) {
        this.championTravelState = 'idle'
        // Start search phase with first random segment
        this.searchingForGalaxyBoss = true
        this.bossSearchTotalElapsed = 0
        this.bossSearchTotalDuration = GALAXY_BOSS_TOTAL_SEARCH_MIN_MS + Math.random() * GALAXY_BOSS_TOTAL_SEARCH_RANGE_MS
        this._startBossSearchSegment(0.5, 0.5, Math.random() * 360)
      } else {
        this.requestRoleSelection()
      }
    },

    onChampionStarExpired() {
      this.requestRoleSelection()
    },

    tickBossSearch(deltaMs: number) {
      if (!this.searchingForGalaxyBoss) return
      this.bossSearchTotalElapsed += deltaMs
      if (this.bossSearchTotalElapsed >= this.bossSearchTotalDuration) {
        this.searchingForGalaxyBoss = false
        this.pendingGalaxyBoss = true
        this.galaxyBossJustSpawned = true
        setTimeout(() => {
          this.galaxyBossJustSpawned = false
        }, GALAXY_BOSS_SPAWN_ANIM_MS)
        return
      }
      // Check if current segment has expired
      const now = Date.now()
      if (now >= this.bossSearchSegmentEnd) {
        const curX = this.bossSearchTargetX
        const curY = this.bossSearchTargetY
        // Neue Richtung: 60–300° Abweichung von aktueller (kein sofortiges Umkehren)
        const newAngle = (this.bossSearchSegmentAngle + GALAXY_BOSS_SEARCH_ANGLE_MIN_DEG + Math.random() * GALAXY_BOSS_SEARCH_ANGLE_RANGE_DEG) % 360
        this._startBossSearchSegment(curX, curY, newAngle)
      }
    },

    onGalaxyBossDefeated() {
      this.galaxyBossDefeated = true
      this.pendingGalaxyBoss = false
    },

    setGalaxyTransitioning(val: boolean) {
      this.isGalaxyTransitioning = val
    },

    requestTransition() {
      // Block the warp while the next tier is still locked — the player must pay
      // the tier-unlock cost first (see unlockNextTier / TierUnlockPanel).
      if (!this.isComplete || this.pendingTransition || this.nextTierLocked) return
      this.pendingTransition = true
    },

    // Roll the 2-4 champions that may spawn in the current galaxy, matching its
    // star level. Prefers champions the player does not yet own/recruit so the
    // pool stays meaningful; falls back to the full star-level pool, then any.
    rollGalaxyChampionPool() {
      const targetStar = this.requiredStarLevel
      const allNames = Object.keys(CHAMPION_DATA)
      const atStarLevel = allNames.filter((n) => getChampionStarLevel(n) === targetStar)

      const battleStore = useBattleStore()
      const isUnrecruitedUnowned = (name: string) =>
        !battleStore.ownedChampions.includes(name) &&
        !battleStore.recruitableChampions.some((r) => r.name === name)

      let basis = atStarLevel.filter(isUnrecruitedUnowned)
      if (basis.length === 0) basis = atStarLevel
      if (basis.length === 0) basis = allNames

      // Fisher-Yates shuffle, then take a random count in [GALAXY_POOL_MIN, GALAXY_POOL_MAX].
      const shuffled = [...basis]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      const count = Math.min(
        shuffled.length,
        GALAXY_POOL_MIN + Math.floor(Math.random() * (GALAXY_POOL_MAX - GALAXY_POOL_MIN + 1)),
      )
      this.currentGalaxyChampionPool = shuffled.slice(0, count)
    },

    // Pay the Chimes + Material cost to unlock the next tier. Returns true on success.
    unlockNextTier(): boolean {
      if (!this.nextTierLocked) return false
      const cost = this.tierUnlockCost
      const gameStore = useGameStore()
      const inventoryStore = useInventoryStore()
      if (gameStore.chimes < cost.chimes) return false
      if (!inventoryStore.hasMaterials(cost.material)) return false

      gameStore.chimes -= cost.chimes
      inventoryStore.removeMaterials(cost.material)
      this.unlockedTier = this.nextTier
      this.tierJustUnlocked = true
      return true
    },

    commitAdvance() {
      this.currentGalaxy++
      this.starsRescued = 0
      this.starsRequired = computeRequired(this.currentGalaxy)
      this.galaxyBossDefeated = false
      this.pendingGalaxyBoss = false
      this.pendingTransition = false
      this.pendingRoleSelection = false
      this.searchingForGalaxyBoss = false
      this.bossSearchTotalElapsed = 0
      this.bossSearchTotalDuration = 0
      this.galaxyBossJustSpawned = false
      this.resourceStarActive = false
      this.resourceStarElapsedMs = 0
      this.resourceStarDurationMs = 0
      this.pendingResourceStars = 0
      this.pendingChampionStar = false
      this.currentThemeIndex = pickRandomThemeIndex(this.currentThemeIndex)
      this.rollGalaxyChampionPool()
      this.requestRoleSelection()
    },
  },
})
