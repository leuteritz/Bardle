import { defineStore } from 'pinia'
import {
  ROLE_SUPPORT_HEAL_INTERVAL_MS,
  ROLE_SUPPORT_HEAL_AMOUNT,
  ROLE_TOP_SHIELD_DURATION_MS,
  ROLE_TOP_SHIELD_INTERVAL_MS,
  ROLE_MID_DOT_DPS,
  ROLE_MID_DOT_DURATION_MS,
  ROLE_MID_DOT_INTERVAL_MS,
  ROLE_ADC_BURST_DAMAGE,
  ROLE_ADC_BURST_INTERVAL_MS,
  ROLE_JUNGLER_STACK_INTERVAL_MS,
  ROLE_JUNGLER_MAX_STACKS,
  ROLE_JUNGLER_CHIMES_PER_STACK,
} from '../config/constants'
import { getOrbitingRoles } from '../utils/getOrbitingRoles'
import { usePlayerStore } from './playerStore'
import { usePlanetBossStore } from './planetBossStore'
import { useGameStore } from './gameStore'
import { useCombatStore } from './combatStore'
import { activePlanetPositions } from '../utils/activePlanetPositions'

let _floatId = 900_000

function spawnFloat(
  value: number,
  x: number,
  y: number,
  durationMs: number,
  extra: Record<string, boolean> = {},
) {
  const combatStore = useCombatStore()
  combatStore.damageFloats.push({
    id: _floatId++,
    value,
    x,
    y,
    expiresAt: Date.now() + durationMs,
    ...extra,
  } as (typeof combatStore.damageFloats)[number])
}

export const useRoleBehaviorStore = defineStore('roleBehavior', {
  state: () => ({
    // Support
    supportHealCooldownMs: ROLE_SUPPORT_HEAL_INTERVAL_MS,
    // Top Laner
    tankShieldActive: false,
    tankShieldCooldownMs: ROLE_TOP_SHIELD_INTERVAL_MS,
    tankShieldRemainingMs: 0,
    // Mid Laner
    dotCooldownMs: ROLE_MID_DOT_INTERVAL_MS,
    dotRemainingMs: 0,
    // ADC
    adcBurstCooldownMs: ROLE_ADC_BURST_INTERVAL_MS,
    // Jungler
    junglerStackCooldownMs: ROLE_JUNGLER_STACK_INTERVAL_MS,
    junglerStackCount: 0,
  }),

  actions: {
    /** Called every second from gameStore.tick() */
    tick() {
      const TICK_MS = 1000
      const roles = getOrbitingRoles()
      this._tickSupport(roles, TICK_MS)
      this._tickTop(roles, TICK_MS)
      this._tickMid(roles, TICK_MS)
      this._tickAdc(roles, TICK_MS)
      this._tickJungler(roles, TICK_MS)
    },

    _tickSupport(roles: Set<string>, tickMs: number) {
      if (!roles.has('support')) return
      this.supportHealCooldownMs -= tickMs
      if (this.supportHealCooldownMs <= 0) {
        this.supportHealCooldownMs = ROLE_SUPPORT_HEAL_INTERVAL_MS
        const playerStore = usePlayerStore()
        if (playerStore.currentHP < playerStore.maxHP) {
          const healed = Math.min(ROLE_SUPPORT_HEAL_AMOUNT, playerStore.maxHP - playerStore.currentHP)
          playerStore.currentHP += healed
          spawnFloat(
            healed,
            window.innerWidth / 2 + (Math.random() - 0.5) * 60,
            window.innerHeight / 2 - 80,
            1200,
            { healFloat: true },
          )
        }
      }
    },

    _tickTop(roles: Set<string>, tickMs: number) {
      if (!roles.has('top')) {
        this.tankShieldActive = false
        this.tankShieldRemainingMs = 0
        return
      }
      if (this.tankShieldActive) {
        this.tankShieldRemainingMs -= tickMs
        if (this.tankShieldRemainingMs <= 0) {
          this.tankShieldActive = false
          this.tankShieldRemainingMs = 0
          this.tankShieldCooldownMs = ROLE_TOP_SHIELD_INTERVAL_MS
        }
      } else {
        this.tankShieldCooldownMs -= tickMs
        if (this.tankShieldCooldownMs <= 0) {
          this.tankShieldActive = true
          this.tankShieldRemainingMs = ROLE_TOP_SHIELD_DURATION_MS
          this.tankShieldCooldownMs = ROLE_TOP_SHIELD_INTERVAL_MS
        }
      }
    },

    _tickMid(roles: Set<string>, tickMs: number) {
      if (!roles.has('mid')) {
        this.dotRemainingMs = 0
        return
      }
      const bossStore = usePlanetBossStore()
      const activeBoss = bossStore.activeBoss

      // Tick active DoT
      if (this.dotRemainingMs > 0) {
        this.dotRemainingMs -= tickMs
        if (activeBoss && !activeBoss.defeated && !activeBoss.expired) {
          const defeated = bossStore.dealDamage(ROLE_MID_DOT_DPS)
          if (!defeated) {
            const pos = activePlanetPositions.get(activeBoss.planetId)
            if (pos) {
              spawnFloat(
                ROLE_MID_DOT_DPS,
                pos.cx + (Math.random() - 0.5) * 50,
                pos.cy - 55,
                1000,
                { dotFloat: true },
              )
            }
          }
        }
        if (this.dotRemainingMs < 0) this.dotRemainingMs = 0
        return
      }

      // No active DoT — count down cooldown
      this.dotCooldownMs -= tickMs
      if (this.dotCooldownMs <= 0) {
        this.dotCooldownMs = ROLE_MID_DOT_INTERVAL_MS
        if (activeBoss && !activeBoss.defeated && !activeBoss.expired) {
          this.dotRemainingMs = ROLE_MID_DOT_DURATION_MS
        }
      }
    },

    _tickAdc(roles: Set<string>, tickMs: number) {
      if (!roles.has('adc')) return
      this.adcBurstCooldownMs -= tickMs
      if (this.adcBurstCooldownMs <= 0) {
        this.adcBurstCooldownMs = ROLE_ADC_BURST_INTERVAL_MS
        const bossStore = usePlanetBossStore()
        const activeBoss = bossStore.activeBoss
        if (activeBoss && !activeBoss.defeated && !activeBoss.expired) {
          const defeated = bossStore.dealDamage(ROLE_ADC_BURST_DAMAGE)
          if (!defeated) {
            const pos = activePlanetPositions.get(activeBoss.planetId)
            if (pos) {
              spawnFloat(
                ROLE_ADC_BURST_DAMAGE,
                pos.cx + (Math.random() - 0.5) * 30,
                pos.cy - 45,
                1200,
                { adcFloat: true },
              )
            }
          }
        }
      }
    },

    _tickJungler(roles: Set<string>, tickMs: number) {
      if (!roles.has('jungle')) return
      this.junglerStackCooldownMs -= tickMs
      if (this.junglerStackCooldownMs <= 0) {
        this.junglerStackCooldownMs = ROLE_JUNGLER_STACK_INTERVAL_MS
        this.junglerStackCount = Math.min(this.junglerStackCount + 1, ROLE_JUNGLER_MAX_STACKS)
        if (this.junglerStackCount >= ROLE_JUNGLER_MAX_STACKS) {
          const reward = ROLE_JUNGLER_MAX_STACKS * ROLE_JUNGLER_CHIMES_PER_STACK
          const gameStore = useGameStore()
          gameStore.chimes += reward
          gameStore.chimesForMeep += reward
          gameStore.chimesForNextUniverse += reward
          gameStore.totalChimesEarned += reward
          gameStore.chimesEarnedForLevel += reward
          gameStore.calculateLevel()
          this.junglerStackCount = 0
          spawnFloat(
            reward,
            window.innerWidth / 2 + (Math.random() - 0.5) * 40,
            window.innerHeight / 2 + 40,
            1500,
          )
        }
      }
    },
  },
})
