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
  EVENT_LOG_BAR_H,
  EVENT_LOG_BAR_PAD,
  EVENT_LOG_BAR_GAP,
  EVENT_LOG_TAB_MIN_W,
  EVENT_LOG_TOOL_W,
  EVENT_LOG_TRAIL_FADE_PX,
  EVENT_LOG_TRAIL_MAX_ROWS,
  EVENT_LOG_BESIDE_HEADER_MIN_VW,
  EVENT_LOG_PANEL_HEADER_GAP,
  EVENT_LOG_PANEL_EDGE_GAP,
  HEADER_SIDE_GUTTER_TOTAL,
  HEADER_MIN_WIDTH,
  HEADER_MAX_WIDTH,
  HEADER_PAGE_INSET,
} from '@/config/constants'

/**
 * Der Wächter über das Budget der Eventlog-Spur.
 *
 * Sie steht dauerhaft im Bild, also ist jede ihrer Zahlen eine Zusage an zwei
 * Seiten: nach unten an die Bühne (was sie deckt, ist für Spielobjekte weg) und
 * nach innen an die eine Leiste (was die nicht trägt, fällt still heraus).
 * Beides ist gerechnet, nicht gemessen — der DOM-Beleg liegt im Playwright-Lauf,
 * hier stehen die Zahlen, aus denen das CSS gebaut wird.
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

/** Was die Spur an Gasse braucht, um neben dem Header zu stehen. */
const gutterNeeded = (viewportW: number) =>
  panelWidth(viewportW) + EVENT_LOG_PANEL_EDGE_GAP + EVENT_LOG_PANEL_HEADER_GAP

// Was das CSS der Leiste baut: Polster, Icon, Zahl je Tab, dazu die Lücke
// zwischen zwei Tabs. Der aktive Tab trägt KEINEN Namen mehr — er wog 80 px in
// einer Reihe von 352, und die drei Werkzeuge rechts wollen auch stehen.
const TAB_PAD = 12
const TAB_ICON = 14
const TAB_INNER_GAP = 4
const TAB_COUNT = 20
const TAB_GAP = 2

const idleTabWidth = () => TAB_PAD + TAB_ICON + TAB_INNER_GAP + TAB_COUNT

/** Innenraum der Leiste, wenn die Spur `w` misst (1px Rahmen je Seite). */
const barInner = (w: number) => w - 2 - 2 * EVENT_LOG_BAR_PAD

/** Fünf gezählte Tabs, drei randlose Werkzeuge, die Lücken dazwischen. */
const TOOLS = 3
const barNeed = () =>
  EVENT_GROUPS.length * idleTabWidth() +
  (EVENT_GROUPS.length - 1) * TAB_GAP +
  TOOLS * EVENT_LOG_TOOL_W +
  TOOLS * EVENT_LOG_BAR_GAP

describe('event log trail — the stage it takes', () => {
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
    // Die Spur steht auf Full HD NEBEN dem Header, ihre Oberkante ist der
    // eigene Rand (0.5rem), nicht mehr die Header-Unterkante.
    const bottom = 8 + panelHeight(H)

    // Über der Keycap-Leiste, die auf dem rechten Panel reitet — dort ist die
    // Kontur am höchsten, und genau dort steht das Log.
    expect(bottom).toBeLessThan(hudBarTopAt(W - 1, metrics) - 40)
  })

  /**
   * Dieselbe Zusage für die ANDERE Lage: unterhalb der Schwelle hängt die Spur
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
   * Die eigentliche Zusage des schmalen Headers: die Gasse traegt die Spur in
   * voller Breite. Wer `--header-max-width` wieder aufweitet, bricht hier.
   */
  it('fits the trail beside the header at every reference resolution', () => {
    for (const viewport of [1920, 2560, 3840]) {
      expect(gutter(viewport), `${viewport}px`).toBeGreaterThanOrEqual(gutterNeeded(viewport))
    }
    // Full HD ist der enge Fall: 404 gegen 384 + 12 + 8.
    expect(Math.round(gutter(1920))).toBe(404)
    expect(gutterNeeded(1920)).toBe(404)
  })

  /**
   * ...und die Gegenprobe. Ohne sie waere die Media Query im CSS blosser
   * Zierrat: die Spur duerfte auch darunter hochruecken und laege dann auf
   * dem Header.
   */
  it('keeps the trail below the header where the gutter cannot carry it', () => {
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

  it('reaches the reference resolutions at the box the CSS assumes', () => {
    expect(Math.round(panelWidth(1920))).toBe(384)
    expect(panelWidth(2560)).toBe(EVENT_LOG_PANEL_MAX_W)
    // Ein Drittel Bildhöhe, nicht die Hälfte: die rahmenlose Spur deckt
    // weiterhin, was hinter ihr steht.
    expect(Math.round(panelHeight(950))).toBe(285)
    expect(Math.round(panelHeight(1310))).toBe(393)
    expect(panelHeight(2030)).toBe(EVENT_LOG_PANEL_MAX_H)
    expect(panelHeight(950)).toBeLessThan(950 / 3)
  })
})

describe('event log trail — the one bar', () => {
  it('fits five counted tabs and three tools at the narrowest trail', () => {
    expect(idleTabWidth()).toBeLessThanOrEqual(EVENT_LOG_TAB_MIN_W)
    expect(barNeed()).toBeLessThanOrEqual(barInner(EVENT_LOG_PANEL_MIN_W))
  })

  it('keeps room to spare at the reference resolutions', () => {
    for (const viewport of [1920, 2560, 3840]) {
      expect(barNeed(), `${viewport}px`).toBeLessThanOrEqual(barInner(panelWidth(viewport)) - 20)
    }
  })

  it('never spends more than a fifth of a row on the clock', () => {
    // 52 px Uhr plus 7 gap, und sie traegt IMMER Sekunden: die kurze Fassung
    // sparte 20 px und kostete das, was im Kampf zaehlt.
    const rowInner = EVENT_LOG_PANEL_MIN_W - 20
    expect(59 / rowInner).toBeLessThanOrEqual(0.2)
  })
})

describe('event log trail — what falls out of it', () => {
  /**
   * Die Spur rollt nicht. Der Deckel auf gerenderte Zeilen muss deshalb die
   * hoechste Spur ueberfuellen — sonst endet sie mitten im Bild mit einer
   * Luecke, und die Maske blendet nichts aus.
   */
  it('renders more rows than the tallest trail can show', () => {
    const ROW_H = 30
    const GAP = 6
    const trail = EVENT_LOG_PANEL_MAX_H - EVENT_LOG_BAR_H - GAP
    const fits = Math.ceil(trail / (ROW_H + GAP))
    expect(EVENT_LOG_TRAIL_MAX_ROWS).toBeGreaterThan(fits)
  })

  /** Die Maske darf nur die letzte Zeile fassen, nie zwei. */
  it('fades out at most one row', () => {
    expect(EVENT_LOG_TRAIL_FADE_PX).toBeLessThan(2 * 30)
  })
})
