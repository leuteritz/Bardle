import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useBattleStore, makeChampionState } from '../../stores/battleStore'
import {
  OBJECTIVE_DPS_TICK_MS,
  OBJECTIVE_MAX_DURATION_MS,
  OBJECTIVE_RESULT_DELAY_MS,
  OBJECTIVE_CLICK_DAMAGE,
  DRAKE_HEXTECH_CLICK_MULT,
  DRAKE_MOUNTAIN_DPS_MULT,
  DRAKE_CHEMTECH_ENEMY_DPS_MULT,
  DRAKE_CLOUD_RESPAWN_MULT,
  DRAKE_OCEAN_LOSS_PENALTY_MULT,
  DRAKE_ELDER_LP_BONUS,
  MOVE_RESPAWN_WALK_SECONDS,
  OBJECTIVE_ROLE_MAX_HP,
  OBJECTIVE_AOE_DPS_DRAKE,
  OBJECTIVE_MID_CURSE_DPS,
  OBJECTIVE_SUPPORT_MEND_HEAL,
  OBJECTIVE_ABILITY_CD_S,
} from '../../config/constants'
import { DRAKE_TYPES } from '../../config/drakes'

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

  it('always lists all 5 champions per team, even when participants are a subset', () => {
    const store = useBattleStore()
    setupBattle(store)
    store._openObjectiveModal('drake', { t1: [0, 1, 2], t2: [0, 1] })
    expect(store.objectiveFighters!.t1).toHaveLength(5)
    expect(store.objectiveFighters!.t2).toHaveLength(5)
    expect(store.objectiveAliveCounts).toEqual({ own: 5, enemy: 5 })
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

  it('securing a drake pushes its type into drakeBuffs; enemy secure does not', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.activeDrakeType = 'mountain'
    store._openObjectiveModal('drake', null)
    store.forceResolveObjective(1)
    expect(store.drakeBuffs).toEqual(['mountain'])
    expect(store.objectiveWinDelta).toBeCloseTo(DRAKE_TYPES.mountain.winDelta, 6)

    vi.advanceTimersByTime(OBJECTIVE_RESULT_DELAY_MS + 100)
    store.activeDrakeType = 'hextech'
    store._openObjectiveModal('drake', null)
    store.forceResolveObjective(2)
    expect(store.drakeBuffs).toEqual(['mountain'])
  })

  it('_creditObjective is idempotent per drake type', () => {
    const store = useBattleStore()
    setupBattle(store)
    store._creditObjective('drake', 1, null, 'cloud')
    store._creditObjective('drake', 1, null, 'cloud')
    expect(store.drakeBuffs).toEqual(['cloud'])
  })

  it('team-2 drake secures are tracked separately for display', () => {
    const store = useBattleStore()
    setupBattle(store)
    store._creditObjective('drake', 2, null, 'ocean')
    store._creditObjective('drake', 2, null, 'ocean')
    expect(store.drakeBuffsT2).toEqual(['ocean'])
    expect(store.drakeBuffs).toEqual([])
    // display-only: no mechanical effect for the enemy side
    expect(store.objectiveOwnDpsMult).toBe(1)
    expect(store.objectiveEnemyDpsMult).toBe(1)
  })

  it('hextech buff multiplies click damage', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.drakeBuffs = ['hextech']
    store._openObjectiveModal('drake', null)
    store.objectiveHP = 100000
    store.objectiveOwnDamage = 0
    store.objectivePlayerDamage = 0
    store.clickObjective()
    expect(store.objectivePlayerDamage).toBe(OBJECTIVE_CLICK_DAMAGE * DRAKE_HEXTECH_CLICK_MULT)
  })

  it('mountain and chemtech buffs shift the objective DPS multipliers', () => {
    const store = useBattleStore()
    setupBattle(store)
    expect(store.objectiveOwnDpsMult).toBe(1)
    expect(store.objectiveEnemyDpsMult).toBe(1)
    store.drakeBuffs = ['mountain', 'chemtech']
    expect(store.objectiveOwnDpsMult).toBe(DRAKE_MOUNTAIN_DPS_MULT)
    expect(store.objectiveEnemyDpsMult).toBe(DRAKE_CHEMTECH_ENEMY_DPS_MULT)
  })

  it('ocean buff halves the win-chance loss of a later lost objective', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.drakeBuffs = ['ocean']
    store.activeDrakeType = 'infernal'
    store._openObjectiveModal('drake', null)
    store.forceResolveObjective(2)
    expect(store.objectiveWinDelta).toBeCloseTo(
      -DRAKE_TYPES.infernal.winDelta * DRAKE_OCEAN_LOSS_PENALTY_MULT,
      6,
    )
  })

  it('cloud buff shortens only own-team respawn walks', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.drakeBuffs = ['cloud']
    // enemy (team 2) kills our champion 0 → shortened walk
    store._applyEvent({ t: 500, type: 'kill', team: 2, killerIdx: 0, victimIdx: 0, winProbDelta: 0 }, 500)
    expect(store.respawnUntil.t1[0]).toBe(500 + Math.round(MOVE_RESPAWN_WALK_SECONDS * DRAKE_CLOUD_RESPAWN_MULT))
    // we (team 1) kill enemy champion 0 → full walk
    store._applyEvent({ t: 600, type: 'kill', team: 1, killerIdx: 0, victimIdx: 0, winProbDelta: 0 }, 600)
    expect(store.respawnUntil.t2[0]).toBe(600 + MOVE_RESPAWN_WALK_SECONDS)
  })

  it('elder buff grants flat bonus LP only on a won battle', () => {
    const store = useBattleStore()
    setupBattle(store)
    const winBase = store.calculateLPChange(20, true)
    const lossBase = store.calculateLPChange(20, false)
    store.drakeBuffs = ['elder']
    expect(store.calculateLPChange(20, true)).toBe(winBase + DRAKE_ELDER_LP_BONUS)
    expect(store.calculateLPChange(20, false)).toBe(lossBase)
  })

  it('applying a drake spawn event sets activeDrakeType', () => {
    const hiddenSpy = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    try {
      const store = useBattleStore()
      setupBattle(store)
      const spawn = drakeSpawn(store)
      store.applyTimelineUpTo(spawn.t)
      expect(store.activeDrakeType).toBe(spawn.drakeType)
      expect(DRAKE_TYPES[store.activeDrakeType!]).toBeDefined()
    } finally {
      hiddenSpy.mockRestore()
    }
  })

  it('fighters enter the pit at full role-specific HP with their battle role', () => {
    const store = useBattleStore()
    setupBattle(store)
    store._openObjectiveModal('drake', null)
    const t1 = store.objectiveFighters!.t1
    expect(t1.map((f) => f.role)).toEqual(['top', 'jungle', 'mid', 'adc', 'support'])
    for (const f of t1) {
      expect(f.fightMaxHp).toBe(OBJECTIVE_ROLE_MAX_HP[f.role])
      expect(f.fightHp).toBe(OBJECTIVE_ROLE_MAX_HP[f.role])
      expect(f.down).toBe(false)
    }
  })

  it('boss AoE wears fighters down when their support is dead', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.battleTime = 100
    store.respawnUntil.t1 = [0, 0, 0, 0, 9999]
    store._openObjectiveModal('drake', { t1: [0, 1, 2, 3, 4], t2: [0, 1, 2, 3, 4] })
    vi.advanceTimersByTime(3000)
    // 3 AoE ticks, no Mend on this side — the mid never takes taunt damage
    expect(store.objectiveFighters!.t1[2].fightHp).toBe(
      OBJECTIVE_ROLE_MAX_HP.mid - 3 * OBJECTIVE_AOE_DPS_DRAKE,
    )
  })

  it('a living support keeps the team healthier than a dead one', () => {
    const store = useBattleStore()
    setupBattle(store)
    store._openObjectiveModal('drake', null)
    vi.advanceTimersByTime(4100)
    const withSupport = store.objectiveFighters!.t1[2].fightHp

    setActivePinia(createPinia())
    const store2 = useBattleStore()
    setupBattle(store2)
    store2.battleTime = 100
    store2.respawnUntil.t1 = [0, 0, 0, 0, 9999]
    store2._openObjectiveModal('drake', { t1: [0, 1, 2, 3, 4], t2: [0, 1, 2, 3, 4] })
    vi.advanceTimersByTime(4100)
    const withoutSupport = store2.objectiveFighters!.t1[2].fightHp

    expect(withSupport).toBeGreaterThan(withoutSupport)
  })

  it('Mend bursts heal all standing allies when the support casts', () => {
    const store = useBattleStore()
    setupBattle(store)
    store._openObjectiveModal('drake', null)
    const t1 = store.objectiveFighters!.t1
    const support = t1[4]
    t1[2].fightHp = 100
    support.abilityCooldownUntil = Date.now() // ready now
    vi.advanceTimersByTime(200) // one tick: cast fires, no AoE yet
    expect(t1[2].fightHp).toBe(100 + OBJECTIVE_SUPPORT_MEND_HEAL)
    // cooldown rescheduled
    expect(support.abilityCooldownUntil).toBeGreaterThan(Date.now())
  })

  it('casting opens the ability window and schedules the next cooldown', () => {
    const store = useBattleStore()
    setupBattle(store)
    store._openObjectiveModal('drake', null)
    const mid = store.objectiveFighters!.t1[2]
    mid.abilityCooldownUntil = Date.now()
    vi.advanceTimersByTime(200)
    expect(mid.abilityActiveUntil).toBeGreaterThan(Date.now())
    expect(mid.abilityCooldownUntil).toBe(mid.abilityActiveUntil + OBJECTIVE_ABILITY_CD_S.mid * 1000)
  })

  it('Wild Rally buffs the strongest standing ally', () => {
    const store = useBattleStore()
    setupBattle(store)
    store._openObjectiveModal('drake', null)
    const t1 = store.objectiveFighters!.t1
    t1[3].damage = 500 // ADC leads
    t1[1].abilityCooldownUntil = Date.now() // jungle ready
    vi.advanceTimersByTime(200)
    expect(store.objectiveBuffTarget.own).toBe(3)
  })

  it('a downed fighter stops dealing objective damage', () => {
    const store = useBattleStore()
    setupBattle(store)
    store._openObjectiveModal('drake', null)
    const top = store.objectiveFighters!.t1[0]
    top.down = true
    const frozen = top.damage
    vi.advanceTimersByTime(1000)
    expect(top.damage).toBe(frozen)
  })

  it('mid auto-casts Hex Curse via its first-cast offset and the curse ticks damage', () => {
    const store = useBattleStore()
    setupBattle(store)
    store._openObjectiveModal('drake', null)
    for (const f of store.objectiveFighters!.t1) f.weight = 0
    for (const f of store.objectiveFighters!.t2) f.weight = 0
    vi.advanceTimersByTime(2000)
    const mid = store.objectiveFighters!.t1[2]
    // window opened automatically (no manual trigger) and the DoT is flowing
    expect(mid.abilityActiveUntil).toBeGreaterThan(0)
    expect(mid.damage).toBeGreaterThan(0)
    expect(store.objectiveFighters!.t1[0].damage).toBe(0)
  })

  it('Hex Curse credits the mid laner only while its window is active', () => {
    const store = useBattleStore()
    setupBattle(store)
    store._openObjectiveModal('drake', null)
    for (const f of store.objectiveFighters!.t1) f.weight = 0
    for (const f of store.objectiveFighters!.t2) f.weight = 0
    const mid = store.objectiveFighters!.t1[2]
    mid.abilityActiveUntil = Date.now() + 100000 // window open, own mid only
    // stay below the 1s first-cast offset so the enemy mid never casts
    vi.advanceTimersByTime(800)
    expect(mid.damage).toBeCloseTo(OBJECTIVE_MID_CURSE_DPS * 0.8, 6)
    expect(store.objectiveFighters!.t1[0].damage).toBe(0)
    expect(store.objectiveEnemyDamage).toBe(0)
    expect(store.objectiveOwnDamage).toBeCloseTo(OBJECTIVE_MID_CURSE_DPS * 0.8, 6)
  })

  it('an active taunt diverts the full enemy damage onto the top laner instead of the objective', () => {
    const store = useBattleStore()
    setupBattle(store)
    store._openObjectiveModal('drake', null)
    const top = store.objectiveFighters!.t1[0]
    top.abilityActiveUntil = Date.now() + 100000 // Challenge window open
    vi.advanceTimersByTime(800) // stays below the first ability tick (no AoE/heal noise)
    const t2 = store.objectiveFighters!.t2
    // the first two standing enemies attack our top instead of the objective
    expect(t2[0].damage).toBe(0)
    expect(t2[1].damage).toBe(0)
    expect(t2[2].damage).toBeGreaterThan(0)
    // full contribution lands on the top laner as fight-HP damage
    expect(top.fightHp).toBeLessThan(OBJECTIVE_ROLE_MAX_HP.top)
  })

  it('ADC crits double the contribution when the crit roll always hits', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const store = useBattleStore()
      setupBattle(store)
      store._openObjectiveModal('drake', null)
      vi.advanceTimersByTime(800)
      const t1 = store.objectiveFighters!.t1
      // equal weights under the mocked rng — the ADC deals exactly double the top's damage
      expect(t1[3].damage).toBeCloseTo(t1[0].damage * 2, 6)
    } finally {
      randomSpy.mockRestore()
    }
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
