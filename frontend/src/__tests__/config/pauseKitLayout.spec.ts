import { describe, it, expect } from 'vitest'
import {
  PAUSE_PANEL_DESIGN_WIDTH,
  PAUSE_BODY_COL_GAP,
  PAUSE_STATE_COL_WIDTH,
  PAUSE_KIT_GAP_PX,
  PAUSE_KIT_BLOCK_H,
  PAUSE_KIT_TILE_H,
  PAUSE_KIT_CELL_ART_PX,
  PAUSE_KIT_EFFECT_CHIP_H,
  PAUSE_KIT_EFFECT_CHIP_W,
  PAUSE_KIT_EFFECT_COLS,
  PAUSE_KIT_EFFECT_MORE_W,
  PAUSE_KIT_EFFECT_COL_W,
  PAUSE_CALLOUT_ROWS,
  PAUSE_CALLOUT_COLS,
  PAUSE_STAR_CARD_WIDTH,
  PAUSE_STAR_CARD_HEIGHT,
  PAUSE_STAR_CARD_GAP_PX,
  PAUSE_MATERIAL_TILE_WIDTH,
  RESOURCE_STAR_MAX_CONCURRENT,
} from '@/config/constants'

/**
 * Das Pause-Panel besteht aus ZWEI Säulen, und jede trägt seit dem Umbau am
 * Fuß etwas, das vorher quer darunter lag: links die Callout-Karten, rechts den
 * Kit-Block. Beide Umzüge sind still — nichts im CSS sagt, ob die Effekt-Reihe
 * noch in die Spalte passt oder ob eine Säule der anderen davonläuft.
 *
 * Gerechnet wird im Layoutraum des Panels: über ihm liegt `useFitScale`, die
 * Zahlen hier sind also von der Auflösung unabhängig.
 */

/** `.pause-panel` padding-inline, obere Stufe von `clamp(20px, 4vw, 44px)`. */
const PANEL_PAD_X = 44
/** Innenraum des Panels. */
const INNER = PAUSE_PANEL_DESIGN_WIDTH - 2 * PANEL_PAD_X

/**
 * Was der Zustandssäule von ihrer Spalte bleibt. `box-sizing` ist global
 * `border-box`; die Spalte gibt PAUSE_BODY_COL_GAP als `padding-left` und die
 * Trennlinie ab.
 */
const STATE_COL_BORDER = 1
const stateColContent = PAUSE_STATE_COL_WIDTH - PAUSE_BODY_COL_GAP - STATE_COL_BORDER
/** Die Bilanzspalte nimmt den Rest — sie trägt kein Padding. */
const tallyColWidth = INNER - PAUSE_STATE_COL_WIDTH - PAUSE_BODY_COL_GAP

/** Vier Fähigkeiten, vier Kacheln — die Reihe bricht nicht um. */
const KIT_TILES = 4
/** `.kit-cell` padding-inline (8 je Seite) plus Rahmen. */
const TILE_INSET = 2 * 8 + 2 * 1
const tileWidth = (stateColContent - (KIT_TILES - 1) * PAUSE_KIT_GAP_PX) / KIT_TILES

/** Reservierte Höhe der Callout-Karten am Fuß der Bilanzsäule. */
const calloutBlockH =
  PAUSE_CALLOUT_ROWS * PAUSE_STAR_CARD_HEIGHT +
  (PAUSE_CALLOUT_ROWS - 1) * PAUSE_STAR_CARD_GAP_PX

describe('pause kit block layout', () => {
  it('derives the effect row from chip width, count and the tally slot', () => {
    expect(PAUSE_KIT_EFFECT_COL_W).toBe(
      PAUSE_KIT_EFFECT_COLS * PAUSE_KIT_EFFECT_CHIP_W +
        PAUSE_KIT_EFFECT_COLS * PAUSE_KIT_GAP_PX +
        PAUSE_KIT_EFFECT_MORE_W,
    )
  })

  /**
   * Der Grund, warum die Zustandsspalte von 460 auf 530 gewachsen ist. Die
   * Chips tragen im Block ihren NAMEN und vertragen keine Kürzung — passt die
   * Reihe nicht, muss die Spalte wachsen, nicht der Chip schrumpfen.
   */
  it('fits the effect row inside the state column', () => {
    expect(PAUSE_KIT_EFFECT_COL_W).toBeLessThanOrEqual(stateColContent)
  })

  /** Die Blockhöhe ist die Summe seiner beiden Reihen, nicht eine zweite Zahl. */
  it('derives the block height from its two rows', () => {
    expect(PAUSE_KIT_BLOCK_H).toBe(
      PAUSE_KIT_TILE_H + PAUSE_KIT_GAP_PX + PAUSE_KIT_EFFECT_CHIP_H,
    )
  })

  /**
   * Die Kachel trägt keinen Namen mehr — die Kunst samt Kürzel trägt die
   * Zuordnung allein und muss deshalb ganz hineinpassen, waagerecht wie
   * senkrecht.
   */
  it('fits the artwork inside the tile', () => {
    expect(tileWidth - TILE_INSET).toBeGreaterThanOrEqual(PAUSE_KIT_CELL_ART_PX)
    expect(PAUSE_KIT_CELL_ART_PX).toBeLessThan(PAUSE_KIT_TILE_H)
  })
})

describe('pause tally column layout', () => {
  /**
   * Die Karten sind alle gleich breit (Champion, Void, Flybys). Beide Grenzen
   * werden geprüft: die Reihe muss PAUSE_CALLOUT_COLS tragen und darf eine
   * mehr nicht tragen — sonst wäre die Spaltenzahl geraten, nicht hergeleitet.
   */
  it('derives the callout columns from the tally width', () => {
    const fits =
      PAUSE_CALLOUT_COLS * PAUSE_STAR_CARD_WIDTH +
      (PAUSE_CALLOUT_COLS - 1) * PAUSE_STAR_CARD_GAP_PX
    const oneMore =
      (PAUSE_CALLOUT_COLS + 1) * PAUSE_STAR_CARD_WIDTH +
      PAUSE_CALLOUT_COLS * PAUSE_STAR_CARD_GAP_PX
    expect(fits).toBeLessThanOrEqual(tallyColWidth)
    expect(oneMore).toBeGreaterThan(tallyColWidth)
  })

  /**
   * Champion, Void und die gleichzeitigen Flybys — jede Karte braucht ihren
   * reservierten Platz. Fehlt einer, verschwindet die Karte hinter
   * `overflow: hidden`, ohne dass etwas bricht.
   */
  it('reserves a slot for every callout that can appear at once', () => {
    const maxCards = 1 + 1 + RESOURCE_STAR_MAX_CONCURRENT
    expect(PAUSE_CALLOUT_ROWS * PAUSE_CALLOUT_COLS).toBeGreaterThanOrEqual(maxCards)
  })

  /** Das Material-Raster ist die breiteste feste Ablesung der Säule. */
  it('fits the material grid', () => {
    expect(PAUSE_MATERIAL_TILE_WIDTH).toBeLessThanOrEqual(tallyColWidth)
  })
})

describe('pause column balance', () => {
  /**
   * Der Umbau lebt davon, dass sich beide Säulen den gewonnenen Fuß TEILEN:
   * rechts der Kit-Block, links die Callout-Karten. Läuft eine davon, endet
   * das Panel tiefer als vorher, und der Fit-Scale — auf jeder Desktop-
   * Auflösung höhenlimitiert — verkleinert das GANZE Overlay.
   *
   * Die absoluten Säulenhöhen stehen im CSS und werden im Browser gemessen,
   * nicht hier. Was hier steht, ist der Abstand ihrer Zuwächse: eine dritte
   * Callout-Reihe (+102) oder ein zweiter Kit-Block bricht diese Spec, und das
   * ist ihr Zweck.
   */
  it('keeps both column footers within reach of each other', () => {
    expect(Math.abs(calloutBlockH - PAUSE_KIT_BLOCK_H)).toBeLessThanOrEqual(60)
  })
})
