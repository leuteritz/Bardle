import { useGameStore } from '@/stores/gameStore'
import { useShopStore } from '@/stores/shopStore'
import { useBattleStore, defaultAllTimeStats, defaultChampionCareer } from '@/stores/battleStore'
import { useExpeditionStore } from '@/stores/expeditionStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useAugmentStore } from '@/stores/augmentStore'
import { useItemStore } from '@/stores/itemStore'
import { usePlanetEventStore } from '@/stores/planetEventStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { useCpsStore } from '@/stores/cpsStore'
import { usePlayerStore } from '@/stores/playerStore'
import { usePlanetShopStore, computePlanetMaxHp } from '@/stores/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/starForgeStore'
import { useMeepTreeStore } from '@/stores/meepTreeStore'
import {
  LEVEL_BASE,
  LEVEL_EXPONENT,
  MEEP_BASE_COST,
  SAVE_KEY,
  SAVE_VERSION,
  OFFLINE_CPS_RATE,
  OFFLINE_MAX_HOURS,
  OFFLINE_MIN_SECONDS,
  ITEM_SLOT_COUNT,
  ALLIES_PER_ROLE,
  createEmptyAllyRows,
  STAR_PHASE_DATA,
} from '@/config/constants'
import { DRAKE_TYPES, type DrakeTypeId } from '@/config/drakes'
import { logger } from '@/utils/logger'

/** Normalize saved ally rows to exactly ALLIES_PER_ROLE entries per role.
 *  Legacy 2-slot saves are padded with nulls; longer rows are truncated.
 *  Backward + forward compatible — no SAVE_VERSION bump needed. */
export function normalizeSecondarySlots(rows: unknown[]): (string | null)[][] {
  return rows.map((row) => {
    const arr = Array.isArray(row) ? row : []
    return Array.from({ length: ALLIES_PER_ROLE }, (_, s) =>
      typeof arr[s] === 'string' ? (arr[s] as string) : null,
    )
  })
}

export function usePersistence() {
  function saveGame() {
    const gameStore = useGameStore()
    const shopStore = useShopStore()
    const battleStore = useBattleStore()
    const expeditionStore = useExpeditionStore()
    const inventoryStore = useInventoryStore()
    const augmentStore = useAugmentStore()
    const itemStore = useItemStore()
    const galaxyStore = useGalaxyStore()
    const playerStore = usePlayerStore()
    const planetShopStore = usePlanetShopStore()
    const solarStore = useSolarUpgradeStore()
    const starForgeStore = useStarForgeStore()
    const meepTreeStore = useMeepTreeStore()

    const saveData = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      game: {
        inGameTime: gameStore.inGameTime,
        chimes: gameStore.chimes,
        chimesForNextLevel: gameStore.chimesForNextLevel,
        chimesPerClick: gameStore.chimesPerClick,
        baseChimesPerClick: gameStore.baseChimesPerClick,
        chimesForMeep: gameStore.chimesForMeep,
        chimesForNextUniverse: gameStore.chimesForNextUniverse,
        chimesToUniverseRescue: gameStore.chimesToUniverseRescue,
        meeps: gameStore.meeps,
        meepChimeRequirement: gameStore.meepChimeRequirement,
        level: gameStore.level,
        skillPoints: gameStore.skillPoints,
        abilityLevels: [...gameStore.abilityLevels],
        currentUniverse: gameStore.currentUniverse,
        prestigeAvailable: gameStore.prestigeAvailable,
        activeExpedition: gameStore.activeExpedition,
        buildingProductionHistory: gameStore.buildingProductionHistory,
        totalBuildingProduction: gameStore.totalBuildingProduction,
        activeAugments: [...gameStore.activeAugments],
        pendingAugmentChoice: gameStore.pendingAugmentChoice,
        pendingAugmentOptions: [...gameStore.pendingAugmentOptions],
        totalChimesEarned: gameStore.totalChimesEarned,
        totalClicks: gameStore.totalClicks,
      },
      shop: {
        buyAmount: shopStore.buyAmount,
        shopUpgrades: shopStore.shopUpgrades.map((u) => ({ id: u.id, level: u.level })),
      },
      battle: {
        mmr: battleStore.mmr,
        currentRank: { ...battleStore.currentRank },
        ownedChampions: [...battleStore.ownedChampions],
        teamSlotAssignments: [...battleStore.teamSlotAssignments],
        headerSlots: [...battleStore.headerSlots],
        secondarySlots: battleStore.secondarySlots.map((row) => [...row]),
        totalBattles: battleStore.totalBattles,
        totalWins: battleStore.totalWins,
        totalLosses: battleStore.totalLosses,
        totalKills: battleStore.totalKills,
        totalDeaths: battleStore.totalDeaths,
        totalAssists: battleStore.totalAssists,
        avgBattleTime: battleStore.avgBattleTime,
        totalBattleTime: battleStore.totalBattleTime,
        bestWinStreak: battleStore.bestWinStreak,
        currentWinStreak: battleStore.currentWinStreak,
        autoBattleEnabled: battleStore.autoBattleEnabled,
        battleHistory: battleStore.battleHistory.slice(-20),
        recruitableChampions: battleStore.recruitableChampions,
        recruitedChampions: [...battleStore.recruitedChampions],
        newlyUnlockedChampions: [...battleStore.newlyUnlockedChampions],
        battleEverStarted: battleStore.battleEverStarted,
        isAutoBattleInitialized: battleStore.isAutoBattleInitialized,
        resultPhaseStartTimestamp: battleStore.resultPhaseStartTimestamp,
        battlePhaseStartTimestamp: battleStore.battlePhaseStartTimestamp,
        autoBattleTimerEndTimestamp: battleStore.autoBattleTimerEndTimestamp,
        searchingPhaseStartTimestamp: battleStore.searchingPhaseStartTimestamp,
        // referenced directly — the whole saveData is stringified synchronously
        // below, so a JSON deep-clone here would just serialize twice
        allTime: battleStore.allTime,
        championCareer: battleStore.championCareer,
        battleSeed: battleStore.battleSeed,
        adminForceOwnMvp: battleStore.adminForceOwnMvp,
        initialWinProbability: battleStore.initialWinProbability,
        startWinChanceBonus: battleStore.startWinChanceBonus,
        battleStartBonus: battleStore.battleStartBonus,
        objectiveOverrides: battleStore.objectiveOverrides.map((o) => ({ ...o })),
        drakeBuffs: [...battleStore.drakeBuffs],
        drakeBuffsT2: [...battleStore.drakeBuffsT2],
        battleTeams: {
          t1: battleStore.team1.map((c) => ({ name: c.name, role: c.role })),
          t2: battleStore.team2.map((c) => ({ name: c.name, role: c.role })),
        },
      },
      expeditions: {
        activeExpeditions: expeditionStore.activeExpeditions,
        completedExpeditions: expeditionStore.completedExpeditions,
        availableExpeditions: expeditionStore.availableExpeditions,
        nextSpawnAt: expeditionStore.nextSpawnAt,
      },
      inventory: {
        collectedMaterials: { ...inventoryStore.collectedMaterials },
      },
      augment: {
        clickCounter: augmentStore.clickCounter,
        lastClickValues: [...augmentStore.lastClickValues],
        activeTimedBuffs: augmentStore.activeTimedBuffs,
        bigBangUsed: augmentStore.bigBangUsed,
        keyboardSmashModifiers: { ...augmentStore.keyboardSmashModifiers },
      },
      items: {
        ownedItems: { ...itemStore.ownedItems },
        slotEquipment: itemStore.slotEquipment.map((s) => ({ ...s })),
      },
      galaxy: {
        currentGalaxy: galaxyStore.currentGalaxy,
        starsRescued: galaxyStore.starsRescued,
        starsRequired: galaxyStore.starsRequired,
        attemptResults: [...galaxyStore.attemptResults],
        mapSeed: galaxyStore.mapSeed,
        galaxyStartedAtInGameTime: galaxyStore.galaxyStartedAtInGameTime,
        completedGalaxies: galaxyStore.completedGalaxies.map((r) => ({
          ...r,
          attemptResults: [...r.attemptResults],
        })),
        unlockedTier: galaxyStore.unlockedTier,
        galaxyBossDefeated: galaxyStore.galaxyBossDefeated,
        bossEscortsTotal: galaxyStore.bossEscortsTotal,
        bossEscortsDefeated: galaxyStore.bossEscortsDefeated,
        currentThemeIndex: galaxyStore.currentThemeIndex,
        usedThemeIndices: [...galaxyStore.usedThemeIndices],
        championTravelState: galaxyStore.championTravelState,
        championTravelStartTime: galaxyStore.championTravelStartTime,
        championTravelDurationMs: galaxyStore.championTravelDurationMs,
        championTravelBaseDurationMs: galaxyStore.championTravelBaseDurationMs,
        travelingToGalaxyBoss: galaxyStore.travelingToGalaxyBoss,
        resourceStarActive: galaxyStore.resourceStarActive,
        resourceStarElapsedMs: galaxyStore.resourceStarElapsedMs,
        pendingRoleSelection: galaxyStore.pendingRoleSelection,
        nextStarRole: galaxyStore.nextStarRole,
        travelPendingAfterRotation: galaxyStore.travelPendingAfterRotation,
      },
      // ← NEW: Persist player HP
      player: {
        currentHP: playerStore.currentHP,
        maxHP: playerStore.maxHP,
      },
      planetShop: {
        slots: planetShopStore.slots.map((s) => ({
          id: s.id,
          purchased: s.purchased,
          role: s.role,
          level: s.level,
          slotConfig: s.slotConfig,
        })),
      },
      solar: {
        flightSpeedLevel: solarStore.flightSpeedLevel,
        maxHpLevel: solarStore.maxHpLevel,
        chimesPerClickLevel: solarStore.chimesPerClickLevel,
        chimesPerSecondLevel: solarStore.chimesPerSecondLevel,
        dmgPerClickLevel: solarStore.dmgPerClickLevel,
        starPhase: solarStore.starPhase,
        isCometState: solarStore.isCometState,
        cometSeconds: solarStore.cometSeconds,
        phaseEnteredAt: solarStore.phaseEnteredAt,
        totalPhaseSeconds: solarStore.totalPhaseSeconds,
        phaseTimeHistory: solarStore.phaseTimeHistory,
      },
      starForge: {
        branchLevels: { ...starForgeStore.branchLevels },
        leafLevels: { ...starForgeStore.leafLevels },
        relicLevels: { ...starForgeStore.relicLevels },
        forgedConstellations: [...starForgeStore.forgedConstellations],
        bargainDealId: starForgeStore.bargainDealId,
        bargainRestockAt: starForgeStore.bargainRestockAt,
        bargainPurchased: starForgeStore.bargainPurchased,
        activeBuffs: starForgeStore.activeBuffs.map((b) => ({ ...b })),
      },
      meepTree: {
        bought: [...meepTreeStore.bought],
      },
    }

    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData))
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return

      const saved = JSON.parse(raw)
      if (!saved || saved.version !== SAVE_VERSION) return

      const gameStore = useGameStore()
      const shopStore = useShopStore()
      const battleStore = useBattleStore()
      const expeditionStore = useExpeditionStore()
      const inventoryStore = useInventoryStore()

      // Restore gameStore
      if (saved.game) {
        const g = saved.game
        gameStore.inGameTime = g.inGameTime ?? gameStore.inGameTime
        gameStore.chimes = g.chimes ?? gameStore.chimes
        const restoredLevel = g.level ?? gameStore.level
        gameStore.chimesForNextLevel = Math.ceil(
          LEVEL_BASE * Math.pow(restoredLevel, LEVEL_EXPONENT),
        )
        gameStore.baseChimesPerClick = g.baseChimesPerClick ?? gameStore.baseChimesPerClick
        gameStore.chimesForMeep = g.chimesForMeep ?? gameStore.chimesForMeep
        gameStore.chimesForNextUniverse = g.chimesForNextUniverse ?? gameStore.chimesForNextUniverse
        gameStore.chimesToUniverseRescue =
          g.chimesToUniverseRescue ?? gameStore.chimesToUniverseRescue
        gameStore.meeps = g.meeps ?? gameStore.meeps
        gameStore.meepChimeRequirement = g.meepChimeRequirement ?? gameStore.meepChimeRequirement
        gameStore.level = g.level ?? gameStore.level
        gameStore.skillPoints = g.skillPoints ?? gameStore.skillPoints
        if (Array.isArray(g.abilityLevels)) gameStore.abilityLevels = g.abilityLevels
        gameStore.currentUniverse = g.currentUniverse ?? gameStore.currentUniverse
        gameStore.prestigeAvailable = g.prestigeAvailable ?? gameStore.prestigeAvailable
        gameStore.activeExpedition = g.activeExpedition ?? null
        if (g.buildingProductionHistory)
          gameStore.buildingProductionHistory = g.buildingProductionHistory
        if (g.totalBuildingProduction) gameStore.totalBuildingProduction = g.totalBuildingProduction
        if (Array.isArray(g.activeAugments)) gameStore.activeAugments = g.activeAugments
        gameStore.pendingAugmentChoice = g.pendingAugmentChoice ?? false
        if (Array.isArray(g.pendingAugmentOptions))
          gameStore.pendingAugmentOptions = g.pendingAugmentOptions
        gameStore.totalChimesEarned = g.totalChimesEarned ?? 0
        gameStore.totalClicks = g.totalClicks ?? 0
      }

      // Restore shopStore
      if (saved.shop) {
        shopStore.buyAmount = saved.shop.buyAmount ?? shopStore.buyAmount
        if (Array.isArray(saved.shop.shopUpgrades)) {
          for (const savedUpgrade of saved.shop.shopUpgrades) {
            const upgrade = shopStore.shopUpgrades.find((u) => u.id === savedUpgrade.id)
            if (upgrade) upgrade.level = savedUpgrade.level ?? 0
          }
        }
      }

      // CPS/CPC recalculation deferred until after solarStore is restored (see below)

      // Restore battleStore
      if (saved.battle) {
        const b = saved.battle
        battleStore.mmr = b.mmr ?? battleStore.mmr
        if (b.currentRank) battleStore.currentRank = { ...b.currentRank }
        if (Array.isArray(b.ownedChampions)) battleStore.ownedChampions = b.ownedChampions
        if (Array.isArray(b.teamSlotAssignments))
          battleStore.teamSlotAssignments = b.teamSlotAssignments
        if (Array.isArray(b.headerSlots)) battleStore.headerSlots = b.headerSlots
        if (Array.isArray(b.secondarySlots) && b.secondarySlots.length === 5) {
          battleStore.secondarySlots = normalizeSecondarySlots(b.secondarySlots)
        }
        battleStore.totalBattles = b.totalBattles ?? battleStore.totalBattles
        battleStore.totalWins = b.totalWins ?? battleStore.totalWins
        battleStore.totalLosses = b.totalLosses ?? battleStore.totalLosses
        battleStore.totalKills = b.totalKills ?? battleStore.totalKills
        battleStore.totalDeaths = b.totalDeaths ?? battleStore.totalDeaths
        battleStore.totalAssists = b.totalAssists ?? battleStore.totalAssists
        battleStore.avgBattleTime = b.avgBattleTime ?? battleStore.avgBattleTime
        battleStore.totalBattleTime = b.totalBattleTime ?? battleStore.totalBattleTime
        battleStore.bestWinStreak = b.bestWinStreak ?? battleStore.bestWinStreak
        battleStore.currentWinStreak = b.currentWinStreak ?? battleStore.currentWinStreak
        if (Array.isArray(b.battleHistory)) battleStore.battleHistory = b.battleHistory
        battleStore.autoBattleEnabled = b.autoBattleEnabled ?? false
        if (Array.isArray(b.recruitableChampions))
          battleStore.recruitableChampions = b.recruitableChampions
        if (Array.isArray(b.recruitedChampions))
          battleStore.recruitedChampions = b.recruitedChampions
        if (Array.isArray(b.newlyUnlockedChampions))
          battleStore.newlyUnlockedChampions = b.newlyUnlockedChampions
        battleStore.battleEverStarted = b.battleEverStarted ?? false
        battleStore.isAutoBattleInitialized = b.isAutoBattleInitialized ?? false
        battleStore.resultPhaseStartTimestamp = b.resultPhaseStartTimestamp ?? 0
        battleStore.battlePhaseStartTimestamp = b.battlePhaseStartTimestamp ?? 0
        battleStore.autoBattleTimerEndTimestamp = b.autoBattleTimerEndTimestamp ?? 0
        battleStore.searchingPhaseStartTimestamp = b.searchingPhaseStartTimestamp ?? 0
        // All-time career stats: spread-merge so fields added later default to 0
        battleStore.allTime = {
          ...defaultAllTimeStats(),
          ...(b.allTime ?? {}),
          multikills: {
            ...defaultAllTimeStats().multikills,
            ...(b.allTime?.multikills ?? {}),
          },
        }
        // Per-champion career: merge defaults so fields added later default to 0
        battleStore.championCareer = Object.fromEntries(
          Object.entries(b.championCareer ?? {}).map(([name, entry]) => [
            name,
            { ...defaultChampionCareer(), ...(entry as object) },
          ]),
        )
        battleStore.battleSeed = b.battleSeed ?? 0
        battleStore.adminForceOwnMvp = b.adminForceOwnMvp ?? false
        battleStore.initialWinProbability = b.initialWinProbability ?? 0.5
        battleStore.currentWinProbability = b.initialWinProbability ?? 0.5
        battleStore.startWinChanceBonus = b.startWinChanceBonus ?? 0
        battleStore.battleStartBonus = b.battleStartBonus ?? 0
        if (Array.isArray(b.objectiveOverrides)) {
          battleStore.objectiveOverrides = b.objectiveOverrides
            .filter(
              (o: unknown): o is { t: number; newSeed: number; prob: number } =>
                typeof o === 'object' && o !== null &&
                typeof (o as { t?: unknown }).t === 'number' &&
                typeof (o as { newSeed?: unknown }).newSeed === 'number' &&
                typeof (o as { prob?: unknown }).prob === 'number',
            )
            .map((o: { t: number; newSeed: number; prob: number }) => ({ ...o }))
        }
        // Battle-scoped drake buffs — interactively-resolved drakes are not replayable
        battleStore.drakeBuffs = Array.isArray(b.drakeBuffs)
          ? b.drakeBuffs.filter((t: unknown): t is DrakeTypeId => typeof t === 'string' && t in DRAKE_TYPES)
          : []
        battleStore.drakeBuffsT2 = Array.isArray(b.drakeBuffsT2)
          ? b.drakeBuffsT2.filter((t: unknown): t is DrakeTypeId => typeof t === 'string' && t in DRAKE_TYPES)
          : []
        // Mid-battle rosters (needed for deterministic timeline resume)
        if (
          b.battleTeams &&
          Array.isArray(b.battleTeams.t1) &&
          Array.isArray(b.battleTeams.t2) &&
          b.battleTeams.t1.length === 5 &&
          b.battleTeams.t2.length === 5 &&
          b.battlePhaseStartTimestamp > 0
        ) {
          battleStore.restoreTeams(b.battleTeams.t1, b.battleTeams.t2)
        }
      }

      // Restore expeditionStore
      if (saved.expeditions) {
        if (Array.isArray(saved.expeditions.activeExpeditions))
          expeditionStore.activeExpeditions = saved.expeditions.activeExpeditions
        if (Array.isArray(saved.expeditions.completedExpeditions))
          expeditionStore.completedExpeditions = saved.expeditions.completedExpeditions
        if (Array.isArray(saved.expeditions.availableExpeditions))
          expeditionStore.availableExpeditions = saved.expeditions.availableExpeditions
        if (typeof saved.expeditions.nextSpawnAt === 'number')
          expeditionStore.nextSpawnAt = saved.expeditions.nextSpawnAt
      }

      // Restore inventoryStore
      if (saved.inventory?.collectedMaterials) {
        inventoryStore.collectedMaterials = { ...saved.inventory.collectedMaterials }
      }

      // Restore augmentStore
      const augmentStore = useAugmentStore()
      if (saved.augment) {
        const a = saved.augment
        augmentStore.clickCounter = a.clickCounter ?? 0
        if (Array.isArray(a.lastClickValues)) augmentStore.lastClickValues = a.lastClickValues
        if (Array.isArray(a.activeTimedBuffs)) augmentStore.activeTimedBuffs = a.activeTimedBuffs
        augmentStore.bigBangUsed = a.bigBangUsed ?? false
        if (a.keyboardSmashModifiers) augmentStore.keyboardSmashModifiers = a.keyboardSmashModifiers
        augmentStore.onTick()
      }

      // Restore itemStore
      const itemStore = useItemStore()
      if (saved.items) {
        if (saved.items.ownedItems) itemStore.ownedItems = { ...saved.items.ownedItems }
        if (Array.isArray(saved.items.slotEquipment)) {
          for (let i = 0; i < ITEM_SLOT_COUNT; i++) {
            if (saved.items.slotEquipment[i]) {
              itemStore.slotEquipment[i] = {
                weapon: saved.items.slotEquipment[i].weapon ?? null,
                armor: saved.items.slotEquipment[i].armor ?? null,
                artefact: saved.items.slotEquipment[i].artefact ?? saved.items.slotEquipment[i].misc ?? null,
              }
            }
          }
        }
      }

      // Restore galaxyStore
      const galaxyStore = useGalaxyStore()
      if (saved.galaxy) {
        const gx = saved.galaxy
        galaxyStore.currentGalaxy = gx.currentGalaxy ?? 1
        galaxyStore.starsRescued = gx.starsRescued ?? 0
        galaxyStore.starsRequired = gx.starsRequired ?? 3
        // Older saves have no attempt history → reconstruct from the rescue count
        galaxyStore.attemptResults =
          gx.attemptResults ?? Array.from({ length: galaxyStore.starsRescued }, () => 'rescued')
        galaxyStore.mapSeed = gx.mapSeed ?? galaxyStore.mapSeed
        // Ältere Saves kennen die Galaxie-Historie nicht → Zeitmessung der
        // laufenden Galaxie startet ab jetzt, Archiv beginnt leer.
        galaxyStore.galaxyStartedAtInGameTime =
          gx.galaxyStartedAtInGameTime ?? gameStore.inGameTime
        galaxyStore.completedGalaxies = Array.isArray(gx.completedGalaxies)
          ? gx.completedGalaxies
          : []
        galaxyStore.unlockedTier = gx.unlockedTier ?? galaxyStore.currentTier
        galaxyStore.galaxyBossDefeated = gx.galaxyBossDefeated ?? false
        // Boss-Eskorten-Wellen: alte Saves ohne die Felder → 0/0, damit ist
        // die Eskorten-Bedingung in isComplete automatisch erfüllt (Legacy-
        // Verhalten). Die Sterne selbst spawnen nach dem Reload frisch über
        // den Escort-Wave-Watcher in useStarSystem.
        galaxyStore.bossEscortsTotal = gx.bossEscortsTotal ?? 0
        galaxyStore.bossEscortsDefeated = gx.bossEscortsDefeated ?? 0
        galaxyStore.currentThemeIndex = gx.currentThemeIndex ?? 0
        // Alte Saves kennen die Liste nicht → aus dem aktuellen Theme rekonstruieren.
        galaxyStore.usedThemeIndices = gx.usedThemeIndices ?? [
          ...new Set([0, galaxyStore.currentThemeIndex]),
        ]
        galaxyStore.resourceStarActive = gx.resourceStarActive ?? false
        galaxyStore.resourceStarElapsedMs = gx.resourceStarElapsedMs ?? 0
        // Legacy saves from the old boss-search phase → spawn boss right away.
        // While flying toward the boss star, the boss must NOT be pending yet.
        galaxyStore.travelingToGalaxyBoss = gx.travelingToGalaxyBoss ?? false
        if (gx.searchingForGalaxyBoss && !gx.galaxyBossDefeated) {
          galaxyStore.pendingGalaxyBoss = true
        } else {
          galaxyStore.pendingGalaxyBoss =
            galaxyStore.starsRescued >= galaxyStore.starsRequired &&
            !galaxyStore.galaxyBossDefeated &&
            !galaxyStore.travelingToGalaxyBoss
        }
        galaxyStore.pendingRoleSelection = gx.pendingRoleSelection ?? false
        galaxyStore.nextStarRole = gx.nextStarRole ?? null
        galaxyStore.travelPendingAfterRotation = false
        if (gx.championTravelState && gx.championTravelState !== 'champion_spawned') {
          galaxyStore.championTravelState = gx.championTravelState
          galaxyStore.championTravelStartTime = gx.championTravelStartTime ?? 0
          galaxyStore.championTravelDurationMs =
            gx.championTravelDurationMs ?? galaxyStore.championTravelDurationMs
          galaxyStore.championTravelBaseDurationMs =
            gx.championTravelBaseDurationMs ?? gx.championTravelDurationMs ?? galaxyStore.championTravelBaseDurationMs
        } else {
          galaxyStore.startChampionTravel()
        }
        // Save aus der Mitte der Rettungsrotation (State dort noch 'idle',
        // travelPendingAfterRotation true): die Rotation selbst wird nicht
        // persistiert, also nach dem State-Restore direkt losfliegen. Muss
        // NACH dem championTravelState-Restore laufen, sonst überschreibt
        // das gespeicherte 'idle' den frisch gestarteten Travel wieder.
        if (gx.travelPendingAfterRotation) {
          galaxyStore.startChampionTravel()
        }
        // Rettungsanker gegen tote Spielstände: 'idle' ohne Rollenwahl, ohne
        // Bossphase und ohne fertige Galaxie zeigt weder Minimap noch HUD und
        // kann sich nie mehr selbst auflösen. Zurück in einen gültigen
        // Zustand: mit bekannter Rolle weiterfliegen, sonst Rollenwahl öffnen.
        if (
          galaxyStore.championTravelState === 'idle' &&
          !galaxyStore.pendingRoleSelection &&
          !galaxyStore.travelingToGalaxyBoss &&
          !galaxyStore.bossPhaseActive &&
          !galaxyStore.isComplete
        ) {
          if (galaxyStore.nextStarRole) galaxyStore.startChampionTravel()
          else galaxyStore.requestRoleSelection()
        }
      }

      // ← NEW: Restore playerStore (HP/Life)
      const playerStore = usePlayerStore()
      if (saved.player) {
        playerStore.currentHP = saved.player.currentHP ?? playerStore.maxHP
        playerStore.maxHP = saved.player.maxHP ?? playerStore.maxHP
      }

      // Restore planetShopStore (slots)
      const planetShopStore = usePlanetShopStore()
      if (saved.planetShop?.slots) {
        for (const sv of saved.planetShop.slots) {
          const slot = planetShopStore.slots.find((s) => s.id === sv.id)
          if (slot) {
            slot.purchased = sv.purchased ?? false
            slot.role = sv.role ?? null
            slot.level = sv.level ?? 1
            slot.slotConfig = sv.slotConfig ?? undefined
            // currentHp/maxHp are not persisted; derive from level on load.
            slot.maxHp = computePlanetMaxHp(slot.level)
            slot.currentHp = slot.maxHp
          }
        }
      }

      // Restore solarUpgradeStore
      const solarStore = useSolarUpgradeStore()
      if (saved.solar) {
        solarStore.flightSpeedLevel = saved.solar.flightSpeedLevel ?? 0
        solarStore.maxHpLevel = saved.solar.maxHpLevel ?? 0
        solarStore.chimesPerClickLevel = saved.solar.chimesPerClickLevel ?? 0
        solarStore.chimesPerSecondLevel = saved.solar.chimesPerSecondLevel ?? 0
        solarStore.dmgPerClickLevel = saved.solar.dmgPerClickLevel ?? 0
        // Clamp to the current phase list — older saves may hold indices from a
        // longer STAR_PHASE_DATA (e.g. the removed White Dwarf phase).
        solarStore.starPhase = Math.min(saved.solar.starPhase ?? 0, STAR_PHASE_DATA.length - 1)
        solarStore.phaseEnteredAt = saved.solar.phaseEnteredAt ?? Date.now()
        solarStore.totalPhaseSeconds = saved.solar.totalPhaseSeconds ?? 0
        solarStore.phaseTimeHistory = saved.solar.phaseTimeHistory ?? []
      }
      // Comet origin state — deliberately OUTSIDE the saved.solar guard: any
      // existing save (even one predating the solar block) must load as a star,
      // never regress into the comet. Only a truly fresh game keeps the state
      // default (isCometState: true).
      // Comet is only ever valid at starPhase 0 — a save claiming otherwise is
      // inconsistent and loads as a star.
      solarStore.isCometState =
        (saved.solar?.isCometState ?? false) && (saved.solar?.starPhase ?? 0) === 0
      solarStore.cometSeconds = saved.solar?.cometSeconds ?? 0

      // Restore starForgeStore — missing key (old saves) keeps all-zero defaults
      const starForgeStore = useStarForgeStore()
      if (saved.starForge) {
        starForgeStore.branchLevels = { ...(saved.starForge.branchLevels ?? {}) }
        starForgeStore.leafLevels = { ...(saved.starForge.leafLevels ?? {}) }
        starForgeStore.relicLevels = { ...(saved.starForge.relicLevels ?? {}) }
        starForgeStore.forgedConstellations = [...(saved.starForge.forgedConstellations ?? [])]
        starForgeStore.bargainDealId = saved.starForge.bargainDealId ?? ''
        starForgeStore.bargainRestockAt = saved.starForge.bargainRestockAt ?? 0
        starForgeStore.bargainPurchased = saved.starForge.bargainPurchased ?? false
        starForgeStore.activeBuffs = (saved.starForge.activeBuffs ?? []).map(
          (b: { id: 'cpcX2' | 'cpsX2'; expiresAt: number }) => ({ ...b }),
        )
      }

      // Restore meepTreeStore — missing key (old saves) keeps an empty tree
      const meepTreeStore = useMeepTreeStore()
      meepTreeStore.bought = [...(saved.meepTree?.bought ?? [])]

      // Recalculate derived CPS/CPC after all levels (buildings + solar + forge) are restored
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()

      // ── Offline Progress ─────────────────────────────────────────────────────
      const now = Date.now()
      const savedAt = saved.savedAt as number | undefined
      if (savedAt && typeof savedAt === 'number') {
        const rawSeconds = Math.floor((now - savedAt) / 1000)
        const maxOfflineHours =
          OFFLINE_MAX_HOURS +
          starForgeStore.offlineMaxHoursBonus +
          meepTreeStore.fx.offlineMaxHoursBonus
        const cappedSeconds = Math.min(rawSeconds, maxOfflineHours * 3600)
        if (cappedSeconds >= OFFLINE_MIN_SECONDS) {
          const offlineMul =
            planetShopStore.planetOfflineBoostMultiplier *
            starForgeStore.offlineEarningsMult *
            meepTreeStore.fx.offlineEarningsMult
          const earned = Math.floor(
            gameStore.chimesPerSecond * OFFLINE_CPS_RATE * offlineMul * cappedSeconds,
          )
          gameStore.offlineChimes = earned
          gameStore.offlineSeconds = cappedSeconds
          gameStore.showOfflineModal = true
        }
      }

      // Nach Page-Reload: Visibility-Listener und Simulation für laufenden Kampf wiederherstellen
      battleStore.resumeBattleAfterLoad()

      logger.info('System', 'Game loaded', {
        level: gameStore.level,
        chimes: gameStore.chimes,
        cps: gameStore.chimesPerSecond,
        universe: gameStore.currentUniverse,
      })
    } catch {
      // Silent fail — start fresh
    }
  }

  function resetGame() {
    console.clear()
    logger.warn('System', 'Game reset initiated')

    // 1. Stop all timers
    const battleStore = useBattleStore()
    battleStore.stopAutoBattle()
    battleStore.clearBattle()

    const cpsStore = useCpsStore()
    cpsStore.stopProductionTracking()

    // 2. Reset gameStore
    const gameStore = useGameStore()
    gameStore.inGameTime = 0
    gameStore.chimes = 0
    gameStore.chimesPerSecond = 0
    gameStore.chimesPerClick = 20
    gameStore.baseChimesPerClick = 20
    gameStore.chimesForNextLevel = LEVEL_BASE
    gameStore.chimesForMeep = 0
    gameStore.chimesForNextUniverse = 0
    gameStore.chimesToUniverseRescue = 100000
    gameStore.meeps = 0
    gameStore.meepChimeRequirement = MEEP_BASE_COST
    gameStore.chimesEarnedForLevel = 0
    gameStore.level = 1
    gameStore.skillPoints = 0
    gameStore.abilityLevels = [0, 0, 0, 0]
    gameStore.activeAugments = []
    gameStore.pendingAugmentChoice = false
    gameStore.pendingAugmentOptions = []
    gameStore.currentUniverse = 1
    gameStore.prestigeAvailable = false
    gameStore.buildingProductionHistory = {}
    gameStore.totalBuildingProduction = {}
    gameStore.activeExpedition = null
    gameStore.isHyperspaceActive = false
    gameStore.showUniverseSelectModal = false
    gameStore.isCPSModalOpen = false
    gameStore.isExpeditionModalOpen = false
    gameStore.isEncyclopediaOpen = false
    gameStore.totalChimesEarned = 0
    gameStore.totalClicks = 0
    gameStore.offlineChimes = 0
    gameStore.offlineSeconds = 0
    gameStore.showOfflineModal = false

    // 3. Reset shopStore
    const shopStore = useShopStore()
    shopStore.shopUpgrades.forEach((u) => {
      u.level = 0
    })
    shopStore.buyAmount = 1

    // 4. Reset augmentStore
    const augmentStore = useAugmentStore()
    augmentStore.$reset()

    // 5. Reset battleStore (timers already stopped)
    battleStore.mmr = 1000
    battleStore.currentRank = { tier: 'Iron', division: 'IV', lp: 0 }
    battleStore.ownedChampions = ['Bard']
    battleStore.teamSlotAssignments = [null, null, null, null]
    battleStore.headerSlots = [null, null, null, null, null]
    battleStore.secondarySlots = createEmptyAllyRows()
    battleStore.totalBattles = 0
    battleStore.totalWins = 0
    battleStore.totalLosses = 0
    battleStore.totalKills = 0
    battleStore.totalDeaths = 0
    battleStore.totalAssists = 0
    battleStore.avgBattleTime = 0
    battleStore.totalBattleTime = 0
    battleStore.bestWinStreak = 0
    battleStore.currentWinStreak = 0
    battleStore.battleHistory = []
    battleStore.team1 = []
    battleStore.team2 = []
    battleStore.isAutoBattleInitialized = false
    battleStore.isViewingLanding = false
    battleStore.autoBattleEnabled = false
    battleStore.lastAutoBattleResult = null
    battleStore.showAutoBattleResult = false
    battleStore.recruitableChampions = []
    battleStore.recruitedChampions = []
    battleStore.newlyUnlockedChampions = []
    battleStore.battleTime = 0
    battleStore.timeUntilNextBattle = 0
    battleStore.currentBattleId = 0
    battleStore.allTime = defaultAllTimeStats()
    battleStore.championCareer = {}
    battleStore.battleSeed = 0
    battleStore.initialWinProbability = 0.5
    battleStore.startWinChanceBonus = 0
    battleStore.battleStartBonus = 0
    battleStore.objectiveOverrides = []
    battleStore.drakeBuffs = []
    battleStore.drakeBuffsT2 = []
    battleStore.timeline = null
    battleStore.timelineCursor = 0
    battleStore.killFeed = []
    battleStore.honoredChampions = []
    battleStore.honorsSettled = false
    // 6. Reset remaining stores
    const inventoryStore = useInventoryStore()
    inventoryStore.$reset()
    const expeditionStore = useExpeditionStore()
    expeditionStore.$reset()
    const planetEventStore = usePlanetEventStore()
    planetEventStore.$reset()
    const planetBossStore = usePlanetBossStore()
    planetBossStore.$reset()
    const galaxyStoreReset = useGalaxyStore()
    galaxyStoreReset.$reset()
    const starGroupStore = useStarGroupStore()
    starGroupStore.$reset()
    const itemStore = useItemStore()
    itemStore.$reset()
    cpsStore.$reset()

    // 7. Reset playerStore – reset HP/Life to initial value
    const playerStore = usePlayerStore()
    playerStore.$reset()

    // 7c. Reset solarUpgradeStore
    const solarStoreR = useSolarUpgradeStore()
    solarStoreR.$reset()

    // 7d. Reset starForgeStore
    const starForgeStoreR = useStarForgeStore()
    starForgeStoreR.$reset()

    // 7e. Reset meepTreeStore
    useMeepTreeStore().$reset()

    // 7b. Reset planetShopStore – alle Slots zurücksetzen
    const planetShopStoreR = usePlanetShopStore()
    planetShopStoreR.slots.forEach((s) => {
      s.purchased = false
      s.role = null
      s.level = 1
      s.maxHp = computePlanetMaxHp(1)
      s.currentHp = s.maxHp
    })
    planetShopStoreR.activeRoleModalSlotId = null

    // 8. Recalculate CPS/CPC from clean state
    gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
    gameStore.chimesPerClick = shopStore.calculateTotalCPC()

    // 9. Re-start CPS tracking
    cpsStore.startProductionTracking()

    // 10. Clear localStorage
    localStorage.removeItem(SAVE_KEY)
  }

  return { saveGame, loadGame, resetGame }
}
