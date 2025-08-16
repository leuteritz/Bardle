import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'

export const useBattleStore = defineStore('battle', {
  state: () => ({
    mmr: 1000,
    currentRank: {
      tier: 'Iron',
      division: 'IV',
      lp: 0,
    },
    // Battle History
    battleHistory: [],
    rankOrder: ['IV', 'III', 'II', 'I'],
    tierOrder: [
      'Iron',
      'Bronze',
      'Silver',
      'Gold',
      'Platinum',
      'Emerald',
      'Diamond',
      'Master',
      'Grandmaster',
      'Challenger',
    ],
    autoBattleEnabled: false,
    autoBattleInterval: 10000,
    autoBattleTimer: null,
    lastAutoBattleResult: null,
    // Neu für saubere LP/MMR Anzeige:
    lastMmrChange: 0,
    lastLpChange: 0,
    showAutoBattleResult: false,
    autoBattleOldMMR: 0,
    autoBattleOldLP: 0,
    autoBattleReady: true,
    gameTime: 0,
    ownedChampions: ['Bard'],
    selectedChampions: [],
    battleFormula: {
      baseWinChance: 0.5,
      powerDifferenceMultiplier: 0.1,
      luckFactor: 0.15,
    },
    totalBattles: 0,
    totalWins: 0,
    totalLosses: 0,
    totalKills: 0,
    totalDeaths: 0,
    totalAssists: 0,
    isAutoBattleInitialized: false,
    currentBattleId: 0,
    timeUntilNextBattle: 0,
    countdownTimer: null,
    chatMessages: [],
  }),

  actions: {
    // Simuliert einen Kampf und aktualisiert das Ranking
    async simulateBattle(opponentMMR) {
      const gameStore = useGameStore()
      // Merke ALT-Werte
      this.autoBattleOldMMR = this.mmr
      this.autoBattleOldLP = this.currentRank.lp

      const playerPower = gameStore.totalPower

      // Gegner- und Wahrscheinlichkeits-Logik wie gehabt
      const opponent = this.generateOpponent(opponentMMR)
      const winProbability = this.calculateWinProbability(playerPower, opponent.power)
      const battleResult = Math.random() < winProbability

      // Ranking updaten
      await this.updateRanking(battleResult, opponentMMR)

      // Berechne Änderung nach Update
      const actualMmrChange = this.mmr - this.autoBattleOldMMR
      const actualLpChange = this.currentRank.lp - this.autoBattleOldLP

      this.totalBattles++
      if (battleResult) this.totalWins++
      else this.totalLosses++

      // Speichere Änderungen für Komponente
      this.lastMmrChange = actualMmrChange
      this.lastLpChange = actualLpChange
      this.lastAutoBattleResult = {
        won: battleResult,
        opponent,
        winProbability,
      }

      return this.lastAutoBattleResult
    },

    // Befördert den Spieler in den nächsthöheren Rang
    async promoteRank() {
      const gameStore = useGameStore()
      const currentTier = this.currentRank.tier
      const currentTierIndex = this.tierOrder.indexOf(currentTier)

      if (currentTier === 'Master') {
        if (this.currentRank.lp >= 500) {
          this.currentRank.tier = 'Grandmaster'
          this.currentRank.division = 'I'
        }
        return
      }
      if (currentTier === 'Grandmaster') {
        if (this.currentRank.lp >= 1000) {
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

    // Degradiert den Spieler in den nächstniedrigeren Rang
    async demoteRank() {
      const gameStore = useGameStore()
      const currentTier = this.currentRank.tier
      const currentTierIndex = this.tierOrder.indexOf(currentTier)

      if (currentTier === 'Challenger') {
        this.currentRank.tier = 'Grandmaster'
        this.currentRank.lp = 900
        this.currentRank.division = 'I'
        return
      }
      if (currentTier === 'Grandmaster') {
        this.currentRank.tier = 'Master'
        this.currentRank.lp = 400
        this.currentRank.division = 'I'
        return
      }
      if (currentTier === 'Master') {
        this.currentRank.tier = 'Diamond'
        this.currentRank.lp = 75
        this.currentRank.division = 'I'
        return
      }

      this.currentRank.lp = 75
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

    // Berechnet die LP-Änderung basierend auf MMR-Änderung und Kampfergebnis
    calculateLPChange(mmrChange, won) {
      const baseLPChange = 20
      const lpChange = won ? baseLPChange : -baseLPChange
      const mmrFactor = Math.abs(mmrChange) / 32
      return Math.round(lpChange * mmrFactor)
    },

    // Konvertiert MMR in Kampfkraft
    mmrToPower(mmr) {
      return Math.max(100, Math.floor(mmr * 1.5))
    },

    // Berechnet die Gewinnwahrscheinlichkeit basierend auf Kampfkraft
    calculateWinProbability(playerPower, opponentPower) {
      const powerDifference = playerPower - opponentPower
      const expectedScore = 1 / (1 + Math.pow(10, -powerDifference / 400))
      const luckModifier = (Math.random() - 0.5) * this.battleFormula.luckFactor
      return Math.max(0.1, Math.min(0.9, expectedScore + luckModifier))
    },

    // Generiert einen Gegner mit zufälligem MMR
    generateOpponent(targetMMR) {
      const mmrVariance = 200
      const opponentMMR = targetMMR + (Math.random() - 0.5) * mmrVariance
      return {
        mmr: opponentMMR,
        power: this.mmrToPower(opponentMMR),
        rank: this.mmrToRank(opponentMMR),
      }
    },

    // Konvertiert MMR in Rang und Division
    mmrToRank(mmr) {
      const ranks = [
        { tier: 'Iron', division: 'IV', minMMR: 0 },
        { tier: 'Bronze', division: 'IV', minMMR: 500 },
        { tier: 'Silver', division: 'IV', minMMR: 1000 },
        { tier: 'Gold', division: 'IV', minMMR: 1500 },
        { tier: 'Platinum', division: 'IV', minMMR: 2000 },
        { tier: 'Diamond', division: 'IV', minMMR: 2500 },
        { tier: 'Master', division: 'I', minMMR: 3000 },
        { tier: 'Grandmaster', division: 'I', minMMR: 3500 },
        { tier: 'Challenger', division: 'I', minMMR: 4000 },
      ]
      for (let i = ranks.length - 1; i >= 0; i--) {
        if (mmr >= ranks[i].minMMR) return ranks[i]
      }
      return ranks[0]
    },

    // Aktualisiert das MMR basierend auf Kampfergebnis
    async updateRanking(won, opponentMMR) {
      const gameStore = useGameStore()
      const currentMMR = this.mmr
      const K = 32
      const expectedScore = 1 / (1 + Math.pow(10, (opponentMMR - currentMMR) / 400))
      const actualScore = won ? 1 : 0
      const mmrChange = Math.round(K * (actualScore - expectedScore))
      this.mmr += mmrChange
      const lpChange = this.calculateLPChange(mmrChange, won)
      await this.updateLP(lpChange)
    },

    // Aktualisiert die LP und prüft auf Beförderung/Degradierung
    async updateLP(lpChange) {
      const gameStore = useGameStore()
      const currentTier = this.currentRank.tier
      this.currentRank.lp += lpChange
      let promotionThreshold = 100
      if (currentTier === 'Master') promotionThreshold = 500
      else if (currentTier === 'Grandmaster') promotionThreshold = 1000
      if (this.currentRank.lp >= promotionThreshold) await this.promoteRank()
      if (this.currentRank.lp < 0) await this.demoteRank()
    },

    // Startet den automatischen Kampfmodus
    async startAutoBattle() {
      if (this.autoBattleEnabled) return
      this.autoBattleEnabled = true
      const gameStore = useGameStore()
      const runBattleCycle = async () => {
        if (!this.autoBattleEnabled) return
        this.currentBattleId++
        const result = await this.simulateBattle(this.mmr)
        this.lastAutoBattleResult = result
        this.showAutoBattleResult = true
        this.startCountdown()
        setTimeout(runBattleCycle, this.autoBattleInterval)
      }
      await runBattleCycle()
    },

    // Initialisiert den persistenten automatischen Kampfmodus
    async initializePersistentAutoBattle() {
      if (this.isAutoBattleInitialized) return
      this.isAutoBattleInitialized = true
      await this.startAutoBattle()
    },

    // Startet den Countdown bis zum nächsten Kampf
    startCountdown() {
      this.timeUntilNextBattle = this.autoBattleInterval / 1000
      if (this.countdownTimer) clearInterval(this.countdownTimer)
      this.countdownTimer = setInterval(() => {
        this.timeUntilNextBattle--
        if (this.timeUntilNextBattle <= 0) {
          clearInterval(this.countdownTimer)
          this.countdownTimer = null
        }
      }, 1000)
    },

    // Markiert einen Kampf als verarbeitet
    markBattleProcessed() {
      this.autoBattleReady = true
    },

    // Stoppt den automatischen Kampfmodus
    stopAutoBattle() {
      this.autoBattleEnabled = false
      if (this.autoBattleTimer) clearTimeout(this.autoBattleTimer)
      if (this.countdownTimer) clearInterval(this.countdownTimer)
    },
  },
})
