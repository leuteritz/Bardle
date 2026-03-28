import { defineStore } from 'pinia'
import type { PlanetBossEvent, PlanetType } from '../types'
import {
  BOSS_BASE_HP,
  BOSS_HP_LEVEL_SCALE,
  BOSS_HP_CPS_SCALE,
  BOSS_HP_POWER_SCALE,
  BOSS_ENRAGE_BASE_SECONDS,
  BOSS_ENRAGE_LEVEL_STEP,
  BOSS_ENRAGE_MAX_SECONDS,
  BOSS_PASSIVE_DPS_FRACTION,
  BOSS_BASE_REWARD,
  BOSS_REWARD_DIFFICULTY_SCALE,
  BOSS_CPS_PENALTY_FRACTION,
  BOSS_CPS_PENALTY_DURATION_MS,
  BOSS_NAMES,
  PLANET_MATERIAL_CHANCE,
  CHAMPION_HOME_PLANET_CHANCE,
} from '../config/constants'
import { pickMaterial } from '../config/materials'
import { CHAMPION_HOME_PLANETS } from '../config/championHomePlanets'
import { useGameStore } from './gameStore'
import { useShopStore } from './shopStore'
import { useBattleStore } from './battleStore'
import { useInventoryStore } from './inventoryStore'
import { logger } from '../utils/logger'

export const usePlanetBossStore = defineStore('planetBoss', {
  state: () => ({
    activeBoss: null as PlanetBossEvent | null,
    bossModalOpen: false,
    lastBossResult: null as 'victory' | 'defeat' | null,
    cpsPenaltyActive: false,
    cpsPenaltyExpiresAt: 0,
    lastDroppedMaterialId: null as string | null,
  }),

  getters: {
    isBossActive(): boolean {
      return this.activeBoss !== null && !this.activeBoss.defeated && !this.activeBoss.expired
    },

    bossHPPercent(): number {
      if (!this.activeBoss) return 0
      return Math.max(0, (this.activeBoss.currentHP / this.activeBoss.maxHP) * 100)
    },

    cpsPenaltyMultiplier(): number {
      return this.cpsPenaltyActive ? 1 - BOSS_CPS_PENALTY_FRACTION : 1
    },

    playerDPS(): number {
      if (!this.activeBoss) return 0
      // Estimate: ~3 clicks/s average + passive
      return this.activeBoss.clickDamagePerHit * 3 + this.activeBoss.passiveDPS
    },

    requiredDPS(): number {
      if (!this.activeBoss) return 0
      return this.activeBoss.maxHP / (this.activeBoss.enrageTimerMs / 1000)
    },
  },

  actions: {
    spawnBoss(planetId: string, planetType: PlanetType) {
      const gameStore = useGameStore()
      const shopStore = useShopStore()

      const level = gameStore.level
      const cps = gameStore.chimesPerSecond
      const cpc = gameStore.chimesPerClick
      const power = gameStore.totalPower

      // Boss HP scales with player progress
      const maxHP = Math.floor(
        BOSS_BASE_HP *
          (1 + level / BOSS_HP_LEVEL_SCALE) *
          (1 + cps / BOSS_HP_CPS_SCALE) *
          (1 + power / BOSS_HP_POWER_SCALE),
      )

      // Enrage timer scales with level
      const bonusSeconds = Math.floor(level / BOSS_ENRAGE_LEVEL_STEP) * 5
      const enrageSec = Math.min(BOSS_ENRAGE_BASE_SECONDS + bonusSeconds, BOSS_ENRAGE_MAX_SECONDS)
      const enrageTimerMs = enrageSec * 1000

      // Snapshot damage values
      const clickDamagePerHit = Math.max(1, cpc)
      const passiveDPS = Math.max(0, Math.floor(cps * BOSS_PASSIVE_DPS_FRACTION))

      // Difficulty for reward scaling (0-1 based on HP relative to damage potential)
      const estimatedTotalDamage = clickDamagePerHit * 3 * enrageSec + passiveDPS * enrageSec
      const difficulty = Math.min(1, Math.max(0, maxHP / Math.max(1, estimatedTotalDamage)))

      // Reward scales with difficulty
      const reward = Math.floor(BOSS_BASE_REWARD * (1 + difficulty * BOSS_REWARD_DIFFICULTY_SCALE))

      // Material drop — same logic as old planetEventStore
      const hasMaterial = Math.random() < PLANET_MATERIAL_CHANCE
      const potentialMaterialId = hasMaterial ? pickMaterial().id : undefined
      const assignedDropChance = hasMaterial ? 0.2 + Math.random() * 0.4 : undefined

      // Champion home planet
      let homePlanetChampion: string | undefined = undefined
      if (Math.random() < CHAMPION_HOME_PLANET_CHANCE) {
        const battleStore = useBattleStore()
        const candidates = CHAMPION_HOME_PLANETS.filter(
          (c) =>
            c.planetType === planetType &&
            !battleStore.ownedChampions.includes(c.championName) &&
            !battleStore.recruitableChampions.some((r) => r.name === c.championName),
        )
        if (candidates.length > 0) {
          homePlanetChampion =
            candidates[Math.floor(Math.random() * candidates.length)].championName
        }
      }

      // Pick boss name
      const bossName = BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]

      this.activeBoss = {
        planetId,
        planetType,
        bossName,
        startTime: Date.now(),
        enrageTimerMs,
        maxHP,
        currentHP: maxHP,
        clickDamagePerHit,
        passiveDPS,
        totalDamageDealt: 0,
        reward,
        defeated: false,
        expired: false,
        ...(potentialMaterialId !== undefined && { potentialMaterialId }),
        ...(assignedDropChance !== undefined && { assignedDropChance }),
        ...(homePlanetChampion && { homePlanetChampion }),
      }

      this.lastBossResult = null
      this.lastDroppedMaterialId = null

      logger.info('Planet', `Boss spawned: ${bossName}`, {
        maxHP,
        enrageSec,
        clickDamage: clickDamagePerHit,
        passiveDPS,
        reward,
      })
    },

    dealClickDamage(): boolean {
      const boss = this.activeBoss
      if (!boss || boss.defeated || boss.expired) return false

      boss.currentHP -= boss.clickDamagePerHit
      boss.totalDamageDealt += boss.clickDamagePerHit

      if (boss.currentHP <= 0) {
        boss.currentHP = 0
        boss.defeated = true
        this.grantBossRewards()
        this.bossModalOpen = false
        logger.info('Planet', 'Boss defeated!', {
          totalDamage: boss.totalDamageDealt,
          timeElapsed: Math.round((Date.now() - boss.startTime) / 1000) + 's',
        })
        setTimeout(() => {
          this.activeBoss = null
        }, 600)
        return true
      }
      return false
    },

    applyPassiveDamage() {
      const boss = this.activeBoss
      if (!boss || boss.defeated || boss.expired) return

      if (boss.passiveDPS > 0) {
        boss.currentHP -= boss.passiveDPS
        boss.totalDamageDealt += boss.passiveDPS

        if (boss.currentHP <= 0) {
          boss.currentHP = 0
          boss.defeated = true
          this.grantBossRewards()
          this.bossModalOpen = false
          logger.info('Planet', 'Boss defeated by passive damage!')
          setTimeout(() => {
            this.activeBoss = null
          }, 600)
        }
      }
    },

    checkEnrage() {
      const boss = this.activeBoss
      if (!boss || boss.defeated || boss.expired) return

      const elapsed = Date.now() - boss.startTime
      if (elapsed >= boss.enrageTimerMs) {
        boss.expired = true
        this.bossModalOpen = false
        this.lastBossResult = 'defeat'

        // Apply CPS penalty
        this.cpsPenaltyActive = true
        this.cpsPenaltyExpiresAt = Date.now() + BOSS_CPS_PENALTY_DURATION_MS
        const shopStore = useShopStore()
        const gameStore = useGameStore()
        gameStore.chimesPerSecond = shopStore.calculateTotalCPS()

        logger.info('Planet', 'Boss enraged! CPS penalty applied.')
        setTimeout(() => {
          this.activeBoss = null
        }, 900)
      }
    },

    grantBossRewards() {
      const boss = this.activeBoss
      if (!boss || !boss.defeated) return

      const gameStore = useGameStore()

      // Chimes reward
      gameStore.chimes += boss.reward
      gameStore.chimesForNextUniverse += Math.floor(boss.reward * 0.3)
      gameStore.calculateLevel()

      // Material drop
      if (boss.potentialMaterialId && boss.assignedDropChance != null) {
        const inventoryStore = useInventoryStore()
        const dropped = inventoryStore.tryDropSpecificMaterial(
          boss.potentialMaterialId,
          boss.assignedDropChance,
        )
        this.lastDroppedMaterialId = dropped ? boss.potentialMaterialId : null
      }

      // Champion recruitment
      if (boss.homePlanetChampion) {
        const battleStore = useBattleStore()
        const config = CHAMPION_HOME_PLANETS.find((c) => c.championName === boss.homePlanetChampion)
        if (config) {
          battleStore.addRecruitableChampion(boss.homePlanetChampion, config.materialCost)
        }
      }

      this.lastBossResult = 'victory'
      logger.info('Planet', `Rewards granted: +${boss.reward} chimes`)
    },

    openBossModal() {
      this.bossModalOpen = true
    },

    closeBossModal() {
      this.bossModalOpen = false
    },

    forceCheckExpiry() {
      const boss = this.activeBoss
      if (!boss || boss.defeated || boss.expired) return

      const elapsed = Date.now() - boss.startTime
      if (elapsed >= boss.enrageTimerMs) {
        boss.expired = true
        this.bossModalOpen = false
        this.lastBossResult = 'defeat'
        setTimeout(() => {
          this.activeBoss = null
        }, 900)
      }
    },

    clearPenalty() {
      this.cpsPenaltyActive = false
      this.cpsPenaltyExpiresAt = 0
      const shopStore = useShopStore()
      const gameStore = useGameStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      logger.info('Planet', 'CPS penalty expired.')
    },
  },
})
