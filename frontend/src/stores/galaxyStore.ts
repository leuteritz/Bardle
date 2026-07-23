import { defineStore } from 'pinia'
import { useSolarUpgradeStore } from './solarUpgradeStore'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'
import { useUiStore } from './uiStore'
import { GALAXY_THEMES } from '../config/galaxyThemes'
import { unlockedChampionTierCount } from '../config/championTiers'
import type { ChampionRole } from '../types'
import { clampPercent } from '../utils/math'
import {
  CHAMPION_TRAVEL_BASE_MS,
  CHAMPION_TRAVEL_SCALE_MS,
  RESOURCE_STAR_INTERVAL_MIN_MS,
  RESOURCE_STAR_INTERVAL_MAX_MS,
  GALAXY_STARS_BASE_REQUIRED,
  GALAXY_CHAMPION_ARRIVAL_SIGNAL_MS,
  GALAXY_STAR_FAILED_SIGNAL_MS,
  GALAXY_BOSS_SPAWN_ANIM_MS,
  GALAXY_BOSS_ESCORT_BASE,
  GALAXY_BOSS_ESCORT_PER_GALAXY,
  GALAXY_BOSS_ESCORT_MAX,
  GALAXY_BOSS_WAVE_SIZE,
  RESCUE_ROTATION_DURATION_MS,
  GALAXY_TRANS_WARP_MS,
  GALAXY_TRANS_DECEL_MS,
  MAX_STAR_LEVEL,
  TIER_UNLOCK_CHIMES_BASE,
  TIER_UNLOCK_CHIMES_GROWTH,
  TIER_UNLOCK_MATERIAL_GROWTH,
  TIER_UNLOCK_MATERIAL_BASE,
} from '../config/constants'

export type ChampionTravelState = 'idle' | 'traveling' | 'champion_available' | 'champion_spawned'

export type StarAttemptResult = 'rescued' | 'failed'

/** Archived record of a completed galaxy — everything the Bard-Stats
 *  "Galaxy Archive" needs to re-render the minimap exactly as it was played
 *  (the snapshot renderer is deterministic in mapSeed + attemptResults). */
export interface CompletedGalaxyRecord {
  galaxy: number
  mapSeed: number
  themeIndex: number
  attemptResults: StarAttemptResult[]
  /** In-game seconds spent from entering the galaxy until the core was freed. */
  durationSeconds: number
  /** Wall-clock timestamp of the completion. */
  completedAt: number
}

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

// Theme 0 (Blue Veil) ist fest für Galaxie 1 reserviert — jede weitere Galaxie
// zieht zufällig aus den noch nicht besuchten Themes, damit sich innerhalb
// eines Durchlaufs keine Galaxiefarbe wiederholt.
function allNonHomeThemeIndices(): number[] {
  return GALAXY_THEMES.map((_, i) => i).filter((i) => i !== 0)
}

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 0
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return (h * 60 + 360) % 360
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

// Mindest-Farbton-Abstand zur Vorgänger-Galaxie: verhindert, dass zwei
// ähnliche Farbwelten (z. B. zwei Grüntöne) direkt aufeinander folgen.
const MIN_THEME_HUE_DISTANCE = 60

function themeHue(index: number): number {
  return hexToHue(GALAXY_THEMES[index].accentColor)
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
    // ── Galaxy history (Bard-Stats "Galaxy Archive") ──
    // gameStore.inGameTime (seconds) at the moment this galaxy was entered —
    // basis for the per-galaxy completion time.
    galaxyStartedAtInGameTime: 0,
    completedGalaxies: [] as CompletedGalaxyRecord[],
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
    // Alle in diesem Durchlauf bereits verwendeten Theme-Indizes — verhindert,
    // dass sich eine Galaxiefarbe wiederholt, bevor alle Themes durch sind.
    usedThemeIndices: [0] as number[],
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
    // Ressourcen-Stern Flyby — Scheduler feuert zufällig gestaffelte Spawns,
    // bis zu RESOURCE_STAR_MAX_CONCURRENT Sterne existieren gleichzeitig.
    resourceStarElapsedMs: 0,
    resourceStarNextIntervalMs: 0,
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
      const baseDuration =
        CHAMPION_TRAVEL_BASE_MS + (this.currentGalaxy - 1) * CHAMPION_TRAVEL_SCALE_MS
      this.championTravelBaseDurationMs = baseDuration
      this.championTravelState = 'traveling'
      this.championTravelStartTime = Date.now()
      this.championTravelDurationMs = Math.round(
        baseDuration / useSolarUpgradeStore().flightSpeedMultiplier,
      )
    },

    tickChampionTravel() {
      // Safety net: the rotation is normally ended by the orbit rAF loop,
      // which pauses while the Bard profile is open or the tab is hidden —
      // end an expired rotation here so the departure never stalls.
      if (
        this.rescueRotationPhase === 'rotating' &&
        Date.now() - this.rescueRotationStartTime >= RESCUE_ROTATION_DURATION_MS
      ) {
        this.endRescueRotation()
      }
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

    _rollResourceStarInterval(): number {
      return (
        RESOURCE_STAR_INTERVAL_MIN_MS +
        Math.random() * (RESOURCE_STAR_INTERVAL_MAX_MS - RESOURCE_STAR_INTERVAL_MIN_MS)
      )
    },

    // Läuft im 1s-Game-Tick (auch während Pause). Gibt `true` zurück, sobald das
    // zufällig gestaffelte Intervall abgelaufen ist und ein neuer Resource-Star
    // gespawnt werden soll. Der Aufrufer (gameStore.tick) respektiert dabei das
    // Concurrency-Limit. Nur während der Champion-Reise aktiv.
    tickResourceStar(deltaMs: number): boolean {
      if (this.championTravelState !== 'traveling') return false
      if (this.resourceStarNextIntervalMs <= 0) {
        this.resourceStarNextIntervalMs = this._rollResourceStarInterval()
      }
      this.resourceStarElapsedMs += deltaMs
      if (this.resourceStarElapsedMs >= this.resourceStarNextIntervalMs) {
        this.resourceStarElapsedMs = 0
        this.resourceStarNextIntervalMs = this._rollResourceStarInterval()
        return true
      }
      return false
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
      this.maybeRecordCompletion()
    },

    // Archive the finished galaxy the moment isComplete flips to true (boss AND
    // all escorts down). Idempotent — commitAdvance calls it again as a safety
    // net for legacy saves that load in an already-complete state.
    maybeRecordCompletion() {
      if (!this.isComplete) return
      // One record per galaxy number; a same-run re-call keeps the identical
      // record, an admin-replay of the galaxy replaces it with the fresh run.
      const existing = this.completedGalaxies.findIndex((r) => r.galaxy === this.currentGalaxy)
      if (existing >= 0 && this.completedGalaxies[existing].mapSeed === this.mapSeed) return
      const inGameTime = useGameStore().inGameTime
      if (existing >= 0) this.completedGalaxies.splice(existing, 1)
      this.completedGalaxies.push({
        galaxy: this.currentGalaxy,
        mapSeed: this.mapSeed,
        themeIndex: this.currentThemeIndex,
        attemptResults: [...this.attemptResults],
        durationSeconds: Math.max(0, inGameTime - this.galaxyStartedAtInGameTime),
        completedAt: Date.now(),
      })
    },

    initBossWave() {
      this.bossEscortsTotal = computeBossEscortCount(this.currentGalaxy)
      this.bossEscortsDefeated = 0
    },

    onBossEscortDefeated() {
      if (this.bossEscortsDefeated < this.bossEscortsTotal) this.bossEscortsDefeated++
      this.maybeRecordCompletion()
    },

    setGalaxyTransitioning(val: boolean) {
      this.isGalaxyTransitioning = val
    },

    requestTransition() {
      // Block the warp while the next tier is still locked — the player must pay
      // the tier-unlock cost first (see unlockNextTier / TierUnlockPanel).
      if (!this.isComplete || this.pendingTransition || this.nextTierLocked) return
      this.pendingTransition = true
      // If the Bard profile is open, close it first so the hyperspace warp
      // plays in full view: the orbit-background rAF loop (paused while the
      // profile is open) resumes on close and drives the transition from the
      // pendingTransition flag.
      const ui = useUiStore()
      if (ui.bardActiveTab !== null) {
        ui.closeBardModal()
        // With reduced motion the background loop never restarts, so nothing
        // would drive the warp — advance the galaxy on wall-clock timers
        // instead (the loop skips a transition already running via the
        // isGalaxyTransitioning guard).
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          this.setGalaxyTransitioning(true)
          window.setTimeout(() => this.commitAdvance(), GALAXY_TRANS_WARP_MS)
          window.setTimeout(
            () => this.setGalaxyTransitioning(false),
            GALAXY_TRANS_WARP_MS + GALAXY_TRANS_DECEL_MS,
          )
        }
      }
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
      // Safety net: archive the outgoing galaxy if the completion moment itself
      // wasn't captured (e.g. legacy save loaded in an already-complete state).
      this.maybeRecordCompletion()
      this.currentGalaxy++
      this.galaxyStartedAtInGameTime = useGameStore().inGameTime
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
      this.resourceStarElapsedMs = 0
      this.resourceStarNextIntervalMs = 0
      this.pendingChampionStar = false
      if (this.currentGalaxy === 1) {
        // Galaxie 1 ist immer das vertraute Blau (Blue Veil).
        this.currentThemeIndex = 0
        this.usedThemeIndices = [0]
      } else {
        let available = allNonHomeThemeIndices().filter((i) => !this.usedThemeIndices.includes(i))
        if (available.length === 0) {
          // Alle Themes gesehen → Zyklus neu starten, aber ohne direkte Wiederholung.
          this.usedThemeIndices = [0]
          available = allNonHomeThemeIndices().filter((i) => i !== this.currentThemeIndex)
        }
        // Deutlich anders als die Vorgänger-Galaxie: nur Themes mit genug
        // Farbton-Abstand zulassen — falls keins übrig ist, Regel lockern.
        const currentHue = themeHue(this.currentThemeIndex)
        const contrasting = available.filter(
          (i) => hueDistance(themeHue(i), currentHue) >= MIN_THEME_HUE_DISTANCE,
        )
        if (contrasting.length > 0) available = contrasting
        const next = available[Math.floor(Math.random() * available.length)]
        this.currentThemeIndex = next
        this.usedThemeIndices.push(next)
      }
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
