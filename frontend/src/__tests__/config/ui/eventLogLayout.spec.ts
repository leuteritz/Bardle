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
  EVENT_LOG_BESIDE_HEADER_MIN_VW,
  EVENT_LOG_PANEL_HEADER_GAP,
  EVENT_LOG_PANEL_EDGE_GAP,
  HEADER_SIDE_GUTTER_TOTAL,
  HEADER_MIN_WIDTH,
  HEADER_MAX_WIDTH,
  HEADER_PAGE_INSET,
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
 * Die freie Gasse neben dem Header — dieselbe Rechnung wie `--header-max-width`
 * in `App.vue`, gegen den `px-4`-Container des Seitenlayouts.
 */
const headerWidth = (viewportW: number) =>
  clamp(HEADER_MIN_WIDTH, viewportW - HEADER_SIDE_GUTTER_TOTAL, HEADER_MAX_WIDTH)

const gutter = (viewportW: number) =>
  HEADER_PAGE_INSET + (viewportW - 2 * HEADER_PAGE_INSET - headerWidth(viewportW)) / 2

/** Was das Panel an Gasse braucht, um neben dem Header zu stehen. */
const gutterNeeded = (viewportW: number) =>
  panelWidth(viewportW) + EVENT_LOG_PANEL_EDGE_GAP + EVENT_LOG_PANEL_HEADER_GAP

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
    // Das Panel steht auf Full HD NEBEN dem Header, seine Oberkante ist der
    // eigene Rand (0.5rem), nicht mehr die Header-Unterkante.
    const bottom = 8 + panelHeight(H)

    // Über der Keycap-Leiste, die auf dem rechten Panel reitet — dort ist die
    // Kontur am höchsten, und genau dort steht das Log.
    expect(bottom).toBeLessThan(hudBarTopAt(W - 1, metrics) - 40)
  })

  /**
   * Dieselbe Zusage für die ANDERE Lage: unterhalb der Schwelle hängt das Panel
   * weiterhin an der Header-Unterkante, und dort trägt `EVENT_LOG_PANEL_TOP_GAP`
   * den Abstand. Ohne diesen Fall wäre die Konstante unbelegt.
   */
  it('clears the bottom bar while it still hangs below the header', () => {
    // Full HD bei 125 % Skalierung: 1536 CSS-Pixel, Header auf seinem Boden.
    const W = 1536
    const H = 864
    const headerBottom = 74.53
    const metrics: HudFieldMetrics = {
      viewportW: W,
      viewportH: H,
      hudScale: 0.6,
      headerBottom,
      headerLeft: 244,
      headerRight: W - 244,
      headerCenterBottom: 113,
      centerArc: null,
      keycapBar: 30,
      abilityBarTop: 0,
      abilityBarHalfW: 0,
      wayfinderBottom: 0,
      wayfinderRight: 0,
      eventLogBottom: 0,
      eventLogLeft: 0,
    }
    expect(gutter(W)).toBeLessThan(gutterNeeded(W))
    const bottom = headerBottom + EVENT_LOG_PANEL_TOP_GAP + panelHeight(H)
    expect(bottom).toBeLessThan(hudBarTopAt(W - 1, metrics) - 40)
  })

  it('never grows wider than the free column beside a 2K header', () => {
    // Der Header ist bei 2560 auf 1400 gedeckelt, links wie rechts bleiben 580.
    expect(Math.round(gutter(2560))).toBe(580)
    expect(panelWidth(2560)).toBeLessThanOrEqual(580 - 12)
    expect(panelWidth(3840)).toBe(EVENT_LOG_PANEL_MAX_W)
  })

  /**
   * Die eigentliche Zusage des schmalen Headers: die Gasse traegt das Panel in
   * voller Breite. Wer `--header-max-width` wieder aufweitet, bricht hier.
   */
  it('fits the panel beside the header at every reference resolution', () => {
    for (const viewport of [1920, 2560, 3840]) {
      expect(gutter(viewport), `${viewport}px`).toBeGreaterThanOrEqual(gutterNeeded(viewport))
    }
    // Full HD ist der enge Fall: 404 gegen 384 + 12 + 8.
    expect(Math.round(gutter(1920))).toBe(404)
    expect(gutterNeeded(1920)).toBe(404)
  })

  /**
   * ...und die Gegenprobe. Ohne sie waere die Media Query im CSS blosser
   * Zierrat: das Panel duerfte auch darunter hochruecken und laege dann auf
   * dem Header.
   */
  it('keeps the panel below the header where the gutter cannot carry it', () => {
    // Full HD bei 125 % Skalierung — 1536 CSS-Pixel, Header auf seinem Boden.
    expect(gutter(1536)).toBeLessThan(gutterNeeded(1536))
    expect(headerWidth(1536)).toBe(HEADER_MIN_WIDTH)
    // Die Schwelle im CSS liegt ueber dem Punkt, an dem es gerade passt.
    expect(gutter(EVENT_LOG_BESIDE_HEADER_MIN_VW)).toBeGreaterThanOrEqual(
      gutterNeeded(EVENT_LOG_BESIDE_HEADER_MIN_VW),
    )
    expect(gutter(EVENT_LOG_BESIDE_HEADER_MIN_VW - 100)).toBeLessThan(
      gutterNeeded(EVENT_LOG_BESIDE_HEADER_MIN_VW - 100),
    )
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
