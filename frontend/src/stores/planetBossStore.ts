import { defineStore } from 'pinia'
import type { PlanetBossEvent, PlanetBossRewardSlot, PlanetType } from '../types'
import {
  BOSS_BASE_HP,
  BOSS_HP_LEVEL_SCALE,
  BOSS_HP_CPS_SCALE,
  BOSS_HP_POWER_SCALE,
  BOSS_ENRAGE_BASE_SECONDS,
  BOSS_ENRAGE_LEVEL_STEP,
  BOSS_ENRAGE_MAX_SECONDS,
  BOSS_PASSIVE_DPS_FRACTION,
  BOSS_CPS_PENALTY_FRACTION,
  BOSS_CPS_PENALTY_DURATION_MS,
  BOSS_NAMES,
} from '../config/constants'
import { pickMaterial } from '../config/materials'
import { CHAMPION_HOME_PLANETS } from '../config/championHomePlanets'
import { activePlanetPositions } from '../utils/activePlanetPositions'
import { useGameStore } from './gameStore'
import { useShopStore } from './shopStore'
import { useBattleStore } from './battleStore'
import { useInventoryStore } from './inventoryStore'
import { useSectionStore } from './sectionStore'
import { useGalaxyStore } from './galaxyStore'
import { usePlayerStore } from './playerStore'
import { SECTIONS } from '../config/sections'
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
    spawnBoss(
      planetId: string,
      planetType: PlanetType,
      isChampionPlanet = false,
      noEnrage = false,
    ) {
      const gameStore = useGameStore()

      const level = gameStore.level
      const cps = gameStore.chimesPerSecond
      const cpc = gameStore.chimesPerClick
      const power = gameStore.totalPower

      const galaxyStore = useGalaxyStore()
      const sectionStore = useSectionStore()
      const sectionConfig = SECTIONS.find((s) => s.id === sectionStore.activeSectionId)
      const hpSectionMult = sectionConfig?.difficultyMultiplier ?? 1
      const enrageSectionMult = sectionConfig?.enrageMultiplier ?? 1

      const maxHP = Math.floor(
        BOSS_BASE_HP *
          (1 + level / BOSS_HP_LEVEL_SCALE) *
          (1 + cps / BOSS_HP_CPS_SCALE) *
          (1 + power / BOSS_HP_POWER_SCALE) *
          hpSectionMult,
      )

      const bonusSeconds = Math.floor(level / BOSS_ENRAGE_LEVEL_STEP) * 5
      const baseEnrageSec = Math.min(
        BOSS_ENRAGE_BASE_SECONDS + bonusSeconds,
        BOSS_ENRAGE_MAX_SECONDS,
      )
      const enrageSec = Math.max(10, Math.floor(baseEnrageSec * enrageSectionMult))
      const enrageTimerMs = enrageSec * 1000

      const clickDamagePerHit = Math.max(1, cpc)
      const passiveDPS = Math.max(0, Math.floor(cps * BOSS_PASSIVE_DPS_FRACTION))

      const randomChimes = () => Math.floor(Math.random() * 5) + 1
      const randomSlot = (): PlanetBossRewardSlot =>
        Math.random() < 0.5
          ? { type: 'material', materialId: pickMaterial().id }
          : { type: 'chimes', amount: randomChimes() }

      const rewardSlots: PlanetBossRewardSlot[] = [
        { type: 'chimes', amount: randomChimes() },
        randomSlot(),
        randomSlot(),
      ]

      let homePlanetChampion: string | undefined = undefined
      if (isChampionPlanet) {
        const battleStore = useBattleStore()
        const isUnrecruitedUnowned = (name: string) =>
          !battleStore.ownedChampions.includes(name) &&
          !battleStore.recruitableChampions.some((r) => r.name === name)

        let candidates = CHAMPION_HOME_PLANETS.filter(
          (c) => c.planetType === planetType && isUnrecruitedUnowned(c.championName),
        )
        if (candidates.length === 0 && isChampionPlanet) {
          candidates = CHAMPION_HOME_PLANETS.filter((c) => isUnrecruitedUnowned(c.championName))
        }
        if (candidates.length > 0) {
          homePlanetChampion =
            candidates[Math.floor(Math.random() * candidates.length)].championName
        }
      }

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
        rewardSlots,
        defeated: false,
        expired: false,
        ...(noEnrage && { noEnrage: true }),
        ...(homePlanetChampion && { homePlanetChampion }),
        ...(galaxyStore.pendingGalaxyBoss && { isGalaxyBoss: true }),
        ...(isChampionPlanet && { isChampionPlanet: true }),
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
        slots: rewardSlots.length,
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

    dealDamage(amount: number): boolean {
      const boss = this.activeBoss
      if (!boss || boss.defeated || boss.expired) return false

      boss.currentHP = Math.max(0, boss.currentHP - amount)
      boss.totalDamageDealt += amount

      if (boss.currentHP <= 0) {
        boss.currentHP = 0
        boss.defeated = true
        this.grantBossRewards(boss)
        this.bossModalOpen = false
        logger.info('Planet', 'Boss defeated!', { totalDamage: boss.totalDamageDealt })
        const planetId = boss.planetId
        setTimeout(() => {
          this.removeBoss(planetId)
        }, 600)
        return true
      }
      return false
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

    applyOrbitDamage() {
      const playerStore = usePlayerStore()
      for (const boss of this.activeBosses) {
        if (!boss.defeated && !boss.expired && activePlanetPositions.has(boss.planetId)) {
          playerStore.takeDamage(1)
        }
      }
    },

    applyPassiveDamage() {
      const gameStore = useGameStore()
      for (const boss of this.activeBosses) {
        if (boss.defeated || boss.expired || boss.passiveDPS <= 0) continue
        // Champion-Planeten erhalten keinen passiven Schaden wenn Spiel pausiert
        if (gameStore.isGamePaused && boss.isChampionPlanet) continue

        boss.currentHP -= boss.passiveDPS
        boss.totalDamageDealt += boss.passiveDPS

        if (boss.currentHP <= 0) {
          boss.currentHP = 0
          boss.defeated = true
          this.grantBossRewards(boss)
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          logger.info('Planet', 'Boss defeated by passive DPS!')
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

        // ── Champion-Planeten enragen NICHT ──────────────────────────────
        // Sie können nur durch Besiegen entfernt werden, nie durch Zeitablauf.
        if (boss.isChampionPlanet) continue

        const elapsed = Date.now() - boss.startTime
        if (elapsed < boss.enrageTimerMs) continue

        if (boss.noEnrage) {
          // noEnrage-Bosse (Resource-Sterne): still ablaufen lassen
          boss.expired = true
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          const planetId = boss.planetId
          setTimeout(() => {
            this.removeBoss(planetId)
          }, 900)
          continue
        }

        // Normaler Enrage
        boss.expired = true
        if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
        this.lastBossResult = 'defeat'

        this.cpsPenaltyActive = true
        this.cpsPenaltyExpiresAt = Date.now() + BOSS_CPS_PENALTY_DURATION_MS
        const shopStore = useShopStore()
        const gameStore = useGameStore()
        gameStore.chimesPerSecond = shopStore.calculateTotalCPS()

        const playerStore = usePlayerStore()
        playerStore.takeDamage()

        logger.info('Planet', 'Boss enraged! CPS penalty applied.')

        const planetId = boss.planetId
        setTimeout(() => {
          this.removeBoss(planetId)
        }, 900)
      }
    },

    grantBossRewards(boss: PlanetBossEvent) {
      if (!boss.defeated) return

      const gameStore = useGameStore()

      const inventoryStore = useInventoryStore()
      let totalChimes = 0
      for (const slot of boss.rewardSlots) {
        if (slot.type === 'chimes') {
          totalChimes += slot.amount ?? 0
        } else if (slot.type === 'material' && slot.materialId) {
          inventoryStore.addMaterial(slot.materialId)
          this.lastDroppedMaterialId = slot.materialId
        }
      }
      gameStore.chimes += totalChimes
      gameStore.chimesForNextUniverse += Math.floor(totalChimes * 0.3)
      gameStore.calculateLevel()

      if (boss.homePlanetChampion) {
        const battleStore = useBattleStore()
        const config = CHAMPION_HOME_PLANETS.find((c) => c.championName === boss.homePlanetChampion)
        if (config) {
          battleStore.addRecruitableChampion(boss.homePlanetChampion, config.materialCost)
        }
      }

      if (gameStore.isGamePaused) {
        gameStore.pauseStats.kills++
        for (const slot of boss.rewardSlots) {
          if (slot.type === 'material' && slot.materialId) {
            gameStore.pauseStats.materialsEarned[slot.materialId] =
              (gameStore.pauseStats.materialsEarned[slot.materialId] ?? 0) + 1
          }
        }
      }

      this.lastBossResult = 'victory'
      logger.info('Planet', `Rewards granted: +${totalChimes} chimes`)

      const sectionStore = useSectionStore()
      sectionStore.onBossDefeated()

      const galaxyStore = useGalaxyStore()
      if (galaxyStore.pendingGalaxyBoss) {
        galaxyStore.onGalaxyBossDefeated()
      } else if (boss.isChampionPlanet) {
        galaxyStore.onChampionStarRescued()
      }
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

        // ── Champion-Planeten enragen NICHT ──────────────────────────────
        if (boss.isChampionPlanet) continue

        const elapsed = Date.now() - boss.startTime
        if (elapsed < boss.enrageTimerMs) continue

        if (boss.noEnrage) {
          boss.expired = true
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          const planetId = boss.planetId
          setTimeout(() => {
            this.removeBoss(planetId)
          }, 900)
          continue
        }

        // Normaler Enrage
        boss.expired = true
        if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
        this.lastBossResult = 'defeat'

        if (boss.isChampionPlanet) {
          const galaxyStore = useGalaxyStore()
          galaxyStore.startChampionTravel()
        }

        const planetId = boss.planetId
        setTimeout(() => {
          this.removeBoss(planetId)
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
