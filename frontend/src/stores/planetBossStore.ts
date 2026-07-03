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
  BOSS_ENRAGE_BONUS_SECONDS_PER_STEP,
  BOSS_ENRAGE_MIN_SECONDS,
  BOSS_REWARD_CHIMES_MAX,
  BOSS_REWARD_MATERIAL_CHANCE,
  BOSS_REMOVAL_DELAY_MS,
  BOSS_REMOVAL_LONG_DELAY_MS,
  BOSS_UNIVERSE_PROGRESS_FRACTION,
} from '../config/constants'
import { pickMaterial } from '../config/materials'
import { CHAMPION_HOME_PLANETS } from '../config/championHomePlanets'
import { CHAMPION_ROLES } from '../config/championRoles'
import {
  getChampionStarLevel,
  unlockedChampionTierCount,
  tierSpawnWeights,
} from '../config/championTiers'
import { activeMidCurse } from '../utils/activeMidCurse'
import { ROLE_MID_CURSE_DAMAGE_AMP } from '../config/constants'
import { useGameStore } from './gameStore'
import { useShopStore } from './shopStore'
import { useBattleStore } from './battleStore'
import { useInventoryStore } from './inventoryStore'
import { useSectionStore } from './sectionStore'
import { useGalaxyStore } from './galaxyStore'
import { usePlayerStore } from './playerStore'
import { useStarGroupStore } from './starGroupStore'
import { useSolarUpgradeStore } from './solarUpgradeStore'
import { useStarForgeStore } from './starForgeStore'
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
      isChampionEscort = false,
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

      const bonusSeconds =
        Math.floor(level / BOSS_ENRAGE_LEVEL_STEP) * BOSS_ENRAGE_BONUS_SECONDS_PER_STEP
      const baseEnrageSec = Math.min(
        BOSS_ENRAGE_BASE_SECONDS + bonusSeconds,
        BOSS_ENRAGE_MAX_SECONDS,
      )
      const enrageSec = Math.max(
        BOSS_ENRAGE_MIN_SECONDS,
        Math.floor(baseEnrageSec * enrageSectionMult),
      )
      const enrageTimerMs = enrageSec * 1000

      const clickDamagePerHit = Math.max(1, cpc)
      const passiveDPS = Math.max(0, Math.floor(cps * BOSS_PASSIVE_DPS_FRACTION))

      const randomChimes = () => Math.floor(Math.random() * BOSS_REWARD_CHIMES_MAX) + 1
      const randomSlot = (): PlanetBossRewardSlot =>
        Math.random() < BOSS_REWARD_MATERIAL_CHANCE
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

        // ── Role → tier-weighted → champion ──
        // Role is chosen first (player pick → nextStarRole). Within the eligible
        // champions, group by Champion Tier (1..unlocked) and pick a tier by its
        // current spawn weight, then a uniform champion inside that tier. Empty
        // tiers are dropped and the remaining weights renormalized on the fly.
        const nextRole = galaxyStore.nextStarRole
        const unlocked = unlockedChampionTierCount(galaxyStore.currentGalaxy)
        const weights = tierSpawnWeights(unlocked)

        const pickWeighted = (eligible: typeof CHAMPION_HOME_PLANETS): string | undefined => {
          const byTier = new Map<number, string[]>()
          for (const c of eligible) {
            const star = getChampionStarLevel(c.championName)
            if (star < 1 || star > unlocked) continue // only unlocked tiers spawn
            ;(byTier.get(star) ?? byTier.set(star, []).get(star)!).push(c.championName)
          }
          if (byTier.size === 0) return undefined
          // Weighted-pick a present tier over the sum of its weight (renormalized).
          const tiers = [...byTier.keys()]
          const total = tiers.reduce((sum, t) => sum + (weights[t - 1] ?? 0), 0)
          let roll = Math.random() * total
          let chosenTier = tiers[tiers.length - 1]
          for (const t of tiers) {
            roll -= weights[t - 1] ?? 0
            if (roll <= 0) {
              chosenTier = t
              break
            }
          }
          const names = byTier.get(chosenTier)!
          return names[Math.floor(Math.random() * names.length)]
        }

        // 1) selected role ∩ unrecruited, tier-weighted
        let chosen = nextRole
          ? pickWeighted(
              CHAMPION_HOME_PLANETS.filter(
                (c) =>
                  isUnrecruitedUnowned(c.championName) &&
                  CHAMPION_ROLES[c.championName] === nextRole,
              ),
            )
          : undefined
        // 2) any unrecruited (ignore role), still tier-weighted
        if (!chosen) {
          chosen = pickWeighted(
            CHAMPION_HOME_PLANETS.filter((c) => isUnrecruitedUnowned(c.championName)),
          )
        }
        // 3) last resort: any unrecruited at all (covers fully-recruited unlocked
        //    tiers) so a champion star is never left without a champion.
        if (!chosen) {
          const any = CHAMPION_HOME_PLANETS.filter((c) => isUnrecruitedUnowned(c.championName))
          if (any.length > 0) chosen = any[Math.floor(Math.random() * any.length)].championName
        }
        if (chosen) {
          homePlanetChampion = chosen
          galaxyStore.nextStarRole = null
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
        ...(isChampionEscort && { isChampionEscort: true }),
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
      return this.dealDamageToBoss(boss, amount)
    },

    /** Applies damage (incl. curse + Star Forge boss multipliers) to a specific boss. */
    dealDamageToBoss(boss: PlanetBossEvent, amount: number): boolean {
      const banished =
        activeMidCurse.type === 'banishment' && Date.now() < activeMidCurse.activeUntil
      const cursed = banished ? amount * ROLE_MID_CURSE_DAMAGE_AMP : amount
      const effective = Math.round(cursed * useStarForgeStore().bossDamageMult)

      boss.currentHP = Math.max(0, boss.currentHP - effective)
      boss.totalDamageDealt += effective

      if (boss.currentHP <= 0) {
        boss.currentHP = 0
        boss.defeated = true
        this.grantBossRewards(boss)
        this.bossModalOpen = false
        logger.info('Planet', 'Boss defeated!', { totalDamage: boss.totalDamageDealt })
        const planetId = boss.planetId
        setTimeout(() => {
          this.removeBoss(planetId)
        }, BOSS_REMOVAL_DELAY_MS)
        return true
      }
      return false
    },

    dealClickDamage(): boolean {
      const boss = this.activeBoss
      if (!boss || boss.defeated || boss.expired) return false
      const solar = useSolarUpgradeStore()
      const clickDamage = Math.ceil(boss.clickDamagePerHit * solar.dmgMultiplier)
      const defeated = this.dealDamage(clickDamage)
      // Percussive Nova: clicks splash a fraction of their damage to all other bosses
      const splashPct = useStarForgeStore().clickSplashPct
      if (splashPct > 0) {
        const splash = Math.ceil(clickDamage * splashPct)
        for (const other of this.activeBosses) {
          if (other === boss || other.defeated || other.expired) continue
          this.dealDamageToBoss(other, splash)
        }
      }
      return defeated
    },

    applyPassiveDamage() {
      const gameStore = useGameStore()
      const starGroupStore = useStarGroupStore()
      for (const boss of this.activeBosses) {
        if (boss.defeated || boss.expired || boss.passiveDPS <= 0) continue
        if (gameStore.isGamePaused && boss.isChampionPlanet) continue
        if (starGroupStore.starFightModalOpen && boss.planetId !== this.selectedBossId) continue

        const effectiveDPS = Math.max(1, boss.passiveDPS)
        boss.currentHP -= effectiveDPS
        boss.totalDamageDealt += effectiveDPS

        if (boss.currentHP <= 0) {
          boss.currentHP = 0
          boss.defeated = true
          this.grantBossRewards(boss)
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          logger.info('Planet', 'Boss defeated by passive DPS!')
          const planetId = boss.planetId
          setTimeout(() => {
            this.removeBoss(planetId)
          }, BOSS_REMOVAL_DELAY_MS)
        }
      }
    },

    checkEnrage() {
      const starGroupStore = useStarGroupStore()
      for (const boss of this.activeBosses) {
        if (boss.defeated || boss.expired) continue

        if (boss.isChampionPlanet) continue
        if (boss.isChampionEscort) continue

        if (starGroupStore.starFightModalOpen && boss.planetId !== this.selectedBossId) continue

        const elapsed = Date.now() - boss.startTime
        if (elapsed < boss.enrageTimerMs) continue

        if (boss.noEnrage) {
          boss.expired = true
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          const planetId = boss.planetId
          setTimeout(() => {
            this.removeBoss(planetId)
          }, BOSS_REMOVAL_LONG_DELAY_MS)
          continue
        }

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
      gameStore.chimesForNextUniverse += Math.floor(totalChimes * BOSS_UNIVERSE_PROGRESS_FRACTION)
      gameStore.calculateLevel()

      if (boss.homePlanetChampion) {
        const battleStore = useBattleStore()
        const config = CHAMPION_HOME_PLANETS.find((c) => c.championName === boss.homePlanetChampion)
        if (config) {
          battleStore.addRecruitableChampion(
            boss.homePlanetChampion,
            config.materialCost,
            config.chimesPrice,
          )
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
      const starGroupStore = useStarGroupStore()
      for (const boss of this.activeBosses) {
        if (boss.defeated || boss.expired) continue

        if (boss.isChampionPlanet) continue
        if (boss.isChampionEscort) continue

        if (starGroupStore.starFightModalOpen && boss.planetId !== this.selectedBossId) continue

        const elapsed = Date.now() - boss.startTime
        if (elapsed < boss.enrageTimerMs) continue

        if (boss.noEnrage) {
          boss.expired = true
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          const planetId = boss.planetId
          setTimeout(() => {
            this.removeBoss(planetId)
          }, BOSS_REMOVAL_LONG_DELAY_MS)
          continue
        }

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
