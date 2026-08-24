import { describe, it, expect } from 'vitest'
import { buildDeepField } from '@/utils/fx/galaxyDeepField'
import { galaxyFitBox, GALAXY_PLATE_REF_W, GALAXY_PLATE_REF_H } from '@/utils/fx/galaxyPlate'
import {
  galaxyGeo,
  galaxyPlaneToWorld,
  galaxyDiscDistance,
  seededRng,
} from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  MINIMAP_TWINKLE_COUNT,
  MINIMAP_GALAXY_RADIUS,
  VOYAGE_MAP_INSET_PX,
  GALAXY_DEEPFIELD_ANCHOR_MAX,
  GALAXY_DEEPFIELD_CLEAR_INNER,
  GALAXY_DEEPFIELD_CLEAR_FLOOR,
} from '@/config/constants'

/**
 * Das Tiefenfeld ersetzt den flächenskalierten Sternenteppich auf der grossen
 * Voyages-Karte. Was hier gebunden wird, bricht sonst still: die Zahl (sie stand
 * auf 4K bei 1955 gegen 1200 Galaxiepartikel), die Freizone über der Scheibe und
 * der Determinismus, ohne den ein Resize das ganze Feld neu würfelt.
 */

const ACCENT = '200, 220, 255'

/** Die echten Bühnenmasse des Reiters, siehe constants/economy.ts. */
const STAGES = {
  ref: [GALAXY_PLATE_REF_W, GALAXY_PLATE_REF_H],
  fullHd: [628, 610],
  qhd: [968, 888],
  uhd: [2176, 1900],
} as const

function fieldFor(stage: readonly [number, number], seed = 7) {
  const [w, h] = stage
  const inset = w === GALAXY_PLATE_REF_W ? 0 : VOYAGE_MAP_INSET_PX
  const box = galaxyFitBox(w, h, inset)
  const k = box.w / GALAXY_PLATE_REF_W
  return buildDeepField(w, h, k, seed, galaxyGeo(seed * 31 + 5), box, ACCENT)
}

describe('buildDeepField — die Zahl wächst mit der Kante, nicht mit der Fläche', () => {
  it('trifft bei k = 1 den alten Wert — dort ist der Neutralpunkt', () => {
    // Gemessen über zwanzig Galaxien: 24..35 gegen MINIMAP_TWINKLE_COUNT 30.
    for (let seed = 1; seed <= 20; seed++) {
      const n = fieldFor(STAGES.ref, seed).length
      expect(n).toBeGreaterThan(MINIMAP_TWINKLE_COUNT * 0.5)
      expect(n).toBeLessThan(MINIMAP_TWINKLE_COUNT * 1.5)
    }
  })

  it('liegt auf 4K unter einem Viertel dessen, was flächentreu herauskäme', () => {
    const [w, h] = STAGES.uhd
    const areaScaled = (MINIMAP_TWINKLE_COUNT * (w * h)) / (GALAXY_PLATE_REF_W * GALAXY_PLATE_REF_H)
    expect(areaScaled).toBeGreaterThan(1500) // der Zustand, der die Spirale zudeckte
    // Gemessen 196 gegen 1938 — ein Zehntel.
    expect(fieldFor(STAGES.uhd).length).toBeLessThan(areaScaled / 4)
  })

  it('wächst monoton mit der Bühne, aber langsamer als deren Fläche', () => {
    const counts = [STAGES.ref, STAGES.fullHd, STAGES.qhd, STAGES.uhd].map((s) => fieldFor(s).length)
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThan(counts[i - 1])

    const areaRatio = (STAGES.uhd[0] * STAGES.uhd[1]) / (STAGES.fullHd[0] * STAGES.fullHd[1])
    expect(counts[3] / counts[1]).toBeLessThan(areaRatio / 3)
  })
})

describe('buildDeepField — die Freizone hält die Arme frei', () => {
  it('lässt über der Scheibe nur Restdichte stehen, über zwanzig Galaxien', () => {
    let inner = 0
    let total = 0
    for (let seed = 1; seed <= 20; seed++) {
      const stars = fieldFor(STAGES.fullHd, seed)
      total += stars.length
      inner += stars.filter((s) => s.disc < GALAXY_DEEPFIELD_CLEAR_INNER).length
    }
    expect(total).toBeGreaterThan(0)
    // Ohne Freizone lägen dort ~15 % aller Sterne (Flächenanteil der Kernzone).
    expect(inner / total).toBeLessThan(GALAXY_DEEPFIELD_CLEAR_FLOOR)
  })

  it('dämpft, was drinnen stehen bleibt', () => {
    const stars = fieldFor(STAGES.fullHd, 3)
    const inside = stars.filter((s) => s.disc < GALAXY_DEEPFIELD_CLEAR_INNER)
    const outside = stars.filter((s) => s.disc > 1.3)
    expect(outside.length).toBeGreaterThan(0)
    for (const s of inside) expect(s.alpha).toBeLessThan(Math.max(...outside.map((o) => o.alpha)))
  })
})

describe('buildDeepField — Ankersterne', () => {
  it('stehen nur ausserhalb der Scheibe, sind gedeckelt und tragen als einzige ein Glanzkreuz', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const stars = fieldFor(STAGES.uhd, seed)
      const anchors = stars.filter((s) => s.spike > 0)
      expect(anchors.length).toBeLessThanOrEqual(GALAXY_DEEPFIELD_ANCHOR_MAX)
      for (const a of anchors) expect(a.disc).toBeGreaterThan(1)
      for (const s of stars) if (s.disc <= 1) expect(s.spike).toBe(0)
    }
  })
})

describe('buildDeepField — Determinismus und Resize', () => {
  it('liefert bei gleichem Seed und gleicher Grösse identische Sterne', () => {
    expect(fieldFor(STAGES.fullHd, 11)).toEqual(fieldFor(STAGES.fullHd, 11))
  })

  it('behält beim Wachsen die vorhandenen Sterne je Ebene — getrennte Ströme', () => {
    const small = fieldFor(STAGES.fullHd, 4)
    const large = fieldFor(STAGES.qhd, 4)
    // Relative Lage und Ebenenzugehörigkeit bleiben; verglichen wird die
    // Ziehreihenfolge der feinen Ebene, die als erste gefüllt wird.
    const rel = (s: { x: number; y: number }, stage: readonly [number, number]) => [
      s.x / stage[0],
      s.y / stage[1],
    ]
    const a = small.slice(0, 5).map((s) => rel(s, STAGES.fullHd))
    const b = large.slice(0, 5).map((s) => rel(s, STAGES.qhd))
    for (let i = 0; i < a.length; i++) {
      expect(a[i][0]).toBeCloseTo(b[i][0], 6)
      expect(a[i][1]).toBeCloseTo(b[i][1], 6)
    }
  })
})

describe('galaxyDiscDistance — exakt invers zu galaxyPlaneToWorld', () => {
  it('führt fünfzig geseedete Scheibenpunkte auf ihren Radius zurück', () => {
    const rng = seededRng(99)
    for (let seed = 1; seed <= 5; seed++) {
      const geo = galaxyGeo(seed * 13 + 2)
      for (let i = 0; i < 10; i++) {
        const angle = rng() * Math.PI * 2
        const r = rng() * MINIMAP_GALAXY_RADIUS * geo.radiusScale
        const p = galaxyPlaneToWorld(geo, angle, r)
        expect(galaxyDiscDistance(geo, p.x, p.y)).toBeCloseTo(
          r / (MINIMAP_GALAXY_RADIUS * geo.radiusScale),
          10,
        )
      }
    }
  })
})
