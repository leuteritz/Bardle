import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'

export const useBattleStore = defineStore('battle', {
  state: () => ({
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
    autoBattleInterval: 10000, // 10 Sekunden zwischen Kämpfen
    autoBattleTimer: null,
    lastAutoBattleResult: null,
    showAutoBattleResult: false,
    autoBattleOldMMR: 0,
    autoBattleOldLP: 0,
    autoBattleReady: true,

    ownedChampions: ['Bard'],
    selectedChampions: [],

    // Battle Mechanics
    battleFormula: {
      baseWinChance: 0.5,
      powerDifferenceMultiplier: 0.1,
      luckFactor: 0.15, // Zufallseinfluss
    },
  }),

  actions: {
    // Hauptkampffunktion mit Wahrscheinlichkeitsberechnung
    async simulateBattle(opponentMMR) {
      const gameStore = useGameStore()
      const playerPower = gameStore.totalPower

      // Simuliere Gegner basierend auf MMR
      const opponent = this.generateOpponent(opponentMMR)

      // Berechne Gewinnwahrscheinlichkeit (ähnlich ELO-System)
      const winProbability = this.calculateWinProbability(playerPower, opponent.power)

      // Simuliere Kampf
      const battleResult = Math.random() < winProbability

      // Update Ranking basierend auf Ergebnis
      await this.updateRanking(battleResult, opponentMMR)

      // Belohnungen bei Sieg
      // if (battleResult) {
      //   gameStore.meeps += this.calculateMeepReward(opponent.rank)
      // }

      return {
        won: battleResult,
        opponent,
        winProbability,
        // meepsEarned: battleResult ? this.calculateMeepReward(opponent.rank) : 0,
      }
    },

    async promoteRank() {
      const gameStore = useGameStore()

      const currentTier = gameStore.currentRank.tier
      const currentTierIndex = this.tierOrder.indexOf(currentTier)

      // Master+ Ränge (spezielle LP-Schwellenwerte)
      if (currentTier === 'Master') {
        if (gameStore.currentRank.lp >= 500) {
          gameStore.currentRank.tier = 'Grandmaster'

          gameStore.currentRank.division = 'I'
        }
        return
      }

      if (currentTier === 'Grandmaster') {
        if (gameStore.currentRank.lp >= 1000) {
          gameStore.currentRank.tier = 'Challenger'
          gameStore.currentRank.division = 'I'
        }
        return
      }

      if (currentTier === 'Challenger') {
        // Challenger kann nicht weiter aufsteigen
        return
      }

      // Iron bis Diamond: Standard-Divisionen
      const currentDivisionIndex = this.rankOrder.indexOf(gameStore.currentRank.division)

      if (currentDivisionIndex < this.rankOrder.length - 1) {
        // Nächste Division im gleichen Tier (IV → III → II → I)
        gameStore.currentRank.division = this.rankOrder[currentDivisionIndex + 1]
        gameStore.currentRank.lp = 0
      } else {
        // Aufstieg zum nächsten Tier (I → nächster Tier IV)

        console.log('Aufstieg zum nächsten Tier')
        // Diamond ist Index 6
        const nextTier = this.tierOrder[currentTierIndex + 1]
        gameStore.currentRank.tier = nextTier

        if (nextTier === 'Master') {
          // Master hat keine Divisionen
          gameStore.currentRank.division = 'I'
          gameStore.currentRank.tier = 'Master'
        } else {
          // Andere Tiers starten bei IV
          gameStore.currentRank.division = 'IV'
        }
        gameStore.currentRank.lp = 0
      }
    },

    async demoteRank() {
      const gameStore = useGameStore()

      const currentTier = gameStore.currentRank.tier
      const currentTierIndex = this.tierOrder.indexOf(currentTier)

      // Master+ Ränge
      if (currentTier === 'Challenger') {
        gameStore.currentRank.tier = 'Grandmaster'
        gameStore.currentRank.lp = 900 // Schutz-LP
        gameStore.currentRank.division = 'I'
        return
      }

      if (currentTier === 'Grandmaster') {
        gameStore.currentRank.tier = 'Master'
        gameStore.currentRank.lp = 400 // Schutz-LP
        gameStore.currentRank.division = 'I'
        return
      }

      if (currentTier === 'Master') {
        gameStore.currentRank.tier = 'Diamond'
        gameStore.currentRank.lp = 75 // Schutz-LP
        gameStore.currentRank.division = 'I'
        return
      }

      // Iron bis Diamond: Standard-Divisionen
      gameStore.currentRank.lp = 75 // Schutz-LP nach Abstieg
      const currentDivisionIndex = this.rankOrder.indexOf(gameStore.currentRank.division)

      if (currentDivisionIndex > 0) {
        // Niedrigere Division im gleichen Tier (I → II → III → IV)
        gameStore.currentRank.division = this.rankOrder[currentDivisionIndex - 1]
      } else {
        // Abstieg zum vorherigen Tier (IV → vorheriger Tier I)
        if (currentTierIndex > 0) {
          gameStore.currentRank.tier = this.tierOrder[currentTierIndex - 1]
          gameStore.currentRank.division = 'I'
        }
      }
    },

    calculateLPChange(mmrChange, won) {
      const baseLPChange = 20
      const lpChange = won ? baseLPChange : -baseLPChange

      // LP-Änderung basierend auf MMR-Änderung anpassen
      const mmrFactor = Math.abs(mmrChange) / 32 // Normalisiert auf K-Faktor
      return Math.round(lpChange * mmrFactor)
    },

    mmrToPower(mmr) {
      // Basis-Formel: MMR zu Kampfkraft
      return Math.max(100, Math.floor(mmr * 1.5))
    },
    // ELO-basierte Gewinnwahrscheinlichkeit
    calculateWinProbability(playerPower, opponentPower) {
      // Standard ELO-Formel angepasst für Kampfkraft
      const powerDifference = playerPower - opponentPower
      const expectedScore = 1 / (1 + Math.pow(10, -powerDifference / 400))

      // Füge Zufallsfaktor hinzu für Spannung
      const luckModifier = (Math.random() - 0.5) * this.battleFormula.luckFactor

      return Math.max(0.1, Math.min(0.9, expectedScore + luckModifier))
    },

    // Generiere Gegner basierend auf MMR
    generateOpponent(targetMMR) {
      const mmrVariance = 200 // ±200 MMR Spielraum
      const opponentMMR = targetMMR + (Math.random() - 0.5) * mmrVariance

      return {
        mmr: opponentMMR,
        power: this.mmrToPower(opponentMMR),
        rank: this.mmrToRank(opponentMMR),
        name: this.generateOpponentName(),
      }
    },

    generateOpponentName() {
      const names = [
        'Bardischer Meister',
        'Chime Sammler',
        'Meep Jäger',
        'Goldener Barde',
        'Mystischer Wanderer',
        'Klang Magier',
      ]
      return names[Math.floor(Math.random() * names.length)]
    },

    calculateMeepReward(opponentRank) {
      // Basis-Belohnung basierend auf Gegner-Rang
      const baseReward = 10
      const rankMultiplier = {
        Iron: 1,
        Bronze: 1.2,
        Silver: 1.5,
        Gold: 2,
        Platinum: 2.5,
        Diamond: 3,
        Master: 4,
        Grandmaster: 5,
        Challenger: 6,
      }

      return Math.floor(baseReward * (rankMultiplier[opponentRank.tier] || 1))
    },

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
        if (mmr >= ranks[i].minMMR) {
          return ranks[i]
        }
      }
      return ranks[0]
    },

    // Update Ranking System (inspiriert von LoL)
    async updateRanking(won, opponentMMR) {
      const gameStore = useGameStore()
      const currentMMR = gameStore.mmr

      // ELO-Update Berechnung
      const K = 32 // K-Faktor (höher = größere Änderungen)
      const expectedScore = 1 / (1 + Math.pow(10, (opponentMMR - currentMMR) / 400))
      const actualScore = won ? 1 : 0

      const mmrChange = Math.round(K * (actualScore - expectedScore))
      gameStore.mmr += mmrChange

      // LP und Rank Update
      const lpChange = this.calculateLPChange(mmrChange, won)
      await this.updateLP(lpChange)
    },

    async updateLP(lpChange) {
      const gameStore = useGameStore()
      const currentTier = gameStore.currentRank.tier

      gameStore.currentRank.lp += lpChange

      // Verschiedene LP-Schwellenwerte je nach Tier
      let promotionThreshold = 100

      if (currentTier === 'Master') {
        promotionThreshold = 500
      } else if (currentTier === 'Grandmaster') {
        promotionThreshold = 1000
      }

      // Promotion Check
      if (gameStore.currentRank.lp >= promotionThreshold) {
        await this.promoteRank()
      }

      // Demotion Check
      if (gameStore.currentRank.lp < 0) {
        await this.demoteRank()
      }
    },

    async startAutoBattle() {
      if (this.autoBattleEnabled) return

      this.autoBattleEnabled = true
      const gameStore = useGameStore()

      const runNextBattle = async () => {
        if (!this.autoBattleEnabled) return

        // Warte bis die Komponente bereit ist
        if (!this.autoBattleReady) {
          // Wenn nicht bereit, versuche es in 500ms erneut
          this.autoBattleTimer = setTimeout(() => {
            runNextBattle()
          }, 500)
          return
        }

        console.log('Starting new battle...')

        // Reset States
        this.showAutoBattleResult = false
        this.lastAutoBattleResult = null
        this.autoBattleReady = false // Setze auf "nicht bereit"

        // Speichere alte Werte
        this.autoBattleOldMMR = gameStore.mmr
        this.autoBattleOldLP = gameStore.currentRank.lp

        // Führe Battle aus
        const result = await this.simulateBattle(gameStore.mmr)

        // Update State
        console.log('Auto Battle result', result)
        this.lastAutoBattleResult = result
        this.showAutoBattleResult = true

        // Nächster Battle nach Interval (aber nur wenn Komponente bereit ist)
        this.autoBattleTimer = setTimeout(() => {
          runNextBattle()
        }, this.autoBattleInterval)
      }

      // Ersten Battle starten
      runNextBattle()
    },

    markBattleProcessed() {
      console.log('Battle processed by component')
      this.autoBattleReady = true
    },

    stopAutoBattle() {
      this.autoBattleEnabled = false

      if (this.autoBattleTimer) {
        clearInterval(this.autoBattleTimer)
        this.autoBattleTimer = null
      }
    },
  },

  getters: {
    chimesToNextLevel(): number {
      return this.chimesForNextLevel - this.chimes
    },
    levelProgress(): number {
      const chimesForlastLevel = this.level > 1 ? Math.ceil(10 * Math.pow(this.level - 1, 1.2)) : 0
      const progress = this.chimes - chimesForlastLevel
      const total = this.chimesForNextLevel - chimesForlastLevel
      return Math.min(100, Math.max(0, (progress / total) * 100))
    },

    // Zusätzliche Getter für die BardHudComponent
    totalChimesForLevel(): number {
      const chimesForlastLevel = this.level > 1 ? Math.ceil(10 * Math.pow(this.level - 1, 1.2)) : 0
      return this.chimesForNextLevel - chimesForlastLevel
    },
    currentLevelXP(): number {
      const chimesForlastLevel = this.level > 1 ? Math.ceil(10 * Math.pow(this.level - 1, 1.2)) : 0
      return this.chimes - chimesForlastLevel
    },
    nextLevelXP(): number {
      const chimesForlastLevel = this.level > 1 ? Math.ceil(10 * Math.pow(this.level - 1, 1.2)) : 0
      return this.chimesForNextLevel - chimesForlastLevel
    },

    totalPower(): number {
      return this.meeps * 100 + this.gold * 1000 + this.chimes * 1000
    },
  },
})
