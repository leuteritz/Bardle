import { defineStore } from 'pinia'
import { useSolarUpgradeStore } from './solarUpgradeStore'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'
import { GALAXY_THEMES } from '../config/galaxyThemes'
import { unlockedChampionTierCount } from '../config/championTiers'
import type { ChampionRole } from '../types'
import { clampPercent } from '../utils/math'
import {
  CHAMPION_TRAVEL_BASE_MS,
  CHAMPION_TRAVEL_SCALE_MS,
  RESOURCE_STAR_INTERVAL_MS,
  RESOURCE_STAR_DURATION_MS,
  GALAXY_STARS_BASE_REQUIRED,
  GALAXY_CHAMPION_ARRIVAL_SIGNAL_MS,
  GALAXY_STAR_FAILED_SIGNAL_MS,
  GALAXY_BOSS_SPAWN_ANIM_MS,
  GALAXY_BOSS_ESCORT_BASE,
  GALAXY_BOSS_ESCORT_PER_GALAXY,
  GALAXY_BOSS_ESCORT_MAX,
  GALAXY_BOSS_WAVE_SIZE,
  MAX_STAR_LEVEL,
  TIER_UNLOCK_CHIMES_BASE,
  TIER_UNLOCK_CHIMES_GROWTH,
  TIER_UNLOCK_MATERIAL_GROWTH,
  TIER_UNLOCK_MATERIAL_BASE,
} from '../config/constants'

export type ChampionTravelState = 'idle' | 'traveling' | 'champion_available' | 'champion_spawned'

export type StarAttemptResult = 'rescued' | 'failed'

export interface TierUnlockCost {
  chimes: number
  material: Record<string, number>
}

function computeRequired(galaxy: number): number {
  return GALAXY_STARS_BASE_REQUIRED + (galaxy - 1)
}

// Eskorten-Sterne, die zusammen mit dem Galaxieboss auftauchen — frühe
// Galaxien wenige, später mehr (exportiert für Tests).
export function computeBossEscortCount(galaxy: number): number {
  return Math.min(
    GALAXY_BOSS_ESCORT_BASE + (galaxy - 1) * GALAXY_BOSS_ESCORT_PER_GALAXY,
    GALAXY_BOSS_ESCORT_MAX,
  )
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
    // Chronological outcome of every champion-star attempt this galaxy —
    // drives the minimap (rescued ✦ / failed ✕ markers, next-target position).
    attemptResults: [] as StarAttemptResult[],
    starJustFailed: false, // transient → minimap "Star Lost" flash
    // Fresh random seed per galaxy run: spawn point + star placement differ
    // every playthrough (persisted so the layout survives a reload).
    mapSeed: Math.floor(Math.random() * 0xffffffff),
    // ── Galaxy Tier system ──
    unlockedTier: 1, // highest tier the player has paid to unlock
    tierJustUnlocked: false, // transient flag → UI plays the unlock celebration, then resets
    galaxyBossDefeated: false,
    pendingGalaxyBoss: false,
    // ── Boss-Eskorten-Wellen ──
    // Beim Erreichen des Galaxiekerns initialisiert; die Eskorten spawnen in
    // Wellen à GALAXY_BOSS_WAVE_SIZE (siehe starGroupStore.spawnBossEscortWave).
    bossEscortsTotal: 0,
    bossEscortsDefeated: 0,
    // After the last champion star: the ship flies to the FIXED boss star at
    // the galaxy core (same travel flow as a champion star). Replaces the old
    // random boss-search phase.
    travelingToGalaxyBoss: false,
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
    galaxyBossJustSpawned: false,
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
      return (
        this.starsRescued >= this.starsRequired &&
        this.galaxyBossDefeated &&
        this.bossEscortsDefeated >= this.bossEscortsTotal
      )
    },

    bossEscortsRemaining(): number {
      return Math.max(0, this.bossEscortsTotal - this.bossEscortsDefeated)
    },

    // Aktive Endkampf-Phase am Galaxiekern: vom Boss-Spawn bis Boss UND alle
    // Eskorten besiegt sind. Deckt auch den Zwischenzustand "Boss tot, aber
    // Eskorten leben noch" ab (dort ist pendingGalaxyBoss bereits false).
    bossPhaseActive(): boolean {
      return (
        (this.pendingGalaxyBoss || this.galaxyBossDefeated) &&
        this.starsRescued >= this.starsRequired &&
        !this.isComplete
      )
    },

    bossWavesTotal(): number {
      return Math.ceil(this.bossEscortsTotal / GALAXY_BOSS_WAVE_SIZE)
    },

    currentBossWave(): number {
      if (this.bossEscortsTotal <= 0) return 0
      return Math.min(
        this.bossWavesTotal,
        Math.floor(this.bossEscortsDefeated / GALAXY_BOSS_WAVE_SIZE) + 1,
      )
    },

    // ── Galaxy Tier getters ──
    currentTier(): number {
      return tierOf(this.currentGalaxy)
    },

    nextTier(): number {
      return tierOf(this.currentGalaxy + 1)
    },

    // Highest Champion Tier unlocked at the current galaxy (tiers spawn cumulatively).
    // Drives the Shop "unlocked" styling and the spawn-weight row.
    requiredStarLevel(): number {
      return unlockedChampionTierCount(this.currentGalaxy)
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
      return clampPercent((elapsed / dur) * 100)
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
      // Auch der komplette Endkampf am Galaxiekern (Eskorten-Wellen + Boss)
      // friert den Hintergrund ein — wie bei einem erreichten Champion-Stern.
      return (
        this.pendingRoleSelection ||
        this.championTravelState === 'champion_spawned' ||
        this.bossPhaseActive
      )
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
        if (this.travelingToGalaxyBoss) {
          // Reached the galaxy core → the boss star spawns right there
          this.travelingToGalaxyBoss = false
          this.championTravelState = 'idle'
          this.initBossWave()
          this.pendingGalaxyBoss = true
          this.galaxyBossJustSpawned = true
          setTimeout(() => {
            this.galaxyBossJustSpawned = false
          }, GALAXY_BOSS_SPAWN_ANIM_MS)
          return
        }
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
      this.attemptResults.push('rescued')
      if (this.starsRescued >= this.starsRequired && !this.galaxyBossDefeated) {
        // Last star saved → fly to the boss star waiting at the galaxy core,
        // with the same travel flow as a champion star (route, comet, zoom).
        this.travelingToGalaxyBoss = true
        this.startChampionTravel()
      } else {
        this.requestRoleSelection()
      }
    },

    onChampionStarExpired() {
      // Failed rescue: the chosen role stays locked in — no new role selection.
      // A fresh star with the same role appears and the ship departs for it;
      // the lost star stays on the minimap as a failed marker.
      if (!this.nextStarRole) {
        this.requestRoleSelection()
        return
      }
      this.attemptResults.push('failed')
      this.starJustFailed = true
      setTimeout(() => {
        this.starJustFailed = false
      }, GALAXY_STAR_FAILED_SIGNAL_MS)
      // Depart straight from the lost star — no rescue rotation (that
      // animation launches from the map center and reads like a jump back
      // to the previous star). The ship stays put and flies on from here.
      this.travelPendingAfterRotation = false
      this.startChampionTravel()
    },

    onGalaxyBossDefeated() {
      this.galaxyBossDefeated = true
      this.pendingGalaxyBoss = false
    },

    initBossWave() {
      this.bossEscortsTotal = computeBossEscortCount(this.currentGalaxy)
      this.bossEscortsDefeated = 0
    },

    onBossEscortDefeated() {
      if (this.bossEscortsDefeated < this.bossEscortsTotal) this.bossEscortsDefeated++
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
      this.attemptResults = []
      this.starJustFailed = false
      this.mapSeed = Math.floor(Math.random() * 0xffffffff)
      this.galaxyBossDefeated = false
      this.pendingGalaxyBoss = false
      this.bossEscortsTotal = 0
      this.bossEscortsDefeated = 0
      this.travelingToGalaxyBoss = false
      this.pendingTransition = false
      this.pendingRoleSelection = false
      this.galaxyBossJustSpawned = false
      this.resourceStarActive = false
      this.resourceStarElapsedMs = 0
      this.resourceStarDurationMs = 0
      this.pendingResourceStars = 0
      this.pendingChampionStar = false
      this.currentThemeIndex = pickRandomThemeIndex(this.currentThemeIndex)
      this.requestRoleSelection()
    },

    // Admin-only: teleport straight to galaxy N. Reuses commitAdvance() so the
    // resulting state is identical to legitimately entering galaxy N (stars reset,
    // starsRequired recomputed, champion pool re-rolled, theme + role-selection set).
    // unlockedTier is raised so later legit advances aren't blocked at a tier gate.
    adminJumpToGalaxy(target: number) {
      const n = Math.max(1, Math.floor(target))
      this.currentGalaxy = n - 1
      this.unlockedTier = Math.max(this.unlockedTier, tierOf(n))
      this.commitAdvance()
    },
  },
})
