import { describe, it, expect } from 'vitest'
import {
  STAR_LOOK_PAINTERS,
  starBodyDetail,
  starBodySpriteKey,
  starLookFor,
  starPaletteFromRgb,
  starSeedFor,
  type StarDetail,
  type StarSpriteLayer,
} from '@/utils/fx/starBodySprite'
import {
  STAR_BODY_DETAIL_PX_1,
  STAR_BODY_DETAIL_PX_2,
  STAR_BODY_LOOK_POOL,
  STAR_BODY_SEED_SLOTS,
  STAR_BODY_SPIN_SEC,
  STAR_BODY_SPRITE_SPAN,
} from '@/config/constants'
import type { StarLook } from '@/types'
import { recordingCtx } from '../../helpers/recordingCtx'

const LOOKS = Object.keys(STAR_LOOK_PAINTERS) as StarLook[]
const LAYERS: StarSpriteLayer[] = ['halo', 'core', 'spin']
const R = 30
const RGB: [number, number, number] = [80, 144, 232]

function run(look: StarLook, layer: StarSpriteLayer, detail: StarDetail, seed = 3, x = 100, y = 100) {
  const { ctx, ops } = recordingCtx()
  STAR_LOOK_PAINTERS[look][layer](ctx, x, y, R, starPaletteFromRgb(RGB), seed, detail)
  return ops
}

describe('Sternkörper — acht Gestalten, drei Ebenen', () => {
  it('Halo und Kern malen auf jeder Stufe etwas, die Drehebene auf ihrer höchsten', () => {
    for (const look of LOOKS) {
      for (const detail of [0, 1, 2] as const) {
        for (const layer of ['halo', 'core'] as const) {
          const ops = run(look, layer, detail)
          expect(ops.some((o) => o.startsWith('fill(')), `${look}/${layer}/${detail}`).toBe(true)
        }
      }
      const spin = run(look, 'spin', 2)
      expect(spin.some((o) => o === 'fill()' || o === 'stroke()'), `${look}/spin`).toBe(true)
    }
  })

  it('keine zwei Gestalten malen dieselbe Ebene', () => {
    for (const layer of LAYERS) {
      const sigs = LOOKS.map((look) => ({ look, sig: run(look, layer, 2).join('|') }))
      for (let i = 0; i < sigs.length; i++) {
        for (let k = i + 1; k < sigs.length; k++) {
          expect(sigs[i].sig, `${layer}: ${sigs[i].look} und ${sigs[k].look}`).not.toBe(sigs[k].sig)
        }
      }
    }
  })

  it('ist deterministisch und streut über den Seed', () => {
    for (const look of LOOKS) {
      expect(run(look, 'core', 1, 2).join('|'), look).toBe(run(look, 'core', 1, 2).join('|'))
    }
    // Ohne Seedstreuung sähe jeder Champion-Stern derselben Rolle gleich aus.
    const seeded = LOOKS.filter(
      (look) => run(look, 'core', 2, 1).join('|') !== run(look, 'core', 2, 5).join('|'),
    )
    expect(seeded.length).toBeGreaterThanOrEqual(5)
  })

  it('mehr Detailstufe malt mehr, nie weniger', () => {
    for (const look of LOOKS) {
      for (const layer of LAYERS) {
        const counts = ([0, 1, 2] as const).map((d) => run(look, layer, d).length)
        expect(counts[1], `${look}/${layer}`).toBeGreaterThanOrEqual(counts[0])
        expect(counts[2], `${look}/${layer}`).toBeGreaterThanOrEqual(counts[1])
      }
      expect(run(look, 'core', 2).length, `${look} ignoriert detail`).toBeGreaterThan(
        run(look, 'core', 0).length,
      )
    }
  })

  it('bleibt innerhalb des Sprite-Feldes', () => {
    const halfSpan = R * STAR_BODY_SPRITE_SPAN
    const geo = /^(moveTo|lineTo|rect)\((-?[\d.]+),(-?[\d.]+)/
    const rund = /^(arc|ellipse)\((-?[\d.]+),(-?[\d.]+),(-?[\d.]+)/
    for (const look of LOOKS) {
      for (const layer of LAYERS) {
        for (let seed = 0; seed < STAR_BODY_SEED_SLOTS; seed++) {
          const ops = run(look, layer, 2, seed, halfSpan, halfSpan)
          const bis = ops.findIndex((o) => o.startsWith('translate('))
          const absolut = bis === -1 ? ops : ops.slice(0, bis)
          for (const op of absolut) {
            const r = rund.exec(op)
            if (r) {
              const reach = Number(r[4])
              expect(Math.abs(Number(r[2]) - halfSpan) + reach, `${look}/${layer}: ${op}`).toBeLessThanOrEqual(halfSpan + 0.01)
              expect(Math.abs(Number(r[3]) - halfSpan) + reach, `${look}/${layer}: ${op}`).toBeLessThanOrEqual(halfSpan + 0.01)
              continue
            }
            const g = geo.exec(op)
            if (!g) continue
            expect(Math.abs(Number(g[2]) - halfSpan), `${look}/${layer}: ${op}`).toBeLessThanOrEqual(halfSpan + 0.01)
            expect(Math.abs(Number(g[3]) - halfSpan), `${look}/${layer}: ${op}`).toBeLessThanOrEqual(halfSpan + 0.01)
          }
        }
      }
    }
  })

  it('der Protuberanzen-Stern malt Bögen, die auf dem Rand aufsetzen — keine Scheibe', () => {
    const core = run('flare', 'core', 2)
    expect(core.some((o) => o.startsWith('ellipse('))).toBe(false)
    const loops = core.filter((o) => o.startsWith('bezierCurveTo('))
    expect(loops.length).toBeGreaterThanOrEqual(4)
    // Fusspunkte liegen auf dem Rand (0,96 · br), nicht in der Mitte
    const feet = core
      .map((o) => /^moveTo\((-?[\d.]+),(-?[\d.]+)\)/.exec(o))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => Math.hypot(Number(m[1]) - 100, Number(m[2]) - 100))
    expect(feet.some((d) => d > R * 0.7 && d < R)).toBe(true)
  })

  it('der Schlüssel trennt Ebene, Gestalt, Farbe, Seed, Grösse, Dichte und Stufe', () => {
    const base = starBodySpriteKey('core', 'dwarf', RGB, 1, 46, 2, 1)
    expect(base).not.toBe(starBodySpriteKey('halo', 'dwarf', RGB, 1, 46, 2, 1))
    expect(base).not.toBe(starBodySpriteKey('core', 'giant', RGB, 1, 46, 2, 1))
    expect(base).not.toBe(starBodySpriteKey('core', 'dwarf', [80, 144, 233], 1, 46, 2, 1))
    expect(base).not.toBe(starBodySpriteKey('core', 'dwarf', RGB, 2, 46, 2, 1))
    expect(base).not.toBe(starBodySpriteKey('core', 'dwarf', RGB, 1, 34, 2, 1))
    expect(base).not.toBe(starBodySpriteKey('core', 'dwarf', RGB, 1, 46, 1, 1))
    expect(base).not.toBe(starBodySpriteKey('core', 'dwarf', RGB, 1, 46, 2, 2))
  })
})

describe('Sternkörper — Gestalt, Stufe, Palette', () => {
  it('Boss und Eskorte sind fest, Champion und Resource würfeln aus dem Pool', () => {
    for (let roll = 0; roll < 20; roll++) {
      expect(starLookFor('galaxy_boss', roll)).toBe('umbra')
      expect(starLookFor('boss_escort', roll)).toBe('splinter')
    }
    const seen = new Set<StarLook>()
    for (let roll = 0; roll < 200; roll++) {
      const look = starLookFor('champion', roll)
      expect(STAR_BODY_LOOK_POOL).toContain(look)
      expect(starLookFor('resource', roll)).toBe(look)
      seen.add(look)
    }
    expect(seen.size).toBe(STAR_BODY_LOOK_POOL.length)
    expect(starLookFor('champion', 7)).toBe(starLookFor('champion', 7))
  })

  it('der Seed streut über alle Stufen und bleibt im Bereich', () => {
    const seen = new Set<number>()
    for (let roll = 0; roll < 200; roll++) {
      const s = starSeedFor(roll)
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThan(STAR_BODY_SEED_SLOTS)
      seen.add(s)
    }
    expect(seen.size).toBe(STAR_BODY_SEED_SLOTS)
  })

  it('Detailstufen kippen an den Schwellen', () => {
    expect(starBodyDetail(STAR_BODY_DETAIL_PX_1 - 1)).toBe(0)
    expect(starBodyDetail(STAR_BODY_DETAIL_PX_1)).toBe(1)
    expect(starBodyDetail(STAR_BODY_DETAIL_PX_2 - 1)).toBe(1)
    expect(starBodyDetail(STAR_BODY_DETAIL_PX_2)).toBe(2)
  })

  it('die Drehebene malt auf jeder Stufe — Strahlen sind die Gestalt', () => {
    for (const look of LOOKS) {
      for (const detail of [0, 1, 2] as const) {
        const ops = run(look, 'spin', detail)
        expect(ops.some((o) => o === 'fill()' || o === 'stroke()'), `${look}/${detail}`).toBe(true)
      }
    }
  })

  it('klein leuchtet der Halo kräftiger als gross', () => {
    const alpha = (detail: StarDetail) =>
      run('dwarf', 'halo', detail).find((o) => o.startsWith('addColorStop(0,'))!
    expect(alpha(1)).not.toBe(alpha(2))
    expect(alpha(0)).toBe(alpha(1))
  })

  it('jede Gestalt hat eine Umlaufdauer, und die Eskorte die kürzeste', () => {
    for (const look of LOOKS) expect(STAR_BODY_SPIN_SEC[look], look).toBeGreaterThan(0)
    expect(Math.min(...LOOKS.map((l) => STAR_BODY_SPIN_SEC[l]))).toBe(STAR_BODY_SPIN_SEC.splinter)
  })

  it('die Palette leitet alle Töne aus derselben Farbe ab', () => {
    const pal = starPaletteFromRgb([200, 40, 40])
    expect(pal.rgb).toEqual([200, 40, 40])
    expect(pal.mid).toBe('rgba(200, 40, 40, 1)')
    const read = (s: string) => s.match(/\d+/g)!.slice(0, 3).map(Number)
    const hi = read(pal.hi)
    const low = read(pal.low)
    const edge = read(pal.edge)
    expect(hi[0]).toBeGreaterThan(200)
    expect(hi[1]).toBeGreaterThan(40)
    expect(low[0]).toBeLessThan(200)
    expect(edge[0]).toBeLessThan(low[0])
    expect(hi[0]).toBeGreaterThan(hi[1])
    expect(low[0]).toBeGreaterThan(low[1])
  })
})
