import { useGameStore } from '../stores/gameStore'
import { useShopStore } from '../stores/shopStore'
import { useBattleStore } from '../stores/battleStore'
import { useMissionStore } from '../stores/missionStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { useAugmentStore } from '../stores/augmentStore'
import { useItemStore } from '../stores/itemStore'
import { usePlanetEventStore } from '../stores/planetEventStore'
import { usePlanetBossStore } from '../stores/planetBossStore'
import { useSectionStore } from '../stores/sectionStore'
import { useGalaxyStore } from '../stores/galaxyStore'
import { useCpsStore } from '../stores/cpsStore'
import { LEVEL_BASE, LEVEL_EXPONENT, MEEP_BASE_COST } from '../config/constants'
import { logger } from '../utils/logger'

const SAVE_KEY = 'bard-idle-save'
const SAVE_VERSION = 1

export function usePersistence() {
  function saveGame() {
    const gameStore = useGameStore()
    const shopStore = useShopStore()
    const battleStore = useBattleStore()
    const missionStore = useMissionStore()
    const inventoryStore = useInventoryStore()

    const augmentStore = useAugmentStore()
    const itemStore = useItemStore()
    const sectionStore = useSectionStore()
    const galaxyStore = useGalaxyStore()

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
      },
      shop: {
        buyAmount: shopStore.buyAmount,
        shopUpgrades: shopStore.shopUpgrades.map((u) => ({ id: u.id, level: u.level })),
        permanentUpgrades: shopStore.permanentUpgrades.map((u) => ({ id: u.id, purchased: u.purchased })),
      },
      battle: {
        mmr: battleStore.mmr,
        currentRank: { ...battleStore.currentRank },
        ownedChampions: [...battleStore.ownedChampions],
        teamSlotAssignments: [...battleStore.teamSlotAssignments],
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
      },
      missions: {
        activeMissions: missionStore.activeMissions,
        completedMissions: missionStore.completedMissions,
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
      section: {
        activeSectionId: sectionStore.activeSectionId,
        highestUnlockedSectionId: sectionStore.highestUnlockedSectionId,
        sectionProgress: { ...sectionStore.sectionProgress },
        pendingSectionBoss: sectionStore.pendingSectionBoss,
      },
      galaxy: {
        currentGalaxy: galaxyStore.currentGalaxy,
        planetsRescued: galaxyStore.planetsRescued,
        planetsRequired: galaxyStore.planetsRequired,
        galaxyBossDefeated: galaxyStore.galaxyBossDefeated,
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
      const missionStore = useMissionStore()
      const inventoryStore = useInventoryStore()

      // Restore gameStore
      if (saved.game) {
        const g = saved.game
        gameStore.inGameTime = g.inGameTime ?? gameStore.inGameTime
        gameStore.chimes = g.chimes ?? gameStore.chimes
        // Always recalculate from current formula so balance changes take effect immediately
        const restoredLevel = g.level ?? gameStore.level
        gameStore.chimesForNextLevel = Math.ceil(LEVEL_BASE * Math.pow(restoredLevel, LEVEL_EXPONENT))
        gameStore.baseChimesPerClick = g.baseChimesPerClick ?? gameStore.baseChimesPerClick
        gameStore.chimesForMeep = g.chimesForMeep ?? gameStore.chimesForMeep
        gameStore.chimesForNextUniverse = g.chimesForNextUniverse ?? gameStore.chimesForNextUniverse
        gameStore.chimesToUniverseRescue = g.chimesToUniverseRescue ?? gameStore.chimesToUniverseRescue
        gameStore.meeps = g.meeps ?? gameStore.meeps
        gameStore.meepChimeRequirement = g.meepChimeRequirement ?? gameStore.meepChimeRequirement
        gameStore.level = g.level ?? gameStore.level
        gameStore.skillPoints = g.skillPoints ?? gameStore.skillPoints
        if (Array.isArray(g.abilityLevels)) gameStore.abilityLevels = g.abilityLevels
        gameStore.currentUniverse = g.currentUniverse ?? gameStore.currentUniverse
        gameStore.prestigeAvailable = g.prestigeAvailable ?? gameStore.prestigeAvailable
        gameStore.activeExpedition = g.activeExpedition ?? null
        if (g.buildingProductionHistory) gameStore.buildingProductionHistory = g.buildingProductionHistory
        if (g.totalBuildingProduction) gameStore.totalBuildingProduction = g.totalBuildingProduction
        if (Array.isArray(g.activeAugments)) gameStore.activeAugments = g.activeAugments
        gameStore.pendingAugmentChoice = g.pendingAugmentChoice ?? false
        if (Array.isArray(g.pendingAugmentOptions)) gameStore.pendingAugmentOptions = g.pendingAugmentOptions
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
            if (upgrade) upgrade.purchased = savedUpgrade.purchased ?? false
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
        if (Array.isArray(b.teamSlotAssignments)) battleStore.teamSlotAssignments = b.teamSlotAssignments
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
        // autoBattleEnabled is restored so the UI shows the correct toggle state,
        // but the actual battle loop is started by the UI component on mount.
        battleStore.autoBattleEnabled = b.autoBattleEnabled ?? false
        if (Array.isArray(b.recruitableChampions)) battleStore.recruitableChampions = b.recruitableChampions
        if (Array.isArray(b.recruitedChampions)) battleStore.recruitedChampions = b.recruitedChampions
        battleStore.battleEverStarted = b.battleEverStarted ?? false
      }

      // Restore missionStore
      if (saved.missions) {
        if (Array.isArray(saved.missions.activeMissions))
          missionStore.activeMissions = saved.missions.activeMissions
        if (Array.isArray(saved.missions.completedMissions))
          missionStore.completedMissions = saved.missions.completedMissions
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
        // Expire stale timed buffs
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

      // Restore sectionStore
      const sectionStore = useSectionStore()
      if (saved.section) {
        const s = saved.section
        sectionStore.activeSectionId = s.activeSectionId ?? 1
        sectionStore.highestUnlockedSectionId = s.highestUnlockedSectionId ?? 1
        sectionStore.pendingSectionBoss = s.pendingSectionBoss ?? false
        if (s.sectionProgress && typeof s.sectionProgress === 'object') {
          for (let id = 1; id <= 10; id++) {
            const sp = s.sectionProgress[id]
            if (sp) {
              sectionStore.sectionProgress[id] = {
                rescueCount: sp.rescueCount ?? 0,
                completed: sp.completed ?? false,
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
        galaxyStore.planetsRescued = gx.planetsRescued ?? 0
        galaxyStore.planetsRequired = gx.planetsRequired ?? 3
        galaxyStore.galaxyBossDefeated = gx.galaxyBossDefeated ?? false
        // Re-derive pendingGalaxyBoss: if all planets rescued but boss not yet done
        galaxyStore.pendingGalaxyBoss =
          galaxyStore.planetsRescued >= galaxyStore.planetsRequired &&
          !galaxyStore.galaxyBossDefeated
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
    gameStore.isCPSModalOpen = false
    gameStore.isExpeditionModalOpen = false
    gameStore.isEncyclopediaOpen = false

    // 3. Reset shopStore
    const shopStore = useShopStore()
    shopStore.shopUpgrades.forEach((u) => { u.level = 0 })
    shopStore.permanentUpgrades.forEach((u) => { u.purchased = false })
    shopStore.buyAmount = 1

    // 4. Reset augmentStore
    const augmentStore = useAugmentStore()
    augmentStore.$reset()

    // 5. Reset battleStore (timers already stopped)
    battleStore.mmr = 1000
    battleStore.currentRank = { tier: 'Iron', division: 'IV', lp: 0 }
    battleStore.ownedChampions = ['Bard']
    battleStore.teamSlotAssignments = [null, null, null, null]
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

    // 6. Reset remaining stores
    const inventoryStore = useInventoryStore()
    inventoryStore.$reset()
    const missionStore = useMissionStore()
    missionStore.$reset()
    const planetEventStore = usePlanetEventStore()
    planetEventStore.$reset()
    const planetBossStore = usePlanetBossStore()
    planetBossStore.$reset()
    const sectionStoreReset = useSectionStore()
    sectionStoreReset.$reset()
    const galaxyStoreReset = useGalaxyStore()
    galaxyStoreReset.$reset()
    const itemStore = useItemStore()
    itemStore.$reset()
    cpsStore.$reset()

    // 7. Recalculate CPS/CPC from clean state
    gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
    gameStore.chimesPerClick = shopStore.calculateTotalCPC()

    // 8. Re-start CPS tracking
    cpsStore.startProductionTracking()

    // 9. Clear localStorage
    localStorage.removeItem(SAVE_KEY)
  }

  return { saveGame, loadGame, resetGame }
}
