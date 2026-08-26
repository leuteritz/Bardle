import { describe, it, expect } from 'vitest'
import {
  hudFreeBandAt,
  hudFreeBandOver,
  hudHeaderBottomAt,
  hudRightColumnBottomAt,
  type HudFieldMetrics,
} from '@/utils/ui/hudField'

/**
 * Das Eventlog-Panel in der HUD-Kontur — das Gegenstück zur Missionskarte.
 *
 * Solange das Panel temporär war, stand es bewusst NICHT in der Kontur. Seit es
 * dauerhaft oben rechts steht, gilt dort dieselbe Lücke wie links: rechts von
 * `headerRight` liefert `hudHeaderBottomAt` schlicht 0, und ohne diesen Test
 * spawnten Void-Wesen und Drifter ab sofort hinter dem Panel.
 *
 * Der Unterschied zur linken Spalte ist der ganze Grund für eine eigene
 * Funktion: dort deckelt `x <= wayfinderRight` von selbst nichts ab, wenn die
 * Karte fehlt (0). Hier ist `x >= 0` immer wahr — die Vorgabe fällt AUF statt
 * ZU, und ein ungemessenes Panel klemmte das ganze Bild.
 */

const W = 1920
const H = 1000

/** Full HD: Header 265…1655, Panel ab x=1524 bis 521 px herunter (ausgeklappt). */
const METRICS: HudFieldMetrics = {
  viewportW: W,
  viewportH: H,
  hudScale: 0.694444,
  headerBottom: 86,
  headerLeft: 265,
  headerRight: W - 265,
  headerCenterBottom: 133,
  centerArc: { cx: 695, rx: 134, ry: 106, topOffset: 84 },
  keycapBar: 30,
  abilityBarTop: 0,
  abilityBarHalfW: 0,
  wayfinderBottom: 0,
  wayfinderRight: 0,
  eventLogBottom: 521,
  eventLogLeft: 1524,
}

/** Dieselbe Kontur ohne Panel — verdeckt, oder vor dem ersten Messen. */
const WITHOUT: HudFieldMetrics = { ...METRICS, eventLogBottom: 0, eventLogLeft: 0 }

/** Eingeklappt: die Wurzel IST die Kopfzeile, `bottom` fällt auf deren Kante. */
const FOLDED: HudFieldMetrics = { ...METRICS, eventLogBottom: 118 }

describe('hudRightColumnBottomAt', () => {
  it('covers every column the panel spans', () => {
    for (const x of [1524, 1600, 1908, W]) {
      expect(hudRightColumnBottomAt(x, METRICS), `x=${x}`).toBe(METRICS.eventLogBottom)
    }
  })

  it('stops at the panel edge', () => {
    expect(hudRightColumnBottomAt(1523, METRICS)).toBe(0)
    expect(hudRightColumnBottomAt(W / 2, METRICS)).toBe(0)
  })

  // Der Test, den die linke Spalte nicht braucht: hier fällt die Vorgabe auf.
  it('clamps nothing at all while unmeasured', () => {
    for (const x of [0, W / 2, W - 1]) {
      expect(hudRightColumnBottomAt(x, WITHOUT), `x=${x}`).toBe(0)
      expect(hudRightColumnBottomAt(x, { ...METRICS, eventLogLeft: 0 }), `left=0 x=${x}`).toBe(0)
      expect(hudRightColumnBottomAt(x, { ...METRICS, eventLogBottom: 0 }), `bottom=0 x=${x}`).toBe(0)
    }
  })

  it('follows the panel down to its folded header', () => {
    expect(hudRightColumnBottomAt(1700, FOLDED)).toBe(118)
  })
})

describe('hudFreeBandAt with the event log', () => {
  it('pushes the free field below the panel where the header does not reach', () => {
    const x = 1700
    expect(hudHeaderBottomAt(x, METRICS), 'no header out here').toBe(0)
    expect(hudFreeBandAt(x, WITHOUT).top, 'the state before the panel').toBe(0)
    expect(hudFreeBandAt(x, METRICS).top).toBe(METRICS.eventLogBottom)
  })

  it('leaves the field left of the panel untouched', () => {
    for (const x of [100, W / 2, 1400]) {
      expect(hudFreeBandAt(x, METRICS).top, `x=${x}`).toBe(hudFreeBandAt(x, WITHOUT).top)
    }
  })

  it('keeps the deeper of panel and header where the two overlap', () => {
    // Bei x=1600 steht noch der Header (Kante 86), und das Panel reicht mit 521
    // tiefer — es beginnt schon bei 1524, also innerhalb der Header-Spanne.
    expect(hudFreeBandAt(1600, WITHOUT).top).toBe(86)
    expect(hudFreeBandAt(1600, METRICS).top).toBe(521)
  })

  it('makes a body dodge before its centre reaches the panel', () => {
    // Ein Körper mit 60 px Halbbreite, dessen Mitte 30 px links des Panels
    // steht, ragt mit der rechten Flanke noch hinein.
    const band = hudFreeBandOver(METRICS.eventLogLeft - 30, 60, METRICS)
    expect(band.top).toBe(METRICS.eventLogBottom)
  })

  it('never reports a band that is inverted', () => {
    for (const x of [0, 1000, 1524, 1700, W - 1]) {
      const band = hudFreeBandAt(x, METRICS)
      expect(band.bottom, `x=${x}`).toBeGreaterThan(band.top)
    }
  })
})
