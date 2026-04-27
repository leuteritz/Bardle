import { useGameStore } from '@/stores/gameStore'
import { useShopStore } from '@/stores/shopStore'
import { useBattleStore } from '@/stores/battleStore'
import { useExpeditionStore } from '@/stores/expedetionStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useAugmentStore } from '@/stores/augmentStore'
import { useItemStore } from '@/stores/itemStore'
import { usePlanetEventStore } from '@/stores/planetEventStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { useCpsStore } from '@/stores/cpsStore'
import { usePlayerStore } from '@/stores/playerStore' // ← NEU
import { usePlanetShopStore } from '@/stores/planetShopStore'
import {
  LEVEL_BASE,
  LEVEL_EXPONENT,
  MEEP_BASE_COST,
  SAVE_KEY,
  SAVE_VERSION,
} from '@/config/constants'
import { logger } from '@/utils/logger'

// ── Offline Progress Balance ──────────────────────────────────────────────────
const OFFLINE_RATE_MULTIPLIER = 0.6
const MAX_OFFLINE_HOURS = 10
const MIN_OFFLINE_SECONDS = 60

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
    const playerStore = usePlayerStore() // ← NEU
    const planetShopStore = usePlanetShopStore()

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
        permanentUpgrades: shopStore.permanentUpgrades.map((u) => ({
          id: u.id,
          purchased: u.purchased,
          appliedModifier: u.appliedModifier,
          modifierSlotUnlocked: u.modifierSlotUnlocked,
          modifierCost: u.modifierCost,
        })),
      },
      battle: {
        mmr: battleStore.mmr,
        currentRank: { ...battleStore.currentRank },
        ownedChampions: [...battleStore.ownedChampions],
        teamSlotAssignments: [...battleStore.teamSlotAssignments],
        headerSlots: [...battleStore.headerSlots],
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
        battleEverStarted: battleStore.battleEverStarted,
        battleCoins: battleStore.battleCoins,
        totalCoinsEarned: battleStore.totalCoinsEarned,
        purchasedBuffs: battleStore.purchasedBuffs,
        permanentBattleUpgrades: { ...battleStore.permanentBattleUpgrades },
      },
      expeditions: {
        activeExpeditions: expeditionStore.activeExpeditions,
        completedExpeditions: expeditionStore.completedExpeditions,
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
        galaxyBossDefeated: galaxyStore.galaxyBossDefeated,
        currentThemeIndex: galaxyStore.currentThemeIndex,
        championTravelState: galaxyStore.championTravelState,
        championTravelStartTime: galaxyStore.championTravelStartTime,
        championTravelDurationMs: galaxyStore.championTravelDurationMs,
        searchingForGalaxyBoss: galaxyStore.searchingForGalaxyBoss,
        resourceStarActive: galaxyStore.resourceStarActive,
        resourceStarElapsedMs: galaxyStore.resourceStarElapsedMs,
      },
      // ← NEU: Spieler-HP persistieren
      player: {
        currentHP: playerStore.currentHP,
        maxHP: playerStore.maxHP,
      },
      planetShop: {
        slots: planetShopStore.slots.map((s) => ({
          id: s.id,
          purchased: s.purchased,
          role: s.role,
          slotConfig: s.slotConfig,
        })),
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
        if (Array.isArray(saved.shop.permanentUpgrades)) {
          for (const savedUpgrade of saved.shop.permanentUpgrades) {
            const upgrade = shopStore.permanentUpgrades.find((u) => u.id === savedUpgrade.id)
            if (upgrade) {
              upgrade.purchased = savedUpgrade.purchased ?? false
              upgrade.appliedModifier = savedUpgrade.appliedModifier ?? undefined
              upgrade.modifierSlotUnlocked = savedUpgrade.modifierSlotUnlocked ?? false
              upgrade.modifierCost = savedUpgrade.modifierCost ?? undefined
            }
          }
        }
      }

      // Recalculate derived CPS/CPC from restored building levels + abilities
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()

      // Restore battleStore
      if (saved.battle) {
        const b = saved.battle
        battleStore.mmr = b.mmr ?? battleStore.mmr
        if (b.currentRank) battleStore.currentRank = { ...b.currentRank }
        if (Array.isArray(b.ownedChampions)) battleStore.ownedChampions = b.ownedChampions
        if (Array.isArray(b.teamSlotAssignments))
          battleStore.teamSlotAssignments = b.teamSlotAssignments
        if (Array.isArray(b.headerSlots)) battleStore.headerSlots = b.headerSlots
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
        battleStore.battleEverStarted = b.battleEverStarted ?? false
        battleStore.battleCoins = b.battleCoins ?? 0
        battleStore.totalCoinsEarned = b.totalCoinsEarned ?? 0
        if (Array.isArray(b.purchasedBuffs)) battleStore.purchasedBuffs = b.purchasedBuffs
        if (b.permanentBattleUpgrades && typeof b.permanentBattleUpgrades === 'object') {
          battleStore.permanentBattleUpgrades = { ...b.permanentBattleUpgrades }
        }
      }

      // Restore expeditionStore
      if (saved.expeditions) {
        if (Array.isArray(saved.expeditions.activeExpeditions))
          expeditionStore.activeExpeditions = saved.expeditions.activeExpeditions
        if (Array.isArray(saved.expeditions.completedExpeditions))
          expeditionStore.completedExpeditions = saved.expeditions.completedExpeditions
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
          for (let i = 0; i < 4; i++) {
            if (saved.items.slotEquipment[i]) {
              itemStore.slotEquipment[i] = {
                weapon: saved.items.slotEquipment[i].weapon ?? null,
                armor: saved.items.slotEquipment[i].armor ?? null,
                misc: saved.items.slotEquipment[i].misc ?? null,
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
        galaxyStore.galaxyBossDefeated = gx.galaxyBossDefeated ?? false
        galaxyStore.currentThemeIndex = gx.currentThemeIndex ?? 0
        galaxyStore.resourceStarActive = gx.resourceStarActive ?? false
        galaxyStore.resourceStarElapsedMs = gx.resourceStarElapsedMs ?? 0
        // Wenn Suchphase beim Speichern aktiv war → Boss sofort spawnen nach Reload
        if (gx.searchingForGalaxyBoss && !gx.galaxyBossDefeated) {
          galaxyStore.searchingForGalaxyBoss = false
          galaxyStore.pendingGalaxyBoss = true
        } else {
          galaxyStore.pendingGalaxyBoss =
            galaxyStore.starsRescued >= galaxyStore.starsRequired &&
            !galaxyStore.galaxyBossDefeated
        }
        if (gx.championTravelState && gx.championTravelState !== 'champion_spawned') {
          galaxyStore.championTravelState = gx.championTravelState
          galaxyStore.championTravelStartTime = gx.championTravelStartTime ?? 0
          galaxyStore.championTravelDurationMs =
            gx.championTravelDurationMs ?? galaxyStore.championTravelDurationMs
        } else {
          galaxyStore.startChampionTravel()
        }
      }

      // ← NEU: Restore playerStore (HP/Leben)
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
            slot.slotConfig = sv.slotConfig ?? undefined
          }
        }
      }

      // ── Offline Progress ─────────────────────────────────────────────────────
      const now = Date.now()
      const savedAt = saved.savedAt as number | undefined
      if (savedAt && typeof savedAt === 'number') {
        const rawSeconds = Math.floor((now - savedAt) / 1000)
        const cappedSeconds = Math.min(rawSeconds, MAX_OFFLINE_HOURS * 3600)
        if (cappedSeconds >= MIN_OFFLINE_SECONDS) {
          const offlineMul = planetShopStore.planetOfflineBoostMultiplier
          const earned = Math.floor(
            gameStore.chimesPerSecond * OFFLINE_RATE_MULTIPLIER * offlineMul * cappedSeconds,
          )
          gameStore.offlineChimes = earned
          gameStore.offlineSeconds = cappedSeconds
          gameStore.showOfflineModal = true
        }
      }

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
    shopStore.permanentUpgrades.forEach((u) => {
      u.purchased = false
      u.appliedModifier = undefined
      u.modifierSlotUnlocked = false
      u.modifierCost = undefined
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
    battleStore.chatMessages = []
    battleStore.isAutoBattleInitialized = false
    battleStore.autoBattleEnabled = false
    battleStore.lastAutoBattleResult = null
    battleStore.showAutoBattleResult = false
    battleStore.recruitableChampions = []
    battleStore.recruitedChampions = []
    battleStore.battleTime = 0
    battleStore.timeUntilNextBattle = 0
    battleStore.currentBattleId = 0
    battleStore.battleCoins = 0
    battleStore.totalCoinsEarned = 0
    battleStore.purchasedBuffs = []
    battleStore.permanentBattleUpgrades = {}
    battleStore.shopPhaseActive = false
    battleStore.activeShopItems = []
    battleStore.freeRerollAvailable = true

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

    // 7. Reset playerStore – HP/Leben auf Startwert zurücksetzen  ← NEU
    const playerStore = usePlayerStore()
    playerStore.$reset()

    // 7b. Reset planetShopStore – alle Slots zurücksetzen
    const planetShopStoreR = usePlanetShopStore()
    planetShopStoreR.slots.forEach((s) => {
      s.purchased = false
      s.role = null
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
