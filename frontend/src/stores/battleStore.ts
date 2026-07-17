import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'
import { useAugmentStore } from './augmentStore'
import {
  createEmptyAllyRows,
  ELO_K_FACTOR,
  ELO_RATING_SCALE,
  ELO_LUCK_FACTOR,
  AUTO_BATTLE_INTERVAL_MS,
  MMR_TO_POWER_MULTIPLIER,
  RANK_DIVISIONS,
  RANK_TIERS,
  LP_NORMAL_PROMOTION_THRESHOLD,
  LP_MASTER_PROMOTION_THRESHOLD,
  LP_GRANDMASTER_PROMOTION_THRESHOLD,
  LP_DEMOTION_VALUE,
  LP_MASTER_DEMOTION_VALUE,
  LP_GRANDMASTER_DEMOTION_VALUE,
  LP_BASE_CHANGE,
  OPPONENT_MMR_VARIANCE,
  BATTLE_TIME_MIN_SECONDS,
  BATTLE_TIME_RANGE_SECONDS,
  MMR_RANK_THRESHOLDS,
  BATTLE_TOTAL_GAME_SECONDS,
  GAME_TICK_INTERVAL_MS,
  BATTLE_RESULT_COUNTDOWN_SECONDS,
  BATTLE_RESULT_PAUSE_MS,
  BATTLE_COUNTDOWN_INTERVAL_MS,
  PLANET_SEARCH_ANIM_DURATION_MS,
  PLANET_SEARCH_ANIM_FALLBACK_MARGIN_MS,
  BATTLE_DRAIN_REFERENCE_SECONDS,
  BATTLE_OPPONENT_POWER_MIN_FRACTION,
  BATTLE_BIG_BANG_POWER_MULTIPLIER,
  BATTLE_INITIAL_MMR,
  BATTLE_DEFAULT_RANK_TIER,
  BATTLE_KILL_LOG_THROTTLE_MS,
  DRAKE_OBJECTIVE_HP,
  BARON_OBJECTIVE_HP,
  OBJECTIVE_BASE_DPS_PER_CHAMP,
  OBJECTIVE_CLICK_DAMAGE,
  OBJECTIVE_BARON_WIN_BONUS,
  DRAKE_MOUNTAIN_DPS_MULT,
  DRAKE_CHEMTECH_ENEMY_DPS_MULT,
  DRAKE_HEXTECH_CLICK_MULT,
  DRAKE_CLOUD_RESPAWN_MULT,
  DRAKE_OCEAN_LOSS_PENALTY_MULT,
  DRAKE_ELDER_LP_BONUS,
  DRAKE_INFERNAL_BURN_DPS,
  BARON_LP_LOSS_SHIELD_MULT,
  BARON_BOUNTY_PRODUCTION_SECONDS,
  BARON_BOUNTY_MIN_CLICKS,
  OBJECTIVE_DPS_TICK_MS,
  OBJECTIVE_DPS_VARIANCE,
  OBJECTIVE_FIGHTER_WEIGHT_MIN,
  OBJECTIVE_FIGHTER_WEIGHT_MAX,
  OBJECTIVE_MAX_DURATION_MS,
  OBJECTIVE_RESULT_DELAY_MS,
  OBJECTIVE_ROLE_MAX_HP,
  OBJECTIVE_AOE_DPS_DRAKE,
  OBJECTIVE_AOE_DPS_BARON,
  OBJECTIVE_ABILITY_TICK_S,
  OBJECTIVE_ABILITY_CD_S,
  OBJECTIVE_ABILITY_DURATION_S,
  OBJECTIVE_ABILITY_FIRST_CAST_OFFSET_S,
  OBJECTIVE_ADC_CRIT_CHANCE,
  OBJECTIVE_ADC_CRIT_MULT,
  OBJECTIVE_MID_CURSE_DPS,
  OBJECTIVE_SUPPORT_MEND_HEAL,
  OBJECTIVE_JUNGLE_BUFF_MULT,
  OBJECTIVE_TOP_TAUNT_TARGETS,
  HONOR_MAX_SELECTIONS,
  HONOR_TRIBUTE_PRODUCTION_SECONDS,
  HONOR_TRIBUTE_MIN_CLICKS,
  HONOR_MVP_TRIBUTE_MULT,
  HONOR_LOSS_TRIBUTE_MULT,
  HONOR_SCORE_HEAL_DIV,
  HONOR_SCORE_TANK_DIV,
  HONOR_SCORE_WARD_WEIGHT,
  HONOR_WEIGHT_EXP,
  HONOR_OWN_TEAM_WEIGHT_MULT,
  HONOR_ENEMY_TEAM_WEIGHT_MULT,
  MVP_OWN_TEAM_SCORE_MULT,
  MVP_ENEMY_TEAM_SCORE_MULT,
  MOVE_RESPAWN_WALK_SECONDS,
  STRUCTURE_FEED_MAX,
  KILL_FEED_MAX,
  WINPROB_MIN,
  WINPROB_MAX,
  BATTLE_BASE_START_WIN_CHANCE,
} from '../config/constants'
import { DRAKE_TYPES, type DrakeTypeId } from '../config/drakes'
import type {
  AllTimeBattleStats,
  BattleEvent,
  BattleResult,
  BattleRole,
  BattleTimeline,
  ChampionCareerStats,
  ChampionState,
  KillFeedEntry,
  LiveBattleStats,
  ObjectiveFighter,
  ObjectiveOverride,
  RecruitableChampion,
  StructureFeedEntry,
  StructureId,
} from '../types'
import {
  BATTLE_ROLES,
  bountyGold,
  championNoise,
  continuousStatsAt,
  generateTimeline,
  mvpScore,
  reseedTimelineFrom,
} from '../utils/battleTimeline'
import { fetchChampionNames } from '../utils/champions'
import { logger } from '../utils/logger'
import { CHAMPION_HOME_PLANETS } from '../config/championHomePlanets'
import { logBattleStarted, logBattleEnded, logChampionDefeated } from '../config/gameEventLogger'

let _lastKillLogMs = 0
let _visibilityHandler: (() => void) | null = null

export function zeroLiveBattleStats(): LiveBattleStats {
  return {
    kills: 0,
    deaths: 0,
    assists: 0,
    cs: 0,
    gold: 0,
    damage: 0,
    healing: 0,
    damageTaken: 0,
    wardsPlaced: 0,
    wardsKilled: 0,
    controlWards: 0,
    multikills: { double: 0, triple: 0, quadra: 0, penta: 0 },
    largestSpree: 0,
    firstBloods: 0,
    soloKills: 0,
    dragons: 0,
    barons: 0,
    turrets: 0,
    inhibitors: 0,
    battleSeconds: 0,
  }
}

export function defaultAllTimeStats(): AllTimeBattleStats {
  return {
    killParticipationSum: 0,
    killParticipationGames: 0,
    largestSpree: 0,
    firstBloods: 0,
    soloKills: 0,
    multikills: { double: 0, triple: 0, quadra: 0, penta: 0 },
    mvpAwards: 0,
    cs: 0,
    gold: 0,
    damage: 0,
    healing: 0,
    damageTaken: 0,
    dragons: 0,
    barons: 0,
    turrets: 0,
    inhibitors: 0,
    wardsPlaced: 0,
    wardsKilled: 0,
    controlWards: 0,
    visionScoreSum: 0,
    longestGameSeconds: 0,
    honorsGiven: 0,
  }
}

export function defaultChampionCareer(): ChampionCareerStats {
  return {
    battles: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    mvps: 0,
    damage: 0,
    gold: 0,
    cs: 0,
    healing: 0,
    damageTaken: 0,
    wardsPlaced: 0,
    honors: 0,
  }
}

export function makeChampionState(name: string, rank: string, roleIndex: number): ChampionState {
  return {
    name,
    rank,
    role: BATTLE_ROLES[roleIndex] ?? 'mid',
    kills: 0,
    deaths: 0,
    assists: 0,
    cs: 0,
    gold: 0,
    damage: 0,
    healing: 0,
    damageTaken: 0,
    wardsPlaced: 0,
    wardsKilled: 0,
    controlWards: 0,
    level: 1,
    items: 0,
    multikills: { double: 0, triple: 0, quadra: 0, penta: 0 },
    currentSpree: 0,
    largestSpree: 0,
    hpPercent: 100,
    respawnState: 'alive',
  }
}

function defaultBattleTrack() {
  return {
    firstBloodTeam1: false,
    soloKillsT1: 0,
    objectiveParticipationsT1: [0, 0, 0, 0, 0],
  }
}

export const useBattleStore = defineStore('battle', {
  state: () => ({
    mmr: BATTLE_INITIAL_MMR,
    currentRank: {
      tier: 'Iron',
      division: 'IV',
      lp: 0,
    },

    battleHistory: [] as BattleResult[],
    rankOrder: [...RANK_DIVISIONS] as string[],
    tierOrder: [...RANK_TIERS] as string[],

    autoBattleEnabled: false,
    autoBattleInterval: AUTO_BATTLE_INTERVAL_MS,
    autoBattleTimer: null as ReturnType<typeof setTimeout> | null,
    lastAutoBattleResult: null as BattleResult | null,

    lastMmrChange: 0,
    lastLpChange: 0,
    showAutoBattleResult: false,
    autoBattleOldMMR: 0,
    autoBattleOldLP: 0,
    autoBattleReady: true,

    battleTime: 0,
    ownedChampions: ['Bard'],
    teamSlotAssignments: [null, null, null, null] as (string | null)[],
    headerSlots: [null, null, null, null, null] as (string | null)[],
    secondarySlots: createEmptyAllyRows(),
    battleFormula: {
      luckFactor: ELO_LUCK_FACTOR,
    },

    totalBattles: 0,
    totalWins: 0,
    totalLosses: 0,
    totalKills: 0,
    totalDeaths: 0,
    totalAssists: 0,
    avgBattleTime: 0,
    totalBattleTime: 0,
    bestWinStreak: 0,
    currentWinStreak: 0,

    isAutoBattleInitialized: false,
    // Transient view flag: player peeks at the landing (career stats) screen
    // while a battle keeps simulating. Never persisted.
    isViewingLanding: false,
    battleEverStarted: false,
    currentBattleId: 0,
    timeUntilNextBattle: 0,
    countdownTimer: null as ReturnType<typeof setInterval> | null,
    team1: [] as ChampionState[],
    team2: [] as ChampionState[],
    timerIds: [] as ReturnType<typeof setTimeout>[],

    recruitableChampions: [] as RecruitableChampion[],
    recruitedChampions: [] as string[],
    newlyUnlockedChampions: [] as string[],

    battleSimIntervalId: null as ReturnType<typeof setInterval> | null,
    battlePhase: 'playing' as 'playing' | 'result',

    // ── Deterministic event timeline ──
    battleSeed: 0,
    initialWinProbability: 0.5,
    /** Permanent bonus on the battle-start win chance — raised by future upgrades. */
    startWinChanceBonus: 0,
    /** Bonus snapshotted at battle init so a mid-battle change can't shift the live bar. */
    battleStartBonus: 0,
    timeline: null as BattleTimeline | null,
    timelineCursor: 0,
    objectiveOverrides: [] as ObjectiveOverride[],
    killFeed: [] as KillFeedEntry[],
    activeFights: [] as Array<{ x: number; y: number; until: number }>,
    respawnUntil: { t1: [0, 0, 0, 0, 0], t2: [0, 0, 0, 0, 0] } as {
      t1: number[]
      t2: number[]
    },
    battleTrack: defaultBattleTrack(),
    // Derived from timeline replay — never persisted (rebuilt via applyTimelineUpTo)
    destroyedStructures: [] as StructureId[],
    structureFeed: [] as StructureFeedEntry[],
    team1Turrets: 0,
    team2Turrets: 0,
    team1Inhibs: 0,
    team2Inhibs: 0,
    team1Drakes: 0,
    team2Drakes: 0,
    team1Barons: 0,
    team2Barons: 0,
    nexusDestroyedByTeam: null as (1 | 2) | null,
    activeObjectiveParticipants: null as { t1: number[]; t2: number[] } | null,

    // ── All-time career stats ──
    allTime: defaultAllTimeStats(),
    // Per-champion career stats keyed by champion name (own champions only)
    championCareer: {} as Record<string, ChampionCareerStats>,
    honoredChampions: [] as string[],
    /** Guards the honor payout so a battle can never pay tribute twice. */
    honorsSettled: false,
    /** Admin/testing: when on, a random OWN champion is forced as MVP every battle. */
    adminForceOwnMvp: false,

    drakeAlive: true,
    drakeKilledByTeam: null as (1 | 2) | null,
    drakeEventTime: 0,
    baronAlive: true,
    baronKilledByTeam: null as (1 | 2) | null,
    baronEventTime: 0,
    /** Type of the most recently spawned/contested drake (re-derived from event replay). */
    activeDrakeType: null as DrakeTypeId | null,
    /** Drake types secured by team 1 this battle — battle-scoped buffs (unique). */
    drakeBuffs: [] as DrakeTypeId[],
    /** Drake types secured by team 2 this battle — display only, no mechanical effect. */
    drakeBuffsT2: [] as DrakeTypeId[],
    objectiveModalOpen: false,
    activeObjective: null as 'drake' | 'baron' | null,
    objectiveHP: 0,
    objectiveMaxHP: 0,
    objectiveResult: null as 'player' | 'own' | 'enemy' | null,
    objectiveWinDelta: 0,
    // ── Frozen-time objective damage race ──
    objectiveFreezeStartMs: 0,
    objectiveFightStartMs: 0,
    objectiveOwnDamage: 0,
    objectiveEnemyDamage: 0,
    objectivePlayerDamage: 0,
    objectiveAliveCounts: null as { own: number; enemy: number } | null,
    objectiveFighters: null as { t1: ObjectiveFighter[]; t2: ObjectiveFighter[] } | null,
    /** Fighter idx currently holding the jungle's Wild Rally buff per side */
    objectiveBuffTarget: { own: null, enemy: null } as { own: number | null; enemy: number | null },
    /** Cumulative Hex Curse damage per side this fight (transient, drives the boss curse mark) */
    objectiveCurseDamage: { own: 0, enemy: 0 } as { own: number; enemy: number },
    /** Permanent Hex Curse stacks per side — every mid cast adds one for the rest of the fight */
    objectiveCurseStacks: { own: 1, enemy: 1 } as { own: number; enemy: number },
    /** How long the resolved fight ran (ms) — shown in the post-fight summary */
    objectiveFightDurationMs: 0,
    _objectiveCloseTimeoutId: null as ReturnType<typeof setTimeout> | null,
    _objectiveIntervalId: null as ReturnType<typeof setInterval> | null,
    _objAbilityAccumMs: 0,
    battlePhaseStartTimestamp: 0,
    resultPhaseStartTimestamp: 0,
    searchingPhaseStartTimestamp: 0,
    autoBattleTimerEndTimestamp: 0,
    simulationReadyToStart: false,
    resultCountdown: 0,
    resultCountdownTimer: null as ReturnType<typeof setInterval> | null,
    predeterminedWin: null as boolean | null,
    currentWinProbability: 0 as number,
    currentOpponentLabel: '',
  }),

  getters: {
    selectedChampions: (state) => state.teamSlotAssignments.filter((s): s is string => s !== null),
    assignedChampions: (state): string[] => {
      const out: string[] = []
      for (const name of state.headerSlots) if (name) out.push(name)
      for (const row of state.secondarySlots) {
        for (const name of row) if (name) out.push(name)
      }
      return out
    },
    /** Mountain buff: own team DPS multiplier in later objective fights. */
    objectiveOwnDpsMult: (state): number =>
      state.drakeBuffs.includes('mountain') ? DRAKE_MOUNTAIN_DPS_MULT : 1,
    /** Chemtech buff: enemy team DPS multiplier in later objective fights. */
    objectiveEnemyDpsMult: (state): number =>
      state.drakeBuffs.includes('chemtech') ? DRAKE_CHEMTECH_ENEMY_DPS_MULT : 1,
    /** Hextech buff: player click damage in objective fights. */
    objectiveClickDamage: (state): number =>
      OBJECTIVE_CLICK_DAMAGE * (state.drakeBuffs.includes('hextech') ? DRAKE_HEXTECH_CLICK_MULT : 1),
    /** Cloud buff: ally respawn time multiplier for the rest of the battle. */
    allyRespawnMult: (state): number =>
      state.drakeBuffs.includes('cloud') ? DRAKE_CLOUD_RESPAWN_MULT : 1,
    /** Infernal buff: flat burn DPS credited to the own side in later objective fights. */
    objectiveBurnDps: (state): number =>
      state.drakeBuffs.includes('infernal') ? DRAKE_INFERNAL_BURN_DPS : 0,
    /** Hand of Baron: the own team slew the baron this battle. */
    hasHandOfBaron: (state): boolean => state.baronKilledByTeam === 1,
    /** Spawn time of the next drake in the chain still ahead of the clock, -1 when none remains. */
    nextDrakeSpawnT: (state): number => {
      const next = state.timeline?.events.find(
        (e) => e.type === 'objectiveSpawn' && e.objective === 'drake' && e.t > state.battleTime,
      )
      return next?.t ?? -1
    },
    /** Admin shortcut target: the full game-minute before the next upcoming drake spawn. */
    drakeJumpTarget: (state): number => {
      const next = state.timeline?.events.find(
        (e) => e.type === 'objectiveSpawn' && e.objective === 'drake' && e.t > state.battleTime,
      )
      if (!next) return -1
      return Math.floor((next.t - 1) / 60) * 60
    },
    baronJumpTarget: (state): number => {
      if (state.baronEventTime <= 0) return -1
      return Math.floor((state.baronEventTime - 1) / 60) * 60
    },
    /** Live victory momentum: starts at the battle's starting win chance, shifts with every event's winProbDelta */
    liveWinMomentum: (state): number => {
      const start = BATTLE_BASE_START_WIN_CHANCE + state.battleStartBonus
      const raw = start + (state.currentWinProbability - state.initialWinProbability)
      return Math.max(WINPROB_MIN, Math.min(WINPROB_MAX, raw))
    },
    /** What the momentum bar will show when the next battle begins — base 50% plus upgrade bonus. */
    nextBattleStartWinChance: (state): number => {
      const raw = BATTLE_BASE_START_WIN_CHANCE + state.startWinChanceBonus
      return Math.max(WINPROB_MIN, Math.min(WINPROB_MAX, raw))
    },
    team1Kills: (state): number => state.team1.reduce((s, c) => s + c.kills, 0),
    team2Kills: (state): number => state.team2.reduce((s, c) => s + c.kills, 0),
    team1Gold: (state): number => state.team1.reduce((s, c) => s + c.gold, 0),
    team2Gold: (state): number => state.team2.reduce((s, c) => s + c.gold, 0),
    team1AvgLevel: (state): number => {
      const filled = state.team1.filter((c) => c.name)
      if (!filled.length) return 1
      return Math.round(filled.reduce((s, c) => s + c.level, 0) / filled.length)
    },
    team2AvgLevel: (state): number => {
      const filled = state.team2.filter((c) => c.name)
      if (!filled.length) return 1
      return Math.round(filled.reduce((s, c) => s + c.level, 0) / filled.length)
    },
    winRate: (state): number =>
      state.totalBattles > 0 ? (state.totalWins / state.totalBattles) * 100 : 0,
    careerKda: (state): number =>
      state.totalDeaths > 0
        ? (state.totalKills + state.totalAssists) / state.totalDeaths
        : state.totalKills + state.totalAssists,
    avgKillParticipation: (state): number =>
      state.allTime.killParticipationGames > 0
        ? state.allTime.killParticipationSum / state.allTime.killParticipationGames
        : 0,
    avgVisionScore: (state): number =>
      state.allTime.killParticipationGames > 0
        ? state.allTime.visionScoreSum / state.allTime.killParticipationGames
        : 0,
    csPerMinute: (state): number =>
      state.totalBattleTime > 0 ? state.allTime.cs / (state.totalBattleTime / 60) : 0,
    goldPerMinute: (state): number =>
      state.totalBattleTime > 0 ? state.allTime.gold / (state.totalBattleTime / 60) : 0,
    damagePerMinute: (state): number =>
      state.totalBattleTime > 0 ? state.allTime.damage / (state.totalBattleTime / 60) : 0,
    // battlePhaseStartTimestamp > 0 guards the window where clearBattle() has
    // already flipped the phase back to 'playing' but the old team stats were
    // just accumulated into allTime (prevents double counting on the landing).
    isBattleInProgress: (state): boolean =>
      state.isAutoBattleInitialized &&
      state.battlePhase === 'playing' &&
      state.battlePhaseStartTimestamp > 0,
    // Display-only totals of the running battle, mirroring accumulateBattleStats().
    liveBattleStats(state): LiveBattleStats {
      const live = zeroLiveBattleStats()
      if (!this.isBattleInProgress) return live
      for (const champ of state.team1) {
        if (!champ.name) continue
        live.kills += champ.kills
        live.deaths += champ.deaths
        live.assists += champ.assists
        live.cs += champ.cs
        live.gold += champ.gold
        live.damage += champ.damage
        live.healing += champ.healing
        live.damageTaken += champ.damageTaken
        live.wardsPlaced += champ.wardsPlaced
        live.wardsKilled += champ.wardsKilled
        live.controlWards += champ.controlWards
        live.multikills.double += champ.multikills.double
        live.multikills.triple += champ.multikills.triple
        live.multikills.quadra += champ.multikills.quadra
        live.multikills.penta += champ.multikills.penta
        live.largestSpree = Math.max(live.largestSpree, champ.largestSpree)
      }
      live.firstBloods = state.battleTrack.firstBloodTeam1 ? 1 : 0
      live.soloKills = state.battleTrack.soloKillsT1
      live.dragons = state.team1Drakes
      live.barons = state.team1Barons
      live.turrets = state.team1Turrets
      live.inhibitors = state.team1Inhibs
      live.battleSeconds = state.battleTime
      return live
    },
  },

  actions: {
    getChampionImage(name: string) {
      switch (name) {
        case 'Bard':
          return '/img/BardAbilities/Bard.png'
        default:
          return '/img/champion/' + name + '.jpg'
      }
    },

    addRecruitableChampion(
      name: string,
      materialCost: Record<string, number>,
      chimesPrice: number,
    ) {
      if (this.ownedChampions.includes(name)) return
      if (this.recruitableChampions.some((c) => c.name === name)) return
      if (this.recruitedChampions.includes(name)) return
      this.recruitableChampions.push({
        name,
        materialCost,
        discoveredAt: Date.now(),
        chimesPrice,
      })
      this.newlyUnlockedChampions.push(name)
    },

    dismissNewChampion(name: string) {
      const idx = this.newlyUnlockedChampions.indexOf(name)
      if (idx >= 0) this.newlyUnlockedChampions.splice(idx, 1)
    },

    unlockAllChampions() {
      for (const config of CHAMPION_HOME_PLANETS) {
        if (!this.ownedChampions.includes(config.championName)) {
          this.ownedChampions.push(config.championName)
          this.recruitedChampions.push(config.championName)
        }
        this.recruitableChampions = this.recruitableChampions.filter(
          (c) => c.name !== config.championName,
        )
      }
    },

    addAllRecruitableChampions() {
      for (const config of CHAMPION_HOME_PLANETS) {
        this.addRecruitableChampion(config.championName, config.materialCost, config.chimesPrice)
      }
    },

    recruitChampion(name: string): boolean {
      const recruit = this.recruitableChampions.find((c) => c.name === name)
      if (!recruit) return false
      const inventoryStore = useInventoryStore()
      if (!inventoryStore.hasMaterials(recruit.materialCost)) return false
      const gameStore = useGameStore()
      if (gameStore.chimes < recruit.chimesPrice) return false
      inventoryStore.removeMaterials(recruit.materialCost)
      gameStore.chimes -= recruit.chimesPrice
      this.ownedChampions.push(name)
      this.recruitedChampions.push(name)
      this.recruitableChampions = this.recruitableChampions.filter((c) => c.name !== name)
      this.dismissNewChampion(name)
      logger.info('Battle', `Recruited: ${name}`, { materialCost: recruit.materialCost, chimesPrice: recruit.chimesPrice })
      return true
    },

    assignToSlot(slotIndex: number, championName: string) {
      const existing = this.teamSlotAssignments.indexOf(championName)
      if (existing !== -1) this.teamSlotAssignments[existing] = null
      this.teamSlotAssignments[slotIndex] = championName
      this.syncTeam1ToSlots()
    },

    removeFromSlot(slotIndex: number) {
      this.teamSlotAssignments[slotIndex] = null
      this.syncTeam1ToSlots()
    },

    removeChampionFromSlots(championName: string) {
      const idx = this.teamSlotAssignments.indexOf(championName)
      if (idx !== -1) this.teamSlotAssignments[idx] = null
      this.syncTeam1ToSlots()
    },

    setHeaderSlot(slotIndex: number, champion: string) {
      const existing = this.headerSlots.indexOf(champion)
      if (existing !== -1 && existing !== slotIndex) this.headerSlots[existing] = null
      for (let r = 0; r < this.secondarySlots.length; r++) {
        for (let s = 0; s < this.secondarySlots[r].length; s++) {
          if (this.secondarySlots[r][s] === champion) this.secondarySlots[r][s] = null
        }
      }
      this.headerSlots[slotIndex] = champion
      this.syncTeam1ToSlots()
    },

    clearHeaderSlot(slotIndex: number) {
      this.headerSlots[slotIndex] = null
      this.syncTeam1ToSlots()
    },

    setSecondarySlot(roleIndex: number, subIndex: number, champion: string) {
      const mainIdx = this.headerSlots.indexOf(champion)
      if (mainIdx !== -1) this.headerSlots[mainIdx] = null
      for (let r = 0; r < this.secondarySlots.length; r++) {
        for (let s = 0; s < this.secondarySlots[r].length; s++) {
          if (this.secondarySlots[r][s] === champion && !(r === roleIndex && s === subIndex)) {
            this.secondarySlots[r][s] = null
          }
        }
      }
      this.secondarySlots[roleIndex][subIndex] = champion
      this.syncTeam1ToSlots()
    },

    clearSecondarySlot(roleIndex: number, subIndex: number) {
      this.secondarySlots[roleIndex][subIndex] = null
      this.syncTeam1ToSlots()
    },

    syncTeam1ToSlots() {
      this.team1 = this.headerSlots.map((slot, i) => {
        if (!slot) return makeChampionState('', BATTLE_DEFAULT_RANK_TIER, i)
        const existing = this.team1.find((c) => c.name === slot)
        if (existing) {
          existing.role = BATTLE_ROLES[i] ?? 'mid'
          return existing
        }
        return makeChampionState(slot, BATTLE_DEFAULT_RANK_TIER, i)
      })
    },

    getAvgBattleTime(): string {
      return this.formatTime(Math.round(this.totalBattleTime / this.totalBattles) || 0)
    },

    startBattleSimulation(resume = false) {
      // Always set timestamp fresh — regardless of whether resuming or not.
      // On resume, elapsed real time is correctly mapped
      // by battlePhaseStartTimestamp (set in beginSimulation).
      if (!resume) {
        this.battlePhaseStartTimestamp = Date.now()
      }
      if (this.battleSimIntervalId) clearInterval(this.battleSimIntervalId)
      this.battleSimIntervalId = setInterval(() => {
        const realElapsedS = (Date.now() - this.battlePhaseStartTimestamp) / 1000
        // floor(realS) * 60 statt floor(realS * 60): hält battleTime immer
        // minutengenau. Sub-Sekunden-Versatz des Ankers (Objective-Freeze-Slide,
        // verzögerte Ticks, Tab-Resume) würde sonst dauerhaft krumme Zeiten
        // wie 17:31 erzeugen — asynchron zur minutengerundeten Scoreboard-Anzeige.
        const newBattleTime = Math.floor(realElapsedS) * 60
        this.applyTimelineUpTo(newBattleTime)
        this.battleTime = newBattleTime

        if (this.battleTime >= BATTLE_TOTAL_GAME_SECONDS) {
          clearInterval(this.battleSimIntervalId!)
          this.battleSimIntervalId = null
          this.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
          this.battleTime = BATTLE_TOTAL_GAME_SECONDS
          this.battlePhase = 'result'
          logBattleEnded(this.predeterminedWin ?? false)
          if (this.autoBattleTimer) {
            clearTimeout(this.autoBattleTimer)
            this.autoBattleTimer = null
          }
          this._clearObjectiveModal()
          this.runBattleCycle()
        }
      }, GAME_TICK_INTERVAL_MS)
    },

    /**
     * Applies every timeline event with t <= gameTime exactly once and refreshes
     * the closed-form continuous stats. Serves live ticks, background catch-up,
     * time jumps and skip-to-end alike.
     */
    applyTimelineUpTo(gameTime: number) {
      if (!this.timeline) return
      const events = this.timeline.events
      while (this.timelineCursor < events.length && events[this.timelineCursor].t <= gameTime) {
        this._applyEvent(events[this.timelineCursor], gameTime)
        this.timelineCursor++
      }
      this._refreshContinuousStats(gameTime)
      this._refreshRespawnStates(gameTime)
      this.activeFights = this.activeFights.filter((f) => f.until > gameTime)
    },

    _applyEvent(e: BattleEvent, targetGameTime: number) {
      switch (e.type) {
        case 'kill': {
          const attackers = e.team === 1 ? this.team1 : this.team2
          const defenders = e.team === 1 ? this.team2 : this.team1
          const killer = attackers[e.killerIdx ?? 0]
          const victim = defenders[e.victimIdx ?? 0]
          if (!killer || !victim) break
          killer.kills += 1
          killer.currentSpree += 1
          killer.largestSpree = Math.max(killer.largestSpree, killer.currentSpree)
          if (e.multikillTier) {
            const key = (['double', 'triple', 'quadra', 'penta'] as const)[e.multikillTier - 2]
            killer.multikills[key] += 1
          }
          for (const idx of e.assistIdxs ?? []) {
            if (attackers[idx] && idx !== e.killerIdx) attackers[idx].assists += 1
          }
          victim.deaths += 1
          victim.currentSpree = 0
          const untilArr = e.team === 1 ? this.respawnUntil.t2 : this.respawnUntil.t1
          // Cloud buff shortens only the own team's respawn walk (victims of team-2 kills)
          const walkSeconds =
            e.team === 2
              ? Math.round(MOVE_RESPAWN_WALK_SECONDS * this.allyRespawnMult)
              : MOVE_RESPAWN_WALK_SECONDS
          untilArr[e.victimIdx ?? 0] = e.t + walkSeconds
          if (e.team === 1) {
            if (e.firstBlood) this.battleTrack.firstBloodTeam1 = true
            if (e.soloKill) this.battleTrack.soloKillsT1 += 1
          }
          if (killer.name && victim.name) {
            const assistNames = (e.assistIdxs ?? [])
              .filter((idx) => idx !== e.killerIdx)
              .map((idx) => attackers[idx]?.name)
              .filter((name): name is string => !!name)
            this.killFeed.push({
              killerName: killer.name,
              victimName: victim.name,
              killerTeam: (e.team ?? 1) as 1 | 2,
              multikillTier: e.multikillTier,
              firstBlood: e.firstBlood,
              soloKill: e.soloKill,
              assistNames: assistNames.length ? assistNames : undefined,
              t: e.t,
            })
            if (this.killFeed.length > KILL_FEED_MAX)
              this.killFeed.splice(0, this.killFeed.length - KILL_FEED_MAX)
            const now = Date.now()
            if (now - _lastKillLogMs >= BATTLE_KILL_LOG_THROTTLE_MS) {
              _lastKillLogMs = now
              logChampionDefeated(killer.name, victim.name)
            }
          }
          this._shiftWinProbability(e.winProbDelta)
          break
        }
        case 'fightStart': {
          if (e.location) {
            this.activeFights.push({ x: e.location.x, y: e.location.y, until: e.t + 120 })
          }
          break
        }
        case 'fightEnd': {
          break
        }
        case 'objectiveSpawn': {
          if (!e.objective) break
          if (e.objective === 'drake') {
            this.drakeAlive = true
            this.drakeKilledByTeam = null
            this.drakeEventTime = e.t
            this.activeDrakeType = e.drakeType ?? 'infernal'
          } else {
            this.baronAlive = true
            this.baronKilledByTeam = null
            this.baronEventTime = e.t
          }
          // Only open the interactive modal when the scripted result is still ahead —
          // during background catch-up spawn+result apply together and no modal opens.
          const resultStillAhead = this.timeline!.events.some(
            (ev) => ev.type === 'objectiveResult' && ev.objective === e.objective && ev.t > targetGameTime,
          )
          // Hidden tabs skip the interactive fight — background catch-up keeps
          // using the scripted objectiveResult instead of freezing time unseen.
          if (resultStillAhead && !this.objectiveModalOpen && !document.hidden) {
            this._openObjectiveModal(e.objective, e.participants ?? null)
          }
          break
        }
        case 'objectiveResult': {
          if (!e.objective || !e.team) break
          this._creditObjective(e.objective, e.team, e.participants ?? null, e.drakeType)
          this._shiftWinProbability(e.winProbDelta)
          if (this.objectiveModalOpen && this.activeObjective === e.objective) {
            this._finishObjectiveModal(e.team === 1 ? 'own' : 'enemy')
          }
          break
        }
        case 'turret': {
          if (e.team === 1) this.team1Turrets += 1
          else this.team2Turrets += 1
          this._shiftWinProbability(e.winProbDelta)
          this._recordStructureFall(e)
          break
        }
        case 'inhibitor': {
          if (e.team === 1) this.team1Inhibs += 1
          else this.team2Inhibs += 1
          this._shiftWinProbability(e.winProbDelta)
          this._recordStructureFall(e)
          break
        }
        case 'nexus': {
          this.nexusDestroyedByTeam = (e.team ?? this.timeline?.winner ?? 1) as 1 | 2
          // the slam delta pins the momentum bar to the winner's end
          this._shiftWinProbability(e.winProbDelta)
          break
        }
      }
    },

    _recordStructureFall(e: BattleEvent) {
      if (!e.structureId || !e.structureTier || !e.team) return
      if (this.destroyedStructures.includes(e.structureId)) return
      this.destroyedStructures.push(e.structureId)
      this.structureFeed.push({ id: e.structureId, tier: e.structureTier, team: e.team, lane: e.lane, t: e.t })
      if (this.structureFeed.length > STRUCTURE_FEED_MAX) {
        this.structureFeed.splice(0, this.structureFeed.length - STRUCTURE_FEED_MAX)
      }
    },

    _shiftWinProbability(delta: number) {
      if (delta === 0) return
      this.currentWinProbability = Math.max(WINPROB_MIN, Math.min(WINPROB_MAX, this.currentWinProbability + delta))
    },

    _creditObjective(
      objective: 'drake' | 'baron',
      team: 1 | 2,
      participants: { t1: number[]; t2: number[] } | null,
      drakeType?: DrakeTypeId | null,
    ) {
      if (objective === 'drake') {
        this.drakeAlive = false
        this.drakeKilledByTeam = team
        if (team === 1) this.team1Drakes += 1
        else this.team2Drakes += 1
        // battle-scoped drake buff — unique push keeps replay/persist idempotent
        if (team === 1 && drakeType && !this.drakeBuffs.includes(drakeType)) {
          this.drakeBuffs.push(drakeType)
        }
        if (team === 2 && drakeType && !this.drakeBuffsT2.includes(drakeType)) {
          this.drakeBuffsT2.push(drakeType)
        }
      } else {
        this.baronAlive = false
        this.baronKilledByTeam = team
        if (team === 1) this.team1Barons += 1
        else this.team2Barons += 1
      }
      for (const idx of participants?.t1 ?? []) {
        if (this.battleTrack.objectiveParticipationsT1[idx] !== undefined) {
          this.battleTrack.objectiveParticipationsT1[idx] += 1
        }
      }
    },

    _refreshContinuousStats(gameTime: number) {
      const refresh = (team: ChampionState[], teamNo: 1 | 2) => {
        for (let i = 0; i < team.length; i++) {
          const champ = team[i]
          if (!champ.name) continue
          const noise = championNoise(this.battleSeed, teamNo, i)
          const cont = continuousStatsAt(champ.role, noise, gameTime)
          champ.cs = cont.cs
          champ.gold = cont.goldPassive + bountyGold(champ.kills, champ.assists, cont.cs)
          champ.damage = cont.damage
          champ.healing = cont.healing
          champ.damageTaken = cont.damageTaken
          champ.wardsPlaced = cont.wardsPlaced
          champ.wardsKilled = cont.wardsKilled
          champ.controlWards = cont.controlWards
          champ.level = cont.level
          champ.items = cont.items
        }
      }
      refresh(this.team1, 1)
      refresh(this.team2, 2)
    },

    _refreshRespawnStates(gameTime: number) {
      const apply = (team: ChampionState[], until: number[], teamNo: number) => {
        for (let i = 0; i < team.length; i++) {
          const walking = until[i] > gameTime
          team[i].respawnState = walking ? 'walking-back' : 'alive'
          // cosmetic pseudo-HP, deterministic per champion and ~1.5s time slice
          team[i].hpPercent = walking
            ? 100
            : 35 + ((i * 53 + Math.floor(gameTime / 90) * 31 + teamNo * 17 + this.battleSeed % 97) % 66)
        }
      }
      apply(this.team1, this.respawnUntil.t1, 1)
      apply(this.team2, this.respawnUntil.t2, 2)
    },

    async loadChampions() {
      return fetchChampionNames()
    },

    async refreshTeams() {
      const champions = await this.loadChampions()
      const selected = this.getRandomChampions(champions, 5)
      this.team1 = this.headerSlots.map((slot, i) =>
        makeChampionState(slot ?? '', slot ? this.currentRank.tier : 'Silver', i),
      )
      this.team2 = selected.map((name, i) => makeChampionState(name, 'Silver', i))
    },

    /** Restore persisted team rosters (names + roles) without re-randomizing. */
    restoreTeams(t1: Array<{ name: string; role: BattleRole }>, t2: Array<{ name: string; role: BattleRole }>) {
      const build = (list: Array<{ name: string; role: BattleRole }>) =>
        list.map((c, i) => {
          const champ = makeChampionState(c.name, 'Silver', i)
          champ.role = c.role
          return champ
        })
      this.team1 = build(t1)
      this.team2 = build(t2)
    },

    getRandomChampions(champions: string[], count: number) {
      const arr = [...champions]
      const result = []
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * arr.length)
        result.push(arr.splice(idx, 1)[0])
      }
      return result
    },

    resetTeamStats(team: ChampionState[]) {
      team.forEach((champ, i) => {
        const fresh = makeChampionState(champ.name, champ.rank, i)
        fresh.role = champ.role
        Object.assign(champ, fresh)
      })
    },

    clearBattle() {
      this.timerIds.forEach((interval) => clearTimeout(interval))
      this.timerIds = []
      if (this.battleSimIntervalId) {
        clearInterval(this.battleSimIntervalId)
        this.battleSimIntervalId = null
      }
      if (this.autoBattleTimer) {
        clearTimeout(this.autoBattleTimer)
        this.autoBattleTimer = null
      }
      if (this.resultCountdownTimer) {
        clearInterval(this.resultCountdownTimer)
        this.resultCountdownTimer = null
      }
      this.resultCountdown = 0
      this.resetTeamStats(this.team1)
      this.resetTeamStats(this.team2)
      this.battleTime = 0
      this.timeline = null
      this.timelineCursor = 0
      this.objectiveOverrides = []
      this.killFeed = []
      this.activeFights = []
      this.respawnUntil = { t1: [0, 0, 0, 0, 0], t2: [0, 0, 0, 0, 0] }
      this.battleTrack = defaultBattleTrack()
      this.destroyedStructures = []
      this.structureFeed = []
      this.team1Turrets = 0
      this.team2Turrets = 0
      this.team1Inhibs = 0
      this.team2Inhibs = 0
      this.team1Drakes = 0
      this.team2Drakes = 0
      this.team1Barons = 0
      this.team2Barons = 0
      this.nexusDestroyedByTeam = null
      this.activeObjectiveParticipants = null
      this.honoredChampions = []
      this.honorsSettled = false
      this.drakeAlive = true
      this.drakeKilledByTeam = null
      this.drakeEventTime = 0
      this.baronAlive = true
      this.baronKilledByTeam = null
      this.baronEventTime = 0
      this.activeDrakeType = null
      this.drakeBuffs = []
      this.drakeBuffsT2 = []
      this._clearObjectiveModal()
      this.objectiveHP = 0
      this.objectiveMaxHP = 0
      this.objectiveWinDelta = 0
      this.battlePhase = 'playing'
      this.predeterminedWin = null
      this.showAutoBattleResult = false
      // battlePhaseStartTimestamp wird erst in beginSimulation() gesetzt,
      // nicht hier – so verhindert man den "sofort-fertig"-Bug.
      this.battlePhaseStartTimestamp = 0
      this.searchingPhaseStartTimestamp = 0
    },

    formatTime(seconds: number) {
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    },

    /** Spawn countdown rounded UP to whole game-minutes — battleTime is not minute-aligned. */
    formatSpawnCountdown(eventTime: number) {
      const remaining = Math.max(0, eventTime - this.battleTime)
      return this.formatTime(Math.ceil(remaining / 60) * 60)
    },

    getRandomTimeIncrement() {
      return Math.floor(Math.random() * BATTLE_TIME_RANGE_SECONDS) + BATTLE_TIME_MIN_SECONDS
    },

    predetermineOutcome() {
      const gameStore = useGameStore()
      const augmentStore = useAugmentStore()
      let playerPower = gameStore.totalPower
      const opponent = this.generateOpponent(this.mmr)
      const battleMods = augmentStore.getActiveBattleModifiers(
        gameStore.activeAugments,
        gameStore.activeModifier,
      )
      const effectiveOpponentPower = opponent.power * (battleMods.enemySpeedMultiplier ?? 1)
      const drainReduction = (battleMods.enemyMaxHPDrainPerSecond ?? 0) * BATTLE_DRAIN_REFERENCE_SECONDS
      const finalOpponentPower = Math.max(
        effectiveOpponentPower * BATTLE_OPPONENT_POWER_MIN_FRACTION,
        effectiveOpponentPower * (1 - drainReduction),
      )
      if (battleMods.bigBangAvailable) {
        playerPower *= BATTLE_BIG_BANG_POWER_MULTIPLIER
      }
      // The upgrade bonus tilts the real odds too — a higher initial probability
      // biases the seeded timeline toward a player win.
      const winProbability = Math.max(
        WINPROB_MIN,
        Math.min(
          WINPROB_MAX,
          this.calculateWinProbability(playerPower, finalOpponentPower) + this.startWinChanceBonus,
        ),
      )
      this.currentWinProbability = winProbability
      this.initialWinProbability = winProbability
      this.battleStartBonus = this.startWinChanceBonus
      this.currentOpponentLabel = `${opponent.rank.tier} ${opponent.rank.division}`
    },

    /** (Re)build the timeline from seed + persisted overrides — pure, reload-safe. */
    rebuildTimeline() {
      let timeline = generateTimeline(this.battleSeed, this.initialWinProbability)
      for (const override of this.objectiveOverrides) {
        timeline = reseedTimelineFrom(
          timeline,
          override.t,
          override.newSeed,
          override.prob,
          this.initialWinProbability,
        )
      }
      this.timeline = timeline
      this.predeterminedWin = timeline.winner === 1
      // Jump targets for the admin drake/baron shortcuts
      const firstDrake = timeline.events.find((e) => e.type === 'objectiveSpawn' && e.objective === 'drake')
      const baron = timeline.events.find((e) => e.type === 'objectiveSpawn' && e.objective === 'baron')
      this.drakeEventTime = firstDrake?.t ?? 0
      this.baronEventTime = baron?.t ?? 0
    },

    async initializeBattle() {
      this.clearBattle()
      this.currentBattleId++
      await this.refreshTeams()
      this.predetermineOutcome()
      if (this.team1.length > 0 && this.team2.length > 0) {
        this.battleSeed = (Date.now() ^ Math.imul(this.currentBattleId, 2654435761)) >>> 0
        this.objectiveOverrides = []
        this.timelineCursor = 0
        this.rebuildTimeline()
      }
      logger.group('Battle Init', () => {
        logger.info('Battle', `Team 1: ${this.team1.map((c) => c.name).join(', ')}`)
        logger.info('Battle', `Team 2: ${this.team2.map((c) => c.name).join(', ')}`)
      })
    },

    beginSimulation() {
      if (this.battleSimIntervalId) return
      if (this.team1.length > 0 && this.team2.length > 0) {
        // Timestamp hier setzen – erst jetzt beginnt die echte Spielzeit.
        this.battlePhaseStartTimestamp = Date.now()
        this.startBattleSimulation()
        logBattleStarted(this.currentOpponentLabel)
      }
    },

    async simulateBattle(opponentMMR: number) {
      const gameStore = useGameStore()

      this.autoBattleOldMMR = this.mmr
      this.autoBattleOldLP = this.currentRank.lp

      let playerPower = gameStore.totalPower
      const opponent = this.generateOpponent(opponentMMR)

      const augmentStore = useAugmentStore()
      const battleMods = augmentStore.getActiveBattleModifiers(
        gameStore.activeAugments,
        gameStore.activeModifier,
      )
      const effectiveOpponentPower = opponent.power * (battleMods.enemySpeedMultiplier ?? 1)
      const drainReduction = (battleMods.enemyMaxHPDrainPerSecond ?? 0) * BATTLE_DRAIN_REFERENCE_SECONDS
      const finalOpponentPower = Math.max(
        effectiveOpponentPower * BATTLE_OPPONENT_POWER_MIN_FRACTION,
        effectiveOpponentPower * (1 - drainReduction),
      )
      if (battleMods.bigBangAvailable) {
        playerPower *= BATTLE_BIG_BANG_POWER_MULTIPLIER
        augmentStore.consumeBigBang()
      }

      const winProbability = this.calculateWinProbability(playerPower, finalOpponentPower)
      const battleResult = this.timeline
        ? this.timeline.winner === 1
        : (this.predeterminedWin ?? Math.random() < winProbability)

      this.updateRanking(battleResult, opponentMMR)

      const actualMmrChange = this.mmr - this.autoBattleOldMMR
      const actualLpChange = this.currentRank.lp - this.autoBattleOldLP

      this.totalBattles++
      if (battleResult) {
        this.totalWins++
        this.currentWinStreak++
        this.bestWinStreak = Math.max(this.bestWinStreak, this.currentWinStreak)
      } else {
        this.totalLosses++
        this.currentWinStreak = 0
      }

      this.totalBattleTime += this.battleTime
      this.lastMmrChange = actualMmrChange
      this.lastLpChange = actualLpChange

      const mvpName = this.accumulateBattleStats()

      // Baron's Bounty (Hand of Baron): the slain worm pays out chimes at battle
      // end — win or lose. Granted here (once per battle) instead of at the kill
      // so a save/reload timeline replay can never pay it twice.
      let baronBounty = 0
      if (this.hasHandOfBaron) {
        baronBounty = Math.max(
          Math.floor(gameStore.chimesPerSecond * BARON_BOUNTY_PRODUCTION_SECONDS),
          Math.floor(gameStore.chimesPerClick * BARON_BOUNTY_MIN_CLICKS),
        )
        gameStore.chimes += baronBounty
        gameStore.totalChimesEarned += baronBounty
        gameStore.chimesEarnedForLevel += baronBounty
        gameStore.calculateLevel()
      }

      logger.info('Battle', `Result: ${battleResult ? 'WIN' : 'LOSS'}`, {
        mmrChange: actualMmrChange,
        lpChange: actualLpChange,
        newMMR: this.mmr,
        baronBounty,
      })
      this.lastAutoBattleResult = {
        won: battleResult,
        opponent,
        winProbability,
        lpChange: actualLpChange,
        duration: this.battleTime,
        teamKills: this.team1Kills,
        enemyKills: this.team2Kills,
        mvpName,
        baronBounty,
      }
      this.battleHistory.push(this.lastAutoBattleResult)
      if (this.battleHistory.length > 20) {
        this.battleHistory.splice(0, this.battleHistory.length - 20)
      }
      return this.lastAutoBattleResult
    },

    /**
     * Folds the finished battle's per-champion stats into the all-time career
     * stats. Returns the MVP name (best score across both teams).
     */
    accumulateBattleStats(): string {
      const teamKills = Math.max(1, this.team1Kills)
      let kpSum = 0
      let visionSum = 0
      const filled = this.team1.filter((c) => c.name)
      for (const champ of filled) {
        const career = (this.championCareer[champ.name] ??= defaultChampionCareer())
        career.battles += 1
        career.kills += champ.kills
        career.deaths += champ.deaths
        career.assists += champ.assists
        career.damage += champ.damage
        career.gold += champ.gold
        career.cs += champ.cs
        career.healing += champ.healing
        career.damageTaken += champ.damageTaken
        career.wardsPlaced += champ.wardsPlaced
        this.totalKills += champ.kills
        this.totalDeaths += champ.deaths
        this.totalAssists += champ.assists
        this.allTime.cs += champ.cs
        this.allTime.gold += champ.gold
        this.allTime.damage += champ.damage
        this.allTime.healing += champ.healing
        this.allTime.damageTaken += champ.damageTaken
        this.allTime.wardsPlaced += champ.wardsPlaced
        this.allTime.wardsKilled += champ.wardsKilled
        this.allTime.controlWards += champ.controlWards
        this.allTime.multikills.double += champ.multikills.double
        this.allTime.multikills.triple += champ.multikills.triple
        this.allTime.multikills.quadra += champ.multikills.quadra
        this.allTime.multikills.penta += champ.multikills.penta
        this.allTime.largestSpree = Math.max(this.allTime.largestSpree, champ.largestSpree)
        kpSum += (champ.kills + champ.assists) / teamKills
        visionSum += champ.wardsPlaced + champ.wardsKilled * 1.5 + champ.controlWards
      }
      if (filled.length > 0) {
        this.allTime.killParticipationSum += Math.min(1, kpSum / filled.length)
        this.allTime.visionScoreSum += visionSum / filled.length
        this.allTime.killParticipationGames += 1
      }
      if (this.battleTrack.firstBloodTeam1) this.allTime.firstBloods += 1
      this.allTime.soloKills += this.battleTrack.soloKillsT1
      this.allTime.dragons += this.team1Drakes
      this.allTime.barons += this.team1Barons
      this.allTime.turrets += this.team1Turrets
      this.allTime.inhibitors += this.team1Inhibs
      this.allTime.longestGameSeconds = Math.max(this.allTime.longestGameSeconds, this.battleTime)

      // MVP across both teams; the award counter only rises for own champions.
      // Enemy scores get a bias multiplier (MVP_ENEMY_TEAM_SCORE_MULT), so the
      // stats still decide but the red team wins the award more often —
      // future upgrades are meant to shift this toward the own team.
      let mvpName = ''
      let best = -Infinity
      this.team1.forEach((champ, i) => {
        if (!champ.name) return
        const score =
          mvpScore(champ, this.battleTrack.objectiveParticipationsT1[i]) * MVP_OWN_TEAM_SCORE_MULT
        if (score > best) {
          best = score
          mvpName = champ.name
        }
      })
      let mvpIsOwn = mvpName !== ''
      for (const champ of this.team2) {
        if (!champ.name) continue
        const score = mvpScore(champ) * MVP_ENEMY_TEAM_SCORE_MULT
        if (score > best) {
          best = score
          mvpName = champ.name
          mvpIsOwn = false
        }
      }
      // Admin/testing override: force a random OWN champion as MVP
      if (this.adminForceOwnMvp) {
        const own = this.team1.filter((c) => c.name)
        if (own.length > 0) {
          mvpName = own[Math.floor(Math.random() * own.length)].name
          mvpIsOwn = true
        }
      }
      if (mvpIsOwn) {
        this.allTime.mvpAwards += 1
        const career = this.championCareer[mvpName]
        if (career) career.mvps += 1
      }
      return mvpName
    },

    /** Base chime value of a single honor (production-scaled with a click floor). */
    honorBaseTribute(): number {
      const gameStore = useGameStore()
      return Math.max(
        Math.floor(gameStore.chimesPerSecond * HONOR_TRIBUTE_PRODUCTION_SECONDS),
        Math.floor(gameStore.chimesPerClick * HONOR_TRIBUTE_MIN_CLICKS),
      )
    },

    /**
     * Chimes one honor for this champion pays out. Only own champions pay;
     * the match MVP pays double, a lost battle pays half.
     */
    honorTributeFor(name: string): number {
      if (!this.team1.some((c) => c.name === name)) return 0
      let tribute = this.honorBaseTribute()
      if (this.lastAutoBattleResult?.mvpName === name) tribute *= HONOR_MVP_TRIBUTE_MULT
      if (this.lastAutoBattleResult?.won === false) {
        tribute = Math.floor(tribute * HONOR_LOSS_TRIBUTE_MULT)
      }
      return tribute
    },

    /**
     * Settles the honor ceremony exactly once per battle: the rift honors 3
     * of all 10 champions (both teams) by weighted random draw — the weight
     * grows with a performance score (MVP score plus healing, tanking and
     * vision), the draw itself is seeded by the battle so a reload replays
     * the same ceremony. Own honored champions pay a chime tribute; enemy
     * honors pay nothing. Fully automatic, no player input.
     */
    finalizeHonors() {
      if (this.honorsSettled) return
      this.honorsSettled = true
      this.honoredChampions = []

      // Deterministic per-battle RNG (mulberry32 over the battle seed)
      let rngState = (this.battleSeed ^ 0x9e3779b9) >>> 0
      const rng = () => {
        rngState = (rngState + 0x6d2b79f5) >>> 0
        let t = rngState
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }

      const scoreOf = (champ: ChampionState, objectiveParticipations?: number) =>
        Math.max(
          1,
          mvpScore(champ, objectiveParticipations) +
            champ.healing / HONOR_SCORE_HEAL_DIV +
            champ.damageTaken / HONOR_SCORE_TANK_DIV +
            champ.wardsPlaced * HONOR_SCORE_WARD_WEIGHT,
        )
      const pool = [
        ...this.team1
          .filter((c) => c.name)
          .map((c, i) => ({
            name: c.name,
            weight:
              Math.pow(scoreOf(c, this.battleTrack.objectiveParticipationsT1[i]), HONOR_WEIGHT_EXP) *
              HONOR_OWN_TEAM_WEIGHT_MULT,
          })),
        ...this.team2
          .filter((c) => c.name)
          .map((c) => ({
            name: c.name,
            weight: Math.pow(scoreOf(c), HONOR_WEIGHT_EXP) * HONOR_ENEMY_TEAM_WEIGHT_MULT,
          })),
      ]

      // Weighted draw without replacement
      while (this.honoredChampions.length < HONOR_MAX_SELECTIONS && pool.length > 0) {
        const total = pool.reduce((sum, p) => sum + p.weight, 0)
        let roll = rng() * total
        let picked = pool.length - 1
        for (let i = 0; i < pool.length; i++) {
          roll -= pool[i].weight
          if (roll <= 0) {
            picked = i
            break
          }
        }
        this.honoredChampions.push(pool[picked].name)
        pool.splice(picked, 1)
      }

      let tribute = 0
      for (const name of this.honoredChampions) {
        tribute += this.honorTributeFor(name)
        // Career honors are tracked for own champions only
        if (this.team1.some((c) => c.name === name)) {
          const career = (this.championCareer[name] ??= defaultChampionCareer())
          career.honors += 1
        }
      }
      this.allTime.honorsGiven += this.honoredChampions.length

      // An OWN match MVP grants a timed 2× chime buff — honored or not.
      // An enemy MVP grants nothing.
      const mvpName = this.lastAutoBattleResult?.mvpName ?? ''
      const mvpBuffGranted = !!mvpName && this.team1.some((c) => c.name === mvpName)

      const gameStore = useGameStore()
      if (tribute > 0) {
        gameStore.chimes += tribute
        gameStore.totalChimesEarned += tribute
        gameStore.chimesEarnedForLevel += tribute
        gameStore.calculateLevel()
      }
      if (mvpBuffGranted) gameStore.activateMvpBuff()
      if (this.lastAutoBattleResult) {
        this.lastAutoBattleResult.honorTribute = tribute
        this.lastAutoBattleResult.mvpBuffGranted = mvpBuffGranted
      }
    },

    confirmHonorAndContinue() {
      this.dismissResult()
    },

    promoteRank() {
      const currentTier = this.currentRank.tier
      const currentTierIndex = this.tierOrder.indexOf(currentTier)

      if (currentTier === 'Master') {
        if (this.currentRank.lp >= LP_MASTER_PROMOTION_THRESHOLD) {
          this.currentRank.tier = 'Grandmaster'
          this.currentRank.division = 'I'
        }
        return
      }
      if (currentTier === 'Grandmaster') {
        if (this.currentRank.lp >= LP_GRANDMASTER_PROMOTION_THRESHOLD) {
          this.currentRank.tier = 'Challenger'
          this.currentRank.division = 'I'
        }
        return
      }
      if (currentTier === 'Challenger') return

      const currentDivisionIndex = this.rankOrder.indexOf(this.currentRank.division)
      if (currentDivisionIndex < this.rankOrder.length - 1) {
        this.currentRank.division = this.rankOrder[currentDivisionIndex + 1]
        this.currentRank.lp = 0
      } else {
        const nextTier = this.tierOrder[currentTierIndex + 1]
        this.currentRank.tier = nextTier
        if (nextTier === 'Master') this.currentRank.division = 'I'
        else this.currentRank.division = 'IV'
        this.currentRank.lp = 0
      }
    },

    demoteRank() {
      const currentTier = this.currentRank.tier
      const currentTierIndex = this.tierOrder.indexOf(currentTier)

      if (currentTier === 'Iron' && this.currentRank.division === 'IV') {
        this.currentRank.lp = Math.max(0, this.currentRank.lp)
        return
      }
      if (currentTier === 'Challenger') {
        this.currentRank.tier = 'Grandmaster'
        this.currentRank.lp = LP_GRANDMASTER_DEMOTION_VALUE
        this.currentRank.division = 'I'
        return
      }
      if (currentTier === 'Grandmaster') {
        this.currentRank.tier = 'Master'
        this.currentRank.lp = LP_MASTER_DEMOTION_VALUE
        this.currentRank.division = 'I'
        return
      }
      if (currentTier === 'Master') {
        this.currentRank.tier = 'Diamond'
        this.currentRank.lp = LP_DEMOTION_VALUE
        this.currentRank.division = 'I'
        return
      }

      this.currentRank.lp = LP_DEMOTION_VALUE
      const currentDivisionIndex = this.rankOrder.indexOf(this.currentRank.division)
      if (currentDivisionIndex > 0) {
        this.currentRank.division = this.rankOrder[currentDivisionIndex - 1]
      } else {
        if (currentTierIndex > 0) {
          this.currentRank.tier = this.tierOrder[currentTierIndex - 1]
          this.currentRank.division = 'I'
        }
      }
    },

    calculateLPChange(mmrChange: number, won: boolean) {
      const lpChange = won ? LP_BASE_CHANGE : -LP_BASE_CHANGE
      const mmrFactor = Math.abs(mmrChange) / ELO_K_FACTOR
      // Elder Dragon buff: flat bonus LP on a won battle
      const elderBonus = won && this.drakeBuffs.includes('elder') ? DRAKE_ELDER_LP_BONUS : 0
      let lp = Math.round(lpChange * mmrFactor) + elderBonus
      // Baron's Aegis (Hand of Baron): a defeat despite the baron costs only a fraction of the LP
      if (!won && this.hasHandOfBaron) lp = Math.round(lp * BARON_LP_LOSS_SHIELD_MULT)
      return lp
    },

    mmrToPower(mmr: number) {
      return Math.max(100, Math.floor(mmr * MMR_TO_POWER_MULTIPLIER))
    },

    calculateWinProbability(playerPower: number, opponentPower: number) {
      const powerDifference = playerPower - opponentPower
      const expectedScore = 1 / (1 + Math.pow(10, -powerDifference / ELO_RATING_SCALE))
      const luckModifier = (Math.random() - 0.5) * this.battleFormula.luckFactor
      return Math.max(0.1, Math.min(0.9, expectedScore + luckModifier))
    },

    generateOpponent(targetMMR: number) {
      const opponentMMR = targetMMR + (Math.random() - 0.5) * OPPONENT_MMR_VARIANCE
      return {
        mmr: opponentMMR,
        power: this.mmrToPower(opponentMMR),
        rank: this.mmrToRank(opponentMMR),
      }
    },

    mmrToRank(mmr: number) {
      for (let i = MMR_RANK_THRESHOLDS.length - 1; i >= 0; i--) {
        if (mmr >= MMR_RANK_THRESHOLDS[i].minMMR) return MMR_RANK_THRESHOLDS[i]
      }
      return MMR_RANK_THRESHOLDS[0]
    },

    updateRanking(won: boolean, opponentMMR: number) {
      const currentMMR = this.mmr
      const oldRank = `${this.currentRank.tier} ${this.currentRank.division}`
      const expectedScore = 1 / (1 + Math.pow(10, (opponentMMR - currentMMR) / ELO_RATING_SCALE))
      const actualScore = won ? 1 : 0
      const mmrChange = Math.round(ELO_K_FACTOR * (actualScore - expectedScore))
      this.mmr += mmrChange
      const lpChange = this.calculateLPChange(mmrChange, won)
      this.updateLP(lpChange)
      const newRank = `${this.currentRank.tier} ${this.currentRank.division}`
      if (oldRank !== newRank) {
        logger.info('Battle', `Rank change: ${oldRank} -> ${newRank}`)
      }
    },

    updateLP(lpChange: number) {
      const currentTier = this.currentRank.tier
      this.currentRank.lp += lpChange
      let promotionThreshold = LP_NORMAL_PROMOTION_THRESHOLD
      if (currentTier === 'Master') promotionThreshold = LP_MASTER_PROMOTION_THRESHOLD
      else if (currentTier === 'Grandmaster')
        promotionThreshold = LP_GRANDMASTER_PROMOTION_THRESHOLD
      if (this.currentRank.lp >= promotionThreshold) this.promoteRank()
      if (this.currentRank.lp < 0) this.demoteRank()
    },

    async runBattleCycle() {
      if (!this.autoBattleEnabled) return

      const result = await this.simulateBattle(this.mmr)
      this.lastAutoBattleResult = result
      // The ceremony is decided and paid out immediately — the result screen
      // only presents it, so background tabs never miss the reward.
      this.finalizeHonors()
      this.showAutoBattleResult = true
      this.isViewingLanding = false
      this.resultPhaseStartTimestamp = Date.now()

      this.resultCountdown = BATTLE_RESULT_COUNTDOWN_SECONDS
      if (this.resultCountdownTimer) clearInterval(this.resultCountdownTimer)
      this.resultCountdownTimer = setInterval(() => {
        this.resultCountdown--
        if (this.resultCountdown <= 0) {
          clearInterval(this.resultCountdownTimer!)
          this.resultCountdownTimer = null
        }
      }, GAME_TICK_INTERVAL_MS)
      const pauseId = setTimeout(() => {
        this.dismissResult()
      }, BATTLE_RESULT_PAUSE_MS)
      this.timerIds.push(pauseId)
    },

    async proceedToNextBattle() {
      await this.initializeBattle()
      this.autoBattleTimerEndTimestamp = Date.now() + this.autoBattleInterval
      this.searchingPhaseStartTimestamp = Date.now()
      this.simulationReadyToStart = true
      this.startCountdown()
      // beginSimulation() wird NICHT sofort aufgerufen –
      // startCountdown() startet sie erst nach Ablauf des Suchphasen-Countdowns.
    },

    dismissResult() {
      this.timerIds.forEach((id) => clearTimeout(id))
      this.timerIds = []
      if (this.resultCountdownTimer) {
        clearInterval(this.resultCountdownTimer)
        this.resultCountdownTimer = null
      }
      this.resultCountdown = 0
      void this.proceedToNextBattle()
    },

    async startAutoBattle() {
      if (this.autoBattleEnabled) return
      this.autoBattleEnabled = true
      if (!_visibilityHandler) {
        _visibilityHandler = () => {
          if (!document.hidden) this.syncFromTimestamps()
        }
        document.addEventListener('visibilitychange', _visibilityHandler)
      }
      await this.initializeBattle()
      this.autoBattleTimerEndTimestamp = Date.now() + this.autoBattleInterval
      this.searchingPhaseStartTimestamp = Date.now()
      // simulationReadyToStart and startCountdown() are NOT set here —
      // the initial start goes through startBattle() in BattleResultComponent,
      // which calls beginSimulation() directly after its animation. Setting
      // simulationReadyToStart here would trigger the watcher and play a second
      // search animation (the double-animation bug).
    },

    pauseBattleSimulation() {
      if (this.battleSimIntervalId) {
        clearInterval(this.battleSimIntervalId)
        this.battleSimIntervalId = null
      }
    },

    async initializePersistentAutoBattle() {
      if (this.isAutoBattleInitialized) return
      this.isAutoBattleInitialized = true
      this.battleEverStarted = true
      this.autoBattleEnabled = false
      await this.startAutoBattle()
    },

    startCountdown() {
      this.timeUntilNextBattle = this.autoBattleInterval / 1000
      if (this.countdownTimer) clearInterval(this.countdownTimer)
      this.countdownTimer = setInterval(() => {
        const remaining = this.autoBattleTimerEndTimestamp - Date.now()
        this.timeUntilNextBattle = Math.max(0, Math.ceil(remaining / 1000))
        if (this.timeUntilNextBattle <= 0) {
          clearInterval(this.countdownTimer!)
          this.countdownTimer = null
          // Suchphase abgelaufen → Simulation starten
          if (this.simulationReadyToStart && this.autoBattleEnabled) {
            this.simulationReadyToStart = false
            this.beginSimulation()
          }
        }
      }, BATTLE_COUNTDOWN_INTERVAL_MS)
    },

    markBattleProcessed() {
      this.autoBattleReady = true
    },

    async adminSkipToEnd() {
      if (this.battlePhase !== 'playing') return

      this._clearObjectiveModal()

      if (this.battleSimIntervalId) {
        clearInterval(this.battleSimIntervalId)
        this.battleSimIntervalId = null
      }
      this.timerIds.forEach((id) => clearTimeout(id))
      this.timerIds = []
      if (this.autoBattleTimer) {
        clearTimeout(this.autoBattleTimer)
        this.autoBattleTimer = null
      }

      this.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
      this.battleTime = BATTLE_TOTAL_GAME_SECONDS
      this.battlePhase = 'result'
      await this.runBattleCycle()
    },

    jumpToGameTime(targetSeconds: number) {
      if (this.battlePhase !== 'playing') return
      if (targetSeconds <= this.battleTime) return
      if (targetSeconds >= BATTLE_TOTAL_GAME_SECONDS) return

      this._clearObjectiveModal()
      this.applyTimelineUpTo(targetSeconds)

      this.battlePhaseStartTimestamp = Date.now() - (targetSeconds / 60) * 1000
      this.battleTime = targetSeconds
      this.startBattleSimulation(true)
    },

    /**
     * Opens the frozen-time objective fight. The battle simulation is paused and
     * battlePhaseStartTimestamp keeps sliding forward, so game-time stands still:
     * no kills, no respawns, no timeline events — a 3v5 stays a 3v5 for the whole
     * fight. Both teams stack damage each tick (DPS ∝ alive participants); the
     * team with more TOTAL damage when the objective dies secures it.
     */
    _openObjectiveModal(type: 'drake' | 'baron', participants: { t1: number[]; t2: number[] } | null) {
      const maxHP = type === 'drake' ? DRAKE_OBJECTIVE_HP : BARON_OBJECTIVE_HP
      this.activeObjective = type
      this.activeObjectiveParticipants = participants
      this.objectiveHP = maxHP
      this.objectiveMaxHP = maxHP
      this.objectiveResult = null
      this.objectiveWinDelta = 0
      this.objectiveOwnDamage = 0
      this.objectiveEnemyDamage = 0
      this.objectivePlayerDamage = 0
      // Alive counts cannot change while time is frozen — snapshot once.
      this.objectiveFighters = {
        t1: this._buildObjectiveFighters(this.team1, this.respawnUntil.t1),
        t2: this._buildObjectiveFighters(this.team2, this.respawnUntil.t2),
      }
      this.objectiveAliveCounts = {
        own: Math.max(1, this.objectiveFighters.t1.filter((f) => f.alive).length),
        enemy: Math.max(1, this.objectiveFighters.t2.filter((f) => f.alive).length),
      }
      this.objectiveModalOpen = true

      this.pauseBattleSimulation()
      this.objectiveFreezeStartMs = Date.now()
      this.objectiveFightStartMs = Date.now()
      this.objectiveBuffTarget = { own: null, enemy: null }
      this.objectiveCurseDamage = { own: 0, enemy: 0 }
      this.objectiveCurseStacks = { own: 1, enemy: 1 }
      this.objectiveFightDurationMs = 0
      this._objAbilityAccumMs = 0

      this._objectiveIntervalId = setInterval(() => {
        if (!this.objectiveModalOpen || this.objectiveResult !== null) return
        this._slideFreezeAnchor()
        if (!this.objectiveFighters) return
        this._runAbilityCasts()
        const ownTick = this._runFightDamageTick('own')
        const enemyTick = this._runFightDamageTick('enemy')
        this.objectiveOwnDamage += ownTick
        this.objectiveEnemyDamage += enemyTick
        this.objectiveHP = Math.max(0, this.objectiveHP - ownTick - enemyTick)
        this._runFightAbilityTick()
        if (
          this.objectiveHP <= 0 ||
          Date.now() - this.objectiveFightStartMs >= OBJECTIVE_MAX_DURATION_MS
        ) {
          this._resolveByDamageLead()
        }
      }, OBJECTIVE_DPS_TICK_MS)
    },

    /**
     * Auto-cast pass: every standing fighter whose cooldown elapsed opens its
     * ability window. Support's Mend is an instant burst heal on the most
     * wounded ally; Jungle's Wild Rally locks its buff onto a random standing
     * ally for the window.
     */
    _runAbilityCasts() {
      const now = Date.now()
      for (const side of ['own', 'enemy'] as const) {
        const fighters = side === 'own' ? this.objectiveFighters!.t1 : this.objectiveFighters!.t2
        for (const f of fighters) {
          if (!this._isStanding(f)) continue
          if (now < f.abilityCooldownUntil) continue
          const duration = OBJECTIVE_ABILITY_DURATION_S[f.role] * 1000
          f.abilityActiveUntil = now + duration
          f.abilityCooldownUntil = f.abilityActiveUntil + OBJECTIVE_ABILITY_CD_S[f.role] * 1000
          if (f.role === 'support') {
            const standing = fighters.filter((x) => this._isStanding(x))
            if (standing.length > 0) {
              const wounded = standing.reduce((low, x) => (x.fightHp < low.fightHp ? x : low))
              wounded.fightHp = Math.min(
                wounded.fightMaxHp,
                wounded.fightHp + OBJECTIVE_SUPPORT_MEND_HEAL,
              )
            }
          }
          if (f.role === 'jungle') {
            const standing = fighters.filter((x) => this._isStanding(x))
            if (standing.length > 0) {
              const target = standing[Math.floor(Math.random() * standing.length)]
              this.objectiveBuffTarget[side] = target.idx
            }
          }
          if (f.role === 'mid') {
            // Hex Curse: every cast adds a permanent stack for the rest of the fight
            this.objectiveCurseStacks[side] += 1
          }
        }
        // Wild Rally expires with its window (or when the jungle drops)
        const jungle = fighters.find((f) => f.role === 'jungle')
        if (!jungle || !this._isStanding(jungle) || jungle.abilityActiveUntil <= now) {
          this.objectiveBuffTarget[side] = null
        }
      }
    },

    /**
     * One 200ms objective-damage tick for one side: every standing fighter
     * contributes weight × base DPS (× drake buffs × Wild Rally × Deadeye crit).
     * While the opposing top's Challenge is active, the taunted fighters pour
     * their FULL contribution onto that top instead of the objective. Mid's
     * Hex Curse adds a DoT credited to the mid while its window runs. Every
     * point added to a fighter is part of the returned side total (invariant).
     */
    _runFightDamageTick(side: 'own' | 'enemy'): number {
      const fighters = side === 'own' ? this.objectiveFighters!.t1 : this.objectiveFighters!.t2
      const dt = OBJECTIVE_DPS_TICK_MS / 1000
      const now = Date.now()
      const dpsMult = side === 'own' ? this.objectiveOwnDpsMult : this.objectiveEnemyDpsMult
      const buffIdx = this.objectiveBuffTarget[side]
      // this side is taunted while the OPPOSING top's Challenge window is active
      const opposingTop = (side === 'own' ? this.objectiveFighters!.t2 : this.objectiveFighters!.t1).find(
        (f) => f.role === 'top',
      )
      const tauntActive = !!opposingTop && this._isStanding(opposingTop) && opposingTop.abilityActiveUntil > now
      const tauntedIdxs = tauntActive
        ? fighters.filter((f) => this._isStanding(f)).slice(0, OBJECTIVE_TOP_TAUNT_TARGETS).map((f) => f.idx)
        : []

      let total = 0
      for (const f of fighters) {
        if (!this._isStanding(f)) continue
        let contrib = f.weight * OBJECTIVE_BASE_DPS_PER_CHAMP * dt * dpsMult
        contrib *= 1 + OBJECTIVE_DPS_VARIANCE * (2 * Math.random() - 1)
        if (buffIdx === f.idx) contrib *= OBJECTIVE_JUNGLE_BUFF_MULT
        const focusActive = f.role === 'adc' && f.abilityActiveUntil > now
        if (f.role === 'adc' && (focusActive || Math.random() < OBJECTIVE_ADC_CRIT_CHANCE)) {
          contrib *= OBJECTIVE_ADC_CRIT_MULT
        }
        if (tauntedIdxs.includes(f.idx)) {
          // full damage diverted onto the challenging top laner
          opposingTop!.fightHp = Math.max(0, opposingTop!.fightHp - contrib)
          opposingTop!.damageTaken += contrib
          continue
        }
        f.damage += contrib
        total += contrib
      }
      // Hex Curse: permanent DoT while the mid stands, scaling with the accumulated stacks
      const mid = fighters.find((f) => f.role === 'mid')
      if (mid && this._isStanding(mid)) {
        const curse = OBJECTIVE_MID_CURSE_DPS * this.objectiveCurseStacks[side] * dt
        mid.damage += curse
        total += curse
        this.objectiveCurseDamage[side] += curse
      }
      // Infernal Cinders: the pit smolders for the drake holder's team — side
      // total only, credited to no fighter (like player clicks)
      if (side === 'own') total += this.objectiveBurnDps * dt
      return total
    },

    /** Boss AoE and down detection — 1s cadence. */
    _runFightAbilityTick() {
      this._objAbilityAccumMs += OBJECTIVE_DPS_TICK_MS
      if (this._objAbilityAccumMs < OBJECTIVE_ABILITY_TICK_S * 1000) return
      this._objAbilityAccumMs -= OBJECTIVE_ABILITY_TICK_S * 1000

      const aoe = this.activeObjective === 'baron' ? OBJECTIVE_AOE_DPS_BARON : OBJECTIVE_AOE_DPS_DRAKE
      for (const side of ['own', 'enemy'] as const) {
        const fighters = side === 'own' ? this.objectiveFighters!.t1 : this.objectiveFighters!.t2
        for (const f of fighters) {
          if (this._isStanding(f)) {
            f.fightHp = Math.max(0, f.fightHp - aoe * OBJECTIVE_ABILITY_TICK_S)
            f.damageTaken += aoe * OBJECTIVE_ABILITY_TICK_S
          }
        }
        for (const f of fighters) {
          if (f.alive && !f.down && f.fightHp <= 0) f.down = true
        }
      }
    },

    _isStanding(f: ObjectiveFighter): boolean {
      return f.alive && !f.down
    },

    /**
     * Snapshot of one side's pit fighters — always the whole team, so the
     * modal shows all 5 champions with the dead ones grayed out. Living
     * fighters get a random DPS weight, normalized so the side's weights sum
     * to its alive count — the team DPS stays exactly aliveCount × base, only
     * the split varies.
     */
    _buildObjectiveFighters(team: ChampionState[], until: number[]): ObjectiveFighter[] {
      const fighters: ObjectiveFighter[] = team
        .map((_, i) => i)
        .filter((i) => team[i]?.name)
        .map((i) => {
          const alive = until[i] <= this.battleTime
          const role = BATTLE_ROLES[i] ?? 'mid'
          const maxHp = OBJECTIVE_ROLE_MAX_HP[role]
          return {
            idx: i,
            name: team[i].name,
            alive,
            weight: 0,
            damage: 0,
            role,
            // everyone alive at fight start regroups at full role-specific HP
            fightHp: alive ? maxHp : 0,
            fightMaxHp: maxHp,
            down: false,
            damageTaken: 0,
            abilityActiveUntil: 0,
            // staggered first casts so the pit doesn't fire everything at once
            abilityCooldownUntil: Date.now() + OBJECTIVE_ABILITY_FIRST_CAST_OFFSET_S[role] * 1000,
          }
        })
      const living = fighters.filter((f) => f.alive)
      if (living.length === 0) return fighters
      const raw = living.map(
        () => OBJECTIVE_FIGHTER_WEIGHT_MIN + Math.random() * (OBJECTIVE_FIGHTER_WEIGHT_MAX - OBJECTIVE_FIGHTER_WEIGHT_MIN),
      )
      const rawSum = raw.reduce((a, b) => a + b, 0)
      living.forEach((f, i) => {
        f.weight = (raw[i] / rawSum) * living.length
      })
      return fighters
    },

    /**
     * While the objective fight freezes game-time, keep pushing the battle
     * anchor forward so battleTime stays constant and a mid-freeze save/reload
     * resumes at (about) the frozen moment.
     */
    _slideFreezeAnchor() {
      if (this.objectiveFreezeStartMs <= 0) return
      this.battlePhaseStartTimestamp += Date.now() - this.objectiveFreezeStartMs
      this.objectiveFreezeStartMs = Date.now()
    },

    /** Instantly slays the active objective and credits the chosen team. */
    forceResolveObjective(team: 1 | 2) {
      if (!this.objectiveModalOpen || this.objectiveResult !== null || !this.activeObjective) return
      this.objectiveHP = 0
      this._resolveObjective(team === 1 ? 'own' : 'enemy')
    },

    /** Player clicks add damage to the own team's total — no last-hit steal. */
    clickObjective() {
      if (!this.objectiveModalOpen || this.objectiveResult !== null) return
      const clickDamage = this.objectiveClickDamage
      this.objectiveHP = Math.max(0, this.objectiveHP - clickDamage)
      this.objectiveOwnDamage += clickDamage
      this.objectivePlayerDamage += clickDamage
      if (this.objectiveHP <= 0) {
        this._resolveByDamageLead()
      }
    },

    /**
     * The objective goes to the team with the higher cumulative damage.
     * Tie-break: more alive champions at the pit, then the player's team.
     * Result reads 'player' only when the player's clicks were decisive.
     */
    _resolveByDamageLead() {
      // tiebreak on who is still standing at the pit right now
      const standingOf = (arr: ObjectiveFighter[] | undefined) =>
        arr ? arr.filter((f) => this._isStanding(f)).length : 3
      let ownWins: boolean
      if (this.objectiveOwnDamage !== this.objectiveEnemyDamage) {
        ownWins = this.objectiveOwnDamage > this.objectiveEnemyDamage
      } else {
        ownWins = standingOf(this.objectiveFighters?.t1) >= standingOf(this.objectiveFighters?.t2)
      }
      const clicksDecisive =
        this.objectivePlayerDamage > 0 &&
        this.objectiveOwnDamage - this.objectivePlayerDamage <= this.objectiveEnemyDamage
      this._resolveObjective(ownWins ? (clicksDecisive ? 'player' : 'own') : 'enemy')
    },

    /**
     * Live resolution of the interactive objective. The remaining timeline is
     * re-seeded with the shifted win probability, so the outcome of the match
     * can genuinely flip — the override is persisted for reload determinism.
     */
    _resolveObjective(by: 'player' | 'own' | 'enemy') {
      if (this._objectiveIntervalId) {
        clearInterval(this._objectiveIntervalId)
        this._objectiveIntervalId = null
      }
      this.objectiveResult = by
      this.objectiveFightDurationMs = Date.now() - this.objectiveFightStartMs
      const objective = this.activeObjective
      if (!objective) return
      const ownWin = by === 'player' || by === 'own'
      let bonus =
        objective === 'drake'
          ? DRAKE_TYPES[this.activeDrakeType ?? 'infernal'].winDelta
          : OBJECTIVE_BARON_WIN_BONUS
      // Ocean buff: losing a later objective fight only costs half the win chance
      if (!ownWin && this.drakeBuffs.includes('ocean')) bonus *= DRAKE_OCEAN_LOSS_PENALTY_MULT

      this._creditObjective(
        objective,
        ownWin ? 1 : 2,
        this.activeObjectiveParticipants,
        objective === 'drake' ? this.activeDrakeType : null,
      )

      const newProb = Math.max(WINPROB_MIN, Math.min(WINPROB_MAX, this.currentWinProbability + (ownWin ? bonus : -bonus)))
      this.currentWinProbability = newProb
      this.objectiveWinDelta = ownWin ? bonus : -bonus

      if (this.timeline) {
        const newSeed =
          (this.battleSeed ^ Math.imul(this.battleTime + 1, 2654435761) ^ (this.objectiveOverrides.length + 1)) >>> 0
        this.objectiveOverrides.push({ t: this.battleTime, newSeed, prob: newProb })
        this.timeline = reseedTimelineFrom(
          this.timeline,
          this.battleTime,
          newSeed,
          newProb,
          this.initialWinProbability,
        )
        this.predeterminedWin = this.timeline.winner === 1
        this.timelineCursor = this.timeline.events.findIndex((ev) => ev.t > this.battleTime)
        if (this.timelineCursor < 0) this.timelineCursor = this.timeline.events.length
      }

      const closeTimeoutId = setTimeout(() => {
        this._closeObjectiveModalAndResume()
      }, OBJECTIVE_RESULT_DELAY_MS)
      this._objectiveCloseTimeoutId = closeTimeoutId
      this.timerIds.push(closeTimeoutId)
    },

    /** Close the modal after a scripted (timeline) objective result — no reseed. */
    _finishObjectiveModal(by: 'own' | 'enemy') {
      if (this._objectiveIntervalId) {
        clearInterval(this._objectiveIntervalId)
        this._objectiveIntervalId = null
      }
      this.objectiveResult = by
      this.objectiveFightDurationMs = Date.now() - this.objectiveFightStartMs
      this.objectiveWinDelta = 0
      const closeTimeoutId = setTimeout(() => {
        this._closeObjectiveModalAndResume()
      }, OBJECTIVE_RESULT_DELAY_MS)
      this._objectiveCloseTimeoutId = closeTimeoutId
      this.timerIds.push(closeTimeoutId)
    },

    /** X button on the post-fight summary — close immediately instead of waiting out the timer. */
    dismissObjectiveResult() {
      if (this.objectiveResult === null) return
      if (this._objectiveCloseTimeoutId) {
        clearTimeout(this._objectiveCloseTimeoutId)
        this._objectiveCloseTimeoutId = null
      }
      this._closeObjectiveModalAndResume()
    },

    /** Unfreeze after a fight: clear the modal, then continue the paused simulation. */
    _closeObjectiveModalAndResume() {
      this._clearObjectiveModal()
      if (this.battlePhase === 'playing' && this.battlePhaseStartTimestamp > 0 && !this.battleSimIntervalId) {
        this.startBattleSimulation(true)
      }
    },

    _clearObjectiveModal() {
      if (this._objectiveIntervalId) {
        clearInterval(this._objectiveIntervalId)
        this._objectiveIntervalId = null
      }
      this._slideFreezeAnchor()
      this.objectiveFreezeStartMs = 0
      this.objectiveFightStartMs = 0
      this.objectiveOwnDamage = 0
      this.objectiveEnemyDamage = 0
      this.objectivePlayerDamage = 0
      this.objectiveAliveCounts = null
      this.objectiveFighters = null
      this.objectiveBuffTarget = { own: null, enemy: null }
      this.objectiveCurseDamage = { own: 0, enemy: 0 }
      this.objectiveCurseStacks = { own: 1, enemy: 1 }
      this._objAbilityAccumMs = 0
      this._objectiveCloseTimeoutId = null
      this.objectiveModalOpen = false
      this.objectiveResult = null
      this.activeObjective = null
      this.activeObjectiveParticipants = null
    },

    syncFromTimestamps() {
      if (this.showAutoBattleResult && this.isAutoBattleInitialized) {
        // Give the honor screen its full display window before auto-continuing;
        // only force-proceed once the result pause has actually elapsed
        // (background tabs where the local setTimeout was throttled).
        if (
          this.resultPhaseStartTimestamp > 0 &&
          Date.now() - this.resultPhaseStartTimestamp >= BATTLE_RESULT_PAUSE_MS
        ) {
          this.autoSimulateHonorAndProceed()
        }
        return
      }

      if (
        this.battlePhase === 'playing' &&
        this.battlePhaseStartTimestamp > 0 &&
        !this.showAutoBattleResult
      ) {
        // Objective fight freezes game-time: keep sliding the anchor instead of
        // restarting the (deliberately paused) simulation interval.
        if (this.objectiveModalOpen || this.objectiveFreezeStartMs > 0) {
          this._slideFreezeAnchor()
          return
        }
        const realElapsedS = (Date.now() - this.battlePhaseStartTimestamp) / 1000
        // minutengenau wie in startBattleSimulation (siehe Kommentar dort)
        const gameTime = Math.floor(realElapsedS) * 60
        if (gameTime >= BATTLE_TOTAL_GAME_SECONDS) {
          if (this.battleSimIntervalId) {
            clearInterval(this.battleSimIntervalId)
            this.battleSimIntervalId = null
          }
          this._clearObjectiveModal()
          this.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
          this.battleTime = BATTLE_TOTAL_GAME_SECONDS
          this.battlePhase = 'result'
          logBattleEnded(this.predeterminedWin ?? false)
          this.runBattleCycle()
          return
        }
        if (!this.battleSimIntervalId) {
          this.startBattleSimulation(true)
        }
        return
      }
      // Fast rescue: search phase has been running longer than animation+margin with no
      // simulation started. Watcher unavailable (modal closed) or animation hung.
      // syncFromTimestamps() polls every 1s from main.ts → fires at ~7s from search start.
      if (
        this.autoBattleEnabled &&
        this.searchingPhaseStartTimestamp > 0 &&
        !this.battleSimIntervalId &&
        this.battlePhaseStartTimestamp === 0 &&
        !this.showAutoBattleResult &&
        Date.now() - this.searchingPhaseStartTimestamp >
          PLANET_SEARCH_ANIM_DURATION_MS + PLANET_SEARCH_ANIM_FALLBACK_MARGIN_MS + 1500
      ) {
        this.simulationReadyToStart = false
        this.beginSimulation()
        return
      }

      if (
        this.autoBattleEnabled &&
        this.autoBattleTimerEndTimestamp > 0 &&
        this.battlePhase !== 'result' &&
        !this.showAutoBattleResult &&
        Date.now() >= this.autoBattleTimerEndTimestamp
      ) {
        if (this.autoBattleTimer) {
          clearTimeout(this.autoBattleTimer)
          this.autoBattleTimer = null
        }
        // Start simulation if simulationReadyToStart is still set
        // (e.g. after tab switch during search phase)
        if (this.simulationReadyToStart) {
          this.simulationReadyToStart = false
          this.beginSimulation()
        } else if (!this.battleSimIntervalId && this.battlePhaseStartTimestamp === 0) {
          // Rescue: the watcher consumed simulationReadyToStart but the planet-search animation
          // hung (RAF throttled in background tab). Timer expired, no simulation running.
          this.beginSimulation()
        }
      }

      // Fallback: autoBattle is active but all timestamps are zero (old save pre-fix, or
      // edge case where the timer fired and cleared itself before the page was saved).
      // Start a fresh battle cycle so the loop never stays silently stuck.
      if (
        this.autoBattleEnabled &&
        this.isAutoBattleInitialized &&
        this.battlePhaseStartTimestamp === 0 &&
        this.autoBattleTimerEndTimestamp === 0 &&
        !this.showAutoBattleResult &&
        !this.battleSimIntervalId
      ) {
        this.proceedToNextBattle()
      }
    },

    autoSimulateHonorAndProceed() {
      this.dismissResult()
    },

    resumeBattleAfterLoad() {
      this.simulationReadyToStart = false
      if (!this.isAutoBattleInitialized) return
      // Rebuild the deterministic timeline for a battle that was running when
      // the page was closed; the cursor fast-forwards via applyTimelineUpTo.
      if (
        this.battlePhaseStartTimestamp > 0 &&
        this.battleSeed > 0 &&
        !this.timeline &&
        this.team1.length > 0 &&
        this.team2.length > 0
      ) {
        this.rebuildTimeline()
        this.timelineCursor = 0
        const realElapsedS = (Date.now() - this.battlePhaseStartTimestamp) / 1000
        // minutengenau wie in startBattleSimulation (siehe Kommentar dort)
        const gameTime = Math.min(BATTLE_TOTAL_GAME_SECONDS, Math.floor(realElapsedS) * 60)
        this.applyTimelineUpTo(gameTime)
        this.battleTime = gameTime
      }
      if (!_visibilityHandler) {
        _visibilityHandler = () => {
          if (!document.hidden) this.syncFromTimestamps()
        }
        document.addEventListener('visibilitychange', _visibilityHandler)
      }
      if (this.autoBattleEnabled) {
        this.syncFromTimestamps()
        // If we were mid-search-phase (countdown was running before reload)
        // and the timer hasn't expired yet, restart the countdown so the
        // battle can auto-begin without requiring user interaction.
        if (
          this.autoBattleTimerEndTimestamp > Date.now() &&
          this.battlePhaseStartTimestamp === 0 &&
          !this.showAutoBattleResult
        ) {
          this.simulationReadyToStart = true
          this.startCountdown()
        }
      }
    },

    stopAutoBattle() {
      this.autoBattleEnabled = false
      if (this.autoBattleTimer) clearTimeout(this.autoBattleTimer)
      if (this.countdownTimer) clearInterval(this.countdownTimer)
      if (_visibilityHandler) {
        document.removeEventListener('visibilitychange', _visibilityHandler)
        _visibilityHandler = null
      }
    },
  },
})
