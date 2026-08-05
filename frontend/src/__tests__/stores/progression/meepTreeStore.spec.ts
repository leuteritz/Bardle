import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useMeepTreeStore } from '../../stores/meepTreeStore'
import { useGameStore } from '../../stores/gameStore'

/* The first node of every branch has no prerequisite; melody_1 costs 3 Meeps. */

describe('meepTreeStore — skill-ready notifications', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('a first-tier node notifies once the player can afford it', () => {
    const store = useMeepTreeStore()
    const game = useGameStore()

    game.meeps = 0
    expect(store.notifyingNodeIds).not.toContain('melody_1')
    expect(store.unseenBuyableCount).toBe(0)

    game.meeps = 5
    expect(store.notifyingNodeIds).toContain('melody_1')
    expect(store.unseenBuyableCount).toBeGreaterThan(0)
  })

  it('hovering a node acknowledges it → badge gone, count drops', () => {
    const store = useMeepTreeStore()
    const game = useGameStore()
    game.meeps = 5

    const before = store.unseenBuyableCount
    store.acknowledgeNode('melody_1')

    expect(store.notifyingNodeIds).not.toContain('melody_1')
    expect(store.unseenBuyableCount).toBe(before - 1)
  })

  it('acknowledging a non-buyable node is a no-op', () => {
    const store = useMeepTreeStore()
    const game = useGameStore()
    game.meeps = 0

    store.acknowledgeNode('melody_1')
    expect(store.acknowledged).not.toContain('melody_1')
  })

  it('a node re-notifies after it becomes unaffordable and affordable again', () => {
    const store = useMeepTreeStore()
    const game = useGameStore()

    game.meeps = 5
    store.acknowledgeNode('melody_1')
    expect(store.notifyingNodeIds).not.toContain('melody_1')

    // Player spends Meeps elsewhere → node no longer buyable
    game.meeps = 0
    store.syncAcknowledged()
    expect(store.acknowledged).not.toContain('melody_1')

    // Back within reach → notifies again
    game.meeps = 5
    expect(store.notifyingNodeIds).toContain('melody_1')
  })

  it('bought nodes never notify and drop out of the acknowledged list', () => {
    const store = useMeepTreeStore()
    const game = useGameStore()
    game.meeps = 100

    expect(store.buyNode('melody_1')).toBe(true)
    expect(store.notifyingNodeIds).not.toContain('melody_1')

    store.syncAcknowledged()
    expect(store.acknowledged).not.toContain('melody_1')
  })
})
