import { describe, it, expect } from 'vitest'
import {
  paintChime,
  paintShard,
  paintMeep,
  paintProbe,
  paintSurge,
  paintVortex,
  paintBeacon,
  paintPulse,
  paintLeviathan,
  paintForBodyKind,
  paintDrifterBody,
  probeStrobeAt,
  beaconLampAt,
  chimeGlintAt,
  drifterSpriteKey,
  type DrifterPaint,
} from '@/utils/fx/drifterSprite'
import { DRIFTERS } from '@/config/world/drifters'
import {
  DRIFTER_BODY_LIT,
  DRIFTER_BODY_PALETTE,
  DRIFTER_BODY_SPIN,
  DRIFTER_ROCK_DEG,
  DRIFTER_SPRITE_SPAN,
  LANDFALL_SPIN_TURN_DEG,
} from '@/config/constants'
import type { DrifterBodyKind } from '@/types'
import { recordingCtx } from '../../helpers/recordingCtx'

const KINDS: { kind: DrifterBodyKind; paint: DrifterPaint }[] = [
  { kind: 'chime', paint: paintChime },
  { kind: 'shard', paint: paintShard },
  { kind: 'meep', paint: paintMeep },
  { kind: 'probe', paint: paintProbe },
  { kind: 'surge', paint: paintSurge },
  { kind: 'vortex', paint: paintVortex },
  { kind: 'beacon', paint: paintBeacon },
  { kind: 'pulse', paint: paintPulse },
  { kind: 'leviathan', paint: paintLeviathan },
]

const R = 28
const COLOR = '#e8c040'

function run(kind: DrifterBodyKind, paint: DrifterPaint, detail: 0 | 1 | 2, x = 100, y = 100) {
  const { ctx, ops } = recordingCtx()
  paint(ctx, x, y, R, DRIFTER_BODY_PALETTE[kind], COLOR, detail, null)
  return ops
}

describe('Drifter-Körper — die neun Motive', () => {
  it('jedes Motiv malt etwas', () => {
    for (const { kind, paint } of KINDS) {
      const ops = run(kind, paint, 0)
      expect(ops.length, kind).toBeGreaterThan(4)
      expect(ops.some((o) => o === 'fill()' || o === 'stroke()'), kind).toBe(true)
    }
  })

  it('keine zwei Motive malen dasselbe', () => {
    const sigs = KINDS.map(({ kind, paint }) => ({ kind, sig: run(kind, paint, 2).join('|') }))
    for (let i = 0; i < sigs.length; i++) {
      for (let k = i + 1; k < sigs.length; k++) {
        expect(sigs[i].sig, `${sigs[i].kind} und ${sigs[k].kind}`).not.toBe(sigs[k].sig)
      }
    }
  })

  it('ist deterministisch', () => {
    for (const { kind, paint } of KINDS) {
      expect(run(kind, paint, 1).join('|'), kind).toBe(run(kind, paint, 1).join('|'))
    }
  })

  it('mehr Detailstufe malt mehr, nie weniger', () => {
    for (const { kind, paint } of KINDS) {
      if (kind === 'meep') continue // das Artwork kennt keine Stufen
      const counts = ([0, 1, 2] as const).map((d) => run(kind, paint, d).length)
      expect(counts[1], kind).toBeGreaterThanOrEqual(counts[0])
      expect(counts[2], kind).toBeGreaterThanOrEqual(counts[1])
      expect(counts[2], `${kind} ignoriert detail`).toBeGreaterThan(counts[0])
    }
  })

  it('bleibt innerhalb des Sprite-Feldes', () => {
    const halfSpan = (R * 2 * DRIFTER_SPRITE_SPAN) / 2
    const geo = /^(moveTo|lineTo|rect)\((-?[\d.]+),(-?[\d.]+)/
    const rund = /^(arc|ellipse)\((-?[\d.]+),(-?[\d.]+),(-?[\d.]+)/
    for (const { kind, paint } of KINDS) {
      const ops = run(kind, paint, 2, halfSpan, halfSpan)
      const bis = ops.findIndex((o) => o.startsWith('translate('))
      const absolut = bis === -1 ? ops : ops.slice(0, bis)
      for (const op of absolut) {
        const r = rund.exec(op)
        if (r) {
          const reach = Number(r[4])
          expect(Math.abs(Number(r[2]) - halfSpan) + reach, `${kind}: ${op}`).toBeLessThanOrEqual(halfSpan + 0.01)
          expect(Math.abs(Number(r[3]) - halfSpan) + reach, `${kind}: ${op}`).toBeLessThanOrEqual(halfSpan + 0.01)
          continue
        }
        const g = geo.exec(op)
        if (!g) continue
        expect(Math.abs(Number(g[2]) - halfSpan), `${kind}: ${op}`).toBeLessThanOrEqual(halfSpan + 0.01)
        expect(Math.abs(Number(g[3]) - halfSpan), `${kind}: ${op}`).toBeLessThanOrEqual(halfSpan + 0.01)
      }
    }
  })

  it('nur wer eine Oberfläche hat, bekommt den Terminator — und das Leuchten danach', () => {
    for (const { kind } of KINDS) {
      const { ctx, ops } = recordingCtx()
      paintDrifterBody(ctx, kind, R * 2 * DRIFTER_SPRITE_SPAN, R * 2, COLOR, 2, null)
      const term = ops.findIndex((o) => o.includes('255, 250, 236'))
      expect(term >= 0, kind).toBe(DRIFTER_BODY_LIT[kind])
      if (kind === 'shard' || kind === 'beacon' || kind === 'leviathan') {
        // Leuchtlinien liegen ÜBER dem Terminator.
        const after = ops.slice(term).filter((o) => o === 'fill()' || o === 'stroke()')
        expect(after.length, kind).toBeGreaterThan(0)
      }
    }
    expect(paintForBodyKind('chime')).toBe(paintChime)
  })

  it('das Meep malt ohne Bild einen Ersatz und mit Bild genau das Bild', () => {
    const bare = recordingCtx()
    paintMeep(bare.ctx, 100, 100, R, DRIFTER_BODY_PALETTE.meep, COLOR, 0, null)
    expect(bare.ops.some((o) => o.startsWith('drawImage('))).toBe(false)
    expect(bare.ops.filter((o) => o === 'fill()').length).toBeGreaterThan(2)
    const withArt = recordingCtx()
    paintMeep(withArt.ctx, 100, 100, R, DRIFTER_BODY_PALETTE.meep, COLOR, 0, {} as HTMLImageElement)
    expect(withArt.ops.filter((o) => o.startsWith('drawImage(')).length).toBe(1)
  })

  it('Overlay-Anker liegen im Sprite-Feld', () => {
    const halfSpan = R * DRIFTER_SPRITE_SPAN
    for (const at of [probeStrobeAt(R), beaconLampAt(R), chimeGlintAt(R)]) {
      expect(Math.hypot(at.x, at.y)).toBeLessThan(halfSpan)
      expect(at.rad).toBeGreaterThan(0)
    }
  })

  it('der Schlüssel trennt Kind, Farbe, Grösse, Dichte, Stufe und Bild', () => {
    const base = drifterSpriteKey('chime', '#fff', 46, 2, 1, true)
    expect(base).not.toBe(drifterSpriteKey('shard', '#fff', 46, 2, 1, true))
    expect(base).not.toBe(drifterSpriteKey('chime', '#000', 46, 2, 1, true))
    expect(base).not.toBe(drifterSpriteKey('chime', '#fff', 34, 2, 1, true))
    expect(base).not.toBe(drifterSpriteKey('chime', '#fff', 46, 1, 1, true))
    expect(base).not.toBe(drifterSpriteKey('chime', '#fff', 46, 2, 2, true))
    expect(base).not.toBe(drifterSpriteKey('chime', '#fff', 46, 2, 1, false))
  })
})

describe('Drifter-Körper — Katalog und Licht', () => {
  it('jeder Körper des Katalogs hat Licht, Spin und Palette', () => {
    for (const d of DRIFTERS) {
      expect(DRIFTER_BODY_LIT[d.body], d.id).toBeTypeOf('boolean')
      expect(DRIFTER_BODY_SPIN[d.body], d.id).toBeTypeOf('boolean')
      expect(DRIFTER_BODY_PALETTE[d.body], d.id).toBeTruthy()
    }
  })

  it('frei dreht nur, wer selbst leuchtet', () => {
    for (const kind of Object.keys(DRIFTER_BODY_SPIN) as DrifterBodyKind[]) {
      if (DRIFTER_BODY_SPIN[kind]) expect(DRIFTER_BODY_LIT[kind], kind).toBe(false)
    }
  })

  it('das Wiegen verdreht das eingebackene Licht nicht sichtbar', () => {
    expect(DRIFTER_ROCK_DEG).toBeGreaterThan(0)
    expect(DRIFTER_ROCK_DEG).toBeLessThanOrEqual(LANDFALL_SPIN_TURN_DEG)
  })

  it('keine Palette ist gesättigt', () => {
    for (const [kind, pal] of Object.entries(DRIFTER_BODY_PALETTE)) {
      for (const hex of [pal.hi, pal.mid, pal.low, pal.edge]) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/)
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        expect((Math.max(r, g, b) - Math.min(r, g, b)) / 255, `${kind} ${hex}`).toBeLessThan(0.3)
      }
    }
  })
})
