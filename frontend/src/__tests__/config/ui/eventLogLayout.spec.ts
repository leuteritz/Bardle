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
  EVENT_LOG_BAR_H_MID,
  EVENT_LOG_BAR_H_WIDE,
  EVENT_LOG_BAR_PAD,
  EVENT_LOG_BAR_GAP,
  EVENT_LOG_BAR_MID_MIN_W,
  EVENT_LOG_BAR_WIDE_MIN_W,
  EVENT_LOG_BAR_NAMES_MIN_W,
  EVENT_LOG_TAB_MIN_W,
  EVENT_LOG_TAB_MIN_W_MID,
  EVENT_LOG_TAB_MIN_W_WIDE,
  EVENT_LOG_TAB_COUNT_W,
  EVENT_LOG_TAB_COUNT_W_MID,
  EVENT_LOG_TAB_COUNT_W_WIDE,
  EVENT_LOG_TOOL_W,
  EVENT_LOG_TOOL_W_MID,
  EVENT_LOG_TOOL_W_WIDE,
  EVENT_LOG_TRAIL_FADE_PX,
  EVENT_LOG_TRAIL_MAX_ROWS,
  EVENT_LOG_TRAIL_MOVE_ROWS,
  EVENT_LOG_BESIDE_HEADER_MIN_VW,
  HUD_COLUMN_MIN_W,
  HUD_COLUMN_MAX_W,
  HUD_COLUMN_INSET,
  HUD_COLUMN_INSET_WIDE,
  HUD_COLUMN_WIDE_MIN_VW,
  HEADER_SIDE_GUTTER_TOTAL,
  HEADER_MIN_WIDTH,
  HEADER_MAX_WIDTH,
  HEADER_PAGE_INSET,
} from '@/config/constants'

/**
 * Der Wächter über das Budget der Eventlog-Spur.
 *
 * Die BREITE steht nicht mehr hier — sie ist die gemeinsame Spaltenbreite und
 * liegt in `hudColumnWidth.spec.ts`. Was bleibt, ist alles, was nur die Spur
 * betrifft: ihre Höhe gegen die Bühne, die Fassung unterhalb der Schwelle (wo
 * sie unter dem Header steht und die Gasse nicht ihre Grenze ist) und die
 * dreistufige Leiste.
 */

const clamp = (min: number, val: number, max: number) => Math.min(Math.max(val, min), max)

const panelHeight = (viewportH: number) =>
  clamp(EVENT_LOG_PANEL_MIN_H, (viewportH * EVENT_LOG_PANEL_VH) / 100, EVENT_LOG_PANEL_MAX_H)

/** Die Breite UNTERHALB der Schwelle — dort hängt die Spur unter dem Header. */
const belowThresholdWidth = (viewportW: number) =>
  clamp(EVENT_LOG_PANEL_MIN_W, (viewportW * EVENT_LOG_PANEL_VW) / 100, EVENT_LOG_PANEL_MAX_W)

const headerWidth = (W: number) =>
  clamp(HEADER_MIN_WIDTH, W - HEADER_SIDE_GUTTER_TOTAL, HEADER_MAX_WIDTH)

const gutter = (W: number) => HEADER_PAGE_INSET + (W - 2 * HEADER_PAGE_INSET - headerWidth(W)) / 2

const inset = (W: number) =>
  W >= HUD_COLUMN_WIDE_MIN_VW ? HUD_COLUMN_INSET_WIDE : HUD_COLUMN_INSET

/** Dieselbe Formel wie in `hudColumnWidth.spec.ts` — hier als Eingabe der Leiste. */
const columnWidth = (W: number) =>
  clamp(HUD_COLUMN_MIN_W, gutter(W) - 2 * inset(W), HUD_COLUMN_MAX_W)

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
    const bottom = headerBottom + EVENT_LOG_PANEL_TOP_GAP + panelHeight(H)
    expect(bottom).toBeLessThan(hudBarTopAt(W - 1, metrics) - 40)
  })

  it('reaches the heights the CSS assumes', () => {
    // Ein Drittel Bildhöhe, nicht die Hälfte: die rahmenlose Spur deckt
    // weiterhin, was hinter ihr steht.
    expect(Math.round(panelHeight(950))).toBe(285)
    expect(Math.round(panelHeight(1310))).toBe(393)
    expect(panelHeight(2030)).toBe(EVENT_LOG_PANEL_MAX_H)
    expect(panelHeight(950)).toBeLessThan(950 / 3)
  })

  /**
   * Unterhalb der Schwelle trägt die Gasse die Spur nicht — sie fällt unter den
   * Header und rechnet dort mit ihrer eigenen Fassung. Ohne diesen Fall wären
   * die drei `EVENT_LOG_PANEL_*_W` unbelegt und die Media Query blosser Zierrat.
   */
  it('falls back to its own box where the gutter cannot carry it', () => {
    const W = 1536
    expect(W).toBeLessThan(EVENT_LOG_BESIDE_HEADER_MIN_VW)
    expect(columnWidth(W)).toBeLessThan(belowThresholdWidth(W))
    expect(belowThresholdWidth(W)).toBe(EVENT_LOG_PANEL_MIN_W)
    // Und oberhalb ist die Gasse breiter als der Rückfall — sonst schrumpfte die
    // Spur beim Überschreiten der Schwelle.
    expect(columnWidth(1920)).toBeGreaterThanOrEqual(EVENT_LOG_PANEL_MIN_W)
  })
})

// ── Die Leiste ──────────────────────────────────────────────────────────────
// Schriftmodell, im Browser NACHGEMESSEN: die fünf Labels wogen bei 11 px und
// 0,09 em Sperrung zusammen 224,1 px auf 29 Zeichen — abzüglich der Sperrung
// sind das 0,613 em Vorschub je Versalie. Ein geschätzter Faktor lag um bis zu
// 18 % daneben und hätte „Progress" in einem randvollen Tab beschnitten.
const ADVANCE_EM = 0.613
const TRACKING_EM = 0.05
const BAR_BORDER = 2
const TAB_GAP = 2

interface Step {
  name: string
  viewport: number
  fontPx: number
  barPad: number
  barGap: number
  /** Ein Tab MIT seiner Zahl. */
  tabW: number
  /** Was die Zahl davon wiegt — sie weicht auf der Namensstufe dem Namen. */
  countW: number
  toolW: number
  named: 'none' | 'active' | 'all'
  counted: 'all' | 'active'
}

const STEPS: Step[] = [
  {
    name: 'narrow',
    viewport: 1920,
    fontPx: 10,
    barPad: EVENT_LOG_BAR_PAD,
    barGap: EVENT_LOG_BAR_GAP,
    tabW: EVENT_LOG_TAB_MIN_W,
    countW: EVENT_LOG_TAB_COUNT_W,
    toolW: EVENT_LOG_TOOL_W,
    named: 'none',
    counted: 'all',
  },
  {
    // Zwischen der Groessen- und der Namensschwelle: 2480 px Fenster tragen
    // eine Spur von 508 — dort steht nur der aktive Name, aber jede Zahl.
    name: 'mid',
    viewport: 2480,
    fontPx: 11,
    barPad: 6,
    barGap: 4,
    tabW: EVENT_LOG_TAB_MIN_W_MID,
    countW: EVENT_LOG_TAB_COUNT_W_MID,
    toolW: EVENT_LOG_TOOL_W_MID,
    named: 'active',
    counted: 'all',
  },
  {
    name: 'names',
    viewport: 2560,
    fontPx: 11,
    barPad: 6,
    barGap: 4,
    tabW: EVENT_LOG_TAB_MIN_W_MID,
    countW: EVENT_LOG_TAB_COUNT_W_MID,
    toolW: EVENT_LOG_TOOL_W_MID,
    named: 'all',
    counted: 'active',
  },
  {
    name: 'wide',
    viewport: 3840,
    fontPx: 12,
    barPad: 8,
    barGap: 5,
    tabW: EVENT_LOG_TAB_MIN_W_WIDE,
    countW: EVENT_LOG_TAB_COUNT_W_WIDE,
    toolW: EVENT_LOG_TOOL_W_WIDE,
    named: 'all',
    counted: 'all',
  },
]

const TOOLS = 3

const labelWidth = (label: string, fontPx: number) =>
  label.length * (ADVANCE_EM * fontPx + TRACKING_EM * fontPx)

/** Innenraum der Leiste bei gegebener Spurbreite. */
const barInner = (w: number, step: Step) => w - BAR_BORDER - 2 * step.barPad

/** Was die Leiste auf dieser Stufe wirklich braucht. */
const barNeed = (step: Step) => {
  const labels = EVENT_GROUPS.map((g) => g.label.toUpperCase())
  const widest = labels.reduce((max, l) => Math.max(max, labelWidth(l, step.fontPx)), 0)
  const names =
    step.named === 'all'
      ? labels.reduce((sum, l) => sum + labelWidth(l, step.fontPx) + step.barGap, 0)
      : step.named === 'active'
        ? widest + step.barGap
        : 0
  const counts = step.counted === 'all' ? EVENT_GROUPS.length * step.countW : step.countW
  return (
    EVENT_GROUPS.length * (step.tabW - step.countW) +
    counts +
    (EVENT_GROUPS.length - 1) * TAB_GAP +
    names +
    TOOLS * step.toolW +
    TOOLS * step.barGap
  )
}

describe('event log trail — the bar in three steps', () => {
  it('carries its content at every step', () => {
    for (const step of STEPS) {
      const w = columnWidth(step.viewport)
      expect(barNeed(step), step.name).toBeLessThanOrEqual(barInner(w, step))
    }
  })

  it('keeps room to spare, not just a fit', () => {
    for (const step of STEPS) {
      const w = columnWidth(step.viewport)
      expect(barInner(w, step) - barNeed(step), step.name).toBeGreaterThanOrEqual(20)
    }
  })

  /**
   * Die Stufen greifen erst, wenn ihre Schwelle auch WIRKLICH trägt — an der
   * Schwelle selbst, nicht erst bei der Referenzauflösung darüber.
   */
  it('carries its content already at each threshold', () => {
    const at: Array<[string, number]> = [
      ['mid', EVENT_LOG_BAR_MID_MIN_W],
      ['names', EVENT_LOG_BAR_NAMES_MIN_W],
      ['wide', EVENT_LOG_BAR_WIDE_MIN_W],
    ]
    for (const [name, threshold] of at) {
      const step = STEPS.find((s) => s.name === name)!
      expect(barNeed(step), name).toBeLessThanOrEqual(barInner(threshold, step))
    }
  })

  /** Und die Referenzbreiten treffen ihre Stufe auch. */
  it('puts every reference resolution on its own step', () => {
    expect(EVENT_LOG_BAR_MID_MIN_W).toBeLessThan(EVENT_LOG_BAR_NAMES_MIN_W)
    expect(EVENT_LOG_BAR_NAMES_MIN_W).toBeLessThan(EVENT_LOG_BAR_WIDE_MIN_W)
    expect(columnWidth(1920)).toBeLessThan(EVENT_LOG_BAR_MID_MIN_W)
    expect(columnWidth(2480)).toBeGreaterThanOrEqual(EVENT_LOG_BAR_MID_MIN_W)
    expect(columnWidth(2480)).toBeLessThan(EVENT_LOG_BAR_NAMES_MIN_W)
    // 2K traegt alle fuenf Namen — dafuer wurde die Schwelle gesetzt.
    expect(columnWidth(2560)).toBeGreaterThanOrEqual(EVENT_LOG_BAR_NAMES_MIN_W)
    expect(columnWidth(2560)).toBeLessThan(EVENT_LOG_BAR_WIDE_MIN_W)
    expect(columnWidth(3840)).toBeGreaterThanOrEqual(EVENT_LOG_BAR_WIDE_MIN_W)
  })

  /** Die Leiste wächst mit, aber sie wächst monoton. */
  it('grows the bar with the step', () => {
    expect(EVENT_LOG_BAR_H).toBeLessThan(EVENT_LOG_BAR_H_MID)
    expect(EVENT_LOG_BAR_H_MID).toBeLessThan(EVENT_LOG_BAR_H_WIDE)
    expect(EVENT_LOG_TOOL_W).toBeLessThan(EVENT_LOG_TOOL_W_MID)
    expect(EVENT_LOG_TOOL_W_MID).toBeLessThan(EVENT_LOG_TOOL_W_WIDE)
  })

  it('never spends more than a fifth of a row on the clock', () => {
    // 52 px Uhr plus 7 gap, und sie traegt IMMER Sekunden: die kurze Fassung
    // sparte 20 px und kostete das, was im Kampf zaehlt.
    const rowInner = EVENT_LOG_PANEL_MIN_W - 20
    expect(59 / rowInner).toBeLessThanOrEqual(0.2)
  })
})

const ROW_H = 30
const ROW_GAP = 6
/** Was die hoechste Spur ueberhaupt zeigen kann. */
const rowsInTallestTrail = Math.ceil(
  (EVENT_LOG_PANEL_MAX_H - EVENT_LOG_BAR_H_WIDE - ROW_GAP) / (ROW_H + ROW_GAP),
)

describe('event log trail — what falls out of it', () => {
  /**
   * Der Deckel auf gerenderte Zeilen muss die hoechste Spur ueberfuellen —
   * sonst endet sie mitten im Bild mit einer Luecke, und die Maske blendet
   * nichts aus. Seit dem Rad-Scrollen ist er zugleich die Tiefe der Historie,
   * durch die man zurueckgehen kann.
   */
  it('renders more rows than the tallest trail can show', () => {
    expect(EVENT_LOG_TRAIL_MAX_ROWS).toBeGreaterThan(rowsInTallestTrail)
  })

  /**
   * Die Move-Transition traegt nur, was in der Spur steht: alles darunter ist
   * unsichtbar und wuerde je Ereignis umsonst animiert.
   */
  it('animates the visible rows and no more', () => {
    expect(EVENT_LOG_TRAIL_MOVE_ROWS).toBeGreaterThanOrEqual(rowsInTallestTrail)
    expect(EVENT_LOG_TRAIL_MOVE_ROWS).toBeLessThan(EVENT_LOG_TRAIL_MAX_ROWS)
  })

  /** Die Maske darf nur die letzte Zeile fassen, nie zwei. */
  it('fades out at most one row', () => {
    expect(EVENT_LOG_TRAIL_FADE_PX).toBeLessThan(2 * 30)
  })
})
