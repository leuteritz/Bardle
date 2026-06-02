import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { usePlayerStore } from './playerStore'
import { useShopStore } from './shopStore'
import { useCpsStore } from './cpsStore'
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
        return this.branchLevel(id) < SOLAR_MAX_LEVELS && gameStore.chimes >= this.branchCost(id)
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
    buyBranch(id: SolarBranchId): void {
      const gameStore = useGameStore()
      const level = this.branchLevel(id)
      if (level >= SOLAR_MAX_LEVELS) return
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
  },
})
