import { describe, it, expect } from 'vitest'
import {
  jitter,
  sway,
  lumpyPath,
  crater,
  bodyFill,
  paintTerminator,
  createSpriteCache,
  clampSpriteDpr,
} from '@/utils/fx/spaceBody'
import {
  SPACE_BODY_AMBIENT_RGB,
  SPACE_BODY_LUMPY_POINTS,
  SPACE_BODY_SPRITE_MAX_DPR,
} from '@/config/constants'
import { recordingCtx } from '../../helpers/recordingCtx'

describe('spaceBody — Determinismus', () => {
  it('jitter liegt in [0,1) und hängt nur von seinen Argumenten ab', () => {
    for (let a = 0; a < 40; a++) {
      for (let b = 0; b < 40; b++) {
        const v = jitter(a, b)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(1)
        expect(jitter(a, b)).toBe(v)
      }
    }
    // Reihenfolgeunabhängig: dazwischen liegende Aufrufe ändern nichts.
    const first = jitter(3, 7)
    jitter(99, 1)
    expect(jitter(3, 7)).toBe(first)
  })

  it('sway liegt in [−1,1]', () => {
    for (let i = 0; i < 200; i++) {
      const v = sway(i, 5)
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})

describe('spaceBody — Bausteine', () => {
  it('lumpyPath bleibt innerhalb des Wobbles und schliesst', () => {
    const { ctx, ops } = recordingCtx()
    const r = 40
    const wobble = 0.16
    lumpyPath(ctx, 100, 100, r, 5, wobble)
    const pts = ops.filter((o) => /^(moveTo|lineTo)\(/.test(o))
    expect(pts).toHaveLength(SPACE_BODY_LUMPY_POINTS + 1)
    for (const p of pts) {
      const [, x, y] = /\((-?[\d.]+),(-?[\d.]+)\)/.exec(p)!
      const d = Math.hypot(Number(x) - 100, Number(y) - 100)
      expect(d).toBeGreaterThanOrEqual(r * (1 - wobble) - 0.02)
      expect(d).toBeLessThanOrEqual(r * (1 + wobble) + 0.02)
    }
    expect(ops[ops.length - 1]).toBe('closePath()')
  })

  it('crater ist Schale plus Gegenrand, keine gefüllte Scheibe', () => {
    const { ctx, ops } = recordingCtx()
    crater(ctx, 10, 10, 4, '#fff')
    expect(ops.filter((o) => o.startsWith('arc('))).toHaveLength(2)
    expect(ops.some((o) => o === 'fill()')).toBe(true)
    expect(ops.some((o) => o === 'stroke()')).toBe(true)
  })

  it('bodyFill trägt drei Stufen', () => {
    const { ctx, ops } = recordingCtx()
    bodyFill(ctx, 0, 0, 10, '#aaa', '#777', '#222')
    expect(ops.filter((o) => o.startsWith('addColorStop('))).toHaveLength(3)
  })

  it('der Terminator trifft nur, was schon gemalt ist — mit kühler Gegenfüllung', () => {
    const { ctx, ops } = recordingCtx()
    paintTerminator(ctx, 200, 58)
    expect(ops.filter((o) => o.startsWith('createLinearGradient('))).toHaveLength(2)
    expect(ops.filter((o) => o.startsWith('fillRect('))).toHaveLength(2)
    const stops = ops.filter((o) => o.startsWith('addColorStop('))
    expect(stops.length).toBeGreaterThanOrEqual(6)
    expect(stops.some((s) => s.includes('255, 250, 236'))).toBe(true)
    expect(stops.some((s) => s.includes('4, 3, 2'))).toBe(true)
    expect(stops.some((s) => s.includes(SPACE_BODY_AMBIENT_RGB))).toBe(true)
  })
})

describe('spaceBody — Cache und dpr', () => {
  it('LRU: get frischt auf, set wirft den ältesten hinaus', () => {
    const cache = createSpriteCache(2)
    const a = {} as HTMLCanvasElement
    const b = {} as HTMLCanvasElement
    const c = {} as HTMLCanvasElement
    cache.set('a', a)
    cache.set('b', b)
    expect(cache.get('a')).toBe(a)
    cache.set('c', c)
    expect(cache.size).toBe(2)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe(a)
    expect(cache.get('c')).toBe(c)
    cache.clear()
    expect(cache.size).toBe(0)
  })

  it('dpr wird auf [1, MAX] geklemmt', () => {
    expect(clampSpriteDpr(0)).toBe(1)
    expect(clampSpriteDpr(0.5)).toBe(1)
    expect(clampSpriteDpr(1.5)).toBe(1.5)
    expect(clampSpriteDpr(4)).toBe(SPACE_BODY_SPRITE_MAX_DPR)
  })
})
