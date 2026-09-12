import { describe, expect, it } from 'vitest'
import {
  GALAXY_TRANS_DECEL_MS,
  GALAXY_TRANS_WARP_MS,
  GALAXY_WARP_ACCEL_MS,
  GALAXY_WARP_LAUNCH_MS,
  WARP_BANK_MAX_RAD,
  WARP_BOW_WAVE_MS,
  WARP_COURSE_LEGS,
  WARP_COURSE_TURN_MAX_DEG,
  WARP_COURSE_TURN_MIN_DEG,
  WARP_FOCUS_FRAC_MAX,
  WARP_FOCUS_FRAC_MIN,
  WARP_LAUNCH_SPEED,
  WARP_LEAN_K,
  WARP_SPEED_PEAK,
  WARP_SURGE_FROM,
  WARP_SURGE_PEAK,
  WARP_TRAIL_FADE,
} from '@/config/constants'
import {
  additiveDrawAlpha,
  createGalaxyWarp,
  GALAXY_WARP_ACCEL_END_MS,
  GALAXY_WARP_LEG_MS,
  persistentDrawAlpha,
  resetGalaxyWarp,
  startGalaxyWarp,
  stepGalaxyWarp,
  type GalaxyWarpPhase,
} from '@/utils/orbit/galaxyWarp'

const TOTAL_MS = GALAXY_TRANS_WARP_MS + GALAXY_TRANS_DECEL_MS
const ACCEL_END = GALAXY_WARP_ACCEL_END_MS
const MIN_EDGE = 900
const DEG = Math.PI / 180

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
  const phases: GalaxyWarpPhase[] = ['launch']
  let launches = 0
  let commits = 0
  let dones = 0
  let commitAt = -1
  let doneAt = -1
  let t = 0
  while (t < untilMs) {
    t += dtMs
    stepGalaxyWarp(state, dtMs, MIN_EDGE)
    const o = state.out
    if (o.launched) launches++
    if (o.commit) {
      commits++
      commitAt = t
    }
    if (o.done) {
      dones++
      doneAt = t
    }
    if (phases[phases.length - 1] !== o.phase) phases.push(o.phase)
  }
  return { state, phases, launches, commits, dones, commitAt, doneAt }
}

/** Fokus des Wegpunkts in px. */
function wpPx(state: ReturnType<typeof createGalaxyWarp>, i: number): [number, number] {
  const wp = state.waypoints[i]
  return [Math.cos(wp.az) * wp.r * MIN_EDGE, Math.sin(wp.az) * wp.r * MIN_EDGE]
}

describe('galaxyWarp — Phasen und Flanken', () => {
  it('durchläuft launch → accel → cruise → decel → idle', () => {
    const r = run(16.7, TOTAL_MS + 200)
    expect(r.phases).toEqual(['launch', 'accel', 'cruise', 'decel', 'idle'])
  })

  it.each([16.7, 100])('feuert launched, commit und done genau einmal (dt %s ms)', (dt) => {
    const r = run(dt, TOTAL_MS + 500)
    expect(r.launches).toBe(1)
    expect(r.commits).toBe(1)
    expect(r.dones).toBe(1)
    expect(r.commitAt).toBeGreaterThanOrEqual(GALAXY_TRANS_WARP_MS)
    expect(r.commitAt).toBeLessThan(GALAXY_TRANS_WARP_MS + dt + 0.01)
    expect(r.doneAt).toBeGreaterThanOrEqual(TOTAL_MS)
    expect(r.doneAt).toBeLessThan(TOTAL_MS + dt + 0.01)
    expect(r.state.phase).toBe('idle')
  })

  it('springt mit einem einzigen großen Delta über alle Grenzen und bleibt konsistent', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(3))
    stepGalaxyWarp(state, TOTAL_MS + 1, MIN_EDGE)
    const o = state.out
    expect(o.launched).toBe(true)
    expect(o.commit).toBe(true)
    expect(o.done).toBe(true)
    expect(o.phase).toBe('idle')
    stepGalaxyWarp(state, 16, MIN_EDGE)
    expect(o.launched).toBe(false)
    expect(o.commit).toBe(false)
    expect(o.done).toBe(false)
  })

  it('tickt im Leerlauf nicht und feuert nichts', () => {
    const state = createGalaxyWarp()
    stepGalaxyWarp(state, 5000, MIN_EDGE)
    expect(state.elapsedMs).toBe(0)
    expect(state.out.done).toBe(false)
    expect(state.out.launched).toBe(false)
    expect(state.out.speed).toBe(1)
    expect(state.out.procession).toBe(0)
    expect(state.out.themeMix).toBe(0)
  })
})

describe('galaxyWarp — der Aufbruch', () => {
  it('punscht das Tempo im Aufbruch monoton hoch und hält den Fokus in der Mitte', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(11))
    const dt = 16.7
    let t = 0
    let last = 1
    while (t + dt < GALAXY_WARP_LAUNCH_MS) {
      t += dt
      stepGalaxyWarp(state, dt, MIN_EDGE)
      expect(state.out.phase).toBe('launch')
      expect(state.out.speed).toBeGreaterThanOrEqual(last - 1e-9)
      expect(state.out.focusX).toBe(0)
      expect(state.out.focusY).toBe(0)
      expect(state.out.groupLead).toBe(0)
      last = state.out.speed
    }
    expect(last).toBeGreaterThan(WARP_LAUNCH_SPEED * 0.9)
  })

  it('geht ohne Sprung vom Aufbruch in den Anlauf und weiter auf Überlicht', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(11))
    const dt = 16.7
    let t = 0
    let last = 1
    while (t < ACCEL_END) {
      t += dt
      stepGalaxyWarp(state, dt, MIN_EDGE)
      expect(state.out.speed).toBeGreaterThanOrEqual(last - 1e-9)
      // Kein Frame-Sprung grösser als ein Zehntel der Anlaufspanne.
      expect(state.out.speed - last).toBeLessThan((WARP_SPEED_PEAK - 1) * 0.1)
      last = state.out.speed
    }
    expect(last).toBeGreaterThan(WARP_SPEED_PEAK * 0.98)
    while (t < TOTAL_MS + dt) {
      t += dt
      stepGalaxyWarp(state, dt, MIN_EDGE)
    }
    expect(state.out.speed).toBe(1)
  })

  it('lässt Ringe und Bugwelle je einmal laufen und legt das Headlight danach zurück', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(12))
    stepGalaxyWarp(state, 1, MIN_EDGE)
    expect(state.out.launchPulse).toBeGreaterThanOrEqual(0)
    expect(state.out.launchPulse).toBeLessThan(0.01)
    expect(state.out.bowWave).toBe(0)
    stepGalaxyWarp(state, GALAXY_WARP_LAUNCH_MS, MIN_EDGE)
    expect(state.out.launchPulse).toBeGreaterThan(0.5)
    expect(state.out.bowWave).toBe(0)
    stepGalaxyWarp(state, ACCEL_END - GALAXY_WARP_LAUNCH_MS - 1, MIN_EDGE)
    expect(state.out.launchPulse).toBe(1)
    expect(state.out.bowWave).toBe(0)
    expect(state.out.headlight).toBeCloseTo(1, 2)
    stepGalaxyWarp(state, WARP_BOW_WAVE_MS / 2, MIN_EDGE)
    expect(state.out.bowWave).toBeCloseTo(0.5, 2)
    expect(state.out.headlight).toBeGreaterThan(1.2)
    stepGalaxyWarp(state, WARP_BOW_WAVE_MS / 2 + 1, MIN_EDGE)
    expect(state.out.bowWave).toBe(1)
    expect(state.out.headlight).toBeCloseTo(1, 3)
  })

  it('blendet den Sternen-Schub im Aufbruch ein, hält ihn bis zum Schnitt und legt ihn im Ausrollen ab', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(14))
    stepGalaxyWarp(state, 1, MIN_EDGE)
    expect(state.out.starSurge).toBeLessThan(0.01)
    stepGalaxyWarp(state, GALAXY_WARP_LAUNCH_MS, MIN_EDGE)
    expect(state.out.starSurge).toBe(1)
    stepGalaxyWarp(state, GALAXY_TRANS_WARP_MS - GALAXY_WARP_LAUNCH_MS - 10, MIN_EDGE)
    expect(state.out.starSurge).toBe(1)
    stepGalaxyWarp(state, GALAXY_TRANS_DECEL_MS / 2, MIN_EDGE)
    expect(state.out.starSurge).toBeLessThan(1)
    expect(state.out.starSurge).toBeGreaterThan(0)
    stepGalaxyWarp(state, GALAXY_TRANS_DECEL_MS, MIN_EDGE)
    expect(state.out.starSurge).toBe(0)
  })
})

describe('galaxyWarp — Kurven', () => {
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

  it('fährt den Fluchtpunkt zum ersten Wegpunkt, über die Etappen zum letzten und am Ende zurück auf die Mitte', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(5))
    stepGalaxyWarp(state, ACCEL_END, MIN_EDGE)
    const [ax, ay] = wpPx(state, 0)
    expect(state.out.focusX).toBeCloseTo(ax, 6)
    expect(state.out.focusY).toBeCloseTo(ay, 6)
    expect(Math.hypot(ax, ay)).toBeGreaterThan(MIN_EDGE * 0.09)
    for (let leg = 1; leg <= WARP_COURSE_LEGS; leg++) {
      stepGalaxyWarp(state, GALAXY_WARP_LEG_MS, MIN_EDGE)
      const [bx, by] = wpPx(state, leg)
      expect(state.out.focusX).toBeCloseTo(bx, 4)
      expect(state.out.focusY).toBeCloseTo(by, 4)
    }
    expect(state.elapsedMs).toBeCloseTo(GALAXY_TRANS_WARP_MS, 6)
    stepGalaxyWarp(state, GALAXY_TRANS_DECEL_MS + 1, MIN_EDGE)
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
    expect(b.out.playerX).toBeCloseTo(a.out.playerX * 2, 6)
  })

  it('zieht keinen Wegpunkt in den unteren Bogen (Bottom-Bar) und hält Radius- und Kurvenband', () => {
    for (let seed = 1; seed < 400; seed++) {
      const state = createGalaxyWarp()
      startGalaxyWarp(state, seeded(seed * 7919))
      expect(state.waypoints).toHaveLength(WARP_COURSE_LEGS + 1)
      for (let i = 0; i < state.waypoints.length; i++) {
        const wp = state.waypoints[i]
        // Ausgeschlossen ist [30°, 150°] (y nach unten) — dort ist sin > 0.5.
        expect(Math.sin(wp.az)).toBeLessThanOrEqual(0.5 + 1e-9)
        expect(wp.r).toBeGreaterThanOrEqual(WARP_FOCUS_FRAC_MIN)
        expect(wp.r).toBeLessThanOrEqual(WARP_FOCUS_FRAC_MAX)
        if (i > 0) {
          const turn = Math.abs(wp.az - state.waypoints[i - 1].az)
          expect(turn).toBeGreaterThanOrEqual(WARP_COURSE_TURN_MIN_DEG * DEG - 1e-9)
          expect(turn).toBeLessThanOrEqual(WARP_COURSE_TURN_MAX_DEG * DEG + 1e-9)
        }
      }
    }
  })

  it('fliegt eine Kurve: der Fokus wandert je Frame stetig, ohne Ecke an den Etappengrenzen', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(23))
    const dt = 16.7
    stepGalaxyWarp(state, ACCEL_END, MIN_EDGE)
    let lx = state.out.focusX
    let ly = state.out.focusY
    let lpx = state.out.playerX
    let moved = 0
    for (let t = ACCEL_END; t + dt < GALAXY_TRANS_WARP_MS; t += dt) {
      stepGalaxyWarp(state, dt, MIN_EDGE)
      const d = Math.hypot(state.out.focusX - lx, state.out.focusY - ly)
      expect(d).toBeLessThan(MIN_EDGE * 0.02)
      expect(Math.abs(state.out.playerX - lpx)).toBeLessThan(MIN_EDGE * 0.01)
      expect(state.out.playerX).toBeCloseTo(state.out.focusX * WARP_LEAN_K, 9)
      moved += d
      lx = state.out.focusX
      ly = state.out.focusY
      lpx = state.out.playerX
    }
    // Und er bewegt sich wirklich — kein stehender Fluchtpunkt mehr.
    expect(moved).toBeGreaterThan(MIN_EDGE * 0.1)
  })

  it('rollt das Feld in die Bank und wieder heraus — an jeder Etappengrenze und am Schnitt steht es gerade', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(29))
    const dt = 16.7
    let t = 0
    let bank = 0
    let maxRoll = 0
    const checkpoints = []
    for (let leg = 1; leg <= WARP_COURSE_LEGS; leg++)
      checkpoints.push(ACCEL_END + leg * GALAXY_WARP_LEG_MS)
    while (t < TOTAL_MS) {
      t += dt
      stepGalaxyWarp(state, dt, MIN_EDGE)
      const o = state.out
      if (o.phase !== 'cruise') expect(o.roll).toBe(0)
      bank -= (o.roll * dt) / 1000
      expect(Math.abs(bank)).toBeLessThanOrEqual(WARP_BANK_MAX_RAD + 1e-3)
      maxRoll = Math.max(maxRoll, Math.abs(o.roll))
      for (const c of checkpoints)
        if (t >= c && t - dt < c) expect(Math.abs(bank)).toBeLessThan(0.01)
      if (o.commit) expect(Math.abs(bank)).toBeLessThan(0.01)
    }
    expect(maxRoll).toBeGreaterThan(0)
  })

  it('löscht das Vorbild nur im Flug unvollständig (Persistenz-Blur)', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(2))
    stepGalaxyWarp(state, 1, MIN_EDGE)
    expect(state.out.trailFade).toBeGreaterThan(0.99)
    stepGalaxyWarp(state, ACCEL_END, MIN_EDGE)
    expect(state.out.trailFade).toBeCloseTo(WARP_TRAIL_FADE, 3)
    stepGalaxyWarp(state, TOTAL_MS, MIN_EDGE)
    expect(state.out.trailFade).toBe(1)
  })

  it('zeigt keine Zielgalaxie im Flug', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(4))
    stepGalaxyWarp(state, TOTAL_MS / 2, MIN_EDGE)
    expect('destGalaxyScale' in state.out).toBe(false)
    expect('destGalaxyAlpha' in state.out).toBe(false)
  })

  it('fährt Prozession und Lehne mit dem Anlauf hoch, hält sie und legt sie zurück', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(13))
    const dt = 16.7
    let t = 0
    let last = 0
    while (t < ACCEL_END) {
      t += dt
      stepGalaxyWarp(state, dt, MIN_EDGE)
      expect(state.out.procession).toBeGreaterThanOrEqual(last - 1e-9)
      expect(state.out.groupLead).toBeCloseTo(state.out.procession, 9)
      last = state.out.procession
    }
    expect(last).toBeGreaterThan(0.98)
    stepGalaxyWarp(state, 1000, MIN_EDGE)
    expect(state.out.procession).toBe(1)
    expect(state.out.groupLead).toBe(1)
    // Ausrollen: monoton zurück, ohne Überschwinger über die Bahn hinaus
    stepGalaxyWarp(state, GALAXY_TRANS_WARP_MS, MIN_EDGE)
    last = state.out.procession
    for (let e = 0; e < GALAXY_TRANS_DECEL_MS; e += dt) {
      stepGalaxyWarp(state, dt, MIN_EDGE)
      expect(state.out.procession).toBeLessThanOrEqual(last + 1e-9)
      expect(state.out.procession).toBeGreaterThanOrEqual(0)
      expect(state.out.groupLead).toBeCloseTo(state.out.procession, 9)
      last = state.out.procession
    }
    stepGalaxyWarp(state, dt, MIN_EDGE)
    expect(state.out.procession).toBe(0)
    expect(state.out.groupLead).toBe(0)
    expect(state.out.playerX).toBe(0)
  })

  it('lässt die Prozession mit demselben Easing anlaufen wie Schub und Schwenk', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(21))
    stepGalaxyWarp(state, GALAXY_WARP_LAUNCH_MS + GALAXY_WARP_ACCEL_MS / 2, MIN_EDGE)
    const o = state.out
    const k = o.procession
    expect((o.speed - WARP_LAUNCH_SPEED) / (WARP_SPEED_PEAK - WARP_LAUNCH_SPEED)).toBeCloseTo(k, 6)
    const [ax] = wpPx(state, 0)
    expect(o.focusX).toBeCloseTo(ax * k, 6)
  })

  it('lässt die Farbwelt erst in der zweiten Hälfte wandern und am Schnitt ankommen', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(31))
    const dt = 16.7
    stepGalaxyWarp(state, ACCEL_END, MIN_EDGE)
    expect(state.out.themeMix).toBe(0)
    const surgeStart = ACCEL_END + (GALAXY_TRANS_WARP_MS - ACCEL_END) * WARP_SURGE_FROM
    stepGalaxyWarp(state, surgeStart - ACCEL_END - dt, MIN_EDGE)
    expect(state.out.themeMix).toBe(0)
    let last = 0
    let t = surgeStart
    while (t < GALAXY_TRANS_WARP_MS - dt) {
      t += dt
      stepGalaxyWarp(state, dt, MIN_EDGE)
      expect(state.out.themeMix).toBeGreaterThanOrEqual(last - 1e-9)
      expect(state.out.themeMix).toBeLessThanOrEqual(1)
      last = state.out.themeMix
    }
    expect(last).toBeGreaterThan(0.9)
    stepGalaxyWarp(state, dt * 2, MIN_EDGE)
    expect(state.out.themeMix).toBe(1)
    stepGalaxyWarp(state, GALAXY_TRANS_DECEL_MS / 2, MIN_EDGE)
    expect(state.out.themeMix).toBe(1)
  })

  it('zieht das Tempo mit derselben Kurve an wie die Farbe — eine Bewegung, nicht zwei', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(33))
    stepGalaxyWarp(state, ACCEL_END + 100, MIN_EDGE)
    const early = state.out.speed
    for (const at of [0.4, 0.6, 0.85, 0.99]) {
      const state2 = createGalaxyWarp()
      startGalaxyWarp(state2, seeded(34))
      stepGalaxyWarp(state2, GALAXY_TRANS_WARP_MS * at, MIN_EDGE)
      const expected = WARP_SPEED_PEAK + (WARP_SURGE_PEAK - WARP_SPEED_PEAK) * state2.out.themeMix
      expect(state2.out.speed).toBeGreaterThan(expected * 0.94)
      expect(state2.out.speed).toBeLessThan(expected * 1.06)
    }
    stepGalaxyWarp(state, GALAXY_TRANS_WARP_MS - ACCEL_END - 200, MIN_EDGE)
    expect(state.out.speed).toBeGreaterThan(early * 1.08)
    expect(state.out.speed).toBeLessThanOrEqual(WARP_SURGE_PEAK * 1.05)
    expect(state.out.themeMix).toBeGreaterThan(0.9)
  })

  it('springt am Schnitt nicht im Tempo — das Ausrollen beginnt am Gipfel', () => {
    const state = createGalaxyWarp()
    startGalaxyWarp(state, seeded(41))
    const dt = 16.7
    stepGalaxyWarp(state, GALAXY_TRANS_WARP_MS - dt, MIN_EDGE)
    const lastCruise = state.out.speed
    stepGalaxyWarp(state, dt * 2, MIN_EDGE)
    expect(state.out.phase).toBe('decel')
    expect(state.out.speed).toBeGreaterThan(lastCruise * 0.9)
  })

  it('schreibt immer dasselbe Ausgabeobjekt und behält die Wegpunktliste über den Reset', () => {
    const state = createGalaxyWarp()
    const out = state.out
    const wps = state.waypoints
    startGalaxyWarp(state, seeded(1))
    stepGalaxyWarp(state, 100, MIN_EDGE)
    stepGalaxyWarp(state, TOTAL_MS, MIN_EDGE)
    expect(state.out).toBe(out)
    resetGalaxyWarp(state)
    expect(state.out).toBe(out)
    expect(state.waypoints).toBe(wps)
    expect(state.waypoints[0].r).toBe(0)
  })
})

describe('additiveDrawAlpha', () => {
  it('konvergiert unter `lighter` auf den gewünschten Sichtwert', () => {
    const erase = 0.35
    const visible = 0.3
    const g = additiveDrawAlpha(visible, erase)
    let d = 0
    for (let i = 0; i < 400; i++) d = g + (1 - erase) * d
    expect(d).toBeCloseTo(visible, 6)
  })

  it('ist NICHT persistentDrawAlpha — die gilt für source-over', () => {
    expect(additiveDrawAlpha(0.3, 0.35)).toBeLessThan(persistentDrawAlpha(0.3, 0.35))
  })

  it('liefert ohne Spur den Sichtwert selbst', () => {
    expect(additiveDrawAlpha(0.42, 1)).toBe(0.42)
  })
})

describe('persistentDrawAlpha', () => {
  it('liefert ohne Blur den Sichtwert selbst', () => {
    expect(persistentDrawAlpha(0.3, 1)).toBe(0.3)
  })

  it('konvergiert unter destination-out auf den gewünschten Sichtwert', () => {
    const erase = 0.35
    const visible = 0.3
    const g = persistentDrawAlpha(visible, erase)
    let d = 0
    for (let i = 0; i < 400; i++) {
      d = d * (1 - erase)
      d = g + d * (1 - g)
    }
    expect(d).toBeCloseTo(visible, 6)
  })
})
