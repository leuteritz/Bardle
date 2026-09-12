import { describe, expect, it } from 'vitest'
import {
  UNIVERSE_HOP_TUNNEL_RINGS,
  UNIVERSE_HOP_TUNNEL_SLICES,
  UNIVERSE_HOP_TUNNEL_STRANDS,
  UNIVERSE_HOP_WALL_FIBERS,
} from '@/config/constants'
import {
  createWormholeTunnel,
  drawWormholeBody,
  drawWormholeTunnel,
  paintWormholeWall,
  wormholeBendAt,
  wormholeGroupShift,
  wormholePalette,
  wormholeWallAlphaAt,
  type WormholeFrame,
} from '@/utils/fx/wormholeTunnel'
import { hexToRgb } from '@/utils/ui/format'
import { recordingCtx } from '../../helpers/recordingCtx'

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function lum(triple: string): number {
  const [r, g, b] = triple.split(',').map((v) => Number(v))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function frame(over: Partial<WormholeFrame> = {}): WormholeFrame {
  return {
    bx: 1200,
    by: 400,
    w: 1920,
    h: 950,
    far: 1400,
    tunnelSec: 2.3,
    twist: 0.4,
    trailFade: 0.22,
    tubeAlpha: 1,
    exitLight: 1,
    exitR: 180,
    ...over,
  }
}

describe('wormholeTunnel — Palette', () => {
  it('leitet vier Töne aus dem Zielton ab: dunkel < Ton < hell < Kern', () => {
    for (const hex of ['#4fa85e', '#e02828', '#a8e8f8', '#dcd8b0']) {
      const p = wormholePalette(hex)
      expect(p.mid).toBe(hexToRgb(hex).join(', '))
      expect(lum(p.deep)).toBeLessThan(lum(p.mid))
      expect(lum(p.mid)).toBeLessThan(lum(p.bright))
      expect(lum(p.bright)).toBeLessThan(lum(p.core))
    }
  })

  it('würfelt je Sprung Stränge über den ganzen Kreis', () => {
    const t = createWormholeTunnel('#4ea8c8', seeded(5))
    expect(t.az.length).toBe(UNIVERSE_HOP_TUNNEL_STRANDS)
    let maxGap = 0
    for (let i = 1; i < t.az.length; i++) maxGap = Math.max(maxGap, t.az[i]! - t.az[i - 1]!)
    expect(maxGap).toBeLessThan(((Math.PI * 2) / UNIVERSE_HOP_TUNNEL_STRANDS) * 2)
    expect(t.exit).toBeNull()
  })
})

describe('wormholeTunnel — Geometrie', () => {
  it('biegt die Achse: fern am Fokus, nah an der Bildmitte, dazwischen ausgebaucht', () => {
    expect(wormholeBendAt(0)).toBe(0)
    expect(wormholeBendAt(1)).toBeCloseTo(1, 9)
    expect(wormholeBendAt(0.5)).toBeGreaterThan(0.5)
  })

  it('setzt die Gruppe auf den Anker der Achse und schlingert quer dazu', () => {
    const out = { x: 0, y: 0 }
    wormholeGroupShift(400, 0, 0, 900, 0, out)
    expect(out.x).toBe(0)
    expect(out.y).toBe(0)
    wormholeGroupShift(400, 0, 0, 900, 1, out)
    // Nur ein Nachziehen: unter 10 % des Fokusabstands — die Kamera folgt dem Spieler.
    expect(out.x).toBeGreaterThan(4)
    expect(out.x).toBeLessThan(40)
    expect(out.y).toBeCloseTo(0, 9)
    const along = out.x
    wormholeGroupShift(400, 0, 0.35, 900, 1, out)
    expect(out.x).toBeCloseTo(along, 9)
    expect(Math.abs(out.y)).toBeGreaterThan(10)
    wormholeGroupShift(400, 0, 0.35, 900, 0.5, out)
    expect(out.x).toBeCloseTo(along / 2, 9)
  })

  it('legt die Scheiben auf die gebogene Achse — exponentiell wachsend', () => {
    const t = createWormholeTunnel('#4ea8c8', seeded(9))
    const { ctx } = recordingCtx()
    const f = frame()
    drawWormholeTunnel(ctx, t, f)
    const s = UNIVERSE_HOP_TUNNEL_SLICES
    expect(t.sx[0]).toBeCloseTo(f.bx, 6)
    expect(t.sy[0]).toBeCloseTo(f.by, 6)
    expect(t.sx[s - 1]).toBeCloseTo(f.w / 2, 6)
    expect(t.sy[s - 1]).toBeCloseTo(f.h / 2, 6)
    for (let k = 1; k < s; k++) expect(t.sr[k]).toBeGreaterThan(t.sr[k - 1]! * 1.05)
  })
})

describe('wormholeTunnel — Zeichenbudget', () => {
  it('zeichnet je Frame ein Budget aus Pfaden, keinen Verlauf je Strand, und räumt den Dash ab', () => {
    const t = createWormholeTunnel('#a84ce0', seeded(11))
    const { ctx, ops } = recordingCtx()
    drawWormholeBody(ctx, t, frame())
    drawWormholeTunnel(ctx, t, frame())
    const count = (name: string) => ops.filter((o) => o.startsWith(`${name}(`)).length
    // Stränge: zwei Pässe × zwei Segmente; Rippen: ein Bogen je Ring.
    expect(count('stroke')).toBe(UNIVERSE_HOP_TUNNEL_STRANDS * 4 + UNIVERSE_HOP_TUNNEL_RINGS)
    expect(count('arc')).toBe(UNIVERSE_HOP_TUNNEL_RINGS)
    // Körper, Hof und Ausgangslicht: je EIN fillRect; ohne DOM keine Wand-Sprites.
    expect(count('fillRect')).toBe(3)
    expect(count('drawImage')).toBe(0)
    expect(ctx.globalCompositeOperation).toBe('source-over')
    // Der Verlauf des Ausgangslichts wird EINMAL gebaut und gecacht.
    expect(count('createRadialGradient')).toBe(1)
    expect(t.exit).not.toBeNull()
    drawWormholeTunnel(ctx, t, frame({ tunnelSec: 2.4 }))
    expect(count('createRadialGradient')).toBe(1)
    expect(count('createLinearGradient')).toBe(0)
    // Dash wird gesetzt und wieder gelöscht.
    const dashOps = ops.filter((o) => o.startsWith('setLineDash('))
    expect(dashOps[dashOps.length - 1]).toBe('setLineDash()')
    expect(ctx.lineDashOffset).toBe(0)
    expect(ctx.globalAlpha).toBe(1)
  })

  it('zeichnet die Wand je Scheibe als EIN Sprite, additiv, fern heller als nah', () => {
    const t = createWormholeTunnel('#a84ce0', seeded(11))
    t.wall = {} as HTMLCanvasElement
    const { ctx, ops } = recordingCtx()
    drawWormholeTunnel(ctx, t, frame())
    const draws = ops.filter((o) => o.startsWith('drawImage('))
    expect(draws.length).toBe(UNIVERSE_HOP_TUNNEL_SLICES - 1)
    expect(ctx.globalCompositeOperation).toBe('source-over')
    expect(wormholeWallAlphaAt(0)).toBeGreaterThan(wormholeWallAlphaAt(1))
    expect(wormholeWallAlphaAt(1)).toBeGreaterThan(0)
  })

  it('backt die Wand als weichen Ring mit Lichtfasern, ohne shadowBlur', () => {
    const { ctx, ops } = recordingCtx()
    paintWormholeWall(ctx, 256, 256, wormholePalette('#4ea8c8'), seeded(3))
    const count = (name: string) => ops.filter((o) => o.startsWith(`${name}(`)).length
    expect(count('createRadialGradient')).toBe(1)
    expect(count('fillRect')).toBe(1)
    expect(count('stroke')).toBe(UNIVERSE_HOP_WALL_FIBERS)
    expect(ctx.globalCompositeOperation).toBe('source-over')
    expect(ctx.globalAlpha).toBe(1)
    expect((ctx as unknown as { shadowBlur?: number }).shadowBlur).toBeUndefined()
  })

  it('zeigt das Ende erst am Ende: ohne exitLight kein Ausgangs-Fill, keine Verlaufsanlage', () => {
    const t = createWormholeTunnel('#a84ce0', seeded(11))
    const { ctx, ops } = recordingCtx()
    drawWormholeBody(ctx, t, frame({ exitLight: 0 }))
    drawWormholeTunnel(ctx, t, frame({ exitLight: 0 }))
    const count = (name: string) => ops.filter((o) => o.startsWith(`${name}(`)).length
    expect(count('fillRect')).toBe(1)
    expect(count('createRadialGradient')).toBe(0)
    expect(count('stroke')).toBe(UNIVERSE_HOP_TUNNEL_STRANDS * 4 + UNIVERSE_HOP_TUNNEL_RINGS)
    expect(ctx.globalAlpha).toBe(1)
    expect(ctx.globalCompositeOperation).toBe('source-over')
  })

  it('zeichnet vor dem Einblenden nichts', () => {
    const t = createWormholeTunnel('#a84ce0', seeded(11))
    const { ctx, ops } = recordingCtx()
    drawWormholeBody(ctx, t, frame({ tubeAlpha: 0 }))
    drawWormholeTunnel(ctx, t, frame({ tubeAlpha: 0 }))
    expect(ops.length).toBe(0)
  })

  it('setzt keinen shadowBlur und keinen filter', () => {
    const t = createWormholeTunnel('#a84ce0', seeded(11))
    const { ctx } = recordingCtx()
    drawWormholeTunnel(ctx, t, frame())
    expect((ctx as unknown as { shadowBlur?: number }).shadowBlur).toBeUndefined()
    expect((ctx as unknown as { filter?: string }).filter).toBeUndefined()
  })
})
