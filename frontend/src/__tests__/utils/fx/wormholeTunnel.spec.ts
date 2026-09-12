import { describe, expect, it } from 'vitest'
import {
  UNIVERSE_HOP_CAM_BACK,
  UNIVERSE_HOP_TUNNEL_ENTRY_LEG,
  UNIVERSE_HOP_TUNNEL_SLICES,
  UNIVERSE_HOP_TUNNEL_SQUASH_MIN,
  UNIVERSE_HOP_TUNNEL_STRANDS,
  UNIVERSE_HOP_TUNNEL_Z_NEAR,
  UNIVERSE_HOP_WALL_FIBERS,
} from '@/config/constants'
import {
  createWormholeTunnel,
  drawWormholeBody,
  drawWormholeTunnel,
  paintWormholeWall,
  projectWormholeSlices,
  ringSquash,
  wormholePalette,
  type WormholeFrame,
} from '@/utils/fx/wormholeTunnel'
import {
  buildWormholePath,
  createWormholeView,
  projectWormholeView,
  type WormholePath,
  type WormholeView,
} from '@/utils/orbit/wormholePath'
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

let cachedPath: WormholePath | null = null
function viewAt(s: number): WormholeView {
  cachedPath ??= buildWormholePath(seeded(5))
  const view = createWormholeView()
  projectWormholeView(cachedPath, s, view)
  return view
}

function frame(over: Partial<WormholeFrame> = {}): WormholeFrame {
  return {
    w: 1920,
    h: 950,
    focal: 800,
    view: viewAt(UNIVERSE_HOP_CAM_BACK),
    tunnelSec: 2.3,
    twist: 0.2,
    trailFade: 0.22,
    tubeAlpha: 1,
    exitLight: 1,
    peek: null,
    peekPx: 512,
    peekSpan: 820,
    ...over,
  }
}

function visibleSlices(view: WormholeView): number {
  let n = 0
  for (let k = 0; k < view.n; k++)
    if (view.cz[k]! >= UNIVERSE_HOP_TUNNEL_Z_NEAR && view.fog[k]! > 0) n++
  return n
}

function visibleRibs(view: WormholeView): number {
  let n = 0
  for (let i = 0; i < view.ribN; i++) if (view.ribZ[i]! >= UNIVERSE_HOP_TUNNEL_Z_NEAR) n++
  return n
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
    expect(t.px.length).toBe(UNIVERSE_HOP_TUNNEL_STRANDS * UNIVERSE_HOP_TUNNEL_SLICES)
  })
})

describe('wormholeTunnel — Projektion', () => {
  it('legt die Scheiben perspektivisch ins Bild: auf der Geraden mittig, nah gross, fern klein', () => {
    const t = createWormholeTunnel('#4ea8c8', seeded(9))
    const f = frame()
    projectWormholeSlices(t, f)
    let seen = 0
    let straight = 0
    for (let k = 0; k < UNIVERSE_HOP_TUNNEL_SLICES; k++) {
      if (t.sr[k]! <= 0) continue
      seen++
      expect(t.sr[k]).toBeCloseTo(f.focal / f.view.cz[k]!, 6)
      // Auf der Einstiegsgeraden: mittig und mit der Tiefe kleiner; dahinter biegt die Bahn ab.
      if (f.view.cz[k]! >= UNIVERSE_HOP_TUNNEL_ENTRY_LEG) continue
      straight++
      expect(t.sx[k]).toBeCloseTo(f.w / 2, 0)
      expect(t.sy[k]).toBeCloseTo(f.h / 2, 0)
      if (k > 0 && t.sr[k - 1]! > 0) expect(t.sr[k]).toBeLessThan(t.sr[k - 1]!)
    }
    expect(seen).toBeGreaterThan(UNIVERSE_HOP_TUNNEL_SLICES / 2)
    expect(straight).toBeGreaterThan(2)
  })

  it('lässt Scheiben hinter der Kamera und jenseits des Ausgangs aus', () => {
    const t = createWormholeTunnel('#4ea8c8', seeded(9))
    const view = viewAt(UNIVERSE_HOP_CAM_BACK)
    view.cz[3] = -0.5
    view.fog[5] = 0
    projectWormholeSlices(t, frame({ view }))
    expect(t.sr[3]).toBe(0)
    expect(t.sr[5]).toBe(0)
    expect(t.sr[4]).toBeGreaterThan(0)
  })

  it('quetscht schräg gesehene Ringe zur Ellipse — nie flacher als der Boden', () => {
    expect(ringSquash(0, 0, 5, 0, 0, 1)).toBeCloseTo(1, 9)
    expect(ringSquash(0, 0, 5, 1, 0, 0)).toBe(UNIVERSE_HOP_TUNNEL_SQUASH_MIN)
    expect(ringSquash(0, 0, 5, Math.SQRT1_2, 0, Math.SQRT1_2)).toBeCloseTo(Math.SQRT1_2, 6)
    // In einer Ecke liegt mindestens eine Scheibe schräg.
    cachedPath ??= buildWormholePath(seeded(5))
    const arc = cachedPath.segs.find((g) => g.yaw !== 0 || g.pitch !== 0)!
    const t = createWormholeTunnel('#4ea8c8', seeded(9))
    projectWormholeSlices(t, frame({ view: viewAt(arc.s0 - 1) }))
    let minSq = 1
    for (let k = 0; k < UNIVERSE_HOP_TUNNEL_SLICES; k++)
      if (t.sr[k]! > 0) minSq = Math.min(minSq, t.sq[k]!)
    expect(minSq).toBeLessThan(0.8)
  })
})

describe('wormholeTunnel — Zeichenbudget', () => {
  it('zeichnet je Frame ein Budget aus Pfaden, keinen Verlauf je Strand, und räumt den Dash ab', () => {
    const t = createWormholeTunnel('#a84ce0', seeded(11))
    const { ctx, ops } = recordingCtx()
    const f = frame({ view: viewAt(cachedPath!.length - 2) })
    drawWormholeBody(ctx, t, f)
    drawWormholeTunnel(ctx, t, f)
    const count = (name: string) => ops.filter((o) => o.startsWith(`${name}(`)).length
    const ribs = visibleRibs(f.view)
    // Stränge: zwei Pässe × zwei Segmente; Rippen: eine Ellipse je Ring.
    expect(count('stroke')).toBe(UNIVERSE_HOP_TUNNEL_STRANDS * 4 + ribs)
    expect(count('ellipse')).toBe(ribs)
    expect(count('arc')).toBe(1)
    expect(count('clip')).toBe(1)
    // Körper, Hof und Saum: je EIN fillRect; ohne DOM keine Sprites.
    expect(count('fillRect')).toBe(3)
    expect(count('drawImage')).toBe(0)
    expect(ctx.globalCompositeOperation).toBe('source-over')
    // Saum und Hof werden EINMAL gebaut und gecacht.
    expect(count('createRadialGradient')).toBe(2)
    expect(t.exit).not.toBeNull()
    expect(t.halo).not.toBeNull()
    drawWormholeTunnel(ctx, t, frame({ view: f.view, tunnelSec: 2.4 }))
    expect(count('createRadialGradient')).toBe(2)
    expect(count('createLinearGradient')).toBe(0)
    const dashOps = ops.filter((o) => o.startsWith('setLineDash('))
    expect(dashOps[dashOps.length - 1]).toBe('setLineDash()')
    expect(ctx.lineDashOffset).toBe(0)
    expect(ctx.globalAlpha).toBe(1)
  })

  it('zeichnet die Wand je sichtbarer Scheibe als EIN Sprite, additiv, und das Zielfeld im Ausgang', () => {
    const t = createWormholeTunnel('#a84ce0', seeded(11))
    t.wall = {} as HTMLCanvasElement
    const { ctx, ops } = recordingCtx()
    const f = frame({ view: viewAt(cachedPath!.length - 2), peek: {} as HTMLCanvasElement })
    drawWormholeTunnel(ctx, t, f)
    const draws = ops.filter((o) => o.startsWith('drawImage('))
    expect(draws.length).toBe(visibleSlices(f.view) + 1)
    expect(ctx.globalCompositeOperation).toBe('source-over')
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

  it('zeigt das Ende erst am Ende: ohne exitLight kein Ausgang, kein Clip, keine Verlaufsanlage', () => {
    const t = createWormholeTunnel('#a84ce0', seeded(11))
    const { ctx, ops } = recordingCtx()
    const f = frame({ exitLight: 0, peek: {} as HTMLCanvasElement })
    drawWormholeBody(ctx, t, f)
    drawWormholeTunnel(ctx, t, f)
    const count = (name: string) => ops.filter((o) => o.startsWith(`${name}(`)).length
    expect(count('fillRect')).toBe(1)
    expect(count('clip')).toBe(0)
    expect(count('drawImage')).toBe(0)
    expect(count('createRadialGradient')).toBe(0)
    expect(count('stroke')).toBe(UNIVERSE_HOP_TUNNEL_STRANDS * 4 + visibleRibs(f.view))
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
