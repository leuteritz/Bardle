import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { battleMessages } from '../config/messages'

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

    // Auto-Battle System - steuert automatische Kämpfe alle 10 Sekunden
    autoBattleEnabled: false,
    autoBattleInterval: 10000,
    autoBattleTimer: null,
    lastAutoBattleResult: null,

    // UI-Anzeige Variablen - zeigt Änderungen von MMR und LP nach Kämpfen an
    lastMmrChange: 0,
    lastLpChange: 0,
    showAutoBattleResult: false,
    autoBattleOldMMR: 0,
    autoBattleOldLP: 0,
    autoBattleReady: true,

    // Spiel-Logik - Champions, Teams und Kampfstatistiken
    gameTime: 0,
    ownedChampions: ['Bard'],
    selectedChampions: [],
    battleFormula: {
      baseWinChance: 0.5,
      powerDifferenceMultiplier: 0.1,
      luckFactor: 0.15,
    },

    // Statistiken - verfolgt Gesamtstatistiken aller Kämpfe
    totalBattles: 0,
    totalWins: 0,
    totalLosses: 0,
    totalKills: 0,
    totalDeaths: 0,
    totalAssists: 0,
    avgGameTime: 0,
    totalGameTime: 0,
    bestWinStreak: 0,
    currentWinStreak: 0,

    // Live-Battle Interface - Chat, Teams und Timer für laufende Kämpfe
    isAutoBattleInitialized: false,
    currentBattleId: 0,
    timeUntilNextBattle: 0,
    countdownTimer: null,
    chatMessages: [],
    team1: [],
    team2: [],
    intervals: [] as ReturnType<typeof setInterval>[],
  }),

  actions: {
    // Gibt den Bildpfad für einen Champion zurück basierend auf seinem Namen
    getChampionImage(name: string) {
      switch (name) {
        case 'Bard':
          return '/img/BardAbilities/Bard.png'
        case name:
          return '/img/champion/' + name + '.jpg'
        default:
          return '/img/Enemy.png'
      }
    },

    getAvgGameTime(): number {
      return this.formatTime(Math.round(this.totalGameTime / this.totalBattles) || 0)
    },

    // Aktualisiert zufällig die Kampfstatistiken (Kills/Deaths/Assists) aller Champions während eines Kampfes
    randomStatsTick() {
      const gameStore = useGameStore()
      this.team1.forEach((champ) => {
        if (Math.random() < 0.5) champ.kills += Math.round(Math.random() * 3)
        if (Math.random() < 0.3) champ.deaths += Math.round(Math.random() * 2)
        if (Math.random() < 0.7) champ.assists += Math.round(Math.random() * 7)
      })

      this.team2.forEach((champ) => {
        if (Math.random() < 0.5) champ.kills += Math.round(Math.random() * 3)
        if (Math.random() < 0.3) champ.deaths += Math.round(Math.random() * 2)
        if (Math.random() < 0.7) champ.assists += Math.round(Math.random() * 7)
      })

      const interval = setTimeout(this.randomStatsTick, gameStore.gameSpeed)
      this.intervals.push(interval)
    },

    // Lädt die Champion-Liste aus einer CSV-Datei und gibt sie als Array zurück
    async loadChampions() {
      const response = await fetch('/src/config/champion.csv')
      const text = await response.text()
      return text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
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

    // Setzt alle Kampfstatistiken zurück und stoppt laufende Timer für einen neuen Kampf
    clearBattle() {
      console.log('clearBattle')
      this.intervals.forEach((interval) => clearTimeout(interval))
      this.intervals.length = 0
      this.team1.forEach((champ) => {
        champ.kills = 0
        champ.deaths = 0
        champ.assists = 0
      })
      this.team2.forEach((champ) => {
        champ.kills = 0
        champ.deaths = 0
        champ.assists = 0
      })
      this.chatMessages = []
      this.gameTime = 0
    },

    // Zeigt nacheinander zufällige Chat-Nachrichten von Champions während des Kampfes an
    showRandomChatMessagesSequentially() {
      const gameStore = useGameStore()

      const messages = [...battleMessages]

      const showNext = () => {
        const idx = Math.floor(Math.random() * messages.length)
        const msg = messages[idx]
        let chatMsg

        if (typeof msg === 'string') {
          const allChampions = [
            ...this.team1.map((champ) => ({ name: champ.name, team: 1 })),
            ...this.team2.map((champ) => ({ name: champ.name, team: 2 })),
          ]
          const randomChampion = allChampions[Math.floor(Math.random() * allChampions.length)]
          this.gameTime += this.getRandomTimeIncrement()
          chatMsg = {
            user: randomChampion.name,
            text: msg,
            time: this.formatTime(this.gameTime),
            team: randomChampion.team,
          }
        }
        this.chatMessages.push(chatMsg)
        messages.splice(idx, 1)

        if (messages.length > 0) {
          const currentTimeoutId = setTimeout(showNext, gameStore.gameSpeed)
          this.intervals.push(currentTimeoutId)
        }
      }

      showNext()
    },

    // Formatiert Sekunden in MM:SS Format für die Chat-Zeitanzeige
    formatTime(seconds: number) {
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    },

    // Generiert eine zufällige Zeitspanne zwischen 30 und 500 Sekunden für Chat-Messages
    getRandomTimeIncrement() {
      return Math.floor(Math.random() * 471) + 30
    },

    // Hauptfunktion die einen kompletten Kampf simuliert und MMR/LP basierend auf Sieg/Niederlage aktualisiert
    async simulateBattle(opponentMMR) {
      console.log('simulateBattle')
      const gameStore = useGameStore()

      // Speichert alte Werte für Vergleich
      this.autoBattleOldMMR = this.mmr
      this.autoBattleOldLP = this.currentRank.lp

      const playerPower = gameStore.totalPower

      // Erstellt Gegner und berechnet Gewinnchancen
      const opponent = this.generateOpponent(opponentMMR)
      const winProbability = this.calculateWinProbability(playerPower, opponent.power)
      const battleResult = Math.random() < winProbability

      // Aktualisiert Rang basierend auf Kampfergebnis
      await this.updateRanking(battleResult, opponentMMR)

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

      this.totalGameTime += this.gameTime
      this.lastMmrChange = actualMmrChange
      this.lastLpChange = actualLpChange
      this.lastAutoBattleResult = {
        won: battleResult,
        opponent,
        winProbability,
      }

      return this.lastAutoBattleResult
    },

    // Befördert den Spieler in den nächsthöheren Rang oder Division basierend auf genügend LP
    async promoteRank() {
      const currentTier = this.currentRank.tier
      const currentTierIndex = this.tierOrder.indexOf(currentTier)

      // Spezielle Logik für höchste Ränge
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
    async demoteRank() {
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

      // Normale Abstiegslogik
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

    // Berechnet LP-Gewinn/Verlust basierend auf MMR-Änderung (mehr MMR-Änderung = mehr LP)
    calculateLPChange(mmrChange, won) {
      const baseLPChange = 20
      const lpChange = won ? baseLPChange : -baseLPChange
      const mmrFactor = Math.abs(mmrChange) / 32
      return Math.round(lpChange * mmrFactor)
    },

    // Konvertiert MMR-Wert in Kampfstärke für Kampfsimulationen (MMR × 1,5)
    mmrToPower(mmr) {
      return Math.max(100, Math.floor(mmr * 1.5))
    },

    // Berechnet Gewinnwahrscheinlichkeit basierend auf Kampfkraft-Unterschied zwischen Spieler und Gegner
    calculateWinProbability(playerPower, opponentPower) {
      const powerDifference = playerPower - opponentPower
      const expectedScore = 1 / (1 + Math.pow(10, -powerDifference / 400))
      const luckModifier = (Math.random() - 0.5) * this.battleFormula.luckFactor
      return Math.max(0.1, Math.min(0.9, expectedScore + luckModifier))
    },

    // Erstellt einen zufälligen Gegner mit ähnlichem MMR (±200 Variation)
    generateOpponent(targetMMR) {
      const mmrVariance = 200
      const opponentMMR = targetMMR + (Math.random() - 0.5) * mmrVariance
      return {
        mmr: opponentMMR,
        power: this.mmrToPower(opponentMMR),
        rank: this.mmrToRank(opponentMMR),
      }
    },

    // Konvertiert MMR-Wert in entsprechenden Rang und Division basierend auf festen Schwellenwerten
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

    // Aktualisiert MMR nach Kampf mit ELO-Rating System (K-Faktor 32)
    async updateRanking(won, opponentMMR) {
      const currentMMR = this.mmr
      const K = 32
      const expectedScore = 1 / (1 + Math.pow(10, (opponentMMR - currentMMR) / 400))
      const actualScore = won ? 1 : 0
      const mmrChange = Math.round(K * (actualScore - expectedScore))
      this.mmr += mmrChange
      const lpChange = this.calculateLPChange(mmrChange, won)
      await this.updateLP(lpChange)
    },

    // Aktualisiert LP und prüft automatisch auf Beförderung oder Abstieg
    async updateLP(lpChange) {
      const currentTier = this.currentRank.tier
      this.currentRank.lp += lpChange
      let promotionThreshold = 100
      if (currentTier === 'Master') promotionThreshold = 500
      else if (currentTier === 'Grandmaster') promotionThreshold = 1000
      if (this.currentRank.lp >= promotionThreshold) await this.promoteRank()
      if (this.currentRank.lp < 0) await this.demoteRank()
    },

    // Startet den automatischen Kampfmodus der alle 10 Sekunden neue Kämpfe simuliert
    async startAutoBattle() {
      console.log('startAutoBattle')
      if (this.autoBattleEnabled) return
      this.autoBattleEnabled = true

      // Teams und Chat sofort beim Start erstellen
      this.clearBattle()
      await this.refreshTeams()
      this.randomStatsTick()

      if (this.team1.length > 0 && this.team2.length > 0) {
        this.showRandomChatMessagesSequentially()
      }

      const runBattleCycle = async () => {
        console.log('runBattleCycle')

        if (!this.autoBattleEnabled) return

        this.currentBattleId++
        const result = await this.simulateBattle(this.mmr)
        this.lastAutoBattleResult = result
        this.showAutoBattleResult = true

        // Nach dem Battle neue Teams für den nächsten Battle erstellen
        setTimeout(async () => {
          this.clearBattle()
          await this.refreshTeams()
          this.randomStatsTick()

          if (this.team1.length > 0 && this.team2.length > 0) {
            this.showRandomChatMessagesSequentially()
          }

          this.startCountdown()
          setTimeout(runBattleCycle, this.autoBattleInterval)
        }, 1000) // Kurze Pause um das Ergebnis zu zeigen
      }

      // Ersten Battle nach 10 Sekunden starten
      this.startCountdown()
      setTimeout(runBattleCycle, this.autoBattleInterval)
    },

    // Initialisiert den dauerhaften Auto-Battle Modus nur einmal pro Session
    async initializePersistentAutoBattle() {
      console.log('initializePersistentAutoBattle')
      if (this.isAutoBattleInitialized) return
      this.isAutoBattleInitialized = true
      await this.startAutoBattle()
    },

    // Startet einen Countdown-Timer der die Sekunden bis zum nächsten Kampf anzeigt
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
