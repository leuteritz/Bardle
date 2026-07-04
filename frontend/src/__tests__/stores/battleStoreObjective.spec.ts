import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useBattleStore, makeChampionState } from '../../stores/battleStore'
import {
  OBJECTIVE_DPS_TICK_MS,
  OBJECTIVE_MAX_DURATION_MS,
  OBJECTIVE_RESULT_DELAY_MS,
} from '../../config/constants'

const T1_NAMES = ['Garen', 'Lee Sin', 'Ahri', 'Jinx', 'Bard']
const T2_NAMES = ['Darius', 'Kha Zix', 'Zed', 'Caitlyn', 'Thresh']

function setupBattle(store: ReturnType<typeof useBattleStore>, seed = 42, winProb = 0.6) {
  store.team1 = T1_NAMES.map((n, i) => makeChampionState(n, 'Silver', i))
  store.team2 = T2_NAMES.map((n, i) => makeChampionState(n, 'Silver', i))
  store.battleSeed = seed
  store.initialWinProbability = winProb
  store.currentWinProbability = winProb
  store.objectiveOverrides = []
  store.timelineCursor = 0
  store.rebuildTimeline()
}

function drakeSpawn(store: ReturnType<typeof useBattleStore>) {
  return store.timeline!.events.find((e) => e.type === 'objectiveSpawn' && e.objective === 'drake')!
}

/** Runs the live simulation up to just past the drake spawn so the modal opens. */
function playUntilDrakeModal(store: ReturnType<typeof useBattleStore>) {
  const spawn = drakeSpawn(store)
  store.battlePhase = 'playing'
  store.battlePhaseStartTimestamp = Date.now()
  store.startBattleSimulation(true)
  // 60 game-seconds per real second; step in whole sim ticks until the spawn fires
  const realMsToSpawn = Math.ceil((spawn.t / 60) * 1000) + 1000
  vi.advanceTimersByTime(realMsToSpawn)
  return spawn
}

describe('battleStore frozen-time objective damage race', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('freezes game-time while the objective modal is open', () => {
    const store = useBattleStore()
    setupBattle(store)
    playUntilDrakeModal(store)

    expect(store.objectiveModalOpen).toBe(true)
    expect(store.battleSimIntervalId).toBeNull()
    expect(store.objectiveFreezeStartMs).toBeGreaterThan(0)
    expect(store.objectiveAliveCounts).not.toBeNull()

    const frozenTime = store.battleTime
    const cursorAtFreeze = store.timelineCursor
    vi.advanceTimersByTime(3000)
    expect(store.battleTime).toBe(frozenTime)
    expect(store.timelineCursor).toBe(cursorAtFreeze)
    // ...but the damage race keeps ticking
    expect(store.objectiveOwnDamage).toBeGreaterThan(0)
    expect(store.objectiveEnemyDamage).toBeGreaterThan(0)
  })

  it('resumes the simulation near the frozen game-time after the fight resolves', () => {
    const store = useBattleStore()
    setupBattle(store)
    playUntilDrakeModal(store)
    const frozenTime = store.battleTime

    // let the race finish: step until the HP drain resolves the fight
    for (let i = 0; i < 150 && store.objectiveResult === null; i++) {
      vi.advanceTimersByTime(OBJECTIVE_DPS_TICK_MS)
    }
    expect(store.objectiveResult).not.toBeNull()

    vi.advanceTimersByTime(OBJECTIVE_RESULT_DELAY_MS + 100)
    expect(store.objectiveModalOpen).toBe(false)
    expect(store.objectiveFreezeStartMs).toBe(0)
    expect(store.battleSimIntervalId).not.toBeNull()

    vi.advanceTimersByTime(1000)
    // one resumed tick ≈ +60 game-seconds; anything close to frozenTime proves the anchor slid
    expect(store.battleTime).toBeGreaterThanOrEqual(frozenTime)
    expect(store.battleTime).toBeLessThanOrEqual(frozenTime + 180)
  })

  it('syncFromTimestamps does not restart the sim during a freeze and slides the anchor', () => {
    const store = useBattleStore()
    setupBattle(store)
    playUntilDrakeModal(store)

    const anchorBefore = store.battlePhaseStartTimestamp
    vi.setSystemTime(Date.now() + 4000)
    store.syncFromTimestamps()
    expect(store.battleSimIntervalId).toBeNull()
    // slid by the 4s gap plus whatever accrued since the last fight tick (< one tick)
    expect(store.battlePhaseStartTimestamp).toBeGreaterThanOrEqual(anchorBefore + 4000)
    expect(store.battlePhaseStartTimestamp).toBeLessThan(anchorBefore + 4000 + OBJECTIVE_DPS_TICK_MS)
  })

  it('team DPS scales with alive participants (3v5 stacks slower)', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.battleTime = 100
    // two own participants are dead until long after the freeze snapshot
    store.respawnUntil.t1 = [9999, 9999, 0, 0, 0]
    store._openObjectiveModal('drake', { t1: [0, 1, 2, 3, 4], t2: [0, 1, 2, 3, 4] })
    expect(store.objectiveAliveCounts).toEqual({ own: 3, enemy: 5 })

    vi.advanceTimersByTime(OBJECTIVE_DPS_TICK_MS * 10)
    const ratio = store.objectiveEnemyDamage / store.objectiveOwnDamage
    // expected 5/3 ≈ 1.67 with ±15% per-tick wobble
    expect(ratio).toBeGreaterThan(1.2)
    expect(ratio).toBeLessThan(2.3)
  })

  it('the killing blow does not steal: the damage leader wins', () => {
    const store = useBattleStore()
    setupBattle(store)
    store._openObjectiveModal('drake', null)
    store.objectiveOwnDamage = 100
    store.objectivePlayerDamage = 100
    store.objectiveEnemyDamage = 5000
    store.objectiveHP = 10

    store.clickObjective()
    expect(store.objectiveResult).toBe('enemy')
    expect(store.drakeKilledByTeam).toBe(2)
  })

  it('own win reads player when clicks were decisive, own otherwise', () => {
    const store = useBattleStore()
    setupBattle(store)

    store._openObjectiveModal('drake', null)
    store.objectiveOwnDamage = 500
    store.objectivePlayerDamage = 200
    store.objectiveEnemyDamage = 400
    store._resolveByDamageLead()
    expect(store.objectiveResult).toBe('player')

    vi.advanceTimersByTime(OBJECTIVE_RESULT_DELAY_MS + 100)
    setActivePinia(createPinia())
    const store2 = useBattleStore()
    setupBattle(store2)
    store2._openObjectiveModal('baron', null)
    store2.objectiveOwnDamage = 500
    store2.objectivePlayerDamage = 0
    store2.objectiveEnemyDamage = 400
    store2._resolveByDamageLead()
    expect(store2.objectiveResult).toBe('own')
  })

  it('resolves by current damage lead at the max fight duration', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.respawnUntil.t1 = [9999, 9999, 0, 0, 0]
    store._openObjectiveModal('drake', { t1: [0, 1, 2, 3, 4], t2: [0, 1, 2, 3, 4] })
    store.objectiveMaxHP = 10_000_000
    store.objectiveHP = 10_000_000

    vi.advanceTimersByTime(OBJECTIVE_MAX_DURATION_MS + OBJECTIVE_DPS_TICK_MS)
    expect(store.objectiveResult).toBe('enemy')
  })

  it('snapshots fighters with normalized weights; dead fighters get weight 0', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.battleTime = 100
    store.respawnUntil.t1 = [9999, 9999, 0, 0, 0]
    store._openObjectiveModal('drake', { t1: [0, 1, 2, 3, 4], t2: [0, 1, 2, 3, 4] })

    const t1 = store.objectiveFighters!.t1
    expect(t1).toHaveLength(5)
    expect(t1.filter((f) => f.alive)).toHaveLength(3)
    const deadWeights = t1.filter((f) => !f.alive).map((f) => f.weight)
    expect(deadWeights).toEqual([0, 0])
    const livingSum = t1.filter((f) => f.alive).reduce((a, f) => a + f.weight, 0)
    expect(livingSum).toBeCloseTo(3, 6)
    expect(store.objectiveFighters!.t2.filter((f) => f.alive)).toHaveLength(5)
  })

  it('per-fighter damage sums to the team total; dead fighters stay at 0', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.battleTime = 100
    store.respawnUntil.t1 = [9999, 9999, 0, 0, 0]
    store._openObjectiveModal('drake', { t1: [0, 1, 2, 3, 4], t2: [0, 1, 2, 3, 4] })

    vi.advanceTimersByTime(OBJECTIVE_DPS_TICK_MS * 10)
    const t1 = store.objectiveFighters!.t1
    const t2 = store.objectiveFighters!.t2
    const t1Sum = t1.reduce((a, f) => a + f.damage, 0)
    const t2Sum = t2.reduce((a, f) => a + f.damage, 0)
    expect(t1Sum).toBeCloseTo(store.objectiveOwnDamage, 6)
    expect(t2Sum).toBeCloseTo(store.objectiveEnemyDamage, 6)
    for (const f of t1.filter((x) => !x.alive)) expect(f.damage).toBe(0)
  })

  it('does not open the modal on a hidden tab (background catch-up path)', () => {
    const hiddenSpy = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    try {
      const store = useBattleStore()
      setupBattle(store)
      const spawn = drakeSpawn(store)
      store.applyTimelineUpTo(spawn.t)
      expect(store.objectiveModalOpen).toBe(false)
      // the scripted result later credits a team as before
      store.applyTimelineUpTo(spawn.t + 1200)
      expect(store.drakeKilledByTeam).not.toBeNull()
    } finally {
      hiddenSpy.mockRestore()
    }
  })
})
