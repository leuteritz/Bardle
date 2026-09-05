import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createJoltState,
  joltAtRest,
  kickJolt,
  resetJolt,
  stepJolt,
} from '@/utils/orbit/flightJolt'
import { JOLT_FOCUS_FRAC, JOLT_REST_EPS, JOLT_UNIT_MAX } from '@/config/constants'

afterEach(() => vi.restoreAllMocks())

function run(
  s: ReturnType<typeof createJoltState>,
  seconds: number,
  dt: number,
  onFrame?: (o: ReturnType<typeof stepJolt>, t: number) => void,
) {
  const n = Math.round(seconds / dt)
  for (let i = 0; i < n; i++) onFrame?.(stepJolt(s, dt), (i + 1) * dt)
}

describe('flightJolt — Ruhe', () => {
  it('in Ruhe kein Trig und dasselbe Ausgabeobjekt', () => {
    const s = createJoltState()
    const cos = vi.spyOn(Math, 'cos')
    const a = stepJolt(s, 1 / 60)
    const b = stepJolt(s, 1 / 60)
    expect(a).toBe(b)
    expect(a.atRest).toBe(true)
    expect(cos).not.toHaveBeenCalled()
  })

  it('dt = 0 verändert nichts', () => {
    const s = createJoltState()
    kickJolt(s, 1, 0, 1, 1)
    run(s, 0.2, 1 / 60)
    const before = { ...stepJolt(s, 0) }
    const after = { ...stepJolt(s, 0) }
    expect(after).toEqual(before)
  })
})

describe('flightJolt — Feder', () => {
  it('ein Stoss der Stärke 1 erreicht etwa eine Einheit und kommt binnen 2 s zur Ruhe', () => {
    const s = createJoltState()
    kickJolt(s, -1, 0, 1, 0)
    let peak = 0
    run(s, 2, 1 / 60, (o) => {
      peak = Math.max(peak, Math.abs(o.bodyX))
    })
    expect(peak).toBeGreaterThanOrEqual(0.9)
    expect(peak).toBeLessThanOrEqual(1.1)
    expect(joltAtRest(s)).toBe(true)
    expect(stepJolt(s, 1 / 60).atRest).toBe(true)
  })

  it('der Angreifer rechts stösst nach links, Fokus und Körper gemeinsam', () => {
    const s = createJoltState()
    // Stossrichtung = weg vom Angreifer bei θ = 0 → (−1, 0)
    kickJolt(s, -1, 0, 1, 0)
    const o = stepJolt(s, 1 / 60)
    expect(o.focusX).toBeLessThan(0)
    expect(o.bodyX).toBeLessThan(0)
    expect(o.focusX).toBeCloseTo(o.bodyX * JOLT_FOCUS_FRAC, 9)
  })

  it('fünf gestapelte Stösse bleiben unter dem Deckel', () => {
    const s = createJoltState()
    let peak = 0
    for (let k = 0; k < 5; k++) {
      kickJolt(s, 0, 1, 1, 1)
      run(s, 0.05, 1 / 60, (o) => {
        peak = Math.max(peak, Math.abs(o.bodyY))
      })
    }
    run(s, 1, 1 / 60, (o) => {
      peak = Math.max(peak, Math.abs(o.bodyY))
    })
    expect(peak).toBeLessThanOrEqual(JOLT_UNIT_MAX + 1e-9)
  })

  it('ist framerate-unabhängig — 30, 60 und 144 Hz stimmen überein', () => {
    const sample = (hz: number) => {
      const s = createJoltState()
      kickJolt(s, 0.6, -0.8, 1, 0)
      const dt = 1 / hz
      const rows: number[] = []
      // 0,5 s = 15 · 30-Hz-Frames = 30 · 60-Hz-Frames; 144 Hz hat kein gemeinsames Raster — dort per Restschritt.
      let t = 0
      while (t < 0.5 - 1e-9) {
        const step = Math.min(dt, 0.5 - t)
        stepJolt(s, step)
        t += step
      }
      rows.push(s.x, s.y, s.vx, s.vy)
      return rows
    }
    const a = sample(30)
    const b = sample(60)
    const c = sample(144)
    for (let i = 0; i < 4; i++) {
      expect(Math.abs(a[i] - b[i])).toBeLessThan(1e-9)
      expect(Math.abs(a[i] - c[i])).toBeLessThan(1e-9)
    }
  })

  it('ist deterministisch — zwei Zustände, gleiche Stösse, gleiche Spur', () => {
    const trace = () => {
      const s = createJoltState()
      const rows: number[] = []
      kickJolt(s, 1, 0.2, 0.7, 0.5)
      run(s, 0.4, 1 / 60, (o) => rows.push(o.focusX, o.tremorX, o.roll))
      kickJolt(s, -0.3, 1, 1, 1)
      run(s, 0.4, 1 / 60, (o) => rows.push(o.focusY, o.tremorY, o.roll))
      return rows.join(',')
    }
    expect(trace()).toBe(trace())
  })
})

describe('flightJolt — Beben', () => {
  it('die Hülle fällt monoton und der Stoss ohne Beben bebt nicht', () => {
    const s = createJoltState()
    kickJolt(s, 1, 0, 0, 1)
    let prev = Infinity
    run(s, 1.6, 1 / 60, () => {
      expect(s.env).toBeLessThanOrEqual(prev + 1e-12)
      prev = s.env
    })
    expect(s.env).toBeLessThan(JOLT_REST_EPS)
    const quiet = createJoltState()
    kickJolt(quiet, 1, 0, 1, 0)
    const o = stepJolt(quiet, 1 / 60)
    expect(Math.abs(o.tremorX)).toBe(0)
    expect(Math.abs(o.tremorY)).toBe(0)
  })

  it('resetJolt stellt Ruhe her, behält aber den Stosszähler', () => {
    const s = createJoltState()
    kickJolt(s, 1, 0, 1, 1)
    kickJolt(s, 0, 1, 1, 1)
    const out = s.out
    resetJolt(s)
    expect(joltAtRest(s)).toBe(true)
    expect(s.kicks).toBe(2)
    // Der Helm hält die Referenz auf `out` — ein neues Objekt wäre für ihn tot.
    expect(s.out).toBe(out)
    expect(out.atRest).toBe(true)
    kickJolt(s, 1, 0, 1, 0)
    expect(stepJolt(s, 1 / 60)).toBe(out)
  })
})
