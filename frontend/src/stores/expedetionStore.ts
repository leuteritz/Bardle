import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useBattleStore } from './battleStore'
import { usePlanetShopStore } from './planetShopStore'
import { EXPEDITION_CONFIGS } from '../config/expedition' // ← war: MISSION_CONFIGS
import { getChampionRoles } from '../config/championRoles'
import {
  CHAMPION_BASE_POWER,
  CHAMPION_POWER_PER_LEVEL,
  MAX_ACTIVE_EXPEDITIONS,
} from '../config/constants'
import type { ExpeditionMission, ChampionRole } from '../types'
import { logger } from '../utils/logger'

export const useExpeditionStore = defineStore('expedition', {
  state: () => ({
    activeExpeditions: [] as ExpeditionMission[],
    completedExpeditions: [] as ExpeditionMission[],
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
      configId: string,
    ): number {
      const config = EXPEDITION_CONFIGS.find((e) => e.id === configId)
      if (!config) return 0

      const championPower = this.getChampionPower()
      const teamPower = championPower * assignedChampions.length

      const allRolesMatched = config.requiredRoles.every((requiredRole) =>
        assignedChampions.some((champ) => {
          const roles = getChampionRoles(champ.name)
          return roles.includes(requiredRole)
        }),
      )
      const roleSynergyBonus = allRolesMatched ? 1.0 : 0.6

      const powerRatio = teamPower / config.minPowerThreshold
      const powerBonus = Math.min(0.4, (powerRatio - 1) * 0.2)
      const successChance = (0.5 + powerBonus) * roleSynergyBonus

      return Math.max(0.05, Math.min(0.95, successChance))
    },

    startExpedition(configId: string, assignedChampions: { name: string; role: ChampionRole }[]) {
      if (
        this.activeExpeditions.filter((e) => e.status === 'active').length >= MAX_ACTIVE_EXPEDITIONS
      )
        return false

      const config = EXPEDITION_CONFIGS.find((e) => e.id === configId)
      if (!config) return false

      if (assignedChampions.length !== config.requiredRoles.length) return false

      const onExpedition = this.championsOnExpedition
      if (assignedChampions.some((c) => onExpedition.includes(c.name))) return false

      const successChance = this.calculateSuccessChance(assignedChampions, configId)

      const expedition: ExpeditionMission = {
        id: `${configId}-${Date.now()}`,
        configId,
        name: config.name,
        description: config.description,
        icon: config.icon,
        requiredRoles: config.requiredRoles,
        assignedChampions,
        durationSeconds: config.durationSeconds,
        startTime: Date.now(),
        baseReward: config.baseReward,
        successChance,
        status: 'active',
        reward: 0,
      }

      this.activeExpeditions.push(expedition)
      logger.info('Expedition', `Started: ${config.name}`, {
        champions: assignedChampions.map((c) => c.name),
        successChance,
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
          // expedition_relay: multipliziert Belohnung bei Erfolg
          const relayMul = usePlanetShopStore().planetExpeditionRewardMultiplier
          expedition.reward = success
            ? Math.floor(expedition.baseReward * relayMul)
            : Math.floor(expedition.baseReward * 0.1)
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

      this.activeExpeditions.splice(idx, 1)
      this.completedExpeditions.unshift(expedition)

      if (this.completedExpeditions.length > 10) {
        this.completedExpeditions = this.completedExpeditions.slice(0, 10)
      }
    },
  },
})
