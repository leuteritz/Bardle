import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useBattleStore } from '../../stores/battleStore'
import { WINPROB_MIN, WINPROB_MAX } from '../../config/constants'

describe('battleStore liveWinMomentum', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts at 0.5 when no events have shifted the probability', () => {
    const store = useBattleStore()
    store.initialWinProbability = 0.72
    store.currentWinProbability = 0.72
    expect(store.liveWinMomentum).toBe(0.5)
  })

  it('shifts 1:1 with event win probability deltas', () => {
    const store = useBattleStore()
    store.initialWinProbability = 0.6
    store.currentWinProbability = 0.6
    store._shiftWinProbability(0.06)
    expect(store.liveWinMomentum).toBeCloseTo(0.56)
    store._shiftWinProbability(-0.1)
    expect(store.liveWinMomentum).toBeCloseTo(0.46)
  })

  it('clamps to the winprob bounds', () => {
    const store = useBattleStore()
    store.initialWinProbability = 0.5
    store.currentWinProbability = 0.5

    store.currentWinProbability = 1.2
    expect(store.liveWinMomentum).toBe(WINPROB_MAX)

    store.currentWinProbability = -0.4
    expect(store.liveWinMomentum).toBe(WINPROB_MIN)
  })
})
