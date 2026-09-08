import { describe, it, expect } from 'vitest'
import {
  CHAMPION_CREST_AURA_MIN_STAGE,
  CHAMPION_CREST_MIN_SIZE,
  CHAMPION_CREST_ORNAMENT_MIN_SIZE,
  CHAMPION_CREST_PX_STEP,
  CHAMPION_CREST_SPAN,
  CHAMPION_CREST_STAGES,
  CHAMPION_LEVEL_MAX_CAP,
  CHAMPION_PERK_INTERVAL,
  CHAMPION_REGALIA_STAGES,
} from '@/config/constants'
import { crestStageFor, crestStageIndexFor } from '@/config/champions/championLevels'

describe('champion orbit crest — the ladder', () => {
  it('steps once every CHAMPION_PERK_INTERVAL levels up to the cap', () => {
    const expected = [1]
    for (let l = CHAMPION_PERK_INTERVAL; l <= CHAMPION_LEVEL_MAX_CAP; l += CHAMPION_PERK_INTERVAL) {
      expected.push(l)
    }
    expect(CHAMPION_CREST_STAGES.map((s) => s.minLevel)).toEqual(expected)
  })

  it('ends on the level cap', () => {
    const last = CHAMPION_CREST_STAGES[CHAMPION_CREST_STAGES.length - 1]
    expect(last.minLevel).toBe(CHAMPION_LEVEL_MAX_CAP)
  })

  it('borrows its names from the regalia stage at the same level', () => {
    for (const stage of CHAMPION_CREST_STAGES) {
      const twin = CHAMPION_REGALIA_STAGES.find((r) => r.minLevel === stage.minLevel)
      expect(twin, `no regalia stage at level ${stage.minLevel}`).toBeDefined()
      expect(stage.name).toBe(twin?.name)
    }
  })

  it('paints nothing on the first stage — a fresh roster costs what it costs today', () => {
    const first = CHAMPION_CREST_STAGES[0]
    expect(first.rim).toBe(0)
    expect(first.studs).toBe(0)
    expect(first.blades).toBe(0)
    expect(first.aura).toBe(false)
  })

  it('never takes an element away', () => {
    const numeric = ['rim', 'rimGap', 'heat', 'studs', 'blades', 'rays', 'wreath'] as const
    const flags = ['bladeLong', 'groove', 'bevel', 'sweep', 'crown', 'gem', 'aura'] as const
    for (let i = 1; i < CHAMPION_CREST_STAGES.length; i++) {
      const prev = CHAMPION_CREST_STAGES[i - 1]
      const cur = CHAMPION_CREST_STAGES[i]
      for (const k of numeric) {
        expect(cur[k], `${cur.name}.${k} shrank`).toBeGreaterThanOrEqual(prev[k])
      }
      for (const k of flags) {
        if (prev[k]) expect(cur[k], `${cur.name}.${k} was dropped`).toBe(true)
      }
    }
  })

  it('adds at least one element per stage', () => {
    for (let i = 1; i < CHAMPION_CREST_STAGES.length; i++) {
      const prev = CHAMPION_CREST_STAGES[i - 1]
      const cur = CHAMPION_CREST_STAGES[i]
      const grew = (Object.keys(cur) as (keyof typeof cur)[]).some(
        (k) => k !== 'minLevel' && k !== 'name' && cur[k] !== prev[k],
      )
      expect(grew, `${cur.name} repeats ${prev.name}`).toBe(true)
    }
  })
})

describe('champion orbit crest — the lookup', () => {
  it('holds a stage across its whole level band', () => {
    expect(crestStageIndexFor(1)).toBe(0)
    expect(crestStageIndexFor(9)).toBe(0)
    expect(crestStageIndexFor(10)).toBe(1)
    expect(crestStageIndexFor(19)).toBe(1)
    expect(crestStageIndexFor(59)).toBe(CHAMPION_CREST_STAGES.length - 2)
    expect(crestStageIndexFor(CHAMPION_LEVEL_MAX_CAP)).toBe(CHAMPION_CREST_STAGES.length - 1)
  })

  it('never returns null, and rises monotonically with the level', () => {
    let last = -1
    for (let l = 1; l <= CHAMPION_LEVEL_MAX_CAP; l++) {
      const idx = crestStageIndexFor(l)
      expect(crestStageFor(l)).toBe(CHAMPION_CREST_STAGES[idx])
      expect(idx).toBeGreaterThanOrEqual(last)
      last = idx
    }
  })
})

describe('champion orbit crest — the cost guards', () => {
  it('drops ornaments before it drops the crest itself', () => {
    expect(CHAMPION_CREST_ORNAMENT_MIN_SIZE).toBeGreaterThan(CHAMPION_CREST_MIN_SIZE)
  })

  it('starts breathing only on a stage that has an aura', () => {
    const stage = CHAMPION_CREST_STAGES[CHAMPION_CREST_AURA_MIN_STAGE]
    expect(stage).toBeDefined()
    expect(stage.aura).toBe(true)
    expect(CHAMPION_CREST_STAGES[CHAMPION_CREST_AURA_MIN_STAGE - 1].aura).toBe(false)
  })

  it('keeps the sprite span tight — the backing grows with its square', () => {
    expect(CHAMPION_CREST_SPAN).toBeGreaterThan(1)
    expect(CHAMPION_CREST_SPAN).toBeLessThanOrEqual(1.8)
  })

  it('quantises the sprite edge so a sun upgrade does not rasterise anew', () => {
    expect(CHAMPION_CREST_PX_STEP).toBeGreaterThanOrEqual(2)
  })
})
