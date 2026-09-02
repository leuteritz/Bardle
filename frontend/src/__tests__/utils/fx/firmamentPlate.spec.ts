import { describe, it, expect } from 'vitest'
import { paintFirmament, paintFirmamentGround, paintFirmamentWeb } from '@/utils/fx/firmamentPlate'
import {
  FIRMAMENT_GATE_COLOR,
  FIRMAMENT_NODE_R_BASE,
  FIRMAMENT_NODE_R_PER_STAR,
  FIRMAMENT_PLATE_REF_R,
  FIRMAMENT_PLATE_SPRITE_MARGIN,
  FIRMAMENT_RIM_SPRITE_MARGIN,
  FIRMAMENT_STAR_ARC_ALPHA,
  FIRMAMENT_STAR_ARC_LOST_ALPHA,
  FIRMAMENT_STAR_ARC_ORBIT,
  FIRMAMENT_STAR_SEED,
  FIRMAMENT_WEB_INNER,
  FIRMAMENT_WEB_NODES,
  FIRMAMENT_WEB_OUTER,
} from '@/config/constants'
import { firmamentSpots } from '@/utils/ui/firmamentLayout'
import { hexToRgb } from '@/utils/ui/format'
import type { FirmamentNode } from '@/utils/ui/firmamentLayout'

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
  // Farben werden MITGESCHRIEBEN: „der Sternbogen ist gold" ist eine Aussage
  // ueber Bedeutung, nicht ueber Geometrie, und ohne sie waere sie nicht
  // pruefbar. `count()` liest Zuege an ihrer Klammer, Stilzeilen kollidieren
  // damit nicht.
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
    strokeRect: rec('strokeRect'),
    clearRect: rec('clearRect'),
    fill: rec('fill'),
    stroke: rec('stroke'),
    clip: rec('clip'),
    save: rec('save'),
    restore: rec('restore'),
    translate: rec('translate'),
    rotate: rec('rotate'),
    scale: rec('scale'),
    setLineDash: rec('setLineDash'),
    createRadialGradient: (...a: unknown[]) => {
      rec('createRadialGradient')(...a)
      return gradient
    },
    lineWidth: 1,
    lineCap: 'butt',
  } as unknown as CanvasRenderingContext2D
  Object.defineProperties(ctx, {
    fillStyle: style('fillStyle'),
    strokeStyle: style('strokeStyle'),
  })
  return { ctx, ops }
}

/* Die Karte geht in ein QUADRATISCHES Sprite um ihre eigene Mitte — dieselbe
   Bauart wie der Wall, weil sie mit der Wolke dreht. Buehnenfuellend schwenkte
   beim Drehen leere Flaeche ins Bild, sobald Zoom und Fahrt einen Teil nach
   draussen geschoben haben. */
const PLATE_R = 315
const PLATE_SIDE = Math.round(PLATE_R * 2 * FIRMAMENT_PLATE_SPRITE_MARGIN)
const BOX = { cx: PLATE_SIDE / 2, cy: PLATE_SIDE / 2, r: PLATE_R }
/** Der Ton des gezeigten Universums. Er steuert die Farbe des Walls, nie seine
 *  Geometrie — genau das binden die Zuege unten. */
const TINT = '#ff8a34'

function nodeAt(i: number, count: number, state: FirmamentNode['state']): FirmamentNode {
  const p = firmamentSpots(count)[i]
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
    paintFirmamentWeb(ctx, 334, 334, BOX.r, 1.05, TINT)
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
    paintFirmamentWeb(ctx, 334, 334, BOX.r, 1.05, TINT)
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
    paintFirmamentWeb(ctx, 334, 334, BOX.r, 1.05, TINT)
    const max = Math.max(...radii(ops))
    expect(max).toBeLessThanOrEqual(BOX.r * FIRMAMENT_WEB_OUTER + 0.01)
    expect(BOX.r * FIRMAMENT_WEB_OUTER).toBeLessThan(BOX.r * FIRMAMENT_RIM_SPRITE_MARGIN)
  })

  it('kriecht nicht unter den Innenrand des Bandes', () => {
    // Die aeussersten Bahnknoten stehen bei 0,96 r. Ein Saum, der tiefer geht,
    // legt sich ueber sie.
    const { ctx, ops } = recordingCtx()
    paintFirmamentWeb(ctx, 334, 334, BOX.r, 1.05, TINT)
    expect(Math.min(...radii(ops))).toBeGreaterThanOrEqual(BOX.r * FIRMAMENT_WEB_INNER - 0.01)
  })

  it('franst nach innen aus statt an einer Kante zu enden', () => {
    // Die Mehrzahl der Knoten liegt aussen, nur wenige reichen tief hinein —
    // gleichverteilt waere es wieder ein Band mit zwei Kanten.
    const { ctx, ops } = recordingCtx()
    paintFirmamentWeb(ctx, 334, 334, BOX.r, 1.05, TINT)
    const rs = radii(ops)
    const inner = rs.filter((r) => r < BOX.r * 0.9).length
    expect(inner).toBeGreaterThan(0)
    expect(inner / rs.length).toBeLessThan(0.5)
  })

  it('dreht um die MITTE des Kontexts, nicht um die Buehnenmitte', () => {
    // Der `transform-origin` des CSS ist die Mitte des Sprites; malte der Zug
    // um `box.cx/cy`, taumelte der Wall statt zu drehen.
    const { ctx, ops } = recordingCtx()
    paintFirmamentWeb(ctx, 334, 334, BOX.r, 1.05, TINT)
    expect(ops[0]).toBe('save()')
    expect(ops[1]).toBe('translate(334,334)')
  })

  it('bleibt bei gleichem Radius byte-gleich', () => {
    const a = recordingCtx()
    const b = recordingCtx()
    paintFirmamentWeb(a.ctx, 334, 334, BOX.r, 1.05, TINT)
    paintFirmamentWeb(b.ctx, 334, 334, BOX.r, 1.05, TINT)
    expect(a.ops).toEqual(b.ops)
  })

  /*
   * Der Ton sagt, WELCHES Universum — er darf nichts an der Form aendern. Zwei
   * Laeufe mit verschiedenem Tint muessen deshalb dieselbe Geometrie zeichnen
   * und sich ausschliesslich in den Farben unterscheiden. Waere es andersherum,
   * spraenge beim Universumswechsel das Gewebe.
   */
  it('aendert am Gewebe die FARBE, nie die Form', () => {
    // Auch die Lichtpunkte tragen den Ton — sie kommen als `fillStyle`.
    const isInk = (o: string) => o.startsWith('strokeStyle=') || o.startsWith('fillStyle=')
    const shape = (ops: string[]) => ops.filter((o) => !isInk(o))
    const ink = (ops: string[]) => ops.filter(isInk)

    const warm = recordingCtx()
    const cold = recordingCtx()
    paintFirmamentWeb(warm.ctx, 334, 334, BOX.r, 1.05, '#ff8a34')
    paintFirmamentWeb(cold.ctx, 334, 334, BOX.r, 1.05, '#4ea8c8')

    expect(shape(warm.ops)).toEqual(shape(cold.ops))
    expect(ink(warm.ops)).not.toEqual(ink(cold.ops))
    expect(ink(warm.ops).length).toBe(ink(cold.ops).length)
  })
})

describe('Firmament-Platte — die Karte liegt DARUEBER', () => {
  it('malt keinen deckenden Grund mehr', () => {
    // DER Fehler, den diese Spec fangen soll: ein `fillRect` ueber die volle
    // Buehne legte sich ueber Wall und Heldenscheibe, und beide waeren weg.
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, NODES, PLATE_SIDE, PLATE_SIDE, BOX, TINT)
    expect(count(ops, 'fillRect')).toBe(0)
    expect(ops[0]).toBe(`clearRect(0,0,${PLATE_SIDE},${PLATE_SIDE})`)
  })

  it('malt kein zweites Sternfeld', () => {
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, NODES, PLATE_SIDE, PLATE_SIDE, BOX, TINT)
    // Das Sternfeld waeren hunderte Marken; die Karte hat nur ihre Koerper.
    // Gezaehlt werden ZUEGE, nicht Zeilen — die Stilzeilen tragen keine Marke.
    expect(count(ops, 'fill') + count(ops, 'stroke')).toBeLessThan(60)
  })

  it('behaelt die zwei geschlossenen Wallringe', () => {
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, NODES, PLATE_SIDE, PLATE_SIDE, BOX, TINT)
    expect(ops.some((o) => o.startsWith(`arc(0,0,${Math.round(BOX.r * 0.985 * 100) / 100}`))).toBe(
      true,
    )
  })

  it('legt unter jeden sichtbaren Knoten einen Schattenteich', () => {
    // Die innersten Knoten liegen auf dem Galaxienfeld der Heldenscheibe, der
    // dritte sogar in ihrem Glutring — ein Leuchten auf einem Leuchten ist kein
    // Leuchten. Der Teich steht VOR Schein und Kern.
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, NODES, PLATE_SIDE, PLATE_SIDE, BOX, TINT)
    const pools = ops.filter((o) => o === 'addColorStop(0,rgba(6, 5, 4, 0.72))')
    const lit = NODES.filter((n) => n.state !== 'unlit').length
    expect(pools.length).toBe(lit)
  })

  it('malt den Ursprung NICHT mehr', () => {
    // Er ist entfallen: die Heldenscheibe bringt mit ihrem Kern denselben Ort
    // mit, und zwei Sonnen an derselben Stelle waeren eine doppelte Aussage.
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, NODES, PLATE_SIDE, PLATE_SIDE, BOX, TINT)
    expect(ops).not.toContain('addColorStop(0,rgba(255, 246, 214, 0.95))')
  })

  /* Der Ausgang eines Universums steht als grosses Portal im schwarzen Raum
     ausserhalb der Scheibe. Auf der Bahn war er ein 22-px-Chip fuer das
     groesste Ereignis, das ein Spielstand kennt — er darf nicht unbemerkt
     zurueckkehren, und die Torfarbe ist der Beleg. */
  /* Die Knoten liegen gestreut; ein Polygonzug daraus liest sich als Zickzack.
     Gerade bleibt nur der erste Abschnitt — er benennt den START. */
  it('zieht die Bahn in Boegen, den ersten Abschnitt gerade', () => {
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, NODES, PLATE_SIDE, PLATE_SIDE, BOX, TINT)
    expect(count(ops, 'quadraticCurveTo')).toBeGreaterThan(0)
    const i0 = ops.findIndex((o) => o.startsWith('moveTo('))
    expect(ops[i0]).toBe(`moveTo(${BOX.cx},${BOX.cy})`)
    expect(ops[i0 + 1].startsWith('lineTo(')).toBe(true)
  })

  it('malt kein Tor mehr auf die Bahn', () => {
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, NODES, PLATE_SIDE, PLATE_SIDE, BOX, TINT)
    const gate = hexToRgb(FIRMAMENT_GATE_COLOR).join(', ')
    expect(ops.some((o) => o.includes(gate))).toBe(false)
  })
})

/* ── Der Knoten ist ein KOERPER DESSELBEN FELDES ────────────────────────────
   Er wird gemalt wie die Galaxien der Wolke — eine geneigte Ellipse — nur
   groesser, heller und mit Kern. Der leuchtende Punkt mit rundem Halo und
   sieben Sternpips, der einmal hier stand, las sich daneben als Aufkleber, und
   bei vierzig Knoten waren die Pips 280 Marken.                              */

/** Die Boegen des Sternstands: alle `arc`-Zuege auf dem Bahnradius eines
 *  Knotens, mit Startwinkel, Sweep und der Farbe, die davor gesetzt wurde. */
function starArcs(ops: string[], bodyR: number, k: number) {
  const want = Math.round(bodyR * k * FIRMAMENT_STAR_ARC_ORBIT * 100) / 100
  const out: { start: number; sweep: number; color: string }[] = []
  // Die Farbe steht NACH dem Zug: der Pfad wird gelegt, dann gestrichen.
  let open: { start: number; sweep: number; color: string } | null = null
  for (const op of ops) {
    if (open && op.startsWith('strokeStyle=')) {
      open.color = op.slice(12)
      open = null
      continue
    }
    const m = /^arc\((.+)\)$/.exec(op)
    if (!m) continue
    const n = m[1].split(',').map(Number)
    if (Math.abs(n[2] - want) > 0.02) continue
    open = { start: n[3], sweep: n[4] - n[3], color: '' }
    out.push(open)
  }
  return out
}

describe('Firmament-Platte — die Knoten', () => {
  const K = BOX.r / FIRMAMENT_PLATE_REF_R

  it('malt jeden Knoten als ELLIPSE, nicht als Punkt', () => {
    // Der Rueckfall auf den Kreis waere sonst unbemerkt — er sieht im Code
    // nicht falsch aus, nur auf der Karte. Auch der unbeleuchtete traegt die
    // Form: ein gestrichelter Kreis waere die einzige runde Marke.
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, NODES, PLATE_SIDE, PLATE_SIDE, BOX, TINT)
    expect(count(ops, 'ellipse')).toBe(NODES.length)
  })

  it('sagt den Sternstand mit EINEM Bogen je Knoten, nicht mit sieben Pips', () => {
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, NODES, PLATE_SIDE, PLATE_SIDE, BOX, TINT)
    const arcs = starArcs(ops, 6, K)
    // Zwei voll befreite Knoten plus die laufende Galaxie — drei Boegen, nicht
    // dreimal drei Punkte.
    expect(arcs).toHaveLength(3)
    // Jeder beginnt OBEN: ein wanderndes Startende waere nicht ablesbar.
    for (const a of arcs) expect(a.start).toBeCloseTo(-Math.PI / 2, 2)
    const share = arcs.map((a) => a.sweep / (Math.PI * 2)).sort((x, y) => x - y)
    expect(share[0]).toBeCloseTo(1 / 3, 2)
    expect(share[1]).toBeCloseTo(1, 2)
    expect(share[2]).toBeCloseTo(1, 2)
  })

  it('haengt Verlorenes ROT an, statt es dazuzurechnen', () => {
    const node = { ...nodeAt(0, 2, 'freed'), stars: 4, rescued: 2, lost: 1 }
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, [node], PLATE_SIDE, PLATE_SIDE, BOX, TINT)
    const arcs = starArcs(ops, node.bodyR, K)
    expect(arcs).toHaveLength(2)
    // Gedaempftes Gold, damit sechsundzwanzig Ringe keine Medaillen werden —
    // Verlorenes steht hoeher, es ist selten und soll auffallen.
    expect(arcs[0].color).toBe(`rgba(232, 192, 64, ${FIRMAMENT_STAR_ARC_ALPHA})`)
    expect(arcs[1].color).toBe(`rgba(204, 96, 80, ${FIRMAMENT_STAR_ARC_LOST_ALPHA})`)
    expect(FIRMAMENT_STAR_ARC_LOST_ALPHA).toBeGreaterThan(FIRMAMENT_STAR_ARC_ALPHA)
    // Der rote schliesst an den goldenen an — nebeneinander, nicht uebereinander.
    expect(arcs[1].start).toBeCloseTo(arcs[0].start + arcs[0].sweep, 2)
    expect(arcs[0].sweep / (Math.PI * 2)).toBeCloseTo(0.5, 2)
    expect(arcs[1].sweep / (Math.PI * 2)).toBeCloseTo(0.25, 2)
  })

  it('laesst den offenen Rest LEER', () => {
    // Eine blasse Restspur gaebe jedem Knoten wieder eine geschlossene Kontur —
    // also genau den Aufkleber, der verschwinden soll.
    const node = { ...nodeAt(0, 2, 'freed'), stars: 5, rescued: 1, lost: 0 }
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, [node], PLATE_SIDE, PLATE_SIDE, BOX, TINT)
    expect(starArcs(ops, node.bodyR, K)).toHaveLength(1)
  })

  it('bleibt bei gleichem Bestand byte-gleich', () => {
    // Form und Neigung kommen aus der Galaxienummer, nie aus `Math.random()` —
    // sonst saehe die Karte nach jedem Repaint anders aus.
    const a = recordingCtx()
    const b = recordingCtx()
    paintFirmament(a.ctx, NODES, PLATE_SIDE, PLATE_SIDE, BOX, TINT)
    paintFirmament(b.ctx, NODES, PLATE_SIDE, PLATE_SIDE, BOX, TINT)
    expect(a.ops).toEqual(b.ops)
  })
})

/**
 * Der weiteste Punkt eines Zuges, gemessen von der Mitte der Platte.
 *
 * `translate` wird mitgefuehrt, `rotate` und `scale` bleiben unberuecksichtigt:
 * beide koennen den Abstand nur verkleinern oder gleich lassen, die Schranke
 * bleibt also gueltig — und sie ist konservativ, was fuer eine Wand richtig ist.
 */
function maxReach(ops: string[], box: { cx: number; cy: number }): number {
  let ox = 0
  let oy = 0
  const stack: [number, number][] = []
  let max = 0
  const at = (x: number, y: number, pad = 0) =>
    void (max = Math.max(max, Math.hypot(ox + x - box.cx, oy + y - box.cy) + pad))

  for (const op of ops) {
    const m = /^(\w+)\((.*)\)$/.exec(op)
    if (!m) continue
    const n = m[2].split(',').map(Number)
    switch (m[1]) {
      case 'save':
        stack.push([ox, oy])
        break
      case 'restore': {
        const p = stack.pop()
        if (p) [ox, oy] = p
        break
      }
      case 'translate':
        ox += n[0]
        oy += n[1]
        break
      case 'moveTo':
      case 'lineTo':
        at(n[0], n[1])
        break
      case 'quadraticCurveTo':
        at(n[0], n[1])
        at(n[2], n[3])
        break
      case 'arc':
        at(n[0], n[1], n[2])
        break
      case 'ellipse':
        at(n[0], n[1], Math.max(n[2], n[3]))
        break
      case 'createRadialGradient':
        at(n[3], n[4], n[5])
        break
      case 'strokeRect':
        at(n[0], n[1], Math.hypot(n[2], n[3]))
        break
    }
  }
  return max
}

describe('Firmament-Platte — die Sprite-Kante', () => {
  /** Der teuerste Fall: der volle Sterndeckel, also der groesste Koerper, auf
   *  jedem Platz der Bahn — samt Teich, Schein und vier Ortsrauten. */
  const WORST: FirmamentNode[] = Array.from({ length: 8 }, (_, i) => ({
    ...nodeAt(i, 8, 'freed'),
    stars: 7,
    rescued: 7,
    landfalls: 4,
    bodyR: FIRMAMENT_NODE_R_BASE + 7 * FIRMAMENT_NODE_R_PER_STAR,
  }))

  it('haelt jeden Zug innerhalb der Kante', () => {
    // DIE Wand: die Karte dreht. Was ueber die Sprite-Kante hinausragt, wandert
    // als abgeschnittener Rand durchs Bild — und das sieht man erst nach einer
    // halben Umdrehung.
    const { ctx, ops } = recordingCtx()
    paintFirmament(ctx, WORST, PLATE_SIDE, PLATE_SIDE, BOX, TINT)
    expect(maxReach(ops, BOX)).toBeLessThanOrEqual(BOX.r * FIRMAMENT_PLATE_SPRITE_MARGIN)
  })

  it('ist nicht groesser als noetig', () => {
    // Jeder Prozent darueber ist Textur fuer nichts — dieselbe Ablesung wie
    // beim Wall.
    expect(FIRMAMENT_PLATE_SPRITE_MARGIN).toBeLessThan(1.15)
  })
})
