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
import { useSectionStore } from './sectionStore'
import { SECTIONS, SECTION_BOSS_HP_MULTIPLIER, SECTION_BOSS_ENRAGE_MULTIPLIER } from '../config/sections'
import { logger } from '../utils/logger'

export const usePlanetBossStore = defineStore('planetBoss', {
  state: () => ({
    activeBosses: [] as PlanetBossEvent[],
    selectedBossId: null as string | null,
    bossModalOpen: false,
    lastBossResult: null as 'victory' | 'defeat' | null,
    cpsPenaltyActive: false,
    cpsPenaltyExpiresAt: 0,
    lastDroppedMaterialId: null as string | null,
  }),

  getters: {
    // Backward-compat: resolves to selected boss (or first active)
    activeBoss(): PlanetBossEvent | null {
      if (this.selectedBossId) {
        return this.activeBosses.find((b) => b.planetId === this.selectedBossId) ?? null
      }
      return this.activeBosses.find((b) => !b.defeated && !b.expired) ?? null
    },

    isBossActive(): boolean {
      return this.activeBosses.some((b) => !b.defeated && !b.expired)
    },

    bossHPPercent(): number {
      const boss = this.activeBoss
      if (!boss) return 0
      return Math.max(0, (boss.currentHP / boss.maxHP) * 100)
    },

    cpsPenaltyMultiplier(): number {
      return this.cpsPenaltyActive ? 1 - BOSS_CPS_PENALTY_FRACTION : 1
    },

    playerDPS(): number {
      const boss = this.activeBoss
      if (!boss) return 0
      return boss.clickDamagePerHit * 3 + boss.passiveDPS
    },

    requiredDPS(): number {
      const boss = this.activeBoss
      if (!boss) return 0
      return boss.maxHP / (boss.enrageTimerMs / 1000)
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

      // Section scaling
      const sectionStore = useSectionStore()
      const sectionConfig = SECTIONS.find((s) => s.id === sectionStore.activeSectionId)
      const isSectionBoss = sectionStore.pendingSectionBoss
      const hpSectionMult =
        (sectionConfig?.difficultyMultiplier ?? 1) * (isSectionBoss ? SECTION_BOSS_HP_MULTIPLIER : 1)
      const enrageSectionMult =
        (sectionConfig?.enrageMultiplier ?? 1) * (isSectionBoss ? SECTION_BOSS_ENRAGE_MULTIPLIER : 1)
      const sectionRewardMult = sectionConfig?.rewardMultiplier ?? 1

      // Boss HP scales with player progress + section
      const maxHP = Math.floor(
        BOSS_BASE_HP *
          (1 + level / BOSS_HP_LEVEL_SCALE) *
          (1 + cps / BOSS_HP_CPS_SCALE) *
          (1 + power / BOSS_HP_POWER_SCALE) *
          hpSectionMult,
      )

      // Enrage timer scales with level + section
      const bonusSeconds = Math.floor(level / BOSS_ENRAGE_LEVEL_STEP) * 5
      const baseEnrageSec = Math.min(BOSS_ENRAGE_BASE_SECONDS + bonusSeconds, BOSS_ENRAGE_MAX_SECONDS)
      const enrageSec = Math.max(10, Math.floor(baseEnrageSec * enrageSectionMult))
      const enrageTimerMs = enrageSec * 1000

      // Snapshot damage values
      const clickDamagePerHit = Math.max(1, cpc)
      const passiveDPS = Math.max(0, Math.floor(cps * BOSS_PASSIVE_DPS_FRACTION))

      // Difficulty for reward scaling (0-1 based on HP relative to damage potential)
      const estimatedTotalDamage = clickDamagePerHit * 3 * enrageSec + passiveDPS * enrageSec
      const difficulty = Math.min(1, Math.max(0, maxHP / Math.max(1, estimatedTotalDamage)))

      // Reward scales with difficulty + section
      const reward = Math.floor(
        BOSS_BASE_REWARD * (1 + difficulty * BOSS_REWARD_DIFFICULTY_SCALE) * sectionRewardMult,
      )

      // Material drop
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

      const newBoss: PlanetBossEvent = {
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
        ...(isSectionBoss && { isSectionBoss: true }),
        sectionId: sectionStore.activeSectionId,
      }

      this.activeBosses.push(newBoss)
      this.selectedBossId = planetId
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

    removeBoss(planetId: string) {
      const idx = this.activeBosses.findIndex((b) => b.planetId === planetId)
      if (idx !== -1) this.activeBosses.splice(idx, 1)
      if (this.selectedBossId === planetId) {
        this.selectedBossId =
          this.activeBosses.find((b) => !b.defeated && !b.expired)?.planetId ?? null
      }
    },

    dealClickDamage(): boolean {
      const boss = this.activeBoss
      if (!boss || boss.defeated || boss.expired) return false

      boss.currentHP -= boss.clickDamagePerHit
      boss.totalDamageDealt += boss.clickDamagePerHit

      if (boss.currentHP <= 0) {
        boss.currentHP = 0
        boss.defeated = true
        this.grantBossRewards(boss)
        this.bossModalOpen = false
        logger.info('Planet', 'Boss defeated!', {
          totalDamage: boss.totalDamageDealt,
          timeElapsed: Math.round((Date.now() - boss.startTime) / 1000) + 's',
        })
        const planetId = boss.planetId
        setTimeout(() => {
          this.removeBoss(planetId)
        }, 600)
        return true
      }
      return false
    },

    applyPassiveDamage() {
      for (const boss of this.activeBosses) {
        if (boss.defeated || boss.expired || boss.passiveDPS <= 0) continue

        boss.currentHP -= boss.passiveDPS
        boss.totalDamageDealt += boss.passiveDPS

        if (boss.currentHP <= 0) {
          boss.currentHP = 0
          boss.defeated = true
          this.grantBossRewards(boss)
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          logger.info('Planet', 'Boss defeated by passive damage!')
          const planetId = boss.planetId
          setTimeout(() => {
            this.removeBoss(planetId)
          }, 600)
        }
      }
    },

    checkEnrage() {
      for (const boss of this.activeBosses) {
        if (boss.defeated || boss.expired) continue

        const elapsed = Date.now() - boss.startTime
        if (elapsed >= boss.enrageTimerMs) {
          boss.expired = true
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          this.lastBossResult = 'defeat'

          // Apply CPS penalty
          this.cpsPenaltyActive = true
          this.cpsPenaltyExpiresAt = Date.now() + BOSS_CPS_PENALTY_DURATION_MS
          const shopStore = useShopStore()
          const gameStore = useGameStore()
          gameStore.chimesPerSecond = shopStore.calculateTotalCPS()

          logger.info('Planet', 'Boss enraged! CPS penalty applied.')
          const planetId = boss.planetId
          setTimeout(() => {
            this.removeBoss(planetId)
          }, 900)
        }
      }
    },

    grantBossRewards(boss: PlanetBossEvent) {
      if (!boss.defeated) return

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

      // Notify section store to update progress and unlocks
      const sectionStore = useSectionStore()
      sectionStore.onBossDefeated(boss.isSectionBoss ?? false)
    },

    openBossModal(planetId?: string) {
      if (planetId) this.selectedBossId = planetId
      this.bossModalOpen = true
    },

    closeBossModal() {
      this.bossModalOpen = false
    },

    forceCheckExpiry() {
      for (const boss of this.activeBosses) {
        if (boss.defeated || boss.expired) continue

        const elapsed = Date.now() - boss.startTime
        if (elapsed >= boss.enrageTimerMs) {
          boss.expired = true
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          this.lastBossResult = 'defeat'
          const planetId = boss.planetId
          setTimeout(() => {
            this.removeBoss(planetId)
          }, 900)
        }
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
