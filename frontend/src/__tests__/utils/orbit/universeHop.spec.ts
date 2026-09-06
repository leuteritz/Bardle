import { describe, expect, it } from 'vitest'
import {
  UNIVERSE_HOP_APPROACH_MS,
  UNIVERSE_HOP_DEPART_MS,
  UNIVERSE_HOP_PORTAL_PASS_K,
  UNIVERSE_HOP_SPEED_PEAK,
  UNIVERSE_HOP_THRESHOLD_MS,
  UNIVERSE_HOP_HUD_IN_DELAY_MS,
  UNIVERSE_HOP_EMERGE_MS,
} from '@/config/constants'
import {
  createUniverseHop,
  resetUniverseHop,
  startUniverseHop,
  stepUniverseHop,
  UNIVERSE_HOP_COMMIT_AT_MS,
  UNIVERSE_HOP_HUD_IN_AT_MS,
  UNIVERSE_HOP_TOTAL_MS,
  UNIVERSE_HOP_WASH_AT_MS,
  type UniverseHopPhase,
} from '@/utils/orbit/universeHop'

const MIN_EDGE = 900
const FAR = 1100
const DEPART_END = UNIVERSE_HOP_DEPART_MS
const APPROACH_END = DEPART_END + UNIVERSE_HOP_APPROACH_MS
const THRESHOLD_END = APPROACH_END + UNIVERSE_HOP_THRESHOLD_MS

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

/** Fährt den Sprung mit fester Schrittweite bis `untilMs`; zählt die Flanken. */
function run(dtMs: number, untilMs: number, rand = seeded(7)) {
  const state = createUniverseHop()
  startUniverseHop(state, rand)
  const phases: UniverseHopPhase[] = ['depart']
  const edges = { wash: 0, commit: 0, hudIn: 0, done: 0 }
  const at = { wash: -1, commit: -1, hudIn: -1, done: -1 }
  let t = 0
  while (t < untilMs) {
    t += dtMs
    stepUniverseHop(state, dtMs, MIN_EDGE, FAR)
    const o = state.out
    for (const k of ['wash', 'commit', 'hudIn', 'done'] as const) {
      if (o[k]) {
        edges[k]++
        at[k] = t
      }
    }
    if (phases[phases.length - 1] !== o.phase) phases.push(o.phase)
  }
  return { state, phases, edges, at }
}

describe('universeHop — Phasen und Flanken', () => {
  it('durchläuft depart → approach → threshold → emerge → idle', () => {
    const r = run(16.7, UNIVERSE_HOP_TOTAL_MS + 200)
    expect(r.phases).toEqual(['depart', 'approach', 'threshold', 'emerge', 'idle'])
  })

  it('leitet die Flankenzeiten aus den Phasen ab', () => {
    expect(UNIVERSE_HOP_WASH_AT_MS).toBe(APPROACH_END)
    expect(UNIVERSE_HOP_COMMIT_AT_MS).toBeGreaterThan(APPROACH_END)
    expect(UNIVERSE_HOP_COMMIT_AT_MS).toBeLessThan(THRESHOLD_END)
    expect(UNIVERSE_HOP_HUD_IN_AT_MS).toBe(THRESHOLD_END + UNIVERSE_HOP_HUD_IN_DELAY_MS)
    expect(UNIVERSE_HOP_HUD_IN_DELAY_MS).toBeLessThan(UNIVERSE_HOP_EMERGE_MS)
    expect(UNIVERSE_HOP_TOTAL_MS).toBe(THRESHOLD_END + UNIVERSE_HOP_EMERGE_MS)
  })

  it.each([16.7, 100])('feuert jede Flanke genau einmal (dt %s ms)', (dt) => {
    const r = run(dt, UNIVERSE_HOP_TOTAL_MS + 500)
    expect(r.edges).toEqual({ wash: 1, commit: 1, hudIn: 1, done: 1 })
    const expected = {
      wash: UNIVERSE_HOP_WASH_AT_MS,
      commit: UNIVERSE_HOP_COMMIT_AT_MS,
      hudIn: UNIVERSE_HOP_HUD_IN_AT_MS,
      done: UNIVERSE_HOP_TOTAL_MS,
    }
    for (const k of ['wash', 'commit', 'hudIn', 'done'] as const) {
      expect(r.at[k]).toBeGreaterThanOrEqual(expected[k])
      expect(r.at[k]).toBeLessThan(expected[k] + dt + 0.01)
    }
  })

  it('springt mit EINEM grossen Delta über alle Grenzen und feuert trotzdem je einmal', () => {
    const state = createUniverseHop()
    startUniverseHop(state, seeded(3))
    stepUniverseHop(state, UNIVERSE_HOP_TOTAL_MS + 1, MIN_EDGE, FAR)
    expect(state.out.wash).toBe(true)
    expect(state.out.commit).toBe(true)
    expect(state.out.hudIn).toBe(true)
    expect(state.out.done).toBe(true)
    expect(state.out.phase).toBe('idle')
    stepUniverseHop(state, 16, MIN_EDGE, FAR)
    expect(state.out.wash).toBe(false)
    expect(state.out.commit).toBe(false)
    expect(state.out.hudIn).toBe(false)
    expect(state.out.done).toBe(false)
  })

  it('tickt im Ruhezustand nicht', () => {
    const state = createUniverseHop()
    stepUniverseHop(state, 1000, MIN_EDGE, FAR)
    expect(state.elapsedMs).toBe(0)
    expect(state.out.done).toBe(false)
    expect(state.out.speed).toBe(1)
  })
})

describe('universeHop — Kurven', () => {
  it('beschleunigt monoton im Aufbruch und erreicht die Spitze am Ende des Anflugs', () => {
    const state = createUniverseHop()
    startUniverseHop(state, seeded(11))
    let last = 1
    let t = 0
    while (t < DEPART_END) {
      t += 16.7
      stepUniverseHop(state, 16.7, MIN_EDGE, FAR)
      expect(state.out.speed).toBeGreaterThanOrEqual(last - 1e-9)
      last = state.out.speed
    }
    while (t < APPROACH_END) {
      t += 16.7
      stepUniverseHop(state, 16.7, MIN_EDGE, FAR)
    }
    expect(state.out.speed).toBeGreaterThan(UNIVERSE_HOP_SPEED_PEAK * 0.93)
  })

  it('rollt monoton aus und steht am Ende exakt auf 1', () => {
    const state = createUniverseHop()
    startUniverseHop(state, seeded(5))
    stepUniverseHop(state, THRESHOLD_END, MIN_EDGE, FAR)
    let last = state.out.speed
    let t = THRESHOLD_END
    while (t < UNIVERSE_HOP_TOTAL_MS) {
      t += 16.7
      stepUniverseHop(state, 16.7, MIN_EDGE, FAR)
      expect(state.out.speed).toBeLessThanOrEqual(last + 1e-9)
      last = state.out.speed
    }
    expect(state.out.speed).toBe(1)
    expect(state.out.trailFade).toBe(1)
  })

  it('lässt das Tor nur im Anflug wachsen und über die Kamera hinaus', () => {
    const state = createUniverseHop()
    startUniverseHop(state, seeded(9))
    stepUniverseHop(state, DEPART_END - 1, MIN_EDGE, FAR)
    expect(state.out.portalR).toBe(0)
    expect(state.out.mawAlpha).toBe(0)
    let last = 0
    let t = DEPART_END - 1
    while (t < APPROACH_END) {
      t += 16.7
      stepUniverseHop(state, 16.7, MIN_EDGE, FAR)
      if (state.out.phase !== 'approach') break
      expect(state.out.portalR).toBeGreaterThan(last)
      last = state.out.portalR
    }
    expect(state.out.portalR).toBeGreaterThanOrEqual(UNIVERSE_HOP_PORTAL_PASS_K * FAR * 0.999)
    expect(state.out.portalSpin).toBeGreaterThan(0)
    expect(state.out.fieldAlpha).toBeLessThan(state.out.mawAlpha)
    expect(state.out.fieldAlpha).toBeGreaterThan(0)
    stepUniverseHop(state, UNIVERSE_HOP_THRESHOLD_MS + 1, MIN_EDGE, FAR)
    expect(state.out.phase).toBe('emerge')
    expect(state.out.portalR).toBe(0)
    expect(state.out.portalAlpha).toBe(0)
  })

  it('fährt den Fluchtpunkt zum Kurs und exakt zurück', () => {
    const state = createUniverseHop()
    startUniverseHop(state, seeded(21))
    stepUniverseHop(state, DEPART_END, MIN_EDGE, FAR)
    expect(Math.hypot(state.out.focusX, state.out.focusY)).toBeCloseTo(
      Math.hypot(state.courseFx, state.courseFy) * MIN_EDGE,
      6,
    )
    stepUniverseHop(state, UNIVERSE_HOP_TOTAL_MS, MIN_EDGE, FAR)
    expect(state.out.focusX).toBe(0)
    expect(state.out.focusY).toBe(0)
  })

  it('skaliert den Fokus mit der kurzen Kante', () => {
    const a = createUniverseHop()
    const b = createUniverseHop()
    startUniverseHop(a, seeded(4))
    startUniverseHop(b, seeded(4))
    stepUniverseHop(a, DEPART_END, 600, FAR)
    stepUniverseHop(b, DEPART_END, 1200, FAR)
    expect(b.out.focusX).toBeCloseTo(a.out.focusX * 2, 6)
    expect(b.out.focusY).toBeCloseTo(a.out.focusY * 2, 6)
  })

  it('legt den Kurs nie in den unteren Bogen', () => {
    for (let i = 0; i < 400; i++) {
      const s = createUniverseHop()
      startUniverseHop(s, seeded(i + 1))
      const len = Math.hypot(s.courseFx, s.courseFy)
      expect(s.courseFy / len).toBeLessThanOrEqual(0.5 + 1e-9)
    }
  })

  it('hält beim Zurücksetzen dasselbe out-Objekt', () => {
    const state = createUniverseHop()
    const out = state.out
    startUniverseHop(state, seeded(2))
    stepUniverseHop(state, 2000, MIN_EDGE, FAR)
    resetUniverseHop(state)
    expect(state.out).toBe(out)
    expect(state.out.phase).toBe('idle')
    expect(state.out.portalSpin).toBe(0)
  })
})
