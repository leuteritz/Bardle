import { describe, it, expect } from 'vitest'
import { paintFirmament, paintFirmamentGround, paintFirmamentWeb } from '@/utils/fx/firmamentPlate'
import {
  FIRMAMENT_RIM_SPRITE_MARGIN,
  FIRMAMENT_STAR_SEED,
  FIRMAMENT_WEB_INNER,
  FIRMAMENT_WEB_NODES,
  FIRMAMENT_WEB_OUTER,
} from '@/config/constants'
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

const count = (ops: string[], name: string) => ops.filter((o) => o.startsWith(`${name}(`)).length

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

/** Jeder gemalte Punkt, relativ zur Mitte — der Zug `translate`t als Erstes,
 *  also ist jede folgende Koordinate direkt ein Radius. */
function points(ops: string[]): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (const op of ops) {
    const m = /^(moveTo|lineTo|quadraticCurveTo|arc)\((.+)\)$/.exec(op)
    if (!m) continue
    const n = m[2].split(',').map(Number)
    if (m[1] === 'quadraticCurveTo') out.push({ x: n[0], y: n[1] }, { x: n[2], y: n[3] })
    else out.push({ x: n[0], y: n[1] })
  }
  return out
}

const radii = (ops: string[]) => points(ops).map((p) => Math.hypot(p.x, p.y))

describe('Firmament-Platte — der drehende Wall', () => {
  it('webt ein NETZ: Straenge, Ranken und Lichtpunkte aus einem Knotensatz', () => {
    const { ctx, ops } = recordingCtx()
    paintFirmamentWeb(ctx, 334, 334, BOX.r, 1.05)
    // Ein Strang je Knoten ist der Boden; dazu die zweiten Straenge und die
    // Ranken. Der alte Bogenkranz hatte genau einen Zug je Bogen.
    expect(count(ops, 'quadraticCurveTo')).toBeGreaterThanOrEqual(FIRMAMENT_WEB_NODES)
    expect(count(ops, 'stroke')).toBeGreaterThan(FIRMAMENT_WEB_NODES)
    expect(count(ops, 'fill')).toBeGreaterThan(0)
  })

  it('malt keinen geschlossenen Ring mit', () => {
    // Ein rotationssymmetrischer Kreis traegt keine Drehung — im Sprite kostete
    // er nur Flaeche, und das Sprite muesste fuer ihn bis an seine Kante decken.
    // Geprueft wird der RADIUS: die Lichtpunkte sind auch `arc`.
    const { ctx, ops } = recordingCtx()
    paintFirmamentWeb(ctx, 334, 334, BOX.r, 1.05)
    const rings = ops
      .filter((o) => o.startsWith('arc('))
      .map((o) => Number(o.slice(4, -1).split(',')[2]))
    expect(rings.every((r) => r < BOX.r * 0.5)).toBe(true)
  })

  it('bleibt innerhalb der Sprite-Kante', () => {
    // DIE Wand: das Sprite reicht bis `FIRMAMENT_RIM_SPRITE_MARGIN`. Ein Faden
    // darueber hinaus wandert beim Drehen als abgeschnittene Kante durchs Bild
    // — und das sieht man erst nach einer halben Umdrehung.
    const { ctx, ops } = recordingCtx()
    paintFirmamentWeb(ctx, 334, 334, BOX.r, 1.05)
    const max = Math.max(...radii(ops))
    expect(max).toBeLessThanOrEqual(BOX.r * FIRMAMENT_WEB_OUTER + 0.01)
    expect(BOX.r * FIRMAMENT_WEB_OUTER).toBeLessThan(BOX.r * FIRMAMENT_RIM_SPRITE_MARGIN)
  })

  it('kriecht nicht unter den Innenrand des Bandes', () => {
    // Die aeussersten Bahnknoten stehen bei 0,96 r. Ein Saum, der tiefer geht,
    // legt sich ueber sie.
    const { ctx, ops } = recordingCtx()
    paintFirmamentWeb(ctx, 334, 334, BOX.r, 1.05)
    expect(Math.min(...radii(ops))).toBeGreaterThanOrEqual(BOX.r * FIRMAMENT_WEB_INNER - 0.01)
  })

  it('franst nach innen aus statt an einer Kante zu enden', () => {
    // Die Mehrzahl der Knoten liegt aussen, nur wenige reichen tief hinein —
    // gleichverteilt waere es wieder ein Band mit zwei Kanten.
    const { ctx, ops } = recordingCtx()
    paintFirmamentWeb(ctx, 334, 334, BOX.r, 1.05)
    const rs = radii(ops)
    const inner = rs.filter((r) => r < BOX.r * 0.9).length
    expect(inner).toBeGreaterThan(0)
    expect(inner / rs.length).toBeLessThan(0.5)
  })

  it('dreht um die MITTE des Kontexts, nicht um die Buehnenmitte', () => {
    // Der `transform-origin` des CSS ist die Mitte des Sprites; malte der Zug
    // um `box.cx/cy`, taumelte der Wall statt zu drehen.
    const { ctx, ops } = recordingCtx()
    paintFirmamentWeb(ctx, 334, 334, BOX.r, 1.05)
    expect(ops[0]).toBe('save()')
    expect(ops[1]).toBe('translate(334,334)')
  })

  it('bleibt bei gleichem Radius byte-gleich', () => {
    const a = recordingCtx()
    const b = recordingCtx()
    paintFirmamentWeb(a.ctx, 334, 334, BOX.r, 1.05)
    paintFirmamentWeb(b.ctx, 334, 334, BOX.r, 1.05)
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
