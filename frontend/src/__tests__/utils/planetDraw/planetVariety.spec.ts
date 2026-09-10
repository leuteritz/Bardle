import { describe, it, expect } from 'vitest'
import { drawPlanet, NS } from '@/utils/planetDraw'
import { planetSizeFactor, PLANET_TYPE_TINT } from '@/utils/planetDraw/types'
import { PLANET_ORNAMENTS } from '@/utils/planetDraw/ornaments'
import { planetSpriteSpan } from '@/utils/fx/planetSprite'
import type { PlanetType } from '@/types'
import {
  PLANET_SIZE_FACTOR_MIN,
  PLANET_SIZE_FACTOR_MAX,
  PLANET_MOON_DIST_MAX,
  PLANET_MOON_R_MAX,
  PLANET_SHARD_DIST_MAX,
  PLANET_SHARD_SIZE_MAX,
} from '@/config/constants'

const TYPES = Object.keys(PLANET_TYPE_TINT) as PlanetType[]

function paint(type: PlanetType, seed: number, r = 50, c = 100): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
  drawPlanet(svg, `t-${type}-${seed}-${r}`, type, c, c, r, seed)
  return svg
}

/** Ids tragen den Aufruf im Namen — fuer den Vergleich raus. */
function shape(svg: SVGSVGElement): string {
  return new XMLSerializer().serializeToString(svg).replace(/t-[a-z-]+-\d+-\d+/g, 'ID')
}

function tags(svg: SVGSVGElement): string[] {
  return Array.from(svg.querySelectorAll('*')).map((el) => el.tagName)
}

describe('planetDraw — Vielfalt', () => {
  it('kennt achtzehn Typen, und keine zwei sehen gleich aus', () => {
    expect(TYPES).toHaveLength(18)
    const seen = new Map<string, PlanetType>()
    for (const type of TYPES) {
      const s = shape(paint(type, 4242))
      const twin = seen.get(s)
      expect(twin, `${type} zeichnet dasselbe wie ${twin}`).toBeUndefined()
      seen.set(s, type)
    }
  })

  it('gibt demselben Typ mit anderem Seed ein anderes Bild', () => {
    for (const type of TYPES) {
      expect(shape(paint(type, 11)), type).not.toBe(shape(paint(type, 12)))
    }
  })

  it('zeichnet denselben Seed immer gleich — sonst flackert die LOD-Blende', () => {
    for (const type of TYPES) {
      expect(shape(paint(type, 77)), type).toBe(shape(paint(type, 77)))
    }
  })

  it('wuerfelt aus dem SEED, nie aus dem Radius', () => {
    // Klein und Hero kommen aus DEMSELBEN Painter und blenden gegeneinander.
    // Haenge ein Merkmal an r, saesse es beim Blenden versetzt.
    for (const type of TYPES) {
      const small = paint(type, 909, 25, 50)
      const big = paint(type, 909, 100, 200)
      expect(tags(small), type).toEqual(tags(big))
      const spins = (svg: SVGSVGElement) =>
        Array.from(svg.querySelectorAll('[transform]'))
          .map((el) => /rotate\((-?[\d.]+)/.exec(el.getAttribute('transform') ?? '')?.[1])
          .filter((v): v is string => v !== undefined)
      expect(spins(small), type).toEqual(spins(big))
    }
  })

  it('haelt die Groessenklasse in ihrem Band und ist deterministisch', () => {
    for (const type of TYPES) {
      for (const seed of [0, 1, 7, 4242, 99991]) {
        const f = planetSizeFactor(type, seed)
        expect(f, `${type}/${seed}`).toBeGreaterThanOrEqual(PLANET_SIZE_FACTOR_MIN)
        expect(f, `${type}/${seed}`).toBeLessThanOrEqual(PLANET_SIZE_FACTOR_MAX)
        expect(planetSizeFactor(type, seed)).toBe(f)
      }
    }
    // Und sie spreizt wirklich: der Gasriese steht ueber dem Obsidian-Brocken
    const giant = Math.max(...[1, 2, 3, 4].map((s) => planetSizeFactor('gas-giant', s)))
    const chip = Math.min(...[1, 2, 3, 4].map((s) => planetSizeFactor('obsidian', s)))
    expect(giant).toBeGreaterThan(chip)
  })

  it('deckt jeden Zierrat mit der Kante seines Sprites', () => {
    // Was weiter als span·r von der Mitte steht, schneidet das Raster ab —
    // die Truemmer von `shattered` lagen bis hierher unbemerkt darueber.
    for (const type of TYPES) {
      const span = planetSpriteSpan(type)
      const orn = PLANET_ORNAMENTS[type]
      if (orn?.moons) {
        expect(PLANET_MOON_DIST_MAX + PLANET_MOON_R_MAX, type).toBeLessThanOrEqual(span)
      }
      if (orn?.shards) {
        expect(PLANET_SHARD_DIST_MAX + PLANET_SHARD_SIZE_MAX, type).toBeLessThanOrEqual(span)
      }
      if (orn?.ring) {
        expect(orn.ring.outer, type).toBeLessThanOrEqual(span)
        expect(orn.ring.inner, type).toBeLessThan(orn.ring.outer)
      }
    }
  })

  it('malt ohne Seed weiter — der Glyph darf wuerfeln', () => {
    for (const type of TYPES) {
      const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
      expect(() => drawPlanet(svg, `g-${type}`, type, 60, 50, 31)).not.toThrow()
      expect(svg.childNodes.length, type).toBeGreaterThan(0)
    }
  })
})
