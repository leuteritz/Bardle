import { describe, it, expect } from 'vitest'
import {
  createRng,
  generateTimeline,
  reseedTimelineFrom,
  championNoise,
  continuousStatsAt,
  bountyGold,
  mvpScore,
} from '@/utils/battleTimeline'
import {
  BATTLE_TOTAL_GAME_SECONDS,
  TIMELINE_NEXUS_FALL_T,
  STAT_NOISE_MIN,
  STAT_NOISE_MAX,
  CHAMPION_MAX_LEVEL,
  GOLD_PER_KILL,
  GOLD_PER_ASSIST,
  GOLD_PER_CS,
} from '@/config/constants'
import type { ChampionState } from '@/types'

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
