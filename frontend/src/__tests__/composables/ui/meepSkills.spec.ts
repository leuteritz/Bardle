import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { meepSkillBucket, useMeepSkills } from '@/composables/ui/useMeepSkills'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useGameStore } from '@/stores/core/gameStore'
import { MEEP_TREE_NODE_INDEX, MEEP_TREE_CATALOG_NODES } from '@/config/progression/meepTree'
import type { MeepSkillEntry } from '@/types'

/**
 * `useMeepSkills` ist die eine Quelle der Kaufliste im Skill-Tab. Geprüft wird
 * hier NICHT die Wirtschaft — Preise und Wirkungen sind Balance-Grössen und
 * gehören `meepEconomy.spec.ts` — sondern die drei Aussagen, die die Liste
 * überhaupt tragen:
 *
 *   1. In welchen Topf ein Knoten fällt, und dass `fresh` und `ready` sich
 *      allein an `acknowledged` unterscheiden. Das IST „die neusten oben".
 *   2. Dass `bestBuyId` der billigste BEZAHLBARE ist — nicht der billigste
 *      überhaupt und nicht der stärkste.
 *   3. Dass ein versiegelter Knoten nie unter dem Kaufbaren landet.
 *
 * Preise kommen durchweg aus dem Katalog, nie abgeschrieben: sie ändern sich
 * mit der Balance, während diese Datei die Gliederung prüft.
 */
const VIGIL_1 = MEEP_TREE_NODE_INDEX['vigil_1'].node
const RESO_1 = MEEP_TREE_NODE_INDEX['reso_1'].node
const COSMOS_1 = MEEP_TREE_NODE_INDEX['cosmos_1'].node
const VIGIL_2 = MEEP_TREE_NODE_INDEX['vigil_2'].node
const VIGIL_4 = MEEP_TREE_NODE_INDEX['vigil_4'].node
const VIGIL_4B = MEEP_TREE_NODE_INDEX['vigil_4b'].node

function entryOf(entries: MeepSkillEntry[], id: string): MeepSkillEntry {
  const found = entries.find((e) => e.id === id)
  if (!found) throw new Error(`no entry for ${id}`)
  return found
}

describe('useMeepSkills — buckets', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lists every catalogue node, learned and sealed included', () => {
    const { skillEntries } = useMeepSkills()
    expect(skillEntries.value).toHaveLength(MEEP_TREE_CATALOG_NODES)
  })

  it('an affordable, unseen node lands in `fresh`; looking at it moves it to `ready`', () => {
    const game = useGameStore()
    const tree = useMeepTreeStore()
    const { skillEntries } = useMeepSkills()

    game.meeps = VIGIL_1.cost
    expect(meepSkillBucket(entryOf(skillEntries.value, 'vigil_1'))).toBe('fresh')

    tree.acknowledgeNode('vigil_1')
    expect(meepSkillBucket(entryOf(skillEntries.value, 'vigil_1'))).toBe('ready')
  })

  it('an open but unaffordable node is `reach`, a gated one is `locked`', () => {
    const game = useGameStore()
    const { skillEntries } = useMeepSkills()

    game.meeps = 0
    expect(meepSkillBucket(entryOf(skillEntries.value, 'vigil_1'))).toBe('reach')
    // Rang 2 ist gesperrt, solange Rang 1 nicht gelernt ist — auch bei vollem Beutel.
    game.meeps = VIGIL_2.cost * 10
    expect(meepSkillBucket(entryOf(skillEntries.value, 'vigil_2'))).toBe('locked')
  })

  it('learning one side of the rank-4 fork seals the other into `sealed`', () => {
    const game = useGameStore()
    const tree = useMeepTreeStore()
    const { skillEntries } = useMeepSkills()

    tree.bought = ['vigil_1', 'vigil_2', 'vigil_3']
    game.meeps = VIGIL_4.cost
    expect(meepSkillBucket(entryOf(skillEntries.value, 'vigil_4'))).toBe('fresh')

    tree.buyNode('vigil_4')
    expect(meepSkillBucket(entryOf(skillEntries.value, 'vigil_4'))).toBe('learned')
    expect(meepSkillBucket(entryOf(skillEntries.value, 'vigil_4b'))).toBe('sealed')
  })

  it('a sealed node never counts as buyable, however full the purse', () => {
    const game = useGameStore()
    const tree = useMeepTreeStore()
    const { skillEntries } = useMeepSkills()

    tree.bought = ['vigil_1', 'vigil_2', 'vigil_3', 'vigil_4']
    game.meeps = VIGIL_4B.cost * 10

    const sealed = entryOf(skillEntries.value, 'vigil_4b')
    expect(sealed.canBuy).toBe(false)
    expect(meepSkillBucket(sealed)).toBe('sealed')
  })
})

describe('useMeepSkills — best buy', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('is null while nothing is affordable', () => {
    const game = useGameStore()
    const { bestBuyId } = useMeepSkills()

    game.meeps = 0
    expect(bestBuyId.value).toBeNull()
  })

  /*
   * Die drei Zweige `vigil` und `resonance` starten billiger als `cosmos`,
   * `battle` und `warden`. Ein Beutel, der alle fünf Erststufen deckt, muss
   * deshalb auf einen der beiden billigen zeigen — und weil `vigil` im Katalog
   * zuerst steht, auf `vigil_1`.
   */
  it('points at the cheapest node the purse covers, not the first open one', () => {
    const game = useGameStore()
    const { bestBuyId } = useMeepSkills()

    expect(VIGIL_1.cost).toBeLessThan(COSMOS_1.cost)
    game.meeps = COSMOS_1.cost
    expect(bestBuyId.value).toBe('vigil_1')
  })

  it('only ever names a node that is actually buyable', () => {
    const game = useGameStore()
    const { bestBuyId, entryById } = useMeepSkills()

    game.meeps = COSMOS_1.cost * 4
    const id = bestBuyId.value
    expect(id).not.toBeNull()
    expect(entryById.value.get(id as string)?.canBuy).toBe(true)
  })

  it('moves on to the next cheapest once the current one is learned', () => {
    const game = useGameStore()
    const tree = useMeepTreeStore()
    const { bestBuyId } = useMeepSkills()

    // Beide Erststufen kosten gleich viel; nach dem Kauf der einen bleibt die andere.
    expect(VIGIL_1.cost).toBe(RESO_1.cost)
    game.meeps = VIGIL_1.cost + RESO_1.cost
    expect(bestBuyId.value).toBe('vigil_1')

    tree.buyNode('vigil_1')
    expect(bestBuyId.value).toBe('reso_1')
  })
})

describe('useMeepSkills — entry contents', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('reports what is still missing, never a negative amount', () => {
    const game = useGameStore()
    const { skillEntries } = useMeepSkills()

    game.meeps = 0
    expect(entryOf(skillEntries.value, 'vigil_1').missing).toBe(VIGIL_1.cost)

    game.meeps = VIGIL_1.cost * 3
    const rich = entryOf(skillEntries.value, 'vigil_1')
    expect(rich.missing).toBe(0)
    expect(rich.canAfford).toBe(true)
  })

  it('carries the rank the player reads — 1-based, not the 0-based tier', () => {
    const { skillEntries } = useMeepSkills()
    expect(entryOf(skillEntries.value, 'vigil_1').rank).toBe(VIGIL_1.tier + 1)
    expect(entryOf(skillEntries.value, 'vigil_1').rank).toBe(1)
  })

  it('names the fork rival on both sides of rank 4, and nowhere else', () => {
    const { skillEntries } = useMeepSkills()

    expect(entryOf(skillEntries.value, 'vigil_4').rivals.map((r) => r.id)).toEqual(['vigil_4b'])
    expect(entryOf(skillEntries.value, 'vigil_4b').rivals.map((r) => r.id)).toEqual(['vigil_4'])
    expect(entryOf(skillEntries.value, 'vigil_1').rivals).toEqual([])
  })

  it('lists the still-unlearned prerequisites and the cost of the whole chain', () => {
    const { skillEntries } = useMeepSkills()
    const deep = entryOf(skillEntries.value, 'vigil_3')

    expect(deep.prerequisites.map((p) => p.id)).toEqual(['vigil_1', 'vigil_2'])
    expect(deep.pathCost).toBe(VIGIL_1.cost + VIGIL_2.cost + deep.cost)
  })

  it('drops a prerequisite from the chain once it is learned', () => {
    const tree = useMeepTreeStore()
    const { skillEntries } = useMeepSkills()

    tree.bought = ['vigil_1']
    const deep = entryOf(skillEntries.value, 'vigil_3')

    expect(deep.prerequisites.map((p) => p.id)).toEqual(['vigil_2'])
    expect(deep.pathCost).toBe(VIGIL_2.cost + deep.cost)
  })
})

describe('useMeepSkills — before/after rows', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('scales the live stat for a node that multiplies it', () => {
    const game = useGameStore()
    const { detailFor } = useMeepSkills()

    game.chimesPerSecond = 100
    const { changes } = detailFor('vigil_1')
    const cps = changes.find((c) => c.key === 'cpsMult')

    // `vigil_1` trägt ×1.25 auf CpS — 100/s wird damit zu 125/s.
    expect(cps).toBeDefined()
    expect(cps?.from).toContain('100')
    expect(cps?.from).toContain('/s')
    expect(cps?.to).toContain('125')
    expect(cps?.good).toBe(true)
  })

  it('gives one chip per touched system, without repeats', () => {
    const { detailFor } = useMeepSkills()
    const { tags } = detailFor('vigil_5')

    expect(tags.length).toBeGreaterThan(0)
    expect(new Set(tags.map((t) => t.label)).size).toBe(tags.length)
  })

  it('returns an empty reading for an id the catalogue does not know', () => {
    const { detailFor } = useMeepSkills()
    expect(detailFor('no_such_node')).toEqual({ changes: [], tags: [] })
  })
})
