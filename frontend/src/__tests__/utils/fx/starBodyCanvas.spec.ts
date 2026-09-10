import { describe, it, expect, vi, beforeEach } from 'vitest'
import { STAR_BODY_CANVAS_SPRITE_PX, STAR_BODY_SPRITE_SPAN } from '@/config/constants'
import { recordingCtx } from '../../helpers/recordingCtx'

/* `buildStarSprite` braucht ein echtes Canvas — jsdom hat keins. Gemockt wird
   deshalb NUR der Bau; alles andere (Phase, Achse, Streifenmasse) bleibt echt. */
const built = vi.fn()
vi.mock('@/utils/fx/starBodySprite', async (importActual) => {
  const actual = await importActual<typeof import('@/utils/fx/starBodySprite')>()
  return {
    ...actual,
    buildStarSprite: (...args: unknown[]) => {
      built(...args)
      return { width: 10, height: 10 } as unknown as HTMLCanvasElement
    },
  }
})

const { drawStarBody, starRollPhase, clearStarBodyCanvasCache } = await import(
  '@/utils/fx/starBodyCanvas'
)

const STAR = { look: 'dwarf' as const, seed: 3, starColor: [255, 190, 120] as const, id: 'star-7' }

describe('Sternkörper auf fremdem Canvas — die Phase', () => {
  it('läuft in genau einer Periode je Umlauf und wiederholt sich', () => {
    expect(starRollPhase(20, 'normal', 0)).toBeCloseTo(0, 6)
    expect(starRollPhase(20, 'normal', 5000)).toBeCloseTo(0.25, 6)
    expect(starRollPhase(20, 'normal', 10000)).toBeCloseTo(0.5, 6)
    // Ein voller Umlauf steht wieder am Anfang — sonst risse die Naht
    expect(starRollPhase(20, 'normal', 20000)).toBeCloseTo(0, 6)
    expect(starRollPhase(20, 'normal', 25000)).toBeCloseTo(starRollPhase(20, 'normal', 5000), 6)
  })

  it('kehrt sich mit dem Drehsinn um', () => {
    expect(starRollPhase(20, 'reverse', 5000)).toBeCloseTo(0.75, 6)
    expect(starRollPhase(20, 'reverse', 0)).toBeCloseTo(0, 6)
  })

  it('bleibt für jede Zeit in 0..1', () => {
    for (const ms of [0, 1, 999, 12345, 987654321]) {
      const p = starRollPhase(13.5, 'normal', ms)
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThan(1)
    }
  })
})

describe('Sternkörper auf fremdem Canvas — Zeichnen und Halter', () => {
  beforeEach(() => {
    built.mockClear()
    clearStarBodyCanvasCache()
  })

  it('malt Halo, Kern und Strahlen in der Spanne des Sprites', () => {
    const { ctx, ops } = recordingCtx()
    expect(drawStarBody(ctx, 100, 80, 40, STAR, 0, 2)).toBe(true)
    const draws = ops.filter((o) => o.startsWith('drawImage('))
    expect(draws.length).toBeGreaterThanOrEqual(2)
    const span = 40 * STAR_BODY_SPRITE_SPAN
    for (const op of draws) {
      const m = /^drawImage\(\[object Object\],(-?[\d.]+),(-?[\d.]+),([\d.]+),([\d.]+)\)$/.exec(op)
      if (!m) continue
      expect(Number(m[3])).toBeCloseTo(span, 3)
      expect(Number(m[1])).toBeCloseTo(100 - span / 2, 3)
      expect(Number(m[2])).toBeCloseTo(80 - span / 2, 3)
    }
  })

  it('rastert je Stern EINMAL, nicht je Frame', () => {
    const { ctx } = recordingCtx()
    drawStarBody(ctx, 10, 10, 40, STAR, 0, 2)
    const erste = built.mock.calls.length
    expect(erste).toBeGreaterThan(0)
    for (let f = 1; f < 20; f++) drawStarBody(ctx, 10, 10, 40, STAR, f * 16, 2)
    // Der eigene Halter ist der Punkt: STAR_BODY_SPRITE_CANVAS_MAX ist 8, und der
    // Orbit schiebt beim Neuaufbau zwanzig Schlüssel durch.
    expect(built.mock.calls.length).toBe(erste)
  })

  it('rastert immer in derselben Grösse, egal wie gross gezeichnet wird', () => {
    const { ctx } = recordingCtx()
    for (const px of [12, 24, 46, 92]) drawStarBody(ctx, 10, 10, px, STAR, 0, 2)
    const grössen = new Set(built.mock.calls.map((c) => c[4]))
    expect([...grössen]).toEqual([STAR_BODY_CANVAS_SPRITE_PX])
  })

  it('trennt zwei Sterne im Halter', () => {
    const { ctx } = recordingCtx()
    drawStarBody(ctx, 10, 10, 40, STAR, 0, 2)
    const erste = built.mock.calls.length
    drawStarBody(ctx, 10, 10, 40, { ...STAR, look: 'giant', id: 'star-8' }, 0, 2)
    expect(built.mock.calls.length).toBeGreaterThan(erste)
  })

  it('dreht die Strahlenebene nur, wo die Drehung die Gestalt IST', () => {
    const dreh = (look: 'dwarf' | 'pulsar') => {
      const { ctx, ops } = recordingCtx()
      drawStarBody(ctx, 10, 10, 40, { ...STAR, look }, 4000, 2)
      return ops.filter((o) => o.startsWith('rotate(')).map((o) => Number(/rotate\(([-\d.]+)/.exec(o)![1]))
    }
    expect(dreh('dwarf').filter((a) => a !== 0)).toHaveLength(0)
    expect(dreh('pulsar').some((a) => a !== 0)).toBe(true)
  })
})
