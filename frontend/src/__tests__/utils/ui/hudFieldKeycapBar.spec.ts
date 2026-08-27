import { describe, it, expect } from 'vitest'
import { hudBarTopAt, type HudFieldMetrics } from '@/utils/ui/hudField'
import { BOTTOM_BAR_SIDE_W, BOTTOM_BAR_HEIGHT, BOTTOM_BAR_EDGE_INSET } from '@/config/constants'

/**
 * Die Keycap-Leiste in der Kontur.
 *
 * Sie sitzt über dem rechten Panel, ist aber BREITER als es — auf Full HD
 * gemessen 499 px gegen 330. Solange die Kontur nur ihre Höhe kannte, endete
 * die Panel-Zone an der Panelbreite, und der Streifen daneben meldete rund
 * 300 px freies Feld, in denen die Leiste steht. Gefunden hat es der
 * Landfall-Körper, der dort hineinfuhr; Drifter und Void-Wesen taten es vorher
 * genauso.
 */

const W = 1920
const H = 1080
const SCALE = 0.75
const REACH = 511

const METRICS: HudFieldMetrics = {
  viewportW: W,
  viewportH: H,
  hudScale: SCALE,
  headerBottom: 86,
  headerLeft: 265,
  headerRight: W - 265,
  headerCenterBottom: 133,
  centerArc: null,
  keycapBar: 30,
  keycapBarReach: REACH,
  abilityBarTop: 0,
  abilityBarHalfW: 0,
  wayfinderBottom: 0,
  wayfinderRight: 0,
  eventLogBottom: 0,
  eventLogLeft: 0,
}

const OHNE: HudFieldMetrics = { ...METRICS, keycapBarReach: 0 }

const barTop = H - BOTTOM_BAR_HEIGHT * SCALE
const panelTop = barTop + BOTTOM_BAR_EDGE_INSET - METRICS.keycapBar
const side = BOTTOM_BAR_SIDE_W * SCALE

describe('hudBarTopAt — Keycap-Leiste', () => {
  it('deckt den Streifen rechts NEBEN dem Panel bis zu ihrer Reichweite', () => {
    // Zwischen Panelkante und Leistenende: ohne die Reichweite meldete die
    // Kontur hier den tiefen Mittelstreifen.
    const x = W - (side + REACH) / 2
    expect(hudBarTopAt(x, OHNE)).toBeGreaterThan(panelTop + 100)
    expect(hudBarTopAt(x, METRICS)).toBeCloseTo(panelTop, 6)
  })

  it('spiegelt die Reichweite NICHT nach links', () => {
    const x = (side + REACH) / 2
    expect(hudBarTopAt(x, METRICS)).toBeCloseTo(hudBarTopAt(x, OHNE), 6)
  })

  it('lässt die Bildmitte frei', () => {
    expect(hudBarTopAt(W / 2, METRICS)).toBeCloseTo(hudBarTopAt(W / 2, OHNE), 6)
  })

  it('schliesst die Aussenecke des rechten Panels, weil die Leiste darüber steht', () => {
    // Innerhalb der Panelbreite, aber im Bogen der Aussenecke.
    const x = W - side + 10
    expect(hudBarTopAt(x, OHNE)).toBeGreaterThan(panelTop)
    expect(hudBarTopAt(x, METRICS)).toBeCloseTo(panelTop, 6)
  })

  it('lässt die Kontur unberührt, solange die Leiste nicht gemessen ist', () => {
    // Ungemessen heisst Reichweite 0 — dann muss der Bogen der Aussenecke
    // wieder da sein, links wie rechts.
    const links = side - 10
    expect(hudBarTopAt(links, OHNE)).toBeGreaterThan(panelTop)
    expect(hudBarTopAt(W - links, OHNE)).toBeCloseTo(hudBarTopAt(links, OHNE), 6)
  })
})
