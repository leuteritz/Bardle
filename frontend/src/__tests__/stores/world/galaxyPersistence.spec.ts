import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Die Test-Umgebung stellt kein globales localStorage bereit (Node-
// ExperimentalWarning ohne --localstorage-file) → In-Memory-Stub.
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
import { SAVE_KEY } from '@/config/constants'

/** Ob die Minimap (MiniMap.vue `show`) für den aktuellen Store-Zustand
 *  sichtbar wäre — gespiegelte Bedingung aus der Komponente. */
function minimapVisible(galaxyStore: ReturnType<typeof useGalaxyStore>): boolean {
  return (
    galaxyStore.pendingRoleSelection ||
    galaxyStore.isRescueRotating ||
    ((galaxyStore.championTravelState === 'traveling' ||
      galaxyStore.championTravelState === 'champion_available' ||
      galaxyStore.championTravelState === 'champion_spawned') &&
      !galaxyStore.bossPhaseActive &&
      !galaxyStore.isComplete) ||
    galaxyStore.bossPhaseActive ||
    galaxyStore.isGalaxyTransitioning ||
    galaxyStore.isComplete
  )
}

/** saveGame ausführen und den persistierten Galaxy-Block gezielt patchen. */
function writePatchedSave(patch: Record<string, unknown>) {
  const { saveGame } = usePersistence()
  saveGame()
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!)
  saved.galaxy = { ...saved.galaxy, ...patch }
  localStorage.setItem(SAVE_KEY, JSON.stringify(saved))
}

describe('galaxy travel state persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', makeLocalStorageStub())
  })

  it('resumes travel after a save taken mid rescue-rotation', () => {
    // Rollenwahl bestätigt → Rotationsanimation läuft, Travel steht noch aus.
    const galaxyStore = useGalaxyStore()
    galaxyStore.confirmRoleSelection('mid')
    expect(galaxyStore.championTravelState).toBe('idle')
    expect(galaxyStore.travelPendingAfterRotation).toBe(true)

    usePersistence().saveGame()

    // Reload: frische Pinia-Instanz, dann laden.
    setActivePinia(createPinia())
    const reloaded = useGalaxyStore()
    usePersistence().loadGame()

    // Vorher überschrieb das gespeicherte 'idle' den gestarteten Travel →
    // toter Zustand ohne Minimap. Jetzt muss das Schiff wieder fliegen.
    expect(reloaded.championTravelState).toBe('traveling')
    expect(minimapVisible(reloaded)).toBe(true)
  })

  it('heals a dead save (idle, no role selection, no boss) with a known role', () => {
    const galaxyStore = useGalaxyStore()
    galaxyStore.confirmRoleSelection('adc')
    writePatchedSave({
      championTravelState: 'idle',
      pendingRoleSelection: false,
      travelPendingAfterRotation: false,
      nextStarRole: 'adc',
    })

    setActivePinia(createPinia())
    const reloaded = useGalaxyStore()
    usePersistence().loadGame()

    expect(reloaded.championTravelState).toBe('traveling')
    expect(minimapVisible(reloaded)).toBe(true)
  })

  it('heals a dead save without a role by reopening role selection', () => {
    writePatchedSave({
      championTravelState: 'idle',
      pendingRoleSelection: false,
      travelPendingAfterRotation: false,
      nextStarRole: null,
    })

    setActivePinia(createPinia())
    const reloaded = useGalaxyStore()
    usePersistence().loadGame()

    expect(reloaded.pendingRoleSelection).toBe(true)
    expect(minimapVisible(reloaded)).toBe(true)
  })

  it('leaves a boss-phase save untouched (idle at the galaxy core is valid there)', () => {
    const galaxyStore = useGalaxyStore()
    galaxyStore.starsRescued = galaxyStore.starsRequired
    galaxyStore.initBossWave()
    galaxyStore.pendingGalaxyBoss = true
    galaxyStore.pendingRoleSelection = false
    galaxyStore.championTravelState = 'idle'
    writePatchedSave({})

    setActivePinia(createPinia())
    const reloaded = useGalaxyStore()
    usePersistence().loadGame()

    expect(reloaded.championTravelState).toBe('idle')
    expect(reloaded.bossPhaseActive).toBe(true)
    expect(minimapVisible(reloaded)).toBe(true)
  })
})

/**
 * Der Nachtrag der Ereignis-Chronik hat genau EIN Unterscheidungsmerkmal: ein
 * Record verrät nicht, ob ihn ein Werkzeug gebaut oder ein Mensch geflogen hat.
 *
 * `undefined` heisst „nie gebucht", `[]` heisst „nichts kam durch" — und das
 * Zweite ist eine Leistung, keine Lücke.
 */
describe('Ereignis-Chronik beim Laden', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', makeLocalStorageStub())
  })

  function saveWithRecords(records: unknown[]) {
    const { saveGame } = usePersistence()
    saveGame()
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!)
    saved.galaxy = { ...saved.galaxy, completedGalaxies: records }
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved))
  }

  const basis = {
    galaxy: 12,
    mapSeed: 987654,
    themeIndex: 4,
    attemptResults: ['rescued', 'rescued', 'failed', 'rescued'],
    durationSeconds: 600,
    completedAt: 1,
  }

  it('trägt einem Record OHNE das Feld eine Chronik nach', () => {
    saveWithRecords([{ ...basis }])
    setActivePinia(createPinia())
    const reloaded = useGalaxyStore()
    usePersistence().loadGame()
    expect(reloaded.completedGalaxies[0].incidentResults?.length).toBeGreaterThan(0)
  })

  it('lässt ein LEERES Feld leer — dort ist wirklich nichts durchgekommen', () => {
    saveWithRecords([{ ...basis, incidentResults: [] }])
    setActivePinia(createPinia())
    const reloaded = useGalaxyStore()
    usePersistence().loadGame()
    expect(reloaded.completedGalaxies[0].incidentResults).toEqual([])
  })

  it('rührt eine vorhandene Chronik nicht an', () => {
    const echt = [{ kind: 'void-impact', leg: 1, id: 'sunlessBreach', hp: 6 }]
    saveWithRecords([{ ...basis, incidentResults: echt }])
    setActivePinia(createPinia())
    const reloaded = useGalaxyStore()
    usePersistence().loadGame()
    expect(reloaded.completedGalaxies[0].incidentResults).toEqual(echt)
  })
})
