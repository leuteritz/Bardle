import { useGameStore } from '../stores/gameStore'
import { useShopStore } from '../stores/shopStore'
import { useBattleStore } from '../stores/battleStore'
import { useMissionStore } from '../stores/missionStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { LEVEL_BASE, LEVEL_EXPONENT } from '../config/constants'

const SAVE_KEY = 'bard-idle-save'
const SAVE_VERSION = 1

export function usePersistence() {
  function saveGame() {
    const gameStore = useGameStore()
    const shopStore = useShopStore()
    const battleStore = useBattleStore()
    const missionStore = useMissionStore()
    const inventoryStore = useInventoryStore()

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
      },
      battle: {
        mmr: battleStore.mmr,
        currentRank: { ...battleStore.currentRank },
        ownedChampions: [...battleStore.ownedChampions],
        selectedChampions: [...battleStore.selectedChampions],
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
      },
      missions: {
        activeMissions: missionStore.activeMissions,
        completedMissions: missionStore.completedMissions,
      },
      inventory: {
        collectedMaterials: { ...inventoryStore.collectedMaterials },
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
        if (Array.isArray(b.selectedChampions)) battleStore.selectedChampions = b.selectedChampions
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
    } catch {
      // Silent fail — start fresh
    }
  }

  function resetGame() {
    localStorage.removeItem(SAVE_KEY)
    window.location.reload()
  }

  return { saveGame, loadGame, resetGame }
}
