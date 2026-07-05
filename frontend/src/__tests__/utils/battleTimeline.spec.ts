import { describe, it, expect } from 'vitest'
import {
  createRng,
  generateTimeline,
  reseedTimelineFrom,
  replayWinProbability,
  championNoise,
  continuousStatsAt,
  bountyGold,
  mvpScore,
} from '@/utils/battleTimeline'
import {
  BATTLE_TOTAL_GAME_SECONDS,
  TIMELINE_NEXUS_FALL_T,
  TIMELINE_CRACK_WINDOW_START_T,
  TIMELINE_DRAKE_COUNT_MAX,
  TIMELINE_DRAKE_RESPAWN_MIN_GAP_T,
  FINAL_PUSH_FIGHT_T,
  FINAL_PUSH_FIGHT_HOLD_T,
  TIMELINE_NEXUS_WINPROB_DELTA,
  STAT_NOISE_MIN,
  STAT_NOISE_MAX,
  CHAMPION_MAX_LEVEL,
  GOLD_PER_KILL,
  GOLD_PER_ASSIST,
  GOLD_PER_CS,
} from '@/config/constants'
import {
  STRUCTURE_POSITIONS,
  ALL_STRUCTURE_IDS,
  LANE_TIER_ORDER,
  parseStructureId,
} from '@/utils/battleStructures'
import type { BattleEvent, ChampionState } from '@/types'

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(1234)
    const b = createRng(1234)
    for (let i = 0; i < 20; i++) expect(a()).toBe(b())
  })

  it('produces values in [0, 1)', () => {
    const rng = createRng(99)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('generateTimeline', () => {
  it('produces identical timelines for identical seeds', () => {
    const t1 = generateTimeline(42, 0.6)
    const t2 = generateTimeline(42, 0.6)
    expect(t1.winner).toBe(t2.winner)
    expect(t1.events).toEqual(t2.events)
  })

  it('produces different timelines for different seeds', () => {
    const t1 = generateTimeline(1, 0.5)
    const t2 = generateTimeline(2, 0.5)
    expect(JSON.stringify(t1.events)).not.toBe(JSON.stringify(t2.events))
  })

  it('contains exactly one first blood', () => {
    for (const seed of [1, 7, 42, 1337, 99999]) {
      const tl = generateTimeline(seed, 0.5)
      const firstBloods = tl.events.filter((e) => e.firstBlood)
      expect(firstBloods.length).toBe(1)
    }
  })

  it('events are sorted by time and within game bounds', () => {
    const tl = generateTimeline(777, 0.5)
    for (let i = 1; i < tl.events.length; i++) {
      expect(tl.events[i].t).toBeGreaterThanOrEqual(tl.events[i - 1].t)
    }
    for (const e of tl.events) {
      expect(e.t).toBeGreaterThanOrEqual(0)
      expect(e.t).toBeLessThanOrEqual(BATTLE_TOTAL_GAME_SECONDS)
    }
  })

  it('ends with a nexus event for the loser credited to the winner', () => {
    const tl = generateTimeline(555, 0.5)
    const nexus = tl.events.filter((e) => e.type === 'nexus')
    expect(nexus.length).toBe(1)
    expect(nexus[0].team).toBe(tl.winner)
    expect(nexus[0].t).toBe(TIMELINE_NEXUS_FALL_T)
  })

  it('contains at least one drake and exactly one baron result', () => {
    const tl = generateTimeline(2024, 0.5)
    const drakes = tl.events.filter((e) => e.type === 'objectiveResult' && e.objective === 'drake')
    const barons = tl.events.filter((e) => e.type === 'objectiveResult' && e.objective === 'baron')
    expect(drakes.length).toBeGreaterThanOrEqual(1)
    expect(barons.length).toBe(1)
  })

  it('winner distribution roughly follows the initial win probability', () => {
    let wins = 0
    const n = 400
    for (let seed = 0; seed < n; seed++) {
      if (generateTimeline(seed, 0.75).winner === 1) wins++
    }
    // clearly above coin-flip for a strong favorite
    expect(wins / n).toBeGreaterThan(0.55)
  })

  it('the winner is the team whose displayed momentum leads at the final push reveal', () => {
    let checked = 0
    for (let seed = 0; seed < 120; seed++) {
      const tl = generateTimeline(seed, 0.5)
      // the exact store replay of the momentum bar up to the reveal decision
      const prob = replayWinProbability(tl.events, 0.5, FINAL_PUSH_FIGHT_T)
      // a dead-even bar falls back to a coin flip — skip
      if (prob === 0.5) continue
      checked++
      expect(tl.winner).toBe(prob > 0.5 ? 1 : 2)
    }
    expect(checked).toBeGreaterThan(80)
  })

  it('after a reseed the merged timeline still crowns the displayed leader', () => {
    for (const seed of [1, 7, 42, 777, 1337]) {
      const base = generateTimeline(seed, 0.35)
      const baronSpawn = base.events.find((e) => e.type === 'objectiveSpawn' && e.objective === 'baron')!
      // cut at the baron spawn — the interactive case whose merge filter drops
      // the orphan scripted baron result (the delta the old decision counted)
      for (const cut of [900, 2000, baronSpawn.t]) {
        const boosted = 0.55
        const merged = reseedTimelineFrom(base, cut, seed * 31 + 7, boosted, 0.35)
        const tail = merged.events.filter((e) => e.t > cut)
        const prob = replayWinProbability(tail, boosted, FINAL_PUSH_FIGHT_T)
        const displayed = 0.5 + (prob - 0.35)
        if (displayed === 0.5) continue
        expect(merged.winner).toBe(displayed > 0.5 ? 1 : 2)
      }
    }
  })

  it('the nexus explosion slams the momentum bar toward the winner', () => {
    for (const seed of [1, 42, 777, 1337]) {
      const tl = generateTimeline(seed, 0.5)
      const nexus = tl.events.find((e) => e.type === 'nexus')!
      expect(nexus.winProbDelta).toBe(
        tl.winner === 1 ? TIMELINE_NEXUS_WINPROB_DELTA : -TIMELINE_NEXUS_WINPROB_DELTA,
      )
    }
  })

  it('multikill tiers are only ever 2..5 and escalate from doubles', () => {
    let sawDouble = false
    for (let seed = 0; seed < 200; seed++) {
      const tl = generateTimeline(seed, 0.5)
      for (const e of tl.events) {
        if (e.multikillTier !== undefined) {
          expect(e.multikillTier).toBeGreaterThanOrEqual(2)
          expect(e.multikillTier).toBeLessThanOrEqual(5)
          if (e.multikillTier === 2) sawDouble = true
        }
      }
    }
    expect(sawDouble).toBe(true)
  })
})

/**
 * Replays all structure events (sorted by t) and asserts the LoL rules:
 * unique ids, per-lane tier order, nexus turrets only after an inhibitor,
 * annotated attacker participants, and canonical map positions.
 */
function checkStructureInvariants(events: BattleEvent[]) {
  const seen = new Set<string>()
  const laneProgress: Record<string, number> = {}
  const inhibDownT: Record<number, number> = {}
  for (const e of events) {
    if (e.type !== 'turret' && e.type !== 'inhibitor') continue
    expect(e.structureId).toBeDefined()
    expect(e.structureTier).toBeDefined()
    expect(e.team).toBeDefined()
    const id = e.structureId!
    expect(seen.has(id)).toBe(false)
    seen.add(id)
    const { ownerTeam, laneKey, tier } = parseStructureId(id)
    expect(ownerTeam).toBe(e.team === 1 ? 2 : 1)
    expect(tier).toBe(e.structureTier)
    expect(e.location).toEqual(STRUCTURE_POSITIONS[id])
    const attackers = e.team === 1 ? e.participants?.t1 : e.participants?.t2
    expect(attackers?.length ?? 0).toBeGreaterThanOrEqual(1)
    expect(attackers).toContain(e.killerIdx)
    if (tier === 'nexusTurret') {
      expect(inhibDownT[ownerTeam]).toBeDefined()
      expect(e.t).toBeGreaterThanOrEqual(inhibDownT[ownerTeam])
    } else {
      const key = `${ownerTeam}:${laneKey}`
      const idx = LANE_TIER_ORDER.indexOf(tier as (typeof LANE_TIER_ORDER)[number])
      expect(idx).toBe((laneProgress[key] ?? -1) + 1)
      laneProgress[key] = idx
      if (tier === 'inhibitor') {
        inhibDownT[ownerTeam] = Math.min(inhibDownT[ownerTeam] ?? Infinity, e.t)
      }
    }
  }
  return seen
}

describe('structure destruction', () => {
  it('all 28 structure positions are in bounds and blue is the point mirror of red', () => {
    // 2 teams × (3 lanes × 4 tiers + 2 nexus turrets)
    expect(ALL_STRUCTURE_IDS.length).toBe(28)
    for (const id of ALL_STRUCTURE_IDS) {
      const p = STRUCTURE_POSITIONS[id]
      expect(p.x).toBeGreaterThan(0)
      expect(p.x).toBeLessThan(100)
      expect(p.y).toBeGreaterThan(0)
      expect(p.y).toBeLessThan(100)
    }
    // the point mirror swaps top ↔ bot lane
    const mirrorLane = { top: 'bot', mid: 'mid', bot: 'top' } as const
    for (const lane of ['top', 'mid', 'bot'] as const) {
      for (const tier of LANE_TIER_ORDER) {
        const red = STRUCTURE_POSITIONS[`2:${lane}:${tier}`]
        const blue = STRUCTURE_POSITIONS[`1:${mirrorLane[lane]}:${tier}`]
        expect(blue.x).toBeCloseTo(100 - red.x, 5)
        expect(blue.y).toBeCloseTo(100 - red.y, 5)
      }
    }
  })

  it('every structure event is annotated and obeys LoL destruction order', () => {
    for (let seed = 0; seed < 150; seed++) {
      checkStructureInvariants(generateTimeline(seed, 0.5).events)
    }
  })

  it('the first structure falls after laning, is an outer turret in a lane', () => {
    for (const seed of [1, 7, 42, 1337, 99999]) {
      const tl = generateTimeline(seed, 0.5)
      const baronSpawn = tl.events.find((e) => e.type === 'objectiveSpawn' && e.objective === 'baron')!
      const first = tl.events.find((e) => e.type === 'turret' || e.type === 'inhibitor')!
      expect(first.type).toBe('turret')
      expect(first.structureTier).toBe('outer')
      expect(first.lane).toBeDefined()
      expect(first.t).toBeGreaterThanOrEqual(TIMELINE_CRACK_WINDOW_START_T)
      expect(first.t).toBeLessThan(baronSpawn.t)
    }
  })

  it('both teams fully crack exactly one enemy lane before baron; no inhibs elsewhere', () => {
    for (let seed = 0; seed < 150; seed++) {
      const tl = generateTimeline(seed, 0.5)
      const baronSpawn = tl.events.find((e) => e.type === 'objectiveSpawn' && e.objective === 'baron')!
      for (const owner of [1, 2] as const) {
        const ownerEvents = tl.events.filter(
          (e) =>
            (e.type === 'turret' || e.type === 'inhibitor') &&
            e.structureId !== undefined &&
            parseStructureId(e.structureId).ownerTeam === owner,
        )
        // exactly one inhibitor falls per side, before baron
        const inhibs = ownerEvents.filter((e) => e.structureTier === 'inhibitor')
        expect(inhibs.length).toBe(1)
        const crackLane = parseStructureId(inhibs[0].structureId!).laneKey
        // the crack lane loses its full chain before baron spawns
        const chainEvents = ownerEvents.filter(
          (e) => e.structureTier !== 'nexusTurret' && parseStructureId(e.structureId!).laneKey === crackLane,
        )
        expect(chainEvents.length).toBe(4)
        for (const e of chainEvents) expect(e.t).toBeLessThan(baronSpawn.t)
        // other lanes: 1-2 turret falls, never an inhibitor, all before baron
        const others = ownerEvents.filter(
          (e) => e.structureTier !== 'nexusTurret' && parseStructureId(e.structureId!).laneKey !== crackLane,
        )
        expect(others.length).toBeGreaterThanOrEqual(1)
        expect(others.length).toBeLessThanOrEqual(2)
        for (const e of others) {
          expect(e.structureTier).not.toBe('inhibitor')
          expect(e.t).toBeLessThan(baronSpawn.t)
        }
        // nexus turrets only fall after the baron fight starts
        for (const e of ownerEvents.filter((x) => x.structureTier === 'nexusTurret')) {
          expect(e.t).toBeGreaterThan(baronSpawn.t)
        }
      }
    }
  })

  it('the baron fight gathers all ten champions', () => {
    for (const seed of [1, 42, 777]) {
      const tl = generateTimeline(seed, 0.5)
      const baron = tl.events.find((e) => e.type === 'objectiveSpawn' && e.objective === 'baron')!
      expect(baron.participants).toEqual({ t1: [0, 1, 2, 3, 4], t2: [0, 1, 2, 3, 4] })
    }
  })

  it('the winner cracks a full lane: inhibitor and both nexus turrets fall before the nexus', () => {
    for (const seed of [3, 42, 512, 90210]) {
      const tl = generateTimeline(seed, 0.5)
      const loser = tl.winner === 1 ? 2 : 1
      const loserInhibs = tl.events.filter(
        (e) => e.type === 'inhibitor' && parseStructureId(e.structureId!).ownerTeam === loser,
      )
      const loserNexusTurrets = tl.events.filter(
        (e) => e.structureTier === 'nexusTurret' && parseStructureId(e.structureId!).ownerTeam === loser,
      )
      expect(loserInhibs.length).toBeGreaterThanOrEqual(1)
      expect(loserNexusTurrets.length).toBe(2)
      for (const e of [...loserInhibs, ...loserNexusTurrets]) {
        expect(e.t).toBeLessThan(TIMELINE_NEXUS_FALL_T)
      }
    }
  })

  it('the final defense fight happens at the loser inhibitor in the final push window', () => {
    for (const seed of [1, 7, 42, 777, 1337]) {
      const tl = generateTimeline(seed, 0.5)
      const loser = tl.winner === 1 ? 2 : 1
      const finalFights = tl.events.filter((e) => e.type === 'fightStart' && e.t >= FINAL_PUSH_FIGHT_T)
      expect(finalFights.length).toBe(1)
      const inhib = tl.events.find(
        (e) => e.type === 'inhibitor' && parseStructureId(e.structureId!).ownerTeam === loser,
      )!
      expect(finalFights[0].location).toEqual(STRUCTURE_POSITIONS[inhib.structureId!])
      expect(finalFights[0].lane).toBe(parseStructureId(inhib.structureId!).laneKey)
    }
  })

  it('nexus turrets fall only after the final defense fight breaks', () => {
    for (const seed of [1, 7, 42, 777, 1337]) {
      const tl = generateTimeline(seed, 0.5)
      const nexusTurrets = tl.events.filter((e) => e.structureTier === 'nexusTurret')
      expect(nexusTurrets.length).toBe(2)
      for (const e of nexusTurrets) {
        expect(e.t).toBeGreaterThan(FINAL_PUSH_FIGHT_T + FINAL_PUSH_FIGHT_HOLD_T)
        expect(e.t).toBeLessThan(TIMELINE_NEXUS_FALL_T)
      }
    }
  })

  it('reseeding keeps structure invariants across the cut', () => {
    for (const seed of [11, 42, 777]) {
      const base = generateTimeline(seed, 0.4)
      for (const cut of [900, 2000, 3100]) {
        const merged = reseedTimelineFrom(base, cut, seed * 31 + 7, 0.85)
        checkStructureInvariants(merged.events)
        expect(merged.events.filter((e) => e.type === 'nexus').length).toBe(1)
      }
    }
  })
})

describe('reseedTimelineFrom', () => {
  it('keeps all events up to t and is deterministic', () => {
    const base = generateTimeline(42, 0.4)
    const a = reseedTimelineFrom(base, 1500, 999, 0.8)
    const b = reseedTimelineFrom(base, 1500, 999, 0.8)
    expect(a.events).toEqual(b.events)
    expect(a.winner).toBe(b.winner)
    const beforeBase = base.events.filter((e) => e.t <= 1500)
    const beforeNew = a.events.filter((e) => e.t <= 1500)
    expect(beforeNew).toEqual(beforeBase)
  })

  it('still ends with a nexus event', () => {
    const base = generateTimeline(7, 0.5)
    const re = reseedTimelineFrom(base, 1200, 1234, 0.9)
    expect(re.events.filter((e) => e.type === 'nexus').length).toBe(1)
  })

  it('is deterministic with an explicit baseline probability', () => {
    const base = generateTimeline(42, 0.4)
    const a = reseedTimelineFrom(base, 1500, 999, 0.8, 0.4)
    const b = reseedTimelineFrom(base, 1500, 999, 0.8, 0.4)
    expect(a.events).toEqual(b.events)
    expect(a.winner).toBe(b.winner)
    expect(a.events.filter((e) => e.type === 'nexus').length).toBe(1)
  })

  it('never respawns baron when reseeding at the baron spawn (interactive fight)', () => {
    for (const seed of [1, 7, 42, 777, 1337]) {
      const base = generateTimeline(seed, 0.5)
      const baronSpawn = base.events.find((e) => e.type === 'objectiveSpawn' && e.objective === 'baron')!
      const merged = reseedTimelineFrom(base, baronSpawn.t, seed * 31 + 7, 0.85)
      const spawns = merged.events.filter((e) => e.type === 'objectiveSpawn' && e.objective === 'baron')
      expect(spawns.length).toBe(1)
      expect(spawns[0].t).toBe(baronSpawn.t)
    }
  })

  it('keeps drake spawns within the count cap and respawn gap across the cut', () => {
    for (const seed of [1, 7, 42, 777, 1337]) {
      const base = generateTimeline(seed, 0.5)
      const firstDrake = base.events.find((e) => e.type === 'objectiveSpawn' && e.objective === 'drake')!
      const merged = reseedTimelineFrom(base, firstDrake.t, seed * 17 + 3, 0.85)
      const spawns = merged.events.filter((e) => e.type === 'objectiveSpawn' && e.objective === 'drake')
      expect(spawns.length).toBeLessThanOrEqual(TIMELINE_DRAKE_COUNT_MAX)
      for (let i = 1; i < spawns.length; i++) {
        expect(spawns[i].t - spawns[i - 1].t).toBeGreaterThanOrEqual(TIMELINE_DRAKE_RESPAWN_MIN_GAP_T)
      }
    }
  })

  it('every post-cut objective result has a post-cut spawn before it', () => {
    for (const seed of [1, 42, 777]) {
      const base = generateTimeline(seed, 0.5)
      for (const cut of [400, 1000, 2050]) {
        const merged = reseedTimelineFrom(base, cut, seed * 13 + 1, 0.8)
        const results = merged.events.filter((e) => e.type === 'objectiveResult' && e.t > cut)
        for (const res of results) {
          const hasSpawn = merged.events.some(
            (e) => e.type === 'objectiveSpawn' && e.objective === res.objective && e.t > cut && e.t < res.t,
          )
          expect(hasSpawn).toBe(true)
        }
      }
    }
  })
})

describe('championNoise / continuousStatsAt', () => {
  it('noise is deterministic and within configured bounds', () => {
    for (let idx = 0; idx < 5; idx++) {
      const n1 = championNoise(42, 1, idx)
      const n2 = championNoise(42, 1, idx)
      expect(n1).toBe(n2)
      expect(n1).toBeGreaterThanOrEqual(STAT_NOISE_MIN)
      expect(n1).toBeLessThanOrEqual(STAT_NOISE_MAX)
    }
  })

  it('stats grow monotonically with game time', () => {
    const early = continuousStatsAt('adc', 1, 600)
    const late = continuousStatsAt('adc', 1, 3000)
    expect(late.cs).toBeGreaterThan(early.cs)
    expect(late.damage).toBeGreaterThan(early.damage)
    expect(late.level).toBeGreaterThan(early.level)
  })

  it('level is capped at max and items at 6', () => {
    const s = continuousStatsAt('mid', 1.3, BATTLE_TOTAL_GAME_SECONDS)
    expect(s.level).toBeLessThanOrEqual(CHAMPION_MAX_LEVEL)
    expect(s.items).toBeLessThanOrEqual(6)
  })

  it('support farms much less than adc', () => {
    const sup = continuousStatsAt('support', 1, 3000)
    const adc = continuousStatsAt('adc', 1, 3000)
    expect(sup.cs).toBeLessThan(adc.cs / 3)
  })
})

describe('bountyGold / mvpScore', () => {
  const champ = (over: Partial<ChampionState>): ChampionState => ({
    name: 'T',
    rank: 'Silver',
    role: 'mid',
    kills: 0,
    deaths: 0,
    assists: 0,
    cs: 0,
    gold: 0,
    damage: 0,
    healing: 0,
    damageTaken: 0,
    wardsPlaced: 0,
    wardsKilled: 0,
    controlWards: 0,
    level: 1,
    items: 0,
    multikills: { double: 0, triple: 0, quadra: 0, penta: 0 },
    currentSpree: 0,
    largestSpree: 0,
    hpPercent: 100,
    respawnState: 'alive',
    ...over,
  })

  it('bountyGold sums kill, assist and cs gold', () => {
    expect(bountyGold(2, 3, 100)).toBe(2 * GOLD_PER_KILL + 3 * GOLD_PER_ASSIST + 100 * GOLD_PER_CS)
  })

  it('mvpScore ranks a carry above a feeder', () => {
    const carry = champ({ kills: 10, assists: 5, deaths: 1, cs: 250, damage: 40000, gold: 15000 })
    const feeder = champ({ kills: 1, assists: 2, deaths: 9, cs: 90, damage: 9000, gold: 6000 })
    expect(mvpScore(carry)).toBeGreaterThan(mvpScore(feeder))
  })
})
