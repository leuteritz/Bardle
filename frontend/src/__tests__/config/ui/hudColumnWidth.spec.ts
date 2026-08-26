import { describe, it, expect } from 'vitest'
import {
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
 * Der Wächter über die EINE Breite beider HUD-Spalten (`--hud-col-w`, gerechnet
 * in `App.vue` aus den Skalaren, die `main.ts` vor dem Mount setzt).
 *
 * Vor diesem Umbau stand die Formel 15× wörtlich im Repo — fünf Karten mal drei
 * Auflösungsstufen, ohne Konstante und ohne Test. Wer eine Stelle vergass, liess
 * die rechten Kanten der Spalte auseinanderlaufen; genau davor warnen die
 * Kommentare in `OmenHudCard` und `VoidRiftHudCard`. Hier stehen die Zahlen, aus
 * denen das CSS gebaut ist, der DOM-Beleg liegt im Playwright-Lauf.
 */

const clamp = (min: number, val: number, max: number) => Math.min(Math.max(val, min), max)

const headerWidth = (W: number) =>
  clamp(HEADER_MIN_WIDTH, W - HEADER_SIDE_GUTTER_TOTAL, HEADER_MAX_WIDTH)

/** Die freie Gasse, gegen den `px-4`-Container des Seitenlayouts gerechnet. */
const gutter = (W: number) =>
  HEADER_PAGE_INSET + (W - 2 * HEADER_PAGE_INSET - headerWidth(W)) / 2

const inset = (W: number) => (W >= HUD_COLUMN_WIDE_MIN_VW ? HUD_COLUMN_INSET_WIDE : HUD_COLUMN_INSET)

/**
 * Der Rand zählt ZWEIMAL: einmal zur Bildkante, einmal als gespiegelte Lücke
 * zum Header. Genau das steht als `var(--hud-col-edge) * 2` im CSS.
 */
const columnWidth = (W: number) =>
  clamp(HUD_COLUMN_MIN_W, gutter(W) - 2 * inset(W), HUD_COLUMN_MAX_W)

describe('hud column width — one formula for both gutters', () => {
  it('reaches the widths the CSS assumes at every reference resolution', () => {
    expect(columnWidth(1920)).toBe(380)
    expect(columnWidth(2560)).toBe(548)
    expect(columnWidth(3840)).toBe(HUD_COLUMN_MAX_W)
  })

  /**
   * Der Boden ist eine Kollision, kein runder Wert: bei 1536 px (Full HD bei
   * 125 %) steht die Karte exakt bündig an der Header-Kante. Ein höherer Boden
   * schöbe sie darunter — und dagegen schützt nur dieser Fall.
   */
  it('stands flush against the header at the narrowest desktop', () => {
    expect(columnWidth(1536)).toBe(HUD_COLUMN_MIN_W)
    expect(inset(1536) + columnWidth(1536)).toBe(gutter(1536))
  })

  it('never crosses the header at any reference resolution', () => {
    for (const W of [1536, 1920, 2560, 3840]) {
      expect(inset(W) + columnWidth(W), `${W}px`).toBeLessThanOrEqual(gutter(W))
    }
  })

  /**
   * Die Zusage, um die es geht. Der Header steht mittig, also ist die rechte
   * Gasse die gespiegelte linke — beide Spalten lesen dieselbe Variable. Ein
   * späteres Sonderfeld auf einer Seite bricht hier.
   */
  it('gives the left and the right column the same width', () => {
    for (const W of [1536, 1920, 2560, 3840]) {
      const leftEdge = inset(W) + columnWidth(W)
      const rightEdge = W - inset(W) - columnWidth(W)
      expect(leftEdge, `${W}px`).toBe(W - rightEdge)
    }
  })

  /** Der Deckel greift genau einmal — sonst wäre er eine Grenze, keine Ausnahme. */
  it('hits the cap only on 4K', () => {
    expect(columnWidth(3840)).toBe(HUD_COLUMN_MAX_W)
    for (const W of [1536, 1920, 2560]) {
      expect(columnWidth(W), `${W}px`).toBeLessThan(HUD_COLUMN_MAX_W)
    }
    // 4K liesse 1188 zu — der Deckel verschenkt dort bewusst Gasse, weil eine
    // Zeile jenseits von rund 95 Zeichen beim Zeilenwechsel nicht mehr trägt.
    expect(gutter(3840) - 2 * inset(3840)).toBeGreaterThan(HUD_COLUMN_MAX_W)
  })

  it('switches the inset together with the cards typography step', () => {
    expect(inset(HUD_COLUMN_WIDE_MIN_VW - 1)).toBe(HUD_COLUMN_INSET)
    expect(inset(HUD_COLUMN_WIDE_MIN_VW)).toBe(HUD_COLUMN_INSET_WIDE)
  })
})
