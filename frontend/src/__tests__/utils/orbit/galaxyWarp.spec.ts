import { describe, expect, it } from 'vitest'
import {
  GALAXY_TRANS_DECEL_MS,
  GALAXY_TRANS_WARP_MS,
  GALAXY_WARP_ACCEL_MS,
  GALAXY_WARP_COURSE_MS,
  GALAXY_WARP_DEST_LEAD_MS,
  WARP_SPEED_PEAK,
  WARP_TRAIL_FADE,
} from '@/config/constants'
import {
  createGalaxyWarp,
  persistentDrawAlpha,
  startGalaxyWarp,
  stepGalaxyWarp,
  type GalaxyWarpPhase,
} from '@/utils/orbit/galaxyWarp'

const TOTAL_MS = GALAXY_TRANS_WARP_MS + GALAXY_TRANS_DECEL_MS
const MIN_EDGE = 900

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

/** Fährt den Warp mit fester Schrittweite bis `untilMs`; zählt die Flanken. */
function run(dtMs: number, untilMs: number, rand = seeded(7)) {
  const state = createGalaxyWarp()
  startGalaxyWarp(state, rand)
  const phases: GalaxyWarpPhase[] = ['course']
  let commits = 0
  let spawns = 0
  let dones = 0
  let commitAt = -1
  let spawnAt = -1
  let doneAt = -1
  let t = 0
  while (t < untilMs) {
    t += dtMs
    stepGalaxyWarp(state, dtMs, MIN_EDGE)
    const o = state.out
    if (o.commit) {
      commits++
      commitAt = t
    }
    if (o.destSpawn) {
      spawns++
      spawnAt = t
    }
    if (o.done) {
      dones++
      doneAt = t
    }
    if (phases[phases.length - 1] !== o.phase) phases.push(o.phase)
  }
  return { state, phases, commits, spawns, dones, commitAt, spawnAt, doneAt }
}

describe('galaxyWarp — Phasen und Flanken', () => {
  it('durchläuft course → accel → cruise → decel → idle', () => {
    const r = run(16.7, TOTAL_MS + 200)
    expect(r.phases).toEqual(['course', 'accel', 'cruise', 'decel', 'idle'])
  })

  it.each([16.7, 100])('feuert commit und done genau einmal (dt %s ms)', (dt) => {
    const r = run(dt, TOTAL_MS + 500)
    expect(r.commits).toBe(1)
    expect(r.dones).toBe(1)
    expect(r.spawns).toBe(1)
    // Der Schnitt liegt beim Ende der Flugzeit, die Ankunft beim Gesamtende —
    // jeweils im ersten Frame, der die Grenze überschreitet.
    expect(r.commitAt).toBeGreaterThanOrEqual(GALAXY_TRANS_WARP_MS)
    expect(r.commitAt).toBeLessThan(GALAXY_TRANS_WARP_MS + dt + 0.01)
    expect(r.doneAt).toBeGreaterThanOrEqual(TOTAL_MS)
    expect(r.doneAt).toBeLessThan(TOTAL_MS + dt + 0.01)
    expect(r.spawnAt).toBeGreaterThanOrEqual(GALAXY_TRANS_WARP_MS - GALAXY_WARP_DEST_LEAD_MS)
    expect(r.state.phase).toBe('idle')
  })

  it('springt mit einem einzigen großen Delta über alle Grenzen und bleibt konsistent', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(3))
    stepGalaxyWarp(state, TOTAL_MS + 1, MIN_EDGE)
    const o = state.out
    expect(o.commit).toBe(true)
    expect(o.destSpawn).toBe(true)
    expect(o.done).toBe(true)
    expect(o.phase).toBe('idle')
    // Ein weiterer Frame: nichts feuert erneut.
    stepGalaxyWarp(state, 16, MIN_EDGE)
    expect(o.commit).toBe(false)
    expect(o.done).toBe(false)
  })

  it('tickt im Leerlauf nicht und feuert nichts', () => {
    const state = createGalaxyWarp()
    stepGalaxyWarp(state, 5000, MIN_EDGE)
    expect(state.elapsedMs).toBe(0)
    expect(state.out.done).toBe(false)
    expect(state.out.speed).toBe(1)
  })
})

describe('galaxyWarp — Kurven', () => {
  it('beschleunigt monoton bis zum Höchsttempo und rollt auf 1 aus', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(11))
    const dt = 16.7
    let t = 0
    let last = 0
    while (t < GALAXY_WARP_COURSE_MS + GALAXY_WARP_ACCEL_MS) {
      t += dt
      stepGalaxyWarp(state, dt, MIN_EDGE)
      expect(state.out.speed).toBeGreaterThanOrEqual(last - 1e-9)
      last = state.out.speed
    }
    expect(last).toBeGreaterThan(WARP_SPEED_PEAK * 0.98)
    while (t < TOTAL_MS + dt) {
      t += dt
      stepGalaxyWarp(state, dt, MIN_EDGE)
    }
    expect(state.out.speed).toBe(1)
  })

  it('bremst monoton ab', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(11))
    stepGalaxyWarp(state, GALAXY_TRANS_WARP_MS, MIN_EDGE)
    let last = state.out.speed
    for (let t = 0; t < GALAXY_TRANS_DECEL_MS; t += 16.7) {
      stepGalaxyWarp(state, 16.7, MIN_EDGE)
      expect(state.out.speed).toBeLessThanOrEqual(last + 1e-9)
      last = state.out.speed
    }
  })

  it('fährt den Fluchtpunkt zum Kursziel und am Ende zurück auf die Mitte', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(5))
    stepGalaxyWarp(state, GALAXY_WARP_COURSE_MS, MIN_EDGE)
    const targetX = state.courseFx * MIN_EDGE
    const targetY = state.courseFy * MIN_EDGE
    expect(state.out.focusX).toBeCloseTo(targetX, 6)
    expect(state.out.focusY).toBeCloseTo(targetY, 6)
    expect(Math.hypot(targetX, targetY)).toBeGreaterThan(MIN_EDGE * 0.09)
    stepGalaxyWarp(state, TOTAL_MS - GALAXY_WARP_COURSE_MS, MIN_EDGE)
    expect(state.out.focusX).toBe(0)
    expect(state.out.focusY).toBe(0)
  })

  it('skaliert den Fokus mit der kurzen Kante — der Kurs ist ein Anteil, kein Pixelwert', () => {
    const a = createGalaxyWarp()
    const b = createGalaxyWarp()
    startGalaxyWarp(a, seeded(9))
    startGalaxyWarp(b, seeded(9))
    stepGalaxyWarp(a, 5000, 600)
    stepGalaxyWarp(b, 5000, 1200)
    expect(b.out.focusX).toBeCloseTo(a.out.focusX * 2, 6)
    expect(b.out.focusY).toBeCloseTo(a.out.focusY * 2, 6)
  })

  it('zieht das Kursziel nie in den unteren Bogen (Bottom-Bar)', () => {
    for (let seed = 1; seed < 400; seed++) {
      const state = createGalaxyWarp()
      startGalaxyWarp(state, seeded(seed))
      const az = Math.atan2(state.courseFy, state.courseFx)
      // Ausgeschlossen ist [30°, 150°] (y nach unten) — dort ist sin > 0.5.
      expect(Math.sin(az)).toBeLessThanOrEqual(0.5 + 1e-9)
    }
  })

  it('löscht das Vorbild nur im Flug unvollständig (Persistenz-Blur)', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(2))
    stepGalaxyWarp(state, GALAXY_WARP_COURSE_MS - 1, MIN_EDGE)
    expect(state.out.trailFade).toBe(1)
    stepGalaxyWarp(state, GALAXY_WARP_ACCEL_MS + 1, MIN_EDGE)
    expect(state.out.trailFade).toBeCloseTo(WARP_TRAIL_FADE, 3)
    stepGalaxyWarp(state, TOTAL_MS, MIN_EDGE)
    expect(state.out.trailFade).toBe(1)
  })

  it('lässt die Zielgalaxie wachsen und im Ausrollen verschwinden', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(4))
    stepGalaxyWarp(state, GALAXY_TRANS_WARP_MS - GALAXY_WARP_DEST_LEAD_MS + 1, MIN_EDGE)
    const early = state.out.destGalaxyScale
    stepGalaxyWarp(state, GALAXY_WARP_DEST_LEAD_MS + GALAXY_TRANS_DECEL_MS * 0.5, MIN_EDGE)
    expect(state.out.destGalaxyScale).toBeGreaterThan(early)
    expect(state.out.destGalaxyAlpha).toBeGreaterThan(0)
    stepGalaxyWarp(state, GALAXY_TRANS_DECEL_MS * 0.5 - 1, MIN_EDGE)
    expect(state.out.destGalaxyAlpha).toBeLessThan(0.02)
  })

  it('schreibt immer dasselbe Ausgabeobjekt', () => {
    const state = createGalaxyWarp()
    const out = state.out
    startGalaxyWarp(state, seeded(1))
    stepGalaxyWarp(state, 100, MIN_EDGE)
    stepGalaxyWarp(state, TOTAL_MS, MIN_EDGE)
    expect(state.out).toBe(out)
  })
})

describe('persistentDrawAlpha', () => {
  it('liefert ohne Blur den Sichtwert selbst', () => {
    expect(persistentDrawAlpha(0.3, 1)).toBe(0.3)
  })

  it('konvergiert unter destination-out auf den gewünschten Sichtwert', () => {
    const visible = 0.28
    const erase = 0.35
    const g = persistentDrawAlpha(visible, erase)
    expect(g).toBeLessThan(visible)
    let a = 0
    for (let i = 0; i < 200; i++) {
      a = a * (1 - erase)
      a = a + g - a * g
    }
    expect(a).toBeCloseTo(visible, 4)
  })
})
