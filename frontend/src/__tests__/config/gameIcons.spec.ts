import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { isValidIcon } from '../../utils/iconUtils'
import { MEEP_TREE_BRANCHES } from '../../config/meepTree'
import { CHAMPION_PERKS, CHAMPION_STATS } from '../../config/championLevels'
import { AUGMENTS, AUGMENT_POOL } from '../../config/augments'

/*
 * Icons may be reused freely across the project — what still has to hold is that
 * a name actually exists in the set, and that entries shown side by side stay
 * distinguishable. A name Iconify does not know renders as an empty box, and
 * nothing else in the pipeline complains about it — hence this sweep.
 */

const MEEP_NODES = MEEP_TREE_BRANCHES.flatMap((b) => b.nodes)

/** Vitest runs from `frontend/` — the sweep walks the whole source tree from there. */
const SRC = resolve(process.cwd(), 'src')

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'graphify-out' && entry.name !== 'node_modules') sourceFiles(full, out)
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.vue')) {
      out.push(full)
    }
  }
  return out
}

describe('game-icons — existence', () => {
  it.each([
    ['meep tree node', MEEP_NODES.map((n) => [n.id, n.icon] as const)],
    ['champion perk', CHAMPION_PERKS.map((p) => [p.id, p.icon] as const)],
    ['champion stat', CHAMPION_STATS.map((s) => [s.key, s.icon] as const)],
    ['augment', AUGMENTS.map((a) => [a.id, a.icon] as const)],
  ])('every %s icon exists in gameicons.txt', (_label, entries) => {
    for (const [id, icon] of entries) {
      expect(icon.startsWith('game-icons:'), `${id} misses the set prefix`).toBe(true)
      expect(isValidIcon(icon), `${id} uses unknown icon ${icon}`).toBe(true)
    }
  })

  it('no source file references an icon outside the set', () => {
    const unknown: string[] = []
    for (const file of sourceFiles(SRC)) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(/game-icons:[a-z0-9-]+/g)) {
        if (!isValidIcon(match[0])) {
          unknown.push(`${relative(SRC, file).replace(/\\/g, '/')} → ${match[0]}`)
        }
      }
    }
    expect(unknown, `these render as an empty box:\n${unknown.join('\n')}`).toEqual([])
  })
})

describe('game-icons — distinct within one list', () => {
  it('no two meep tree nodes share an icon', () => {
    const icons = MEEP_NODES.map((n) => n.icon)
    expect(new Set(icons).size, `duplicate icon among ${icons.length} nodes`).toBe(icons.length)
  })

  it('no two augments share an icon — the three offered cards must look distinct', () => {
    const icons = AUGMENTS.map((a) => a.icon)
    const seen = new Map<string, string>()
    const clashes: string[] = []
    for (const aug of AUGMENTS) {
      const first = seen.get(aug.icon)
      if (first) clashes.push(`${first} + ${aug.id} → ${aug.icon}`)
      else seen.set(aug.icon, aug.id)
    }
    expect(clashes, clashes.join('\n')).toEqual([])
    expect(new Set(icons).size).toBe(AUGMENTS.length)
  })

  it('every augment can be rolled on level-up', () => {
    expect(AUGMENT_POOL).toHaveLength(AUGMENTS.length)
  })

  it('no two perks of the same tier share an icon', () => {
    for (const tier of ['adept', 'master', 'elite'] as const) {
      const icons = CHAMPION_PERKS.filter((p) => p.tier === tier).map((p) => p.icon)
      expect(new Set(icons).size, `duplicate icon in the ${tier} pool`).toBe(icons.length)
    }
  })
})
