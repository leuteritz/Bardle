import { describe, it, expect } from 'vitest'
import { synergyStandings, synergyShift } from '@/utils/synergyPreview'
import { CHAMPION_TRAITS, TRAIT_BY_ID } from '@/config/championTraits'
import { getChampionOrigin } from '@/config/championOrigins'
import { SYNERGY_NEUTRAL_ORIGIN } from '@/config/constants'

/**
 * The fixtures are picked FROM the balance data rather than typed out: trait
 * assignments get rebalanced, and a spec that names champions by hand would
 * fail on a balance patch that broke nothing.
 */
function championsWithTrait(traitId: string, count: number): string[] {
  return Object.entries(CHAMPION_TRAITS)
    .filter(([, traits]) => (traits as string[]).includes(traitId))
    .map(([name]) => name)
    .slice(0, count)
}

/** A trait with at least four carriers and a threshold ladder to cross. */
const TRAIT_ID = Object.keys(TRAIT_BY_ID).find(
  (id) => championsWithTrait(id, 5).length >= 4 && TRAIT_BY_ID[id].thresholds.length >= 2,
)!
const LOWEST_THRESHOLD = TRAIT_BY_ID[TRAIT_ID].thresholds[0].count

describe('synergyStandings', () => {
  it('counts every carrier of a trait in the lineup', () => {
    const lineup = championsWithTrait(TRAIT_ID, 3)
    const standing = synergyStandings(lineup).get(`trait:${TRAIT_ID}`)
    expect(standing?.count).toBe(3)
  })

  it('keeps a trait below its first threshold dormant', () => {
    const lineup = championsWithTrait(TRAIT_ID, LOWEST_THRESHOLD - 1)
    const standing = synergyStandings(lineup).get(`trait:${TRAIT_ID}`)
    expect(standing).toBeDefined()
    expect(standing?.tier).toBe(0)
    expect(standing?.bonus).toBeNull()
  })

  it('reports the highest threshold reached, with its bonus text', () => {
    const lineup = championsWithTrait(TRAIT_ID, LOWEST_THRESHOLD)
    const standing = synergyStandings(lineup).get(`trait:${TRAIT_ID}`)
    expect(standing?.tier).toBe(LOWEST_THRESHOLD)
    expect(standing?.bonus).toBe(TRAIT_BY_ID[TRAIT_ID].thresholds[0].bonus)
  })

  it('never counts the neutral origin', () => {
    const neutral = Object.keys(CHAMPION_TRAITS).filter(
      (name) => getChampionOrigin(name) === SYNERGY_NEUTRAL_ORIGIN,
    )
    if (neutral.length < 2) return // no such champions in the current data
    const keys = [...synergyStandings(neutral.slice(0, 2)).keys()]
    expect(keys).not.toContain(`origin:${SYNERGY_NEUTRAL_ORIGIN}`)
  })

  it('returns nothing for an empty lineup', () => {
    expect(synergyStandings([]).size).toBe(0)
  })
})

describe('synergyShift', () => {
  it('reports a threshold that the swap activates', () => {
    const carriers = championsWithTrait(TRAIT_ID, LOWEST_THRESHOLD)
    const before = carriers.slice(0, LOWEST_THRESHOLD - 1)
    const shifts = synergyShift(before, carriers)
    const hit = shifts.find((s) => s.key === `trait:${TRAIT_ID}`)
    expect(hit).toBeDefined()
    expect(hit!.fromTier).toBe(0)
    expect(hit!.toTier).toBe(LOWEST_THRESHOLD)
  })

  it('reports a threshold that the swap loses', () => {
    const carriers = championsWithTrait(TRAIT_ID, LOWEST_THRESHOLD)
    const shifts = synergyShift(carriers, carriers.slice(0, LOWEST_THRESHOLD - 1))
    const hit = shifts.find((s) => s.key === `trait:${TRAIT_ID}`)
    expect(hit).toBeDefined()
    expect(hit!.fromTier).toBe(LOWEST_THRESHOLD)
    expect(hit!.toTier).toBe(0)
  })

  it('stays silent when the count moves but no threshold is crossed', () => {
    // one carrier to two-minus-one: both sides sit below the first threshold
    const carriers = championsWithTrait(TRAIT_ID, LOWEST_THRESHOLD)
    const under = carriers.slice(0, Math.max(1, LOWEST_THRESHOLD - 1))
    expect(synergyShift([], under).some((s) => s.key === `trait:${TRAIT_ID}`)).toBe(false)
  })

  it('reports nothing for two identical lineups', () => {
    const lineup = championsWithTrait(TRAIT_ID, 4)
    expect(synergyShift(lineup, lineup)).toEqual([])
  })

  it('lists gains before losses', () => {
    const traitCarriers = championsWithTrait(TRAIT_ID, LOWEST_THRESHOLD)
    const otherId = Object.keys(TRAIT_BY_ID).find(
      (id) => id !== TRAIT_ID && championsWithTrait(id, LOWEST_THRESHOLD).length >= LOWEST_THRESHOLD,
    )
    if (!otherId) return
    const otherCarriers = championsWithTrait(otherId, LOWEST_THRESHOLD)
    const shifts = synergyShift(otherCarriers, traitCarriers)
    const dirs = shifts.map((s) => (s.toTier > s.fromTier ? 'up' : 'down'))
    expect(dirs.indexOf('up')).toBeLessThanOrEqual(dirs.indexOf('down') === -1 ? Infinity : dirs.indexOf('down'))
  })
})
