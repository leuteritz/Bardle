import { describe, it, expect } from 'vitest'
import {
  assignRecordUniverses,
  universeOfCompletion,
} from '@/utils/game/galaxyUniverseBackfill'
import { gateRecordIndex } from '@/utils/game/universeRunBackfill'
import { universes } from '@/config/progression/universes'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { UniverseRunRecord } from '@/types'

function rec(galaxy: number, completedAt: number): CompletedGalaxyRecord {
  return {
    galaxy,
    mapSeed: 1000 + galaxy,
    themeIndex: galaxy % 20,
    attemptResults: ['rescued', 'rescued', 'failed'],
    landfallResults: [],
    durationSeconds: 600,
    completedAt,
  }
}

function run(universe: number, completedAt: number): UniverseRunRecord {
  return {
    universe,
    durationSeconds: 1200,
    starsRescued: 12,
    galaxiesFreed: 3,
    chimes: 100_000,
    completedAt,
  }
}

/* Drei Galaxien je Universum, Läufe dazwischen:
   G1 G2 G3 | Lauf(U1) | G4 G5 G6 | Lauf(U2) | G7 G8  ← laufendes U5 */
const RECORDS = [
  rec(1, 100),
  rec(2, 200),
  rec(3, 300),
  rec(4, 500),
  rec(5, 600),
  rec(6, 700),
  rec(7, 900),
  rec(8, 1000),
]
const RUNS = [run(1, 400), run(2, 800)]
const CURRENT = 5

describe('universeOfCompletion', () => {
  it('gibt einer Galaxie das Universum des Laufs, der sie beendete', () => {
    expect(universeOfCompletion(RUNS, 100, CURRENT, 2)).toBe(1)
    expect(universeOfCompletion(RUNS, 300, CURRENT, 2)).toBe(1)
    expect(universeOfCompletion(RUNS, 500, CURRENT, 2)).toBe(2)
    expect(universeOfCompletion(RUNS, 700, CURRENT, 2)).toBe(2)
  })

  it('zählt eine Galaxie AUF dem Stempel des Laufs noch zu ihm', () => {
    expect(universeOfCompletion(RUNS, 400, CURRENT, 2)).toBe(1)
    expect(universeOfCompletion(RUNS, 800, CURRENT, 2)).toBe(2)
  })

  it('gibt allem hinter dem letzten Lauf das laufende Universum', () => {
    expect(universeOfCompletion(RUNS, 900, CURRENT, 2)).toBe(CURRENT)
    expect(universeOfCompletion(RUNS, 999_999, CURRENT, 2)).toBe(CURRENT)
  })

  it('legt bei leerem Archiv alles ins laufende Universum', () => {
    expect(universeOfCompletion([], 100, CURRENT, 0)).toBe(CURRENT)
  })

  /* Die Ausnahme, wegen der `totalPrestiges` überhaupt hereingereicht wird:
     hat der Deckel Läufe herausgeschoben, zeugt vom Anfang der Reise keiner
     mehr — dann ist `runs[0].universe` für alles davor eine Lüge. */
  it('schiebt bei gekappter Historie den Rest an den Anfang des Katalogs', () => {
    const late = [run(7, 400), run(8, 800)]
    expect(universeOfCompletion(late, 100, CURRENT, 2)).toBe(7)
    expect(universeOfCompletion(late, 100, CURRENT, 9)).toBe(universes[0].id)
    // Nur der älteste Abschnitt ist betroffen; alles danach bleibt zugeordnet.
    expect(universeOfCompletion(late, 500, CURRENT, 9)).toBe(8)
  })

  it('ordnet unabhängig von der Eingabereihenfolge zu', () => {
    const shuffled = [RUNS[1], RUNS[0]]
    expect(universeOfCompletion(shuffled, 300, CURRENT, 2)).toBe(1)
    expect(universeOfCompletion(shuffled, 600, CURRENT, 2)).toBe(2)
  })
})

describe('assignRecordUniverses', () => {
  it('trägt jedem Datensatz sein Universum nach', () => {
    const out = assignRecordUniverses(RECORDS, RUNS, CURRENT, 2)
    expect(out.map((r) => r.universe)).toEqual([1, 1, 1, 2, 2, 2, CURRENT, CURRENT])
  })

  it('lässt alles andere am Datensatz unangetastet', () => {
    const out = assignRecordUniverses(RECORDS, RUNS, CURRENT, 2)
    for (let i = 0; i < RECORDS.length; i++) {
      expect(out[i]).toEqual({ ...RECORDS[i], universe: out[i].universe })
    }
  })

  it('ist idempotent — ein gesetztes Feld bleibt stehen', () => {
    const once = assignRecordUniverses(RECORDS, RUNS, CURRENT, 2)
    const twice = assignRecordUniverses(once, RUNS, CURRENT, 2)
    expect(twice).toEqual(once)
  })

  it('fasst einen von Hand gesetzten Stempel nicht an', () => {
    const seeded = [{ ...RECORDS[0], universe: 9 }, ...RECORDS.slice(1)]
    expect(assignRecordUniverses(seeded, RUNS, CURRENT, 2)[0].universe).toBe(9)
  })

  it('überschreibt nur mit `overwrite` — der Weg des Admin-Nachtrags', () => {
    const seeded = [{ ...RECORDS[0], universe: 9 }, ...RECORDS.slice(1)]
    const out = assignRecordUniverses(seeded, RUNS, CURRENT, 2, { overwrite: true })
    expect(out[0].universe).toBe(1)
  })

  it('trägt bei leerem Bestand nichts nach und wirft nicht', () => {
    expect(assignRecordUniverses([], RUNS, CURRENT, 2)).toEqual([])
  })

  /*
   * Die Kreuzprobe. `gateRecordIndex` sucht die Gegenrichtung — den letzten
   * Datensatz VOR einem Lauf. Beide müssen dieselbe Kante meinen: der Datensatz,
   * den ein Lauf dort findet, muss auch sein Universum tragen, und der direkt
   * dahinter darf es nicht mehr. Laufen sie auseinander, säße ein Tor hinter
   * einer Galaxie, die auf einer anderen Bahn liegt.
   */
  it('meint dieselbe Kante wie `gateRecordIndex`', () => {
    const out = assignRecordUniverses(RECORDS, RUNS, CURRENT, 2)
    for (const r of RUNS) {
      const idx = gateRecordIndex(RECORDS, r.completedAt)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(out[idx].universe).toBe(r.universe)
      expect(out[idx + 1]?.universe).not.toBe(r.universe)
    }
  })
})
