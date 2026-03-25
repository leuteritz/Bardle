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
} from '../config/constants'
import type { BattleResult, ChampionState, ChatMessage, RecruitableChampion } from '../types'
import { fetchChampionNames } from '../utils/champions'
import { logger } from '../utils/logger'

export const useBattleStore = defineStore('battle', {
  state: () => ({
    // MMR und Rang-System - speichert die aktuelle Spielstärke und Liga des Spielers
    mmr: 1000,
    currentRank: {
      tier: 'Iron',
      division: 'IV',
      lp: 0,
    },

    // Kampf-Historie und Rang-Hierarchie - Listen für Kampfverlauf und die Reihenfolge der Ränge
    battleHistory: [] as BattleResult[],
    rankOrder: [...RANK_DIVISIONS] as string[],
    tierOrder: [...RANK_TIERS] as string[],

    // Auto-Battle System - steuert automatische Kämpfe
    autoBattleEnabled: false,
    autoBattleInterval: AUTO_BATTLE_INTERVAL_MS,
    autoBattleTimer: null as ReturnType<typeof setTimeout> | null,
    lastAutoBattleResult: null as BattleResult | null,

    // UI-Anzeige Variablen - zeigt Änderungen von MMR und LP nach Kämpfen an
    lastMmrChange: 0,
    lastLpChange: 0,
    showAutoBattleResult: false,
    autoBattleOldMMR: 0,
    autoBattleOldLP: 0,
    autoBattleReady: true,

    // Spiel-Logik - Champions, Teams und Kampfstatistiken
    battleTime: 0,
    ownedChampions: ['Bard'],
    teamSlotAssignments: [null, null, null, null] as (string | null)[],
    battleFormula: {
      luckFactor: ELO_LUCK_FACTOR,
    },

    // Statistiken - verfolgt Gesamtstatistiken aller Kämpfe
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

    // Live-Battle Interface - Chat, Teams und Timer für laufende Kämpfe
    isAutoBattleInitialized: false,
    currentBattleId: 0,
    timeUntilNextBattle: 0,
    countdownTimer: null as ReturnType<typeof setInterval> | null,
    chatMessages: [] as ChatMessage[],
    team1: [] as ChampionState[],
    team2: [] as ChampionState[],
    timerIds: [] as ReturnType<typeof setTimeout>[],

    // Champion recruitment via planet rescue
    recruitableChampions: [] as RecruitableChampion[],
    recruitedChampions: [] as string[],

    // Battle simulation
    battleSimIntervalId: null as ReturnType<typeof setInterval> | null,
    killEventSchedule: [] as Array<{ gameTime: number; team: 1 | 2 }>,
    battlePhase: 'playing' as 'playing' | 'result',
    autoSkipEnabled: true,
    resultCountdown: 0,
    resultCountdownTimer: null as ReturnType<typeof setInterval> | null,
    predeterminedWin: null as boolean | null,
  }),

  getters: {
    selectedChampions: (state) =>
      state.teamSlotAssignments.filter((s): s is string => s !== null),
  },

  actions: {
    // Gibt den Bildpfad für einen Champion zurück basierend auf seinem Namen
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
      logger.info('Battle', `Recruited: ${name}`, { materialCost: recruit.materialCost })
      return true
    },

    assignToSlot(slotIndex: number, championName: string) {
      const existing = this.teamSlotAssignments.indexOf(championName)
      if (existing !== -1) this.teamSlotAssignments[existing] = null
      this.teamSlotAssignments[slotIndex] = championName
    },

    removeFromSlot(slotIndex: number) {
      this.teamSlotAssignments[slotIndex] = null
    },

    removeChampionFromSlots(championName: string) {
      const idx = this.teamSlotAssignments.indexOf(championName)
      if (idx !== -1) this.teamSlotAssignments[idx] = null
    },

    getAvgBattleTime(): string {
      return this.formatTime(Math.round(this.totalBattleTime / this.totalBattles) || 0)
    },

    // Generiert einen Kill-Schedule: pro Team zufällig viele Kill-Events verteilt über die Spielzeit
    generateKillSchedule() {
      const events: Array<{ gameTime: number; team: 1 | 2 }> = []
      const totalEvents =
        KILL_EVENTS_PER_TEAM_MIN +
        Math.floor(Math.random() * (KILL_EVENTS_PER_TEAM_MAX - KILL_EVENTS_PER_TEAM_MIN + 1))
      for (let i = 0; i < totalEvents; i++) {
        // Kill-Events erst ab Spielminute 2 (120s), gleichmäßig bis Ende
        const gameTime = 120 + Math.floor(Math.random() * (1800 - 120))
        const team = (Math.random() < 0.5 ? 1 : 2) as 1 | 2
        events.push({ gameTime, team })
      }
      events.sort((a, b) => a.gameTime - b.gameTime)
      this.killEventSchedule = events
    },

    // Startet die 30-Sekunden-Battle-Simulation: Game-Timer + Kill-Events pro Tick
    startBattleSimulation() {
      if (this.battleSimIntervalId) clearInterval(this.battleSimIntervalId)
      this.battleSimIntervalId = setInterval(() => {
        this.battleTime += 60 // 1 Spielminute pro Sekunde

        // Kill-Events abarbeiten, die bis zur aktuellen Spielzeit eingetreten sind
        const pending = this.killEventSchedule.filter((e) => e.gameTime <= this.battleTime)
        this.killEventSchedule = this.killEventSchedule.filter((e) => e.gameTime > this.battleTime)
        for (const event of pending) {
          const attackingTeam = event.team === 1 ? this.team1 : this.team2
          const defendingTeam = event.team === 1 ? this.team2 : this.team1
          if (attackingTeam.length === 0 || defendingTeam.length === 0) continue
          // Kill auf zufälligen Angreifer
          const killer = attackingTeam[Math.floor(Math.random() * attackingTeam.length)]
          killer.kills += 1
          // 1-2 Assists
          const assistCount = Math.random() < 0.6 ? 1 : 2
          const others = attackingTeam.filter((c) => c !== killer)
          for (let i = 0; i < Math.min(assistCount, others.length); i++) {
            others[Math.floor(Math.random() * others.length)].assists += 1
          }
          // Death auf zufälligen Verteidiger
          if (Math.random() < 0.85) {
            defendingTeam[Math.floor(Math.random() * defendingTeam.length)].deaths += 1
          }
        }

        // Simulation beenden nach 30 Spielminuten
        if (this.battleTime >= BATTLE_REAL_DURATION_SECONDS * 60) {
          clearInterval(this.battleSimIntervalId!)
          this.battleSimIntervalId = null
          this.battlePhase = 'result'
        }
      }, 1000)
    },

    // Lädt die Champion-Liste aus einer CSV-Datei und gibt sie als Array zurück
    async loadChampions() {
      return fetchChampionNames()
    },

    // Erstellt neue zufällige Teams für den nächsten Kampf mit Bard als Spieler-Champion
    async refreshTeams() {
      const champions = await this.loadChampions()
      const selected = this.getRandomChampions(champions, 5)

      this.team1 = [
        { name: 'Bard', rank: this.currentRank.tier, ...this.getStats() },
        ...this.selectedChampions.map((name) => ({ name, rank: 'Silver', ...this.getStats() })),
      ]
      this.team2 = selected.map((name) => ({ name, rank: 'Silver', ...this.getStats() }))
    },

    // Erstellt ein leeres Statistik-Objekt mit 0 Kills, Deaths und Assists
    getStats() {
      return { kills: 0, deaths: 0, assists: 0 }
    },

    // Wählt zufällig eine bestimmte Anzahl Champions aus der Champion-Liste aus
    getRandomChampions(champions: string[], count: number) {
      const arr = [...champions]
      const result = []
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * arr.length)
        result.push(arr.splice(idx, 1)[0])
      }
      return result
    },

    // Setzt die Statistiken aller Champions eines Teams auf 0 zurück
    resetTeamStats(team: ChampionState[]) {
      team.forEach((champ) => {
        champ.kills = 0
        champ.deaths = 0
        champ.assists = 0
      })
    },

    // Setzt alle Kampfstatistiken zurück und stoppt laufende Timer für einen neuen Kampf
    clearBattle() {
      this.timerIds.forEach((interval) => clearTimeout(interval))
      this.timerIds = []
      if (this.battleSimIntervalId) {
        clearInterval(this.battleSimIntervalId)
        this.battleSimIntervalId = null
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
      this.battlePhase = 'playing'
      this.predeterminedWin = null
    },

    // Zeigt zeitgestaffelte Chat-Nachrichten mit phasenbezogenem Inhalt über 30 real-Sekunden
    showRandomChatMessagesSequentially() {
      const MESSAGE_COUNT = 14
      const allChampions = [
        ...this.team1.map((champ) => ({ name: champ.name, team: 1 as 1 | 2 })),
        ...this.team2.map((champ) => ({ name: champ.name, team: 2 as 1 | 2 })),
      ]
      if (allChampions.length === 0) return

      for (let i = 0; i < MESSAGE_COUNT; i++) {
        // Zufälliger Delay zwischen 0 und 29000ms, leicht gegen Ende gewichtet
        const delay = Math.floor(Math.random() * (BATTLE_REAL_DURATION_SECONDS - 1) * 1000)
        const timeoutId = setTimeout(() => {
          const currentGameTime = this.battleTime
          // Phasenbasierte Nachrichtenauswahl
          let pool: string[]
          if (currentGameTime < 600) {
            pool = earlyGameMessages
          } else if (currentGameTime < 1200) {
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

    // Formatiert Sekunden in MM:SS Format für die Chat-Zeitanzeige
    formatTime(seconds: number) {
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    },

    // Generiert eine zufällige Zeitspanne zwischen 30 und 500 Sekunden für Chat-Messages
    getRandomTimeIncrement() {
      return Math.floor(Math.random() * BATTLE_TIME_RANGE_SECONDS) + BATTLE_TIME_MIN_SECONDS
    },

    // Bestimmt den Kampfausgang vorab, damit die Minimap den Nexus-Push animieren kann
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
      const drainReduction = (battleMods.enemyMaxHPDrainPerSecond ?? 0) * 30
      const finalOpponentPower = Math.max(
        effectiveOpponentPower * 0.1,
        effectiveOpponentPower * (1 - drainReduction),
      )
      if (battleMods.bigBangAvailable) {
        playerPower *= 5
      }
      const winProbability = this.calculateWinProbability(playerPower, finalOpponentPower)
      this.predeterminedWin = Math.random() < winProbability
    },

    // Initialisiert einen neuen Kampf: Teams aufräumen, neu erstellen und Simulation starten
    async initializeBattle() {
      this.clearBattle()
      this.currentBattleId++
      await this.refreshTeams()
      this.predetermineOutcome()
      if (this.team1.length > 0 && this.team2.length > 0) {
        this.generateKillSchedule()
        this.startBattleSimulation()
        this.showRandomChatMessagesSequentially()
      }
      logger.group('Battle Init', () => {
        logger.info('Battle', `Team 1: ${this.team1.map((c) => c.name).join(', ')}`)
        logger.info('Battle', `Team 2: ${this.team2.map((c) => c.name).join(', ')}`)
      })
    },

    // Hauptfunktion die einen kompletten Kampf simuliert und MMR/LP basierend auf Sieg/Niederlage aktualisiert
    async simulateBattle(opponentMMR: number) {
      const gameStore = useGameStore()

      // Speichert alte Werte für Vergleich
      this.autoBattleOldMMR = this.mmr
      this.autoBattleOldLP = this.currentRank.lp

      let playerPower = gameStore.totalPower

      // Erstellt Gegner und berechnet Gewinnchancen
      const opponent = this.generateOpponent(opponentMMR)

      // Augment battle modifiers
      const augmentStore = useAugmentStore()
      const battleMods = augmentStore.getActiveBattleModifiers(
        gameStore.activeAugments,
        gameStore.activeModifier as Record<string, unknown>,
      )
      const effectiveOpponentPower = opponent.power * (battleMods.enemySpeedMultiplier ?? 1)
      const drainReduction = (battleMods.enemyMaxHPDrainPerSecond ?? 0) * 30
      const finalOpponentPower = Math.max(
        effectiveOpponentPower * 0.1,
        effectiveOpponentPower * (1 - drainReduction),
      )
      if (battleMods.bigBangAvailable) {
        playerPower *= 5
        augmentStore.consumeBigBang()
      }

      const winProbability = this.calculateWinProbability(playerPower, finalOpponentPower)
      const battleResult = this.predeterminedWin ?? Math.random() < winProbability

      // Aktualisiert Rang basierend auf Kampfergebnis
      this.updateRanking(battleResult, opponentMMR)

      // Berechnet tatsächliche Änderungen für UI-Anzeige
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

    // Befördert den Spieler in den nächsthöheren Rang oder Division basierend auf genügend LP
    promoteRank() {
      const currentTier = this.currentRank.tier
      const currentTierIndex = this.tierOrder.indexOf(currentTier)

      // Spezielle Logik für höchste Ränge
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

      // Normale Beförderungslogik durch Divisionen und Tiers
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

    // Degradiert den Spieler in den nächstniedrigeren Rang bei zu wenig LP
    demoteRank() {
      const currentTier = this.currentRank.tier
      const currentTierIndex = this.tierOrder.indexOf(currentTier)

      // Verhindert Abstieg unter Iron IV - setzt LP auf 0 da dies der niedrigste Rang ist
      if (currentTier === 'Iron' && this.currentRank.division === 'IV') {
        this.currentRank.lp = Math.max(0, this.currentRank.lp)
        return
      }

      // Spezielle Abstiegslogik für höchste Ränge
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

      // Normale Abstiegslogik
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

    // Berechnet LP-Gewinn/Verlust basierend auf MMR-Änderung
    calculateLPChange(mmrChange: number, won: boolean) {
      const lpChange = won ? LP_BASE_CHANGE : -LP_BASE_CHANGE
      const mmrFactor = Math.abs(mmrChange) / ELO_K_FACTOR
      return Math.round(lpChange * mmrFactor)
    },

    // Konvertiert MMR-Wert in Kampfstärke für Kampfsimulationen
    mmrToPower(mmr: number) {
      return Math.max(100, Math.floor(mmr * MMR_TO_POWER_MULTIPLIER))
    },

    // Berechnet Gewinnwahrscheinlichkeit basierend auf Kampfkraft-Unterschied zwischen Spieler und Gegner
    calculateWinProbability(playerPower: number, opponentPower: number) {
      const powerDifference = playerPower - opponentPower
      const expectedScore = 1 / (1 + Math.pow(10, -powerDifference / ELO_RATING_SCALE))
      const luckModifier = (Math.random() - 0.5) * this.battleFormula.luckFactor
      return Math.max(0.1, Math.min(0.9, expectedScore + luckModifier))
    },

    // Erstellt einen zufälligen Gegner mit ähnlichem MMR (±200 Variation)
    generateOpponent(targetMMR: number) {
      const opponentMMR = targetMMR + (Math.random() - 0.5) * OPPONENT_MMR_VARIANCE
      return {
        mmr: opponentMMR,
        power: this.mmrToPower(opponentMMR),
        rank: this.mmrToRank(opponentMMR),
      }
    },

    // Konvertiert MMR-Wert in entsprechenden Rang und Division basierend auf festen Schwellenwerten
    mmrToRank(mmr: number) {
      for (let i = MMR_RANK_THRESHOLDS.length - 1; i >= 0; i--) {
        if (mmr >= MMR_RANK_THRESHOLDS[i].minMMR) return MMR_RANK_THRESHOLDS[i]
      }
      return MMR_RANK_THRESHOLDS[0]
    },

    // Aktualisiert MMR nach Kampf mit ELO-Rating System
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

    // Aktualisiert LP und prüft automatisch auf Beförderung oder Abstieg
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

    // Ein Battle-Zyklus: Ergebnis berechnen, anzeigen, dann je nach autoSkip weiterfahren
    async runBattleCycle() {
      if (!this.autoBattleEnabled) return

      const result = await this.simulateBattle(this.mmr)
      this.lastAutoBattleResult = result
      this.showAutoBattleResult = true

      if (this.autoSkipEnabled) {
        // Countdown von 4 bis 0 anzeigen
        this.resultCountdown = 4
        if (this.resultCountdownTimer) clearInterval(this.resultCountdownTimer)
        this.resultCountdownTimer = setInterval(() => {
          this.resultCountdown--
          if (this.resultCountdown <= 0) {
            clearInterval(this.resultCountdownTimer!)
            this.resultCountdownTimer = null
          }
        }, 1000)
        // Nach 4s automatisch weitergehen
        const pauseId = setTimeout(async () => {
          await this.proceedToNextBattle()
        }, 4000)
        this.timerIds.push(pauseId)
      }
      // sonst: warten auf manualDismissResult()-Aufruf durch UI
    },

    // Startet die nächste Battle: Reset, neue Teams, neuer Countdown
    async proceedToNextBattle() {
      await this.initializeBattle()
      this.startCountdown()
      this.autoBattleTimer = setTimeout(() => this.runBattleCycle(), this.autoBattleInterval)
    },

    // Manuelles Weiterklicken: laufende Pause-Timer abbrechen und sofort zur nächsten Battle
    async manualDismissResult() {
      this.timerIds.forEach((id) => clearTimeout(id))
      this.timerIds = []
      if (this.resultCountdownTimer) {
        clearInterval(this.resultCountdownTimer)
        this.resultCountdownTimer = null
      }
      this.resultCountdown = 0
      await this.proceedToNextBattle()
    },

    // Wechselt Auto-Skip an/aus
    toggleAutoSkip() {
      this.autoSkipEnabled = !this.autoSkipEnabled
      if (!this.autoSkipEnabled) {
        this.timerIds.forEach((id) => clearTimeout(id))
        this.timerIds = []
        if (this.resultCountdownTimer) {
          clearInterval(this.resultCountdownTimer)
          this.resultCountdownTimer = null
        }
        this.resultCountdown = 0
      }
    },

    // Startet den automatischen Kampfmodus
    async startAutoBattle() {
      if (this.autoBattleEnabled) return
      this.autoBattleEnabled = true
      await this.initializeBattle()
      this.startCountdown()
      this.autoBattleTimer = setTimeout(() => this.runBattleCycle(), this.autoBattleInterval)
    },

    // Initialisiert den dauerhaften Auto-Battle Modus nur einmal pro Session
    async initializePersistentAutoBattle() {
      if (this.isAutoBattleInitialized) return
      this.isAutoBattleInitialized = true
      this.autoBattleEnabled = false // reset: verhindert early-return in startAutoBattle() nach Page-Reload
      await this.startAutoBattle()
    },

    // Startet einen Countdown-Timer der die Sekunden bis zum nächsten Kampf anzeigt
    startCountdown() {
      this.timeUntilNextBattle = this.autoBattleInterval / 1000
      if (this.countdownTimer) clearInterval(this.countdownTimer)
      this.countdownTimer = setInterval(() => {
        if (document.hidden) return
        this.timeUntilNextBattle--
        if (this.timeUntilNextBattle <= 0) {
          clearInterval(this.countdownTimer)
          this.countdownTimer = null
        }
      }, 1000)
    },

    // Markiert einen Kampf als vom UI verarbeitet für saubere Anzeige
    markBattleProcessed() {
      this.autoBattleReady = true
    },

    // Stoppt den automatischen Kampfmodus und alle laufenden Timer
    stopAutoBattle() {
      this.autoBattleEnabled = false
      if (this.autoBattleTimer) clearTimeout(this.autoBattleTimer)
      if (this.countdownTimer) clearInterval(this.countdownTimer)
    },
  },
})
