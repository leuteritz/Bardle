import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useBattleStore } from '../../stores/battleStore'

describe('battleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ─── mmrToPower ──────────────────────────────────────────────────────────────

  describe('mmrToPower', () => {
    it('returns 100 minimum for mmr=0', () => {
      const store = useBattleStore()
      expect(store.mmrToPower(0)).toBe(100)
    })

    it('returns 100 when floor(mmr*1.5) is below 100', () => {
      const store = useBattleStore()
      expect(store.mmrToPower(66)).toBe(100) // floor(66*1.5)=99 < 100
    })

    it('returns 1500 for mmr=1000', () => {
      const store = useBattleStore()
      expect(store.mmrToPower(1000)).toBe(1500)
    })

    it('returns 3000 for mmr=2000', () => {
      const store = useBattleStore()
      expect(store.mmrToPower(2000)).toBe(3000)
    })
  })

  // ─── calculateLPChange ───────────────────────────────────────────────────────

  describe('calculateLPChange', () => {
    it('win + full mmrChange(32) → +20 LP', () => {
      const store = useBattleStore()
      expect(store.calculateLPChange(32, true)).toBe(20)
    })

    it('win + half mmrChange(16) → +10 LP', () => {
      const store = useBattleStore()
      expect(store.calculateLPChange(16, true)).toBe(10)
    })

    it('loss + full mmrChange(32) → -20 LP', () => {
      const store = useBattleStore()
      expect(store.calculateLPChange(32, false)).toBe(-20)
    })

    it('loss + half mmrChange(16) → -10 LP', () => {
      const store = useBattleStore()
      expect(store.calculateLPChange(16, false)).toBe(-10)
    })
  })

  // ─── mmrToRank ───────────────────────────────────────────────────────────────

  describe('mmrToRank', () => {
    it('mmr=0 → Iron IV', () => {
      const store = useBattleStore()
      const rank = store.mmrToRank(0)
      expect(rank.tier).toBe('Iron')
      expect(rank.division).toBe('IV')
    })

    it('mmr=499 → Iron IV (below Bronze threshold)', () => {
      const store = useBattleStore()
      const rank = store.mmrToRank(499)
      expect(rank.tier).toBe('Iron')
      expect(rank.division).toBe('IV')
    })

    it('mmr=500 → Bronze IV', () => {
      const store = useBattleStore()
      const rank = store.mmrToRank(500)
      expect(rank.tier).toBe('Bronze')
      expect(rank.division).toBe('IV')
    })

    it('mmr=999 → Bronze IV (below Silver threshold)', () => {
      const store = useBattleStore()
      const rank = store.mmrToRank(999)
      expect(rank.tier).toBe('Bronze')
      expect(rank.division).toBe('IV')
    })

    it('mmr=1000 → Silver IV', () => {
      const store = useBattleStore()
      const rank = store.mmrToRank(1000)
      expect(rank.tier).toBe('Silver')
      expect(rank.division).toBe('IV')
    })

    it('mmr=3000 → Master I', () => {
      const store = useBattleStore()
      const rank = store.mmrToRank(3000)
      expect(rank.tier).toBe('Master')
      expect(rank.division).toBe('I')
    })

    it('mmr=4000 → Challenger I', () => {
      const store = useBattleStore()
      const rank = store.mmrToRank(4000)
      expect(rank.tier).toBe('Challenger')
      expect(rank.division).toBe('I')
    })

    it('mmr=9999 → Challenger I (no over-rank)', () => {
      const store = useBattleStore()
      const rank = store.mmrToRank(9999)
      expect(rank.tier).toBe('Challenger')
      expect(rank.division).toBe('I')
    })
  })

  // ─── formatTime ──────────────────────────────────────────────────────────────

  describe('formatTime', () => {
    it('0 seconds → "00:00"', () => {
      const store = useBattleStore()
      expect(store.formatTime(0)).toBe('00:00')
    })

    it('65 seconds → "01:05"', () => {
      const store = useBattleStore()
      expect(store.formatTime(65)).toBe('01:05')
    })

    it('3600 seconds → "60:00"', () => {
      const store = useBattleStore()
      expect(store.formatTime(3600)).toBe('60:00')
    })
  })

  // ─── calculateWinProbability ─────────────────────────────────────────────────

  describe('calculateWinProbability', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // luckModifier = 0
    })

    it('equal powers → 0.5', () => {
      const store = useBattleStore()
      expect(store.calculateWinProbability(1000, 1000)).toBe(0.5)
    })

    it('dominant player → capped at 0.9', () => {
      const store = useBattleStore()
      expect(store.calculateWinProbability(100000, 100)).toBe(0.9)
    })

    it('dominated player → capped at 0.1', () => {
      const store = useBattleStore()
      expect(store.calculateWinProbability(100, 100000)).toBe(0.1)
    })
  })

  // ─── promoteRank ─────────────────────────────────────────────────────────────

  describe('promoteRank', () => {
    it('Iron IV + LP≥100 → Iron III, LP=0', () => {
      const store = useBattleStore()
      store.currentRank = { tier: 'Iron', division: 'IV', lp: 100 }
      store.promoteRank()
      expect(store.currentRank.tier).toBe('Iron')
      expect(store.currentRank.division).toBe('III')
      expect(store.currentRank.lp).toBe(0)
    })

    it('Iron I + LP≥100 → Bronze IV, LP=0', () => {
      const store = useBattleStore()
      store.currentRank = { tier: 'Iron', division: 'I', lp: 100 }
      store.promoteRank()
      expect(store.currentRank.tier).toBe('Bronze')
      expect(store.currentRank.division).toBe('IV')
      expect(store.currentRank.lp).toBe(0)
    })

    it('Diamond I + LP≥100 → Master I, LP=0', () => {
      const store = useBattleStore()
      store.currentRank = { tier: 'Diamond', division: 'I', lp: 100 }
      store.promoteRank()
      expect(store.currentRank.tier).toBe('Master')
      expect(store.currentRank.division).toBe('I')
      expect(store.currentRank.lp).toBe(0)
    })

    it('Master + LP≥500 → Grandmaster I', () => {
      const store = useBattleStore()
      store.currentRank = { tier: 'Master', division: 'I', lp: 500 }
      store.promoteRank()
      expect(store.currentRank.tier).toBe('Grandmaster')
      expect(store.currentRank.division).toBe('I')
    })

    it('Grandmaster + LP≥1000 → Challenger I', () => {
      const store = useBattleStore()
      store.currentRank = { tier: 'Grandmaster', division: 'I', lp: 1000 }
      store.promoteRank()
      expect(store.currentRank.tier).toBe('Challenger')
      expect(store.currentRank.division).toBe('I')
    })

    it('Challenger: no further promotion', () => {
      const store = useBattleStore()
      store.currentRank = { tier: 'Challenger', division: 'I', lp: 9999 }
      store.promoteRank()
      expect(store.currentRank.tier).toBe('Challenger')
      expect(store.currentRank.division).toBe('I')
    })

    it('Master + LP<500: no promotion', () => {
      const store = useBattleStore()
      store.currentRank = { tier: 'Master', division: 'I', lp: 499 }
      store.promoteRank()
      expect(store.currentRank.tier).toBe('Master')
    })
  })

  // ─── demoteRank ──────────────────────────────────────────────────────────────

  describe('demoteRank', () => {
    it('Iron IV: LP floors at 0, tier/division unchanged', () => {
      const store = useBattleStore()
      store.currentRank = { tier: 'Iron', division: 'IV', lp: -5 }
      store.demoteRank()
      expect(store.currentRank.tier).toBe('Iron')
      expect(store.currentRank.division).toBe('IV')
      expect(store.currentRank.lp).toBe(0)
    })

    it('Bronze IV → Iron I, LP=75', () => {
      const store = useBattleStore()
      store.currentRank = { tier: 'Bronze', division: 'IV', lp: -1 }
      store.demoteRank()
      expect(store.currentRank.tier).toBe('Iron')
      expect(store.currentRank.division).toBe('I')
      expect(store.currentRank.lp).toBe(75)
    })

    it('Master → Diamond I, LP=75', () => {
      const store = useBattleStore()
      store.currentRank = { tier: 'Master', division: 'I', lp: -1 }
      store.demoteRank()
      expect(store.currentRank.tier).toBe('Diamond')
      expect(store.currentRank.division).toBe('I')
      expect(store.currentRank.lp).toBe(75)
    })

    it('Grandmaster → Master I, LP=400', () => {
      const store = useBattleStore()
      store.currentRank = { tier: 'Grandmaster', division: 'I', lp: -1 }
      store.demoteRank()
      expect(store.currentRank.tier).toBe('Master')
      expect(store.currentRank.division).toBe('I')
      expect(store.currentRank.lp).toBe(400)
    })

    it('Challenger → Grandmaster I, LP=900', () => {
      const store = useBattleStore()
      store.currentRank = { tier: 'Challenger', division: 'I', lp: -1 }
      store.demoteRank()
      expect(store.currentRank.tier).toBe('Grandmaster')
      expect(store.currentRank.division).toBe('I')
      expect(store.currentRank.lp).toBe(900)
    })
  })
})
