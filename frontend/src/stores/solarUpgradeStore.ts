import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { usePlayerStore } from './playerStore'
import { useShopStore } from './shopStore'
import { useCpsStore } from './cpsStore'
import { useStarForgeStore } from './starForgeStore'
import {
  SOLAR_FLIGHT_BASE_COST,
  SOLAR_FLIGHT_MULTIPLIER,
  SOLAR_HP_BASE_COST,
  SOLAR_HP_MULTIPLIER,
  SOLAR_CPC_BASE_COST,
  SOLAR_CPC_MULTIPLIER,
  SOLAR_CPS_BASE_COST,
  SOLAR_CPS_MULTIPLIER,
  SOLAR_DMG_BASE_COST,
  SOLAR_DMG_MULTIPLIER,
  SOLAR_MAX_LEVELS,
  SOLAR_HP_PER_LEVEL,
  SOLAR_CPS_PER_LEVEL,
  SOLAR_CPC_PER_LEVEL,
  SOLAR_CPS_FLIGHT_BONUS,
  SOLAR_DMG_BONUS,
  STAR_PHASE_MIN_DWELL_SECONDS,
  COMET_MIN_DWELL_SECONDS,
} from '../config/constants'

export type SolarBranchId =
  | 'flightSpeed'
  | 'maxHp'
  | 'chimesPerClick'
  | 'chimesPerSecond'
  | 'dmgPerClick'

const BRANCH_CONFIG: Record<SolarBranchId, { baseCost: number; costMultiplier: number }> = {
  flightSpeed: { baseCost: SOLAR_FLIGHT_BASE_COST, costMultiplier: SOLAR_FLIGHT_MULTIPLIER },
  maxHp: { baseCost: SOLAR_HP_BASE_COST, costMultiplier: SOLAR_HP_MULTIPLIER },
  chimesPerClick: { baseCost: SOLAR_CPC_BASE_COST, costMultiplier: SOLAR_CPC_MULTIPLIER },
  chimesPerSecond: { baseCost: SOLAR_CPS_BASE_COST, costMultiplier: SOLAR_CPS_MULTIPLIER },
  dmgPerClick: { baseCost: SOLAR_DMG_BASE_COST, costMultiplier: SOLAR_DMG_MULTIPLIER },
}

export const useSolarUpgradeStore = defineStore('solarUpgrade', {
  state: () => ({
    flightSpeedLevel: 0 as number,
    maxHpLevel: 0 as number,
    chimesPerClickLevel: 0 as number,
    chimesPerSecondLevel: 0 as number,
    dmgPerClickLevel: 0 as number,
    starPhase: 0 as number,
    /** Origin state: the player starts as a wandering comet BEFORE First Spark.
     *  The first Star Forge evolve ("Ignition") clears this instead of bumping
     *  starPhase. Loaded saves default to false (see usePersistence) so existing
     *  players never regress into the comet. */
    isCometState: true as boolean,
    /** Seconds spent drifting as a comet (kept out of phaseTimeHistory). */
    cometSeconds: 0 as number,
    isUpgrading: false as boolean,
    phaseEnteredAt: Date.now() as number,
    totalPhaseSeconds: 0 as number,
    phaseTimeHistory: [] as number[],
    /** Reactive clock for dwell-time getters — advanced by gameStore.tick() once
     *  per second (a raw Date.now() inside a getter would never re-evaluate). */
    dwellNow: Date.now() as number,
  }),

  getters: {
    flightSpeedMultiplier(): number {
      return 1 + this.flightSpeedLevel * SOLAR_CPS_FLIGHT_BONUS
    },
    hpBonus(): number {
      return this.maxHpLevel * SOLAR_HP_PER_LEVEL
    },
    cpcBonus(): number {
      return this.chimesPerClickLevel * SOLAR_CPC_PER_LEVEL
    },
    cpsBonus(): number {
      return this.chimesPerSecondLevel * SOLAR_CPS_PER_LEVEL
    },
    dmgMultiplier(): number {
      return 1 + this.dmgPerClickLevel * SOLAR_DMG_BONUS
    },

    /** 0..5 — how many of the five core rays are at Lv 1+ (drives comet growth). */
    cometStage(state): number {
      return [
        state.flightSpeedLevel,
        state.maxHpLevel,
        state.chimesPerClickLevel,
        state.chimesPerSecondLevel,
        state.dmgPerClickLevel,
      ].filter((l) => l >= 1).length
    },

    minBranchLevel(state): number {
      return Math.min(
        state.flightSpeedLevel,
        state.maxHpLevel,
        state.chimesPerClickLevel,
        state.chimesPerSecondLevel,
        state.dmgPerClickLevel,
      )
    },

    maxAllowedLevel(): number {
      return Math.min(SOLAR_MAX_LEVELS, this.minBranchLevel + 1)
    },

    /** Upgrades that shorten dwell times multiply in here (e.g. 0.8 = 20% faster
     *  phases). Keep every consumer on this getter. Currently fed by the Star
     *  Forge "Allegro" branch (+ its "Time Weaver" leaf). */
    dwellTimeMultiplier(): number {
      return useStarForgeStore().dwellMult
    },

    /** Minimum time (ms) the sun must stay in the CURRENT phase before evolving. */
    phaseDwellRequiredMs(state): number {
      if (state.isCometState) return COMET_MIN_DWELL_SECONDS * 1000 * this.dwellTimeMultiplier
      if (state.starPhase >= STAR_PHASE_MIN_DWELL_SECONDS.length) return 0
      return STAR_PHASE_MIN_DWELL_SECONDS[state.starPhase] * 1000 * this.dwellTimeMultiplier
    },

    phaseDwellElapsedMs(state): number {
      return Math.max(0, state.dwellNow - state.phaseEnteredAt)
    },

    phaseDwellRemainingMs(): number {
      return Math.max(0, this.phaseDwellRequiredMs - this.phaseDwellElapsedMs)
    },

    /** Branch-level requirement alone (without the time gate) — lets the UI explain
     *  WHY evolving is blocked. */
    branchesReadyForEvolve(state): boolean {
      return state.starPhase < 6 && this.minBranchLevel >= state.starPhase + 1
    },

    canUpgradeStar(): boolean {
      return this.branchesReadyForEvolve && this.phaseDwellRemainingMs <= 0 && !this.isUpgrading
    },

    branchLevel(state): (id: SolarBranchId) => number {
      return (id: SolarBranchId): number => {
        switch (id) {
          case 'flightSpeed':
            return state.flightSpeedLevel
          case 'maxHp':
            return state.maxHpLevel
          case 'chimesPerClick':
            return state.chimesPerClickLevel
          case 'chimesPerSecond':
            return state.chimesPerSecondLevel
          case 'dmgPerClick':
            return state.dmgPerClickLevel
        }
      }
    },

    levelCost(): (id: SolarBranchId, atLevel: number) => number {
      return (id: SolarBranchId, atLevel: number): number => {
        const cfg = BRANCH_CONFIG[id]
        return Math.ceil(cfg.baseCost * Math.pow(cfg.costMultiplier, atLevel))
      }
    },

    branchCost(state): (id: SolarBranchId) => number {
      return (id: SolarBranchId): number => {
        const cfg = BRANCH_CONFIG[id]
        let level: number
        switch (id) {
          case 'flightSpeed':
            level = state.flightSpeedLevel
            break
          case 'maxHp':
            level = state.maxHpLevel
            break
          case 'chimesPerClick':
            level = state.chimesPerClickLevel
            break
          case 'chimesPerSecond':
            level = state.chimesPerSecondLevel
            break
          case 'dmgPerClick':
            level = state.dmgPerClickLevel
            break
        }
        return Math.ceil(cfg.baseCost * Math.pow(cfg.costMultiplier, level))
      }
    },

    canAfford(): (id: SolarBranchId) => boolean {
      return (id: SolarBranchId): boolean => {
        const gameStore = useGameStore()
        return (
          this.branchLevel(id) < SOLAR_MAX_LEVELS &&
          this.branchLevel(id) < this.maxAllowedLevel &&
          gameStore.chimes >= this.branchCost(id)
        )
      }
    },

    statDisplay(): (id: SolarBranchId, atLevel: number) => string {
      return (id: SolarBranchId, atLevel: number): string => {
        switch (id) {
          case 'flightSpeed':
            return `×${(1 + atLevel * SOLAR_CPS_FLIGHT_BONUS).toFixed(1)}`
          case 'maxHp':
            return `+${atLevel * SOLAR_HP_PER_LEVEL} HP`
          case 'chimesPerClick':
            return `+${atLevel * SOLAR_CPC_PER_LEVEL} CpC`
          case 'chimesPerSecond':
            return `+${atLevel * SOLAR_CPS_PER_LEVEL} CpS`
          case 'dmgPerClick':
            return `×${(1 + atLevel * SOLAR_DMG_BONUS).toFixed(2)}`
        }
      }
    },
  },

  actions: {
    /** Advance the reactive dwell clock — called by gameStore.tick() every second. */
    tickDwell(): void {
      this.dwellNow = Date.now()
    },

    /** TEMP (admin/testing): instantly satisfy the current phase's dwell-time gate
     *  by backdating phaseEnteredAt. Branch requirements stay untouched.
     *  Remove together with the "DEV · Skip Time" button in BardStatsTab.vue. */
    adminSkipDwellTime(): void {
      this.phaseEnteredAt = Date.now() - this.phaseDwellRequiredMs
      this.tickDwell()
    },

    buyBranch(id: SolarBranchId): void {
      const gameStore = useGameStore()
      const level = this.branchLevel(id)
      if (level >= SOLAR_MAX_LEVELS) return
      if (level >= this.maxAllowedLevel) return
      const cost = this.branchCost(id)
      if (gameStore.chimes < cost) return

      gameStore.chimes -= cost

      switch (id) {
        case 'flightSpeed':
          this.flightSpeedLevel++
          break
        case 'maxHp':
          this.maxHpLevel++
          usePlayerStore().maxHP += SOLAR_HP_PER_LEVEL
          break
        case 'chimesPerClick':
          this.chimesPerClickLevel++
          break
        case 'chimesPerSecond':
          this.chimesPerSecondLevel++
          break
        case 'dmgPerClick':
          this.dmgPerClickLevel++
          break
      }

      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()

      if (id === 'chimesPerSecond' || id === 'flightSpeed') {
        useCpsStore().updateCurrentCPS(gameStore.chimesPerSecond)
      }
    },

    upgradeStar(): void {
      if (!this.canUpgradeStar) return
      this.isUpgrading = true
      setTimeout(() => {
        const elapsed = Math.floor((Date.now() - this.phaseEnteredAt) / 1000)
        if (this.isCometState) {
          // Ignition: the comet becomes First Spark — starPhase stays 0, the
          // First Spark dwell timer starts fresh at this moment.
          this.cometSeconds += elapsed
          this.isCometState = false
          this.phaseEnteredAt = Date.now()
          this.isUpgrading = false
          console.log('[Bardle] Comet ignited into First Spark')
          return
        }
        this.totalPhaseSeconds += elapsed
        this.phaseTimeHistory[this.starPhase] = (this.phaseTimeHistory[this.starPhase] ?? 0) + elapsed
        this.starPhase++
        this.phaseEnteredAt = Date.now()
        this.isUpgrading = false
        console.log('[Bardle] Star evolved to phase', this.starPhase)
      }, 2500)
    },
  },
})
