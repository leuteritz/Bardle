import { describe, it, expect } from 'vitest'
import {
  bandSpawnAngle,
  beltEnvelope,
  createEncounterField,
  encounterSpriteKey,
  paintBinaryStar,
  paintEmberDot,
  paintGiant,
  paintNovaFlash,
  paintPulsarCore,
  paintRock,
  paintShard,
  passByAlpha,
  pickEncounterKind,
  radiantStreakStart,
  rescaleEncounters,
  spawnEncounter,
  stepEncounters,
  type EncounterFrame,
  type EncounterKind,
} from '@/utils/fx/skyEncounters'
import {
  ENCOUNTER_BAND_HALF_SPREAD_RAD,
  ENCOUNTER_BAND_WANDER_RAD,
  ENCOUNTER_CENTER_CLEARANCE_FRAC,
  ENCOUNTER_EVADE_AT,
  ENCOUNTER_GIANT_PALETTES,
  ENCOUNTER_KIND_WEIGHTS,
  ENCOUNTER_MAX_MAJOR,
  ENCOUNTER_MAX_MINOR,
  ENCOUNTER_ROCK_PALETTE,
  ENCOUNTER_ROCK_WOBBLE,
  ENCOUNTER_ROCKS_MAX,
  ENCOUNTER_SHARD_PALETTE,
  ENCOUNTER_SHARDS_MAX,
  ENCOUNTER_SHOWER_STREAKS_MAX,
  SPACE_BODY_LUMPY_POINTS,
} from '@/config/constants'
import { recordingCtx } from '../../helpers/recordingCtx'

const KINDS = Object.keys(ENCOUNTER_KIND_WEIGHTS) as EncounterKind[]

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function frameFor(w: number, h: number): EncounterFrame {
  return {
    w,
    h,
    cx: w / 2,
    cy: h / 2,
    maxDist: Math.hypot(w / 2, h / 2) + 20,
    minEdge: Math.min(w, h),
    delta: 1 / 60,
    speedMultiplier: 1,
    slipX: 0,
    slipY: 0,
    rollStep: 0,
    tint: [230, 235, 255],
  }
}

const painted = (ops: string[]) => ops.filter((o) => o === 'fill()' || o === 'stroke()').length

describe('Himmelsbegegnungen — Painter', () => {
  const R = 40
  const runAll = (seed: number) => {
    const out: Record<string, string[]> = {}
    const rec = (name: string, f: (ctx: CanvasRenderingContext2D) => void) => {
      const { ctx, ops } = recordingCtx()
      f(ctx)
      out[name] = ops
    }
    rec('rock', (c) => paintRock(c, 100, 100, R, seed, ENCOUNTER_ROCK_PALETTE, 2))
    rec('shard', (c) => paintShard(c, 100, 100, R * 0.4, seed, ENCOUNTER_SHARD_PALETTE))
    rec('giant', (c) => paintGiant(c, 100, 100, R, seed, ENCOUNTER_GIANT_PALETTES[0], true))
    rec('pulsar', (c) => paintPulsarCore(c, 100, 100, R, [190, 220, 255]))
    rec('nova', (c) => paintNovaFlash(c, 100, 100, R, seed, [255, 236, 200]))
    rec('binary', (c) => paintBinaryStar(c, 100, 100, R, [255, 214, 120]))
    rec('ember', (c) => paintEmberDot(c, 100, 100, R, [230, 150, 110]))
    return out
  }

  it('jeder Painter malt etwas', () => {
    for (const [name, ops] of Object.entries(runAll(3))) {
      expect(painted(ops), name).toBeGreaterThan(0)
    }
  })

  it('ist deterministisch und je Motiv verschieden', () => {
    const a = runAll(3)
    const b = runAll(3)
    const sigs = new Set<string>()
    for (const name of Object.keys(a)) {
      expect(a[name].join('|'), name).toBe(b[name].join('|'))
      sigs.add(a[name].join('|'))
    }
    expect(sigs.size).toBe(Object.keys(a).length)
  })

  it('sechs Brocken-Seeds und vier Splitter-Seeds sind paarweise verschieden', () => {
    const rocks = new Set<string>()
    for (let s = 0; s < 6; s++) {
      const { ctx, ops } = recordingCtx()
      paintRock(ctx, 100, 100, R, s, ENCOUNTER_ROCK_PALETTE, 2)
      rocks.add(ops.join('|'))
    }
    expect(rocks.size).toBe(6)
    const shards = new Set<string>()
    for (let s = 0; s < 4; s++) {
      const { ctx, ops } = recordingCtx()
      paintShard(ctx, 100, 100, R * 0.4, s, ENCOUNTER_SHARD_PALETTE)
      shards.add(ops.join('|'))
    }
    expect(shards.size).toBe(4)
  })

  it('der Brocken bleibt in seinem Wobble und die Detailstufe wächst', () => {
    const { ctx, ops } = recordingCtx()
    paintRock(ctx, 100, 100, R, 5, ENCOUNTER_ROCK_PALETTE, 0)
    const pts = ops.filter((o) => /^(moveTo|lineTo)\(/.test(o)).slice(0, SPACE_BODY_LUMPY_POINTS + 1)
    for (const p of pts) {
      const [, x, y] = /\((-?[\d.]+),(-?[\d.]+)\)/.exec(p)!
      const d = Math.hypot(Number(x) - 100, Number(y) - 100)
      expect(d).toBeGreaterThanOrEqual(R * (1 - ENCOUNTER_ROCK_WOBBLE) - 0.02)
      expect(d).toBeLessThanOrEqual(R * (1 + ENCOUNTER_ROCK_WOBBLE) + 0.02)
    }
    const lo = recordingCtx()
    const hi = recordingCtx()
    paintRock(lo.ctx, 100, 100, R, 5, ENCOUNTER_ROCK_PALETTE, 0)
    paintRock(hi.ctx, 100, 100, R, 5, ENCOUNTER_ROCK_PALETTE, 2)
    expect(painted(hi.ops)).toBeGreaterThan(painted(lo.ops))
  })

  it('ein beringter Riese hat mehr Striche als ein ringloser', () => {
    const a = recordingCtx()
    const b = recordingCtx()
    paintGiant(a.ctx, 100, 100, R, 2, ENCOUNTER_GIANT_PALETTES[1], true)
    paintGiant(b.ctx, 100, 100, R, 2, ENCOUNTER_GIANT_PALETTES[1], false)
    const strokes = (ops: string[]) => ops.filter((o) => o === 'stroke()').length
    expect(strokes(a.ops)).toBeGreaterThan(strokes(b.ops))
  })

  it('Sprite-Schlüssel sind über Art, Variante, Stufe und Zusatz eindeutig', () => {
    const keys = new Set<string>()
    for (const kind of ['rock', 'shard', 'giant', 'pulsar', 'nova', 'binary', 'ember'] as const) {
      for (let v = 0; v < 6; v++) for (let t = 0; t < 3; t++) for (let e = 0; e < 2; e++) keys.add(encounterSpriteKey(kind, v, t, e))
    }
    expect(keys.size).toBe(7 * 6 * 3 * 2)
  })
})

describe('Himmelsbegegnungen — Hüllkurven', () => {
  it('beide Hüllkurven sind an den Enden null und dazwischen voll', () => {
    for (const f of [beltEnvelope, passByAlpha]) {
      expect(f(0)).toBe(0)
      expect(f(1)).toBe(0)
      expect(f(0.5)).toBe(1)
      let prev = 0
      for (let t = 0; t <= 0.5; t += 0.01) {
        expect(f(t)).toBeGreaterThanOrEqual(prev - 1e-9)
        prev = f(t)
      }
    }
  })
})

describe('Himmelsbegegnungen — Geometrie', () => {
  for (const [w, h] of [
    [1920, 950],
    [3840, 2030],
  ] as const) {
    it(`${w}×${h}: das Asteroidenband bleibt in seiner Streuung und läuft ganz aus dem Bild`, () => {
      const rand = seeded(21)
      const field = createEncounterField(999)
      const frame = frameFor(w, h)
      const enc = spawnEncounter(field, 'asteroids', 4, frame, rand)
      let evadeCount = 0
      let maxParts = 0
      const spread = ENCOUNTER_BAND_HALF_SPREAD_RAD + ENCOUNTER_BAND_WANDER_RAD + 1e-6
      for (let f = 0; f < 60 * 90; f++) {
        stepEncounters(field, frame, rand, false)
        if (field.evade.pending) {
          evadeCount++
          expect(enc.t).toBeGreaterThanOrEqual(ENCOUNTER_EVADE_AT)
          field.evade.pending = false
        }
        maxParts = Math.max(maxParts, enc.parts.length)
        for (const p of enc.parts) {
          const d = Math.atan2(Math.sin(p.angle - enc.side), Math.cos(p.angle - enc.side))
          expect(Math.abs(d)).toBeLessThanOrEqual(spread)
          expect(p.dist).toBeLessThanOrEqual(frame.maxDist)
        }
        if (!field.list.includes(enc)) break
      }
      expect(field.list.includes(enc)).toBe(false)
      expect(maxParts).toBeGreaterThan(5)
      expect(maxParts).toBeLessThanOrEqual(ENCOUNTER_ROCKS_MAX)
      expect(evadeCount).toBe(1)
    })
  }

  it('bandSpawnAngle streut um die Bandmitte', () => {
    const rand = seeded(2)
    const field = createEncounterField(999)
    const enc = spawnEncounter(field, 'shards', 1, frameFor(1920, 950), rand)
    for (let i = 0; i < 200; i++) {
      const a = bandSpawnAngle(enc, rand)
      const d = Math.atan2(Math.sin(a - enc.side), Math.cos(a - enc.side))
      expect(Math.abs(d)).toBeLessThanOrEqual(1.2)
    }
    expect(ENCOUNTER_SHARDS_MAX).toBeGreaterThan(0)
  })

  it('Schauer-Striche entspringen am Radianten und laufen von ihm weg', () => {
    const rand = seeded(8)
    const field = createEncounterField(999)
    const frame = frameFor(1920, 950)
    const enc = spawnEncounter(field, 'shower', 9, frame, rand)
    for (let f = 0; f < 60 * 4; f++) {
      const before = enc.streaks.length
      const origin = radiantStreakStart(enc, frame)
      stepEncounters(field, frame, rand, false)
      for (let i = before; i < enc.streaks.length; i++) {
        const s = enc.streaks[i]
        expect(Math.hypot(s.x - origin.x, s.y - origin.y)).toBeLessThan(20)
      }
      for (const s of enc.streaks) {
        const dx = s.x - origin.x
        const dy = s.y - origin.y
        if (Math.hypot(dx, dy) < 5) continue
        expect(dx * s.vx + dy * s.vy).toBeGreaterThan(0)
      }
      expect(enc.streaks.length).toBeLessThanOrEqual(ENCOUNTER_SHOWER_STREAKS_MAX)
    }
    expect(enc.streaks.length).toBeGreaterThan(0)
  })

  it('Einzelkörper spawnen ausserhalb der Mitte und laufen nur nach aussen', () => {
    const rand = seeded(5)
    const frame = frameFor(1920, 950)
    for (const kind of ['giant', 'pulsar', 'nova', 'binary', 'dustlane'] as const) {
      const field = createEncounterField(999)
      const enc = spawnEncounter(field, kind, 3, frame, rand)
      expect(enc.anchor.dist).toBeGreaterThanOrEqual(ENCOUNTER_CENTER_CLEARANCE_FRAC * frame.minEdge)
      let prev = enc.anchor.dist
      for (let f = 0; f < 60 * 10 && field.list.includes(enc); f++) {
        stepEncounters(field, frame, rand, false)
        expect(enc.anchor.dist).toBeGreaterThanOrEqual(prev)
        prev = enc.anchor.dist
      }
    }
  })

  it('die Deckel halten: nie mehr als eine grosse, zwei kleine, keine Wiederholung', () => {
    const rand = seeded(77)
    const field = createEncounterField(0)
    const frame = frameFor(1920, 950)
    let last: EncounterKind | null = null
    for (let f = 0; f < 60 * 60 * 10; f++) {
      const before = field.list.length
      stepEncounters(field, frame, rand, f % 2 === 0)
      const majors = field.list.filter((e) => e.major).length
      expect(majors).toBeLessThanOrEqual(ENCOUNTER_MAX_MAJOR)
      expect(field.list.length - majors).toBeLessThanOrEqual(ENCOUNTER_MAX_MINOR)
      if (field.list.length > before) {
        const fresh = field.list[field.list.length - 1]
        expect(fresh.kind).not.toBe(last)
        last = fresh.kind
      }
      field.evade.pending = false
    }
    expect(last).not.toBeNull()
  })

  it('pickEncounterKind liefert nur Arten, die der Deckel erlaubt', () => {
    const rand = seeded(1)
    const field = createEncounterField(0)
    const frame = frameFor(1920, 950)
    spawnEncounter(field, 'asteroids', 1, frame, rand)
    for (let i = 0; i < 100; i++) {
      const k = pickEncounterKind(field, rand, false)
      expect(k).not.toBeNull()
      expect(['asteroids', 'giant', 'shards', 'dustlane']).not.toContain(k)
    }
    spawnEncounter(field, 'shower', 1, frame, rand)
    spawnEncounter(field, 'pulsar', 1, frame, rand)
    expect(pickEncounterKind(field, rand, false)).toBeNull()
    expect(KINDS.length).toBe(8)
  })

  it('rescaleEncounters skaliert jede Distanz', () => {
    const rand = seeded(4)
    const field = createEncounterField(999)
    const frame = frameFor(1920, 950)
    const enc = spawnEncounter(field, 'asteroids', 2, frame, rand)
    for (let f = 0; f < 120; f++) stepEncounters(field, frame, rand, false)
    const anchor = enc.anchor.dist
    const parts = enc.parts.map((p) => p.dist)
    rescaleEncounters(field, 1.5)
    expect(enc.anchor.dist).toBeCloseTo(anchor * 1.5, 9)
    enc.parts.forEach((p, i) => expect(p.dist).toBeCloseTo(parts[i] * 1.5, 9))
  })
})
