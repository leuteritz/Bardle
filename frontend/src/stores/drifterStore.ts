import { defineStore } from 'pinia'
import type { ActiveDrifter, DrifterActiveBuff, DrifterDef } from '../types'
import { DRIFTERS, DRIFTER_TOTAL_WEIGHT, getDrifter } from '../config/drifters'
import { logger } from '../utils/logger'
import {
  DRIFTER_SPAWN_INTERVAL_MIN_SEC,
  DRIFTER_SPAWN_INTERVAL_MAX_SEC,
  DRIFTER_FIRST_DELAY_MIN_SEC,
  DRIFTER_FIRST_DELAY_MAX_SEC,
  DRIFTER_MAX_CONCURRENT,
  DRIFTER_CHIME_REWARD_CAP_SEC,
  DRIFTER_CHIME_REWARD_MIN_CLICKS,
  DRIFTER_ROUTES,
  GAME_TICK_INTERVAL_MS,
} from '../config/constants'
import { useGameStore } from './gameStore'
import { useShopStore } from './shopStore'
import { useInventoryStore } from './inventoryStore'
import { useSolarUpgradeStore } from './solarUpgradeStore'
import { useStarGroupStore } from './starGroupStore'
import { useCpsStore } from './cpsStore'

let uidCounter = 0

function rollSpawnDelaySec(): number {
  return (
    DRIFTER_SPAWN_INTERVAL_MIN_SEC +
    Math.random() * (DRIFTER_SPAWN_INTERVAL_MAX_SEC - DRIFTER_SPAWN_INTERVAL_MIN_SEC)
  )
}

function rollFirstDelaySec(): number {
  return (
    DRIFTER_FIRST_DELAY_MIN_SEC +
    Math.random() * (DRIFTER_FIRST_DELAY_MAX_SEC - DRIFTER_FIRST_DELAY_MIN_SEC)
  )
}

/** Weighted pick across the whole pool — rarity lives in `weight`, nowhere else. */
function rollDrifterDef(): DrifterDef {
  let roll = Math.random() * DRIFTER_TOTAL_WEIGHT
  for (const def of DRIFTERS) {
    roll -= def.weight
    if (roll <= 0) return def
  }
  return DRIFTERS[0]
}

/**
 * Drifters — clickable objects crossing the idle orbit view, and the timed
 * buffs they leave behind.
 *
 * The store owns only logical state. A drifter's position is derived from
 * `spawnedAt` by the rendering layer, so a throttled tab or a stuttering frame
 * loop can never desync it: it always sits where the wall clock says it should.
 */
export const useDrifterStore = defineStore('drifter', {
  state: () => ({
    active: [] as ActiveDrifter[],
    buffs: [] as DrifterActiveBuff[],
    /** Seconds until the next spawn attempt. Counted down by the game tick. */
    spawnCooldownSec: rollFirstDelaySec(),
    /** Reactive clock for the buff getters — a raw Date.now() inside a getter
     *  would never re-evaluate. Advanced once per second by the game tick. */
    drifterNow: Date.now(),
    /** Suppresses spawning while an opaque overlay covers the idle layer: a
     *  drifter nobody can see would just expire unnoticed. Set by the layer. */
    spawningBlocked: false,
    /** Bumped on every collect so the UI can replay its burst — the same type
     *  collected twice in a row must still trigger the effect. */
    lastCollect: { defId: '', at: 0, x: 0, y: 0, seq: 0 },
    // ── Lifetime counters (Bard Stats catalog) ──
    totalDriftersSpawned: 0,
    totalDriftersCollected: 0,
    totalDriftersMissed: 0,
  }),

  getters: {
    /** Buffs still running right now, newest first. Drives the buff bar. */
    liveBuffs(state): DrifterActiveBuff[] {
      return state.buffs.filter((b) => b.expiresAt > state.drifterNow)
    },

    hasActiveDrifter(state): boolean {
      return state.active.length > 0
    },

    // ── Effect getters (one per integration point) ────────────────────────────
    /** Multiplier on total chimes per second. */
    cpsMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.cpsMult ?? 1), 1)
    },
    /** Multiplier on total chimes per click. */
    cpcMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.cpcMult ?? 1), 1)
    },
    /** Multiplier on orbiting champion DPS and turret volleys. */
    combatDpsMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.combatDpsMult ?? 1), 1)
    },
    /** Multiplier on the material drop chance. */
    materialDropMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.materialDropMult ?? 1), 1)
    },
    /** Multiplier on champion XP gains. */
    xpMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.xpMult ?? 1), 1)
    },
  },

  actions: {
    /** Called once per second from gameStore.tick(): advance the clock, expire
     *  finished buffs and roll for the next spawn. */
    tick(): void {
      this.drifterNow = Date.now()

      const before = this.buffs.length
      this.buffs = this.buffs.filter((b) => b.expiresAt > this.drifterNow)
      // A buff that just ended may have been holding a CPS/CPC multiplier —
      // both are cached values, so they have to be recomputed on the spot.
      if (this.buffs.length !== before) this.refreshRates()

      this.expireFlownDrifters()

      if (this.spawningBlocked) return
      this.spawnCooldownSec -= GAME_TICK_INTERVAL_MS / 1000
      if (this.spawnCooldownSec > 0) return
      this.spawnCooldownSec = rollSpawnDelaySec()
      this.spawnDrifter()
    },

    /** Drop drifters whose flight has finished without being collected. */
    expireFlownDrifters(): void {
      const now = this.drifterNow
      const remaining = this.active.filter((d) => now < d.spawnedAt + d.flightMs)
      if (remaining.length !== this.active.length) {
        this.totalDriftersMissed += this.active.length - remaining.length
        this.active = remaining
      }
    },

    /** Roll a type and send it on its way. Respects the concurrency cap. */
    spawnDrifter(defId?: string): ActiveDrifter | null {
      if (this.active.length >= DRIFTER_MAX_CONCURRENT) return null
      const def = defId ? getDrifter(defId) : rollDrifterDef()
      if (!def) return null

      const drifter: ActiveDrifter = {
        uid: ++uidCounter,
        defId: def.id,
        routeIndex: Math.floor(Math.random() * DRIFTER_ROUTES.length),
        mirrored: Math.random() < 0.5,
        spawnedAt: Date.now(),
        flightMs: def.flightMs,
        hitsLanded: 0,
      }
      this.active.push(drifter)
      this.totalDriftersSpawned++
      logger.debug('Drifter', `Spawned ${def.name}`, { uid: drifter.uid })
      return drifter
    },

    /**
     * Register a click on a drifter. Multi-hit types report progress and only
     * pay out on the final strike.
     *
     * @param x,y screen position of the hit — the collect burst plays there.
     * @returns the definition when this click collected the drifter, else null.
     */
    hitDrifter(uid: number, x = 0, y = 0): DrifterDef | null {
      const drifter = this.active.find((d) => d.uid === uid)
      if (!drifter) return null
      const def = getDrifter(drifter.defId)
      if (!def) return null

      drifter.hitsLanded++
      if (drifter.hitsLanded < def.hits) return null

      this.active = this.active.filter((d) => d.uid !== uid)
      this.totalDriftersCollected++
      this._applyReward(def)
      this.lastCollect = {
        defId: def.id,
        at: Date.now(),
        x,
        y,
        seq: this.lastCollect.seq + 1,
      }
      logger.info('Drifter', `Collected ${def.name}`, { effect: def.effectLine })
      return def
    },

    /** Pay out a drifter: instant rewards first, then start its buff. */
    _applyReward(def: DrifterDef): void {
      const gameStore = useGameStore()

      if (def.reward?.chimesFromCpsSeconds) {
        // Two floors so the reward is never a dead click: a fixed number of
        // clicks worth of chimes early on, the production window later.
        const fromCps = gameStore.chimesPerSecond * def.reward.chimesFromCpsSeconds
        const capped = Math.min(
          fromCps,
          gameStore.chimesPerSecond * DRIFTER_CHIME_REWARD_CAP_SEC,
        )
        const floor = gameStore.chimesPerClick * DRIFTER_CHIME_REWARD_MIN_CLICKS
        const gain = Math.max(capped, floor)
        gameStore.chimes += gain
        gameStore.chimesForMeep += gain
        gameStore.chimesForNextUniverse += gain
        gameStore.totalChimesEarned += gain
        gameStore.chimesEarnedForLevel += gain
        gameStore.calculateLevel()
        gameStore.addMeep()
      }

      if (def.reward?.meeps) {
        gameStore.meeps += def.reward.meeps
        gameStore.totalMeepsEarned += def.reward.meeps
        // Top the bar off as well — "a meep joins you" should also mean the
        // next one is within reach, not that the counter silently jumped.
        gameStore.chimesForMeep = gameStore.meepChimeRequirement
      }

      if (def.reward?.materials) {
        const inventory = useInventoryStore()
        for (let i = 0; i < def.reward.materials; i++) {
          inventory.tryDropMaterial(1)
        }
      }

      if (def.reward?.dwellSkipSeconds) {
        // Backdating the phase clock is exactly how the admin skip works —
        // the dwell getters read (now − phaseEnteredAt), nothing else.
        const solar = useSolarUpgradeStore()
        solar.phaseEnteredAt -= def.reward.dwellSkipSeconds * 1000
        solar.tickDwell()
      }

      if (def.reward?.starTimeSeconds) {
        const starGroup = useStarGroupStore()
        for (const star of starGroup.activeStars) {
          if (star.durationMs === undefined) continue
          star.durationMs += def.reward.starTimeSeconds * 1000
        }
      }

      if (def.buff) {
        this.applyBuff(def)
      }
    },

    /** Start (or refresh) a drifter buff. Re-collecting a type restarts its
     *  timer instead of stacking a second copy of the same multiplier. */
    applyBuff(def: DrifterDef): void {
      if (!def.buff) return
      this.buffs = this.buffs.filter((b) => b.sourceId !== def.id)
      this.buffs.push({
        sourceId: def.id,
        expiresAt: Date.now() + def.buff.durationMs,
        durationMs: def.buff.durationMs,
        effects: { ...def.buff.effects },
      })
      this.drifterNow = Date.now()
      this.refreshRates()
    },

    /** CPS and CPC are cached on the game store — recompute after any change to
     *  a multiplier that feeds them. */
    refreshRates(): void {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      const newCps = shopStore.calculateTotalCPS()
      gameStore.chimesPerSecond = newCps
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()
      useCpsStore().updateCurrentCPS(newCps)
    },

    /** Called by the rendering layer while an opaque overlay hides the idle
     *  view — no spawning into a screen the player cannot reach. */
    setSpawningBlocked(blocked: boolean): void {
      this.spawningBlocked = blocked
    },

    /** Admin/testing: send a specific type out right now. */
    forceSpawn(defId?: string): void {
      // Clear the field first so the forced type is guaranteed to appear even
      // when a drifter is already mid-flight.
      this.active = []
      this.spawnDrifter(defId)
      this.spawnCooldownSec = rollSpawnDelaySec()
    },

    clearAll(): void {
      this.active = []
      this.buffs = []
      this.spawnCooldownSec = rollFirstDelaySec()
    },
  },
})
