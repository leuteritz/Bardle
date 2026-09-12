import { describe, it, expect } from 'vitest'
import { galaxyStarDots } from '@/utils/game/galaxyStarDots'
import { generateGalaxyDots } from '@/components/bottom/minimap/minimapGalaxyGeometry'

describe('galaxyStarDots', () => {
  it('fällt ohne Orte auf die alte Generierung zurück — Altbestand und Nachtrag', () => {
    expect(galaxyStarDots(123, 4)).toEqual(generateGalaxyDots(123, 5))
    expect(galaxyStarDots(123, 4, [])).toEqual(generateGalaxyDots(123, 5))
    expect(galaxyStarDots(123, 4, undefined)).toEqual(generateGalaxyDots(123, 5))
  })

  it('legt die gewählten Orte über die Generierung, Spawn bleibt', () => {
    const chosen = [
      { x: 0.2, y: 0.3 },
      { x: 0.7, y: 0.6 },
    ]
    const r = galaxyStarDots(123, 2, chosen)
    const g = generateGalaxyDots(123, 3)
    expect(r.spawn).toEqual(g.spawn)
    expect(r.dots[0]).toEqual(chosen[0])
    expect(r.dots[1]).toEqual(chosen[1])
    expect(r.dots).toHaveLength(3)
  })

  it('füllt ein Präfix aus der Generierung — ein vor der Kurswahl begonnener Lauf', () => {
    const chosen = [{ x: 0.2, y: 0.3 }]
    const r = galaxyStarDots(123, 3, chosen)
    const g = generateGalaxyDots(123, 4)
    expect(r.dots[0]).toEqual(chosen[0])
    expect(r.dots[1]).toEqual(g.dots[1])
    expect(r.dots[2]).toEqual(g.dots[2])
    expect(r.dots[3]).toEqual(g.dots[3])
  })
})
