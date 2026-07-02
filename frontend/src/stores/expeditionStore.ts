import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useBattleStore } from './battleStore'
import { usePlanetShopStore } from './planetShopStore'
import { getChampionRoles } from '../config/championRoles'
import { useEventLog, type GameEventType } from '../composables/useEventLog'
import { formatNumber } from '../config/numberFormat'
import {
  CHAMPION_BASE_POWER,
  CHAMPION_POWER_PER_LEVEL,
  MAX_ACTIVE_EXPEDITIONS,
  EXPEDITION_ROLE_SYNERGY_BONUS,
  EXPEDITION_ROLE_SYNERGY_PENALTY,
  EXPEDITION_POWER_BONUS_CAP,
  EXPEDITION_POWER_BONUS_SCALE,
  EXPEDITION_BASE_SUCCESS_CHANCE,
  EXPEDITION_FAILURE_REWARD_FRACTION,
  EXPEDITION_COLORS,
  EXPEDITION_AVAILABILITY_DURATION_MS,
  EXPEDITION_SPAWN_INTERVAL_MS,
  EXPEDITION_MAX_AVAILABLE,
  EXPEDITION_TIERS,
  EXPEDITION_NAME_ADJECTIVES,
  EXPEDITION_NAME_TARGETS,
  EXPEDITION_NAME_ACTIONS,
  EXPEDITION_ICON_POOL,
  EXPEDITION_TIER_THRESHOLDS,
  EXPEDITION_ID_RANDOM_MAX,
  type ExpeditionTier,
} from '../config/constants'
import type { ExpeditionMission, AvailableExpeditionSlot, ChampionRole } from '../types'
import { logger } from '../utils/logger'

const ROLE_EVENT_TYPE: Record<ChampionRole, GameEventType> = {
  jungle: 'jungle',
  top: 'top',
  mid: 'mid',
  adc: 'adc',
  support: 'support',
}

const EXPEDITION_SUCCESS_MESSAGES: Record<ChampionRole, string[]> = {
  jungle: [
    '– The jungle answers. Chimes bloom.',
    '– Enemy camps cleared. Bard wanders on.',
  ],
  top: [
    '– Tower falls. Victory whispers.',
    '– Side lane taken. Silence follows.',
  ],
  mid: [
    '– Lane closed. Echoes of power linger.',
    '– Roam complete. A spark in the dark.',
  ],
  adc: [
    '– Precision wins. Chimes follow.',
    '– Bot lane cleared. Objectives fall.',
  ],
  support: [
    '– Vision secured. Allies find the path.',
    '– Wards planted deep. Darkness lifts.',
  ],
}

const EXPEDITION_FAILURE_MESSAGES = [
  '– Lost to the void.',
  '– The expedition did not return…',
  '– Swallowed by darkness.',
]

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function weightedTierPick(): ExpeditionTier {
  const r = Math.random() * 100
  if (r < EXPEDITION_TIER_THRESHOLDS.epic) return 'epic'
  if (r < EXPEDITION_TIER_THRESHOLDS.rare) return 'rare'
  return 'common'
}

const ALL_ROLES: ChampionRole[] = ['top', 'jungle', 'mid', 'adc', 'support']

export const useExpeditionStore = defineStore('expedition', {
  state: () => ({
    activeExpeditions: [] as ExpeditionMission[],
    completedExpeditions: [] as ExpeditionMission[],
    availableExpeditions: [] as AvailableExpeditionSlot[],
    nextSpawnAt: 0 as number,
  }),

  getters: {
    championsOnExpedition(): string[] {
      return this.activeExpeditions.flatMap((e) => e.assignedChampions.map((c) => c.name))
    },

    canStartExpedition(): boolean {
      return (
        this.activeExpeditions.filter((e) => e.status === 'active').length < MAX_ACTIVE_EXPEDITIONS
      )
    },
  },

  actions: {
    getChampionPower(): number {
      const gameStore = useGameStore()
      return CHAMPION_BASE_POWER + gameStore.level * CHAMPION_POWER_PER_LEVEL
    },

    calculateSuccessChance(
      assignedChampions: { name: string; role: ChampionRole }[],
      requiredRoles: ChampionRole[],
      minPowerThreshold: number,
    ): number {
      const championPower = this.getChampionPower()
      const teamPower = championPower * assignedChampions.length

      const allRolesMatched = requiredRoles.every((requiredRole) =>
        assignedChampions.some((champ) => {
          const roles = getChampionRoles(champ.name)
          return roles.includes(requiredRole)
        }),
      )
      const roleSynergyBonus = allRolesMatched ? EXPEDITION_ROLE_SYNERGY_BONUS : EXPEDITION_ROLE_SYNERGY_PENALTY

      const powerRatio = teamPower / minPowerThreshold
      const powerBonus = Math.min(EXPEDITION_POWER_BONUS_CAP, (powerRatio - 1) * EXPEDITION_POWER_BONUS_SCALE)
      const successChance = (EXPEDITION_BASE_SUCCESS_CHANCE + powerBonus) * roleSynergyBonus

      return Math.max(0.05, Math.min(0.95, successChance))
    },

    _spawnOneExpedition(now: number) {
      const tier = weightedTierPick()
      const tierDef = EXPEDITION_TIERS[tier]

      const adj = pickRandom(EXPEDITION_NAME_ADJECTIVES)
      const target = pickRandom(EXPEDITION_NAME_TARGETS)
      const action = pickRandom(EXPEDITION_NAME_ACTIONS)
      const name = `${adj} ${target} ${action}`

      const iconPool = EXPEDITION_ICON_POOL.length > 0 ? EXPEDITION_ICON_POOL : ['game-icons:scroll-unfurled']
      const icon = pickRandom(iconPool)

      const baseReward = Math.round(randInt(tierDef.rewardMin, tierDef.rewardMax) / 10) * 10
      const durationSeconds = Math.round(randInt(tierDef.durMin, tierDef.durMax) / 5) * 5

      const roleCount = randInt(1, tierDef.maxRoles)
      const requiredRoles = shuffle(ALL_ROLES).slice(0, roleCount) as ChampionRole[]

      const minPowerThreshold = tierDef.powerBase + roleCount * 30 + randInt(0, 40)

      const lastKey = this.availableExpeditions.at(-1)?.colorKey
      const colorPool = lastKey
        ? EXPEDITION_COLORS.filter((c) => c.key !== lastKey)
        : EXPEDITION_COLORS
      const colorDef = pickRandom(colorPool)

      const slot: AvailableExpeditionSlot = {
        id: `avail-${tier}-${now}-${Math.floor(Math.random() * EXPEDITION_ID_RANDOM_MAX)}`,
        colorKey: colorDef.key,
        spawnedAt: now,
        availableUntil: now + EXPEDITION_AVAILABILITY_DURATION_MS,
        tier,
        name,
        icon,
        baseReward,
        durationSeconds,
        requiredRoles,
        minPowerThreshold,
      }
      this.availableExpeditions.push(slot)
    },

    forceSpawn() {
      this._spawnOneExpedition(Date.now())
    },

    checkAvailability() {
      const now = Date.now()
      this.availableExpeditions = this.availableExpeditions.filter((s) => s.availableUntil > now)

      while (this.availableExpeditions.length < EXPEDITION_MAX_AVAILABLE && now >= this.nextSpawnAt) {
        this._spawnOneExpedition(now)
        this.nextSpawnAt = now + EXPEDITION_SPAWN_INTERVAL_MS
      }
    },

    startExpedition(slotId: string, assignedChampions: { name: string; role: ChampionRole }[]) {
      if (
        this.activeExpeditions.filter((e) => e.status === 'active').length >= MAX_ACTIVE_EXPEDITIONS
      )
        return false

      const slotIdx = this.availableExpeditions.findIndex((s) => s.id === slotId)
      if (slotIdx === -1) return false

      const slot = this.availableExpeditions[slotIdx]
      if (slot.availableUntil < Date.now()) return false

      if (assignedChampions.length !== slot.requiredRoles.length) return false

      const onExpedition = this.championsOnExpedition
      if (assignedChampions.some((c) => onExpedition.includes(c.name))) return false

      const successChance = this.calculateSuccessChance(
        assignedChampions,
        slot.requiredRoles,
        slot.minPowerThreshold,
      )

      const expedition: ExpeditionMission = {
        id: `exp-${slot.id}-${Date.now()}`,
        configId: slot.id,
        name: slot.name,
        description: '',
        icon: slot.icon,
        requiredRoles: slot.requiredRoles,
        assignedChampions,
        durationSeconds: slot.durationSeconds,
        startTime: Date.now(),
        baseReward: slot.baseReward,
        successChance,
        status: 'active',
        reward: 0,
        colorKey: slot.colorKey,
      }

      this.availableExpeditions.splice(slotIdx, 1)
      this.activeExpeditions.push(expedition)
      logger.info('Expedition', `Started: ${slot.name} (${slot.tier})`, {
        champions: assignedChampions.map((c) => c.name),
        successChance,
        colorKey: slot.colorKey,
      })

      const battleStore = useBattleStore()
      assignedChampions.forEach((c) => battleStore.removeChampionFromSlots(c.name))

      return true
    },

    checkExpeditions() {
      const now = Date.now()
      for (const expedition of this.activeExpeditions) {
        if (expedition.status !== 'active') continue
        const elapsed = now - expedition.startTime
        if (elapsed >= expedition.durationSeconds * 1000) {
          const success = Math.random() < expedition.successChance
          expedition.status = success ? 'success' : 'failure'
          const relayMul = usePlanetShopStore().planetExpeditionRewardMultiplier
          expedition.reward = success
            ? Math.floor(expedition.baseReward * relayMul)
            : Math.floor(expedition.baseReward * EXPEDITION_FAILURE_REWARD_FRACTION)
          logger.info(
            'Expedition',
            `Resolved: ${expedition.name} - ${expedition.status.toUpperCase()}`,
            { reward: expedition.reward },
          )
        }
      }
    },

    collectExpedition(expeditionId: string) {
      const idx = this.activeExpeditions.findIndex((e) => e.id === expeditionId)
      if (idx === -1) return

      const expedition = this.activeExpeditions[idx]
      if (expedition.status === 'active') return

      const gameStore = useGameStore()
      gameStore.chimes += expedition.reward
      gameStore.chimesForMeep += expedition.reward
      gameStore.chimesForNextUniverse += expedition.reward
      gameStore.calculateLevel()
      gameStore.addMeep()
      gameStore.checkPrestigeAvailability()

      const { addEvent } = useEventLog()
      const primaryRole = expedition.requiredRoles[0] ?? null
      const eventType: GameEventType = primaryRole ? ROLE_EVENT_TYPE[primaryRole] : 'info'
      const rewardStr = `+${formatNumber(expedition.reward)}`
      let flavor: string
      if (expedition.status === 'success') {
        const pool = primaryRole ? EXPEDITION_SUCCESS_MESSAGES[primaryRole] : ['– Mission complete.']
        flavor = pool[Math.floor(Math.random() * pool.length)]
      } else {
        flavor = EXPEDITION_FAILURE_MESSAGES[Math.floor(Math.random() * EXPEDITION_FAILURE_MESSAGES.length)]
      }
      addEvent(`${expedition.name} ${flavor} (${rewardStr})`, eventType)

      this.activeExpeditions.splice(idx, 1)
      this.completedExpeditions.unshift(expedition)

      if (this.completedExpeditions.length > 10) {
        this.completedExpeditions = this.completedExpeditions.slice(0, 10)
      }
    },
  },
})
