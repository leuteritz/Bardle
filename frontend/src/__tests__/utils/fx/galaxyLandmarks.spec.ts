import { describe, it, expect } from 'vitest'
import {
  landmarkTier,
  landmarkPad,
  landmarkVariantFor,
  landmarkSpriteKey,
  roundLandmarkRadius,
} from '@/utils/fx/galaxyLandmarks'
import { LANDMARK_PAD_SPAN, LANDMARK_VARIANTS } from '@/config/constants'

/**
 * Canvas ist unter jsdom nicht malbar (`getContext('2d')` liefert null) — prüfbar
 * ist deshalb nur die Rechnerei. Sie trägt aber genau die Zusicherungen, an denen
 * die Bildsprache hängt:
 *
 *  - Die Schwellen sind EINGEKLEMMT, nicht gewählt. Die Radien der echten
 *    Flächen sind 3.5 / 4.5 (Leistenminiatur), 7 / 8.5 (Archivstandbild und
 *    Karte auf Full HD) und 11+ (2K, 4K, Live-Minimap). Verrutscht eine Schwelle,
 *    trägt die Miniatur plötzlich Zierrat oder das Standbild keinen mehr.
 *  - Der Radius entscheidet über den Sprite-Schlüssel. Fielen befreit und
 *    verloren in der Miniatur auf denselben Wert, wären beide Marken gleich gross.
 */

/** Massstab der Leistenminiatur: box.w 168 / GALAXY_PLATE_REF_W 320. */
const THUMB_HK = 168 / 320

describe('landmarkTier — die Stufen liegen zwischen den echten Radien', () => {
  it('lässt die Leistenminiatur auf der blanken Silhouette', () => {
    expect(landmarkTier(3.5)).toBe(0)
    expect(landmarkTier(4.5)).toBe(0)
  })

  it('gibt Standbild und Full-HD-Karte die mittlere Stufe', () => {
    expect(landmarkTier(7)).toBe(1)
    expect(landmarkTier(8.5)).toBe(1)
  })

  it('gibt Live-Minimap, 2K und 4K die volle Stufe', () => {
    expect(landmarkTier(11)).toBe(2)
    expect(landmarkTier(13.5)).toBe(2)
    expect(landmarkTier(31.5)).toBe(2)
  })

  it('wächst monoton mit dem Radius', () => {
    let last = -1
    for (let r = 0; r <= 40; r += 0.5) {
      const t = landmarkTier(r)
      expect(t).toBeGreaterThanOrEqual(last)
      last = t
    }
  })
})

describe('landmarkPad — die Randzone deckt den weitesten Zierrat', () => {
  it('umschliesst immer mindestens die Zierspanne', () => {
    for (const r of [2, 3.5, 4.5, 7, 8.5, 11, 31.5, 67]) {
      expect(landmarkPad(r)).toBeGreaterThanOrEqual(r * LANDMARK_PAD_SPAN)
    }
  })

  it('bleibt beim grössten Live-Radius in der inView-Randzone der Minimap', () => {
    // MiniMapCanvas verwirft Marken ausserhalb von ±40 px — ein Sprite, das
    // weiter hereinragte, verschwände beim Scrollen der Kamera abrupt.
    expect(landmarkPad(11)).toBeLessThanOrEqual(40)
  })
})

describe('roundLandmarkRadius — halbe Pixel, nicht ganze', () => {
  it('trennt befreiten und verlorenen Stern noch in der Leistenminiatur', () => {
    // Ganzzahlig gerundet fielen 4.46 und 3.67 beide auf 4.
    expect(roundLandmarkRadius(8.5 * THUMB_HK)).not.toBe(roundLandmarkRadius(7 * THUMB_HK))
  })

  it('hält einen Boden, damit nichts zum Punkt zerfällt', () => {
    expect(roundLandmarkRadius(0)).toBe(2)
    expect(roundLandmarkRadius(0.4)).toBe(2)
  })

  it('rastet auf halbe Schritte und bleibt monoton', () => {
    let last = 0
    for (let r = 2; r <= 40; r += 0.1) {
      const v = roundLandmarkRadius(r)
      expect(v * 2).toBe(Math.round(v * 2))
      expect(v).toBeGreaterThanOrEqual(last)
      last = v
    }
  })
})

describe('Sprite-Schlüssel und Varianten', () => {
  it('hält die Variante im gültigen Bereich, auch bei negativem Index', () => {
    for (const i of [-4, -1, 0, 1, 7, 41]) {
      const v = landmarkVariantFor(i)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(LANDMARK_VARIANTS)
    }
  })

  it('unterscheidet in jedem Feld', () => {
    const base = landmarkSpriteKey('star-freed', 9, 2, 0)
    expect(landmarkSpriteKey('star-lost', 9, 2, 0)).not.toBe(base)
    expect(landmarkSpriteKey('star-freed', 8.5, 2, 0)).not.toBe(base)
    expect(landmarkSpriteKey('star-freed', 9, 3.1, 0)).not.toBe(base)
    expect(landmarkSpriteKey('star-freed', 9, 2, 1)).not.toBe(base)
  })

  it('ist für dieselbe Marke stabil', () => {
    expect(landmarkSpriteKey('star-freed', 9, 2, 1)).toBe(landmarkSpriteKey('star-freed', 9, 2, 1))
  })
})
