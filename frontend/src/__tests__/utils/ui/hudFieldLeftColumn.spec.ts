import { describe, it, expect } from 'vitest'
import {
  hudFreeBandAt,
  hudFreeBandOver,
  hudHeaderBottomAt,
  hudLeftColumnBottomAt,
  type HudFieldMetrics,
} from '@/utils/ui/hudField'

/**
 * Die Missionskarte in der HUD-Kontur.
 *
 * Sie ist das erste dauerhafte Element in der linken Spalte, und dort galt
 * bisher: „ausserhalb des Headers gibt es kein Chrome" (`hudHeaderBottomAt`
 * liefert für `x < headerLeft` schlicht 0). Genau in diese Lücke hängt die
 * Karte — ohne diesen Test liefen Drifter und Void-Wesen ab sofort regelmässig
 * dahinter, und zwar dauerhaft statt nur, solange ein Vorzeichen offen ist.
 *
 * Gemessen wird die FUNKTION, nicht die Bahn: die Wesen zeichnen auf einem
 * Canvas und tragen ihre Position nirgends als Feld, ein `elementFromPoint` im
 * Browser findet sie also nicht. Hier ist der Beleg belastbar.
 */

const W = 1920
const H = 1000

/** Full HD, gerechnet: Header von x=404 bis 1516, Karte 12…392 × 8…209. */
const METRICS: HudFieldMetrics = {
  viewportW: W,
  viewportH: H,
  hudScale: 0.694444,
  headerBottom: 86,
  headerLeft: 404,
  headerRight: W - 404,
  headerCenterBottom: 133,
  centerArc: { cx: 556, rx: 110, ry: 106, topOffset: 84 },
  keycapBar: 30,
  keycapBarReach: 0,
  abilityBarTop: 0,
  abilityBarHalfW: 0,
  wayfinderBottom: 209,
  wayfinderRight: 392,
  eventLogBottom: 0,
  eventLogLeft: 0,
}

/** Dieselbe Kontur ohne Karte — der Zustand vor dem Wayfinder. */
const WITHOUT: HudFieldMetrics = { ...METRICS, wayfinderBottom: 0, wayfinderRight: 0 }

describe('hudLeftColumnBottomAt', () => {
  it('covers every column the card spans', () => {
    for (const x of [0, 12, 200, 391, 392]) {
      expect(hudLeftColumnBottomAt(x, METRICS), `x=${x}`).toBe(METRICS.wayfinderBottom)
    }
  })

  it('stops at the card edge', () => {
    expect(hudLeftColumnBottomAt(393, METRICS)).toBe(0)
    expect(hudLeftColumnBottomAt(W / 2, METRICS)).toBe(0)
  })

  it('vanishes when the card is gone', () => {
    expect(hudLeftColumnBottomAt(100, WITHOUT)).toBe(0)
  })
})

describe('hudFreeBandAt with the mission card', () => {
  it('pushes the free field below the card where the header does not reach', () => {
    // Genau der Punkt, an dem es vorher 0 war: links von `headerLeft` kennt die
    // Kontur keinen Header.
    const x = 120
    expect(hudHeaderBottomAt(x, METRICS), 'no header out here').toBe(0)
    expect(hudFreeBandAt(x, WITHOUT).top, 'the state before the card').toBe(0)
    expect(hudFreeBandAt(x, METRICS).top).toBe(METRICS.wayfinderBottom)
  })

  it('leaves the field beyond the card untouched', () => {
    for (const x of [450, W / 2, W - 100]) {
      expect(hudFreeBandAt(x, METRICS).top, `x=${x}`).toBe(hudFreeBandAt(x, WITHOUT).top)
    }
  })

  it('keeps the deeper of card and header where the two overlap', () => {
    // Bei x=404 beginnt der Header (Kante 86) — die Karte reicht dort mit 209
    // tiefer und muss gewinnen. Sie endet allerdings schon bei 392, also greift
    // an dieser Spalte nur der Header.
    expect(hudFreeBandAt(404, METRICS).top).toBe(86)
    const wide: HudFieldMetrics = { ...METRICS, wayfinderRight: 440 }
    expect(hudFreeBandAt(404, wide).top).toBe(209)
  })

  it('makes a body dodge before its centre reaches the card', () => {
    // Ein Körper mit 60 px Halbbreite, dessen Mitte 30 px rechts der Karte
    // steht, ragt mit der linken Flanke noch hinein.
    const band = hudFreeBandOver(METRICS.wayfinderRight + 30, 60, METRICS)
    expect(band.top).toBe(METRICS.wayfinderBottom)
  })

  it('never reports a band that is inverted', () => {
    for (const x of [0, 120, 392, 600, W - 1]) {
      const band = hudFreeBandAt(x, METRICS)
      expect(band.bottom, `x=${x}`).toBeGreaterThan(band.top)
    }
  })
})
