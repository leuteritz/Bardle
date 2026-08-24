import { describe, it, expect } from 'vitest'
import { galaxyFitBox, GALAXY_PLATE_REF_W, GALAXY_PLATE_REF_H } from '@/utils/fx/galaxyPlate'
import {
  VOYAGE_MAP_ASPECT_MIN,
  VOYAGE_MAP_ASPECT_MAX,
  VOYAGE_MAP_INSET_PX,
} from '@/config/constants'

/**
 * Die Fit-Box ist die einzige Brücke zwischen dem normalisierten 0..1-Raum der
 * geseedeten Galaxie-Geometrie und Pixeln. Zwei Dinge hängen daran, und beide
 * brechen still:
 *
 *  - Der BEZUGSMASSSTAB der Platte. `renderGalaxySnapshot` ruft
 *    `galaxyFitBox(320, 200, 0)` und verlässt sich darauf, dass die Box zur
 *    vollen Fläche entartet — nur dann ist `k` dort genau 1, und nur dann sind
 *    die festen Pixelwerte in `galaxyPlate.ts` in der Grösse gemeint, in der sie
 *    geschrieben stehen. Wächst die logische Standbildgrösse, wandert `k` und
 *    mit ihm jede Sternmarke, jede Strichstärke und die Funkelsternzahl.
 *  - Die KNOTEN der grossen Karte. Sie werden aus derselben Box in Prozent
 *    gesetzt; weicht sie vom Gemalten ab, schweben die Marken neben ihren
 *    Sternen.
 */

describe('galaxyFitBox — der Bezugsmassstab der Platte', () => {
  it('entartet bei der Standbildgrösse ohne Einrückung zur vollen Fläche', () => {
    const box = galaxyFitBox(GALAXY_PLATE_REF_W, GALAXY_PLATE_REF_H, 0)
    expect(box).toEqual({ x: 0, y: 0, w: GALAXY_PLATE_REF_W, h: GALAXY_PLATE_REF_H })
  })

  it('lässt den Skalierungsfaktor der Standbildgrösse genau 1 werden', () => {
    const box = galaxyFitBox(GALAXY_PLATE_REF_W, GALAXY_PLATE_REF_H, 0)
    expect(box.w / GALAXY_PLATE_REF_W).toBe(1)
  })

  it('entartet auch bei der Leistenminiatur zur vollen Fläche', () => {
    // 168×105 ist 1.6 und liegt damit mitten im Band — die Miniatur letterboxt
    // nicht, ihr Massstab ist glatt 0.525.
    expect(galaxyFitBox(168, 105, 0)).toEqual({ x: 0, y: 0, w: 168, h: 105 })
  })
})

describe('galaxyFitBox — das Seitenverhältnis-Band', () => {
  const ratio = (w: number, h: number, inset = VOYAGE_MAP_INSET_PX) => {
    const box = galaxyFitBox(w, h, inset)
    return box.w / box.h
  }

  it('klemmt eine sehr breite Zone bei VOYAGE_MAP_ASPECT_MAX', () => {
    expect(ratio(3000, 600)).toBeCloseTo(VOYAGE_MAP_ASPECT_MAX, 6)
  })

  it('klemmt eine hohe Zone bei VOYAGE_MAP_ASPECT_MIN', () => {
    expect(ratio(600, 1200)).toBeCloseTo(VOYAGE_MAP_ASPECT_MIN, 6)
  })

  it('nimmt innerhalb des Bandes die ganze eingerückte Fläche', () => {
    // 900×620 → eingerückt 864×584 → 1.48, mitten im Band
    const box = galaxyFitBox(900, 620)
    expect(box.w).toBeCloseTo(900 - VOYAGE_MAP_INSET_PX * 2, 6)
    expect(box.h).toBeCloseTo(620 - VOYAGE_MAP_INSET_PX * 2, 6)
  })

  it('lässt die Full-HD-Zone nicht mehr letterboxen', () => {
    // Der Grund, aus dem VOYAGE_MAP_ASPECT_MIN geöffnet wurde: die Kartenzone
    // misst dort 628×610, also 1.03 — bei 1.15 verlor die Box 59 px Höhe an
    // Balken, ohne dass die Scheibe dadurch besser lag.
    const box = galaxyFitBox(628, 609.6)
    expect(box.h).toBeCloseTo(609.6 - VOYAGE_MAP_INSET_PX * 2, 6)
    expect(box.w).toBeCloseTo(628 - VOYAGE_MAP_INSET_PX * 2, 6)
  })

  it('hält jedes Verhältnis im Band, welche Zone auch kommt', () => {
    for (const [w, h] of [
      [648, 662],
      [988, 700],
      [2196, 1500],
      [400, 400],
      [1600, 300],
      [200, 900],
    ]) {
      const r = ratio(w, h)
      expect(r).toBeGreaterThanOrEqual(VOYAGE_MAP_ASPECT_MIN - 1e-9)
      expect(r).toBeLessThanOrEqual(VOYAGE_MAP_ASPECT_MAX + 1e-9)
    }
  })
})

describe('galaxyFitBox — die Box liegt immer in der Zone', () => {
  it('zentriert und läuft nie über den Rand', () => {
    for (const [w, h] of [
      [648, 662],
      [988, 700],
      [2196, 1500],
      [3000, 600],
      [600, 1200],
    ]) {
      const box = galaxyFitBox(w, h)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w).toBeLessThanOrEqual(w + 1e-9)
      expect(box.y + box.h).toBeLessThanOrEqual(h + 1e-9)
      // zentriert: gleich viel Luft auf beiden Seiten
      expect(box.x).toBeCloseTo(w - (box.x + box.w), 6)
      expect(box.y).toBeCloseTo(h - (box.y + box.h), 6)
    }
  })

  it('bleibt bei entarteten Zonen positiv statt NaN zu liefern', () => {
    for (const [w, h] of [
      [0, 0],
      [1, 1],
      [VOYAGE_MAP_INSET_PX * 2, VOYAGE_MAP_INSET_PX * 2],
    ]) {
      const box = galaxyFitBox(w, h)
      expect(Number.isFinite(box.x)).toBe(true)
      expect(Number.isFinite(box.y)).toBe(true)
      expect(box.w).toBeGreaterThan(0)
      expect(box.h).toBeGreaterThan(0)
    }
  })
})
