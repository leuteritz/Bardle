import { describe, it, expect } from 'vitest'
import {
  VOYAGE_RAIL_WIDTH,
  VOYAGE_RAIL_COLLAPSED,
  VOYAGE_DETAIL_COLLAPSED,
  VOYAGE_DETAIL_MIN_WIDTH,
  VOYAGE_MAP_GUTTER_PX,
  VOYAGE_FLEET_CARD_MIN_W,
  VOYAGE_FLEET_CARD_GAP,
  VOYAGE_FLEET_CARD_PAD,
  BOTTOM_BAR_SIDE_W,
} from '@/config/constants'

/**
 * Das Fleet-Brett teilt sich die Bühne mit der Karte, hat aber einen anderen
 * Boden: eine Spalte allein wäre keine Übersicht. Wer die Leiste verbreitert
 * oder die Kartenbreite anhebt, nimmt dem Raster eine Spalte — und nichts im
 * CSS sagt es ihm.
 *
 * Die Zonenrechnung ist dieselbe wie in `voyagesAtlasLayout.spec.ts`; sie steht
 * hier ein zweites Mal, damit die Kopplung Kartenbreite ↔ Hafenabstand dort
 * ungestört bleibt. Im Fleet-Modus ist die Detailspalte immer eingeklappt.
 */

const MODAL_GAP = 10
const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))
const hudScale = (w: number, h: number) => clamp(0.52, Math.min(w / 2560, h / 1440), 1)
const teamUiScale = (w: number, h: number) => clamp(0.62, Math.min(w / 1920, h / 1080), 1)

function atlasWidth(vw: number, vh: number): number {
  const panel = BOTTOM_BAR_SIDE_W * hudScale(vw, vh)
  return (vw - 2 * (panel + MODAL_GAP)) / teamUiScale(vw, vh)
}

/** Innenbreite des Bretts: Bühne minus der Rinne, die `.etc-stage` beisteuert. */
function boardWidth(vw: number, vh: number, railOpen: boolean): number {
  const rail = railOpen ? VOYAGE_RAIL_WIDTH : VOYAGE_RAIL_COLLAPSED
  return atlasWidth(vw, vh) - rail - VOYAGE_DETAIL_COLLAPSED - VOYAGE_MAP_GUTTER_PX
}

/** Was `repeat(auto-fill, minmax(MIN, 1fr))` bei dieser Breite ergibt. */
function columns(width: number): number {
  return Math.floor((width + VOYAGE_FLEET_CARD_GAP) / (VOYAGE_FLEET_CARD_MIN_W + VOYAGE_FLEET_CARD_GAP))
}

const DESKTOPS: Array<[string, number, number]> = [
  ['Full HD 1920×1080', 1920, 1080],
  ['WUXGA 1920×1200', 1920, 1200],
  ['2K/QHD 2560×1440', 2560, 1440],
  ['4K 3840×2160', 3840, 2160],
]

describe('voyages fleet layout', () => {
  /**
   * Der Grund für die Datei. Die Kartenbreite ist ABGELEITET: eine Fleet-Zeile
   * IST die Zeile der Detailspalte. Wählte jemand hier eine eigene Zahl, bräche
   * dieselbe Zeile an einem der beiden Orte um.
   */
  it('leitet die Kartenbreite aus der Detailspalte ab, statt sie zu wählen', () => {
    expect(VOYAGE_FLEET_CARD_MIN_W).toBe(
      VOYAGE_DETAIL_MIN_WIDTH - VOYAGE_DETAIL_COLLAPSED - 2 * VOYAGE_FLEET_CARD_PAD,
    )
  })

  it.each(DESKTOPS)('%s trägt drei Spalten, wie das Brett sie vorgibt', (_l, vw, vh) => {
    // Das Brett faltet die Leiste als Vorgabe ein — das ist der Zustand, den der
    // Spieler beim Umschalten sieht.
    expect(columns(boardWidth(vw, vh, false))).toBeGreaterThanOrEqual(3)
  })

  it.each(DESKTOPS)('%s trägt zwei Spalten auch mit offener Leiste', (_l, vw, vh) => {
    // Eine Spalte wäre keine Übersicht, sondern eine zweite Leiste.
    expect(columns(boardWidth(vw, vh, true))).toBeGreaterThanOrEqual(2)
  })

  it('gibt den grossen Schirmen mehr Spalten, nicht breitere Karten', () => {
    expect(columns(boardWidth(2560, 1440, false))).toBeGreaterThanOrEqual(4)
    expect(columns(boardWidth(3840, 2160, false))).toBeGreaterThanOrEqual(6)
  })

  it.each(DESKTOPS)('%s: Einklappen der Leiste gibt dem Raster Breite, nie weg', (_l, vw, vh) => {
    const open = boardWidth(vw, vh, true)
    const folded = boardWidth(vw, vh, false)
    expect(folded - open).toBeCloseTo(VOYAGE_RAIL_WIDTH - VOYAGE_RAIL_COLLAPSED, 6)
    expect(columns(folded)).toBeGreaterThanOrEqual(columns(open))
  })

  it('hält die Karten samt Lücken in der Bühne', () => {
    for (const [, vw, vh] of DESKTOPS) {
      for (const railOpen of [true, false]) {
        const width = boardWidth(vw, vh, railOpen)
        const n = columns(width)
        expect(n * VOYAGE_FLEET_CARD_MIN_W + (n - 1) * VOYAGE_FLEET_CARD_GAP).toBeLessThanOrEqual(
          width,
        )
      }
    }
  })
})
