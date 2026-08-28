import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'

import { useGalaxyStore, computeRequired } from '@/stores/world/galaxyStore'
import { CHAMPION_STAR_DURATION_MS, MS_PER_SECOND } from '@/config/constants'
import {
  getChampionStarLevel,
  unlockedChampionTierCount,
} from '@/config/champions/championTiers'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import {
  buildBackfillRecord,
  backfillFailCount,
  backfillRng,
} from '@/utils/game/galaxyArchiveBackfill'

/**
 * Ein Admin-Sprung überspringt Läufe, die es nie gab. Ohne Nachtrag bleibt
 * `completedGalaxies` leer — und damit nicht nur die Archivspalte, sondern auch
 * Voyages, deren einzige Quelle dieses Array ist.
 */
describe('galaxy archive backfill', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function jumpTo(target: number) {
    const galaxyStore = useGalaxyStore()
    const filled = galaxyStore.adminJumpToGalaxy(target)
    return { galaxyStore, filled }
  }

  it('trägt genau die übersprungenen Galaxien nach', () => {
    const { galaxyStore, filled } = jumpTo(10)

    expect(filled).toBe(9)
    expect(galaxyStore.currentGalaxy).toBe(10)
    expect(galaxyStore.completedGalaxies.map((r) => r.galaxy)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('ein Sprung auf Galaxie 1 trägt nichts nach', () => {
    const { galaxyStore, filled } = jumpTo(1)

    expect(filled).toBe(0)
    expect(galaxyStore.completedGalaxies).toEqual([])
  })

  it('jeder Lauf hat so viele gerettete Sterne, wie die Galaxie verlangt', () => {
    const { galaxyStore } = jumpTo(12)

    for (const rec of galaxyStore.completedGalaxies) {
      const rescued = rec.attemptResults.filter((r) => r === 'rescued').length
      expect(rescued).toBe(computeRequired(rec.galaxy))
      // Ein Lauf endet auf dem Stern, der die Galaxie abschliesst.
      expect(rec.attemptResults[rec.attemptResults.length - 1]).toBe('rescued')
      expect(rec.durationSeconds).toBeGreaterThan(0)
    }
  })

  it('Galaxie 1 verliert keinen Stern, spätere schon', () => {
    const { galaxyStore } = jumpTo(15)
    const failedOf = (g: number) =>
      galaxyStore.completedGalaxies
        .find((r) => r.galaxy === g)!
        .attemptResults.filter((r) => r === 'failed').length

    expect(failedOf(1)).toBe(0)
    const lateLosses = [10, 11, 12, 13, 14].reduce((sum, g) => sum + failedOf(g), 0)
    expect(lateLosses).toBeGreaterThan(0)
  })

  it('ist deterministisch aus der Galaxienummer', () => {
    const first = jumpTo(10).galaxyStore.completedGalaxies.map((r) => ({
      ...r,
      completedAt: 0,
    }))

    setActivePinia(createPinia())
    const second = jumpTo(10).galaxyStore.completedGalaxies.map((r) => ({
      ...r,
      completedAt: 0,
    }))

    expect(second).toEqual(first)
  })

  it('lässt einen echt gespielten Lauf unangetastet', () => {
    const galaxyStore = useGalaxyStore()
    const played = {
      galaxy: 3,
      mapSeed: 123456,
      themeIndex: 4,
      attemptResults: ['rescued', 'rescued', 'failed', 'rescued', 'rescued'] as const,
      durationSeconds: 999,
      completedAt: 42,
    }
    galaxyStore.completedGalaxies.push({ ...played, attemptResults: [...played.attemptResults] })

    galaxyStore.adminJumpToGalaxy(10)

    expect(galaxyStore.completedGalaxies.find((r) => r.galaxy === 3)).toEqual({
      ...played,
      attemptResults: [...played.attemptResults],
    })
    expect(galaxyStore.completedGalaxies).toHaveLength(9)
  })

  it('archiviert die laufende Galaxie unter ihrer eigenen Nummer', () => {
    const galaxyStore = useGalaxyStore()
    // Galaxie 3 abschliessen, dann von dort wegspringen.
    galaxyStore.currentGalaxy = 3
    galaxyStore.starsRequired = computeRequired(3)
    galaxyStore.starsRescued = galaxyStore.starsRequired
    galaxyStore.attemptResults = Array.from(
      { length: galaxyStore.starsRequired },
      () => 'rescued' as const,
    )
    galaxyStore.galaxyBossDefeated = true
    galaxyStore.mapSeed = 777

    galaxyStore.adminJumpToGalaxy(10)

    const live = galaxyStore.completedGalaxies.find((r) => r.galaxy === 3)!
    expect(live.mapSeed).toBe(777)
    // Der echte Lauf darf nicht als Galaxie 9 verbucht werden.
    expect(galaxyStore.completedGalaxies.find((r) => r.galaxy === 9)!.mapSeed).not.toBe(777)
    expect(galaxyStore.completedGalaxies).toHaveLength(9)
  })

  it('ein zweiter Sprung auf dasselbe Ziel legt nichts nach', () => {
    const galaxyStore = useGalaxyStore()
    galaxyStore.adminJumpToGalaxy(10)
    const before = JSON.stringify(galaxyStore.completedGalaxies)

    expect(galaxyStore.adminJumpToGalaxy(10)).toBe(0)
    expect(JSON.stringify(galaxyStore.completedGalaxies)).toBe(before)
  })

  it('die Lifetime-Zähler decken sich mit dem Archiv', () => {
    const { galaxyStore } = jumpTo(10)
    const attempts = galaxyStore.completedGalaxies.flatMap((r) => r.attemptResults)

    expect(galaxyStore.totalStarsRescued).toBe(attempts.filter((r) => r === 'rescued').length)
    expect(galaxyStore.totalStarsLost).toBe(attempts.filter((r) => r === 'failed').length)
    expect(galaxyStore.totalGalaxyBossesDefeated).toBe(9)
    expect(galaxyStore.totalBossEscortsDefeated).toBeGreaterThan(0)
  })

  it('die Abschlussdaten steigen mit der Galaxienummer', () => {
    const { galaxyStore } = jumpTo(10)
    const stamps = galaxyStore.completedGalaxies.map((r) => r.completedAt)

    for (let i = 1; i < stamps.length; i++) expect(stamps[i]).toBeGreaterThan(stamps[i - 1])
  })

  it('Galaxie 1 bleibt Blue Veil, keine zwei Farbwelten folgen aufeinander', () => {
    const { galaxyStore } = jumpTo(12)
    const themes = galaxyStore.completedGalaxies.map((r) => r.themeIndex)

    expect(themes[0]).toBe(0)
    for (let i = 1; i < themes.length; i++) expect(themes[i]).not.toBe(themes[i - 1])
    // Die laufende Galaxie schliesst die Kette ohne Wiederholung ab.
    expect(galaxyStore.currentThemeIndex).not.toBe(themes[themes.length - 1])
  })

  it('schaltet Voyages frei und liefert ein Ziel je befreiter Galaxie', () => {
    jumpTo(10)
    const chart = useExpeditionChartStore()

    expect(chart.isUnlocked).toBe(true)
    expect(chart.destinations).toHaveLength(9)
    expect(chart.maxFreedGalaxy).toBe(9)
    // Der Zielname kommt aus der Farbwelt des archivierten Laufs.
    expect(chart.destinations.every((d) => d.name.length > 0)).toBe(true)
  })

  it('der Generator ist rein und ohne Store prüfbar', () => {
    const record = buildBackfillRecord(7, computeRequired(7), 3, 1000)

    expect(record.galaxy).toBe(7)
    expect(record.themeIndex).toBe(3)
    expect(record.completedAt).toBe(1000)
    expect(record.attemptResults.filter((r) => r === 'rescued')).toHaveLength(computeRequired(7))
    expect(backfillFailCount(1, 3, backfillRng(1))).toBe(0)
    expect(backfillFailCount(30, 36, backfillRng(30))).toBeLessThanOrEqual(36)
  })

  it('trägt je Versuch ein Sternmanifest nach, index-gleich', () => {
    const record = buildBackfillRecord(7, computeRequired(7), 3, 1000)
    // Die Index-Gleichheit ist der Vertrag des Manifests — auch im Nachtrag.
    expect(record.starManifests).toHaveLength(record.attemptResults.length)
    for (const m of record.starManifests!) {
      expect(m.champion).toBeTruthy()
      expect(m.role).toBeTruthy()
      expect(m.worlds).toBeGreaterThanOrEqual(3)
      expect(m.cleared).toBeGreaterThanOrEqual(1)
      expect(m.cleared).toBeLessThanOrEqual(m.worlds)
      expect(m.chimes).toBeGreaterThan(0)
      expect(m.windowSec).toBe(CHAMPION_STAR_DURATION_MS / MS_PER_SECOND)
    }
  })

  it('ein verlorener Stern hat die Uhr voll und nicht alle Welten geräumt', () => {
    // Das ist keine gewürfelte Zahl, sondern die Definition: ein Stern geht
    // verloren, WEIL sein Fenster abläuft. Eine gerettete Uhr, die auch voll
    // liefe, wäre ein Widerspruch zum Balken, den die Karte daneben zeichnet.
    const record = buildBackfillRecord(20, computeRequired(20), 3, 1000)
    const pairs = record.attemptResults.map((r, i) => [r, record.starManifests![i]] as const)
    const lost = pairs.filter(([r]) => r === 'failed')
    expect(lost.length).toBeGreaterThan(0)
    for (const [, m] of lost) {
      expect(m.heldSec).toBe(m.windowSec)
      expect(m.cleared).toBeLessThan(m.worlds)
    }
    for (const [, m] of pairs.filter(([r]) => r === 'rescued')) {
      expect(m.heldSec).toBeLessThan(m.windowSec)
      expect(m.cleared).toBe(m.worlds)
    }
  })

  it('zieht innerhalb EINES Laufs keinen Champion doppelt', () => {
    const record = buildBackfillRecord(30, computeRequired(30), 3, 1000)
    const names = record.starManifests!.map((m) => m.champion)
    expect(new Set(names).size).toBe(names.length)
  })

  it('nennt nur Champions, die die Galaxie damals hergegeben hätte', () => {
    // Ein Tier-6-Name in Galaxie 1 fällt sofort als erfunden auf.
    const record = buildBackfillRecord(1, computeRequired(1), 0, 1000)
    const unlocked = unlockedChampionTierCount(1)
    for (const m of record.starManifests!) {
      expect(getChampionStarLevel(m.champion!)).toBeLessThanOrEqual(unlocked)
    }
  })
})
