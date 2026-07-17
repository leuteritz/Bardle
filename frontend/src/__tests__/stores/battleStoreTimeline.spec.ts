import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useBattleStore, makeChampionState, defaultAllTimeStats } from '../../stores/battleStore'
import { useGameStore } from '../../stores/gameStore'
import { generateTimeline } from '../../utils/battleTimeline'
import {
  BATTLE_TOTAL_GAME_SECONDS,
  HONOR_MAX_SELECTIONS,
  HONOR_MVP_BUFF_DURATION_S,
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

describe('battleStore timeline integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('rebuildTimeline is deterministic and sets predeterminedWin from the winner', () => {
    const store = useBattleStore()
    setupBattle(store)
    const winner = store.timeline!.winner
    expect(store.predeterminedWin).toBe(winner === 1)
    const expected = generateTimeline(42, 0.6)
    expect(store.timeline!.events).toEqual(expected.events)
  })

  it('applyTimelineUpTo applies each event exactly once and fills stats', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    const totalKills = store.team1Kills + store.team2Kills
    const killEvents = store.timeline!.events.filter((e) => e.type === 'kill').length
    expect(totalKills).toBe(killEvents)
    // re-applying must not double-count
    store.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    expect(store.team1Kills + store.team2Kills).toBe(killEvents)
    // continuous stats populated
    const adc = store.team1[3]
    expect(adc.cs).toBeGreaterThan(100)
    expect(adc.gold).toBeGreaterThan(adc.cs)
    expect(adc.level).toBeGreaterThan(10)
  })

  it('structure counters and derived state match the timeline events', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    const turretEvents = store.timeline!.events.filter((e) => e.type === 'turret').length
    const inhibEvents = store.timeline!.events.filter((e) => e.type === 'inhibitor').length
    expect(store.team1Turrets + store.team2Turrets).toBe(turretEvents)
    expect(store.team1Inhibs + store.team2Inhibs).toBe(inhibEvents)
    expect(store.destroyedStructures.length).toBe(turretEvents + inhibEvents)
    expect(new Set(store.destroyedStructures).size).toBe(store.destroyedStructures.length)
    // re-applying must not duplicate derived structure state
    store.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    expect(store.destroyedStructures.length).toBe(turretEvents + inhibEvents)
  })

  it('two stores with the same seed replay to identical stats (background catch-up)', () => {
    const storeA = useBattleStore()
    setupBattle(storeA, 1337, 0.55)
    // simulate live ticking in small steps
    for (let t = 0; t <= BATTLE_TOTAL_GAME_SECONDS; t += 60) {
      storeA.applyTimelineUpTo(t)
      storeA.battleTime = t
    }
    storeA.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)

    setActivePinia(createPinia())
    const storeB = useBattleStore()
    setupBattle(storeB, 1337, 0.55)
    // simulate one big catch-up jump
    storeB.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    storeB.battleTime = BATTLE_TOTAL_GAME_SECONDS

    const snapshot = (s: typeof storeA) =>
      s.team1.concat(s.team2).map((c) => ({
        k: c.kills, d: c.deaths, a: c.assists, cs: c.cs, g: c.gold, mk: c.multikills,
      }))
    expect(snapshot(storeB)).toEqual(snapshot(storeA))
    expect(storeB.team1Drakes).toBe(storeA.team1Drakes)
    expect(storeB.team2Barons).toBe(storeA.team2Barons)
    expect(storeB.nexusDestroyedByTeam).toBe(storeA.nexusDestroyedByTeam)
    expect([...storeB.destroyedStructures]).toEqual([...storeA.destroyedStructures])
    expect(JSON.parse(JSON.stringify(storeB.structureFeed))).toEqual(
      JSON.parse(JSON.stringify(storeA.structureFeed)),
    )
  })

  it('nexus falls for the loser and is credited to the winner', () => {
    const store = useBattleStore()
    setupBattle(store, 777)
    store.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    expect(store.nexusDestroyedByTeam).toBe(store.timeline!.winner)
  })

  it('accumulateBattleStats folds per-battle stats into allTime and finds an MVP', () => {
    const store = useBattleStore()
    setupBattle(store, 42)
    store.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    store.battleTime = BATTLE_TOTAL_GAME_SECONDS
    const before = defaultAllTimeStats()
    expect(store.allTime).toEqual(before)
    const mvp = store.accumulateBattleStats()
    expect(mvp).not.toBe('')
    expect([...T1_NAMES, ...T2_NAMES]).toContain(mvp)
    expect(store.allTime.cs).toBeGreaterThan(0)
    expect(store.allTime.gold).toBeGreaterThan(0)
    expect(store.allTime.killParticipationGames).toBe(1)
    expect(store.allTime.longestGameSeconds).toBe(BATTLE_TOTAL_GAME_SECONDS)
    expect(store.totalKills).toBe(store.team1Kills)
  })

  it('finalizeHonors draws 3 unique champions from both teams, deterministically per seed', () => {
    const store = useBattleStore()
    setupBattle(store, 4242)
    store.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    store.finalizeHonors()
    expect(store.honoredChampions.length).toBe(HONOR_MAX_SELECTIONS)
    expect(new Set(store.honoredChampions).size).toBe(HONOR_MAX_SELECTIONS)
    for (const name of store.honoredChampions) {
      expect([...T1_NAMES, ...T2_NAMES]).toContain(name)
    }
    const firstDraw = [...store.honoredChampions]

    // same seed → identical ceremony (reload-safe)
    setActivePinia(createPinia())
    const replay = useBattleStore()
    setupBattle(replay, 4242)
    replay.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    replay.finalizeHonors()
    expect(replay.honoredChampions).toEqual(firstDraw)
  })

  it('finalizeHonors settles once and tracks career honors for own champions only', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    store.finalizeHonors()
    expect(store.allTime.honorsGiven).toBe(HONOR_MAX_SELECTIONS)
    for (const name of store.honoredChampions) {
      if (T1_NAMES.includes(name)) {
        expect(store.championCareer[name].honors).toBe(1)
      } else {
        expect(store.championCareer[name]).toBeUndefined()
      }
    }
    // settling twice must not pay or count again
    const honored = [...store.honoredChampions]
    store.finalizeHonors()
    expect(store.allTime.honorsGiven).toBe(HONOR_MAX_SELECTIONS)
    expect(store.honoredChampions).toEqual(honored)
  })

  it('finalizeHonors grants the 2× chime buff only when the match MVP is an own champion', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    store.lastAutoBattleResult = {
      won: true,
      opponent: { mmr: 1000, power: 1000, rank: { tier: 'Silver', division: 'II', minMMR: 0 } },
      winProbability: 0.5,
      mvpName: 'Garen',
    }
    store.finalizeHonors()
    expect(store.lastAutoBattleResult.mvpBuffGranted).toBe(true)
    expect(useGameStore().mvpBuffSecondsLeft).toBe(HONOR_MVP_BUFF_DURATION_S)
    expect(useGameStore().mvpBuffMultiplier).toBe(2)

    setActivePinia(createPinia())
    const enemyMvp = useBattleStore()
    setupBattle(enemyMvp)
    enemyMvp.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    enemyMvp.lastAutoBattleResult = {
      won: true,
      opponent: { mmr: 1000, power: 1000, rank: { tier: 'Silver', division: 'II', minMMR: 0 } },
      winProbability: 0.5,
      mvpName: 'Darius',
    }
    enemyMvp.finalizeHonors()
    expect(enemyMvp.lastAutoBattleResult.mvpBuffGranted).toBe(false)
    expect(useGameStore().mvpBuffSecondsLeft).toBe(0)
  })

  it('adminForceOwnMvp forces a random own champion as MVP', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    store.battleTime = BATTLE_TOTAL_GAME_SECONDS
    store.adminForceOwnMvp = true
    const mvp = store.accumulateBattleStats()
    expect(T1_NAMES).toContain(mvp)
    expect(store.allTime.mvpAwards).toBe(1)
  })

  it('honorTributeFor pays own champions only', () => {
    const store = useBattleStore()
    setupBattle(store)
    store.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    expect(store.honorTributeFor('Garen')).toBeGreaterThan(0)
    expect(store.honorTributeFor('Darius')).toBe(0)
  })

  it('objective override reseed keeps applied history and recomputes the cursor', () => {
    const store = useBattleStore()
    setupBattle(store, 42, 0.3)
    // play to just after the first drake spawns
    const spawn = store.timeline!.events.find((e) => e.type === 'objectiveSpawn' && e.objective === 'drake')!
    store.applyTimelineUpTo(spawn.t)
    store.battleTime = spawn.t
    store.activeObjective = 'drake'
    store.objectiveModalOpen = true
    store.activeObjectiveParticipants = spawn.participants ?? null
    store.objectiveHP = 1
    store.objectiveResult = null
    store.clickObjective()
    expect(store.objectiveResult).toBe('player')
    expect(store.drakeKilledByTeam).toBe(1)
    expect(store.team1Drakes).toBe(1)
    expect(store.objectiveOverrides.length).toBe(1)
    // no orphan drake result may re-credit the same drake — every spawn in the
    // merged timeline is credited exactly once (live kill + scripted rest)
    store.applyTimelineUpTo(BATTLE_TOTAL_GAME_SECONDS)
    const drakeSpawns = store.timeline!.events.filter(
      (e) => e.type === 'objectiveSpawn' && e.objective === 'drake',
    ).length
    expect(store.team1Drakes + store.team2Drakes).toBe(drakeSpawns)
    // cursor points past everything
    expect(store.timelineCursor).toBe(store.timeline!.events.length)
    // reseed never double-destroys a structure
    expect(new Set(store.destroyedStructures).size).toBe(store.destroyedStructures.length)
    // timeline rebuilt from seed + overrides matches the live one
    const liveEvents = JSON.parse(JSON.stringify(store.timeline!.events))
    const liveWinner = store.timeline!.winner
    store.timeline = null
    store.rebuildTimeline()
    expect(store.timeline!.winner).toBe(liveWinner)
    expect(JSON.parse(JSON.stringify(store.timeline!.events))).toEqual(liveEvents)
  })
})
