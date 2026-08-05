import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { usePersistence } from '@/composables/system/usePersistence'
import {
  SAVE_KEY,
  MATERIAL_RATE_BUCKET_COUNT,
  MATERIAL_RATE_BUCKET_MS,
} from '@/config/constants'

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

describe('inventory ledger — per-material history', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', makeLocalStorageStub())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tallies every inflow against its source', () => {
    const inv = useInventoryStore()
    inv.addMaterial('stardust', 'harvest', 5)
    inv.addMaterial('stardust', 'boss')
    inv.addMaterial('stardust', 'harvest', 2)

    expect(inv.collectedMaterials.stardust).toBe(8)
    expect(inv.lifetimeCollected.stardust).toBe(8)
    expect(inv.totalMaterialsCollected).toBe(8)
    expect(inv.sourceTally.stardust).toEqual({ harvest: 7, boss: 1 })
  })

  it('tallies every outflow against its sink without touching the collected total', () => {
    const inv = useInventoryStore()
    inv.addMaterial('void_shard', 'drop', 10)
    inv.removeMaterials({ void_shard: 4 }, 'forge')
    inv.removeMaterials({ void_shard: 3 }, 'equipment')

    expect(inv.collectedMaterials.void_shard).toBe(3)
    expect(inv.lifetimeCollected.void_shard).toBe(10)
    expect(inv.lifetimeSpent.void_shard).toBe(7)
    expect(inv.sinkTally.void_shard).toEqual({ forge: 4, equipment: 3 })
  })

  it('rejects an unaffordable cost without recording anything', () => {
    const inv = useInventoryStore()
    inv.addMaterial('dark_matter', 'boss', 2)

    expect(inv.removeMaterials({ dark_matter: 5 }, 'relic')).toBe(false)
    expect(inv.collectedMaterials.dark_matter).toBe(2)
    expect(inv.lifetimeSpent.dark_matter).toBeUndefined()
    expect(inv.sinkTally.dark_matter).toBeUndefined()
  })

  it('keeps the peak stock after the pile is spent down', () => {
    const inv = useInventoryStore()
    inv.addMaterial('star_iron', 'drop', 40)
    inv.removeMaterials({ star_iron: 35 }, 'level')
    inv.addMaterial('star_iron', 'drop', 5)

    expect(inv.collectedMaterials.star_iron).toBe(10)
    expect(inv.peakStock.star_iron).toBe(40)
  })

  it('records the longest gap between two finds', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const inv = useInventoryStore()

    inv.addMaterial('comet_ice', 'drop')
    vi.advanceTimersByTime(120_000)
    inv.addMaterial('comet_ice', 'drop')
    vi.advanceTimersByTime(30_000)
    inv.addMaterial('comet_ice', 'drop')

    expect(inv.longestDroughtMs.comet_ice).toBe(120_000)
    expect(inv.firstFoundAt.comet_ice).toBeLessThan(inv.lastFoundAt.comet_ice)
  })

  it('slides the intake window forward and drops what fell out of the hour', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const inv = useInventoryStore()

    inv.addMaterial('nebula_quartz', 'drop', 6)
    const buckets = inv.rateBuckets.nebula_quartz
    expect(buckets).toHaveLength(MATERIAL_RATE_BUCKET_COUNT)
    expect(buckets[buckets.length - 1]).toBe(6)

    // Eine Minute weiter: der Wert rutscht einen Eimer nach links.
    vi.advanceTimersByTime(MATERIAL_RATE_BUCKET_MS)
    inv.advanceRateWindow()
    expect(buckets[buckets.length - 2]).toBe(6)
    expect(buckets[buckets.length - 1]).toBe(0)

    // Nach einer vollen Fensterlänge ist nichts mehr davon übrig.
    vi.advanceTimersByTime(MATERIAL_RATE_BUCKET_MS * MATERIAL_RATE_BUCKET_COUNT)
    inv.advanceRateWindow()
    expect(buckets.every((n) => n === 0)).toBe(true)
  })

  it('survives a save/load roundtrip and restarts the intake window', () => {
    const { saveGame, loadGame } = usePersistence()
    const inv = useInventoryStore()

    inv.addMaterial('solar_essence', 'drifter', 12)
    inv.removeMaterials({ solar_essence: 5 }, 'recruit')
    saveGame()

    setActivePinia(createPinia())
    const reloaded = useInventoryStore()
    reloaded.addMaterial('solar_essence', 'drop', 99)
    loadGame()

    expect(reloaded.collectedMaterials.solar_essence).toBe(7)
    expect(reloaded.lifetimeCollected.solar_essence).toBe(12)
    expect(reloaded.lifetimeSpent.solar_essence).toBe(5)
    expect(reloaded.sourceTally.solar_essence).toEqual({ drifter: 12 })
    expect(reloaded.sinkTally.solar_essence).toEqual({ recruit: 5 })
    // Das Messfenster ist bewusst NICHT persistiert — sonst meldete es nach
    // einer Offline-Pause eine Stunde ohne jeden Fund.
    expect(reloaded.rateBuckets).toEqual({})
  })

  it('seeds the ledger from the stock of a save written before it existed', () => {
    const { saveGame, loadGame } = usePersistence()
    const inv = useInventoryStore()
    inv.addMaterial('moon_crystal', 'drop', 30)
    saveGame()

    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!)
    delete saved.inventory.lifetimeCollected
    delete saved.inventory.peakStock
    delete saved.inventory.sourceTally
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved))

    setActivePinia(createPinia())
    const reloaded = useInventoryStore()
    loadGame()

    expect(reloaded.collectedMaterials.moon_crystal).toBe(30)
    expect(reloaded.lifetimeCollected.moon_crystal).toBe(30)
    expect(reloaded.peakStock.moon_crystal).toBe(30)
    expect(reloaded.sourceTally).toEqual({})
  })
})
