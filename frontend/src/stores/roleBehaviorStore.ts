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
  SUPPORT_HEAL_RANGE,
  SUPPORT_PLANET_HEAL_AMOUNT,
  SUPPORT_PLANET_HEAL_INTERVAL_MS,
  SUPPORT_MAX_HEAL_TARGETS,
} from '../config/constants'
import { getOrbitingRoles } from '../utils/getOrbitingRoles'
import { usePlayerStore } from './playerStore'
import { useBattleStore } from './battleStore'
import { usePlanetBossStore } from './planetBossStore'
import { useGameStore } from './gameStore'
import { useCombatStore } from './combatStore'
import { usePlanetShopStore, PLANET_ROLES, type PlanetSlot } from './planetShopStore'
import { activePlanetPositions } from '../utils/activePlanetPositions'
import { activePlayerPlanetPositions } from '../utils/activePlayerPlanetPositions'
import { useEventLog } from '@/composables/useEventLog'
import { useRenderingPaused } from '@/composables/useRenderingPaused'

let _floatId = 900_000
const _throttleMap = new Map<string, number>()

function throttledEvent(key: string, intervalMs: number, fn: () => void) {
  const now = Date.now()
  const last = _throttleMap.get(key) ?? 0

  if (now - last >= intervalMs) {
    _throttleMap.set(key, now)
    fn()
  }
}

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

function getPlanetLabel(slot: PlanetSlot): string {
  if (slot.role && PLANET_ROLES[slot.role]) {
    return `${PLANET_ROLES[slot.role].name} (${slot.id})`
  }

  return `Planet ${slot.id}`
}

const SLOT_ROLES = ['top', 'jungle', 'mid', 'adc', 'support'] as const
type SlotRole = (typeof SLOT_ROLES)[number]

function getChampionNameByRole(role: SlotRole): string {
  const battleStore = useBattleStore()
  const idx = SLOT_ROLES.indexOf(role)
  return (idx >= 0 ? battleStore.headerSlots[idx] : null) ?? role.toUpperCase()
}

export const useRoleBehaviorStore = defineStore('roleBehavior', {
  state: () => ({
    supportHealCooldownMs: ROLE_SUPPORT_HEAL_INTERVAL_MS,
    supportPlanetHealActive: false,
    supportPlanetHealCooldownMs: 0,

    tankShieldActive: false,
    tankShieldCooldownMs: ROLE_TOP_SHIELD_INTERVAL_MS,
    tankShieldRemainingMs: 0,

    dotCooldownMs: ROLE_MID_DOT_INTERVAL_MS,
    dotRemainingMs: 0,

    adcBurstCooldownMs: ROLE_ADC_BURST_INTERVAL_MS,

    junglerStackCooldownMs: ROLE_JUNGLER_STACK_INTERVAL_MS,
    junglerStackCount: 0,
  }),

  actions: {
    tick() {
      const { isRenderingPaused } = useRenderingPaused()
      if (isRenderingPaused.value) return

      const TICK_MS = 1000
      const roles = getOrbitingRoles()

      this._tickSupport(roles, TICK_MS)
      this._tickTop(roles, TICK_MS)
      this._tickMid(roles, TICK_MS)
      this._tickAdc(roles, TICK_MS)
      this._tickJungler(roles, TICK_MS)
    },

    _tickSupport(roles: Set<string>, tickMs: number) {
      this.supportPlanetHealActive = false
      if (!roles.has('support')) return

      this.supportHealCooldownMs -= tickMs
      this.supportPlanetHealCooldownMs -= tickMs

      const combatStore = useCombatStore()
      const battleStore = useBattleStore()
      const supportName = battleStore.headerSlots[4]
      if (!supportName) return
      const supportChampion = combatStore.champions.find((c) => c.name === supportName)

      if (!supportChampion || (supportChampion.screenX === 0 && supportChampion.screenY === 0)) {
        return
      }

      if (this.supportHealCooldownMs <= 0) {
        this.supportHealCooldownMs = ROLE_SUPPORT_HEAL_INTERVAL_MS
      }

      if (this.supportPlanetHealCooldownMs > 0) return
      this.supportPlanetHealCooldownMs = SUPPORT_PLANET_HEAL_INTERVAL_MS

      const planetShopStore = usePlanetShopStore()
      const { addEvent } = useEventLog()

      const damagedCandidates = planetShopStore.purchasedSlots
        .map((slot) => {
          const pos = activePlayerPlanetPositions.get(slot.id)
          if (!pos) return null
          return { slot, pos }
        })
        .filter((entry) => entry !== null)

      const healablePlanets = damagedCandidates
        .filter((entry) => entry.slot.currentHp < entry.slot.maxHp)
        .map((entry) => {
          const dist = Math.hypot(
            supportChampion.screenX - entry.pos.cx,
            supportChampion.screenY - entry.pos.cy,
          )

          return { slot: entry.slot, pos: entry.pos, dist }
        })
        .filter(({ dist }) => dist <= SUPPORT_HEAL_RANGE)

      healablePlanets.sort((a, b) => a.dist - b.dist)

      if (healablePlanets.length > 0) {
        const targets = healablePlanets.slice(0, SUPPORT_MAX_HEAL_TARGETS)

        for (const { slot, pos } of targets) {
          const healAmount = Math.min(SUPPORT_PLANET_HEAL_AMOUNT, slot.maxHp - slot.currentHp)
          if (healAmount <= 0) continue

          planetShopStore.healSlot(slot.id, healAmount)
          spawnFloat(healAmount, pos.cx, pos.cy - 35, 1200, { healFloat: true })

          throttledEvent(`support-heal-${slot.id}`, 4000, () => {
            addEvent(
              `✦ ${supportChampion.name} flüstert Heilzauber auf ${getPlanetLabel(slot)} (+${Math.round(healAmount)} HP)`,
              'support',
            )
          })
        }

        this.supportPlanetHealActive = targets.length > 0
        return
      }

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

        throttledEvent('support-heal-player', 5000, () => {
          addEvent(`💚 ${supportChampion.name} stärkt Bard mit heilender Kraft (+${Math.round(healed)} HP)`, 'support')
        })
      }
    },

    _tickTop(roles: Set<string>, tickMs: number) {
      if (!roles.has('top')) {
        this.tankShieldActive = false
        this.tankShieldRemainingMs = 0
        return
      }

      const { addEvent } = useEventLog()
      const championName = getChampionNameByRole('top')

      if (this.tankShieldActive) {
        this.tankShieldRemainingMs -= tickMs

        if (this.tankShieldRemainingMs <= 0) {
          this.tankShieldActive = false
          this.tankShieldRemainingMs = 0
          this.tankShieldCooldownMs = ROLE_TOP_SHIELD_INTERVAL_MS

          addEvent(`${championName}'s shield fades`, 'top')
        }
      } else {
        this.tankShieldCooldownMs -= tickMs

        if (this.tankShieldCooldownMs <= 0) {
          this.tankShieldActive = true
          this.tankShieldRemainingMs = ROLE_TOP_SHIELD_DURATION_MS
          this.tankShieldCooldownMs = ROLE_TOP_SHIELD_INTERVAL_MS

          addEvent(`${championName} activates a shield`, 'top')
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
      const { addEvent } = useEventLog()
      const championName = getChampionNameByRole('mid')

      if (this.dotRemainingMs > 0) {
        this.dotRemainingMs -= tickMs

        if (activeBoss && !activeBoss.defeated && !activeBoss.expired) {
          const defeated = bossStore.dealDamage(ROLE_MID_DOT_DPS)

          throttledEvent(`mid-dot-${activeBoss.planetId}`, 3000, () => {
            addEvent(`${championName} burns the boss for ${ROLE_MID_DOT_DPS} DoT damage`, 'mid')
          })

          if (!defeated) {
            const pos = activePlanetPositions.get(activeBoss.planetId)
            if (pos) {
              spawnFloat(ROLE_MID_DOT_DPS, pos.cx + (Math.random() - 0.5) * 50, pos.cy - 55, 1000, {
                dotFloat: true,
              })
            }
          } else {
            addEvent(`${championName} defeats the boss on Planet ${activeBoss.planetId}`, 'mid')
          }
        }

        if (this.dotRemainingMs < 0) this.dotRemainingMs = 0
        return
      }

      this.dotCooldownMs -= tickMs

      if (this.dotCooldownMs <= 0) {
        this.dotCooldownMs = ROLE_MID_DOT_INTERVAL_MS

        if (activeBoss && !activeBoss.defeated && !activeBoss.expired) {
          this.dotRemainingMs = ROLE_MID_DOT_DURATION_MS
          addEvent(`${championName} casts a damage-over-time effect on the boss`, 'mid')
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
        const { addEvent } = useEventLog()
        const championName = getChampionNameByRole('adc')

        if (activeBoss && !activeBoss.defeated && !activeBoss.expired) {
          const defeated = bossStore.dealDamage(ROLE_ADC_BURST_DAMAGE)

          throttledEvent(`adc-burst-${activeBoss.planetId}`, 2500, () => {
            addEvent(`${championName} fires a burst for ${ROLE_ADC_BURST_DAMAGE} damage`, 'adc')
          })

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
          } else {
            addEvent(`${championName} destroys the boss on Planet ${activeBoss.planetId}`, 'adc')
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

        const { addEvent } = useEventLog()
        const championName = getChampionNameByRole('jungle')

        throttledEvent('jungler-stack-build', 2500, () => {
          addEvent(
            `${championName} gains stack ${this.junglerStackCount}/${ROLE_JUNGLER_MAX_STACKS}`,
            'jungle',
          )
        })

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

          addEvent(`${championName} cashes in stacks for +${reward} Chimes`, 'jungle')
        }
      }
    },
  },
})
