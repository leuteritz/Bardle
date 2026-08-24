import { describe, it, expect } from 'vitest'
import { routeLegStyle } from '@/utils/fx/galaxyPlate'
import {
  ROUTE_TRAIL_ALPHA_MIN,
  ROUTE_TRAIL_WIDTH_MIN,
  ROUTE_TRAIL_BANDS_LIVE,
} from '@/config/constants'

/**
 * Die Route erzählt ihre Richtung über einen Verlauf: am Abflugportal dünn und
 * blass, am befreiten Kern voll. Zwei Dinge daran sind bindend.
 *
 * Erstens die ENDEN — läge die letzte Etappe nicht auf der vollen Deckkraft,
 * wäre die Route insgesamt blasser als vorher, statt gerichtet.
 *
 * Zweitens `bands`: die Live-Minimap malt die Route während der Zoomfahrt in
 * JEDEM Frame ungecacht. Ohne Quantisierung wären das bei einer vollen Galaxie
 * 37 `stroke()` je Frame statt vier.
 */

const ALPHA = 0.55
const HK = 1

describe('routeLegStyle — der Verlauf vom Portal zum Kern', () => {
  it('startet auf den Minima', () => {
    const first = routeLegStyle(0, 10, ALPHA, HK)
    expect(first.alpha).toBeCloseTo(ALPHA * ROUTE_TRAIL_ALPHA_MIN, 9)
    expect(first.width).toBeCloseTo(1.6 * HK * ROUTE_TRAIL_WIDTH_MIN, 9)
  })

  it('endet auf voller Deckkraft und voller Strichstärke', () => {
    const last = routeLegStyle(9, 10, ALPHA, HK)
    expect(last.alpha).toBeCloseTo(ALPHA, 9)
    expect(last.width).toBeCloseTo(1.6 * HK, 9)
  })

  it('wächst monoton über die Etappen', () => {
    let a = -1
    let w = -1
    for (let i = 0; i < 37; i++) {
      const leg = routeLegStyle(i, 37, ALPHA, HK)
      expect(leg.alpha).toBeGreaterThanOrEqual(a)
      expect(leg.width).toBeGreaterThanOrEqual(w)
      a = leg.alpha
      w = leg.width
    }
  })

  it('läuft bei einer einzigen Etappe nicht in eine Division durch null', () => {
    for (const legs of [0, 1]) {
      const leg = routeLegStyle(0, legs, ALPHA, HK)
      expect(Number.isFinite(leg.alpha)).toBe(true)
      expect(Number.isFinite(leg.width)).toBe(true)
    }
  })

  it('bleibt bei einem Index über der Etappenzahl auf der Vollstärke', () => {
    const leg = routeLegStyle(50, 10, ALPHA, HK)
    expect(leg.alpha).toBeCloseTo(ALPHA, 9)
  })

  it('skaliert die Strichstärke mit dem Massstab', () => {
    expect(routeLegStyle(9, 10, ALPHA, 2).width).toBeCloseTo(
      2 * routeLegStyle(9, 10, ALPHA, 1).width,
      9,
    )
  })
})

describe('routeLegStyle — Bänder für die Live-Minimap', () => {
  it('reduziert 37 Etappen auf höchstens ROUTE_TRAIL_BANDS_LIVE Stile', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 37; i++) {
      const leg = routeLegStyle(i, 37, ALPHA, HK, ROUTE_TRAIL_BANDS_LIVE)
      seen.add(`${leg.alpha.toFixed(6)}|${leg.width.toFixed(6)}`)
    }
    expect(seen.size).toBeLessThanOrEqual(ROUTE_TRAIL_BANDS_LIVE)
  })

  it('behält dabei beide Enden des Verlaufs', () => {
    const first = routeLegStyle(0, 37, ALPHA, HK, ROUTE_TRAIL_BANDS_LIVE)
    const last = routeLegStyle(36, 37, ALPHA, HK, ROUTE_TRAIL_BANDS_LIVE)
    expect(first.alpha).toBeCloseTo(ALPHA * ROUTE_TRAIL_ALPHA_MIN, 9)
    expect(last.alpha).toBeCloseTo(ALPHA, 9)
  })

  it('bleibt auch quantisiert monoton', () => {
    let a = -1
    for (let i = 0; i < 37; i++) {
      const leg = routeLegStyle(i, 37, ALPHA, HK, ROUTE_TRAIL_BANDS_LIVE)
      expect(leg.alpha).toBeGreaterThanOrEqual(a)
      a = leg.alpha
    }
  })
})
