import { describe, it, expect } from 'vitest'
import { hudBarTopAt, type HudFieldMetrics } from '@/utils/ui/hudField'
import { BOTTOM_BAR_SIDE_W, BOTTOM_BAR_HEIGHT, BOTTOM_BAR_EDGE_INSET } from '@/config/constants'

/**
 * Der Keycap-Block in der Kontur.
 *
 * Er sitzt über der Minimap LINKS, ist aber BREITER als sie — auf Full HD
 * gemessen ~385 px gegen 290. Solange die Kontur nur seine Höhe kannte, endete
 * die Panel-Zone an der Panelbreite, und der Streifen daneben meldete rund
 * 100 px freies Feld, in denen die Keycaps stehen. Gefunden hat es (noch auf
 * der rechten Seite) der Landfall-Körper, der dort hineinfuhr.
 */

const W = 1920
const H = 1080
const SCALE = 0.75
const REACH = 400

const METRICS: HudFieldMetrics = {
  viewportW: W,
  viewportH: H,
  hudScale: SCALE,
  headerBottom: 86,
  headerLeft: 265,
  headerRight: W - 265,
  headerCenterBottom: 133,
  centerArc: null,
  keycapBar: 52,
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

describe('hudBarTopAt — Keycap-Block', () => {
  it('deckt den Streifen links NEBEN der Minimap bis zu seiner Reichweite', () => {
    // Zwischen Panelkante und Blockende: ohne die Reichweite meldete die
    // Kontur hier den tiefen Mittelstreifen.
    const x = (side + REACH) / 2
    expect(hudBarTopAt(x, OHNE)).toBeGreaterThan(panelTop + 100)
    expect(hudBarTopAt(x, METRICS)).toBeCloseTo(panelTop, 6)
  })

  it('spiegelt die Reichweite NICHT nach rechts', () => {
    // Über dem Command-Panel steht nur der flüchtige Buff-Stapel — ungemeldet.
    const x = W - (side + REACH) / 2
    expect(hudBarTopAt(x, METRICS)).toBeCloseTo(hudBarTopAt(x, OHNE), 6)
  })

  it('rechnet die HÖHE auf beiden Seiten', () => {
    expect(hudBarTopAt(side / 2, METRICS)).toBeCloseTo(panelTop, 6)
    expect(hudBarTopAt(W - side / 2, METRICS)).toBeCloseTo(panelTop, 6)
  })

  it('lässt die Bildmitte frei', () => {
    expect(hudBarTopAt(W / 2, METRICS)).toBeCloseTo(hudBarTopAt(W / 2, OHNE), 6)
  })

  it('schliesst die Aussenecke der Minimap, weil der Block darüber steht', () => {
    // Innerhalb der Panelbreite, aber im Bogen der Aussenecke.
    const x = side - 10
    expect(hudBarTopAt(x, OHNE)).toBeGreaterThan(panelTop)
    expect(hudBarTopAt(x, METRICS)).toBeCloseTo(panelTop, 6)
    // Rechts bleibt der Bogen offen.
    expect(hudBarTopAt(W - x, METRICS)).toBeGreaterThan(panelTop)
  })

  it('lässt die Kontur unberührt, solange der Block nicht gemessen ist', () => {
    // Ungemessen heisst Reichweite 0 — dann muss der Bogen der Aussenecke
    // wieder da sein, links wie rechts.
    const links = side - 10
    expect(hudBarTopAt(links, OHNE)).toBeGreaterThan(panelTop)
    expect(hudBarTopAt(W - links, OHNE)).toBeCloseTo(hudBarTopAt(links, OHNE), 6)
  })
})
