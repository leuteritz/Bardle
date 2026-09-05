import { describe, expect, it } from 'vitest'
import { WARP_DOPPLER_AHEAD_NORM, WARP_DOPPLER_BEHIND_NORM } from '@/config/constants'
import {
  WARP_DOPPLER_OWN,
  drawStreakSprite,
  streakSprite,
  warpDopplerTier,
} from '@/composables/starBackground/starSprites'
import { recordingCtx } from '../../helpers/recordingCtx'

describe('drawStreakSprite', () => {
  it('zeichnet mit genau einer Transformation und einem Blit — kein Pfad, kein Stroke', () => {
    const { ctx, ops } = recordingCtx()
    drawStreakSprite(ctx, 200, 210, 255, 100, 50, 0, 40, 4, 0.8)
    expect(ops).toEqual(['setTransform(1,0,0,1,100,50)', 'drawImage([object HTMLCanvasElement],-40,-2,40,4)'])
    expect(ctx.globalAlpha).toBe(0.8)
  })

  it('dreht den Strich um den Kopf: bei π/2 zeigt der Schweif nach oben', () => {
    const { ctx, ops } = recordingCtx()
    drawStreakSprite(ctx, 200, 210, 255, 10, 20, Math.PI / 2, 30, 2, 1)
    // setTransform(cos, sin, -sin, cos, x, y) mit cos ≈ 0, sin = 1
    expect(ops[0]).toBe('setTransform(0,1,-1,0,10,20)')
  })
})

describe('streakSprite — Cache', () => {
  it('liefert je Farbe und Doppler-Stufe dasselbe Objekt, je Stufe ein eigenes', () => {
    const a = streakSprite(120, 140, 255, 0)
    const b = streakSprite(120, 140, 255, 0)
    const c = streakSprite(120, 140, 255, 2)
    const d = streakSprite(120, 140, 255)
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).not.toBe(d)
    expect(d).toBe(streakSprite(120, 140, 255, WARP_DOPPLER_OWN))
  })
})

describe('warpDopplerTier', () => {
  it('teilt voraus / seitlich / hinten nach der normierten Distanz', () => {
    expect(warpDopplerTier(WARP_DOPPLER_AHEAD_NORM - 0.01)).toBe(0)
    expect(warpDopplerTier(0.6)).toBe(WARP_DOPPLER_OWN)
    expect(warpDopplerTier(WARP_DOPPLER_BEHIND_NORM + 0.01)).toBe(2)
  })

  it('lässt die Zonen mit dem Gain aus dem Nichts wachsen', () => {
    expect(warpDopplerTier(0.1, 0)).toBe(WARP_DOPPLER_OWN)
    expect(warpDopplerTier(0.95, 0)).toBe(WARP_DOPPLER_OWN)
    expect(warpDopplerTier(0.1, 0.5)).toBe(0)
    expect(warpDopplerTier(0.3, 0.5)).toBe(WARP_DOPPLER_OWN)
    expect(warpDopplerTier(0.95, 0.5)).toBe(2)
  })
})
