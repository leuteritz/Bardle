import { describe, it, expect } from 'vitest'
import {
  paintFirmament,
  paintFirmamentGround,
  paintFirmamentRimArcs,
} from '@/utils/fx/firmamentPlate'
import { FIRMAMENT_RIM_ARCS, FIRMAMENT_STAR_SEED } from '@/config/constants'
import { firmamentPointAt } from '@/utils/ui/firmamentLayout'
import type { FirmamentGate, FirmamentNode } from '@/utils/ui/firmamentLayout'

/**
 * Der Schnitt der Firmament-Karte in drei Zuege — und warum er gebunden gehoert.
 *
 * Grund und Wall liegen UNTER der Karte und drehen sich (der Wall) bzw. stehen
 * still (der Grund). Malte die Karte weiterhin einen deckenden Hintergrund,
 * waeren beide unsichtbar — und nichts daran saehe im Code falsch aus. Genau
 * dieser Fehler wird hier gefangen.
 *
 * jsdom liefert fuer `getContext('2d')` `null`, ein rasternder Vergleich pruefte
 * also nichts und saehe gruen aus. Aufgezeichnet werden ZEICHENBEFEHLE, dieselbe
 * Loesung wie in `universeDisc.spec.ts` und `landfallSprite.spec.ts`.
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
  const ctx = {
    beginPath: rec('beginPath'),
    arc: rec('arc'),
    ellipse: rec('ellipse'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    quadraticCurveTo: rec('quadraticCurveTo'),
    rect: rec('rect'),
    fillRect: rec('fillRect'),
    strokeRect: rec('strokeRect'),
    clearRect: rec('clearRect'),
    fill: rec('fill'),
    stroke: rec('stroke'),
    clip: rec('clip'),
    save: rec('save'),
    restore: rec('restore'),
    translate: rec('translate'),
    rotate: rec('rotate'),
    setLineDash: rec('setLineDash'),
    createRadialGradient: (...a: unknown[]) => {
      rec('createRadialGradient')(...a)
      return gradient
    },
    lineWidth: 1,
    lineCap: 'butt',
    fillStyle: '',
    strokeStyle: '',
  } as unknown as CanvasRenderingContext2D
  return { ctx, ops }
}

const BOX = { cx: 500, cy: 345, r: 315 }

function nodeAt(i: number, count: number, state: FirmamentNode['state']): FirmamentNode {
  const p = firmamentPointAt(count > 1 ? i / (count - 1) : 0)
  return {
    galaxy: i + 1,
    state,
    themeIndex: state === 'unlit' ? -1 : 0,
    stars: 3,
    rescued: state === 'freed' ? 3 : 1,
    lost: 0,
    landfalls: 1,
    bodyR: 6,
    nx: p.nx,
    ny: p.ny,
    angle: p.angle,
  } as FirmamentNode
}

const NODES: FirmamentNode[] = [
  nodeAt(0, 4, 'freed'),
  nodeAt(1, 4, 'freed'),
  nodeAt(2, 4, 'current'),
  nodeAt(3, 4, 'unlit'),
]

const GATES: FirmamentGate[] = [
  { universe: 2, afterIndex: 1, nx: NODES[1].nx, ny: NODES[1].ny, angle: 0 } as FirmamentGate,
]

const count = (ops: string[], name: string) =>
  ops.filter((o) => o.startsWith(`${name}(`)).length

describe('Firmament-Platte — der Grund', () => {
  it('malt Flaeche und Sternfeld', () => {
    const { ctx, ops } = recordingCtx()
    paintFirmamentGround(ctx, 1002, 690, FIRMAMENT_STAR_SEED)
    // Ein deckendes Rechteck plus viele kleine Sternmarken.
    expect(count(ops, 'fillRect')).toBeGreaterThan(50)
    expect(count(ops, 'createRadialGradient')).toBe(1)
  })

  it('malt KEINE Bahn und keine Koerper', () => {
    const { ctx, ops } = recordingCtx()
    paintFirmamentGround(ctx, 1002, 690, FIRMAMENT_STAR_SEED)
    expect(count(ops, 'lineTo')).toBe(0)
    expect(count(ops, 'arc')).toBe(0)
  })

  it('haengt am Seed, nicht am Zufall', () => {
    const a = recordingCtx()
    const b = recordingCtx()
    paintFirmamentGround(a.ctx, 1002, 690, FIRMAMENT_STAR_SEED)
    paintFirmamentGround(b.ctx, 1002, 690, FIRMAMENT_STAR_SEED)
    expect(a.ops).toEqual(b.ops)
  })
})

describe('Firmament-Platte — der drehende Wall', () => {
  it('malt genau die Boegen', () => {
    const { ctx, ops } = recordingCtx()
    paintFirmamentRimArcs(ctx, 334, 334, BOX.r, 1.05)
    expect(count(ops, 'quadraticCurveTo')).toBe(FIRMAMENT_RIM_ARCS)
    expect(count(ops, 'stroke')).toBe(FIRMAMENT_RIM_ARCS)
  })

  it('malt die zwei geschlossenen Ringe NICHT mit', () => {
    // Ein rotationssymmetrischer Kreis traegt keine Drehung — im Sprite kostete
    // er nur Flaeche, und das Sprite muesste fuer ihn bis an seine Kante decken.
    const { ctx, ops } = recordingCtx()
    paintFirmamentRimArcs(ctx, 334, 334, BOX.r, 1.05)
    expect(count(ops, 'arc')).toBe(0)
  })

  it('dreht um die MITTE des Kontexts, nicht um die Buehnenmitte', () => {
    // Der `transform-origin` des CSS ist die Mitte des Sprites; malte der Zug
    // um `box.cx/cy`, taumelte der Wall statt zu drehen.
    const { ctx, ops } = recordingCtx()
    paintFirmamentRimArcs(ctx, 334, 334, BOX.r, 1.05)
    expect(ops[0]).toBe('save()')
    expect(ops[1]).toBe('translate(334,334)')
  })

  it('bleibt bei gleichem Radius byte-gleich', () => {
    const a = recordingCtx()
    const b = recordingCtx()
    paintFirmamentRimArcs(a.ctx, 334, 334, BOX.r, 1.05)
    paintFirmamentRimArcs(b.ctx, 334, 334, BOX.r, 1.05)
    expect(a.ops).toEqual(b.ops)
  })
})

describe('Firmament-Platte — die Karte liegt DARUEBER', () => {
  it('malt keinen deckenden Grund mehr', () => {
    // DER Fehler, den diese Spec fangen soll: ein `fillRect` ueber die volle
    // Buehne legte sich ueber Wall und Heldenscheibe, und beide waeren weg.
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, NODES, GATES, 1002, 690, BOX)
    expect(count(ops, 'fillRect')).toBe(0)
    expect(ops[0]).toBe('clearRect(0,0,1002,690)')
  })

  it('malt kein zweites Sternfeld', () => {
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, NODES, GATES, 1002, 690, BOX)
    // Das Sternfeld waeren hunderte Marken; die Karte hat nur ihre Koerper.
    expect(ops.length).toBeLessThan(200)
  })

  it('behaelt die zwei geschlossenen Wallringe', () => {
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, NODES, GATES, 1002, 690, BOX)
    expect(ops.some((o) => o.startsWith(`arc(0,0,${Math.round(BOX.r * 0.985 * 100) / 100}`))).toBe(
      true,
    )
  })

  it('legt unter jeden sichtbaren Knoten einen Schattenteich', () => {
    // Die innersten Knoten liegen auf dem Galaxienfeld der Heldenscheibe, der
    // dritte sogar in ihrem Glutring — ein Leuchten auf einem Leuchten ist kein
    // Leuchten. Der Teich steht VOR Schein und Kern.
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, NODES, GATES, 1002, 690, BOX)
    const pools = ops.filter((o) => o === 'addColorStop(0,rgba(6, 5, 4, 0.72))')
    const lit = NODES.filter((n) => n.state !== 'unlit').length
    expect(pools.length).toBe(lit)
  })

  it('malt den Ursprung NICHT mehr', () => {
    // Er ist entfallen: die Heldenscheibe bringt mit ihrem Kern denselben Ort
    // mit, und zwei Sonnen an derselben Stelle waeren eine doppelte Aussage.
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, NODES, GATES, 1002, 690, BOX)
    expect(ops).not.toContain('addColorStop(0,rgba(255, 246, 214, 0.95))')
  })
})
