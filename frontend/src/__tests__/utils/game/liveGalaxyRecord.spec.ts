import { describe, it, expect } from 'vitest'
import { liveGalaxyRecord } from '@/utils/game/liveGalaxyRecord'
import type { LiveGalaxyState } from '@/utils/game/liveGalaxyRecord'

/**
 * Der einzige synthetische Galaxie-Datensatz im Spiel.
 *
 * Er muss dieselbe Feldliste tragen wie das, was `maybeRecordCompletion()` beim
 * Abschluss ins Archiv legt — sonst zeigte die Live-Bühne eine Galaxie anders
 * als der Atlas dieselbe Galaxie nach ihrer Befreiung.
 */
function live(over: Partial<LiveGalaxyState> = {}): LiveGalaxyState {
  return {
    galaxy: 3,
    mapSeed: 12345,
    themeIndex: 4,
    universe: 2,
    attemptResults: ['rescued', 'failed'],
    landfallResults: [{ kind: 'derelict', cleared: true }],
    incidentResults: [{ kind: 'void', rank: 1 } as never],
    starManifests: [{ champion: 'Bard', role: 'support' } as never],
    ...over,
  }
}

describe('liveGalaxyRecord', () => {
  it('trägt genau die Felder des Archiv-Datensatzes', () => {
    expect(Object.keys(liveGalaxyRecord(live())).sort()).toEqual(
      [
        'attemptResults',
        'completedAt',
        'durationSeconds',
        'galaxy',
        'incidentResults',
        'landfallResults',
        'mapSeed',
        'starManifests',
        'themeIndex',
        'universe',
      ].sort(),
    )
  })

  it('übernimmt Kennung, Seed, Thema und Universum unverändert', () => {
    const r = liveGalaxyRecord(live())
    expect(r.galaxy).toBe(3)
    expect(r.mapSeed).toBe(12345)
    expect(r.themeIndex).toBe(4)
    expect(r.universe).toBe(2)
  })

  it('übernimmt Sterne, Orte, Ereignisse und Manifeste inhaltlich', () => {
    const s = live()
    const r = liveGalaxyRecord(s)
    expect(r.attemptResults).toEqual(s.attemptResults)
    expect(r.landfallResults).toEqual(s.landfallResults)
    expect(r.incidentResults).toEqual(s.incidentResults)
    expect(r.starManifests).toEqual(s.starManifests)
  })

  /** Kopien, keine Verweise: die Bühne darf den Store nicht anfassen können. */
  it('kopiert die Listen statt sie zu verweisen', () => {
    const s = live()
    const r = liveGalaxyRecord(s)
    expect(r.attemptResults).not.toBe(s.attemptResults)
    expect(r.landfallResults).not.toBe(s.landfallResults)
    expect(r.incidentResults[0]).not.toBe(s.incidentResults[0])
    expect(r.starManifests?.[0]).not.toBe(s.starManifests[0])
  })

  /** Der Lauf ist nicht fertig — beide Felder trägt nur die Form. */
  it('lässt Dauer und Abschlussstempel auf 0', () => {
    const r = liveGalaxyRecord(live())
    expect(r.durationSeconds).toBe(0)
    expect(r.completedAt).toBe(0)
  })

  it('kommt mit einem frischen Lauf ohne jeden Eintrag aus', () => {
    const r = liveGalaxyRecord(
      live({ attemptResults: [], landfallResults: [], incidentResults: [], starManifests: [] }),
    )
    expect(r.attemptResults).toEqual([])
    expect(r.starManifests).toEqual([])
  })
})
