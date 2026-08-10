import { defineStore } from 'pinia'
import { useShopStore } from '@/stores/economy/shopStore'
import { useItemStore } from '@/stores/economy/itemStore'
import { useSynergyStore } from '@/stores/champions/synergyStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useCombatStore } from '@/stores/battle/combatStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useRoleBehaviorStore } from '@/stores/battle/roleBehaviorStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { universes } from '@/config/progression/universes'
import { clampPercent } from '@/utils/orbit/geometry'
import { bossPlanetInForeground } from '@/utils/orbit/foregroundGate'
import { AUGMENTS, AUGMENT_POOL, RARITY_WEIGHTS } from '@/config/economy/augments'
import { logAugmentAutoPicked } from '@/config/ui/eventLog'
import { useAugmentStore } from '@/stores/economy/augmentStore'
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
  TURRET_PROJECTILE_FLIGHT_MS,
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
  HONOR_MVP_BUFF_DURATION_S,
  HONOR_MVP_BUFF_MULT,
  UNIVERSE_RUN_HISTORY_LIMIT,
} from '@/config/constants'
import type {
  UniverseRunBaseline,
  UniverseRunRecord,
  UniverseRunStats,
  BuildingProduction,
  TotalBuildingProduction,
  ShopUpgrade,
  Expedition,
  ModifierEffects,
  AugmentEffects,
  AugmentDefinition,
  AugmentRarity,
} from '@/types'
import { logger } from '@/utils/logger'

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
    /** Seconds left on the MVP honor buff (2× chimes per second and per click) */
    mvpBuffSecondsLeft: 0,
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
    /** Solange aktiv, wählt jedes Level-Up selbst eines der drei Augments. */
    autoPickAugments: false,
    /** Letzte automatische Wahl — `seq` zählt hoch, damit die Anzeige auch dann
     *  wieder auslöst, wenn zweimal hintereinander dasselbe Augment fällt. */
    lastAutoPick: { id: '', at: 0, seq: 0 },
    isGamePaused: false,

    pauseStats: {
      /** Besiegte Bosse insgesamt — Summe der drei Kategorien darunter. */
      kills: 0,
      /** Reguläre Planeten, die während der Pause gefallen sind. */
      planetsCleared: 0,
      /** Sterne, deren Planeten während der Pause vollständig befreit wurden. */
      starsRescued: 0,
      /** Galaxieboss-Planeten — die seltenen, dicken Brocken. */
      galaxyBossesFelled: 0,
      materialsEarned: {} as Record<string, number>,
      battleWins: 0,
      battleLosses: 0,
      battleChimes: 0,
      battleLp: 0,
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

    // ── Lifetime counters (Bard Stats catalog) ────
    /** Meeps ever guided in — never decreases when meeps are spent. */
    totalMeepsEarned: 0,
    /** Meeps ever spent on abilities / universe expeditions. */
    totalMeepsSpent: 0,
    /** Completed prestige resets (universe hops). */
    totalPrestiges: 0,
    /** Chimes ever granted by offline progress, and the seconds behind them. */
    totalOfflineChimes: 0,
    totalOfflineSeconds: 0,

    // ── Universe run (header universe tooltip) ────
    /** Zählerstände beim Betreten des aktuellen Universums — siehe
     *  `beginUniverseRun()`. Alle Nullen sind für ein frisches Spiel korrekt. */
    universeRun: {
      startedAtInGameTime: 0,
      starsRescued: 0,
      starsLost: 0,
      galaxiesFreed: 0,
      planetsCleared: 0,
      bossesFelled: 0,
      meepsEarned: 0,
      materialsGathered: 0,
      clicks: 0,
    } as UniverseRunBaseline,
    /** Abgeschlossene Durchläufe, jüngster zuletzt (gekappt). */
    universeRuns: [] as UniverseRunRecord[],
  }),
  actions: {
    // Adds a Meep when enough Chimes have been collected
    addMeep() {
      if (this.chimesForMeep >= this.meepChimeRequirement) {
        setTimeout(() => {
          this.meeps += 1
          this.totalMeepsEarned += 1
          const baseCost = Math.max(
            MEEP_BASE_COST,
            Math.ceil(MEEP_BASE_COST * Math.pow(this.meeps, MEEP_COST_EXPONENT)),
          )
          const meepCostMod = this.activeModifier.meepCostMultiplier ?? 1
          const treeCostMod = useMeepTreeStore().fx.meepCostMult
          this.meepChimeRequirement = Math.ceil(
            baseCost * this.abilityMeepCostMultiplier * meepCostMod * treeCostMod,
          )
          this.chimesForMeep = 0
        }, MEEP_ADD_DELAY_MS)
      }
    },

    /** Grants (or refreshes) the MVP honor buff — 2× chime production for a short window. */
    activateMvpBuff() {
      this.mvpBuffSecondsLeft = HONOR_MVP_BUFF_DURATION_S
    },

    // Adds Chimes and updates all dependent values
    addChime() {
      // Golden Echo (Star Forge) + Twin Echo (Meep Tree): chance that a click counts twice
      const doubleChance =
        useStarForgeStore().doubleClickChance + useMeepTreeStore().fx.doubleClickChance
      const doubled = Math.random() < doubleChance
      const clickValue = this.chimesPerClick * this.mvpBuffMultiplier
      const gain = doubled ? clickValue * 2 : clickValue
      this.chimes += gain
      this.chimesForMeep += gain
      this.chimesForNextUniverse += gain
      this.totalChimesEarned += gain
      this.chimesEarnedForLevel += gain
      this.totalClicks += 1
      // Traveler's Call (bard passive): the click builds resonance and takes a
      // slice off every running ability cooldown.
      useBardAbilityStore().registerClick()
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

      // Auto-Pick greift vor allem anderen: kein Modal, keine Warteschlange —
      // eines der drei wird sofort gezogen und übernommen.
      if (this.autoPickAugments) {
        this._autoPick(picked.map((a) => a.id))
        return
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
      if (this.autoPickAugments) {
        this._drainAugmentQueue()
        return
      }
      const next = this.pendingAugmentSelections.shift()
      if (next) {
        this.pendingAugmentOptions = next.options
        this.pendingAugmentChoice = true
      }
    },

    resetPauseStats() {
      this.pauseStats.kills = 0
      this.pauseStats.planetsCleared = 0
      this.pauseStats.starsRescued = 0
      this.pauseStats.galaxyBossesFelled = 0
      this.pauseStats.materialsEarned = {}
      this.pauseStats.battleWins = 0
      this.pauseStats.battleLosses = 0
      this.pauseStats.battleChimes = 0
      this.pauseStats.battleLp = 0
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
      this._commitAugment(id)
      this._activateNextPendingSelection()
    },

    /** Gemeinsamer Kern von Hand- und Auto-Wahl: übernehmen, registrieren, CPS/CPC neu. */
    _commitAugment(id: string) {
      this.activeAugments.push(id)
      this.pendingAugmentChoice = false
      this.pendingAugmentOptions = []
      const augmentStore = useAugmentStore()
      augmentStore.registerAugment(id, this.activeAugments)
      logger.info('Game', `Augment chosen: ${id}`, { totalActive: this.activeAugments.length })
      const shopStore = useShopStore()
      this.chimesPerSecond = shopStore.calculateTotalCPS()
      this.chimesPerClick = shopStore.calculateTotalCPC()
    },

    /**
     * Auto-Pick an/aus. Beim Einschalten wird eine bereits offene Auswahl sofort
     * mit aufgelöst — sonst bliebe genau das Modal stehen, das der Spieler
     * gerade loswerden wollte.
     */
    setAutoPickAugments(on: boolean) {
      this.autoPickAugments = on
      logger.info('Game', `Auto-pick augments: ${on ? 'on' : 'off'}`)
      if (!on) return
      if (this.pendingAugmentChoice && this.pendingAugmentOptions.length > 0) {
        this._autoPick(this.pendingAugmentOptions)
      }
      this._drainAugmentQueue()
    },

    /**
     * Zieht zufällig eines der angebotenen Augments, übernimmt es und meldet es
     * über `lastAutoPick` nach außen (Toast + Eventlog lesen das).
     */
    _autoPick(options: string[]) {
      if (options.length === 0) return
      const id = options[Math.floor(Math.random() * options.length)]
      this._commitAugment(id)
      this.lastAutoPick = { id, at: Date.now(), seq: this.lastAutoPick.seq + 1 }
      const aug = AUGMENTS.find((a) => a.id === id)
      if (aug) logAugmentAutoPicked(aug.name, aug.effectLine)
    },

    /** Arbeitet aufgestaute Auswahlen ab, solange Auto-Pick läuft. */
    _drainAugmentQueue() {
      while (this.autoPickAugments && this.pendingAugmentSelections.length > 0) {
        const next = this.pendingAugmentSelections.shift()
        if (next) this._autoPick(next.options)
      }
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
        this.totalMeepsSpent += cost
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

    /**
     * Checks if Prestige is available.
     *
     * Die Schranke ist „es gibt ein ANDERES Universum", nicht „es gibt ein
     * höheres". Vorher stand hier `currentUniverse < totalUniverses`, und damit
     * war das letzte Universum eine Sackgasse: wer es wählte, konnte nie wieder
     * prestigen, obwohl `selectPrestigeUniverse` jedes andere Ziel längst
     * zuliess. Die Universen sind keine Leiter, sondern eine Auswahl — und seit
     * der Vorsehung gibt es einen Grund, dasselbe Universum ein zweites Mal zu
     * bereisen: gleiche Wirtschaft, anderer Kosmos.
     */
    checkPrestigeAvailability() {
      if (
        !this.prestigeAvailable &&
        this.chimesForNextUniverse >= this.chimesToUniverseRescue &&
        this.totalUniverses > 1
      ) {
        this.prestigeAvailable = true
      }
    },

    /**
     * Hält die Lebenszeit-Zähler fest, mit denen das aktuelle Universum
     * betreten wurde.
     *
     * Jeder „in diesem Universum"-Wert im Header-Tooltip ist eine Differenz
     * gegen diesen Stand. Das ist der Grund, warum kein einziger Store einen
     * zweiten, parallel gepflegten Zähler braucht, der beim Prestige mit
     * zurückgesetzt werden müsste — und warum ein neuer Wert im Tooltip nur
     * hier eine Zeile kostet, nicht im halben Projekt.
     */
    beginUniverseRun() {
      const galaxyStore = useGalaxyStore()
      const starGroupStore = useStarGroupStore()
      const planetBossStore = usePlanetBossStore()
      this.universeRun = {
        startedAtInGameTime: this.inGameTime,
        starsRescued: galaxyStore.totalStarsRescued,
        starsLost: galaxyStore.totalStarsLost,
        galaxiesFreed: galaxyStore.totalGalaxyBossesDefeated,
        planetsCleared: starGroupStore.totalPlanetsCleared,
        bossesFelled: planetBossStore.totalBossesDefeated,
        meepsEarned: this.totalMeepsEarned,
        materialsGathered: useInventoryStore().totalMaterialsCollected,
        clicks: this.totalClicks,
      }
    },

    /** Legt den laufenden Durchlauf ins Archiv — direkt vor dem Prestige-Reset,
     *  solange die Zähler des alten Universums noch stehen. */
    finishUniverseRun() {
      const stats = this.universeRunStats
      this.universeRuns.push({
        universe: this.currentUniverse,
        durationSeconds: stats.playedSeconds,
        starsRescued: stats.starsRescued,
        galaxiesFreed: stats.galaxiesFreed,
        chimes: this.chimesForNextUniverse,
        completedAt: Date.now(),
      })
      const overflow = this.universeRuns.length - UNIVERSE_RUN_HISTORY_LIMIT
      if (overflow > 0) this.universeRuns.splice(0, overflow)
    },

    // Executes the actual Prestige reset
    executePrestigeReset(targetUniverse?: number) {
      const nextUniverse = targetUniverse ?? this.currentUniverse + 1
      logger.info('Game', `Prestige reset -> Universe ${nextUniverse}`)
      // Vor jeder Mutation: der Datensatz beschreibt das Universum, das gerade
      // verlassen wird, und liest dafür dessen noch unveränderte Zähler.
      this.finishUniverseRun()
      this.currentUniverse = nextUniverse
      this.totalPrestiges += 1
      this.chimesToUniverseRescue = Math.ceil(
        this.chimesToUniverseRescue * UNIVERSE_RESCUE_COST_MULTIPLIER,
      )
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
      useMeepTreeStore().resetTree()
      const augmentStore = useAugmentStore()
      augmentStore.$reset()
      const shopStore = useShopStore()
      shopStore.shopUpgrades.forEach((u) => {
        u.level = 0
      })
      this.chimesPerSecond = shopStore.calculateTotalCPS()
      this.chimesPerClick = shopStore.calculateTotalCPC()
      // Neue Basislinie: ab hier zählt der Tooltip wieder bei null.
      this.beginUniverseRun()
    },

    // Opens the Universe selection modal
    openPrestigeModal() {
      if (!this.prestigeAvailable || this.totalUniverses <= 1) return
      if (this.isHyperspaceActive) return
      // Das Angebot wird EINMAL beim Öffnen gezogen, nicht beim Rendern der
      // Karten: sonst würfelte jedes Re-Render neue Karten unter dem Cursor des
      // Spielers. Das laufende Universum kommt nicht ins Angebot.
      useProvidenceStore().rollOffer(this.currentUniverse)
      this.showUniverseSelectModal = true
    },

    // Closes the Universe selection modal
    closePrestigeModal() {
      this.showUniverseSelectModal = false
      // Nur das Angebot verwerfen — die laufende Vorsehung bleibt. Ein
      // abgebrochenes Prestige darf den Spieler nicht ohne sie zurücklassen.
      useProvidenceStore().clearOffer()
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
      useSolarUpgradeStore().tickDwell()
      useStarForgeStore().tick()
      // Drifters: expire finished buffs, drop objects that flew past uncollected
      // and roll for the next spawn. Runs before production so a buff that ends
      // this second is already gone when the chimes below are credited.
      useDrifterStore().tick()
      // Bard abilities: expire the shrine/journey windows and carry a running
      // stasis forward. Same reasoning as the drifters above — a window that
      // closes this second must be gone before the chimes are credited.
      useBardAbilityStore().tick()
      // The Void: put the orbit's fire on the open rift, collapse it if its
      // time ran out, and roll for the next one. Runs here — after the stasis
      // above, before production below — for two reasons: a stasis started this
      // second must already hold the rift's clock, and the rift's drain has to
      // be on the books before the chimes are credited. Its own drain moves
      // every tick with the ramp, so it refreshes the cached rates itself.
      useVoidStore().tick()
      // Material intake window: slide the minute buckets forward even in a
      // minute where nothing dropped, so the header sparkline shows the gap
      // instead of an hour-old spike frozen at the right edge.
      useInventoryStore().advanceRateWindow()
      const cps = this.chimesPerSecond * this.mvpBuffMultiplier
      if (this.mvpBuffSecondsLeft > 0) this.mvpBuffSecondsLeft--
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
      // Auto level-up runs AFTER production so the chimes earned this second are
      // already on the balance it pays from. Returns immediately while the
      // switch is off, which is the default.
      useChampionLevelStore().autoLevelTick()
      // Boss-Enrage und Champion-Reise. Beides lief bis hierher über einen
      // planetEventStore, der nichts anderes tat, als die zwei Aufrufe
      // weiterzureichen — Reihenfolge unverändert.
      const planetBossStore = usePlanetBossStore()
      const galaxyStore = useGalaxyStore()
      if (planetBossStore.isBossActive) {
        planetBossStore.checkEnrage()
      }
      galaxyStore.tickChampionTravel()
      const starGroupStore = useStarGroupStore()
      // Zufällig gestaffelte Resource-Star-Spawns; spawnResourceStar respektiert
      // das Concurrency-Limit selbst. Läuft auch während Pause weiter, damit
      // Sterne im Pause-Overlay erscheinen, bekämpft werden und despawnen.
      if (galaxyStore.tickResourceStar(GAME_TICK_INTERVAL_MS)) {
        starGroupStore.spawnResourceStar()
      }
      starGroupStore.tickResourceStars()
      starGroupStore.tickChampionStar()
      const roleBehaviorStore = useRoleBehaviorStore()
      roleBehaviorStore.tick()
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
      // turret_planet: automatic damage to active Boss — die Salve zählt den
      // geteilten Volley-Counter hoch (treibt Idle-Orbit-Schüsse + Star-Fight-
      // Planet-Battery), der Schaden landet erst beim Projektil-Einschlag.
      // Vordergrund-Gate: nur sichtbare Turrets feuern, und ein Boss hinter
      // der Sonne wird nicht beschossen (Salve setzt dann einen Takt aus)
      const autoAttackDPS = planetShopStore.foregroundAutoAttackDPS
      if (autoAttackDPS > 0 && planetBossStore.isBossActive) {
        const target = planetBossStore.activeBoss
        if (
          target &&
          !target.defeated &&
          !target.expired &&
          bossPlanetInForeground(target.planetId)
        ) {
          planetBossStore.turretVolleyCounter++
          setTimeout(() => {
            if (target.defeated || target.expired) return
            planetBossStore.dealDamageToBoss(target, autoAttackDPS)
          }, TURRET_PROJECTILE_FLIGHT_MS)
        }
      }
      // Zerstörte Planeten nach Ablauf ihrer Ausfallzeit zurückholen
      planetShopStore.tickRespawn()
      // harvest_node: periodic material harvest
      planetShopStore.tickHarvest(this.inGameTime)
      const combatStore = useCombatStore()
      combatStore.tick()
      const playerStore = usePlayerStore()
      playerStore.regenTick()
      // Skill-tree notifications: drop stale acknowledgements so a node that
      // became unaffordable re-notifies once the player can afford it again.
      useMeepTreeStore().syncAcknowledged()
      // Omens directly before the chronicle, for the same reason and with the
      // same requirement: the running omen measures a DIFFERENCE against the
      // counters above, so it has to see them at their final value for this
      // second. Its own payout is a timed buff, which the chronicle does not
      // read — the order between these two is therefore free.
      useOmenStore().tick()
      // Chronicle last: every counter this second feeds it (chimes above,
      // bosses, stars, drifters), so a milestone announced here is one that was
      // just earned — not one from the previous tick.
      useAchievementStore().tick()
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

    /**
     * Die Effekte, unter denen dieser Durchlauf steht — Vorsehung mal Augments.
     *
     * Die Basis kam früher aus `universes[…].modifier`, also fest aus dem
     * Katalog. Seit Universum und Vorsehung beim Prestige ZUSAMMEN gezogen
     * werden, liefert die gewählte Vorsehung sie; das Universum trägt nur noch
     * Name und Wappen. Alle Lesestellen dieses Getters blieben dabei unverändert
     * — genau dafür ist er die eine Stelle, an der die Quelle steht.
     */
    activeModifier(): ModifierEffects {
      const base = useProvidenceStore().activeEffects
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
        abilityPowerPerLevel:
          (base.abilityPowerPerLevel ?? ABILITY_POWER_PER_LEVEL_DEFAULT) +
          (aug.abilityPowerPerLevel ?? 0),
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
      // VITALITY across the slotted main champions — champion levels tilt the
      // auto battle, not just planet boss damage.
      const championVitalityMul = useChampionLevelStore().teamVitalityMult
      const tree = useMeepTreeStore().fx
      return Math.floor(
        (this.meeps * MEEP_POWER_MULTIPLIER * meepPowerMod * tree.meepPowerMult +
          this.abilityPowerBonus +
          tree.powerBonus) *
          eloPowerMod *
          itemPowerMul *
          synergyPowerMul *
          championVitalityMul,
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
      const perLevel =
        this.activeModifier.abilityMeepCostPerLevel ?? ABILITY_MEEP_COST_PER_LEVEL_DEFAULT
      return Math.max(ABILITY_MEEP_COST_MIN_MULTIPLIER, 1 - this.abilityLevels[2] * perLevel)
    },
    abilityCPCMultiplier(): number {
      const perLevel = this.activeModifier.abilityCPCPerLevel ?? ABILITY_CPC_PER_LEVEL_DEFAULT
      return 1 + this.abilityLevels[3] * perLevel
    },

    /** 2× while the MVP honor buff runs, otherwise 1. */
    mvpBuffMultiplier(): number {
      return this.mvpBuffSecondsLeft > 0 ? HONOR_MVP_BUFF_MULT : 1
    },

    universeRescueProgress(): number {
      return clampPercent((this.chimesForNextUniverse / this.chimesToUniverseRescue) * 100)
    },

    totalUniverses(): number {
      return universes.length
    },

    /** Was in diesem Universum passiert ist — Differenz gegen `universeRun`. */
    universeRunStats(): UniverseRunStats {
      const base = this.universeRun
      const galaxyStore = useGalaxyStore()
      const starGroupStore = useStarGroupStore()
      const planetBossStore = usePlanetBossStore()
      // Nie negativ: ein Speicherstand, dessen Basislinie beim Laden aus den
      // aktuellen Ständen gesetzt wurde, darf höchstens bei null anfangen.
      const since = (current: number, start: number) => Math.max(0, current - start)
      return {
        playedSeconds: since(this.inGameTime, base.startedAtInGameTime),
        starsRescued: since(galaxyStore.totalStarsRescued, base.starsRescued),
        starsLost: since(galaxyStore.totalStarsLost, base.starsLost),
        galaxiesFreed: since(galaxyStore.totalGalaxyBossesDefeated, base.galaxiesFreed),
        planetsCleared: since(starGroupStore.totalPlanetsCleared, base.planetsCleared),
        bossesFelled: since(planetBossStore.totalBossesDefeated, base.bossesFelled),
        meepsEarned: since(this.totalMeepsEarned, base.meepsEarned),
        materialsGathered: since(
          useInventoryStore().totalMaterialsCollected,
          base.materialsGathered,
        ),
        clicks: since(this.totalClicks, base.clicks),
      }
    },

    /** Chimes, die der Rettung dieses Universums noch fehlen. */
    universeRescueRemaining(): number {
      return Math.max(0, this.chimesToUniverseRescue - this.chimesForNextUniverse)
    },

    /**
     * Sekunden bis zur Rettung beim aktuellen Sekundenertrag — 0 wenn erreicht,
     * `Infinity` wenn nichts produziert wird.
     *
     * Bewusst nur die passive Produktion: Klicks, Bossbeute und Battle-Chimes
     * zahlen ebenfalls ein, lassen sich aber nicht vorhersagen. Die Schätzung
     * ist damit die Obergrenze, nicht der Erwartungswert.
     */
    universeRescueEtaSeconds(): number {
      if (this.universeRescueRemaining <= 0) return 0
      const rate = this.chimesPerSecond * this.mvpBuffMultiplier
      return rate > 0 ? this.universeRescueRemaining / rate : Infinity
    },

    /** Was das nächste Universum kosten wird — die Kurve hinter dem Balken. */
    nextUniverseRescueCost(): number {
      return Math.ceil(this.chimesToUniverseRescue * UNIVERSE_RESCUE_COST_MULTIPLIER)
    },

    /** Schnellster archivierter Durchlauf in Sekunden; 0 solange keiner steht. */
    fastestUniverseRunSeconds(): number {
      if (this.universeRuns.length === 0) return 0
      // Die Liste ist auf UNIVERSE_RUN_HISTORY_LIMIT gekappt — spread ist hier
      // eine Handvoll Werte, keine offene Liste.
      return Math.min(...this.universeRuns.map((run) => run.durationSeconds))
    },

    /** Dauer des zuletzt geretteten Universums in Sekunden; 0 solange keines. */
    lastUniverseRunSeconds(): number {
      return this.universeRuns[this.universeRuns.length - 1]?.durationSeconds ?? 0
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
