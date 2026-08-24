import { describe, it, expect } from 'vitest'
import {
  snapshotRenderScale,
  thumbRenderScale,
  GALAXY_SNAPSHOT_W,
  GALAXY_SNAPSHOT_H,
} from '@/utils/fx/galaxySnapshot'
import { galaxyFitBox, GALAXY_PLATE_REF_W } from '@/utils/fx/galaxyPlate'
import {
  GALAXY_SNAPSHOT_DISPLAY_W,
  GALAXY_SNAPSHOT_MAX_DPR,
  VOYAGE_RAIL_THUMB_W,
  VOYAGE_RAIL_THUMB_H,
} from '@/config/constants'

/**
 * Zwei Dinge hängen an der Rasterdichte, und beide brechen still:
 *
 *  - Zu WENIG Dichte heisst ein weiches Bild auf HiDPI. Das war der Anlass: das
 *    Standbild rasterte 640×400 und wurde bis 992 Gerätepixel breit gezeigt.
 *  - Zu VIEL Dichte heisst Mehrarbeit ohne Gewinn. Auf DPR 1 und 1,25 deckt der
 *    bisherige 2×-Wert die Anzeige bereits ab; wer die Skala fest hochzieht,
 *    macht jeden Nicht-HiDPI-Rechner 2,4× teurer, ohne dass er etwas sieht.
 *
 * Die logische Grösse steht daneben: sie darf NICHT wachsen, sonst wandert der
 * Massstab `k` in `paintGalaxy` und mit ihm die ganze Komposition.
 */

const THUMB_W = 168
const THUMB_H = 105

describe('Rasterdichte — deckt die Anzeige, ohne sie zu übertreffen', () => {
  it('deckt auf jeder Dichtestufe den Gerätebedarf des Standbilds', () => {
    for (const dpr of [1, 1.25, 1.5, 2]) {
      const deviceW = GALAXY_SNAPSHOT_W * snapshotRenderScale(dpr)
      expect(deviceW).toBeGreaterThanOrEqual(GALAXY_SNAPSHOT_DISPLAY_W * dpr - 1e-9)
    }
  })

  it('deckt auf jeder Dichtestufe den Gerätebedarf der Leistenminiatur', () => {
    for (const dpr of [1, 1.25, 1.5, 2]) {
      const deviceW = THUMB_W * thumbRenderScale(dpr)
      expect(deviceW).toBeGreaterThanOrEqual(VOYAGE_RAIL_THUMB_W * dpr - 1e-9)
    }
  })

  it('rastert auf DPR 1 und 1,25 nicht teurer als vor dem Umbau', () => {
    for (const dpr of [1, 1.25]) {
      expect(snapshotRenderScale(dpr)).toBe(2)
      expect(thumbRenderScale(dpr)).toBe(1)
    }
  })

  it('hebt die Dichte nur auf HiDPI an', () => {
    expect(snapshotRenderScale(2)).toBeGreaterThan(2)
    expect(thumbRenderScale(2)).toBeGreaterThan(1)
  })

  it('wächst monoton mit der Gerätedichte', () => {
    let lastS = 0
    let lastT = 0
    for (let dpr = 1; dpr <= GALAXY_SNAPSHOT_MAX_DPR; dpr += 0.05) {
      const s = snapshotRenderScale(dpr)
      const t = thumbRenderScale(dpr)
      expect(s).toBeGreaterThanOrEqual(lastS)
      expect(t).toBeGreaterThanOrEqual(lastT)
      lastS = s
      lastT = t
    }
  })
})

describe('Die logische Grösse bleibt der Bezugsmassstab', () => {
  it('lässt den Massstab des Standbilds genau 1', () => {
    expect(GALAXY_SNAPSHOT_W).toBe(GALAXY_PLATE_REF_W)
    expect(galaxyFitBox(GALAXY_SNAPSHOT_W, GALAXY_SNAPSHOT_H, 0).w / GALAXY_PLATE_REF_W).toBe(1)
  })

  it('lässt den Massstab der Miniatur bei 0,525', () => {
    expect(galaxyFitBox(THUMB_W, THUMB_H, 0).w / GALAXY_PLATE_REF_W).toBeCloseTo(0.525, 6)
  })

  it('hält beide Stufen auf dem Seitenverhältnis der Rahmen (16:10)', () => {
    // Archivkarte und Übersichtskarte setzen `aspect-ratio: 16 / 10`; eine
    // abweichende Rasterform würde dort beschnitten statt gezeigt.
    expect(GALAXY_SNAPSHOT_W / GALAXY_SNAPSHOT_H).toBeCloseTo(1.6, 6)
    expect(THUMB_W / THUMB_H).toBeCloseTo(1.6, 6)
    expect(VOYAGE_RAIL_THUMB_W / VOYAGE_RAIL_THUMB_H).toBeCloseTo(1.6, 6)
  })

  it('trennt Standbild und Miniatur über die Gerätebreite im Cache-Schlüssel', () => {
    for (const dpr of [1, 1.25, 2]) {
      const full = Math.round(GALAXY_SNAPSHOT_W * snapshotRenderScale(dpr))
      const thumb = Math.round(THUMB_W * thumbRenderScale(dpr))
      expect(full).not.toBe(thumb)
    }
  })
})
