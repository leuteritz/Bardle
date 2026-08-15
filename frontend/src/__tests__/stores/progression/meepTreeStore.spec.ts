import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useGameStore } from '@/stores/core/gameStore'
import {
  MEEP_TREE_NODE_INDEX,
  MEEP_TREE_PATH_NODES,
  MEEP_TREE_TIERS_PER_BRANCH,
} from '@/config/progression/meepTree'

/*
 * Der erste Knoten jedes Zweiges hat keine Voraussetzung. Sein PREIS wird hier
 * aus dem Katalog gelesen, nicht abgeschrieben: er ist eine Balance-Groesse
 * (gegen die Prestige-Ausbeute geeicht) und aendert sich mit ihr, waehrend
 * diese Datei die Melde-Abzeichen prueft und nicht die Wirtschaft.
 */
const VIGIL_1_COST = MEEP_TREE_NODE_INDEX['vigil_1'].node.cost

describe('meepTreeStore — skill-ready notifications', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('a first-tier node notifies once the player can afford it', () => {
    const store = useMeepTreeStore()
    const game = useGameStore()

    game.meeps = 0
    expect(store.notifyingNodeIds).not.toContain('vigil_1')
    expect(store.unseenBuyableCount).toBe(0)

    game.meeps = VIGIL_1_COST
    expect(store.notifyingNodeIds).toContain('vigil_1')
    expect(store.unseenBuyableCount).toBeGreaterThan(0)
  })

  it('hovering a node acknowledges it → badge gone, count drops', () => {
    const store = useMeepTreeStore()
    const game = useGameStore()
    game.meeps = VIGIL_1_COST

    const before = store.unseenBuyableCount
    store.acknowledgeNode('vigil_1')

    expect(store.notifyingNodeIds).not.toContain('vigil_1')
    expect(store.unseenBuyableCount).toBe(before - 1)
  })

  it('acknowledging a non-buyable node is a no-op', () => {
    const store = useMeepTreeStore()
    const game = useGameStore()
    game.meeps = 0

    store.acknowledgeNode('vigil_1')
    expect(store.acknowledged).not.toContain('vigil_1')
  })

  it('a node re-notifies after it becomes unaffordable and affordable again', () => {
    const store = useMeepTreeStore()
    const game = useGameStore()

    game.meeps = VIGIL_1_COST
    store.acknowledgeNode('vigil_1')
    expect(store.notifyingNodeIds).not.toContain('vigil_1')

    // Player spends Meeps elsewhere → node no longer buyable
    game.meeps = 0
    store.syncAcknowledged()
    expect(store.acknowledged).not.toContain('vigil_1')

    // Back within reach → notifies again
    game.meeps = VIGIL_1_COST
    expect(store.notifyingNodeIds).toContain('vigil_1')
  })

  it('bought nodes never notify and drop out of the acknowledged list', () => {
    const store = useMeepTreeStore()
    const game = useGameStore()
    game.meeps = VIGIL_1_COST * 2

    expect(store.buyNode('vigil_1')).toBe(true)
    expect(store.notifyingNodeIds).not.toContain('vigil_1')

    store.syncAcknowledged()
    expect(store.acknowledged).not.toContain('vigil_1')
  })
})

/*
 * Die Gabel auf Rang 4: zwei Knoten teilen sich einen Rang, wer einen lernt,
 * versiegelt den anderen. Rang 5 nimmt beide Seiten an — eine Wahl darf nie
 * eine Sackgasse sein.
 *
 * Der Vorlauf wird hier direkt in `bought` geschrieben statt gekauft: geprüft
 * werden die Zustandsregeln, nicht der Kaufpfad, und ein durchgekaufter Baum
 * hinge an der Meep-Bilanz mit dran.
 */
describe('meepTreeStore — die Gabel auf Rang 4', () => {
  /** Alles unterhalb von Rang 4 im vigil-Zweig. */
  const UP_TO_RANK_3 = ['vigil_1', 'vigil_2', 'vigil_3']

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('eine gelernte Seite versiegelt die andere für immer', () => {
    const store = useMeepTreeStore()
    const game = useGameStore()
    store.bought = [...UP_TO_RANK_3]
    game.meeps = 10_000

    expect(store.nodeState('vigil_4')).toBe('buyable')
    expect(store.nodeState('vigil_4b')).toBe('buyable')

    store.bought.push('vigil_4')

    expect(store.nodeState('vigil_4b')).toBe('blocked')
    // Auch mit Meeps im Überfluss: versiegelt bleibt versiegelt.
    expect(store.notifyingNodeIds).not.toContain('vigil_4b')
    expect(store.buyNode('vigil_4b')).toBe(false)
  })

  it('Rang 5 ist über JEDE der beiden Seiten erreichbar', () => {
    for (const side of ['vigil_4', 'vigil_4b']) {
      setActivePinia(createPinia())
      const store = useMeepTreeStore()
      useGameStore().meeps = 10_000
      store.bought = [...UP_TO_RANK_3, side]
      expect(store.nodeState('vigil_5')).toBe('buyable')
    }
  })

  it('erreichbar heisst offen, aber unbezahlbar — gesperrt heisst zu', () => {
    const store = useMeepTreeStore()
    const game = useGameStore()
    store.bought = [...UP_TO_RANK_3]

    game.meeps = 0
    expect(store.nodeState('vigil_4')).toBe('reachable')
    // Vorgänger fehlt → gesperrt, ganz gleich wie viele Meeps daliegen.
    game.meeps = 10_000
    expect(store.nodeState('vigil_5')).toBe('locked')
  })

  it('ein Zweig zählt seine RÄNGE, nicht seine Knoten', () => {
    const store = useMeepTreeStore()
    expect(store.branchProgress('vigil').total).toBe(MEEP_TREE_TIERS_PER_BRANCH)

    store.bought = [...UP_TO_RANK_3, 'vigil_4']
    expect(store.branchProgress('vigil').bought).toBe(4)
  })

  it('adminUnlockAll lernt einen VOLLSTÄNDIGEN Baum, nie beide Gabelseiten', () => {
    const store = useMeepTreeStore()
    store.adminUnlockAll()

    expect(store.boughtCount).toBe(MEEP_TREE_PATH_NODES)
    expect(store.bought).not.toContain('vigil_4b')
    for (const branch of ['vigil', 'resonance', 'cosmos', 'battle', 'warden']) {
      expect(store.branchProgress(branch).bought).toBe(MEEP_TREE_TIERS_PER_BRANCH)
    }
  })

  it('der Pfad nimmt die bereits gelernte Seite, die versiegelte hat keinen', () => {
    const store = useMeepTreeStore()
    store.bought = [...UP_TO_RANK_3, 'vigil_4b']

    // Rang 0-3 und 4 sind erledigt → es bleibt der Knoten selbst.
    expect(store.pathTo('vigil_5')).toEqual(['vigil_5'])
    expect(store.meepsToReach('vigil_5')).toBe(MEEP_TREE_NODE_INDEX['vigil_5'].node.cost)

    expect(store.pathTo('vigil_4')).toBeNull()
    expect(store.meepsToReach('vigil_4')).toBeNull()
  })

  it('aus dem Stand kostet Rang 5 die ganze Kette', () => {
    const store = useMeepTreeStore()
    const chain = store.pathTo('vigil_5')

    expect(chain).toEqual(['vigil_1', 'vigil_2', 'vigil_3', 'vigil_4', 'vigil_5'])
    expect(store.meepsToReach('vigil_5')).toBe(
      chain!.reduce((sum, id) => sum + MEEP_TREE_NODE_INDEX[id].node.cost, 0),
    )
  })
})
