import { describe, expect, it } from 'vitest'
import {
  CLUSTER_FADE_IN_SEC,
  CLUSTER_MAJOR_COOLDOWN_SEC,
  CLUSTER_MAX_MAJOR,
  CLUSTER_MAX_MINOR,
  CLUSTER_POINT_BUDGET,
  CLUSTER_REFERENCE_NORM,
  CLUSTER_SHAPES,
  STAR_COUNT,
} from '@/config/constants'
import {
  buildMembers,
  clearClusters,
  clusterPointBudget,
  createClusterField,
  drawClusters,
  firstClusterDelay,
  pickClusterKind,
  rescaleClusters,
  rotateClusters,
  seedStaticClusters,
  spawnCluster,
  stepClusters,
  type ClusterFrame,
  type ClusterKind,
} from '@/composables/starBackground/starClusters'
import { recordingCtx } from '../../helpers/recordingCtx'

const KINDS = Object.keys(CLUSTER_SHAPES) as ClusterKind[]

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function frameFor(w: number, h: number, speedMultiplier = 1): ClusterFrame {
  return {
    w,
    h,
    cx: w / 2,
    cy: h / 2,
    maxDist: Math.hypot(w / 2, h / 2) + 20,
    minEdge: Math.min(w, h),
    delta: 1 / 60,
    speedMultiplier,
    slipX: 0,
    slipY: 0,
    rollStep: 0,
  }
}

describe('Sternenhaufen — Regie', () => {
  it('vor dem ersten Gap spawnt nichts', () => {
    const rand = seeded(5)
    const field = createClusterField(12)
    const frame = frameFor(1920, 950)
    for (let f = 0; f < 60 * 11; f++) stepClusters(field, frame, rand, true)
    expect(field.list).toHaveLength(0)
  })

  it('höchstens ein major und zwei minor gleichzeitig', () => {
    const rand = seeded(9)
    const field = createClusterField(0)
    const frame = frameFor(1920, 950)
    for (let f = 0; f < 60 * 900; f++) {
      stepClusters(field, frame, rand, true)
      let majors = 0
      let minors = 0
      for (const c of field.list) {
        if (c.major) majors++
        else minors++
      }
      expect(majors).toBeLessThanOrEqual(CLUSTER_MAX_MAJOR)
      expect(minors).toBeLessThanOrEqual(CLUSTER_MAX_MINOR)
    }
  })

  it('ein major sperrt den nächsten für die Cooldown-Dauer', () => {
    const rand = seeded(4)
    const field = createClusterField(999)
    const frame = frameFor(1920, 950)
    spawnCluster(field, 'dense', frame, rand)
    expect(field.majorCooldown).toBe(CLUSTER_MAJOR_COOLDOWN_SEC)
    field.list.length = 0
    for (let i = 0; i < 200; i++) {
      const k = pickClusterKind(field, rand)
      if (k) expect(['knot', 'pair']).toContain(k)
    }
  })

  it('der Rhythmus lässt echte Leerräume', () => {
    const rand = seeded(31)
    const field = createClusterField(firstClusterDelay(rand))
    const frame = frameFor(1920, 950)
    const total = 60 * 1800
    let busy = 0
    let emptyRun = 0
    let longestEmpty = 0
    for (let f = 0; f < total; f++) {
      stepClusters(field, frame, rand, true)
      if (field.list.length > 0) {
        busy++
        emptyRun = 0
      } else {
        emptyRun++
        longestEmpty = Math.max(longestEmpty, emptyRun)
      }
    }
    expect(busy / total).toBeGreaterThan(0.25)
    expect(busy / total).toBeLessThan(0.75)
    expect(longestEmpty / 60).toBeGreaterThan(30)
  })

  it('der Gap zählt Strecke, nicht Zeit — sonst leert sich der schnelle Himmel', () => {
    const count = (speed: number): number => {
      const rand = seeded(77)
      const field = createClusterField(0)
      const frame = frameFor(1920, 950, speed)
      let spawns = 0
      let before = 0
      // Gleiche STRECKE, nicht gleiche Zeit: die Frameszahl skaliert gegen das Tempo.
      for (let f = 0; f < Math.round((60 * 1200) / speed); f++) {
        stepClusters(field, frame, rand, true)
        if (field.list.length > before) spawns++
        before = field.list.length
      }
      return spawns
    }
    const slow = count(1)
    const fast = count(4)
    expect(Math.abs(fast - slow) / slow).toBeLessThan(0.2)
  })
})

describe('Sternenhaufen — Punkt-Haushalt', () => {
  it('die teuerste Besetzung bleibt unter dem Budget und unter dem alten Dauerbestand', () => {
    expect(clusterPointBudget()).toBeLessThanOrEqual(CLUSTER_POINT_BUDGET)
    // Früher standen zehn Haufen à bis zu 26 Punkten DAUERHAFT im Bild.
    expect(clusterPointBudget()).toBeLessThan(10 * 26)
  })

  it('kein Frame überschreitet das Budget', () => {
    const rand = seeded(13)
    const field = createClusterField(0)
    const frame = frameFor(1920, 950)
    let peak = 0
    for (let f = 0; f < 60 * 900; f++) {
      stepClusters(field, frame, rand, true)
      let pts = 0
      for (const c of field.list) pts += c.members.length
      peak = Math.max(peak, pts)
    }
    expect(peak).toBeGreaterThan(0)
    expect(peak).toBeLessThanOrEqual(CLUSTER_POINT_BUDGET)
  })

  it('die Dichte am Referenzring trifft die Herleitung', () => {
    const rand = seeded(2)
    const frame = frameFor(1920, 950)
    const n = CLUSTER_REFERENCE_NORM
    // rho(n) des freien Felds: STAR_COUNT gleichverteilt über 0.85 der Ringe.
    const rhoField = STAR_COUNT / (0.85 * 2 * Math.PI * n * frame.maxDist * frame.maxDist)
    // `pair` ist per Konstruktion ein enges Paar, kein statistischer Haufen —
    // seine Dichte ist nicht am Feld gemessen, sondern an seiner Mitgliederzahl.
    for (const kind of KINDS.filter((k) => k !== 'pair')) {
      const shape = CLUSTER_SHAPES[kind]
      const members = buildMembers(kind, rand)
      const rc = n * frame.maxDist
      const area = Math.PI * (rc * shape.spanQ) * (rc * shape.spanA)
      const factor = members.length / area / rhoField
      // Am Referenzring dichter als das Feld, aber kein Nebelfleck.
      expect(factor, kind).toBeGreaterThan(1.5)
      expect(factor, kind).toBeLessThan(9)
    }
    const pair = buildMembers('pair', rand)
    expect(pair.length).toBeGreaterThanOrEqual(CLUSTER_SHAPES.pair.count[0])
    expect(pair.length).toBeLessThanOrEqual(CLUSTER_SHAPES.pair.count[1])
  })
})

describe('Sternenhaufen — Perspektive', () => {
  it('der Haufen klappt linear mit der Distanz auf — man fliegt hindurch', () => {
    const rand = seeded(17)
    const field = createClusterField(999)
    const frame = frameFor(1920, 950)
    const c = spawnCluster(field, 'loose', frame, rand)
    const spanAt = (cNorm: number): number => {
      let max = 0
      for (const m of c.members) {
        const d = cNorm * m.q * frame.maxDist
        const ang = m.dA
        const x = Math.cos(ang) * d - cNorm * frame.maxDist
        const y = Math.sin(ang) * d
        max = Math.max(max, Math.hypot(x, y))
      }
      return max
    }
    const near = spanAt(0.75)
    const far = spanAt(0.25)
    expect(near / far).toBeGreaterThan(2.8)
    expect(near / far).toBeLessThan(3.2)
  })

  it('äußere Mitglieder verlassen den Rand vor dem Kern', () => {
    const rand = seeded(29)
    const field = createClusterField(999)
    const frame = frameFor(1920, 950)
    const c = spawnCluster(field, 'dense', frame, rand)
    const cNorm = 0.9
    const gone = c.members.filter((m) => cNorm * m.q > 1)
    const here = c.members.filter((m) => cNorm * m.q <= 1)
    expect(gone.length).toBeGreaterThan(0)
    expect(here.length).toBeGreaterThan(0)
    for (const m of gone) expect(m.q).toBeGreaterThan(1)
  })

  it('der Haufen verschwindet erst, wenn auch das innerste Mitglied vorbei ist', () => {
    const rand = seeded(41)
    const field = createClusterField(999)
    const frame = frameFor(1920, 950)
    const c = spawnCluster(field, 'dense', frame, rand)
    const qMin = Math.min(...c.members.map((m) => m.q))
    expect(c.retireNorm).toBeCloseTo(1 / qMin, 5)
    for (let f = 0; f < 60 * 600 && field.list.includes(c); f++) {
      stepClusters(field, frame, rand, false)
      if (field.list.includes(c)) {
        // Solange er lebt, ist mindestens ein Mitglied noch nicht vorbei.
        const cNorm = c.dist / frame.maxDist
        expect(cNorm * qMin).toBeLessThanOrEqual(1.001)
      }
    }
    expect(field.list.includes(c)).toBe(false)
  })

  it('ein Haufen endet durch die Perspektive, nicht durch eine Uhr', () => {
    const rand = seeded(8)
    const field = createClusterField(999)
    const frame = frameFor(1920, 950, 0)
    const c = spawnCluster(field, 'loose', frame, rand)
    for (let f = 0; f < 60 * 600; f++) stepClusters(field, frame, rand, false)
    expect(field.list.includes(c)).toBe(true)
  })
})

describe('Sternenhaufen — Zustand', () => {
  it('delta 0 bewegt nichts und spawnt nichts', () => {
    const rand = seeded(6)
    const field = createClusterField(0)
    const frame = frameFor(1920, 950)
    stepClusters(field, frame, rand, true)
    const c = field.list[0]
    expect(c).toBeDefined()
    const dist = c.dist
    const angle = c.angle
    const age = c.age
    const paused = { ...frame, delta: 0 }
    for (let f = 0; f < 1000; f++) stepClusters(field, paused, rand, true)
    expect(c.dist).toBe(dist)
    expect(c.angle).toBe(angle)
    expect(c.age).toBe(age)
  })

  it('rescaleClusters skaliert nur den Mittelpunkt', () => {
    const rand = seeded(3)
    const field = createClusterField(999)
    const frame = frameFor(1920, 950)
    const c = spawnCluster(field, 'knot', frame, rand)
    const before = c.members.map((m) => [m.q, m.dA])
    const dist = c.dist
    rescaleClusters(field, 1.4)
    expect(c.dist).toBeCloseTo(dist * 1.4, 6)
    expect(c.members.map((m) => [m.q, m.dA])).toEqual(before)
  })

  it('rotateClusters dreht den Haufen als Ganzes', () => {
    const rand = seeded(15)
    const field = createClusterField(999)
    const frame = frameFor(1920, 950)
    const c = spawnCluster(field, 'spray', frame, rand)
    const angle = c.angle
    const offsets = c.members.map((m) => m.dA)
    rotateClusters(field, 0.7)
    expect(c.angle).toBeCloseTo(angle + 0.7, 6)
    expect(c.members.map((m) => m.dA)).toEqual(offsets)
  })

  it('seedStaticClusters füllt den Ring und rührt den Gap nicht an', () => {
    const rand = seeded(21)
    const field = createClusterField(42)
    const frame = frameFor(1920, 950)
    seedStaticClusters(field, 4, frame, rand)
    expect(field.list).toHaveLength(4)
    expect(field.gap).toBe(42)
    expect(field.majorCooldown).toBe(0)
    for (const c of field.list) {
      const norm = c.dist / frame.maxDist
      expect(norm).toBeGreaterThanOrEqual(0.24)
      expect(norm).toBeLessThanOrEqual(0.86)
      expect(c.age).toBe(CLUSTER_FADE_IN_SEC)
    }
  })

  it('clearClusters räumt die Liste', () => {
    const rand = seeded(1)
    const field = createClusterField(0)
    const frame = frameFor(1920, 950)
    stepClusters(field, frame, rand, true)
    expect(field.list.length).toBeGreaterThan(0)
    clearClusters(field)
    expect(field.list).toHaveLength(0)
    expect(field.lastKind).toBeNull()
  })

  it('gleicher Seed, gleiche Struktur', () => {
    const build = (): unknown => buildMembers('dense', seeded(99))
    expect(build()).toEqual(build())
  })
})

describe('Sternenhaufen — Zeichnen', () => {
  it('ein Blit je sichtbarem Mitglied, kein Pfad und kein Stroke', () => {
    const rand = seeded(12)
    const field = createClusterField(999)
    const frame = frameFor(1920, 950)
    const c = spawnCluster(field, 'loose', frame, rand)
    c.age = CLUSTER_FADE_IN_SEC
    c.dist = frame.maxDist * 0.5
    const { ctx, ops } = recordingCtx()
    const blits = drawClusters(ctx, field, frame, 1)
    expect(blits).toBeGreaterThan(0)
    expect(ops.filter((o) => o.startsWith('drawImage')).length).toBe(blits)
    expect(ops.some((o) => o === 'fill()' || o === 'stroke()')).toBe(false)
    expect(blits).toBeLessThanOrEqual(c.members.length)
  })

  it('ohne Deko-Helligkeit wird gar nichts gezeichnet', () => {
    const rand = seeded(12)
    const field = createClusterField(999)
    const frame = frameFor(1920, 950)
    spawnCluster(field, 'loose', frame, rand)
    const { ctx, ops } = recordingCtx()
    expect(drawClusters(ctx, field, frame, 0)).toBe(0)
    expect(ops).toHaveLength(0)
  })

  it('ein Haufen jenseits des Randes kostet keinen Blit', () => {
    const rand = seeded(19)
    const field = createClusterField(999)
    const frame = frameFor(1920, 950)
    const c = spawnCluster(field, 'knot', frame, rand)
    c.age = CLUSTER_FADE_IN_SEC
    c.dist = frame.maxDist * 5
    const { ctx } = recordingCtx()
    expect(drawClusters(ctx, field, frame, 1)).toBe(0)
  })

  it('globalAlpha bleibt für den nächsten Block auf 1', () => {
    const rand = seeded(12)
    const field = createClusterField(999)
    const frame = frameFor(1920, 950)
    const c = spawnCluster(field, 'dense', frame, rand)
    c.age = CLUSTER_FADE_IN_SEC
    c.dist = frame.maxDist * 0.5
    const { ctx } = recordingCtx()
    drawClusters(ctx, field, frame, 1)
    expect(ctx.globalAlpha).toBe(1)
  })
})
