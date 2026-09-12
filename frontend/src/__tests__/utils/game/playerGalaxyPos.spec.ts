import { describe, it, expect } from 'vitest'
import { PLAYER_DRIFT_AMP } from '@/config/constants'
import {
  playerGalaxyPos,
  playerLeg,
  playerTravelProgress,
  driftOffset,
  type PlayerFlightState,
} from '@/utils/game/playerGalaxyPos'

/**
 * Die Rechnung hinter Bards Ort in der laufenden Galaxie.
 *
 * Sie stand als Closure in `MiniMapCanvas` und hat seit der Live-Bühne des
 * Voyages-Reiters zwei Leser — genau deshalb ist sie hier gebunden: ein
 * zweites Bild derselben Reise darf nicht anders rechnen.
 */
const SPAWN = { x: 0.1, y: 0.1 }
const DOTS = [
  { x: 0.3, y: 0.3 },
  { x: 0.7, y: 0.5 },
]

function state(over: Partial<PlayerFlightState> = {}): PlayerFlightState {
  return {
    bossPhaseActive: false,
    isComplete: false,
    isRescueRotating: false,
    travelingToGalaxyBoss: false,
    championTravelState: 'idle',
    championTravelStartTime: 0,
    championTravelDurationMs: 0,
    ...over,
  }
}

describe('playerLeg', () => {
  it('startet am Spawn, solange kein Stern besucht ist', () => {
    expect(playerLeg(SPAWN, DOTS, 0, state()).from).toEqual(SPAWN)
  })

  it('startet am zuletzt besuchten Stern', () => {
    expect(playerLeg(SPAWN, DOTS, 1, state()).from).toEqual(DOTS[0])
  })

  it('zielt auf den nächsten unbesuchten Stern', () => {
    expect(playerLeg(SPAWN, DOTS, 1, state()).target).toEqual(DOTS[1])
  })

  it('zielt auf den Kern, wenn der Bossstern dran ist', () => {
    expect(playerLeg(SPAWN, DOTS, 1, state({ travelingToGalaxyBoss: true })).target).toEqual({
      x: 0.5,
      y: 0.5,
    })
  })

  it('kennt kein Ziel, während die Rettung dreht', () => {
    expect(playerLeg(SPAWN, DOTS, 1, state({ isRescueRotating: true })).target).toBeNull()
  })

  it('kennt kein Ziel, wenn alle Sterne besucht sind', () => {
    expect(playerLeg(SPAWN, DOTS, 2, state()).target).toBeNull()
  })
})

describe('playerTravelProgress', () => {
  it('ist 0 ausserhalb des Flugs', () => {
    expect(playerTravelProgress(state({ championTravelState: 'idle' }), 5_000)).toBe(0)
  })

  it('ist 0 ohne Startzeit oder Dauer', () => {
    const s = state({ championTravelState: 'traveling', championTravelStartTime: 0 })
    expect(playerTravelProgress(s, 5_000)).toBe(0)
  })

  it('läuft linear und klemmt bei 1', () => {
    const s = state({
      championTravelState: 'traveling',
      championTravelStartTime: 1_000,
      championTravelDurationMs: 4_000,
    })
    expect(playerTravelProgress(s, 3_000)).toBeCloseTo(0.5, 6)
    expect(playerTravelProgress(s, 99_000)).toBe(1)
  })
})

describe('playerGalaxyPos', () => {
  /** Startzeit 0 heisst "noch nicht abgeflogen" — nicht "vor langer Zeit". */
  it('rührt sich nicht ohne gesetzte Startzeit', () => {
    const s = state({ championTravelState: 'traveling', championTravelDurationMs: 1_000 })
    expect(playerGalaxyPos(SPAWN, DOTS, 1, s, 500)).toEqual(DOTS[0])
  })

  it('dockt im Kern, sobald der Bossstern steht', () => {
    for (const over of [{ bossPhaseActive: true }, { isComplete: true }]) {
      expect(playerGalaxyPos(SPAWN, DOTS, 1, state(over), 0)).toEqual({ x: 0.5, y: 0.5 })
    }
  })

  it('interpoliert zwischen den Enden der Etappe', () => {
    const s = state({
      championTravelState: 'traveling',
      championTravelStartTime: 1_000,
      championTravelDurationMs: 1_000,
    })
    const p = playerGalaxyPos(SPAWN, DOTS, 1, s, 1_500)
    expect(p.x).toBeCloseTo((DOTS[0].x + DOTS[1].x) / 2, 6)
    expect(p.y).toBeCloseTo((DOTS[0].y + DOTS[1].y) / 2, 6)
  })

  it('steht am Ziel, sobald der Champion dort ist', () => {
    for (const st of ['champion_available', 'champion_spawned']) {
      const p = playerGalaxyPos(SPAWN, DOTS, 1, state({ championTravelState: st }), 0)
      expect(p).toEqual(DOTS[1])
    }
  })

  it('bleibt am Start, solange nichts fliegt', () => {
    expect(playerGalaxyPos(SPAWN, DOTS, 1, state(), 0)).toEqual(DOTS[0])
  })

  it('bleibt am Start, während die Rettung dreht', () => {
    const s = state({ isRescueRotating: true, championTravelState: 'traveling' })
    expect(playerGalaxyPos(SPAWN, DOTS, 1, s, 500)).toEqual(DOTS[0])
  })

  /** Nie fortgeschrieben: derselbe Zeitpunkt gibt immer denselben Ort. */
  it('hängt allein an der übergebenen Zeit', () => {
    const s = state({
      championTravelState: 'traveling',
      championTravelStartTime: 1_000,
      championTravelDurationMs: 1_000,
    })
    const a = playerGalaxyPos(SPAWN, DOTS, 1, s, 1_300)
    const b = playerGalaxyPos(SPAWN, DOTS, 1, s, 1_900)
    expect(playerGalaxyPos(SPAWN, DOTS, 1, s, 1_300)).toEqual(a)
    expect(b.x).toBeGreaterThan(a.x)
  })
})

describe('Treiben ohne Kurs', () => {
  it('bleibt ohne das Flag am Ort — die alten Leser merken nichts', () => {
    expect(playerGalaxyPos(SPAWN, DOTS, 0, state(), 5_000)).toEqual(SPAWN)
  })

  it('wandert um den Ort, innerhalb der Amplitude, geklemmt', () => {
    const s = state({ pendingRoleSelection: true, mapSeed: 4242 })
    const pts = [0, 700, 2_100, 4_800, 9_900].map((t) => playerGalaxyPos(SPAWN, DOTS, 0, s, t))
    for (const p of pts) {
      expect(Math.abs(p.x - SPAWN.x)).toBeLessThanOrEqual(PLAYER_DRIFT_AMP + 1e-9)
      expect(Math.abs(p.y - SPAWN.y)).toBeLessThanOrEqual(PLAYER_DRIFT_AMP + 1e-9)
      expect(p.x).toBeGreaterThanOrEqual(0.06)
      expect(p.y).toBeLessThanOrEqual(0.94)
    }
    expect(new Set(pts.map((p) => p.x.toFixed(4))).size).toBeGreaterThan(1)
  })

  it('ist je Zeitpunkt und Seed deterministisch, je Seed verschieden', () => {
    expect(driftOffset(7, 1234)).toEqual(driftOffset(7, 1234))
    expect(driftOffset(7, 1234)).not.toEqual(driftOffset(8, 1234))
  })

  it('weicht der Rettungsrotation und dem Kern', () => {
    const s = state({ pendingRoleSelection: true, mapSeed: 1, isRescueRotating: true })
    expect(playerGalaxyPos(SPAWN, DOTS, 0, s, 3_000)).toEqual(SPAWN)
    const c = state({ pendingRoleSelection: true, mapSeed: 1, bossPhaseActive: true })
    expect(playerGalaxyPos(SPAWN, DOTS, 0, c, 3_000)).toEqual({ x: 0.5, y: 0.5 })
  })
})
