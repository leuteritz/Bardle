import { describe, it, expect } from 'vitest'
import {
  jitter,
  paintCloudGround,
  universeDiscDetail,
  universeDiscSpinSec,
  paintCore,
  paintDustVeil,
  paintGalaxyField,
  paintVoid,
  paintWebRim,
  universeDiscKey,
} from '@/utils/fx/universeDisc'
import { universes } from '@/config/progression/universes'
import {
  FIRMAMENT_FREED_COLOR,
  FIRMAMENT_HERE_COLOR,
  UNIVERSE_DISC_GALAXIES,
  UNIVERSE_DISC_RIM_ARCS,
  UNIVERSE_DISC_RIM_INNER,
  UNIVERSE_DISC_RIM_OUTER,
  UNIVERSE_DISC_CLOUD_FADE_FROM,
  UNIVERSE_DISC_CLOUD_REACH,
  UNIVERSE_DISC_RAIL_PX,
  UNIVERSE_DISC_SPIN_SEC,
} from '@/config/constants'

/**
 * Ein Canvas-Kontext, der nur mitschreibt.
 *
 * jsdom liefert für `getContext('2d')` `null` — ein rasternder Vergleich prüfte
 * dort nichts und sähe trotzdem grün aus. Dieselbe Lösung wie in
 * `landfallSprite.spec.ts`.
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
    fill: rec('fill'),
    stroke: rec('stroke'),
    clip: rec('clip'),
    save: rec('save'),
    restore: rec('restore'),
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

const R = 17

describe('Universumsscheibe — die Ebenen', () => {
  it('jede Ebene malt überhaupt etwas', () => {
    // Ein Zweig, der still nichts malt, fällt sonst niemandem auf: die Scheibe
    // stünde einfach leer da und sähe nach Absicht aus.
    const layers: [string, () => string[]][] = [
      [
        'void',
        () => {
          const { ctx, ops } = recordingCtx()
          paintVoid(ctx, R, R, R)
          return ops
        },
      ],
      [
        'dust',
        () => {
          const { ctx, ops } = recordingCtx()
          paintDustVeil(ctx, R, R, R, '#9b5cd6')
          return ops
        },
      ],
      [
        'field',
        () => {
          const { ctx, ops } = recordingCtx()
          paintGalaxyField(ctx, R, R, R, '#9b5cd6', 2)
          return ops
        },
      ],
      [
        'core',
        () => {
          const { ctx, ops } = recordingCtx()
          paintCore(ctx, R, R, R, 'current')
          return ops
        },
      ],
      [
        'rim',
        () => {
          const { ctx, ops } = recordingCtx()
          paintWebRim(ctx, R, R, R, 'current')
          return ops
        },
      ],
    ]
    for (const [name, run] of layers) {
      expect(run().length, `${name} malt nichts`).toBeGreaterThan(2)
    }
  })

  it('das Feld setzt genau eine Galaxie je Platz', () => {
    const { ctx, ops } = recordingCtx()
    paintGalaxyField(ctx, R, R, R, '#9b5cd6', 4)
    expect(ops.filter((o) => o.startsWith('ellipse(')).length).toBe(UNIVERSE_DISC_GALAXIES)
  })

  it('das Feld bleibt innerhalb des Walls', () => {
    // Eine Galaxie im Wall läge auf der Glut und wäre nicht mehr zu sehen.
    const { ctx, ops } = recordingCtx()
    paintGalaxyField(ctx, R, R, R, '#9b5cd6', 6)
    for (const op of ops.filter((o) => o.startsWith('ellipse('))) {
      const [x, y] = op.slice(8, -1).split(',').map(Number)
      const d = Math.hypot((x ?? 0) - R, (y ?? 0) - R)
      expect(d).toBeLessThan(R * UNIVERSE_DISC_RIM_INNER)
    }
  })

  it('der Wall liegt zwischen seinen beiden Anteilen', () => {
    const { ctx, ops } = recordingCtx()
    paintWebRim(ctx, R, R, R, 'current')
    const arcs = ops.filter((o) => o.startsWith('arc(')).map((o) => Number(o.split(',')[2]))
    // Der erste Bogen ist der Glutverlauf über die volle Scheibe.
    const rim = arcs.slice(1)
    expect(rim.length).toBe(UNIVERSE_DISC_RIM_ARCS)
    for (const rad of rim) {
      expect(rad).toBeGreaterThanOrEqual(R * UNIVERSE_DISC_RIM_INNER - 0.01)
      expect(rad).toBeLessThanOrEqual(R * UNIVERSE_DISC_RIM_OUTER + 0.01)
    }
  })

  it('der Kern trägt die Zustandsfarbe der Karte, keine eigene', () => {
    // Zwei Farben, die der Spieler im Firmament ohnehin schon liest — ein
    // dritter Ton dafür wäre eine zweite Sprache für dieselbe Auskunft.
    const here = recordingCtx()
    paintCore(here.ctx, R, R, R, 'current')
    const freed = recordingCtx()
    paintCore(freed.ctx, R, R, R, 'walked')
    const rgbOf = (hex: string) => {
      const n = parseInt(hex.slice(1), 16)
      return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
    }
    expect(here.ops.join('|')).toContain(rgbOf(FIRMAMENT_HERE_COLOR))
    expect(freed.ops.join('|')).toContain(rgbOf(FIRMAMENT_FREED_COLOR))
    expect(here.ops.join('|')).not.toBe(freed.ops.join('|'))
  })

  it('der erloschene Wall ist derselbe Wall, nur kalt', () => {
    // `unlit` ist keine abgedunkelte Vollscheibe, sondern eine leere — der Wall
    // steht trotzdem, sonst wäre die Zeile ein Loch statt eines Universums.
    // Er trägt dieselbe Struktur, nur ohne Glut.
    const lit = recordingCtx()
    paintWebRim(lit.ctx, R, R, R, 'walked')
    const dark = recordingCtx()
    paintWebRim(dark.ctx, R, R, R, 'unlit')
    const arcsOf = (ops: string[]) => ops.filter((o) => o.startsWith('arc(')).length
    expect(arcsOf(dark.ops)).toBe(arcsOf(lit.ops))
    expect(arcsOf(lit.ops)).toBe(UNIVERSE_DISC_RIM_ARCS + 1)
    // Die Glut gehört dem betretenen Universum allein; erloschen bleibt ein
    // kalter Saum, damit die Scheibe nicht als Loch liest.
    expect(lit.ops.join('|')).toContain('rgba(255, 146, 72')
    expect(dark.ops.join('|')).not.toContain('rgba(255, 146, 72')
    expect(dark.ops.join('|')).toContain('rgba(122, 108, 80')
  })
})

describe('Universumsscheibe — die zwei Ebenen', () => {
  /* Die Trennung ist der ganze Grund, warum es zwei Canvas gibt: Feld und Wall
     drehen sich verschieden schnell, und eine Textur hat nur eine Drehung.
     Rutscht eine Ebene in die falsche Haelfte, dreht sie mit dem falschen Tempo
     — und das faellt am Bild nicht auf, weil beide sehr langsam sind. */

  it('das Feld malt keinen Wallbogen', () => {
    const { ctx, ops } = recordingCtx()
    paintVoid(ctx, R, R, R)
    paintDustVeil(ctx, R, R, R, '#9b5cd6')
    paintGalaxyField(ctx, R, R, R, '#9b5cd6', 3)
    paintCore(ctx, R, R, R, 'current')
    // Der Wall setzt als einziger Striche.
    expect(ops.filter((o) => o.startsWith('stroke('))).toHaveLength(0)
  })

  it('der Wall malt keine Galaxie und keinen Kern', () => {
    const { ctx, ops } = recordingCtx()
    paintWebRim(ctx, R, R, R, 'current')
    // Galaxien sind das einzige, was als Ellipse gesetzt wird.
    expect(ops.filter((o) => o.startsWith('ellipse('))).toHaveLength(0)
    // Und der Kern ist der einzige, der die Hier-Farbe traegt.
    const n = parseInt(FIRMAMENT_HERE_COLOR.slice(1), 16)
    expect(ops.join('|')).not.toContain(`${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`)
  })

  it('der Wall füllt die Scheibe nicht deckend — sonst verdeckt er das Feld', () => {
    // Er liegt OBEN. Jede seiner Flaechen muss durchscheinen.
    const { ctx, ops } = recordingCtx()
    paintWebRim(ctx, R, R, R, 'walked')
    for (const op of ops.filter((o) => o.startsWith('addColorStop('))) {
      expect(op).toMatch(/rgba\(/)
    }
  })
})

describe('Universumsscheibe — Determinismus und Schlüssel', () => {
  it('dieselbe ID malt dasselbe Feld', () => {
    const a = recordingCtx()
    paintGalaxyField(a.ctx, R, R, R, '#9b5cd6', 3)
    const b = recordingCtx()
    paintGalaxyField(b.ctx, R, R, R, '#9b5cd6', 3)
    expect(a.ops).toEqual(b.ops)
  })

  it('jedes Universum bekommt ein eigenes Feld', () => {
    // Zehn gleich aussehende Scheiben wären schlechter als zehn Glyphen.
    const seen = new Set<string>()
    for (const u of universes) {
      const { ctx, ops } = recordingCtx()
      paintGalaxyField(ctx, R, R, R, u.tint, u.id)
      seen.add(ops.join('|'))
    }
    expect(seen.size).toBe(universes.length)
  })

  it('jitter ist zustandslos und reihenfolgeunabhängig', () => {
    const straight = [0, 1, 2, 3].map((i) => jitter(7, i))
    const shuffled = [3, 1, 0, 2].map((i) => jitter(7, i))
    expect(shuffled).toEqual([straight[3], straight[1], straight[0], straight[2]])
  })

  it('der Schlüssel trennt Universum, Zustand, Ebene, Größe und dpr', () => {
    const base = universeDiscKey(3, 'current', 'orb', 'field', 34, 2)
    expect(universeDiscKey(4, 'current', 'orb', 'field', 34, 2)).not.toBe(base)
    expect(universeDiscKey(3, 'walked', 'orb', 'field', 34, 2)).not.toBe(base)
    expect(universeDiscKey(3, 'current', 'orb', 'rim', 34, 2)).not.toBe(base)
    expect(universeDiscKey(3, 'current', 'orb', 'field', 46, 2)).not.toBe(base)
    expect(universeDiscKey(3, 'current', 'orb', 'field', 34, 1)).not.toBe(base)
    // Die VARIANTE trennt: ohne sie bekaeme die Wolke bei gleicher Kantenlaenge
    // das Sprite der Kachel, und nichts daran saehe falsch aus.
    expect(universeDiscKey(3, 'current', 'cloud', 'field', 34, 2)).not.toBe(base)
    expect(universeDiscKey(3, 'current', 'orb', 'field', 34, 2)).toBe(base)
  })
})

describe('Universumsscheibe — Tempo und Dichte haengen an der KANTENLAENGE', () => {
  it('haelt die Leiste als Basis beider Regeln', () => {
    // Bei der gemessenen Rail-Scheibe ist alles unveraendert: dieselbe Dauer,
    // dieselbe Zahl Galaxien, dieselben Marken. Waere das nicht so, aenderte
    // sich mit der Heldenscheibe still auch die Leiste.
    expect(universeDiscSpinSec(UNIVERSE_DISC_RAIL_PX)).toBe(UNIVERSE_DISC_SPIN_SEC)
    expect(universeDiscDetail(UNIVERSE_DISC_RAIL_PX)).toBe(1)
  })

  it('traegt auf der grossen Scheibe mehr und KLEINERE Marken', () => {
    // Ohne das waere die 180-px-Scheibe die 34-px-Scheibe, 5,3-fach
    // vergroessert: achtzehn Galaxien mit 5,8 bis 13,5 px Halbachse. Das liest
    // sich als Kleckse, und zwar in der Mitte der Buehne.
    const small = recordingCtx()
    const big = recordingCtx()
    paintGalaxyField(small.ctx, 17, 17, 17, '#c8b890', 3)
    paintGalaxyField(big.ctx, 90, 90, 90, '#c8b890', 3)

    const rx = (ops: string[]) =>
      ops.filter((o) => o.startsWith('ellipse(')).map((o) => Number(o.split(',')[2]))
    const a = rx(small.ops)
    const b = rx(big.ops)

    // Die Scheibe ist 5,3-mal so gross, traegt aber mehr als dreimal so viele
    // Galaxien — und jede einzelne misst hoechstens das Dreifache statt des
    // 5,3-fachen.
    expect(b.length).toBeGreaterThan(a.length * 3)
    expect(Math.max(...b)).toBeLessThan(Math.max(...a) * 3.5)
  })

  it('verdichtet den Wall genauso', () => {
    const small = recordingCtx()
    const big = recordingCtx()
    paintWebRim(small.ctx, 17, 17, 17, 'walked')
    paintWebRim(big.ctx, 90, 90, 90, 'walked')
    const arcs = (ops: string[]) => ops.filter((o) => o.startsWith('arc(')).length
    expect(arcs(big.ops)).toBeGreaterThan(arcs(small.ops) * 3)
  })

  it('bleibt deterministisch, auch verdichtet', () => {
    // Der Hash haengt am INDEX, nicht an einem Strom — eine andere Zahl Marken
    // verschiebt also keine bestehende.
    const a = recordingCtx()
    const b = recordingCtx()
    paintGalaxyField(a.ctx, 90, 90, 90, '#c8b890', 5)
    paintGalaxyField(b.ctx, 90, 90, 90, '#c8b890', 5)
    expect(a.ops).toEqual(b.ops)
  })
})

/**
 * Die Wolke — die grosse Scheibe in der Mitte der Buehne.
 *
 * Sie war einmal die Kachel der Leiste, nur gross: mit Glutring, deckendem Grund
 * und harter Clipkante. Der Nutzer hat auf zwei Dinge gezeigt — die Koerper
 * klumpten und endeten bei 80 % des Radius, und der Ring las sich als Kruste um
 * eine Kachel. Beides bindet dieser Block.
 */
describe('Universumsscheibe — die Wolke hat keinen Rand', () => {
  const R = 90
  const fieldOf = (id: number, layer: 'field' | 'rim') => {
    const { ctx, ops } = recordingCtx()
    paintGalaxyField(ctx, R, R, R, '#c8b890', id, 'cloud', layer)
    return ops
  }
  const field = (layer: 'field' | 'rim' = 'field') => fieldOf(3, layer)
  /** Die Ellipsen als Punkte relativ zur Mitte. */
  const bodies = (ops: string[]) =>
    ops
      .filter((o) => o.startsWith('ellipse('))
      .map((o) => {
        const n = o.slice(8, -1).split(',').map(Number)
        return { x: n[0] - R, y: n[1] - R, rx: n[2], rad: Math.hypot(n[0] - R, n[1] - R) }
      })

  it('malt keinen Glutring', () => {
    // Er ist braun-orange wie der aeussere Karten-Wall; zwei konzentrische Ringe
    // derselben Farbe lasen sich als Rahmen statt als Blick in den Raum.
    const ops = [...field('field'), ...field('rim')]
    expect(ops.filter((o) => o === 'stroke()')).toHaveLength(0)
    expect(ops.join('|')).not.toContain('255, 180, 94')
  })

  it('malt einen Grund, der auf null auslaeuft', () => {
    // `paintVoid` waere hier falsch: sein deckender Kreis IST die Kante.
    const { ctx, ops } = recordingCtx()
    paintCloudGround(ctx, R, R, R)
    expect(ops.some((o) => o.endsWith('0))'))).toBe(true)
    expect(ops.join('|')).not.toContain('#14110a')
  })

  it('verteilt die Koerper gleichmaessig ueber alle acht Sektoren', () => {
    // DAS war die Beschwerde. Gebunden wird die SPANNE zwischen vollstem und
    // leerstem Sektor, nicht bloss „keiner leer": ueber die zehn Universen
    // gemessen lag sie mit dem alten Hash-Winkel bei 1,89 bis 5,00, mit dem
    // goldenen bei 1,27 bis 1,67. Ein Test auf „hoechstens doppelt" haette den
    // alten Zustand durchgelassen — genau den, den der Nutzer gemeldet hat.
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const both = [
        ...bodies(fieldOf(id, 'field')),
        ...bodies(fieldOf(id, 'rim')),
      ]
      const sectors = new Array(8).fill(0)
      for (const b of both) {
        const a = Math.atan2(b.y, b.x) + Math.PI
        sectors[Math.min(7, Math.floor((a / (2 * Math.PI)) * 8))]++
      }
      expect(Math.min(...sectors), `Universum ${id}: leerer Sektor`).toBeGreaterThan(0)
      expect(Math.max(...sectors) / Math.min(...sectors), `Universum ${id}`).toBeLessThan(1.9)
    }
  })

  it('verteilt sie FLAECHENgleich, nicht zur Mitte gezogen', () => {
    // Mit dem alten `t^0,6` lagen ueber alle Universen 34 bis 38 % im halben
    // Radius, mit der Wurzel 23 bis 26 % — flaechengleich waeren es genau 25.
    // Die Schranke liegt zwischen den beiden Messreihen, nicht darum herum.
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const both = [
        ...bodies(fieldOf(id, 'field')),
        ...bodies(fieldOf(id, 'rim')),
      ]
      const inner = both.filter((b) => b.rad < (R * UNIVERSE_DISC_CLOUD_REACH) / 2).length
      const share = inner / both.length
      expect(share, `Universum ${id}`).toBeGreaterThan(0.19)
      expect(share, `Universum ${id}`).toBeLessThan(0.3)
    }
  })

  it('reicht weiter als die Kachel und bleibt im Inkreis', () => {
    // Weiter, weil kein Ring mehr im Weg ist — aber unter 1, sonst wanderte beim
    // Drehen eine Ecke des Quadrats ins Bild.
    const all = [...bodies(field('field')), ...bodies(field('rim'))]
    const far = Math.max(...all.map((b) => b.rad))
    expect(far).toBeGreaterThan(R * (UNIVERSE_DISC_RIM_INNER - 0.07))
    expect(far).toBeLessThan(R * UNIVERSE_DISC_CLOUD_REACH * 1.09)
    expect(far).toBeLessThan(R)
  })

  it('blendet nach aussen aus, statt an einer Kante zu enden', () => {
    // Das ist es, was „randlos" herstellt: nicht das Fehlen einer Linie, sondern
    // eine Dichte, die vorher endet.
    const ops = field('field')
    const alpha = ops
      .filter((o) => o.startsWith('ellipse(') || o.startsWith('addColorStop('))
      .join('|')
    const all = bodies(ops)
    const reach = R * UNIVERSE_DISC_CLOUD_REACH
    const fadeAt = reach * UNIVERSE_DISC_CLOUD_FADE_FROM
    const outer = all.filter((b) => b.rad > fadeAt)
    const innerBodies = all.filter((b) => b.rad <= fadeAt)
    expect(outer.length).toBeGreaterThan(0)
    // Die aeusseren Koerper sind kleiner als die inneren.
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    expect(avg(outer.map((b) => b.rx))).toBeLessThan(avg(innerBodies.map((b) => b.rx)))
    expect(alpha.length).toBeGreaterThan(0)
  })

  it('teilt sich in eine nahe und eine ferne Schicht', () => {
    // Die Parallaxe wandert vom Ring in die Tiefe: wenige grosse nah, viele
    // kleine fern. Kein Koerper sitzt zweimal.
    const near = bodies(field('field'))
    const far = bodies(field('rim'))
    expect(near.length).toBeGreaterThan(0)
    expect(far.length).toBeGreaterThan(near.length)
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    expect(avg(near.map((b) => b.rx))).toBeGreaterThan(avg(far.map((b) => b.rx)))
  })

  it('mischt beide Schichten ueber den VOLLEN Radius', () => {
    // Der Fehler, den diese Zusicherung faengt: `fieldSpot` leitet den Radius
    // aus dem Index ab. Wer die Schichten bei `i / count` schneidet, legt damit
    // alle nahen Koerper nach innen und alle fernen nach aussen — eine Radius-
    // statt einer Tiefenteilung, und die Parallaxe waere keine.
    const reach = R * UNIVERSE_DISC_CLOUD_REACH
    for (const layer of ['field', 'rim'] as const) {
      const b = bodies(field(layer))
      const inner = b.filter((x) => x.rad < reach * 0.4).length
      const outer = b.filter((x) => x.rad > reach * 0.7).length
      expect(inner, `${layer}: nichts innen`).toBeGreaterThan(0)
      expect(outer, `${layer}: nichts aussen`).toBeGreaterThan(0)
    }
  })

  it('bleibt deterministisch', () => {
    expect(field('field')).toEqual(field('field'))
  })
})
