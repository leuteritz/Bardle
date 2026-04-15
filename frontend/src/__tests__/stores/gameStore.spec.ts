import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../../stores/gameStore'
import { LEVEL_BASE } from '../../config/constants'

describe('gameStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ─── chimesAtLevelStart (tests chimeThresholdForLevel indirectly) ─────────────

  describe('chimesAtLevelStart', () => {
    it('level=1 → 0 (threshold for level 0)', () => {
      const store = useGameStore()
      store.level = 1
      expect(store.chimesAtLevelStart).toBe(0)
    })

    it('level=2 → 2000 (ceil(2000 * 1^2.2))', () => {
      const store = useGameStore()
      store.level = 2
      expect(store.chimesAtLevelStart).toBe(2000)
    })

    it('level=3 → 9190 (ceil(2000 * 2^2.2))', () => {
      const store = useGameStore()
      store.level = 3
      expect(store.chimesAtLevelStart).toBe(9190)
    })

    it('level=11 → 316979 (ceil(2000 * 10^2.2))', () => {
      const store = useGameStore()
      store.level = 11
      expect(store.chimesAtLevelStart).toBe(316979)
    })
  })

  // ─── calculateLevel ──────────────────────────────────────────────────────────

  describe('calculateLevel', () => {
    it('chimes below threshold: level stays at 1', () => {
      const store = useGameStore()
      store.chimesEarnedForLevel = LEVEL_BASE - 1
      store.calculateLevel()
      expect(store.level).toBe(1)
    })

    it('chimes at threshold: level increments to 2', () => {
      const store = useGameStore()
      store.chimesEarnedForLevel = LEVEL_BASE
      store.calculateLevel()
      expect(store.level).toBe(2)
    })

    it('after level-up, chimesForNextLevel is updated correctly', () => {
      const store = useGameStore()
      store.chimesEarnedForLevel = LEVEL_BASE
      store.calculateLevel()
      // chimesForNextLevel = ceil(2000 * 2^2.2) = 9190
      expect(store.chimesForNextLevel).toBe(9190)
    })
  })

  // ─── levelProgress ───────────────────────────────────────────────────────────

  describe('levelProgress', () => {
    it('0 chimes at level 1 → 0%', () => {
      const store = useGameStore()
      store.chimesEarnedForLevel = 0
      expect(store.levelProgress).toBe(0)
    })

    it('halfway through level 1 → 50%', () => {
      const store = useGameStore()
      store.chimesEarnedForLevel = 1000 // chimesForNextLevel = 2000, atLevelStart = 0
      expect(store.levelProgress).toBe(50)
    })

    it('progress capped at 100%', () => {
      const store = useGameStore()
      store.chimesEarnedForLevel = 99999
      store.chimesForNextLevel = 500
      expect(store.levelProgress).toBe(100)
    })
  })

  // ─── totalPower ──────────────────────────────────────────────────────────────

  describe('totalPower', () => {
    it('0 meeps, no ability levels → 0 power', () => {
      const store = useGameStore()
      expect(store.totalPower).toBe(0)
    })

    it('10 meeps → 1000 power (10 * 100 * multiplier)', () => {
      const store = useGameStore()
      store.meeps = 10
      expect(store.totalPower).toBe(1000)
    })

    it('W ability level 2 adds 600 power bonus (2 * 300)', () => {
      const store = useGameStore()
      store.meeps = 5
      store.abilityLevels = [0, 2, 0, 0]
      // totalPower = floor((5*100 + 600) * 1) = 1100
      expect(store.totalPower).toBe(1100)
    })
  })
})
