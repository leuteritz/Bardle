import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePersistence } from '@/composables/system/usePersistence'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { SAVE_KEY } from '@/config/constants'

/**
 * Der „NEW"-Rahmen im Shop muss den Reload überleben.
 *
 * Warum das eine eigene Spec wert ist: der Offline-Ertrag wird beim Laden
 * gutgeschrieben (bis zu `OFFLINE_MAX_HOURS`), und ohne diese Liste stünde nach
 * jeder längeren Pause der halbe Sternbaum als „neu" da — genau die Rückkehr,
 * für die die Markierung gemacht ist, wäre damit die unbrauchbarste.
 *
 * Die zweite Hälfte ist der ID-Vertrag: `acknowledgedShop` hält blanke
 * Inhalts-IDs, muss also wie jede andere solche Liste durch `migratedIds()`
 * laufen.
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

describe('starForge.acknowledgedShop — save/load roundtrip', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', makeLocalStorageStub())
  })

  it('gesehene Einträge bleiben gesehen', () => {
    const { saveGame, loadGame } = usePersistence()

    useStarForgeStore().acknowledgedShop = ['solarSails', 'flightSpeed']

    saveGame()
    setActivePinia(createPinia())
    loadGame()

    expect(useStarForgeStore().acknowledgedShop).toEqual(['solarSails', 'flightSpeed'])
  })

  it('ein Spielstand ohne das Feld lädt als leere Liste, nicht als undefined', () => {
    const { saveGame, loadGame } = usePersistence()

    useStarForgeStore().acknowledgedShop = ['solarSails']
    saveGame()

    // Ältere Spielstände kennen das Feld nicht — `migratedIds` muss daraus eine
    // leere Liste machen, sonst bricht `syncShopAcknowledged` beim ersten Tick.
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!)
    delete saved.starForge.acknowledgedShop
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved))

    setActivePinia(createPinia())
    loadGame()

    expect(useStarForgeStore().acknowledgedShop).toEqual([])
  })
})
