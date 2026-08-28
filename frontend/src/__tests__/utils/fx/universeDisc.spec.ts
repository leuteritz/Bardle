import { describe, it, expect } from 'vitest'
import {
  jitter,
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
    const base = universeDiscKey(3, 'current', 'field', 34, 2)
    expect(universeDiscKey(4, 'current', 'field', 34, 2)).not.toBe(base)
    expect(universeDiscKey(3, 'walked', 'field', 34, 2)).not.toBe(base)
    expect(universeDiscKey(3, 'current', 'rim', 34, 2)).not.toBe(base)
    expect(universeDiscKey(3, 'current', 'field', 46, 2)).not.toBe(base)
    expect(universeDiscKey(3, 'current', 'field', 34, 1)).not.toBe(base)
    expect(universeDiscKey(3, 'current', 'field', 34, 2)).toBe(base)
  })
})
