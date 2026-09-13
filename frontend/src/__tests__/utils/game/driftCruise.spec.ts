import { describe, it, expect, beforeEach } from 'vitest'
import { cruiseState, resetCruiseTracks } from '@/utils/game/driftCruise'
import { CRUISE_SPEED, CRUISE_SEG_MAX_MS } from '@/config/constants'

const FROM = { x: 0.2, y: 0.8 }
const T0 = 1_700_000_000_000

describe('driftCruise', () => {
  beforeEach(() => resetCruiseTracks())

  it('beginnt am Anker und ist deterministisch', () => {
    const a = cruiseState(4242, T0, FROM, T0)
    expect(a.pos).toEqual(FROM)
    resetCruiseTracks()
    const b = cruiseState(4242, T0, FROM, T0 + 37_000)
    resetCruiseTracks()
    const c = cruiseState(4242, T0, FROM, T0 + 37_000)
    expect(b).toEqual(c)
    expect(cruiseState(4243, T0, FROM, T0 + 37_000).pos).not.toEqual(b.pos)
  })

  it('fliegt mit konstantem Tempo, auch über Segmentgrenzen hinweg', () => {
    const dt = 50
    for (let t = 0; t < 120_000; t += dt) {
      const a = cruiseState(7, T0, FROM, T0 + t).pos
      const b = cruiseState(7, T0, FROM, T0 + t + dt).pos
      const step = Math.hypot(b.x - a.x, b.y - a.y)
      // Die harte Klemme am Rand darf den Schritt nur verkürzen, nie verlängern.
      expect(step).toBeLessThanOrEqual(CRUISE_SPEED * (dt / 1000) * 1.02 + 1e-9)
    }
  })

  it('bleibt eine halbe Stunde lang im Rahmen der Karte und kehrt zur Mitte zurück', () => {
    let far = 0
    for (let t = 0; t < 30 * 60_000; t += 400) {
      const { pos } = cruiseState(99, T0, FROM, T0 + t)
      expect(pos.x).toBeGreaterThanOrEqual(0.06)
      expect(pos.x).toBeLessThanOrEqual(0.94)
      expect(pos.y).toBeGreaterThanOrEqual(0.06)
      expect(pos.y).toBeLessThanOrEqual(0.94)
      far = Math.max(far, Math.hypot(pos.x - 0.5, pos.y - 0.5))
    }
    expect(far).toBeLessThan(0.5)
  })

  it('hält den Kurs auf einem geraden Segment und dreht auf einem Bogen', () => {
    let straightSeen = false
    let turnSeen = false
    for (let t = 0; t < 10 * CRUISE_SEG_MAX_MS && !(straightSeen && turnSeen); t += 250) {
      const h0 = cruiseState(5, T0, FROM, T0 + t).heading
      const h1 = cruiseState(5, T0, FROM, T0 + t + 250).heading
      const d = Math.abs(Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0)))
      if (d < 1e-9) straightSeen = true
      else if (d > 0.01) turnSeen = true
    }
    expect(straightSeen).toBe(true)
    expect(turnSeen).toBe(true)
  })

  it('steht vor dem Anker still', () => {
    expect(cruiseState(1, T0, FROM, T0 - 5_000).pos).toEqual(FROM)
  })
})
