import { describe, it, expect } from 'vitest'
import {
  buildBackfillUniverseRuns,
  gateRecordIndex,
} from '@/utils/game/universeRunBackfill'
import { buildFirmamentGates, buildFirmamentNodes } from '@/utils/ui/firmamentLayout'
import { universes } from '@/config/progression/universes'
import { UNIVERSE_RUN_HISTORY_LIMIT } from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { UniverseRunRecord } from '@/types'

const starsOf = (g: number) => Math.min(3 + (g - 1), 7)

/** Stempel wie beim Archiv-Nachtrag: aufsteigend mit Abstand, ältester zuerst. */
function rec(galaxy: number, rescued = 3, lost = 1): CompletedGalaxyRecord {
  return {
    galaxy,
    mapSeed: 1000 + galaxy,
    themeIndex: galaxy % 20,
    attemptResults: [
      ...Array(rescued).fill('rescued' as const),
      ...Array(lost).fill('failed' as const),
    ],
    landfallResults: [],
    durationSeconds: 600,
    completedAt: galaxy * 1_000_000,
  }
}

const archive = (n: number) => Array.from({ length: n }, (_, i) => rec(i + 1))

function nodesOf(records: CompletedGalaxyRecord[], currentGalaxy: number) {
  return buildFirmamentNodes({
    completed: records,
    currentGalaxy,
    currentRescued: 0,
    currentLost: 0,
    currentLandfalls: 0,
    currentThemeIndex: 3,
    starsOf,
  })
}

describe('universeRunBackfill', () => {
  /*
   * Der Test, an dem der ganze Nachtrag hängt: `gateRecordIndex` und
   * `buildFirmamentGates` sind zwei Rechnungen für dieselbe Marke. Laufen sie
   * auseinander, sitzt ein Tor auf dem falschen Knoten — und nichts daran sähe
   * im Code falsch aus.
   */
  it('gibt jedem nachgetragenen Lauf ein Tor auf der Bahn', () => {
    const records = archive(50)
    const runs = buildBackfillUniverseRuns(records, 10, [])
    const gates = buildFirmamentGates(nodesOf(records, 50), runs)

    expect(runs).toHaveLength(universes.length - 1)
    expect(gates).toHaveLength(runs.length)
    expect(gates.map((g) => g.universe)).toEqual(runs.map((r) => r.universe))
    // Kein Tor teilt sich einen Platz — sonst verwirft buildFirmamentGates still.
    expect(new Set(gates.map((g) => g.afterIndex)).size).toBe(gates.length)
  })

  it('lässt das laufende Universum ohne Lauf — ein Tor ist ein Aufbruch', () => {
    const runs = buildBackfillUniverseRuns(archive(30), 4, [])
    expect(runs.some((r) => r.universe === 4)).toBe(false)
    expect(new Set(runs.map((r) => r.universe)).size).toBe(runs.length)
  })

  it('setzt Universum 1 auf das früheste Tor — dort beginnt jedes Spiel', () => {
    const runs = buildBackfillUniverseRuns(archive(50), 10, [])
    expect(runs[0].universe).toBe(1)
    expect(Math.min(...runs.map((r) => r.completedAt))).toBe(runs[0].completedAt)
  })

  /* Die tragende Wahl: hinter dem letzten Tor liegt nur die laufende Galaxie,
     deshalb darf die Basislinie des laufenden Universums bei null anfangen. */
  it('legt das letzte Tor auf den letzten Datensatz', () => {
    const records = archive(50)
    const runs = buildBackfillUniverseRuns(records, 10, [])
    const last = runs[runs.length - 1]
    expect(gateRecordIndex(records, last.completedAt)).toBe(records.length - 1)
  })

  it('verteilt die Galaxien lückenlos und zählt gerettete Sterne wie das Archiv', () => {
    const records = archive(50)
    const runs = buildBackfillUniverseRuns(records, 10, [])
    const rescued = records.reduce(
      (sum, r) => sum + r.attemptResults.filter((a) => a === 'rescued').length,
      0,
    )

    expect(runs.reduce((sum, r) => sum + r.galaxiesFreed, 0)).toBe(records.length)
    expect(runs.reduce((sum, r) => sum + r.starsRescued, 0)).toBe(rescued)
    expect(runs.every((r) => r.durationSeconds > 0 && r.chimes > 0)).toBe(true)
  })

  it('nimmt einem bestehenden Lauf weder Platz noch Universum', () => {
    const records = archive(50)
    const mine: UniverseRunRecord = {
      universe: 7,
      durationSeconds: 4242,
      starsRescued: 9,
      galaxiesFreed: 2,
      chimes: 999,
      completedAt: records[20].completedAt + 1,
    }
    const runs = buildBackfillUniverseRuns(records, 10, [mine])
    const all = [mine, ...runs].sort((a, b) => a.completedAt - b.completedAt)
    const gates = buildFirmamentGates(nodesOf(records, 50), all)

    expect(runs.some((r) => r.universe === 7)).toBe(false)
    expect(runs.some((r) => gateRecordIndex(records, r.completedAt) === 20)).toBe(false)
    expect(gates).toHaveLength(all.length)
    expect(mine.chimes).toBe(999)
  })

  it('kappt den Nachtrag am Archivdeckel, nie den Bestand', () => {
    const records = archive(50)
    const existing = Array.from({ length: UNIVERSE_RUN_HISTORY_LIMIT }, (_, i) => ({
      universe: 1,
      durationSeconds: 100,
      starsRescued: 1,
      galaxiesFreed: 1,
      chimes: 100,
      completedAt: records[i].completedAt + 1,
    }))
    expect(buildBackfillUniverseRuns(records, 10, existing)).toEqual([])
  })

  it('ist deterministisch und idempotent', () => {
    const records = archive(50)
    const first = buildBackfillUniverseRuns(records, 10, [])
    expect(buildBackfillUniverseRuns(records, 10, [])).toEqual(first)
    expect(buildBackfillUniverseRuns(records, 10, first)).toEqual([])
  })

  it('trägt ohne Archiv nichts nach, statt Tore zu erfinden', () => {
    expect(buildBackfillUniverseRuns([], 10, [])).toEqual([])
    const single = [rec(1)]
    const runs = buildBackfillUniverseRuns(single, 10, [])
    expect(runs).toHaveLength(1)
    expect(runs[0].galaxiesFreed).toBe(1)
  })
})
