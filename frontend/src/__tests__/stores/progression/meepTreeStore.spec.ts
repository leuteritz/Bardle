import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useGameStore } from '@/stores/core/gameStore'
import { MEEP_TREE_NODE_INDEX } from '@/config/progression/meepTree'

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
