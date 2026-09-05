import { describe, it, expect } from 'vitest'
import {
  createHelmState,
  requestEvade,
  resetHelm,
  stepHelm,
  type HelmInputs,
  type HelmOutput,
} from '@/utils/orbit/flightHelm'
import { createJoltState, kickJolt, stepJolt } from '@/utils/orbit/flightJolt'
import {
  HELM_EASE_OUT_SEC,
  HELM_EVADE_COOLDOWN_SEC,
  HELM_EVADE_THROTTLE,
  HELM_FOCUS_MAX_FRAC,
  HELM_ROLL_MAX_DEG,
  HELM_SLIP_MAX_PX_S,
} from '@/config/constants'

const EDGE = 950
const DEG = Math.PI / 180

/** EIN Strom je Lauf — ein LCG je Aufruf kollabiert. */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function inputs(over: Partial<HelmInputs> = {}): HelmInputs {
  return {
    dt: 1 / 60,
    active: true,
    traveling: false,
    minEdge: EDGE,
    baseFocusX: 0,
    baseFocusY: 0,
    rand: seeded(11),
    jolt: null,
    ...over,
  }
}

function run(seconds: number, inp: HelmInputs, onFrame?: (o: HelmOutput, t: number) => void) {
  const state = createHelmState()
  const frames = Math.round(seconds / inp.dt)
  for (let i = 0; i < frames; i++) {
    const o = stepHelm(state, inp)
    onFrame?.(o, i * inp.dt)
  }
  return state
}

describe('Helm — Klemmen', () => {
  it('Fokus, Rolle, Slip und Schub bleiben zehn Minuten lang in den Klemmen', () => {
    const inp = inputs({ baseFocusX: 0.03 * EDGE, baseFocusY: -0.03 * EDGE })
    run(600, inp, (o) => {
      expect(Math.hypot(o.focusX, o.focusY)).toBeLessThanOrEqual(HELM_FOCUS_MAX_FRAC * EDGE + 1e-6)
      expect(Math.abs(o.roll)).toBeLessThanOrEqual(HELM_ROLL_MAX_DEG * DEG + 1e-9)
      expect(Math.hypot(o.slipX, o.slipY)).toBeLessThanOrEqual(HELM_SLIP_MAX_PX_S + 1e-6)
      expect(o.throttle).toBeGreaterThanOrEqual(1 - 1e-9)
      expect(o.throttle).toBeLessThanOrEqual(HELM_EVADE_THROTTLE + 1e-9)
    })
  })

  it('stepHelm gibt jeden Frame dasselbe Objekt zurück', () => {
    const state = createHelmState()
    const inp = inputs()
    const a = stepHelm(state, inp)
    const b = stepHelm(state, inp)
    expect(a).toBe(b)
  })
})

describe('Helm — Ausweichen', () => {
  it('der Fokus läuft weg vom Hindernis, monoton und ohne Überschwingen', () => {
    const state = createHelmState()
    const inp = inputs({ rand: () => 0.5 })
    const away = Math.PI / 4
    expect(requestEvade(state, away, 1)).toBe(true)
    let prev = 0
    let peak = 0
    for (let i = 0; i < 60 * 3; i++) {
      const o = stepHelm(state, inp)
      const along = o.focusX * Math.cos(away) + o.focusY * Math.sin(away)
      expect(along).toBeLessThanOrEqual(1e-9)
      const mag = Math.hypot(o.focusX, o.focusY)
      expect(mag).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = mag
      peak = Math.max(peak, mag)
    }
    expect(peak).toBeLessThanOrEqual(HELM_FOCUS_MAX_FRAC * EDGE + 1e-6)
    expect(peak).toBeGreaterThan(0.05 * EDGE)
  })

  it('die Rolle kippt gegen die Fokusrichtung (in die Kurve)', () => {
    const state = createHelmState()
    const inp = inputs({ rand: () => 0.5 })
    requestEvade(state, 0, 1) // Hindernis rechts → Fokus nach links (x < 0)
    let o = stepHelm(state, inp)
    for (let i = 0; i < 120; i++) o = stepHelm(state, inp)
    expect(o.focusX).toBeLessThan(0)
    expect(Math.sign(o.roll)).toBe(-Math.sign(o.focusX))
  })

  it('im Cooldown wird die zweite Bitte abgelehnt', () => {
    const state = createHelmState()
    const inp = inputs({ rand: () => 0.5 })
    expect(requestEvade(state, 0, 1)).toBe(true)
    for (let i = 0; i < 60 * 5; i++) stepHelm(state, inp)
    expect(requestEvade(state, Math.PI, 1)).toBe(false)
    for (let i = 0; i < 60 * HELM_EVADE_COOLDOWN_SEC; i++) stepHelm(state, inp)
    expect(requestEvade(state, Math.PI, 1)).toBe(true)
  })

  it('der Schub liegt während des Ausweichens über eins und fällt danach zurück', () => {
    const state = createHelmState()
    const inp = inputs({ rand: () => 0.5 })
    requestEvade(state, 0, 1)
    let o = stepHelm(state, inp)
    for (let i = 0; i < 60; i++) o = stepHelm(state, inp)
    expect(o.throttle).toBeGreaterThan(1.05)
    for (let i = 0; i < 60 * 12; i++) o = stepHelm(state, inp)
    expect(o.throttle).toBeLessThan(1.01)
  })
})

describe('Helm — Gating und Takt', () => {
  it('inaktiv läuft alles binnen weniger Sekunden auf null und der Modus ist cruise', () => {
    const state = createHelmState()
    const on = inputs({ rand: () => 0.5 })
    requestEvade(state, 0, 1)
    for (let i = 0; i < 60; i++) stepHelm(state, on)
    const off = inputs({ active: false, rand: () => 0.5 })
    let o = stepHelm(state, off)
    for (let i = 0; i < 60 * 5 * HELM_EASE_OUT_SEC; i++) o = stepHelm(state, off)
    expect(o.mode).toBe('cruise')
    expect(Math.hypot(o.focusX, o.focusY)).toBeLessThan(0.5)
    expect(Math.abs(o.roll)).toBeLessThan(0.002)
    expect(Math.hypot(o.slipX, o.slipY)).toBeLessThan(0.5)
  })

  it('dt = 0 verändert nichts', () => {
    const state = createHelmState()
    const inp = inputs({ rand: () => 0.5 })
    requestEvade(state, 0, 1)
    for (let i = 0; i < 30; i++) stepHelm(state, inp)
    const before = { ...stepHelm(state, inp) }
    const frozen = { ...stepHelm(state, inputs({ dt: 0, rand: () => 0.5 })) }
    expect(frozen.focusX).toBeCloseTo(before.focusX, 6)
    expect(frozen.roll).toBeCloseTo(before.roll, 6)
    expect(frozen.rollRate).toBe(0)
  })

  it('das Easing ist framerate-unabhängig', () => {
    const fine = createHelmState()
    const coarse = createHelmState()
    requestEvade(fine, 1, 1)
    requestEvade(coarse, 1, 1)
    const iF = inputs({ dt: 1 / 120, rand: () => 0.5 })
    const iC = inputs({ dt: 1 / 30, rand: () => 0.5 })
    let oF = stepHelm(fine, iF)
    let oC = stepHelm(coarse, iC)
    for (let i = 0; i < 240; i++) oF = stepHelm(fine, iF)
    for (let i = 0; i < 60; i++) oC = stepHelm(coarse, iC)
    expect(Math.abs(oF.focusX - oC.focusX)).toBeLessThan(1)
    expect(Math.abs(oF.focusY - oC.focusY)).toBeLessThan(1)
  })

  it('auf Reisen wechselt der Kurs öfter', () => {
    const count = (traveling: boolean) => {
      let changes = 0
      let last = 'cruise'
      run(300, inputs({ traveling, rand: seeded(5) }), (o) => {
        if (o.mode !== last) changes++
        last = o.mode
      })
      return changes
    }
    expect(count(true)).toBeGreaterThan(count(false))
  })

  it('der Slip zeigt entgegen dem Fokus des Helms', () => {
    const state = createHelmState()
    const inp = inputs({ rand: () => 0.5 })
    requestEvade(state, 0, 1)
    let o = stepHelm(state, inp)
    for (let i = 0; i < 30; i++) o = stepHelm(state, inp)
    expect(o.slipX * o.focusX).toBeLessThan(0)
  })

  it('ist deterministisch — derselbe Seed, dieselbe Spur', () => {
    const trace = (seed: number) => {
      const rows: number[] = []
      run(120, inputs({ rand: seeded(seed) }), (o) => rows.push(o.focusX, o.roll))
      return rows.join(',')
    }
    expect(trace(9)).toBe(trace(9))
    expect(trace(9)).not.toBe(trace(10))
  })

  it('der Treffer-Ruck geht auch inaktiv und bei dt = 0 in Fokus, Slip und Rolle ein', () => {
    const jolt = createJoltState()
    kickJolt(jolt, -1, 0, 1, 1)
    stepJolt(jolt, 1 / 60)
    const state = createHelmState()
    const off = inputs({ active: false, rand: () => 0.5, jolt: jolt.out })
    // Direkt nach dem Stoss: Fokus nach links, das nahe Feld rutscht entgegen (nach rechts).
    let o = stepHelm(state, off)
    expect(o.focusX).toBeLessThan(0)
    expect(o.slipX).toBeGreaterThan(0)
    for (let i = 0; i < 6; i++) {
      stepJolt(jolt, 1 / 60)
      o = stepHelm(state, off)
    }
    expect(o.focusX).toBeLessThan(0)
    expect(o.roll).not.toBe(0)
    const frozen = stepHelm(
      state,
      inputs({ active: false, dt: 0, rand: () => 0.5, jolt: jolt.out }),
    )
    expect(frozen.focusX).toBeCloseTo(o.focusX, 9)
    expect(Math.abs(frozen.roll)).toBeGreaterThan(0)
  })

  it('die Klemmen halten mit vollem Ruck während eines Ausweichens', () => {
    const jolt = createJoltState()
    const state = createHelmState()
    const inp = inputs({ rand: () => 0.5, jolt: jolt.out })
    requestEvade(state, 0, 1)
    for (let i = 0; i < 60; i++) stepHelm(state, inp)
    for (let k = 0; k < 5; k++) kickJolt(jolt, -1, 0, 1, 1)
    for (let i = 0; i < 90; i++) {
      stepJolt(jolt, 1 / 60)
      const o = stepHelm(state, inp)
      expect(Math.hypot(o.focusX, o.focusY)).toBeLessThanOrEqual(HELM_FOCUS_MAX_FRAC * EDGE + 1e-6)
      expect(Math.abs(o.roll)).toBeLessThanOrEqual(HELM_ROLL_MAX_DEG * DEG + 1e-9)
      expect(Math.hypot(o.slipX, o.slipY)).toBeLessThanOrEqual(HELM_SLIP_MAX_PX_S + 1e-6)
    }
  })

  it('resetHelm stellt den Anfangszustand her', () => {
    const state = createHelmState()
    requestEvade(state, 0, 1)
    for (let i = 0; i < 30; i++) stepHelm(state, inputs({ rand: () => 0.5 }))
    resetHelm(state)
    expect(state.mode).toBe('cruise')
    expect(state.fx).toBe(0)
    expect(state.out.focusX).toBe(0)
  })
})
