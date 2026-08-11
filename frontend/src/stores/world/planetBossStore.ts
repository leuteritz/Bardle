import { defineStore } from 'pinia'
import type { PlanetBossEvent, PlanetBossRewardSlot, PlanetType } from '@/types'
import {
  BOSS_BASE_HP,
  BOSS_HP_LEVEL_SCALE,
  BOSS_HP_CPS_SCALE,
  BOSS_HP_POWER_SCALE,
  BOSS_HP_PER_CHAMPION_STAR,
  BOSS_HP_PER_GALAXY,
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
  CHAMPION_XP_BOSS_BASE,
  CHAMPION_XP_BOSS_PER_GALAXY,
  CHAMPION_XP_GALAXY_BOSS_MULT,
  CHAMPION_XP_CHAMPION_PLANET_MULT,
  CHAMPION_XP_BOSS_ESCORT_MULT,
  BOSS_REMOVE_DELAY_MS,
} from '@/config/constants'
import { pickMaterial } from '@/config/economy/materials'
import { CHAMPION_HOME_PLANETS } from '@/config/champions/championHomePlanets'
import { CHAMPION_ROLES } from '@/config/champions/championData'
import {
  getChampionStarLevel,
  unlockedChampionTierCount,
  tierSpawnWeights,
} from '@/config/champions/championTiers'
import { activeMidCurse } from '@/utils/orbit/liveState'
import { gameNow, gameTimeout } from '@/utils/game/gameClock'
import { bossPlanetInForeground } from '@/utils/orbit/foregroundGate'
import { prewarmBossSprite } from '@/utils/fx/bossSprite'
import { ROLE_MID_CURSE_DAMAGE_AMP } from '@/config/constants'
import { useGameStore } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useSectionStore } from '@/stores/core/sectionStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { SECTIONS } from '@/config/progression/sections'
import { logger } from '@/utils/logger'

export const usePlanetBossStore = defineStore('planetBoss', {
  state: () => ({
    activeBosses: [] as PlanetBossEvent[],
    selectedBossId: null as string | null,
    bossModalOpen: false,
    lastBossResult: null as 'victory' | 'defeat' | null,
    cpsPenaltyActive: false,
    cpsPenaltyExpiresAt: 0,
    lastDroppedMaterialId: null as string | null,
    // Monotoner Zähler: inkrementiert bei jeder Turret-Salve (gameStore-Tick) —
    // Idle-Orbit-Schüsse UND Star-Fight-Turret-Battery teilen diesen Takt
    turretVolleyCounter: 0,
    /** Lifetime counters for the Bard Stats catalog. */
    totalBossesDefeated: 0,
    totalBossesLost: 0,
    /** Damage ever dealt to planet bosses, across every fight. */
    totalBossDamage: 0,
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
      opts: { isGalaxyBoss?: boolean; isBossEscort?: boolean } = {},
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

      // Gegengewicht zu den Schadensquellen im Star-Fight-Modal: Team-Stärke
      // (Summe der Stern-Level aller aufgestellten Champions) und Galaxie-
      // Fortschritt skalieren die Boss-HP mit
      const battleStore = useBattleStore()
      const totalChampionStars = battleStore.headerSlots.reduce(
        (sum, name) => (name ? sum + getChampionStarLevel(name) : sum),
        0,
      )
      const championMult = 1 + totalChampionStars * BOSS_HP_PER_CHAMPION_STAR
      const galaxyMult = 1 + (galaxyStore.currentGalaxy - 1) * BOSS_HP_PER_GALAXY

      const providence = useProvidenceStore()

      const maxHP = Math.floor(
        BOSS_BASE_HP *
          (1 + level / BOSS_HP_LEVEL_SCALE) *
          (1 + cps / BOSS_HP_CPS_SCALE) *
          (1 + power / BOSS_HP_POWER_SCALE) *
          hpSectionMult *
          championMult *
          galaxyMult *
          // Warden's Toll (providence): schwerer zu fällen, dafür ergiebiger
          providence.bossHpMult,
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

      // Die Beute wird beim SPAWN gewürfelt und im Boss mitgeschrieben — der
      // Faktor gehört deshalb hierher und nicht ans Einsammeln: sonst zeigte die
      // Belohnungsleiste eine Zahl und der Spieler bekäme eine andere.
      const randomChimes = () =>
        Math.max(
          1,
          Math.floor((Math.random() * BOSS_REWARD_CHIMES_MAX + 1) * providence.bossRewardMult),
        )
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
            if (star < 1 || star > unlocked)
              continue // only unlocked tiers spawn
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
          // Do NOT clear nextStarRole here: the role stays selected until the
          // player confirms the next one (requestRoleSelection). If this star's
          // window expires, the follow-up star reuses the same role instead of
          // forcing the role-selection modal open again.
        }
      }

      const bossName = BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]

      const newBoss: PlanetBossEvent = {
        planetId,
        planetType,
        bossName,
        startTime: gameNow(),
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
        ...(opts.isGalaxyBoss && { isGalaxyBoss: true }),
        ...(opts.isBossEscort && { isBossEscort: true }),
        ...(isChampionPlanet && { isChampionPlanet: true }),
        ...(isChampionEscort && { isChampionEscort: true }),
        sectionId: sectionStore.activeSectionId,
      }

      this.activeBosses.push(newBoss)
      this.selectedBossId = planetId
      // Sprite jetzt dekodieren, nicht erst beim Öffnen des Star-Fight-Modals —
      // dort läge der ~1 MB PNG-Decode sonst im Einblende-Frame.
      prewarmBossSprite(planetId)
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
        activeMidCurse.type === 'banishment' && gameNow() < activeMidCurse.activeUntil
      const cursed = banished ? amount * ROLE_MID_CURSE_DAMAGE_AMP : amount
      const effective = Math.round(
        cursed *
          useStarForgeStore().bossDamageMult *
          useMeepTreeStore().fx.bossDamageMult *
          useAchievementStore().bossDamageMult,
      )

      boss.currentHP = Math.max(0, boss.currentHP - effective)
      boss.totalDamageDealt += effective
      this.totalBossDamage += effective

      if (boss.currentHP <= 0) {
        boss.currentHP = 0
        boss.defeated = true
        this.grantBossRewards(boss)
        this.bossModalOpen = false
        logger.info('Planet', 'Boss defeated!', { totalDamage: boss.totalDamageDealt })
        const planetId = boss.planetId
        gameTimeout(() => {
          this.removeBoss(planetId)
        }, BOSS_REMOVAL_DELAY_MS)
        return true
      }
      return false
    },

    dealClickDamage(): boolean {
      const boss = this.activeBoss
      if (!boss || boss.defeated || boss.expired) return false
      // Vordergrund-Gate: hinter der Sonne ist der Boss unantastbar — auch
      // Spieler-Klicks im Star-Fight-Modal richten dann keinen Schaden an
      if (!bossPlanetInForeground(boss.planetId)) return false
      const solar = useSolarUpgradeStore()
      const clickDamage = Math.ceil(boss.clickDamagePerHit * solar.dmgMultiplier)
      const defeated = this.dealDamage(clickDamage)
      // Shattering Nova: clicks splash a fraction of their damage to all other bosses
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
        this.totalBossDamage += effectiveDPS

        if (boss.currentHP <= 0) {
          boss.currentHP = 0
          boss.defeated = true
          this.grantBossRewards(boss)
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          logger.info('Planet', 'Boss defeated by passive DPS!')
          const planetId = boss.planetId
          gameTimeout(() => {
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
        // Endkampf am Galaxiekern kennt kein Enrage: Boss und Eskorten bleiben,
        // bis sie besiegt sind — sonst droht ein Softlock der Galaxie.
        if (boss.isGalaxyBoss || boss.isBossEscort) continue

        if (starGroupStore.starFightModalOpen && boss.planetId !== this.selectedBossId) continue

        const elapsed = gameNow() - boss.startTime
        if (elapsed < boss.enrageTimerMs) continue

        if (boss.noEnrage) {
          boss.expired = true
          this.totalBossesLost += 1
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          const planetId = boss.planetId
          gameTimeout(() => {
            this.removeBoss(planetId)
          }, BOSS_REMOVAL_LONG_DELAY_MS)
          continue
        }

        boss.expired = true
        this.totalBossesLost += 1
        if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
        this.lastBossResult = 'defeat'

        this.cpsPenaltyActive = true
        this.cpsPenaltyExpiresAt = gameNow() + BOSS_CPS_PENALTY_DURATION_MS
        const shopStore = useShopStore()
        const gameStore = useGameStore()
        gameStore.chimesPerSecond = shopStore.calculateTotalCPS()

        const playerStore = usePlayerStore()
        playerStore.takeDamage()

        logger.info('Planet', 'Boss enraged! CPS penalty applied.')

        const planetId = boss.planetId
        gameTimeout(() => {
          this.removeBoss(planetId)
        }, BOSS_REMOVE_DELAY_MS)
      }
    },

    grantBossRewards(boss: PlanetBossEvent) {
      if (!boss.defeated) return
      this.totalBossesDefeated += 1

      const gameStore = useGameStore()

      const inventoryStore = useInventoryStore()
      const levelStore = useChampionLevelStore()
      // FORTUNE (champion levels) lifts the chime payout and gives every material
      // slot a chance at a second unit — the fractional part of the multiplier.
      const fortune = levelStore.teamFortuneMult
      const extraMaterialChance = fortune - 1
      let totalChimes = 0
      for (const slot of boss.rewardSlots) {
        if (slot.type === 'chimes') {
          totalChimes += slot.amount ?? 0
        } else if (slot.type === 'material' && slot.materialId) {
          inventoryStore.addMaterial(slot.materialId, 'boss')
          if (extraMaterialChance > 0 && Math.random() < extraMaterialChance) {
            inventoryStore.addMaterial(slot.materialId, 'boss')
          }
          this.lastDroppedMaterialId = slot.materialId
        }
      }
      totalChimes = Math.round(totalChimes * fortune)
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
        // `kills` bleibt die Gesamtsumme; die Kategorie daneben schlüsselt auf,
        // was gefallen ist. Der Galaxieboss zählt nur hier — der Stern, auf dem
        // er sitzt, wird zusätzlich als Rettung gemeldet (starGroupStore).
        gameStore.pauseStats.kills++
        if (boss.isGalaxyBoss) gameStore.pauseStats.galaxyBossesFelled++
        else gameStore.pauseStats.planetsCleared++
        for (const slot of boss.rewardSlots) {
          if (slot.type === 'material' && slot.materialId) {
            gameStore.pauseStats.materialsEarned[slot.materialId] =
              (gameStore.pauseStats.materialsEarned[slot.materialId] ?? 0) + 1
          }
        }
      }

      // Champion XP — the whole orbiting roster shares the kill. Galaxy bosses,
      // champion planets and escorts are worth a multiple of a regular boss, so
      // star fights and boss chains are the real level-up moments.
      const galaxy = useGalaxyStore().currentGalaxy
      let xp = CHAMPION_XP_BOSS_BASE + Math.max(0, galaxy - 1) * CHAMPION_XP_BOSS_PER_GALAXY
      if (boss.isGalaxyBoss) xp *= CHAMPION_XP_GALAXY_BOSS_MULT
      else if (boss.isChampionPlanet) xp *= CHAMPION_XP_CHAMPION_PLANET_MULT
      else if (boss.isBossEscort) xp *= CHAMPION_XP_BOSS_ESCORT_MULT
      levelStore.grantTeamXp(xp)

      this.lastBossResult = 'victory'
      logger.info('Planet', `Rewards granted: +${totalChimes} chimes, +${xp} champion XP`)

      const sectionStore = useSectionStore()
      sectionStore.onBossDefeated()
      // Galaxieboss-Sieg wird NICHT hier gemeldet, sondern in
      // starGroupStore.onBossResult, sobald der ganze Bossstern geräumt ist —
      // der Bossstern hat mehrere Planeten, der Boss-Kill allein reicht nicht.
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
        // Endkampf am Galaxiekern kennt kein Enrage: Boss und Eskorten bleiben,
        // bis sie besiegt sind — sonst droht ein Softlock der Galaxie.
        if (boss.isGalaxyBoss || boss.isBossEscort) continue

        if (starGroupStore.starFightModalOpen && boss.planetId !== this.selectedBossId) continue

        const elapsed = gameNow() - boss.startTime
        if (elapsed < boss.enrageTimerMs) continue

        if (boss.noEnrage) {
          boss.expired = true
          this.totalBossesLost += 1
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          const planetId = boss.planetId
          gameTimeout(() => {
            this.removeBoss(planetId)
          }, BOSS_REMOVAL_LONG_DELAY_MS)
          continue
        }

        boss.expired = true
        this.totalBossesLost += 1
        if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
        this.lastBossResult = 'defeat'

        if (boss.isChampionPlanet) {
          const galaxyStore = useGalaxyStore()
          galaxyStore.startChampionTravel()
        }

        const planetId = boss.planetId
        gameTimeout(() => {
          this.removeBoss(planetId)
        }, BOSS_REMOVE_DELAY_MS)
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
