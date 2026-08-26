import { describe, it, expect } from 'vitest'
import { galaxyAuraGeometry, galaxyFitBox, GALAXY_PLATE_REF_W } from '@/utils/fx/galaxyPlate'
import type { GalaxyAura } from '@/utils/fx/galaxyPlate'
import {
  galaxyGeo,
  galaxyPlaneToWorld,
  galaxyDiscDistance,
} from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { GALAXY_AURA_SPAN, MINIMAP_GALAXY_RADIUS, VOYAGE_MAP_INSET_PX } from '@/config/constants'

/**
 * Die Aura ist der einzige Grund, warum man den RAND der Galaxie sieht — vorher
 * lag dort ein bildschirmzentrierter Kreis, der die Scheibe nicht beschrieb.
 *
 * Sie trägt dieselbe Transformationskette wie `galaxyPlaneToWorld`, und genau
 * die bricht still: vertauscht man den anisotropen Bühnenmassstab mit der
 * Neigung, passt die Aura weiterhin bei jeder ungeneigten Galaxie und driftet
 * nur bei den geneigten. Canvas ist unter jsdom nicht malbar, gebunden wird
 * deshalb die Geometrie.
 */

/** Bühnen, die die Karte wirklich bekommt — bewusst NICHT quadratisch. */
const STAGES = [
  [GALAXY_PLATE_REF_W, 200],
  [628, 610],
  [968, 888],
  [2176, 1900],
] as const

function auraFor(stage: readonly [number, number], seed: number): { aura: GalaxyAura; geo: ReturnType<typeof galaxyGeo> } {
  const [w, h] = stage
  const inset = w === GALAXY_PLATE_REF_W ? 0 : VOYAGE_MAP_INSET_PX
  const geo = galaxyGeo(seed)
  return { aura: galaxyAuraGeometry(geo, galaxyFitBox(w, h, inset)), geo }
}

/** Umkehrung der Aura-Matrix: Bildpunkt → Radius im Aura-Raum. */
function auraLocalRadius(a: GalaxyAura, x: number, y: number): number {
  const u = (x - a.cx) / a.sx
  const v = (y - a.cy) / a.sy
  const cos = Math.cos(a.rot)
  const sin = Math.sin(a.rot)
  const p = u * cos + v * sin
  const q = (-u * sin + v * cos) / a.squash
  return Math.hypot(p, q)
}

describe('galaxyAuraGeometry — die Aura sitzt auf der echten Scheibe', () => {
  it('legt jeden Punkt des Scheibenrandes auf dieselbe Aura-Kontur', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { aura, geo } = auraFor(STAGES[1], seed * 13 + 2)
      const rim = MINIMAP_GALAXY_RADIUS * geo.radiusScale
      for (let i = 0; i < 12; i++) {
        const p = galaxyPlaneToWorld(geo, (i / 12) * Math.PI * 2, rim)
        const x = aura.cx + (p.x - 0.5) * aura.sx
        const y = aura.cy + (p.y - 0.5) * aura.sy
        // Der Rand liegt bei 1/SPAN der Aura — dort ist der Verlauf schon fast aus.
        expect(auraLocalRadius(aura, x, y)).toBeCloseTo(aura.r / GALAXY_AURA_SPAN, 9)
      }
    }
  })

  it('trifft auf jeder Bühne, auch auf der flachsten', () => {
    for (const stage of STAGES) {
      const { aura, geo } = auraFor(stage, 77)
      const rim = MINIMAP_GALAXY_RADIUS * geo.radiusScale
      const p = galaxyPlaneToWorld(geo, 1.1, rim)
      const x = aura.cx + (p.x - 0.5) * aura.sx
      const y = aura.cy + (p.y - 0.5) * aura.sy
      expect(auraLocalRadius(aura, x, y)).toBeCloseTo(aura.r / GALAXY_AURA_SPAN, 9)
    }
  })

  it('setzt den Mittelpunkt auf die Scheibenmitte', () => {
    for (const stage of STAGES) {
      const { aura } = auraFor(stage, 5)
      expect(auraLocalRadius(aura, aura.cx, aura.cy)).toBe(0)
    }
  })

  it('reicht genau SPAN Scheibenradien weit — die volle Kontur ist der Auslauf', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { geo } = auraFor(STAGES[2], seed * 31 + 4)
      // Ein Punkt auf der äussersten Aura-Kontur, zurückgerechnet in Scheibenradien.
      const p = galaxyPlaneToWorld(geo, 0.7, MINIMAP_GALAXY_RADIUS * geo.radiusScale * GALAXY_AURA_SPAN)
      expect(galaxyDiscDistance(geo, p.x, p.y)).toBeCloseTo(GALAXY_AURA_SPAN, 9)
    }
  })

  it('bricht, wenn Massstab und Neigung vertauscht werden', () => {
    // Der Fehler, gegen den diese Spec geschrieben ist. Auf einer nicht
    // quadratischen Bühne mit geneigter Galaxie liefert die falsche Reihenfolge
    // einen anderen Radius — bei tilt = 0 wäre sie unauffällig.
    const { aura, geo } = auraFor(STAGES[1], 9)
    expect(Math.abs(Math.sin(geo.tilt))).toBeGreaterThan(0.05)
    expect(aura.sx).not.toBeCloseTo(aura.sy, 1)

    const rim = MINIMAP_GALAXY_RADIUS * geo.radiusScale
    const p = galaxyPlaneToWorld(geo, 0.9, rim)
    const x = aura.cx + (p.x - 0.5) * aura.sx
    const y = aura.cy + (p.y - 0.5) * aura.sy

    // Vertauschte Kette: erst drehen, dann anisotrop skalieren.
    const cos = Math.cos(aura.rot)
    const sin = Math.sin(aura.rot)
    const dx = x - aura.cx
    const dy = y - aura.cy
    const ru = dx * cos + dy * sin
    const rv = -dx * sin + dy * cos
    const wrong = Math.hypot(ru / aura.sx, rv / aura.sy / aura.squash)

    expect(wrong).not.toBeCloseTo(aura.r / GALAXY_AURA_SPAN, 4)
  })
})
