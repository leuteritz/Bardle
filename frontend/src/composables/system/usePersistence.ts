import { useGameStore, chimeThresholdForLevel } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
import {
  useBattleStore,
  defaultAllTimeStats,
  defaultChampionCareer,
} from '@/stores/battle/battleStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useAugmentStore } from '@/stores/economy/augmentStore'
import { useItemStore } from '@/stores/economy/itemStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { useCpsStore } from '@/stores/core/cpsStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { usePlanetShopStore, computePlanetMaxHp } from '@/stores/world/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useSkinStore } from '@/stores/champions/skinStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import type {
  ChampionProgress,
  PendingPerkChoice,
  DrifterActiveBuff,
  VoidAftermath,
  BardAbilityBuff,
  BardAbilityId,
  ForgeActiveBuff,
  UniverseRunRecord,
} from '@/types'
import {
  LEVEL_BASE,
  SAVE_KEY,
  SAVE_VERSION,
  SAVE_ID_RENAMES,
  OFFLINE_CPS_RATE,
  OFFLINE_MAX_HOURS,
  OFFLINE_MIN_SECONDS,
  ITEM_SLOT_COUNT,
  ALLIES_PER_ROLE,
  createEmptyAllyRows,
  STAR_PHASE_DATA,
  SECONDS_PER_HOUR,
  CHIMES_PER_CLICK_BASE,
  UNIVERSE_RESCUE_INITIAL_COST,
  BATTLE_HISTORY_SAVE_LIMIT,
  OMEN_FIRST_OFFER_DELAY_SEC,
  GAME_SPEED_DEFAULT,
} from '@/config/constants'
import { DRAKE_TYPES, type DrakeTypeId } from '@/config/battle/drakes'
import { logger } from '@/utils/logger'
import { anchorGameClock, gameClockOffset, gameNow } from '@/utils/game/gameClock'

/** Content id as the current catalog spells it — see SAVE_ID_RENAMES. An id
 *  that was never renamed passes through untouched. */
function migratedId(id: string): string {
  return SAVE_ID_RENAMES[id] ?? id
}

/** Same, for a saved list of ids (bought nodes, forged constellations). */
export function migratedIds(ids: unknown): string[] {
  return Array.isArray(ids)
    ? ids.filter((id): id is string => typeof id === 'string').map(migratedId)
    : []
}

/** Same, for a saved id → value map (branch levels, relic levels). A rename
 *  that collides with an existing key keeps the higher level, so no progress
 *  is ever traded away. */
export function migratedIdMap<T extends number>(map: unknown): Record<string, T> {
  const out: Record<string, T> = {}
  if (!map || typeof map !== 'object') return out
  for (const [id, value] of Object.entries(map as Record<string, T>)) {
    const key = migratedId(id)
    out[key] = out[key] !== undefined && out[key] > value ? out[key] : value
  }
  return out
}

/** Same, for a champion's level → perk-id map. */
export function migratedPerks(perks: Record<number, string> | undefined): Record<number, string> {
  const out: Record<number, string> = {}
  for (const [level, perkId] of Object.entries(perks ?? {})) {
    out[Number(level)] = migratedId(perkId)
  }
  return out
}

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
    const planetBossStore = usePlanetBossStore()
    const starGroupStore = useStarGroupStore()
    const championLevelStore = useChampionLevelStore()
    const drifterStore = useDrifterStore()
    const voidStore = useVoidStore()
    const bardAbilityStore = useBardAbilityStore()
    const achievementStore = useAchievementStore()
    const omenStore = useOmenStore()
    const providenceStore = useProvidenceStore()

    const saveData = {
      version: SAVE_VERSION,
      // Wanduhr: der Offline-Ertrag misst, wie lange der Spieler WEG war, nicht
      // wie lange die Spielwelt lief.
      savedAt: Date.now(),
      /**
       * Vorlauf der Spieluhr gegenüber der Wanduhr. Alle Fristen unten stammen
       * aus der Spielachse dieser Sitzung; ohne diesen Wert läge nach einem
       * Reload jede von ihnen in ferner Zukunft (oder Vergangenheit).
       */
      gameClockOffset: gameClockOffset(),
      game: {
        /** Nur zur Kenntlichkeit: geladen wird immer mit 1 (siehe loadGame). */
        gameSpeed: gameStore.gameSpeed,
        inGameTime: gameStore.inGameTime,
        chimes: gameStore.chimes,
        chimesForNextLevel: gameStore.chimesForNextLevel,
        chimesPerClick: gameStore.chimesPerClick,
        baseChimesPerClick: gameStore.baseChimesPerClick,
        chimesForNextUniverse: gameStore.chimesForNextUniverse,
        bestUniverseRunChimes: gameStore.bestUniverseRunChimes,
        meepsDevoured: gameStore.meepsDevoured,
        runMeepCostFloor: gameStore.runMeepCostFloor,
        chimesToUniverseRescue: gameStore.chimesToUniverseRescue,
        meeps: gameStore.meeps,
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
        autoPickAugments: gameStore.autoPickAugments,
        totalChimesEarned: gameStore.totalChimesEarned,
        totalClicks: gameStore.totalClicks,
        totalMeepsEarned: gameStore.totalMeepsEarned,
        totalMeepsSpent: gameStore.totalMeepsSpent,
        totalMeepsDevoured: gameStore.totalMeepsDevoured,
        totalPrestiges: gameStore.totalPrestiges,
        totalOfflineChimes: gameStore.totalOfflineChimes,
        totalOfflineSeconds: gameStore.totalOfflineSeconds,
        universeRun: { ...gameStore.universeRun },
        universeRuns: gameStore.universeRuns.map((run) => ({ ...run })),
      },
      shop: {
        buyAmount: shopStore.buyAmount,
        shopUpgrades: shopStore.shopUpgrades.map((u) => ({ id: u.id, level: u.level })),
      },
      battle: {
        mmr: battleStore.mmr,
        peakMmr: battleStore.peakMmr,
        totalLpGained: battleStore.totalLpGained,
        totalLpLost: battleStore.totalLpLost,
        currentRank: { ...battleStore.currentRank },
        tierReachedAt: { ...battleStore.tierReachedAt },
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
        battleHistory: battleStore.battleHistory.slice(-BATTLE_HISTORY_SAVE_LIMIT),
        recruitableChampions: battleStore.recruitableChampions,
        recruitedChampions: [...battleStore.recruitedChampions],
        newlyUnlockedChampions: [...battleStore.newlyUnlockedChampions],
        battleEverStarted: battleStore.battleEverStarted,
        isAutoBattleInitialized: battleStore.isAutoBattleInitialized,
        stopRequested: battleStore.stopRequested,
        resultPhaseStartTimestamp: battleStore.resultPhaseStartTimestamp,
        battlePhaseStartTimestamp: battleStore.battlePhaseStartTimestamp,
        autoBattleTimerEndTimestamp: battleStore.autoBattleTimerEndTimestamp,
        searchingPhaseStartTimestamp: battleStore.searchingPhaseStartTimestamp,
        loadingPhaseStartTimestamp: battleStore.loadingPhaseStartTimestamp,
        currentOpponentLabel: battleStore.currentOpponentLabel,
        currentOpponentMmr: battleStore.currentOpponentMmr,
        currentOpponentLp: battleStore.currentOpponentLp,
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
          t2: battleStore.team2.map((c) => ({ name: c.name, role: c.role, skin: c.skin })),
        },
      },
      skins: {
        selectedSkins: { ...useSkinStore().selectedSkins },
      },
      expeditions: {
        activeExpeditions: expeditionStore.activeExpeditions,
        completedExpeditions: expeditionStore.completedExpeditions,
        availableExpeditions: expeditionStore.availableExpeditions,
        nextSpawnAt: expeditionStore.nextSpawnAt,
        totalExpeditionsStarted: expeditionStore.totalExpeditionsStarted,
        totalExpeditionsSucceeded: expeditionStore.totalExpeditionsSucceeded,
        totalExpeditionsFailed: expeditionStore.totalExpeditionsFailed,
        totalExpeditionChimes: expeditionStore.totalExpeditionChimes,
        ledgerCompleted: expeditionStore.ledgerCompleted,
      },
      inventory: {
        collectedMaterials: { ...inventoryStore.collectedMaterials },
        totalMaterialsCollected: inventoryStore.totalMaterialsCollected,
        totalMaterialsSpent: inventoryStore.totalMaterialsSpent,
        // Per-material ledger behind the header tooltip. The rolling intake
        // window is deliberately NOT saved — see resetRateWindow().
        lifetimeCollected: { ...inventoryStore.lifetimeCollected },
        lifetimeSpent: { ...inventoryStore.lifetimeSpent },
        peakStock: { ...inventoryStore.peakStock },
        firstFoundAt: { ...inventoryStore.firstFoundAt },
        lastFoundAt: { ...inventoryStore.lastFoundAt },
        longestDroughtMs: { ...inventoryStore.longestDroughtMs },
        sourceTally: JSON.parse(JSON.stringify(inventoryStore.sourceTally)),
        sinkTally: JSON.parse(JSON.stringify(inventoryStore.sinkTally)),
      },
      // Champion progression survives prestige by design — a new universe
      // resets the economy, not what the champions have learned.
      championLevel: {
        progress: JSON.parse(JSON.stringify(championLevelStore.progress)),
        pendingPerks: championLevelStore.pendingPerks.map((p) => ({ ...p })),
        totalXpEarned: championLevelStore.totalXpEarned,
        totalLevelsBought: championLevelStore.totalLevelsBought,
        autoLevelEnabled: championLevelStore.autoLevelEnabled,
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
        resourceStarElapsedMs: galaxyStore.resourceStarElapsedMs,
        pendingRoleSelection: galaxyStore.pendingRoleSelection,
        nextStarRole: galaxyStore.nextStarRole,
        travelPendingAfterRotation: galaxyStore.travelPendingAfterRotation,
        totalStarsRescued: galaxyStore.totalStarsRescued,
        totalStarsLost: galaxyStore.totalStarsLost,
        totalGalaxyBossesDefeated: galaxyStore.totalGalaxyBossesDefeated,
        totalBossEscortsDefeated: galaxyStore.totalBossEscortsDefeated,
      },
      // ← NEW: Persist player HP
      player: {
        currentHP: playerStore.currentHP,
        maxHP: playerStore.maxHP,
        totalDamageTaken: playerStore.totalDamageTaken,
        totalHpRegenerated: playerStore.totalHpRegenerated,
        timesDowned: playerStore.timesDowned,
        // Ohne diese Zeile gäbe ein Neuladen den Aufschub der Warden's-Reprieve-
        // Krone in derselben Sonnenphase ein zweites Mal her.
        reprieveUsedInPhase: playerStore.reprieveUsedInPhase,
      },
      // Lifetime-only blocks: the live boss/star state itself is never persisted,
      // but its career counters must survive a reload.
      planetBoss: {
        totalBossesDefeated: planetBossStore.totalBossesDefeated,
        totalBossesLost: planetBossStore.totalBossesLost,
        totalBossDamage: planetBossStore.totalBossDamage,
        turretVolleyCounter: planetBossStore.turretVolleyCounter,
      },
      starGroup: {
        totalStarsSpawned: starGroupStore.totalStarsSpawned,
        totalPlanetsCleared: starGroupStore.totalPlanetsCleared,
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
        boughLevels: { ...starForgeStore.boughLevels },
        crownLevels: { ...starForgeStore.crownLevels },
        relicLevels: { ...starForgeStore.relicLevels },
        forgedConstellations: [...starForgeStore.forgedConstellations],
        acknowledgedShop: [...starForgeStore.acknowledgedShop],
        bargainDealId: starForgeStore.bargainDealId,
        bargainRestockAt: starForgeStore.bargainRestockAt,
        bargainPurchased: starForgeStore.bargainPurchased,
        activeBuffs: starForgeStore.activeBuffs.map((b) => ({ ...b })),
      },
      meepTree: {
        bought: [...meepTreeStore.bought],
        acknowledged: [...meepTreeStore.acknowledged],
      },
      // Drifters in flight are deliberately NOT saved — one that resumed
      // mid-passage after a reload would already be halfway off the screen.
      // Their buffs are, because expiresAt is absolute wall-clock time.
      drifter: {
        buffs: drifterStore.buffs.map((b) => ({ ...b, effects: { ...b.effects } })),
        totalDriftersSpawned: drifterStore.totalDriftersSpawned,
        totalDriftersCollected: drifterStore.totalDriftersCollected,
        totalDriftersMissed: drifterStore.totalDriftersMissed,
      },
      // The Void. Ein OFFENER Riss wird bewusst nicht gespeichert — dieselbe
      // Begründung wie beim Drifter darüber, nur andersherum: er käme mit halb
      // abgelaufener Frist zurück, und die verstrichene Zeit hat der Spieler
      // nicht gehabt. Was bleibt, sind die Nachbeben und Beute-Fenster, denn
      // deren `expiresAt` ist absolute Wanduhrzeit und läuft auch bei
      // geschlossenem Spiel korrekt ab.
      void: {
        aftermaths: voidStore.aftermaths.map((a) => ({ ...a, effects: { ...a.effects } })),
        totalRiftsOpened: voidStore.totalRiftsOpened,
        totalRiftsSealed: voidStore.totalRiftsSealed,
        totalRiftsCollapsed: voidStore.totalRiftsCollapsed,
        totalVoidHpLost: voidStore.totalVoidHpLost,
      },
      // Bard-Fähigkeiten. Abklingzeiten und Stase stehen als absolute
      // Zeitstempel — genau wie die Drifter-Buffs darüber laufen sie damit
      // auch bei geschlossenem Spiel weiter ab, statt beim Laden von vorn zu
      // beginnen. Die Resonance dagegen ist erspielt und bleibt.
      bardAbility: {
        cooldownReadyAt: { ...bardAbilityStore.cooldownReadyAt },
        resonance: bardAbilityStore.resonance,
        resonanceProgress: bardAbilityStore.resonanceProgress,
        buffs: bardAbilityStore.buffs.map((b) => ({ ...b })),
        stasisUntil: bardAbilityStore.stasisUntil,
        totalCasts: bardAbilityStore.totalCasts,
        totalAbilityDamage: bardAbilityStore.totalAbilityDamage,
        totalAbilityHealing: bardAbilityStore.totalAbilityHealing,
      },
      // Chronicle. Nur die Stufen, keine Zähler: jede Metrik gehört dem Store,
      // der sie ohnehin speichert, und wird beim Laden dort gelesen.
      chronicle: {
        stages: { ...achievementStore.stages },
        unseen: [...achievementStore.unseen],
      },
      // Omens. Das laufende Vorzeichen samt eingefrorenem Startwert MUSS mit —
      // ohne ihn wäre der Fortschritt nach einem Reload nicht mehr rekonstruierbar
      // (er ist eine Differenz, keine gespeicherte Zahl). Die Buff-Ablaufzeiten
      // sind absolute Zeitstempel und überstehen einen geschlossenen Tab damit
      // von selbst; das Angebot dagegen wird bewusst NICHT gespeichert: ein
      // ungewähltes Trio darf beim nächsten Start neu gewürfelt werden.
      omens: {
        active: omenStore.active ? { ...omenStore.active } : null,
        buffs: omenStore.buffs.map((b) => ({ ...b })),
        offerCooldownSec: omenStore.offerCooldownSec,
        totalOmensCompleted: omenStore.totalOmensCompleted,
        totalOmensSwift: omenStore.totalOmensSwift,
      },
      // Providence. Das GANZE gewürfelte Ergebnis, nicht eine ID: seit Achse
      // und Höhe beim Prestige gezogen werden, steht die laufende Vorsehung in
      // keinem Katalog mehr und liesse sich aus einer ID nicht rekonstruieren.
      // Damit sind die Achsen-Schlüssel in `effects` der Save-Vertrag, den
      // früher die ID war — wer `xpMult` umbenennt, macht laufende Läufe
      // wirkungslos. Das Angebot wird bewusst NICHT gespeichert: ein
      // ungewähltes Trio darf beim nächsten Öffnen neu gewürfelt werden.
      providence: {
        active: providenceStore.active ? { ...providenceStore.active } : null,
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

      // ZUERST die Uhr verankern, vor jedem Store-Restore: alles, was unten
      // geladen wird, ist eine Frist aus der Spielachse der Vorsitzung. Der
      // Vorlauf friert über die Offline-Lücke ein — abwesende Zeit vergeht für
      // die Spielwelt genauso schnell wie für die Wanduhr.
      anchorGameClock(saved.gameClockOffset ?? 0)

      const gameStore = useGameStore()
      const shopStore = useShopStore()
      const battleStore = useBattleStore()
      const expeditionStore = useExpeditionStore()
      const inventoryStore = useInventoryStore()

      // Restore gameStore
      let universeRunRestored = false
      if (saved.game) {
        const g = saved.game
        // Nur merken, nicht anwenden — siehe gameStore.lastGameSpeed.
        gameStore.lastGameSpeed = g.gameSpeed ?? GAME_SPEED_DEFAULT
        gameStore.inGameTime = g.inGameTime ?? gameStore.inGameTime
        gameStore.chimes = g.chimes ?? gameStore.chimes
        const restoredLevel = g.level ?? gameStore.level
        gameStore.chimesForNextLevel = chimeThresholdForLevel(restoredLevel)
        gameStore.baseChimesPerClick = g.baseChimesPerClick ?? gameStore.baseChimesPerClick
        gameStore.chimesForNextUniverse = g.chimesForNextUniverse ?? gameStore.chimesForNextUniverse
        gameStore.chimesToUniverseRescue =
          g.chimesToUniverseRescue ?? gameStore.chimesToUniverseRescue
        gameStore.meeps = g.meeps ?? gameStore.meeps
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
        // Ältere Speicherstände kennen den Auto-Pick nicht → aus
        gameStore.autoPickAugments = g.autoPickAugments ?? false
        gameStore.totalChimesEarned = g.totalChimesEarned ?? 0
        gameStore.totalClicks = g.totalClicks ?? 0
        // Lifetime counters added later — saves without them start the tally at 0
        gameStore.totalMeepsEarned = g.totalMeepsEarned ?? gameStore.meeps
        gameStore.totalMeepsSpent = g.totalMeepsSpent ?? 0
        gameStore.totalMeepsDevoured = g.totalMeepsDevoured ?? 0
        gameStore.meepsDevoured = g.meepsDevoured ?? 0
        gameStore.runMeepCostFloor = g.runMeepCostFloor ?? 1
        gameStore.totalPrestiges = g.totalPrestiges ?? Math.max(0, gameStore.currentUniverse - 1)
        gameStore.totalOfflineChimes = g.totalOfflineChimes ?? 0
        gameStore.totalOfflineSeconds = g.totalOfflineSeconds ?? 0
        if (Array.isArray(g.universeRuns)) {
          gameStore.universeRuns = g.universeRuns.map((run: UniverseRunRecord) => ({ ...run }))
        }
        // Die Meep-Ratsche — MUSS nach `universeRuns` stehen, sie liest daraus.
        //
        // Kennt der Spielstand sie nicht, wird sie aus dem besten archivierten
        // Lauf UND dem laufenden rekonstruiert. Beide Hälften sind nötig: ohne
        // das Archiv fiele ein alter Spielstand auf `MEEP_RUN_BASE_MIN` zurück
        // und machte aus 1e16 Laufchimes zehn Millionen anstehende Meeps; ohne
        // den laufenden Lauf bekäme jemand, der seit Stunden nicht aufgebrochen
        // ist, beim nächsten Aufbruch den 100×-Bonus geschenkt.
        // `UniverseRunRecord.chimes` ist exakt `chimesForNextUniverse` zum
        // Prestige-Zeitpunkt, also die richtige Quelle.
        gameStore.bestUniverseRunChimes =
          g.bestUniverseRunChimes ??
          Math.max(
            gameStore.chimesForNextUniverse,
            ...gameStore.universeRuns.map((run) => run.chimes ?? 0),
          )
        // Die Basislinie wird hier nur übernommen, wenn sie im Spielstand steht.
        // Fehlt sie (Spielstand von vor dem Tooltip), setzt loadGame sie unten
        // aus den gerade wiederhergestellten Zählern — dann beginnt die
        // „in diesem Universum"-Zählung ab jetzt, statt falsche Werte zu zeigen.
        if (g.universeRun) gameStore.universeRun = { ...gameStore.universeRun, ...g.universeRun }
        universeRunRestored = Boolean(g.universeRun)
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
        battleStore.peakMmr = Math.max(b.peakMmr ?? 0, battleStore.mmr)
        battleStore.totalLpGained = b.totalLpGained ?? 0
        battleStore.totalLpLost = b.totalLpLost ?? 0
        if (b.currentRank) battleStore.currentRank = { ...b.currentRank }
        if (b.tierReachedAt) battleStore.tierReachedAt = { ...b.tierReachedAt }
        // Saves from before tier dates existed carry no history: stamp the tier
        // the player is standing on now so the ladder has at least one date.
        // Lower tiers stay blank rather than getting invented dates.
        battleStore.markTierReached(battleStore.currentRank.tier)
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
        battleStore.stopRequested = b.stopRequested ?? false
        battleStore.resultPhaseStartTimestamp = b.resultPhaseStartTimestamp ?? 0
        battleStore.battlePhaseStartTimestamp = b.battlePhaseStartTimestamp ?? 0
        battleStore.autoBattleTimerEndTimestamp = b.autoBattleTimerEndTimestamp ?? 0
        battleStore.searchingPhaseStartTimestamp = b.searchingPhaseStartTimestamp ?? 0
        battleStore.loadingPhaseStartTimestamp = b.loadingPhaseStartTimestamp ?? 0
        battleStore.currentOpponentLabel = b.currentOpponentLabel ?? ''
        battleStore.currentOpponentMmr = b.currentOpponentMmr ?? 0
        battleStore.currentOpponentLp = b.currentOpponentLp ?? 0
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
                typeof o === 'object' &&
                o !== null &&
                typeof (o as { t?: unknown }).t === 'number' &&
                typeof (o as { newSeed?: unknown }).newSeed === 'number' &&
                typeof (o as { prob?: unknown }).prob === 'number',
            )
            .map((o: { t: number; newSeed: number; prob: number }) => ({ ...o }))
        }
        // Battle-scoped drake buffs — interactively-resolved drakes are not replayable
        battleStore.drakeBuffs = Array.isArray(b.drakeBuffs)
          ? b.drakeBuffs.filter(
              (t: unknown): t is DrakeTypeId => typeof t === 'string' && t in DRAKE_TYPES,
            )
          : []
        battleStore.drakeBuffsT2 = Array.isArray(b.drakeBuffsT2)
          ? b.drakeBuffsT2.filter(
              (t: unknown): t is DrakeTypeId => typeof t === 'string' && t in DRAKE_TYPES,
            )
          : []
        // Mid-battle rosters (needed for deterministic timeline resume) — the
        // loading phase needs them too: it already shows both line-ups.
        if (
          b.battleTeams &&
          Array.isArray(b.battleTeams.t1) &&
          Array.isArray(b.battleTeams.t2) &&
          b.battleTeams.t1.length === 5 &&
          b.battleTeams.t2.length === 5 &&
          (b.battlePhaseStartTimestamp > 0 || b.loadingPhaseStartTimestamp > 0)
        ) {
          battleStore.restoreTeams(b.battleTeams.t1, b.battleTeams.t2)
        }
      }

      // Restore skinStore — entries for unknown skins are dropped by setSkin
      if (saved.skins?.selectedSkins && typeof saved.skins.selectedSkins === 'object') {
        const skinStore = useSkinStore()
        skinStore.resetSkins()
        for (const [champion, skin] of Object.entries(saved.skins.selectedSkins)) {
          if (typeof skin === 'string') skinStore.setSkin(champion, skin)
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

        // Offers saved before hazards existed carry neither field. The chance
        // breakdown reads both unconditionally, so fill them in rather than let a
        // pre-update save render a mission with an undefined threshold — an offer
        // lives five minutes, so no-hazard stragglers clear themselves out.
        for (const slot of expeditionStore.availableExpeditions) {
          if (!Array.isArray(slot.hazards)) slot.hazards = []
          if (typeof slot.hazardThreshold !== 'number') slot.hazardThreshold = 0
        }

        const completed = expeditionStore.completedExpeditions
        expeditionStore.totalExpeditionsStarted =
          saved.expeditions.totalExpeditionsStarted ?? completed.length
        expeditionStore.totalExpeditionsSucceeded =
          saved.expeditions.totalExpeditionsSucceeded ??
          completed.filter((e) => e.status === 'success').length
        expeditionStore.totalExpeditionsFailed =
          saved.expeditions.totalExpeditionsFailed ??
          completed.filter((e) => e.status === 'failure').length
        expeditionStore.totalExpeditionChimes = saved.expeditions.totalExpeditionChimes ?? 0
        // Ledger rank is earned by RESOLVING missions, so a save from before the
        // ledger existed is credited with everything it already finished rather
        // than starting the player back at Wayfinder.
        expeditionStore.ledgerCompleted =
          saved.expeditions.ledgerCompleted ??
          (saved.expeditions.totalExpeditionsSucceeded ?? 0) +
            (saved.expeditions.totalExpeditionsFailed ?? 0)
      }

      // Restore inventoryStore
      if (saved.inventory) {
        if (saved.inventory.collectedMaterials) {
          inventoryStore.collectedMaterials = { ...saved.inventory.collectedMaterials }
        }
        // Older saves only knew the current stock — seed the lifetime tally from it
        const inStock = Object.values(inventoryStore.collectedMaterials).reduce(
          (sum, n) => sum + (n ?? 0),
          0,
        )
        inventoryStore.totalMaterialsCollected = saved.inventory.totalMaterialsCollected ?? inStock
        inventoryStore.totalMaterialsSpent = saved.inventory.totalMaterialsSpent ?? 0

        // Per-material ledger. Saves from before the header tooltip carry none
        // of it — the current stock is then the only defensible lower bound for
        // "ever collected" and "peak", and the rest stays empty rather than
        // inventing history.
        const stock = inventoryStore.collectedMaterials
        inventoryStore.lifetimeCollected = { ...(saved.inventory.lifetimeCollected ?? stock) }
        inventoryStore.lifetimeSpent = { ...(saved.inventory.lifetimeSpent ?? {}) }
        inventoryStore.peakStock = { ...(saved.inventory.peakStock ?? stock) }
        inventoryStore.firstFoundAt = { ...(saved.inventory.firstFoundAt ?? {}) }
        inventoryStore.lastFoundAt = { ...(saved.inventory.lastFoundAt ?? {}) }
        inventoryStore.longestDroughtMs = { ...(saved.inventory.longestDroughtMs ?? {}) }
        inventoryStore.sourceTally = saved.inventory.sourceTally
          ? JSON.parse(JSON.stringify(saved.inventory.sourceTally))
          : {}
        inventoryStore.sinkTally = saved.inventory.sinkTally
          ? JSON.parse(JSON.stringify(saved.inventory.sinkTally))
          : {}
      }
      // Start measuring intake from now: the hour before a load was spent
      // offline, and carrying those empty buckets over would report 0/h to a
      // player who is in fact farming.
      inventoryStore.resetRateWindow()

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

      // Restore championLevelStore — saves made before champion levels existed
      // simply have no block here, so every champion starts at level 1.
      const championLevelStore = useChampionLevelStore()
      if (saved.championLevel) {
        const cl = saved.championLevel
        if (cl.progress && typeof cl.progress === 'object') {
          championLevelStore.progress = {}
          for (const [name, raw] of Object.entries(
            cl.progress as Record<string, Partial<ChampionProgress>>,
          )) {
            championLevelStore.progress[name] = {
              level: raw?.level ?? 1,
              xp: raw?.xp ?? 0,
              totalXp: raw?.totalXp ?? 0,
              perks: migratedPerks(raw?.perks),
            }
          }
        }
        if (Array.isArray(cl.pendingPerks)) {
          championLevelStore.pendingPerks = cl.pendingPerks.filter(
            (p: PendingPerkChoice) => !!p?.champion,
          )
        }
        championLevelStore.totalXpEarned = cl.totalXpEarned ?? 0
        championLevelStore.totalLevelsBought = cl.totalLevelsBought ?? 0
        // Saves made before the auto switch existed stay manual.
        championLevelStore.autoLevelEnabled = cl.autoLevelEnabled === true
        championLevelStore.prune()
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
                artefact:
                  saved.items.slotEquipment[i].artefact ??
                  saved.items.slotEquipment[i].misc ??
                  null,
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
        galaxyStore.galaxyStartedAtInGameTime = gx.galaxyStartedAtInGameTime ?? gameStore.inGameTime
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
        // Lifetime counters added later — reconstruct what the archive still knows
        const archivedAttempts = galaxyStore.completedGalaxies.flatMap((r) => r.attemptResults)
        galaxyStore.totalStarsRescued =
          gx.totalStarsRescued ??
          archivedAttempts.filter((r) => r === 'rescued').length + galaxyStore.starsRescued
        galaxyStore.totalStarsLost =
          gx.totalStarsLost ??
          archivedAttempts.filter((r) => r === 'failed').length +
            galaxyStore.attemptResults.filter((r) => r === 'failed').length
        galaxyStore.totalGalaxyBossesDefeated =
          gx.totalGalaxyBossesDefeated ?? galaxyStore.completedGalaxies.length
        galaxyStore.totalBossEscortsDefeated =
          gx.totalBossEscortsDefeated ?? galaxyStore.bossEscortsDefeated
        if (gx.championTravelState && gx.championTravelState !== 'champion_spawned') {
          galaxyStore.championTravelState = gx.championTravelState
          galaxyStore.championTravelStartTime = gx.championTravelStartTime ?? 0
          galaxyStore.championTravelDurationMs =
            gx.championTravelDurationMs ?? galaxyStore.championTravelDurationMs
          galaxyStore.championTravelBaseDurationMs =
            gx.championTravelBaseDurationMs ??
            gx.championTravelDurationMs ??
            galaxyStore.championTravelBaseDurationMs
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
        playerStore.totalDamageTaken = saved.player.totalDamageTaken ?? 0
        playerStore.totalHpRegenerated = saved.player.totalHpRegenerated ?? 0
        playerStore.timesDowned = saved.player.timesDowned ?? 0
        playerStore.reprieveUsedInPhase = saved.player.reprieveUsedInPhase ?? -1
      }

      // Restore the lifetime-only counters of the boss / star systems
      const planetBossStore = usePlanetBossStore()
      if (saved.planetBoss) {
        planetBossStore.totalBossesDefeated = saved.planetBoss.totalBossesDefeated ?? 0
        planetBossStore.totalBossesLost = saved.planetBoss.totalBossesLost ?? 0
        planetBossStore.totalBossDamage = saved.planetBoss.totalBossDamage ?? 0
        planetBossStore.turretVolleyCounter = saved.planetBoss.turretVolleyCounter ?? 0
      }
      const starGroupStore = useStarGroupStore()
      if (saved.starGroup) {
        starGroupStore.totalStarsSpawned = saved.starGroup.totalStarsSpawned ?? 0
        starGroupStore.totalPlanetsCleared = saved.starGroup.totalPlanetsCleared ?? 0
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
            // Same for the respawn timer: a session always starts with every
            // planet intact rather than resuming someone else's countdown.
            slot.maxHp = computePlanetMaxHp(slot.level)
            slot.currentHp = slot.maxHp
            slot.downUntilMs = 0
            slot.healingUntilMs = 0
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
        solarStore.phaseEnteredAt = saved.solar.phaseEnteredAt ?? gameNow()
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
        starForgeStore.branchLevels = migratedIdMap(saved.starForge.branchLevels)
        starForgeStore.leafLevels = migratedIdMap(saved.starForge.leafLevels)
        // Ältere Spielstände kennen den vierten und fünften Ring nicht —
        // `migratedIdMap` gibt für ein fehlendes Feld einen leeren Beutel
        // zurück, und das ist der richtige Startwert.
        starForgeStore.boughLevels = migratedIdMap(saved.starForge.boughLevels)
        starForgeStore.crownLevels = migratedIdMap(saved.starForge.crownLevels)
        starForgeStore.relicLevels = migratedIdMap(saved.starForge.relicLevels)
        starForgeStore.forgedConstellations = migratedIds(saved.starForge.forgedConstellations)
        // Gesehen bleibt gesehen — und das ist keine Kosmetik: der Offline-Ertrag
        // wird beim Laden gutgeschrieben, und ohne diese Liste stünde nach jeder
        // Pause der halbe Shop als „neu" da.
        starForgeStore.acknowledgedShop = migratedIds(saved.starForge.acknowledgedShop)
        starForgeStore.bargainDealId = migratedId(saved.starForge.bargainDealId ?? '')
        starForgeStore.bargainRestockAt = saved.starForge.bargainRestockAt ?? 0
        starForgeStore.bargainPurchased = saved.starForge.bargainPurchased ?? false
        starForgeStore.activeBuffs = (saved.starForge.activeBuffs ?? []).map(
          (b: ForgeActiveBuff) => ({ ...b }),
        )
      }

      // Restore meepTreeStore — missing key (old saves) keeps an empty tree
      const meepTreeStore = useMeepTreeStore()
      meepTreeStore.bought = migratedIds(saved.meepTree?.bought)
      meepTreeStore.acknowledged = migratedIds(saved.meepTree?.acknowledged)

      // Restore drifter buffs — expiresAt is absolute, so anything that ran out
      // while the tab was closed is dropped here instead of ticking down again.
      const drifterStore = useDrifterStore()
      drifterStore.drifterNow = gameNow()
      drifterStore.buffs = ((saved.drifter?.buffs ?? []) as DrifterActiveBuff[])
        .filter((b) => b.expiresAt > drifterStore.drifterNow)
        .map((b) => ({ ...b, effects: { ...b.effects } }))
      drifterStore.totalDriftersSpawned = saved.drifter?.totalDriftersSpawned ?? 0
      drifterStore.totalDriftersCollected = saved.drifter?.totalDriftersCollected ?? 0
      drifterStore.totalDriftersMissed = saved.drifter?.totalDriftersMissed ?? 0

      // The Void — wie oben: was während der Abwesenheit auslief, fällt hier
      // heraus, statt danach noch einmal herunterzuzählen. Offene Risse standen
      // nie im Spielstand, das Feld ist nach dem Laden also immer leer.
      const voidStore = useVoidStore()
      voidStore.voidNow = gameNow()
      voidStore.aftermaths = ((saved.void?.aftermaths ?? []) as VoidAftermath[])
        .filter((a) => a.expiresAt > voidStore.voidNow)
        .map((a) => ({ ...a, effects: { ...a.effects } }))
      voidStore.totalRiftsOpened = saved.void?.totalRiftsOpened ?? 0
      voidStore.totalRiftsSealed = saved.void?.totalRiftsSealed ?? 0
      voidStore.totalRiftsCollapsed = saved.void?.totalRiftsCollapsed ?? 0
      voidStore.totalVoidHpLost = saved.void?.totalVoidHpLost ?? 0

      // Bard-Fähigkeiten. Was während der Abwesenheit abgelaufen ist, fällt
      // hier heraus, statt danach noch einmal herunterzuzählen; eine Stase, die
      // in der Zwischenzeit endete, wird verworfen — ihr Schlussschlag hätte
      // Bosse getroffen, die zu ihrer Zeit gar nicht standen.
      const bardAbilityStore = useBardAbilityStore()
      const bardNow = gameNow()
      bardAbilityStore.abilityNow = bardNow
      const savedCooldowns = saved.bardAbility?.cooldownReadyAt ?? {}
      for (const id of ['q', 'w', 'e', 'r'] as BardAbilityId[]) {
        bardAbilityStore.cooldownReadyAt[id] = savedCooldowns[id] ?? 0
      }
      bardAbilityStore.resonance = saved.bardAbility?.resonance ?? 0
      bardAbilityStore.resonanceProgress = saved.bardAbility?.resonanceProgress ?? 0
      bardAbilityStore.buffs = ((saved.bardAbility?.buffs ?? []) as BardAbilityBuff[])
        .filter((b) => b.expiresAt > bardNow)
        .map((b) => ({ ...b }))
      bardAbilityStore.stasisUntil =
        (saved.bardAbility?.stasisUntil ?? 0) > bardNow ? saved.bardAbility.stasisUntil : 0
      bardAbilityStore.totalCasts = saved.bardAbility?.totalCasts ?? 0
      bardAbilityStore.totalAbilityDamage = saved.bardAbility?.totalAbilityDamage ?? 0
      bardAbilityStore.totalAbilityHealing = saved.bardAbility?.totalAbilityHealing ?? 0

      // Chronicle. Steht bewusst NACH allen Stores, deren Zahlen es misst, und
      // VOR der CPS-Neuberechnung darunter: der stille Nachlauf kann eine Stufe
      // setzen, die den Produktions-Multiplikator anhebt.
      //
      // Der Nachlauf ist keine Bequemlichkeit, sondern nötig: ein Spielstand,
      // der älter ist als das Chronicle, bringt keine `stages` mit und erfüllt
      // auf einen Schlag ein halbes Buch. Ohne ihn liefe beim ersten Takt eine
      // Kette von Bannern über den Bildschirm.
      const achievementStore = useAchievementStore()
      achievementStore.stages = { ...(saved.chronicle?.stages ?? {}) }
      achievementStore.unseen = [...(saved.chronicle?.unseen ?? [])]
      achievementStore.syncSilently()

      // Omens. Steht ebenfalls nach allen Stores, deren Zahlen ein laufendes
      // Vorzeichen misst. Abgelaufene Buffs werden hier gleich ausgesiebt: sie
      // tragen absolute Zeitstempel, und ein Spielstand von gestern brächte
      // sonst eine Reihe toter Chips mit, die erst der nächste Takt aufräumt.
      const omenStoreLoad = useOmenStore()
      const savedOmens = saved.omens
      omenStoreLoad.active = savedOmens?.active ? { ...savedOmens.active } : null
      omenStoreLoad.buffs = (savedOmens?.buffs ?? []).filter((b) => b.expiresAt > gameNow())
      omenStoreLoad.offerCooldownSec = savedOmens?.offerCooldownSec ?? OMEN_FIRST_OFFER_DELAY_SEC
      omenStoreLoad.totalOmensCompleted = savedOmens?.totalOmensCompleted ?? 0
      omenStoreLoad.totalOmensSwift = savedOmens?.totalOmensSwift ?? 0
      omenStoreLoad.omenNow = gameNow()

      // Providence. Ein Spielstand von vor diesem Feature hat keine — der Lauf
      // steht dann unter keiner Vorsehung, alle Effektgetter geben 1 zurück.
      // Geprüft wird nur, ob überhaupt Effekte dranhängen: ein Eintrag ohne sie
      // (Spielstand aus der ID-Zeit, halb geschriebenes Objekt) soll wirkungslos
      // sein und nicht als Vorsehung ohne Wirkung im Tooltip stehen.
      const providenceStoreLoad = useProvidenceStore()
      const savedProvidence = saved.providence?.active
      providenceStoreLoad.active =
        savedProvidence && typeof savedProvidence === 'object' && savedProvidence.effects
          ? { ...savedProvidence }
          : null

      // Recalculate derived CPS/CPC after all levels (buildings + solar + forge) are restored
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()

      // Spielstand ohne Basislinie: sie wird jetzt gesetzt — also erst, nachdem
      // Galaxie-, Stern- und Boss-Zähler wiederhergestellt sind, sonst stünde
      // sie auf den Nullen der frischen Stores und der Tooltip zeigte die
      // Lebenszeitwerte als „in diesem Universum".
      if (!universeRunRestored) gameStore.beginUniverseRun()

      // ── Offline Progress ─────────────────────────────────────────────────────
      // Wanduhr: gemessen wird die Abwesenheit des Spielers, nicht der Lauf der
      // Spielwelt.
      const now = Date.now()
      const savedAt = saved.savedAt as number | undefined
      if (savedAt && typeof savedAt === 'number') {
        const rawSeconds = Math.floor((now - savedAt) / 1000)
        const maxOfflineHours =
          OFFLINE_MAX_HOURS +
          starForgeStore.offlineMaxHoursBonus +
          meepTreeStore.fx.offlineMaxHoursBonus
        const cappedSeconds = Math.min(rawSeconds, maxOfflineHours * SECONDS_PER_HOUR)
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
          gameStore.totalOfflineChimes += earned
          gameStore.totalOfflineSeconds += cappedSeconds
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
    gameStore.chimesPerClick = CHIMES_PER_CLICK_BASE
    gameStore.baseChimesPerClick = CHIMES_PER_CLICK_BASE
    gameStore.chimesForNextLevel = LEVEL_BASE
    gameStore.chimesForNextUniverse = 0
    gameStore.bestUniverseRunChimes = 0
    gameStore.meepsDevoured = 0
    gameStore.runMeepCostFloor = 1
    gameStore.chimesToUniverseRescue = UNIVERSE_RESCUE_INITIAL_COST
    gameStore.meeps = 0
    gameStore.chimesEarnedForLevel = 0
    gameStore.level = 1
    gameStore.skillPoints = 0
    gameStore.abilityLevels = [0, 0, 0, 0]
    gameStore.activeAugments = []
    gameStore.pendingAugmentChoice = false
    gameStore.pendingAugmentOptions = []
    gameStore.autoPickAugments = false
    gameStore.lastAutoPick = { id: '', at: 0, seq: 0 }
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
    gameStore.totalMeepsEarned = 0
    gameStore.totalMeepsSpent = 0
    gameStore.totalMeepsDevoured = 0
    gameStore.totalPrestiges = 0
    gameStore.totalOfflineChimes = 0
    gameStore.totalOfflineSeconds = 0
    gameStore.universeRuns = []
    // Basislinie erst am Ende von resetGame setzen — hier stehen die Zähler der
    // anderen Stores noch auf ihren alten Werten (siehe unten).

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
    battleStore.peakMmr = 1000
    battleStore.totalLpGained = 0
    battleStore.totalLpLost = 0
    battleStore.currentRank = { tier: 'Iron', division: 'IV', lp: 0 }
    battleStore.tierReachedAt = {}
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
    battleStore.stopRequested = false
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
    useSkinStore().resetSkins()
    const inventoryStore = useInventoryStore()
    inventoryStore.$reset()
    const expeditionStore = useExpeditionStore()
    expeditionStore.$reset()
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

    // 7f. Reset championLevelStore — a full wipe drops champion levels too;
    // prestige alone never touches them.
    useChampionLevelStore().resetAll()

    // 7g. Reset drifterStore — clears the sky and every running buff
    useDrifterStore().$reset()

    // 7g2. Reset voidStore — closes any open rift and drops every aftermath
    useVoidStore().$reset()

    // 7h. Reset bardAbilityStore — resonance, cooldowns and any running stasis
    useBardAbilityStore().$reset()

    // 7i. Reset achievementStore — a full wipe unwrites the Chronicle. Prestige
    // never does: its milestones are lifetime records and outlive a universe.
    useAchievementStore().$reset()

    // 7j. Reset omenStore — clears the running omen, the offer and every buff.
    useOmenStore().$reset()

    // 7k. Reset providenceStore — a full wipe puts the wanderer back on the
    // first run, which stands under no providence at all. Prestige never does:
    // there the next one is chosen before the reset runs.
    useProvidenceStore().$reset()

    // 7b. Reset planetShopStore – alle Slots zurücksetzen
    const planetShopStoreR = usePlanetShopStore()
    planetShopStoreR.slots.forEach((s) => {
      s.purchased = false
      s.role = null
      s.level = 1
      s.maxHp = computePlanetMaxHp(1)
      s.currentHp = s.maxHp
      s.downUntilMs = 0
      s.healingUntilMs = 0
      s.jungleBuff = null
    })
    planetShopStoreR.activeRoleModalSlotId = null

    // 8. Recalculate CPS/CPC from clean state
    gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
    gameStore.chimesPerClick = shopStore.calculateTotalCPC()

    // 8b. Neue Basislinie auf den frisch genullten Zählern
    gameStore.beginUniverseRun()

    // 9. Re-start CPS tracking
    cpsStore.startProductionTracking()

    // 10. Clear localStorage
    localStorage.removeItem(SAVE_KEY)
  }

  return { saveGame, loadGame, resetGame }
}
