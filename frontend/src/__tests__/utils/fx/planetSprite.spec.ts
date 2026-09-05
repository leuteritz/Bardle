import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  planetSeedFor,
  planetSpriteSpan,
  lightStepOf,
  lightAngleOfStep,
  planetSpriteKey,
  planetSpriteBacking,
  buildPlanetSprite,
  clearPlanetSpriteCache,
} from '@/utils/fx/planetSprite'
import { drawGasGiant } from '@/utils/planetDraw/drawGasGiant'
import { NS } from '@/utils/planetDraw'
import {
  STAR_FIGHT_PLANET_LIGHT_STEPS,
  STAR_FIGHT_PLANET_SPRITE_MAX_PX,
  STAR_FIGHT_PLANET_SPRITE_SPAN,
  STAR_FIGHT_PLANET_SPRITE_SPAN_RINGED,
} from '@/config/constants'

afterEach(() => {
  vi.restoreAllMocks()
  clearPlanetSpriteCache()
})

function gasGiantFills(seed?: number): string[] {
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
  drawGasGiant(svg, 'spec', 300, 300, 200, seed)
  return Array.from(svg.querySelectorAll('stop')).map((s) => s.getAttribute('stop-color') ?? '')
}

describe('planetSprite — Schlüssel, Seed, Span', () => {
  it('leitet den Seed stabil und je planetId verschieden ab', () => {
    expect(planetSeedFor('star-planet-41')).toBe(planetSeedFor('star-planet-41'))
    expect(planetSeedFor('star-planet-41')).not.toBe(planetSeedFor('star-planet-42'))
    expect(Number.isInteger(planetSeedFor('x'))).toBe(true)
  })

  it('gibt dem Ringplaneten die grosse Kante, allen anderen die knappe', () => {
    expect(planetSpriteSpan('ringed')).toBe(STAR_FIGHT_PLANET_SPRITE_SPAN_RINGED)
    expect(planetSpriteSpan('ringed')).toBeGreaterThanOrEqual(1.9)
    expect(planetSpriteSpan('rocky')).toBe(STAR_FIGHT_PLANET_SPRITE_SPAN)
    expect(planetSpriteSpan('gas-giant')).toBe(STAR_FIGHT_PLANET_SPRITE_SPAN)
  })

  it('quantisiert den Lichtwinkel periodisch und im Bereich', () => {
    const n = STAR_FIGHT_PLANET_LIGHT_STEPS
    for (let i = -20; i <= 20; i++) {
      const a = (i / 7) * Math.PI
      const s = lightStepOf(a)
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThan(n)
      expect(lightStepOf(a + Math.PI * 2)).toBe(s)
      expect(lightStepOf(a - Math.PI * 2)).toBe(s)
    }
    expect(lightStepOf(0)).toBe(0)
    expect(lightStepOf(Math.PI)).toBe(n / 2)
    expect(lightAngleOfStep(n / 2)).toBeCloseTo(Math.PI, 9)
  })

  it('trägt Typ, Seed, Kante, dpr und Lichtschritt im Schlüssel', () => {
    const key = planetSpriteKey('lava', 4711, 256, 1.5, 3)
    expect(key).toContain('lava')
    expect(key).toContain('4711')
    expect(key).toContain('256')
    expect(key).toContain('1.5')
    expect(key).not.toBe(planetSpriteKey('lava', 4711, 256, 1.5, 4))
    expect(key).not.toBe(planetSpriteKey('lava', 4712, 256, 1.5, 3))
  })

  it('deckelt das Backing auf die KANTE — ein Ringplanet-Hero bei dpr 2 bleibt unter dem Deckel', () => {
    for (const [type, px, dpr] of [
      ['ringed', 900, 2],
      ['rocky', 900, 2],
      ['ringed', 64, 2],
      ['gas-giant', 1400, 3],
    ] as const) {
      const b = planetSpriteBacking(type, px, dpr)
      expect(b.span).toBe(Math.round(px * planetSpriteSpan(type)))
      expect(b.span * b.dpr).toBeLessThanOrEqual(STAR_FIGHT_PLANET_SPRITE_MAX_PX + 1)
      expect(b.dpr).toBeLessThanOrEqual(2)
      expect(b.dpr).toBeGreaterThanOrEqual(0.25)
    }
    expect(planetSpriteBacking('rocky', 64, 2).dpr).toBe(2)
  })
})

describe('planetSprite — Painter deterministisch', () => {
  it('malt den Gasriesen mit gleichem Seed gleich und ohne Math.random', () => {
    const spy = vi.spyOn(Math, 'random')
    const a = gasGiantFills(12345)
    const b = gasGiantFills(12345)
    expect(a.length).toBeGreaterThan(0)
    expect(a).toEqual(b)
    expect(spy).not.toHaveBeenCalled()
  })

  it('würfelt ohne Seed weiterhin (PlanetGlyph bleibt unverändert)', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    gasGiantFills()
    expect(spy).toHaveBeenCalled()
  })

  it('liefert in jsdom null statt zu werfen', async () => {
    await expect(buildPlanetSprite('rocky', 1, 128, 1, 0)).resolves.toBeNull()
  })
})
