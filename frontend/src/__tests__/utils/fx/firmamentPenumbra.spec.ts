import { describe, it, expect } from 'vitest'
import { paintFirmamentGround } from '@/utils/fx/firmamentPlate'
import {
  FIRMAMENT_GATE_COLOR,
  FIRMAMENT_PENUMBRA_ALPHA_MAX,
  FIRMAMENT_PENUMBRA_BANDS_MAX,
  FIRMAMENT_PENUMBRA_BANDS_MIN,
  FIRMAMENT_PENUMBRA_BLUR_PASSES,
  FIRMAMENT_PENUMBRA_DAMP_IN,
  FIRMAMENT_PENUMBRA_DAMP_OUT,
  FIRMAMENT_PENUMBRA_FLOW_DEG,
  FIRMAMENT_PENUMBRA_GROUND,
  FIRMAMENT_PENUMBRA_MOTE_ALPHA,
  FIRMAMENT_PENUMBRA_MOTE_RATIO_MAX,
  FIRMAMENT_PENUMBRA_MOTES_MAX,
  FIRMAMENT_PENUMBRA_SEED,
  FIRMAMENT_PENUMBRA_SEED_JITTER,
  FIRMAMENT_PENUMBRA_WAVES,
  FIRMAMENT_PLATE_SPRITE_MARGIN,
} from '@/config/constants'
import { firmamentFitBox } from '@/utils/ui/firmamentLayout'
import { hexToRgb } from '@/utils/ui/format'

/**
 * Der Grund des Firmaments ist die Penumbra: Stroeme in EINER Richtung, hinter
 * der Scheibe hindurch, leise genug fuer die Portalschrift, ohne Sterne und ohne
 * Ring. jsdom rastert nicht — aufgezeichnet werden ZEICHENBEFEHLE, wie in
 * `firmamentPlate.spec.ts`.
 */
function recordingCtx(): { ctx: CanvasRenderingContext2D; ops: string[] } {
  const ops: string[] = []
  const num = (v: number) => Math.round(v * 100) / 100
  const rec =
    (name: string) =>
    (...args: unknown[]) => {
      ops.push(
        `${name}(${args.map((a) => (typeof a === 'number' ? num(a) : String(a))).join(',')})`,
      )
    }
  const gradient = { addColorStop: rec('addColorStop') }
  const style = (name: string) => ({
    get: () => '',
    set: (v: unknown) => void ops.push(`${name}=${String(v)}`),
  })
  const ctx = {
    beginPath: rec('beginPath'),
    arc: rec('arc'),
    ellipse: rec('ellipse'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    quadraticCurveTo: rec('quadraticCurveTo'),
    rect: rec('rect'),
    fillRect: rec('fillRect'),
    clearRect: rec('clearRect'),
    fill: rec('fill'),
    stroke: rec('stroke'),
    save: rec('save'),
    restore: rec('restore'),
    translate: rec('translate'),
    createRadialGradient: (...a: unknown[]) => {
      rec('createRadialGradient')(...a)
      return gradient
    },
    lineCap: 'butt',
    lineJoin: 'miter',
  } as unknown as CanvasRenderingContext2D
  Object.defineProperties(ctx, {
    fillStyle: style('fillStyle'),
    strokeStyle: style('strokeStyle'),
    lineWidth: style('lineWidth'),
  })
  return { ctx, ops }
}

const W = 1002
const H = 690
const FIT = firmamentFitBox(W, H)

const count = (ops: string[], name: string) => ops.filter((o) => o.startsWith(`${name}(`)).length
const args = (op: string) => op.slice(op.indexOf('(') + 1, -1).split(',').map(Number)
const alphaOf = (style: string) => {
  const m = /rgba\([^)]*,\s*([\d.]+)\)/.exec(style)
  return m ? Number(m[1]) : 1
}

/** Jede Polyline: `moveTo` beginnt, `lineTo` haengt an. */
function polylines(ops: string[]): { x: number; y: number }[][] {
  const out: { x: number; y: number }[][] = []
  for (const op of ops) {
    if (op.startsWith('moveTo(')) {
      const [x, y] = args(op)
      out.push([{ x, y }])
    } else if (op.startsWith('lineTo(')) {
      const [x, y] = args(op)
      out[out.length - 1].push({ x, y })
    }
  }
  return out
}

function segments(ops: string[]): { x: number; y: number; dx: number; dy: number }[] {
  const out: { x: number; y: number; dx: number; dy: number }[] = []
  for (const line of polylines(ops)) {
    for (let i = 1; i < line.length; i++) {
      const dx = line[i].x - line[i - 1].x
      const dy = line[i].y - line[i - 1].y
      const m = Math.hypot(dx, dy) || 1
      out.push({ x: line[i - 1].x, y: line[i - 1].y, dx: dx / m, dy: dy / m })
    }
  }
  return out
}

const deg = (rad: number) => (rad * 180) / Math.PI
const angleDiff = (a: number, b: number) => {
  let d = a - b
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

function paint(w = W, h = H, seed = FIRMAMENT_PENUMBRA_SEED): string[] {
  const { ctx, ops } = recordingCtx()
  paintFirmamentGround(ctx, w, h, seed)
  return ops
}

describe('Penumbra — deckt und stroemt', () => {
  it('EIN deckendes Rechteck im Grundton, darauf Baender in drei Zuegen', () => {
    const ops = paint()
    const fills = ops.filter((o) => o.startsWith('fillRect('))
    expect(fills).toEqual([`fillRect(0,0,${W},${H})`])
    expect(ops[ops.indexOf(fills[0]) - 1]).toBe(`fillStyle=${FIRMAMENT_PENUMBRA_GROUND}`)
    const strokes = count(ops, 'stroke')
    expect(strokes % FIRMAMENT_PENUMBRA_BLUR_PASSES.length).toBe(0)
    const bands = strokes / FIRMAMENT_PENUMBRA_BLUR_PASSES.length
    expect(bands).toBeGreaterThanOrEqual(FIRMAMENT_PENUMBRA_BANDS_MIN)
    expect(bands).toBeLessThanOrEqual(FIRMAMENT_PENUMBRA_BANDS_MAX)
  })

  it('malt keine Sterne, keine Bahn und keinen Ring', () => {
    const ops = paint()
    expect(count(ops, 'arc')).toBe(0)
    expect(count(ops, 'quadraticCurveTo')).toBe(0)
    const grads = ops.filter((o) => o.startsWith('createRadialGradient('))
    expect(grads).toHaveLength(1)
    const g = args(grads[0])
    expect(g[0]).toBeCloseTo(FIT.cx, 1)
    expect(g[1]).toBeCloseTo(FIT.cy, 1)
    expect(g[2]).toBeCloseTo(FIT.r * FIRMAMENT_PENUMBRA_DAMP_IN, 1)
    expect(g[5]).toBeCloseTo(FIT.r * FIRMAMENT_PENUMBRA_DAMP_OUT, 1)
    // Ein konzentrisches Muster laege bei ~1: fast jedes Segment tangential.
    const segs = segments(ops)
    const tangential = segs.filter((s) => {
      const rx = s.x - FIT.cx
      const ry = s.y - FIT.cy
      const m = Math.hypot(rx, ry) || 1
      return Math.abs((s.dx * rx + s.dy * ry) / m) < 0.2
    })
    expect(tangential.length / segs.length).toBeLessThan(0.35)
  })

  it('folgt EINER Richtung, aber nicht als Gerade', () => {
    const segs = segments(paint())
    const sumA = FIRMAMENT_PENUMBRA_WAVES.reduce((s, w) => s + w[1], 0)
    const reach = deg(Math.atan(sumA)) + 2
    const diffs = segs.map((s) => angleDiff(deg(Math.atan2(s.dy, s.dx)), FIRMAMENT_PENUMBRA_FLOW_DEG))
    const within = diffs.filter((d) => Math.abs(d) <= reach).length / diffs.length
    expect(within).toBeGreaterThanOrEqual(0.95)
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length
    expect(Math.abs(mean)).toBeLessThan(8)
    const bent = diffs.filter((d) => Math.abs(d) > 5).length / diffs.length
    expect(bent).toBeGreaterThanOrEqual(0.1)
  })

  it('jedes Band beginnt und endet ausserhalb der Buehne', () => {
    const outside = (p: { x: number; y: number }) => p.x < 0 || p.x > W || p.y < 0 || p.y > H
    for (const line of polylines(paint())) {
      expect(line.length).toBeGreaterThan(10)
      expect(outside(line[0])).toBe(true)
      expect(outside(line[line.length - 1])).toBe(true)
    }
  })
})

describe('Penumbra — leise Tinte', () => {
  it('kein Strich ueber der Decke, keine Mote ueber ihrer', () => {
    const ops = paint()
    const strokes = ops.filter((o) => o.startsWith('strokeStyle='))
    expect(strokes.length).toBeGreaterThan(0)
    for (const s of strokes) expect(alphaOf(s)).toBeLessThanOrEqual(FIRMAMENT_PENUMBRA_ALPHA_MAX)
    const fills = ops.filter((o) => o.startsWith('fillStyle=rgba'))
    for (const f of fills) expect(alphaOf(f)).toBeLessThanOrEqual(FIRMAMENT_PENUMBRA_MOTE_ALPHA)
  })

  it('traegt keine Farbe mit Bedeutung', () => {
    const ops = paint().join('\n')
    expect(ops.includes('232, 192, 64')).toBe(false)
    expect(ops.includes('104, 192, 168')).toBe(false)
    expect(ops.includes(hexToRgb(FIRMAMENT_GATE_COLOR).join(', '))).toBe(false)
  })

  it('der Auslauf zur Platte laeuft auf null aus', () => {
    const ops = paint()
    const [r, g, b] = hexToRgb(FIRMAMENT_PENUMBRA_GROUND)
    const stops = ops.filter((o) => o.startsWith('addColorStop('))
    expect(stops).toHaveLength(2)
    expect(stops[0]).toContain(`rgba(${r}, ${g}, ${b}, `)
    expect(stops[1]).toBe(`addColorStop(1,rgba(${r}, ${g}, ${b}, 0))`)
  })
})

describe('Penumbra — Motes sind Koerper', () => {
  it('geneigte Ellipsen, nie rund, nur jenseits des Auslaufs', () => {
    const motes = paint().filter((o) => o.startsWith('ellipse('))
    expect(motes.length).toBeGreaterThan(0)
    expect(motes.length).toBeLessThanOrEqual(FIRMAMENT_PENUMBRA_MOTES_MAX)
    for (const m of motes) {
      const [x, y, rx, ry] = args(m)
      expect(ry / rx).toBeLessThanOrEqual(FIRMAMENT_PENUMBRA_MOTE_RATIO_MAX + 0.01)
      expect(Math.hypot(x - FIT.cx, y - FIT.cy)).toBeGreaterThanOrEqual(
        FIT.r * FIRMAMENT_PENUMBRA_DAMP_OUT - 0.01,
      )
    }
  })
})

describe('Penumbra — Determinismus und Kosten', () => {
  it('haengt am Seed, nicht am Zufall', () => {
    expect(paint()).toEqual(paint())
    expect(paint(W, H, FIRMAMENT_PENUMBRA_SEED + 1)).not.toEqual(paint())
  })

  it('kostet auf der grossen Buehne nicht mehr Baender', () => {
    const small = paint()
    const big = paint(2600, 1400)
    expect(count(big, 'stroke') / FIRMAMENT_PENUMBRA_BLUR_PASSES.length).toBeLessThanOrEqual(
      FIRMAMENT_PENUMBRA_BANDS_MAX,
    )
    expect(count(big, 'lineTo')).toBeLessThanOrEqual(count(small, 'lineTo') * 2)
  })
})

describe('Penumbra — Konstanten', () => {
  it('die Wellen kehren nie um', () => {
    expect(FIRMAMENT_PENUMBRA_WAVES.reduce((s, w) => s + w[1], 0)).toBeLessThan(1)
  })

  it('die Zuege laufen von aussen nach innen', () => {
    const p = FIRMAMENT_PENUMBRA_BLUR_PASSES
    for (let i = 1; i < p.length; i++) {
      expect(p[i][0]).toBeLessThan(p[i - 1][0])
      expect(p[i][1]).toBeGreaterThan(p[i - 1][1])
    }
    expect(p[p.length - 1]).toEqual([1, 1])
  })

  it('der Auslauf beginnt an der Plattenkante und die Tinte bleibt leise', () => {
    expect(FIRMAMENT_PENUMBRA_DAMP_IN).toBe(FIRMAMENT_PLATE_SPRITE_MARGIN)
    expect(FIRMAMENT_PENUMBRA_DAMP_OUT).toBeGreaterThan(FIRMAMENT_PENUMBRA_DAMP_IN)
    expect(FIRMAMENT_PENUMBRA_ALPHA_MAX).toBeLessThanOrEqual(0.12)
    expect(FIRMAMENT_PENUMBRA_SEED_JITTER).toBeLessThanOrEqual(0.6)
  })
})
