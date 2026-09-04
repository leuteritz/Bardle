import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { usePersistence } from '@/composables/system/usePersistence'
import { gameNow } from '@/utils/game/gameClock'
import { CHAMPION_STAR_DURATION_MS, SAVE_KEY } from '@/config/constants'
import type { StarManifest } from '@/types'

/*
 * Der Vertrag des Sternmanifests.
 *
 * Es ist die EINZIGE Auskunft über einen einzelnen Stern, die nicht aus
 * `mapSeed` abgeleitet werden kann — Champion, Welten, Chimes, Uhr. Zwei Dinge
 * daran können still brechen, und beide sind hier gebunden:
 *
 *  1. die INDEX-GLEICHHEIT zu `attemptResults`. Läuft sie auseinander, trägt
 *     jede Sternmarke der Galaxiekarte die Geschichte eines anderen Sterns —
 *     und nichts an der Anzeige sähe falsch aus.
 *  2. der Zeitpunkt, zu dem `cleared` gelesen wird. `clearChampionStar` räumt
 *     jeden offenen Slot, damit der Vanish-Effekt zündet; danach meldet jeder
 *     verlorene Stern volle Ausbeute.
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

function manifest(over: Partial<StarManifest> = {}): StarManifest {
  return { planets: 4, cleared: 4, chimes: 1000, heldSec: 30, windowSec: 60, ...over }
}

/** Ein Champion-Stern, direkt gestellt: die Spawn-Action zöge Sonnenphase,
 *  Galaxie und den ganzen Boss-Wurf mit, ohne dass eines davon hier eingeht. */
function makeChampionStar(clearedCount: number, total = 3) {
  return {
    id: 'star-1',
    starType: 'champion' as const,
    look: 'dwarf' as const,
    seed: 0,
    starAngle: 0,
    starDirection: 1 as const,
    orbitRx: 100,
    orbitRy: 60,
    orbitTilt: 0,
    orbitSpeed: 0.1,
    starColor: [255, 214, 0] as [number, number, number],
    spawnedAt: gameNow() - CHAMPION_STAR_DURATION_MS,
    durationMs: CHAMPION_STAR_DURATION_MS,
    champion: 'Kayn',
    role: 'jungle' as const,
    chimes: 4200,
    planetSlots: Array.from({ length: total }, (_, i) => ({
      planetId: `star-planet-${i}`,
      type: 'rock' as never,
      isChampionPlanet: i === 0,
      orbitAngle: 0,
      orbitSpeed: 0.1,
      orbitDirection: 1 as const,
      orbitRx: 30,
      orbitRy: 18,
      orbitTilt: 0,
      cleared: i < clearedCount,
    })),
  }
}

describe('Sternmanifest: die Index-Gleichheit zu attemptResults', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('schiebt zu jedem Versuchsergebnis genau einen Eintrag', () => {
    const galaxy = useGalaxyStore()
    galaxy.starsRequired = 5
    galaxy.nextStarRole = 'mid'

    galaxy.onChampionStarRescued(manifest({ champion: 'Bard' }))
    // Die Rettung fordert die nächste Rollenwahl an und räumt `nextStarRole` —
    // ohne sie kehrte der Fehlschlag darunter früh zurück.
    galaxy.nextStarRole = 'mid'
    galaxy.onChampionStarExpired(manifest({ cleared: 1 }))
    galaxy.onChampionStarRescued(manifest({ champion: 'Kayn' }))

    expect(galaxy.attemptResults).toEqual(['rescued', 'failed', 'rescued'])
    expect(galaxy.starManifests).toHaveLength(galaxy.attemptResults.length)
    expect(galaxy.starManifests[0].champion).toBe('Bard')
    expect(galaxy.starManifests[2].champion).toBe('Kayn')
  })

  it('schiebt NICHTS, wo auch attemptResults nichts schiebt', () => {
    const galaxy = useGalaxyStore()

    // Ohne gewählte Rolle kehrt `onChampionStarExpired` früh zurück und öffnet
    // stattdessen die Rollenwahl — der eine Pfad, an dem die beiden Arrays
    // auseinanderlaufen würden.
    galaxy.nextStarRole = null
    galaxy.onChampionStarExpired(manifest())
    expect(galaxy.attemptResults).toEqual([])
    expect(galaxy.starManifests).toEqual([])

    // Und ebenso, wenn das Sternsoll schon voll ist.
    galaxy.starsRequired = 1
    galaxy.starsRescued = 1
    galaxy.onChampionStarRescued(manifest())
    expect(galaxy.attemptResults).toEqual([])
    expect(galaxy.starManifests).toEqual([])
  })

  it('nimmt die Manifeste mit ins Archiv und räumt sie beim Galaxiewechsel', () => {
    const galaxy = useGalaxyStore()
    galaxy.starsRequired = 1
    galaxy.nextStarRole = 'top'
    galaxy.onChampionStarRescued(manifest({ champion: 'Bard' }))
    galaxy.galaxyBossDefeated = true
    galaxy.bossEscortsTotal = 0
    galaxy.bossEscortsDefeated = 0
    galaxy.maybeRecordCompletion()

    const record = galaxy.completedGalaxies.find((r) => r.galaxy === galaxy.currentGalaxy)
    expect(record?.starManifests).toHaveLength(1)
    expect(record?.starManifests?.[0].champion).toBe('Bard')

    // Der Archiveintrag ist eine KOPIE: der Galaxiewechsel darf ihn nicht
    // leerziehen.
    galaxy.commitAdvance()
    expect(galaxy.starManifests).toEqual([])
    expect(record?.starManifests).toHaveLength(1)
  })
})

describe('Sternmanifest: was der Stern sammelt', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('bucht Chimes nur auf den Stern, dem der Planet gehört', () => {
    const stars = useStarGroupStore()
    stars.activeStars = [makeChampionStar(0)]
    const before = stars.activeStars[0].chimes ?? 0

    stars.creditStarChimes('star-planet-1', 500)
    expect(stars.activeStars[0].chimes).toBe(before + 500)

    // Ein fremder Planet und ein leerer Betrag verändern nichts.
    stars.creditStarChimes('planet-of-another-star', 900)
    stars.creditStarChimes('star-planet-1', 0)
    expect(stars.activeStars[0].chimes).toBe(before + 500)
  })

  it('liest `cleared` VOR dem Räumen — ein verlorener Stern meldet nicht voll', () => {
    vi.useFakeTimers()
    try {
      const galaxy = useGalaxyStore()
      galaxy.starsRequired = 5
      galaxy.nextStarRole = 'jungle'
      const stars = useStarGroupStore()
      const star = makeChampionStar(1)
      stars.activeStars = [star]

      stars.clearChampionStar()

      expect(galaxy.attemptResults).toEqual(['failed'])
      const m = galaxy.starManifests[0]
      expect(m.planets).toBe(3)
      expect(m.cleared).toBe(1)
      expect(m.chimes).toBe(4200)
      expect(m.heldSec).toBe(CHAMPION_STAR_DURATION_MS / 1000)
      expect(m.windowSec).toBe(CHAMPION_STAR_DURATION_MS / 1000)

      // Und jetzt der eigentliche Punkt: die verzögerte Räumung setzt JEDEN
      // Slot auf `cleared`, damit der Vanish-Effekt zündet. Das Manifest ist
      // eine Momentaufnahme und darf davon nichts mitbekommen.
      vi.runAllTimers()
      expect(stars.activeStars.find((s) => s.id === star.id)).toBeUndefined()
      expect(star.planetSlots.every((p) => p.cleared)).toBe(true)
      expect(galaxy.starManifests[0].cleared).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('trägt Champion und Rolle, ohne den Boss zu befragen', () => {
    const galaxy = useGalaxyStore()
    galaxy.starsRequired = 5
    galaxy.nextStarRole = 'jungle'
    const stars = useStarGroupStore()
    stars.activeStars = [makeChampionStar(0)]

    // Der Boss des Heimatplaneten ist beim Abgang längst aus `activeBosses` —
    // genau deshalb merkt der Stern sich beides beim Spawn.
    stars.clearChampionStar()

    expect(galaxy.starManifests[0].champion).toBe('Kayn')
    expect(galaxy.starManifests[0].role).toBe('jungle')
  })
})

describe('Sternmanifest: der Choke-Point beim Archivieren', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function completeGalaxy(galaxy: ReturnType<typeof useGalaxyStore>) {
    galaxy.galaxyBossDefeated = true
    galaxy.bossEscortsTotal = 0
    galaxy.bossEscortsDefeated = 0
    galaxy.maybeRecordCompletion()
    return galaxy.completedGalaxies.find((r) => r.galaxy === galaxy.currentGalaxy)
  }

  it('füllt auf, wenn attemptResults von aussen voll geschrieben wurde', () => {
    // Genau das tun `forceCompleteGalaxy` und `startBossPhase` im Admin-Panel:
    // volle Versuchsreihe, keine Manifeste. Ohne die Heilung hätte der
    // Archiveintrag weniger Manifeste als Marken, und jede Sternkarte ab dem
    // ersten fehlenden Index trüge die Geschichte eines anderen Sterns.
    const galaxy = useGalaxyStore()
    galaxy.starsRequired = 4
    galaxy.starsRescued = 4
    galaxy.attemptResults = ['rescued', 'rescued', 'rescued', 'rescued']

    const record = completeGalaxy(galaxy)
    expect(record?.starManifests).toHaveLength(4)
    expect(record?.starManifests?.every((m) => !!m.champion)).toBe(true)
  })

  it('ergänzt nur — was wirklich geflogen wurde, bleibt stehen', () => {
    const galaxy = useGalaxyStore()
    galaxy.starsRequired = 3
    galaxy.nextStarRole = 'mid'
    galaxy.onChampionStarRescued(manifest({ champion: 'Bard', chimes: 99 }))
    // Danach von aussen aufgefüllt, wie es der Admin-Knopf täte.
    galaxy.starsRescued = 3
    galaxy.attemptResults = ['rescued', 'rescued', 'rescued']

    const record = completeGalaxy(galaxy)
    expect(record?.starManifests).toHaveLength(3)
    expect(record?.starManifests?.[0]).toMatchObject({ champion: 'Bard', chimes: 99 })
  })
})

describe('Sternmanifest: Altbestand', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', makeLocalStorageStub())
  })

  it('übersteht Speichern und Laden', () => {
    const galaxy = useGalaxyStore()
    galaxy.starsRequired = 2
    galaxy.nextStarRole = 'adc'
    galaxy.onChampionStarRescued(manifest({ champion: 'Bard', role: 'adc' }))
    usePersistence().saveGame()

    setActivePinia(createPinia())
    const reloaded = useGalaxyStore()
    usePersistence().loadGame()

    expect(reloaded.starManifests).toHaveLength(1)
    expect(reloaded.starManifests[0].champion).toBe('Bard')
    expect(reloaded.starManifests[0].role).toBe('adc')
  })

  it('bringt ein Manifest mit dem ALTEN Feldnamen `worlds` auf `planets`', () => {
    // `planets` hiess kurzzeitig `worlds`. Ohne die Migration läse der Tooltip
    // `undefined` und zeigte eine leere Zahl — sichtbar kaputt, aber nur in
    // einem Spielstand, den kein Test sonst anfasst.
    const galaxy = useGalaxyStore()
    galaxy.starsRequired = 2
    galaxy.nextStarRole = 'top'
    galaxy.onChampionStarRescued(manifest({ champion: 'Bard', planets: 3, cleared: 3 }))
    usePersistence().saveGame()

    // Den gespeicherten Block auf die alte Form zurückdrehen — laufende Galaxie
    // UND Archiv, denn beide Ladestellen müssen heilen.
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!)
    const toLegacy = (m: Record<string, unknown>) => {
      const { planets, ...rest } = m
      return { ...rest, worlds: planets }
    }
    saved.galaxy.starManifests = saved.galaxy.starManifests.map(toLegacy)
    saved.galaxy.completedGalaxies = [
      {
        galaxy: 1,
        mapSeed: 4711,
        themeIndex: 0,
        attemptResults: ['rescued'],
        durationSeconds: 300,
        completedAt: 1_700_000_000_000,
        starManifests: [toLegacy({ ...manifest({ champion: 'Kayn', planets: 4, cleared: 4 }) })],
      },
    ]
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved))

    setActivePinia(createPinia())
    const reloaded = useGalaxyStore()
    usePersistence().loadGame()

    expect(reloaded.starManifests[0].planets).toBe(3)
    expect(reloaded.starManifests[0].champion).toBe('Bard')
    const record = reloaded.completedGalaxies.find((r) => r.galaxy === 1)
    expect(record?.starManifests?.[0].planets).toBe(4)
    // Der Rest des Eintrags überlebt — die Migration ist kein Nachtrag.
    expect(record?.starManifests?.[0].champion).toBe('Kayn')
  })

  it('trägt einem Archiv ohne Manifeste beim Laden welche nach', () => {
    const galaxy = useGalaxyStore()
    galaxy.starsRequired = 2
    galaxy.nextStarRole = 'support'
    galaxy.onChampionStarRescued(manifest())
    usePersistence().saveGame()

    // Ein Spielstand von vor dem Manifest: das Feld gibt es dort schlicht nicht.
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!)
    delete saved.galaxy.starManifests
    saved.galaxy.completedGalaxies = [
      {
        galaxy: 1,
        mapSeed: 4711,
        themeIndex: 0,
        attemptResults: ['rescued', 'failed'],
        durationSeconds: 300,
        completedAt: 1_700_000_000_000,
      },
    ]
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved))

    setActivePinia(createPinia())
    const reloaded = useGalaxyStore()
    usePersistence().loadGame()

    expect(reloaded.starManifests).toEqual([])
    const record = reloaded.completedGalaxies.find((r) => r.galaxy === 1)
    expect(record).toBeDefined()
    expect(record?.attemptResults).toEqual(['rescued', 'failed'])
    // Nachgetragen statt stumm: sonst blätterte der Spieler durch Galaxien,
    // deren Sternkarten schweigen, während die daneben sprechen.
    expect(record?.starManifests).toHaveLength(2)
    expect(record?.starManifests?.[0].champion).toBeTruthy()
    expect(record?.starManifests?.[1].heldSec).toBe(record?.starManifests?.[1].windowSec)
  })
})
