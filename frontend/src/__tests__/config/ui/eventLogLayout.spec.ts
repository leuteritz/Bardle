import { describe, it, expect } from 'vitest'
import { EVENT_GROUPS } from '@/config/ui/eventLog'
import { hudBarTopAt, type HudFieldMetrics } from '@/utils/ui/hudField'
import {
  EVENT_LOG_PANEL_MIN_W,
  EVENT_LOG_PANEL_VW,
  EVENT_LOG_PANEL_MAX_W,
  EVENT_LOG_PANEL_MIN_H,
  EVENT_LOG_PANEL_VH,
  EVENT_LOG_PANEL_MAX_H,
  EVENT_LOG_PANEL_TOP_GAP,
  EVENT_LOG_TAB_MIN_W,
  EVENT_LOG_TAB_ACTIVE_W,
} from '@/config/constants'

/**
 * Der Wächter über das Budget des Eventlog-Panels.
 *
 * Es steht dauerhaft im Bild, also ist jede seiner Zahlen eine Zusage an zwei
 * Seiten: nach unten an die Bühne (was es deckt, ist für Spielobjekte weg) und
 * nach innen an die fünf Tabs (was die Kopfleiste nicht trägt, fällt still aus
 * dem Streifen). Beides ist gerechnet, nicht gemessen — der DOM-Beleg liegt im
 * Playwright-Lauf, hier stehen die Zahlen, aus denen das CSS gebaut wird.
 */

const clamp = (min: number, val: number, max: number) => Math.min(Math.max(val, min), max)

const panelWidth = (viewportW: number) =>
  clamp(EVENT_LOG_PANEL_MIN_W, (viewportW * EVENT_LOG_PANEL_VW) / 100, EVENT_LOG_PANEL_MAX_W)

const panelHeight = (viewportH: number) =>
  clamp(EVENT_LOG_PANEL_MIN_H, (viewportH * EVENT_LOG_PANEL_VH) / 100, EVENT_LOG_PANEL_MAX_H)

/**
 * Schriftmodell der Tab-Labels, im Browser NACHGEMESSEN: die fünf Labels der
 * `wide`-Stufe wogen bei 11 px und 0,09 em Sperrung zusammen 224,1 px auf 29
 * Zeichen — abzüglich der Sperrung sind das 0,613 em Vorschub je Versalie.
 *
 * Ein geschätzter Faktor lag um bis zu 18 % daneben und hätte „Progress" in
 * einem randvollen Tab beschnitten. Deshalb steht hier die Messung, nicht die
 * Schätzung, und die Stufe rechnet mit ihrer eigenen Schriftgröße.
 */
const ADVANCE_EM = 0.613
const TAB_FONT_PX = 10
const TAB_TRACKING_EM = 0.05
const PX_PER_CHAR = ADVANCE_EM * TAB_FONT_PX + TAB_TRACKING_EM * TAB_FONT_PX
const PANEL_BORDER = 8
const STRIP_BORDER = 2
const DIVIDERS = EVENT_GROUPS.length - 1

const CONTROLS_PAD = 10
const TAB_PAD = 12
const TAB_ICON = 14
const TAB_GAP = 4
const COUNT_CHIP = 20

/** Was der Tab-Streifen an Breite hat, wenn das Panel `w` misst. */
const stripWidth = (w: number) =>
  w - PANEL_BORDER - 2 * CONTROLS_PAD - STRIP_BORDER - DIVIDERS

const labelWidth = (label: string) => label.length * PX_PER_CHAR

/** Ein Tab ohne Namen: Polster, Icon, Zahl. */
const idleTabWidth = () => TAB_PAD + TAB_ICON + TAB_GAP + COUNT_CHIP

/** Der aktive Tab traegt zusaetzlich seinen Namen. */
const activeTabWidth = (label: string) => idleTabWidth() + TAB_GAP + labelWidth(label)

describe('event log panel — the stage it takes', () => {
  it('keeps clear of the bottom bar on the flattest reference viewport', () => {
    const W = 1920
    const H = 950
    const metrics: HudFieldMetrics = {
      viewportW: W,
      viewportH: H,
      hudScale: 0.694444,
      headerBottom: 86,
      headerLeft: 265,
      headerRight: W - 265,
      headerCenterBottom: 133,
      centerArc: null,
      keycapBar: 30,
      abilityBarTop: 0,
      abilityBarHalfW: 0,
      wayfinderBottom: 0,
      wayfinderRight: 0,
      eventLogBottom: 0,
      eventLogLeft: 0,
    }
    const bottom = metrics.headerBottom + EVENT_LOG_PANEL_TOP_GAP + panelHeight(H)

    // Über der Keycap-Leiste, die auf dem rechten Panel reitet — dort ist die
    // Kontur am höchsten, und genau dort steht das Log.
    expect(bottom).toBeLessThan(hudBarTopAt(W - 1, metrics) - 40)
  })

  it('never grows wider than the free column beside a 2K header', () => {
    // Der Header ist bei 2560 auf 1400 gedeckelt, links wie rechts bleiben 580.
    expect(panelWidth(2560)).toBeLessThanOrEqual(580 - 12)
    expect(panelWidth(3840)).toBe(EVENT_LOG_PANEL_MAX_W)
  })

  it('reaches the reference resolutions at the widths the CSS assumes', () => {
    expect(Math.round(panelWidth(1920))).toBe(384)
    expect(panelWidth(2560)).toBe(EVENT_LOG_PANEL_MAX_W)
    expect(Math.round(panelHeight(950))).toBe(428)
    expect(panelHeight(2030)).toBe(EVENT_LOG_PANEL_MAX_H)
  })
})

describe('event log panel — the one tab row', () => {
  // Es gibt KEINE Breitenstaffel mehr: der Floor macht das Panel nie schmaler
  // als EVENT_LOG_PANEL_MIN_W, und eine Staffel haette dem breiteren Schirm
  // Zahlen weggenommen, die der schmalere zeigt.
  it('fits five counted tabs plus the active name at the narrowest panel', () => {
    const widest = EVENT_GROUPS.reduce(
      (max, group) => Math.max(max, labelWidth(group.label.toUpperCase())),
      0,
    )
    const need = (EVENT_GROUPS.length - 1) * idleTabWidth() + activeTabWidth('PROGRESS')
    expect(Math.round(widest)).toBeLessThanOrEqual(Math.round(labelWidth('PROGRESS')))
    expect(need).toBeLessThanOrEqual(stripWidth(EVENT_LOG_PANEL_MIN_W))
  })

  it('keeps room to spare at the reference resolutions', () => {
    for (const viewport of [1920, 2560, 3840]) {
      const need = (EVENT_GROUPS.length - 1) * idleTabWidth() + activeTabWidth('PROGRESS')
      expect(need, `${viewport}px`).toBeLessThanOrEqual(stripWidth(panelWidth(viewport)) - 20)
    }
  })

  // Die beiden Konstanten beschreiben, was das CSS baut — driften sie, misst
  // niemand nach, bis ein Name beschnitten im Bild steht.
  it('matches the tab budget the constants promise', () => {
    expect(idleTabWidth()).toBeLessThanOrEqual(EVENT_LOG_TAB_MIN_W)
    expect(activeTabWidth('PROGRESS')).toBeLessThanOrEqual(EVENT_LOG_TAB_ACTIVE_W)
  })

  it('never spends more than a fifth of a row on the clock', () => {
    // 52 px Spalte plus 8 gap, und die Uhr traegt IMMER Sekunden: die kurze
    // Fassung sparte 20 px und kostete das, was im Kampf zaehlt.
    const rowInner = EVENT_LOG_PANEL_MIN_W - PANEL_BORDER - 2 * CONTROLS_PAD
    expect(60 / rowInner).toBeLessThanOrEqual(0.2)
  })
})
