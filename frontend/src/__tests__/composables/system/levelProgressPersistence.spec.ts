import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePersistence } from '@/composables/system/usePersistence'
import { useGameStore } from '@/stores/core/gameStore'
import { SAVE_KEY } from '@/config/constants'

/**
 * Der Fortschritt INNERHALB des laufenden Levels muss den Reload überleben.
 *
 * `chimesEarnedForLevel` stand lange nicht im Speicherblock: gespeichert wurden
 * `level` und `chimesForNextLevel`, der Zähler dazwischen fiel beim Laden auf
 * null. Solange eine Stufe in Minuten fiel, war das kaum zu bemerken. Seit
 * `LEVEL_BASE` und `LEVEL_EXPONENT` sie um Grössenordnungen teurer machen, sind
 * es Stunden je Reload — und die Leiste sprang dabei sichtbar zurück.
 */
function makeLocalStorageStub() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
}

describe('chimesEarnedForLevel — save/load roundtrip', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', makeLocalStorageStub())
  })

  it('der Fortschritt im laufenden Level bleibt stehen', () => {
    const { saveGame, loadGame } = usePersistence()

    const game = useGameStore()
    game.level = 4
    game.calculateLevel()
    const carried = game.totalChimesThisLevel * 0.4
    game.chimesEarnedForLevel = carried

    saveGame()
    setActivePinia(createPinia())
    loadGame()

    expect(useGameStore().chimesEarnedForLevel).toBe(carried)
  })

  it('ein Spielstand ohne das Feld lädt als 0, nicht als undefined', () => {
    const { saveGame, loadGame } = usePersistence()

    useGameStore().chimesEarnedForLevel = 1234
    saveGame()

    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!)
    delete saved.game.chimesEarnedForLevel
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved))

    setActivePinia(createPinia())
    loadGame()

    // Nicht undefined: `levelProgress` teilt durch diesen Wert.
    expect(useGameStore().chimesEarnedForLevel).toBe(0)
    expect(useGameStore().levelProgress).toBe(0)
  })
})
