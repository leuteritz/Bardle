import { describe, it, expect } from 'vitest'
import { isValidIcon } from '../../utils/iconUtils'
import { MEEP_TREE_BRANCHES } from '../../config/meepTree'
import { CHAMPION_PERKS, CHAMPION_STATS } from '../../config/championLevels'

/*
 * Icons may be reused freely across the project — what still has to hold is that
 * a name actually exists in the set (a typo renders as an empty box), and that
 * entries shown side by side stay distinguishable.
 */

const MEEP_NODES = MEEP_TREE_BRANCHES.flatMap((b) => b.nodes)

describe('game-icons — existence', () => {
  it.each([
    ['meep tree node', MEEP_NODES.map((n) => [n.id, n.icon] as const)],
    ['champion perk', CHAMPION_PERKS.map((p) => [p.id, p.icon] as const)],
    ['champion stat', CHAMPION_STATS.map((s) => [s.key, s.icon] as const)],
  ])('every %s icon exists in gameicons.txt', (_label, entries) => {
    for (const [id, icon] of entries) {
      expect(icon.startsWith('game-icons:'), `${id} misses the set prefix`).toBe(true)
      expect(isValidIcon(icon), `${id} uses unknown icon ${icon}`).toBe(true)
    }
  })
})

describe('game-icons — distinct within one list', () => {
  it('no two meep tree nodes share an icon', () => {
    const icons = MEEP_NODES.map((n) => n.icon)
    expect(new Set(icons).size, `duplicate icon among ${icons.length} nodes`).toBe(icons.length)
  })

  it('no two perks of the same tier share an icon', () => {
    for (const tier of ['adept', 'master', 'elite'] as const) {
      const icons = CHAMPION_PERKS.filter((p) => p.tier === tier).map((p) => p.icon)
      expect(new Set(icons).size, `duplicate icon in the ${tier} pool`).toBe(icons.length)
    }
  })
})
