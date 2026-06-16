import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'
import { useAugmentStore } from './augmentStore'
import { earlyGameMessages, midGameMessages, lateGameMessages } from '../config/messages'
import {
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
  BATTLE_REAL_DURATION_SECONDS,
  KILL_EVENTS_PER_TEAM_MIN,
  KILL_EVENTS_PER_TEAM_MAX,
  MINIMAP_PHASE_BARON_END,
  MINIMAP_PHASE_DRAKE_END,
  MINIMAP_PHASE_MIDFIGHT_END,
  GAME_TICK_INTERVAL_MS,
  KILL_EVENT_MIN_GAME_SECONDS,
  KILL_EVENT_MAX_GAME_SECONDS,
  BATTLE_ASSIST_CHANCE,
  BATTLE_DEATH_CHANCE,
  BATTLE_CHAT_MESSAGE_COUNT,
  BATTLE_EARLY_GAME_SECONDS,
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
} from '../config/constants'
import type { BattleResult, ChampionState, ChatMessage, RecruitableChampion } from '../types'
import { fetchChampionNames } from '../utils/champions'
import { logger } from '../utils/logger'
import { CHAMPION_HOME_PLANETS } from '../config/championHomePlanets'
import { logBattleStarted, logBattleEnded, logChampionDefeated } from '../config/gameEventLogger'

let _lastKillLogMs = 0
let _visibilityHandler: (() => void) | null = null

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
    secondarySlots: [
      [null, null],
      [null, null],
      [null, null],
      [null, null],
      [null, null],
    ] as (string | null)[][],
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
    battleEverStarted: false,
    currentBattleId: 0,
    timeUntilNextBattle: 0,
    countdownTimer: null as ReturnType<typeof setInterval> | null,
    chatMessages: [] as ChatMessage[],
    team1: [] as ChampionState[],
    team2: [] as ChampionState[],
    timerIds: [] as ReturnType<typeof setTimeout>[],

    recruitableChampions: [] as RecruitableChampion[],
    recruitedChampions: [] as string[],
    newlyUnlockedChampions: [] as string[],

    battleSimIntervalId: null as ReturnType<typeof setInterval> | null,
    killEventSchedule: [] as Array<{ gameTime: number; team: 1 | 2 }>,
    battlePhase: 'playing' as 'playing' | 'result',
    drakeAlive: true,
    drakeKilledByTeam: null as (1 | 2) | null,
    drakeEventTime: 0,
    baronAlive: true,
    baronKilledByTeam: null as (1 | 2) | null,
    baronEventTime: 0,
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

    addRecruitableChampion(name: string, materialCost: Record<string, number>) {
      if (this.ownedChampions.includes(name)) return
      if (this.recruitableChampions.some((c) => c.name === name)) return
      if (this.recruitedChampions.includes(name)) return
      this.recruitableChampions.push({ name, materialCost, discoveredAt: Date.now() })
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
        this.addRecruitableChampion(config.championName, config.materialCost)
      }
    },

    recruitChampion(name: string): boolean {
      const recruit = this.recruitableChampions.find((c) => c.name === name)
      if (!recruit) return false
      const inventoryStore = useInventoryStore()
      if (!inventoryStore.hasMaterials(recruit.materialCost)) return false
      inventoryStore.removeMaterials(recruit.materialCost)
      this.ownedChampions.push(name)
      this.recruitedChampions.push(name)
      this.recruitableChampions = this.recruitableChampions.filter((c) => c.name !== name)
      this.dismissNewChampion(name)
      logger.info('Battle', `Recruited: ${name}`, { materialCost: recruit.materialCost })
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
      this.team1 = this.headerSlots.map((slot) => {
        if (!slot) return { name: '', rank: BATTLE_DEFAULT_RANK_TIER, kills: 0, deaths: 0, assists: 0 }
        const existing = this.team1.find((c) => c.name === slot)
        return existing ?? { name: slot, rank: BATTLE_DEFAULT_RANK_TIER, kills: 0, deaths: 0, assists: 0 }
      })
    },

    getAvgBattleTime(): string {
      return this.formatTime(Math.round(this.totalBattleTime / this.totalBattles) || 0)
    },

    generateKillSchedule() {
      const events: Array<{ gameTime: number; team: 1 | 2 }> = []
      const totalEvents =
        KILL_EVENTS_PER_TEAM_MIN +
        Math.floor(Math.random() * (KILL_EVENTS_PER_TEAM_MAX - KILL_EVENTS_PER_TEAM_MIN + 1))
      for (let i = 0; i < totalEvents; i++) {
        const gameTime = KILL_EVENT_MIN_GAME_SECONDS + Math.floor(Math.random() * (KILL_EVENT_MAX_GAME_SECONDS - KILL_EVENT_MIN_GAME_SECONDS))
        const team = (Math.random() < 0.5 ? 1 : 2) as 1 | 2
        events.push({ gameTime, team })
      }
      events.sort((a, b) => a.gameTime - b.gameTime)
      this.killEventSchedule = events
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
        const newBattleTime = Math.floor(realElapsedS * 60)

        const pending = this.killEventSchedule.filter(
          (e) => e.gameTime > this.battleTime && e.gameTime <= newBattleTime,
        )
        this.killEventSchedule = this.killEventSchedule.filter((e) => e.gameTime > newBattleTime)
        this.battleTime = newBattleTime

        for (const event of pending) {
          const attackingTeam = (event.team === 1 ? this.team1 : this.team2).filter((c) => c.name)
          const defendingTeam = (event.team === 1 ? this.team2 : this.team1).filter((c) => c.name)
          if (attackingTeam.length === 0 || defendingTeam.length === 0) continue
          const killer = attackingTeam[Math.floor(Math.random() * attackingTeam.length)]
          killer.kills += 1
          const assistCount = Math.random() < BATTLE_ASSIST_CHANCE ? 1 : 2
          const others = attackingTeam.filter((c) => c !== killer)
          for (let i = 0; i < Math.min(assistCount, others.length); i++) {
            others[Math.floor(Math.random() * others.length)].assists += 1
          }
          const victim = defendingTeam[Math.floor(Math.random() * defendingTeam.length)]
          if (Math.random() < BATTLE_DEATH_CHANCE) victim.deaths += 1
          const now = Date.now()
          if (now - _lastKillLogMs >= BATTLE_KILL_LOG_THROTTLE_MS && killer.name && victim.name) {
            _lastKillLogMs = now
            logChampionDefeated(killer.name, victim.name)
          }
        }

        if (this.drakeAlive && this.drakeEventTime > 0 && this.battleTime >= this.drakeEventTime) {
          this.drakeKilledByTeam = Math.random() < 0.5 ? 1 : 2
          this.drakeAlive = false
          const teamName = this.drakeKilledByTeam === 1 ? 'Blue Team' : 'Red Team'
          this.chatMessages.push({
            user: 'System',
            text: `${teamName} slew the Dragon!`,
            time: this.formatTime(this.battleTime),
            team: this.drakeKilledByTeam,
            type: 'system',
          })
        }

        if (
          this.baronAlive &&
          this.baronEventTime > 0 &&
          this.battleTime >= this.baronEventTime &&
          this.battleTime < MINIMAP_PHASE_BARON_END
        ) {
          this.baronKilledByTeam = Math.random() < 0.5 ? 1 : 2
          this.baronAlive = false
          const baronTeamName = this.baronKilledByTeam === 1 ? 'Blue Team' : 'Red Team'
          this.chatMessages.push({
            user: 'System',
            text: `${baronTeamName} slew Baron Nashor!`,
            time: this.formatTime(this.battleTime),
            team: this.baronKilledByTeam,
            type: 'system',
          })
        }

        if (this.battleTime >= BATTLE_REAL_DURATION_SECONDS * 60) {
          clearInterval(this.battleSimIntervalId!)
          this.battleSimIntervalId = null
          this.battlePhase = 'result'
          logBattleEnded(this.predeterminedWin ?? false)
          if (this.autoBattleTimer) {
            clearTimeout(this.autoBattleTimer)
            this.autoBattleTimer = null
          }
          this.runBattleCycle()
        }
      }, GAME_TICK_INTERVAL_MS)
    },

    async loadChampions() {
      return fetchChampionNames()
    },

    async refreshTeams() {
      const champions = await this.loadChampions()
      const selected = this.getRandomChampions(champions, 5)
      this.team1 = this.headerSlots.map((slot) => ({
        name: slot ?? '',
        rank: slot ? this.currentRank.tier : 'Silver',
        ...this.getStats(),
      }))
      this.team2 = selected.map((name) => ({ name, rank: 'Silver', ...this.getStats() }))
    },

    getStats() {
      return { kills: 0, deaths: 0, assists: 0 }
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
      team.forEach((champ) => {
        champ.kills = 0
        champ.deaths = 0
        champ.assists = 0
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
      this.killEventSchedule = []
      this.resetTeamStats(this.team1)
      this.resetTeamStats(this.team2)
      this.chatMessages = []
      this.battleTime = 0
      this.drakeAlive = true
      this.drakeKilledByTeam = null
      this.drakeEventTime = 0
      this.baronAlive = true
      this.baronKilledByTeam = null
      this.baronEventTime = 0
      this.battlePhase = 'playing'
      this.predeterminedWin = null
      this.showAutoBattleResult = false
      // battlePhaseStartTimestamp wird erst in beginSimulation() gesetzt,
      // nicht hier – so verhindert man den "sofort-fertig"-Bug.
      this.battlePhaseStartTimestamp = 0
      this.searchingPhaseStartTimestamp = 0
    },

    showRandomChatMessagesSequentially() {
      const allChampions = [
        ...this.team1
          .filter((c) => c.name)
          .map((champ) => ({ name: champ.name, team: 1 as 1 | 2 })),
        ...this.team2
          .filter((c) => c.name)
          .map((champ) => ({ name: champ.name, team: 2 as 1 | 2 })),
      ]
      if (allChampions.length === 0) return

      const battleIdAtStart = this.currentBattleId

      for (let i = 0; i < BATTLE_CHAT_MESSAGE_COUNT; i++) {
        const delay = Math.floor(Math.random() * (BATTLE_REAL_DURATION_SECONDS - 1) * 1000)
        const timeoutId = setTimeout(() => {
          if (this.currentBattleId !== battleIdAtStart) return
          const currentGameTime = this.battleTime
          let pool: string[]
          if (currentGameTime < BATTLE_EARLY_GAME_SECONDS) {
            pool = earlyGameMessages
          } else if (currentGameTime < MINIMAP_PHASE_DRAKE_END) {
            pool = midGameMessages
          } else {
            pool = lateGameMessages
          }
          const text = pool[Math.floor(Math.random() * pool.length)]
          const champ = allChampions[Math.floor(Math.random() * allChampions.length)]
          this.chatMessages.push({
            user: champ.name,
            text,
            time: this.formatTime(currentGameTime),
            team: champ.team,
          })
        }, delay)
        this.timerIds.push(timeoutId)
      }
    },

    formatTime(seconds: number) {
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
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
        gameStore.activeModifier as Record<string, unknown>,
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
      const winProbability = this.calculateWinProbability(playerPower, finalOpponentPower)
      this.currentWinProbability = winProbability
      this.predeterminedWin = Math.random() < winProbability
      this.currentOpponentLabel = `${opponent.rank.tier} ${opponent.rank.division}`
    },

    async initializeBattle() {
      this.clearBattle()
      this.currentBattleId++
      await this.refreshTeams()
      this.predetermineOutcome()
      if (this.team1.length > 0 && this.team2.length > 0) {
        this.generateKillSchedule()
        this.drakeEventTime = MINIMAP_PHASE_DRAKE_END
        this.baronEventTime = MINIMAP_PHASE_MIDFIGHT_END + Math.floor(Math.random() * 600)
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
        this.showRandomChatMessagesSequentially()
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
        gameStore.activeModifier as Record<string, unknown>,
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
      const battleResult = this.predeterminedWin ?? Math.random() < winProbability

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
      logger.info('Battle', `Result: ${battleResult ? 'WIN' : 'LOSS'}`, {
        mmrChange: actualMmrChange,
        lpChange: actualLpChange,
        newMMR: this.mmr,
      })
      this.lastAutoBattleResult = {
        won: battleResult,
        opponent,
        winProbability,
      }
      return this.lastAutoBattleResult
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
      return Math.round(lpChange * mmrFactor)
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
      this.showAutoBattleResult = true
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

      const endGameTime = BATTLE_REAL_DURATION_SECONDS * 60
      for (const event of this.killEventSchedule) {
        const attackingTeam = event.team === 1 ? this.team1 : this.team2
        const defendingTeam = event.team === 1 ? this.team2 : this.team1
        if (attackingTeam.length === 0 || defendingTeam.length === 0) continue
        const killer = attackingTeam[Math.floor(Math.random() * attackingTeam.length)]
        killer.kills += 1
        const others = attackingTeam.filter((c) => c !== killer)
        if (others.length > 0) others[Math.floor(Math.random() * others.length)].assists += 1
        if (Math.random() < BATTLE_DEATH_CHANCE) {
          defendingTeam[Math.floor(Math.random() * defendingTeam.length)].deaths += 1
        }
      }
      this.killEventSchedule = []
      this.battleTime = endGameTime
      this.battlePhase = 'result'
      await this.runBattleCycle()
    },

    syncFromTimestamps() {
      if (this.showAutoBattleResult && this.isAutoBattleInitialized) {
        this.autoSimulateHonorAndProceed()
        return
      }

      if (
        this.battlePhase === 'playing' &&
        this.battlePhaseStartTimestamp > 0 &&
        !this.showAutoBattleResult
      ) {
        const realElapsedS = (Date.now() - this.battlePhaseStartTimestamp) / 1000
        const gameTime = Math.floor(realElapsedS * 60)
        if (gameTime >= BATTLE_REAL_DURATION_SECONDS * 60) {
          if (this.battleSimIntervalId) {
            clearInterval(this.battleSimIntervalId)
            this.battleSimIntervalId = null
          }
          this.battleTime = BATTLE_REAL_DURATION_SECONDS * 60
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
