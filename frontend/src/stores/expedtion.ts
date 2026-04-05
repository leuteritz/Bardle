import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useBattleStore } from './battleStore'
import { MISSION_CONFIGS } from '../config/expedition'
import { getChampionRoles } from '../config/championRoles'
import {
  CHAMPION_BASE_POWER,
  CHAMPION_POWER_PER_LEVEL,
  MAX_ACTIVE_MISSIONS,
} from '../config/constants'
import type { Mission, ChampionRole } from '../types'
import { logger } from '../utils/logger'

export const useMissionStore = defineStore('mission', {
  state: () => ({
    activeMissions: [] as Mission[],
    completedMissions: [] as Mission[],
  }),

  getters: {
    championsOnMission(): string[] {
      return this.activeMissions.flatMap((m) => m.assignedChampions.map((c) => c.name))
    },

    canStartMission(): boolean {
      return this.activeMissions.filter((m) => m.status === 'active').length < MAX_ACTIVE_MISSIONS
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
      const config = MISSION_CONFIGS.find((m) => m.id === configId)
      if (!config) return 0

      const championPower = this.getChampionPower()
      const teamPower = championPower * assignedChampions.length

      // Check role synergy
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

    startMission(configId: string, assignedChampions: { name: string; role: ChampionRole }[]) {
      if (this.activeMissions.filter((m) => m.status === 'active').length >= MAX_ACTIVE_MISSIONS)
        return false

      const config = MISSION_CONFIGS.find((m) => m.id === configId)
      if (!config) return false

      // Validate all roles are filled
      if (assignedChampions.length !== config.requiredRoles.length) return false

      // Validate no champion is already on a mission
      const onMission = this.championsOnMission
      if (assignedChampions.some((c) => onMission.includes(c.name))) return false

      const successChance = this.calculateSuccessChance(assignedChampions, configId)

      const mission: Mission = {
        id: `${configId}-${Date.now()}`,
        configId,
        name: config.name,
        description: config.description,
        icon: config.icon, // ✅ aus MissionConfig
        requiredRoles: config.requiredRoles,
        assignedChampions,
        durationSeconds: config.durationSeconds,
        startTime: Date.now(),
        baseReward: config.baseReward,
        successChance,
        status: 'active',
        reward: 0,
        condition: null, // ✅ oder passender Defaultwert
        rewardUpgrade: null, // ✅ oder passender Defaultwert
        claimed: false, // ✅ logischer Default
      }

      this.activeMissions.push(mission)
      logger.info('Mission', `Started: ${config.name}`, {
        champions: assignedChampions.map((c) => c.name),
        successChance,
      })

      // Remove champions from battle team
      const battleStore = useBattleStore()
      assignedChampions.forEach((c) => battleStore.removeChampionFromSlots(c.name))

      return true
    },

    checkMissions() {
      const now = Date.now()
      for (const mission of this.activeMissions) {
        if (mission.status !== 'active') continue
        const elapsed = now - mission.startTime
        if (elapsed >= mission.durationSeconds * 1000) {
          // Resolve mission
          const success = Math.random() < mission.successChance
          mission.status = success ? 'success' : 'failure'
          mission.reward = success ? mission.baseReward : Math.floor(mission.baseReward * 0.1)
          logger.info('Mission', `Resolved: ${mission.name} - ${mission.status.toUpperCase()}`, {
            reward: mission.reward,
          })
        }
      }
    },

    collectMission(missionId: string) {
      const idx = this.activeMissions.findIndex((m) => m.id === missionId)
      if (idx === -1) return

      const mission = this.activeMissions[idx]
      if (mission.status === 'active') return

      // Credit chimes
      const gameStore = useGameStore()
      gameStore.chimes += mission.reward
      gameStore.chimesForMeep += mission.reward
      gameStore.chimesForNextUniverse += mission.reward
      gameStore.calculateLevel()
      gameStore.addMeep()
      gameStore.checkPrestigeAvailability()

      // Move to completed
      this.activeMissions.splice(idx, 1)
      this.completedMissions.unshift(mission)

      // Keep only last 10 completed
      if (this.completedMissions.length > 10) {
        this.completedMissions = this.completedMissions.slice(0, 10)
      }
    },
  },
})
