import { defineStore } from 'pinia'
import { useShopStore } from './shopStore'
import { useItemStore } from './itemStore'
import { useSynergyStore } from './synergyStore'
import { usePlanetEventStore } from './planetEventStore'
import { usePlanetBossStore } from './planetBossStore'
import { useGalaxyStore } from './galaxyStore'
import { useStarGroupStore } from './starGroupStore'
import { useExpeditionStore } from './expeditionStore'
import { useCombatStore } from './combatStore'
import { usePlayerStore } from './playerStore'
import { useRoleBehaviorStore } from './roleBehaviorStore'
import { usePlanetShopStore } from './planetShopStore'
import { universes } from '../config/universes'
import { clampPercent } from '../utils/math'
import { AUGMENTS, AUGMENT_POOL, RARITY_WEIGHTS } from '../config/augments'
import { useAugmentStore } from './augmentStore'
import {
  LEVEL_BASE,
  LEVEL_EXPONENT,
  LEVEL_SCALING_THRESHOLD,
  LEVEL_SCALING_FACTOR,
  MEEP_BASE_COST,
  MEEP_COST_EXPONENT,
  MAX_ABILITY_LEVEL,
  SKILL_MEEP_COSTS,
  BOSS_PASSIVE_DPS_FRACTION,
  GAME_TICK_INTERVAL_MS,
  MEEP_ADD_DELAY_MS,
  AUGMENT_CHOICE_COUNT,
  ADMIN_LEVEL_AUGMENT_QUEUE_MAX,
  RARITY_WEIGHT_FALLBACK,
  BUILDING_HISTORY_BUFFER_SIZE,
  HYPERSPACE_ANIM_START_MS,
  HYPERSPACE_ANIM_END_MS,
  UNIVERSE_RESCUE_INITIAL_COST,
  UNIVERSE_RESCUE_COST_MULTIPLIER,
  MEEP_POWER_MULTIPLIER,
  ABILITY_CPS_PER_LEVEL_DEFAULT,
  ABILITY_POWER_PER_LEVEL_DEFAULT,
  ABILITY_MEEP_COST_PER_LEVEL_DEFAULT,
  ABILITY_MEEP_COST_MIN_MULTIPLIER,
  ABILITY_CPC_PER_LEVEL_DEFAULT,
  CHIMES_PER_CLICK_BASE,
} from '../config/constants'
import type {
  BuildingProduction,
  TotalBuildingProduction,
  ShopUpgrade,
  Expedition,
  ModifierEffects,
  AugmentEffects,
  AugmentDefinition,
  AugmentRarity,
} from '../types'
import { logger } from '../utils/logger'

function chimeThresholdForLevel(level: number, exponent: number = LEVEL_EXPONENT): number {
  if (level <= 0) return 0
  const base = Math.ceil(LEVEL_BASE * Math.pow(level, exponent))
  if (level <= LEVEL_SCALING_THRESHOLD) return base
  // Above threshold: exponential braking prevents augment-choice loop at high levels
  return Math.ceil(base * Math.pow(LEVEL_SCALING_FACTOR, level - LEVEL_SCALING_THRESHOLD))
}

export const useGameStore = defineStore('game', {
  state: () => ({
    gameSpeed: GAME_TICK_INTERVAL_MS,
    inGameTime: 0,

    chimes: 0,
    chimesPerSecond: 0,
    chimesForNextLevel: LEVEL_BASE,
    chimesPerClick: CHIMES_PER_CLICK_BASE,
    baseChimesPerClick: CHIMES_PER_CLICK_BASE,
    chimesForMeep: 0,
    chimesForNextUniverse: 0,
    chimesToUniverseRescue: UNIVERSE_RESCUE_INITIAL_COST,
    meeps: 0,
    meepChimeRequirement: MEEP_BASE_COST,
    chimesEarnedForLevel: 0,

    level: 1,

    skillPoints: 0,
    abilityLevels: [0, 0, 0, 0], // Q=CPS, W=Power, E=MeepCost, R=CPC

    activeAugments: [] as string[],
    pendingAugmentChoice: false,
    pendingAugmentOptions: [] as string[],
    pendingAugmentSelections: [] as Array<{ options: string[] }>,
    isGamePaused: false,

    pauseStats: {
      kills: 0,
      materialsEarned: {} as Record<string, number>,
    },

    currentUniverse: 1,
    prestigeAvailable: false,

    buildingProductionHistory: {} as BuildingProduction,
    totalBuildingProduction: {} as TotalBuildingProduction,

    // Modal state for UI effects
    isCPSModalOpen: false,
    isExpeditionModalOpen: false,
    isEncyclopediaOpen: false,

    activeExpedition: null as Expedition | null,

    isHyperspaceActive: false,
    showUniverseSelectModal: false,

    // ── Expedition Tracking ──────────────────────
    totalChimesEarned: 0,
    totalClicks: 0,

    // ── Offline Progress ──────────────────────────
    offlineChimes: 0,
    offlineSeconds: 0,
    showOfflineModal: false,
  }),
  actions: {
    // Adds a Meep when enough Chimes have been collected
    addMeep() {
      if (this.chimesForMeep >= this.meepChimeRequirement) {
        setTimeout(() => {
          this.meeps += 1
          const baseCost = Math.max(
            MEEP_BASE_COST,
            Math.ceil(MEEP_BASE_COST * Math.pow(this.meeps, MEEP_COST_EXPONENT)),
          )
          const meepCostMod = this.activeModifier.meepCostMultiplier ?? 1
          this.meepChimeRequirement = Math.ceil(
            baseCost * this.abilityMeepCostMultiplier * meepCostMod,
          )
          this.chimesForMeep = 0
        }, MEEP_ADD_DELAY_MS)
      }
    },

    // Adds Chimes and updates all dependent values
    addChime() {
      this.chimes += this.chimesPerClick
      this.chimesForMeep += this.chimesPerClick
      this.chimesForNextUniverse += this.chimesPerClick
      this.totalChimesEarned += this.chimesPerClick
      this.chimesEarnedForLevel += this.chimesPerClick
      this.totalClicks += 1
      this.calculateLevel()
      this.addMeep()
      this.checkPrestigeAvailability()
    },

    // Calculates the current level based on collected Chimes
    calculateLevel() {
      if (this.pendingAugmentChoice) return
      const exponent = this.activeModifier.levelExponent ?? LEVEL_EXPONENT
      // Resync chimesForNextLevel from formula — handles saves made before exponential scaling was added
      this.chimesForNextLevel = chimeThresholdForLevel(this.level, exponent)
      const spInterval = this.activeModifier.skillPointInterval ?? 2
      const oldLevel = this.level

      // Relative threshold: how many Chimes are needed for THIS level
      const chimesNeededThisLevel =
        this.chimesForNextLevel - chimeThresholdForLevel(this.level - 1, exponent)

      if (this.chimesEarnedForLevel >= chimesNeededThisLevel) {
        this.level++
        this.chimesForNextLevel = Math.ceil(LEVEL_BASE * Math.pow(this.level, exponent))
        // Transfer overflow into the new level (don't hard reset to 0!)
        this.chimesEarnedForLevel = Math.max(0, this.chimesEarnedForLevel - chimesNeededThisLevel)
        if (this.level % spInterval === 0) {
          this.skillPoints++
        }
        const augmentStore = useAugmentStore()
        augmentStore.onLevelUp(this.activeAugments)
        logger.info('Game', `Level up: ${oldLevel} -> ${this.level}`, {
          skillPoints: this.skillPoints,
        })
        this.triggerAugmentSelection()
      }
    },

    triggerAugmentSelection() {
      const remaining = [...AUGMENT_POOL]
      const picked: AugmentDefinition[] = []

      for (let i = 0; i < AUGMENT_CHOICE_COUNT && remaining.length > 0; i++) {
        const totalWeight = remaining.reduce(
          (sum, a) => sum + (RARITY_WEIGHTS[a.rarity as AugmentRarity] ?? RARITY_WEIGHT_FALLBACK),
          0,
        )
        let roll = Math.random() * totalWeight
        let chosen = remaining[remaining.length - 1]
        for (const aug of remaining) {
          roll -= RARITY_WEIGHTS[aug.rarity as AugmentRarity] ?? RARITY_WEIGHT_FALLBACK
          if (roll <= 0) {
            chosen = aug
            break
          }
        }
        picked.push(chosen)
        remaining.splice(remaining.indexOf(chosen), 1)
      }

      if (this.isGamePaused || this.pendingAugmentChoice) {
        this.pendingAugmentSelections.push({ options: picked.map((a) => a.id) })
      } else {
        this.pendingAugmentOptions = picked.map((a) => a.id)
        this.pendingAugmentChoice = true
      }
    },

    /** Admin: set the level directly — each gained level grants an augment
     *  selection like a real level-up (capped so huge jumps don't queue dozens). */
    adminSetLevel(newLevel: number) {
      const gained = newLevel - this.level
      this.level = newLevel
      if (gained <= 0) return
      const grants = Math.min(gained, ADMIN_LEVEL_AUGMENT_QUEUE_MAX)
      if (grants < gained) {
        logger.info('Game', `Admin level grant capped: ${gained} levels, ${grants} augment picks`)
      }
      const augmentStore = useAugmentStore()
      for (let i = 0; i < grants; i++) {
        augmentStore.onLevelUp(this.activeAugments)
        this.triggerAugmentSelection()
      }
    },

    _activateNextPendingSelection() {
      const next = this.pendingAugmentSelections.shift()
      if (next) {
        this.pendingAugmentOptions = next.options
        this.pendingAugmentChoice = true
      }
    },

    resetPauseStats() {
      this.pauseStats.kills = 0
      this.pauseStats.materialsEarned = {}
    },

    setPauseState(paused: boolean) {
      this.isGamePaused = paused
      if (paused) {
        this.resetPauseStats()
      } else {
        this._activateNextPendingSelection()
      }
    },

    chooseAugment(id: string) {
      if (!this.pendingAugmentOptions.includes(id)) return
      this.activeAugments.push(id)
      this.pendingAugmentChoice = false
      this.pendingAugmentOptions = []
      const augmentStore = useAugmentStore()
      augmentStore.registerAugment(id, this.activeAugments)
      logger.info('Game', `Augment chosen: ${id}`, { totalActive: this.activeAugments.length })
      const shopStore = useShopStore()
      this.chimesPerSecond = shopStore.calculateTotalCPS()
      this.chimesPerClick = shopStore.calculateTotalCPC()
      this._activateNextPendingSelection()
    },

    skipAllAugments() {
      if (this.pendingAugmentOptions.length > 0) {
        const firstId = this.pendingAugmentOptions[0]
        if (!this.activeAugments.includes(firstId)) {
          this.activeAugments.push(firstId)
        }
      }

      this.pendingAugmentChoice = false
      this.pendingAugmentOptions = []

      const exponent = this.activeModifier.levelExponent ?? LEVEL_EXPONENT
      const spInterval = this.activeModifier.skillPointInterval ?? 2

      let chimesNeededThisLevel =
        this.chimesForNextLevel - chimeThresholdForLevel(this.level - 1, exponent)

      while (this.chimesEarnedForLevel >= chimesNeededThisLevel) {
        this.level++
        this.chimesForNextLevel = Math.ceil(LEVEL_BASE * Math.pow(this.level, exponent))
        this.chimesEarnedForLevel = Math.max(0, this.chimesEarnedForLevel - chimesNeededThisLevel)
        // Calculate new threshold for the next level
        chimesNeededThisLevel =
          this.chimesForNextLevel - chimeThresholdForLevel(this.level - 1, exponent)

        if (this.level % spInterval === 0) {
          this.skillPoints++
        }

        this.triggerAugmentSelection()
        if (this.pendingAugmentOptions.length > 0) {
          const firstId = this.pendingAugmentOptions[0]
          if (!this.activeAugments.includes(firstId)) {
            this.activeAugments.push(firstId)
          }
        }
        this.pendingAugmentChoice = false
        this.pendingAugmentOptions = []
      }

      for (const pending of this.pendingAugmentSelections) {
        const id = pending.options[0]
        if (id && !this.activeAugments.includes(id)) {
          this.activeAugments.push(id)
        }
      }
      this.pendingAugmentSelections = []

      const shopStore = useShopStore()
      this.chimesPerSecond = shopStore.calculateTotalCPS()
      this.chimesPerClick = shopStore.calculateTotalCPC()
    },

    // Unlocks an ability with Meeps (one-time, sequentially)
    unlockSkillWithMeeps(index: number) {
      const maxLevel = this.activeModifier.maxAbilityLevel ?? MAX_ABILITY_LEVEL
      if (index > 0 && this.abilityLevels[index - 1] === 0) return
      const cost = SKILL_MEEP_COSTS[index]
      if (this.meeps >= cost && this.abilityLevels[index] === 0) {
        this.meeps -= cost
        this.abilityLevels[index] = maxLevel
        const shopStore = useShopStore()
        this.chimesPerSecond = shopStore.calculateTotalCPS()
        this.chimesPerClick = shopStore.calculateTotalCPC()
      }
    },

    // Increases an ability level when skill points are available
    upgradeAbility(index: number) {
      const maxLevel = this.activeModifier.maxAbilityLevel ?? MAX_ABILITY_LEVEL
      if (this.skillPoints > 0 && this.abilityLevels[index] < maxLevel) {
        this.abilityLevels[index]++
        this.skillPoints--
        const shopStore = useShopStore()
        this.chimesPerSecond = shopStore.calculateTotalCPS()
        this.chimesPerClick = shopStore.calculateTotalCPC()
      }
    },

    trackBuildingProduction() {
      const shopStore = useShopStore()

      shopStore.shopUpgrades.forEach((upgrade: ShopUpgrade) => {
        if (upgrade.baseCPS && upgrade.level > 0) {
          const production = (upgrade.baseCPS || 0) * upgrade.level

          if (!this.buildingProductionHistory[upgrade.id]) {
            this.buildingProductionHistory[upgrade.id] = []
            this.totalBuildingProduction[upgrade.id] = 0
          }

          this.buildingProductionHistory[upgrade.id].push(production)
          this.totalBuildingProduction[upgrade.id] += production

          if (this.buildingProductionHistory[upgrade.id].length > BUILDING_HISTORY_BUFFER_SIZE) {
            this.buildingProductionHistory[upgrade.id].shift()
          }
        }
      })
    },

    // Checks if Prestige is available
    checkPrestigeAvailability() {
      if (
        !this.prestigeAvailable &&
        this.chimesForNextUniverse >= this.chimesToUniverseRescue &&
        this.currentUniverse < this.totalUniverses
      ) {
        this.prestigeAvailable = true
      }
    },

    // Executes the actual Prestige reset
    executePrestigeReset(targetUniverse?: number) {
      const nextUniverse = targetUniverse ?? this.currentUniverse + 1
      logger.info('Game', `Prestige reset -> Universe ${nextUniverse}`)
      this.currentUniverse = nextUniverse
      this.chimesToUniverseRescue = Math.ceil(this.chimesToUniverseRescue * UNIVERSE_RESCUE_COST_MULTIPLIER)
      this.chimesForNextUniverse = 0
      this.prestigeAvailable = false
      this.chimes = 0
      this.chimesForMeep = 0
      this.level = 1
      this.chimesForNextLevel = LEVEL_BASE
      this.chimesEarnedForLevel = 0
      this.meeps = 0
      this.meepChimeRequirement = MEEP_BASE_COST
      this.skillPoints = 0
      this.abilityLevels = [0, 0, 0, 0]
      this.activeAugments = []
      this.pendingAugmentChoice = false
      this.pendingAugmentOptions = []
      this.pendingAugmentSelections = []
      this.isGamePaused = false
      this.buildingProductionHistory = {}
      this.totalBuildingProduction = {}
      // totalChimesEarned & totalClicks persist across prestiges
      const augmentStore = useAugmentStore()
      augmentStore.$reset()
      const shopStore = useShopStore()
      shopStore.shopUpgrades.forEach((u) => {
        u.level = 0
      })
      this.chimesPerSecond = shopStore.calculateTotalCPS()
      this.chimesPerClick = shopStore.calculateTotalCPC()
    },

    // Opens the Universe selection modal
    openPrestigeModal() {
      if (!this.prestigeAvailable || this.currentUniverse >= this.totalUniverses) return
      if (this.isHyperspaceActive) return
      this.showUniverseSelectModal = true
    },

    // Closes the Universe selection modal
    closePrestigeModal() {
      this.showUniverseSelectModal = false
    },

    // Selects a universe and starts the Hyperspace animation + reset
    selectPrestigeUniverse(targetUniverse: number) {
      if (targetUniverse === this.currentUniverse) return
      if (this.isHyperspaceActive) return

      this.showUniverseSelectModal = false

      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        this.executePrestigeReset(targetUniverse)
        return
      }

      this.isHyperspaceActive = true
      setTimeout(() => {
        this.executePrestigeReset(targetUniverse)
      }, HYPERSPACE_ANIM_START_MS)
      setTimeout(() => {
        this.isHyperspaceActive = false
      }, HYPERSPACE_ANIM_END_MS)
    },

    // Processes passive income per second
    tick() {
      this.inGameTime++
      const cps = this.chimesPerSecond
      if (cps > 0) {
        this.chimes += cps
        this.chimesForMeep += cps
        this.chimesForNextUniverse += cps
        this.totalChimesEarned += cps
        this.chimesEarnedForLevel += cps
        this.calculateLevel()
        this.addMeep()
        this.trackBuildingProduction()
      }
      this.checkPrestigeAvailability()
      const planetEventStore = usePlanetEventStore()
      planetEventStore.checkAndMaybeSpawnEvent()
      const galaxyStore = useGalaxyStore()
      galaxyStore.tickBossSearch(GAME_TICK_INTERVAL_MS)
      galaxyStore.tickResourceStar(GAME_TICK_INTERVAL_MS)
      const starGroupStore = useStarGroupStore()
      starGroupStore.tickChampionStar()
      const roleBehaviorStore = useRoleBehaviorStore()
      roleBehaviorStore.tick()
      const planetBossStore = usePlanetBossStore()
      if (planetBossStore.isBossActive) {
        planetBossStore.applyPassiveDamage()
      }
      if (planetBossStore.cpsPenaltyActive && Date.now() >= planetBossStore.cpsPenaltyExpiresAt) {
        planetBossStore.clearPenalty()
      }
      const expeditionStore = useExpeditionStore()
      expeditionStore.checkExpeditions()
      expeditionStore.checkAvailability()
      const augmentStore = useAugmentStore()
      augmentStore.onTick()
      const planetShopStore = usePlanetShopStore()
      // turret_planet: automatic damage to active Boss
      const autoAttackDPS = planetShopStore.autoAttackDPS
      if (autoAttackDPS > 0 && planetBossStore.isBossActive) {
        planetBossStore.dealDamage(autoAttackDPS)
      }
      // harvest_node: periodic material harvest
      planetShopStore.tickHarvest(this.inGameTime)
      const combatStore = useCombatStore()
      combatStore.tick()
      const playerStore = usePlayerStore()
      playerStore.regenTick()
    },

    // Credits offline Chimes and closes the modal
    claimOfflineReward(multiplier: 1 | 2 = 1) {
      const earned = this.offlineChimes * multiplier
      this.chimes += earned
      this.totalChimesEarned += earned
      this.chimesEarnedForLevel += earned
      this.offlineChimes = 0
      this.offlineSeconds = 0
      this.showOfflineModal = false
      this.calculateLevel()
    },

    // Sets the modal state for UI effects
    setCPSModalOpen(isOpen: boolean) {
      this.isCPSModalOpen = isOpen
    },

    setExpeditionModalOpen(isOpen: boolean) {
      this.isExpeditionModalOpen = isOpen
    },

    toggleEncyclopedia() {
      this.isEncyclopediaOpen = !this.isEncyclopediaOpen
    },

    // Sends Meeps on a portal expedition
    startExpedition(
      universeId: number,
      universeName: string,
      meepsSent: number,
      durationMs: number,
      reward: number,
    ) {
      if (this.activeExpedition || meepsSent < 1 || meepsSent > this.meeps) return
      this.meeps -= meepsSent
      this.activeExpedition = {
        universeId,
        universeName,
        meepsSent,
        startTime: Date.now(),
        durationMs,
        reward,
        collected: false,
      }
      logger.info('Game', `Expedition started: ${universeName}`, { meepsSent, durationMs, reward })
    },

    // Collects a completed expedition
    collectExpedition() {
      if (!this.activeExpedition) return
      if (Date.now() < this.activeExpedition.startTime + this.activeExpedition.durationMs) return
      const { reward, meepsSent } = this.activeExpedition
      this.chimes += reward
      this.chimesEarnedForLevel += reward
      this.meeps += meepsSent
      logger.info('Game', `Expedition collected: +${reward} chimes, ${meepsSent} meeps returned`)
      this.activeExpedition = null
      this.calculateLevel()
    },
  },

  getters: {
    combinedAugmentEffects(): AugmentEffects {
      const result: AugmentEffects = {}
      const additiveKeys: (keyof AugmentEffects)[] = [
        'abilityPowerPerLevel',
        'enemyMaxHPDrainPerSecond',
      ]
      for (const id of this.activeAugments) {
        const aug = AUGMENTS.find((a) => a.id === id)
        if (!aug) continue
        for (const [key, val] of Object.entries(aug.effects)) {
          const k = key as keyof AugmentEffects
          if (additiveKeys.includes(k)) {
            ;(result as Record<string, number>)[k] =
              ((result[k] as number | undefined) ?? 0) + (val as number)
          } else {
            ;(result as Record<string, number>)[k] =
              ((result[k] as number | undefined) ?? 1) * (val as number)
          }
        }
      }
      const augmentStore = useAugmentStore()
      const ksm = augmentStore.keyboardSmashModifiers
      for (const [key, val] of Object.entries(ksm)) {
        const k = key as keyof AugmentEffects
        ;(result as Record<string, number>)[k] =
          ((result[k] as number | undefined) ?? 1) * (val as number)
      }
      return result
    },

    activeModifier(): ModifierEffects {
      const base = universes[this.currentUniverse - 1]?.modifier?.effects ?? {}
      const aug = this.combinedAugmentEffects
      return {
        cpsMultiplier: (base.cpsMultiplier ?? 1) * (aug.cpsMultiplier ?? 1),
        cpcMultiplier: (base.cpcMultiplier ?? 1) * (aug.cpcMultiplier ?? 1),
        buildingCostMultiplier:
          (base.buildingCostMultiplier ?? 1) * (aug.buildingCostMultiplier ?? 1),
        meepCostMultiplier: (base.meepCostMultiplier ?? 1) * (aug.meepCostMultiplier ?? 1),
        meepPowerMultiplier: (base.meepPowerMultiplier ?? 1) * (aug.meepPowerMultiplier ?? 1),
        expeditionRewardMultiplier:
          (base.expeditionRewardMultiplier ?? 1) * (aug.expeditionRewardMultiplier ?? 1),
        levelExponent: base.levelExponent,
        maxAbilityLevel: base.maxAbilityLevel,
        skillPointInterval: base.skillPointInterval,
        baseChimesPerClick: base.baseChimesPerClick,
        eloPowerMultiplier: base.eloPowerMultiplier,
        buildingMultipliers: base.buildingMultipliers,
        abilityCPSPerLevel: base.abilityCPSPerLevel,
        abilityCPCPerLevel: base.abilityCPCPerLevel,
        abilityMeepCostPerLevel: base.abilityMeepCostPerLevel,
        abilityPowerPerLevel: (base.abilityPowerPerLevel ?? ABILITY_POWER_PER_LEVEL_DEFAULT) + (aug.abilityPowerPerLevel ?? 0),
        cooldownMultiplier: aug.cooldownMultiplier,
        enemySpeedMultiplier: aug.enemySpeedMultiplier,
        enemyMaxHPDrainPerSecond: aug.enemyMaxHPDrainPerSecond,
      }
    },

    chimesToNextLevel(): number {
      return this.chimesForNextLevel - this.chimes
    },

    chimesAtLevelStart(): number {
      const exponent = this.activeModifier.levelExponent ?? LEVEL_EXPONENT
      return chimeThresholdForLevel(this.level - 1, exponent)
    },

    currentLevelChimes(): number {
      return this.chimesEarnedForLevel
    },

    totalChimesThisLevel(): number {
      return this.chimesForNextLevel - this.chimesAtLevelStart
    },

    levelProgress(): number {
      return clampPercent((this.currentLevelChimes / this.totalChimesThisLevel) * 100)
    },

    totalPower(): number {
      const meepPowerMod = this.activeModifier.meepPowerMultiplier ?? 1
      const eloPowerMod = this.activeModifier.eloPowerMultiplier ?? 1
      const itemPowerMul = useItemStore().totalPowerMultiplier
      const synergyPowerMul = useSynergyStore().powerSynergyMultiplier
      return Math.floor(
        (this.meeps * MEEP_POWER_MULTIPLIER * meepPowerMod + this.abilityPowerBonus) *
          eloPowerMod *
          itemPowerMul *
          synergyPowerMul,
      )
    },

    abilityCPSMultiplier(): number {
      const perLevel = this.activeModifier.abilityCPSPerLevel ?? ABILITY_CPS_PER_LEVEL_DEFAULT
      return 1 + this.abilityLevels[0] * perLevel
    },
    abilityPowerBonus(): number {
      const perLevel = this.activeModifier.abilityPowerPerLevel ?? ABILITY_POWER_PER_LEVEL_DEFAULT
      return this.abilityLevels[1] * perLevel
    },
    abilityMeepCostMultiplier(): number {
      const perLevel = this.activeModifier.abilityMeepCostPerLevel ?? ABILITY_MEEP_COST_PER_LEVEL_DEFAULT
      return Math.max(ABILITY_MEEP_COST_MIN_MULTIPLIER, 1 - this.abilityLevels[2] * perLevel)
    },
    abilityCPCMultiplier(): number {
      const perLevel = this.activeModifier.abilityCPCPerLevel ?? ABILITY_CPC_PER_LEVEL_DEFAULT
      return 1 + this.abilityLevels[3] * perLevel
    },

    universeRescueProgress(): number {
      return clampPercent((this.chimesForNextUniverse / this.chimesToUniverseRescue) * 100)
    },

    totalUniverses(): number {
      return universes.length
    },

    dmgPerClick(): number {
      return Math.max(1, this.chimesPerClick)
    },
    dmgPerSecond(): number {
      return Math.max(0, Math.floor(this.chimesPerSecond * BOSS_PASSIVE_DPS_FRACTION))
    },

    isExpeditionComplete(): boolean {
      if (!this.activeExpedition) return false
      return Date.now() >= this.activeExpedition.startTime + this.activeExpedition.durationMs
    },

    expeditionProgress(): number {
      if (!this.activeExpedition) return 0
      const elapsed = Date.now() - this.activeExpedition.startTime
      return clampPercent((elapsed / this.activeExpedition.durationMs) * 100)
    },
  },
})
