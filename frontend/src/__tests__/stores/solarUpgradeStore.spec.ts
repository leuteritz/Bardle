import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useSolarUpgradeStore } from '../../stores/solarUpgradeStore'
import {
  COMET_MIN_DWELL_SECONDS,
  STAR_PHASE_MIN_DWELL_SECONDS,
} from '../../config/constants'

/** Raise all five solar roots to the given level (the evolve branch gate). */
function setAllBranchLevels(store: ReturnType<typeof useSolarUpgradeStore>, level: number) {
  store.flightSpeedLevel = level
  store.maxHpLevel = level
  store.chimesPerClickLevel = level
  store.chimesPerSecondLevel = level
  store.dmgPerClickLevel = level
}

/** Satisfy the dwell gate for the current phase/comet state. */
function skipDwell(store: ReturnType<typeof useSolarUpgradeStore>) {
  store.phaseEnteredAt = Date.now() - store.phaseDwellRequiredMs
  store.tickDwell()
}

describe('solarUpgradeStore — comet origin state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('a fresh game starts as a wandering comet at starPhase 0', () => {
    const store = useSolarUpgradeStore()
    expect(store.isCometState).toBe(true)
    expect(store.cometSeconds).toBe(0)
    expect(store.starPhase).toBe(0)
  })

  it('comet dwell time replaces the First Spark dwell time', () => {
    const store = useSolarUpgradeStore()
    expect(store.phaseDwellRequiredMs).toBe(COMET_MIN_DWELL_SECONDS * 1000)
    store.isCometState = false
    expect(store.phaseDwellRequiredMs).toBe(STAR_PHASE_MIN_DWELL_SECONDS[0] * 1000)
  })

  it('ignition requires all five roots at Lv 1 plus the comet dwell', () => {
    const store = useSolarUpgradeStore()
    expect(store.canUpgradeStar).toBe(false)

    setAllBranchLevels(store, 1)
    expect(store.branchesReadyForEvolve).toBe(true)
    expect(store.canUpgradeStar).toBe(false) // dwell not yet met

    skipDwell(store)
    expect(store.canUpgradeStar).toBe(true)
  })

  it('the first evolve ignites the comet instead of bumping starPhase', () => {
    const store = useSolarUpgradeStore()
    setAllBranchLevels(store, 1)
    skipDwell(store)
    const ignitedAtEarliest = Date.now()

    store.upgradeStar()
    expect(store.isUpgrading).toBe(true)
    vi.advanceTimersByTime(2500)

    expect(store.isCometState).toBe(false)
    expect(store.starPhase).toBe(0) // still First Spark, not phase 1
    expect(store.isUpgrading).toBe(false)
    // drift time is tracked separately, never in phaseTimeHistory
    expect(store.cometSeconds).toBeGreaterThanOrEqual(COMET_MIN_DWELL_SECONDS)
    expect(store.totalPhaseSeconds).toBe(0)
    expect(store.phaseTimeHistory).toEqual([])
    // First Spark's own dwell timer starts at ignition
    expect(store.phaseEnteredAt).toBeGreaterThanOrEqual(ignitedAtEarliest)
  })

  it('the evolve after ignition advances starPhase normally', () => {
    const store = useSolarUpgradeStore()
    setAllBranchLevels(store, 1)
    skipDwell(store)
    store.upgradeStar()
    vi.advanceTimersByTime(2500)

    skipDwell(store) // now the First Spark dwell (600s)
    expect(store.canUpgradeStar).toBe(true)
    store.upgradeStar()
    vi.advanceTimersByTime(2500)

    expect(store.starPhase).toBe(1)
    expect(store.isCometState).toBe(false)
    expect(store.totalPhaseSeconds).toBeGreaterThan(0)
  })
})
