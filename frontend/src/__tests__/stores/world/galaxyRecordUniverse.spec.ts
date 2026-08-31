import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Die Test-Umgebung stellt kein globales localStorage bereit → In-Memory-Stub.
function makeLocalStorageStub() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
}
import { usePersistence } from '@/composables/system/usePersistence'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useGameStore } from '@/stores/core/gameStore'
import { SAVE_KEY } from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

/**
 * `record.universe` ist die Schnittkante der Firmament-Bahnen. Fehlt der
 * Stempel, liegt der ganze Bestand auf EINER Bahn — und das sieht man erst im
 * Reiter, nicht im Code.
 */

/** Eine Galaxie so abschliessen, wie es der Spielverlauf tut. */
function completeCurrentGalaxy(galaxy: ReturnType<typeof useGalaxyStore>) {
  galaxy.starsRequired = 0
  galaxy.galaxyBossDefeated = true
  galaxy.bossEscortsTotal = 0
  galaxy.bossEscortsDefeated = 0
  galaxy.maybeRecordCompletion()
}

describe('der Universumsstempel am Archiv-Datensatz', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stempelt beim Abschluss das laufende Universum', () => {
    const galaxy = useGalaxyStore()
    const game = useGameStore()
    game.currentUniverse = 4

    completeCurrentGalaxy(galaxy)

    const record = galaxy.completedGalaxies.find((r) => r.galaxy === galaxy.currentGalaxy)
    expect(record?.universe).toBe(4)
  })

  it('stempelt nach einem Aufbruch das NEUE Universum', () => {
    const galaxy = useGalaxyStore()
    const game = useGameStore()

    completeCurrentGalaxy(galaxy)
    const first = galaxy.currentGalaxy

    game.currentUniverse = 7
    galaxy.currentGalaxy = first + 1
    galaxy.mapSeed = 4242
    completeCurrentGalaxy(galaxy)

    expect(galaxy.completedGalaxies.find((r) => r.galaxy === first)?.universe).toBe(1)
    expect(galaxy.completedGalaxies.find((r) => r.galaxy === first + 1)?.universe).toBe(7)
  })

  it('stempelt den Admin-Nachtrag und bleibt dabei idempotent', () => {
    const galaxy = useGalaxyStore()
    const game = useGameStore()
    galaxy.currentGalaxy = 30
    game.currentUniverse = 10
    galaxy.adminBackfillArchive(29)

    game.adminBackfillUniverseRuns()
    const once = galaxy.completedGalaxies.map((r) => r.universe)
    expect(once.every((u) => typeof u === 'number' && u > 0)).toBe(true)
    // Mehr als ein Universum — sonst waere der Nachtrag wirkungslos.
    expect(new Set(once).size).toBeGreaterThan(1)

    game.adminBackfillUniverseRuns()
    expect(galaxy.completedGalaxies.map((r) => r.universe)).toEqual(once)
  })
})

describe('der Universumsstempel im Spielstand', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', makeLocalStorageStub())
  })

  it('haelt den Stempel ueber Save und Load', () => {
    const { saveGame, loadGame } = usePersistence()
    const galaxy = useGalaxyStore()
    const game = useGameStore()
    game.currentUniverse = 6
    completeCurrentGalaxy(galaxy)
    const galaxyNo = galaxy.currentGalaxy

    saveGame()
    setActivePinia(createPinia())
    loadGame()

    expect(
      useGalaxyStore().completedGalaxies.find((r) => r.galaxy === galaxyNo)?.universe,
    ).toBe(6)
  })

  /* Der Fall, um den es wirklich geht: ein Spielstand von VOR dem Feld. */
  it('traegt einem Save ohne Feld die Universen passend zu den Laeufen nach', () => {
    const { saveGame, loadGame } = usePersistence()
    const galaxy = useGalaxyStore()
    const game = useGameStore()
    galaxy.currentGalaxy = 9
    game.currentUniverse = 5
    game.totalPrestiges = 2
    game.universeRuns = [
      {
        universe: 1,
        durationSeconds: 100,
        starsRescued: 3,
        galaxiesFreed: 2,
        chimes: 1e5,
        completedAt: 250,
      },
      {
        universe: 2,
        durationSeconds: 100,
        starsRescued: 3,
        galaxiesFreed: 2,
        chimes: 2e5,
        completedAt: 450,
      },
    ]
    saveGame()

    // Den Stempel aus dem Save entfernen — genau der Zustand eines Altstandes.
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!)
    saved.galaxy.completedGalaxies = [1, 2, 3, 4].map((galaxyNo) => ({
      galaxy: galaxyNo,
      mapSeed: 100 + galaxyNo,
      themeIndex: 0,
      attemptResults: ['rescued'],
      landfallResults: [],
      starManifests: [],
      durationSeconds: 60,
      completedAt: galaxyNo * 200,
    }))
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved))

    setActivePinia(createPinia())
    loadGame()

    const stamped = useGalaxyStore().completedGalaxies as CompletedGalaxyRecord[]
    // G1 (200) endete vor Lauf 1 (250), G2 (400) vor Lauf 2 (450), der Rest ist
    // das laufende Universum.
    expect(stamped.map((r) => r.universe)).toEqual([1, 2, 5, 5])
  })
})
