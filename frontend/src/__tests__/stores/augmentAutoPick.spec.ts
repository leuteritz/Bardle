import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useGameStore } from '../../stores/gameStore'
import { usePersistence } from '../../composables/usePersistence'
import { AUGMENTS } from '../../config/augments'

/** Die Test-Umgebung stellt kein globales localStorage bereit → In-Memory-Stub. */
function makeLocalStorageStub() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
}

/*
 * Auto-Pick schaltet das Auswahl-Modal ab. Damit hängt daran die Frage, ob der
 * Spieler jemals wieder herauskommt — und ob aufgestaute Auswahlen verschwinden
 * oder abgearbeitet werden. Genau das prüfen diese Tests.
 */

describe('gameStore — auto-pick augments', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is off by default and opens the modal as before', () => {
    const game = useGameStore()
    expect(game.autoPickAugments).toBe(false)
    game.triggerAugmentSelection()
    expect(game.pendingAugmentChoice).toBe(true)
    expect(game.pendingAugmentOptions).toHaveLength(3)
  })

  it('picks one of the three offered augments instead of opening the modal', () => {
    const game = useGameStore()
    game.setAutoPickAugments(true)
    game.triggerAugmentSelection()

    expect(game.pendingAugmentChoice).toBe(false)
    expect(game.pendingAugmentOptions).toEqual([])
    expect(game.activeAugments).toHaveLength(1)
    expect(AUGMENTS.some((a) => a.id === game.activeAugments[0])).toBe(true)
    expect(game.lastAutoPick.id).toBe(game.activeAugments[0])
    expect(game.lastAutoPick.seq).toBe(1)
  })

  it('resolves a selection that is already open when it gets switched on', () => {
    const game = useGameStore()
    game.triggerAugmentSelection()
    const offered = [...game.pendingAugmentOptions]
    expect(game.pendingAugmentChoice).toBe(true)

    game.setAutoPickAugments(true)

    expect(game.pendingAugmentChoice).toBe(false)
    expect(offered).toContain(game.activeAugments[0])
  })

  it('drains a queue that piled up while the game was paused', () => {
    const game = useGameStore()
    game.isGamePaused = true
    game.triggerAugmentSelection()
    game.triggerAugmentSelection()
    game.triggerAugmentSelection()
    expect(game.pendingAugmentSelections).toHaveLength(3)

    game.setAutoPickAugments(true)

    expect(game.pendingAugmentSelections).toHaveLength(0)
    expect(game.activeAugments).toHaveLength(3)
    expect(game.lastAutoPick.seq).toBe(3)
  })

  it('hands control back the moment it is switched off', () => {
    const game = useGameStore()
    game.setAutoPickAugments(true)
    game.triggerAugmentSelection()
    expect(game.activeAugments).toHaveLength(1)

    game.setAutoPickAugments(false)
    game.triggerAugmentSelection()

    expect(game.autoPickAugments).toBe(false)
    expect(game.pendingAugmentChoice).toBe(true)
    expect(game.activeAugments).toHaveLength(1)
  })

  it('survives a reload — "forever" has to outlive the browser session', () => {
    vi.stubGlobal('localStorage', makeLocalStorageStub())
    const { saveGame, loadGame } = usePersistence()

    const game = useGameStore()
    game.setAutoPickAugments(true)
    saveGame()

    setActivePinia(createPinia())
    const reloaded = useGameStore()
    expect(reloaded.autoPickAugments).toBe(false)
    loadGame()
    expect(useGameStore().autoPickAugments).toBe(true)
  })

  it('bumps seq even when the same augment is drawn twice in a row', () => {
    const game = useGameStore()
    // immer das erste der drei Angebote ziehen
    vi.spyOn(Math, 'random').mockReturnValue(0)
    game.setAutoPickAugments(true)
    game.triggerAugmentSelection()
    const first = game.lastAutoPick
    game.triggerAugmentSelection()

    expect(game.lastAutoPick.seq).toBe(first.seq + 1)
  })
})
