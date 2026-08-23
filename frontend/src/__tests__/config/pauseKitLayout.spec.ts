import { describe, it, expect } from 'vitest'
import {
  PAUSE_PANEL_DESIGN_WIDTH,
  PAUSE_KIT_GAP_PX,
  PAUSE_KIT_BAND_H,
  PAUSE_KIT_CELL_H,
  PAUSE_KIT_CELL_ART_PX,
  PAUSE_KIT_EFFECT_CHIP_H,
  PAUSE_KIT_EFFECT_CHIP_W,
  PAUSE_KIT_EFFECT_COLS,
  PAUSE_KIT_EFFECT_MORE_W,
  PAUSE_KIT_EFFECT_COL_W,
} from '@/config/constants'
import { BARD_ABILITIES } from '@/config/progression/bardAbilities'

/**
 * Das Kit-Band teilt EINE Breite zwischen zwei Zonen: vier Fähigkeitszellen
 * links, `PAUSE_KIT_EFFECT_COLS` Effekt-Chips rechts. Nichts im CSS sagt, wie
 * viel Text einer Zelle danach bleibt — wer die Chip-Breite anhebt, nimmt sie
 * still dem Namen der Fähigkeit weg, und „Caretaker's Shrine" wird ellipsiert,
 * ohne dass es auffällt.
 *
 * Gerechnet wird im Layoutraum des Panels: über ihm liegt `useFitScale`, die
 * Zahlen hier sind also von der Auflösung unabhängig.
 */

/** `.pause-panel` padding-inline, obere Stufe von `clamp(20px, 4vw, 44px)`. */
const PANEL_PAD_X = 44
/** Innenraum des Panels. */
const INNER = PAUSE_PANEL_DESIGN_WIDTH - 2 * PANEL_PAD_X

/** Vier Fähigkeiten, vier Zellen — die Reihe bricht nicht um. */
const KIT_CELLS = 4
/** `.kit-cell` padding-inline (10 links, 12 rechts) plus die Lücke zur Kunst. */
const CELL_TEXT_INSET = 10 + 12 + 10

/** `.sec-head` plus die Lücke darunter (`.kit-col` gap). */
const BAND_HEAD_H = 24 + 10

const kitColWidth = INNER - PAUSE_KIT_EFFECT_COL_W - 2 * PAUSE_KIT_GAP_PX
const cellWidth = (kitColWidth - (KIT_CELLS - 1) * PAUSE_KIT_GAP_PX) / KIT_CELLS
const textWidth = cellWidth - CELL_TEXT_INSET - PAUSE_KIT_CELL_ART_PX

describe('pause kit band layout', () => {
  it('derives the effect column from chip width, count and the tally slot', () => {
    expect(PAUSE_KIT_EFFECT_COL_W).toBe(
      PAUSE_KIT_EFFECT_COLS * PAUSE_KIT_EFFECT_CHIP_W +
        PAUSE_KIT_EFFECT_COLS * PAUSE_KIT_GAP_PX +
        PAUSE_KIT_EFFECT_MORE_W,
    )
  })

  /**
   * Das Band ist EINE Zeile. Wären Zelle und Chip verschieden hoch, schlösse
   * eine Spalte kürzer ab als die andere — und die Bandhöhe hinge davon ab,
   * welche gerade die höhere ist.
   */
  it('keeps cell and chip the same height', () => {
    expect(PAUSE_KIT_BAND_H).toBe(PAUSE_KIT_CELL_H)
    expect(PAUSE_KIT_EFFECT_CHIP_H).toBe(PAUSE_KIT_BAND_H)
  })

  /**
   * Der Grund für den Umbau: das Band stand einmal als 2 × 2-Raster und kostete
   * mit Kopfzeile 232 px Panelhöhe. Bleibt es darunter, bleibt der Fit-Scale
   * mindestens dort, wo er war.
   */
  it('stays under the two-row band it replaced', () => {
    expect(BAND_HEAD_H + PAUSE_KIT_BAND_H).toBeLessThan(232)
  })

  it('leaves room for four cells side by side', () => {
    expect(cellWidth).toBeGreaterThanOrEqual(190)
  })

  /**
   * Zeichen statt Pixel, weil eine Spec keine Schrift misst: „Caretaker's
   * Shrine" ist mit 18 Zeichen der längste Name und maß im Browser in
   * MedievalSharp bei 0,9 rem 124 px. Die Grenze liegt darüber und unter dem,
   * was heute Platz hat (gemessen 129).
   */
  it('leaves room for the longest ability name', () => {
    const longest = Math.max(...BARD_ABILITIES.map((a) => a.name.length))
    expect(longest, 'a longer ability name needs a re-measure').toBeLessThanOrEqual(20)
    expect(textWidth).toBeGreaterThanOrEqual(126)
  })

  /** Die Kunst darf die Zelle nicht höher machen, als das Band reserviert. */
  it('fits the artwork inside the cell', () => {
    expect(PAUSE_KIT_CELL_ART_PX).toBeLessThan(PAUSE_KIT_CELL_H)
  })
})
