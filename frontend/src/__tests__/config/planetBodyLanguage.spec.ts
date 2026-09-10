import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * EINE Gestalt fuer den Planetenkoerper.
 *
 * Es gab zwei Renderer mit demselben Funktionsnamen `drawPlanet`: die Minimap
 * malte ihre eigene Kugel mit ihrer eigenen Farbtafel und ihrem eigenen Seed,
 * das Star-Fight-Modal die achtzehn Painter. Derselbe Planet sah an beiden
 * Orten garantiert verschieden aus. Diese Spec haelt fest, dass die Karte den
 * Koerper wieder aus dem gemeinsamen Raster zieht.
 */
const SRC = resolve(__dirname, '../..')
const read = (p: string) => readFileSync(resolve(SRC, p), 'utf8')

describe('Planetenkoerper — EINE Quelle', () => {
  it('zieht den Koerper der Minimap aus dem gemeinsamen Sprite-Cache', () => {
    const geo = read('components/bottom/minimap/minimapGalaxyGeometry.ts')
    expect(geo).toContain('peekPlanetSprite')
    expect(geo).toContain('paintPlanetShade')
    // Die Verlaufskugel bleibt — aber nur als Rueckfall, bis das Raster steht
    expect(geo).toContain('createRadialGradient')
  })

  it('liest Minimap und Systembuehne DENSELBEN Seed', () => {
    const canvas = read('components/bottom/minimap/MiniMapCanvas.vue')
    const stage = read('utils/orbit/starFightSystem.ts')
    expect(canvas).toContain('planetSeedFor(slot.planetId)')
    expect(stage).toContain('planetSeedFor(slot.planetId)')
    // Der alte, nur der Karte eigene Wurf darf den Koerper nicht mehr bestimmen
    expect(canvas).not.toContain("galaxySeed + idx * 17,\n          cleared")
  })

  it('haelt nur noch EINE Farbtafel je Typ', () => {
    const draw = read('components/bottom/minimap/minimapDraw.ts')
    expect(draw).toContain('PLANET_TYPE_TINT as PLANET_TYPE_PALETTES')
    // Keine zweite Tafel daneben
    expect(draw).not.toContain("rocky: {")
  })

  it('schattiert die Karte selbst, statt sechzehn Lichtstufen zu rastern', () => {
    const sprite = read('utils/fx/planetSprite.ts')
    expect(sprite).toContain('PLANET_SPRITE_UNLIT')
    expect(sprite).toContain('if (lightStep >= 0)')
  })
})
