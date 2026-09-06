import { describe, expect, it } from 'vitest'
import {
  UNIVERSE_HOP_APPROACH_MS,
  UNIVERSE_HOP_DEPART_MS,
  UNIVERSE_HOP_PORTAL_PASS_K,
  UNIVERSE_HOP_SPEED_PEAK,
  UNIVERSE_HOP_PASSAGE_MS,
  UNIVERSE_HOP_HUD_IN_DELAY_MS,
  UNIVERSE_HOP_EMERGE_MS,
  UNIVERSE_HOP_PORTAL_R0_FRAC,
  UNIVERSE_HOP_TUNNEL_ROLL_RAD_S,
  UNIVERSE_HOP_COURSE_BANK_MAX_DEG,
  UNIVERSE_HOP_COURSE_BANK_MIN_DEG,
  UNIVERSE_HOP_FOCUS_FRAC_MAX,
  UNIVERSE_HOP_FOCUS_FRAC_MIN,
  UNIVERSE_HOP_WALL_ALPHA,
  UNIVERSE_HOP_WASH_MS,
  UNIVERSE_HOP_WASH_PEAK,
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
  universeHopFocusAt,
  type UniverseHopPhase,
} from '@/utils/orbit/universeHop'

const MIN_EDGE = 900
const FAR = 1100
const DEPART_END = UNIVERSE_HOP_DEPART_MS
const APPROACH_END = DEPART_END + UNIVERSE_HOP_APPROACH_MS
const PASSAGE_END = APPROACH_END + UNIVERSE_HOP_PASSAGE_MS

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
  it('durchläuft depart → approach → passage → emerge → idle', () => {
    const r = run(16.7, UNIVERSE_HOP_TOTAL_MS + 200)
    expect(r.phases).toEqual(['depart', 'approach', 'passage', 'emerge', 'idle'])
  })

  it('leitet die Flankenzeiten aus den Phasen ab — der Wash-Peak liegt am Tunnelausgang', () => {
    expect(UNIVERSE_HOP_COMMIT_AT_MS).toBe(PASSAGE_END)
    expect(UNIVERSE_HOP_WASH_AT_MS).toBe(
      PASSAGE_END - Math.round(UNIVERSE_HOP_WASH_PEAK * UNIVERSE_HOP_WASH_MS),
    )
    expect(UNIVERSE_HOP_WASH_AT_MS).toBeGreaterThan(APPROACH_END)
    expect(UNIVERSE_HOP_HUD_IN_AT_MS).toBe(PASSAGE_END + UNIVERSE_HOP_HUD_IN_DELAY_MS)
    expect(UNIVERSE_HOP_HUD_IN_DELAY_MS).toBeLessThan(UNIVERSE_HOP_EMERGE_MS)
    expect(UNIVERSE_HOP_TOTAL_MS).toBe(PASSAGE_END + UNIVERSE_HOP_EMERGE_MS)
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
  it('geht im Aufbruch monoton auf Überlicht und hält es bis zum Tunnelende', () => {
    const state = createUniverseHop()
    startUniverseHop(state, seeded(11))
    let last = 1
    let maxStep = 0
    let t = 0
    while (t < DEPART_END) {
      t += 16.7
      stepUniverseHop(state, 16.7, MIN_EDGE, FAR)
      // Am Phasenübergang setzt der Shimmer (±5 %) ein — kein Rückwärtsknick, nur Atmen.
      expect(state.out.speed).toBeGreaterThanOrEqual(last - 0.05)
      maxStep = Math.max(maxStep, state.out.speed - last)
      last = state.out.speed
    }
    // Kein Sprung je Frame — der Schub ist eine Kurve.
    expect(maxStep).toBeLessThan((UNIVERSE_HOP_SPEED_PEAK - 1) * 0.04)
    expect(state.out.speed).toBeGreaterThan(UNIVERSE_HOP_SPEED_PEAK * 0.93)
    while (t < PASSAGE_END - 20) {
      t += 16.7
      stepUniverseHop(state, 16.7, MIN_EDGE, FAR)
      expect(state.out.speed).toBeGreaterThan(UNIVERSE_HOP_SPEED_PEAK * 0.93)
    }
  })

  it('rollt monoton aus und steht am Ende exakt auf 1', () => {
    const state = createUniverseHop()
    startUniverseHop(state, seeded(5))
    stepUniverseHop(state, PASSAGE_END, MIN_EDGE, FAR)
    let last = state.out.speed
    let t = PASSAGE_END
    while (t < UNIVERSE_HOP_TOTAL_MS) {
      t += 16.7
      stepUniverseHop(state, 16.7, MIN_EDGE, FAR)
      expect(state.out.speed).toBeLessThanOrEqual(last + 1e-9)
      last = state.out.speed
    }
    expect(state.out.speed).toBe(1)
    expect(state.out.trailFade).toBe(1)
  })

  it('lässt das Tor nur im Anflug wachsen — sichtbar von Anfang an, über die Kamera hinaus', () => {
    const state = createUniverseHop()
    startUniverseHop(state, seeded(9))
    stepUniverseHop(state, DEPART_END - 1, MIN_EDGE, FAR)
    expect(state.out.portalR).toBe(0)
    expect(state.out.mawAlpha).toBe(0)
    let last = 0
    let lastField = 0
    let lastMaw = 0
    let t = DEPART_END - 1
    const r0 = UNIVERSE_HOP_PORTAL_R0_FRAC * MIN_EDGE
    while (t < APPROACH_END) {
      t += 16.7
      stepUniverseHop(state, 16.7, MIN_EDGE, FAR)
      if (state.out.phase !== 'approach') break
      expect(state.out.portalR).toBeGreaterThan(last)
      expect(state.out.portalR).toBeGreaterThanOrEqual(r0)
      last = state.out.portalR
      lastField = state.out.fieldAlpha
      lastMaw = state.out.mawAlpha
      // Zur Halbzeit deutlich mehr als der Startring — keine Hyperbel, die ihn 80 % der Zeit winzig hält.
      if (t >= DEPART_END + UNIVERSE_HOP_APPROACH_MS / 2 && t < DEPART_END + UNIVERSE_HOP_APPROACH_MS / 2 + 17)
        expect(state.out.portalR).toBeGreaterThan(r0 * 3)
    }
    expect(state.out.portalR).toBeGreaterThanOrEqual(UNIVERSE_HOP_PORTAL_PASS_K * FAR * 0.999)
    expect(state.out.portalSpin).toBeGreaterThan(0)
    expect(lastField).toBeLessThan(lastMaw)
    expect(lastField).toBeGreaterThan(0)
    stepUniverseHop(state, UNIVERSE_HOP_PASSAGE_MS + 1, MIN_EDGE, FAR)
    expect(state.out.phase).toBe('emerge')
    expect(state.out.portalR).toBe(0)
    expect(state.out.portalAlpha).toBe(0)
    expect(state.out.flightSec).toBe(0)
  })

  it('rollt nur im Tunnel, weich an und ab, und der Tunnel läuft 0 → 1', () => {
    const state = createUniverseHop()
    startUniverseHop(state, seeded(13))
    stepUniverseHop(state, APPROACH_END - 1, MIN_EDGE, FAR)
    expect(state.out.roll).toBe(0)
    expect(state.out.tunnelT).toBe(0)
    expect(state.out.wallAlpha).toBe(0)
    let maxAbs = 0
    let signChanges = 0
    let lastSign = 0
    let lastT = 0
    let lastSec = 0
    let t = APPROACH_END - 1
    while (t < PASSAGE_END - 1) {
      t += 16.7
      stepUniverseHop(state, 16.7, MIN_EDGE, FAR)
      if (state.out.phase !== 'passage') break
      expect(state.out.tunnelT).toBeGreaterThanOrEqual(lastT)
      expect(state.out.tunnelSec).toBeGreaterThanOrEqual(lastSec)
      lastT = state.out.tunnelT
      lastSec = state.out.tunnelSec
      maxAbs = Math.max(maxAbs, Math.abs(state.out.roll))
      const sign = Math.sign(state.out.roll)
      if (sign !== 0 && lastSign !== 0 && sign !== lastSign) signChanges++
      if (sign !== 0) lastSign = sign
      expect(state.out.fieldAlpha).toBe(0)
      expect(state.out.wallAlpha).toBe(UNIVERSE_HOP_WALL_ALPHA)
    }
    expect(maxAbs).toBeGreaterThan(UNIVERSE_HOP_TUNNEL_ROLL_RAD_S * 0.8)
    expect(maxAbs).toBeLessThanOrEqual(UNIVERSE_HOP_TUNNEL_ROLL_RAD_S + 1e-9)
    // Der Twist wechselt die Richtung — sonst ist es ein Karussell.
    expect(signChanges).toBeGreaterThanOrEqual(1)
    expect(lastSec).toBeCloseTo(UNIVERSE_HOP_PASSAGE_MS / 1000, 1)
    expect(Math.abs(state.out.roll)).toBeLessThan(UNIVERSE_HOP_TUNNEL_ROLL_RAD_S * 0.2)
    stepUniverseHop(state, 40, MIN_EDGE, FAR)
    expect(state.out.phase).toBe('emerge')
    expect(state.out.roll).toBe(0)
    expect(state.out.tunnelT).toBe(0)
    expect(state.out.wallAlpha).toBe(0)
  })

  it('beginnt weich: beim Heben des Schleiers ist das Feld noch nahe der Ruhe', () => {
    const state = createUniverseHop()
    startUniverseHop(state, seeded(17))
    // Der Schleier hebt ~450 ms nach dem Start der Maschine.
    stepUniverseHop(state, 450, MIN_EDGE, FAR)
    expect(state.out.speed).toBeLessThan(UNIVERSE_HOP_SPEED_PEAK * 0.3)
    const [ax, ay] = universeHopFocusAt(state, 0, MIN_EDGE)
    expect(Math.hypot(state.out.focusX, state.out.focusY)).toBeLessThan(Math.hypot(ax, ay) * 0.3)
  })

  it('würfelt das Roll-Vorzeichen', () => {
    const signs = new Set<number>()
    for (let i = 0; i < 40; i++) {
      const st = createUniverseHop()
      startUniverseHop(st, seeded(Math.imul(i + 1, 2654435761) >>> 0))
      signs.add(st.rollSign)
    }
    expect(signs).toEqual(new Set([-1, 1]))
  })

  it('fliegt eine KURVE: der Fokus startet bei A, endet bei B, und kehrt exakt zurück', () => {
    const state = createUniverseHop()
    startUniverseHop(state, seeded(21))
    stepUniverseHop(state, DEPART_END, MIN_EDGE, FAR)
    const [ax, ay] = universeHopFocusAt(state, 0, MIN_EDGE)
    expect(state.out.focusX).toBeCloseTo(ax, 6)
    expect(state.out.focusY).toBeCloseTo(ay, 6)
    stepUniverseHop(state, APPROACH_END - DEPART_END, MIN_EDGE, FAR)
    const [bx, by] = universeHopFocusAt(state, 1, MIN_EDGE)
    expect(state.out.focusX).toBeCloseTo(bx, 6)
    expect(state.out.focusY).toBeCloseTo(by, 6)
    // A und B liegen sichtbar auseinander — die Bank ist keine Null.
    expect(Math.hypot(bx - ax, by - ay)).toBeGreaterThan(MIN_EDGE * 0.05)
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

  it('würfelt den Kurs über alle vier Quadranten, im Radiusband, mit Bank', () => {
    const quadrants = [0, 0, 0, 0]
    // Der LCG liefert für Nachbar-Seeds fast dieselbe erste Ziehung — die Seeds
    // werden gestreut, geprüft wird die MASCHINE, nicht der Testzufall.
    for (let i = 0; i < 400; i++) {
      const st = createUniverseHop()
      startUniverseHop(st, seeded(Math.imul(i + 1, 2654435761) >>> 0))
      const [x, y] = universeHopFocusAt(st, 0, MIN_EDGE)
      quadrants[(x >= 0 ? 0 : 1) + (y >= 0 ? 0 : 2)]++
      for (const r of [st.courseR0, st.courseR1]) {
        expect(r).toBeGreaterThanOrEqual(UNIVERSE_HOP_FOCUS_FRAC_MIN)
        expect(r).toBeLessThanOrEqual(UNIVERSE_HOP_FOCUS_FRAC_MAX)
      }
      const bankDeg = (Math.abs(st.courseAz1 - st.courseAz0) * 180) / Math.PI
      expect(bankDeg).toBeGreaterThanOrEqual(UNIVERSE_HOP_COURSE_BANK_MIN_DEG - 1e-9)
      expect(bankDeg).toBeLessThanOrEqual(UNIVERSE_HOP_COURSE_BANK_MAX_DEG + 1e-9)
    }
    for (const n of quadrants) expect(n).toBeGreaterThanOrEqual(40)
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
