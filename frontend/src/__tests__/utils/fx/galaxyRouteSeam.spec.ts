import { describe, it, expect } from 'vitest'
import { paintRouteTrail, paintRouteChevrons, type RoutePoints } from '@/utils/fx/galaxyPlate'
import {
  ROUTE_SEAM_COLOR,
  ROUTE_TRAIL_COLOR,
  ROUTE_ARROW_COLOR,
  ROUTE_ARROW_ALPHA_GAIN,
  ROUTE_ARROW_ALPHA_MAX,
  ROUTE_TRAIL_BANDS_LIVE,
} from '@/config/constants'

/**
 * Die geflogene Route steht auf 0,10 bis 0,16 Deckkraft — lesbar ist sie nur
 * durch den dunklen Saum darunter. Vier Dinge daran sind bindend, und jedes
 * bricht still: die Spur sähe weiter aus wie eine Spur, nur wieder unsichtbar.
 *
 * jsdom liefert für `getContext('2d')` `null`, ein rasternder Vergleich prüfte
 * dort nichts und sähe grün aus. Aufgezeichnet werden deshalb Zeichenbefehle —
 * und `stroke`/`fill` halten Farbe und Strichstärke des MOMENTS fest, an dem sie
 * fallen; als blosse Felder gelesen trügen sie immer den letzten Wert.
 */
function recordingCtx(): { ctx: CanvasRenderingContext2D; ops: string[] } {
  const ops: string[] = []
  const num = (v: number) => Math.round(v * 100) / 100
  const state = { strokeStyle: '', fillStyle: '', lineWidth: 1 }
  const rec =
    (name: string) =>
    (...args: unknown[]) => {
      ops.push(`${name}(${args.map((a) => (typeof a === 'number' ? num(a) : String(a))).join(',')})`)
    }
  const ctx = {
    beginPath: rec('beginPath'),
    closePath: rec('closePath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    save: rec('save'),
    restore: rec('restore'),
    stroke: () => ops.push(`stroke[${state.strokeStyle}|${num(state.lineWidth)}]`),
    fill: () => ops.push(`fill[${state.fillStyle}]`),
    set strokeStyle(v: string) {
      state.strokeStyle = v
    },
    set fillStyle(v: string) {
      state.fillStyle = v
    },
    set lineWidth(v: number) {
      state.lineWidth = v
    },
    lineCap: 'butt',
    lineJoin: 'miter',
  } as unknown as CanvasRenderingContext2D
  return { ctx, ops }
}

/** Ein Zug über `legs` Etappen, weit genug auseinander für Chevrons. */
function line(legs: number): RoutePoints {
  return Array.from({ length: legs + 1 }, (_, i) => [40 + i * 90, 60] as [number, number])
}

const seam = (op: string) => op.startsWith('stroke[') && op.includes(ROUTE_SEAM_COLOR)
const gold = (op: string) => op.startsWith('stroke[') && op.includes(ROUTE_TRAIL_COLOR)
const widthOf = (op: string) => Number(op.slice(op.lastIndexOf('|') + 1, -1))

describe('paintRouteTrail — der Saum trägt die Spur', () => {
  it('zieht jeden Saum vor jedem Goldzug', () => {
    const { ctx, ops } = recordingCtx()
    paintRouteTrail(ctx, line(6), { alpha: 0.16, hk: 1.75 })
    const lastSeam = ops.map(seam).lastIndexOf(true)
    const firstGold = ops.findIndex(gold)
    expect(lastSeam).toBeGreaterThanOrEqual(0)
    expect(firstGold).toBeGreaterThan(lastSeam)
  })

  it('bleibt EIN Zug, auch bei 37 Etappen', () => {
    const { ctx, ops } = recordingCtx()
    paintRouteTrail(ctx, line(37), { alpha: 0.16, hk: 1.75 })
    expect(ops.filter(seam)).toHaveLength(1)
  })

  it('ist breiter als die breiteste Goldetappe', () => {
    const { ctx, ops } = recordingCtx()
    paintRouteTrail(ctx, line(6), { alpha: 0.16, hk: 1.75 })
    const seamW = widthOf(ops.find(seam)!)
    const goldMax = Math.max(...ops.filter(gold).map(widthOf))
    expect(seamW).toBeGreaterThan(goldMax)
  })

  it('quantisiert das Gold auf die Bänder, ohne den Saum zu vervielfachen', () => {
    const { ctx, ops } = recordingCtx()
    paintRouteTrail(ctx, line(37), {
      alpha: 0.55,
      hk: 1.25,
      bands: ROUTE_TRAIL_BANDS_LIVE,
    })
    expect(ops.filter(gold).length).toBeLessThanOrEqual(ROUTE_TRAIL_BANDS_LIVE)
    expect(ops.filter(seam)).toHaveLength(1)
  })

  it('zeichnet bei weniger als zwei Punkten gar nichts', () => {
    const { ctx, ops } = recordingCtx()
    paintRouteTrail(ctx, [[10, 10]], { alpha: 0.16, hk: 1.75 })
    expect(ops).toHaveLength(0)
  })
})

describe('paintRouteChevrons — gefülltes Dreieck statt offenem Winkel', () => {
  const opts = { alpha: 0.16, hk: 1.75, gap: 21, size: 8 }

  it('schliesst den Pfad und zieht ihn zweimal: Saumkontur, dann Gold', () => {
    const { ctx, ops } = recordingCtx()
    paintRouteChevrons(ctx, line(3), opts)
    expect(ops.filter((o) => o === 'closePath()')).toHaveLength(3)
    const strokeAt = ops.findIndex(seam)
    const fillAt = ops.findIndex((o) => o.startsWith('fill['))
    expect(strokeAt).toBeGreaterThanOrEqual(0)
    expect(fillAt).toBeGreaterThan(strokeAt)
    expect(ops[fillAt]).toContain(ROUTE_ARROW_COLOR)
  })

  it('baut EINEN Pfad für alle Chevrons', () => {
    const { ctx, ops } = recordingCtx()
    paintRouteChevrons(ctx, line(12), opts)
    expect(ops.filter((o) => o === 'beginPath()')).toHaveLength(1)
    expect(ops.filter((o) => o.startsWith('stroke['))).toHaveLength(1)
    expect(ops.filter((o) => o.startsWith('fill['))).toHaveLength(1)
  })

  it('deckelt die Deckkraft, damit das Archivstandbild nicht auf 1 springt', () => {
    const { ctx, ops } = recordingCtx()
    paintRouteChevrons(ctx, line(2), { ...opts, alpha: 0.55 })
    expect(ops.find((o) => o.startsWith('fill['))).toContain(ROUTE_ARROW_ALPHA_MAX.toFixed(3))
  })

  it('folgt darunter der Route-Deckkraft', () => {
    const { ctx, ops } = recordingCtx()
    paintRouteChevrons(ctx, line(2), opts)
    const erwartet = (0.16 * ROUTE_ARROW_ALPHA_GAIN).toFixed(3)
    expect(ops.find((o) => o.startsWith('fill['))).toContain(erwartet)
  })

  it('lässt gecullte Etappen aus, ohne den Zug abzubrechen', () => {
    const { ctx, ops } = recordingCtx()
    paintRouteChevrons(ctx, line(4), { ...opts, cull: (x) => x < 200 })
    expect(ops.filter((o) => o === 'closePath()').length).toBeLessThan(4)
    expect(ops.filter((o) => o.startsWith('stroke['))).toHaveLength(1)
  })

  it('überspringt Etappen, die zu kurz für das Zeichen sind', () => {
    const { ctx, ops } = recordingCtx()
    const eng: RoutePoints = [
      [0, 0],
      [12, 0],
      [24, 0],
    ]
    paintRouteChevrons(ctx, eng, opts)
    expect(ops.filter((o) => o === 'closePath()')).toHaveLength(0)
  })
})
