import { describe, it, expect } from 'vitest'
import {
  VOYAGE_RAIL_WIDTH,
  VOYAGE_DETAIL_COLLAPSED,
  VOYAGE_DETAIL_MIN_WIDTH,
  VOYAGE_DETAIL_PCT,
  VOYAGE_DETAIL_MAX_WIDTH,
  VOYAGE_MAP_GUTTER_PX,
  VOYAGE_MAP_INSET_PX,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_MAP_STATS_MIN_H,
  VOYAGE_BERTH_MIN_SEPARATION,
  VOYAGE_SITE_HIT_MIN,
  VOYAGE_FLEET_PILL_MIN_W,
  VOYAGE_FLEET_PILL_GAP,
  EXPEDITION_LEDGER_RANKS,
  BOTTOM_BAR_SIDE_W,
} from '@/config/constants'
import { galaxyFitBox } from '@/utils/fx/galaxyPlate'

/**
 * Der Fleet-Streifen ist eine zweite Zeile der Kopfleiste, und `.etc-bar` ist
 * eine `auto`-Grid-Zeile: was er an Höhe nimmt, nimmt er der BÜHNE. Und die
 * Bühnenhöhe ist keine Geschmacksfrage — die kürzere Achse der Fit-Box trägt die
 * Klickflächen zweier Nachbarhäfen (`VOYAGE_BERTH_MIN_SEPARATION`), und unter
 * `VOYAGE_MAP_STATS_MIN_H` fällt das Datenband weg.
 *
 * Diese Datei ist deshalb kein Zierrat: wer den Streifen höher macht, eine Zeile
 * hineinschreibt oder ihn umbrechen lässt, bricht hier — und das ist ihr Zweck.
 *
 * Die Zonenrechnung steht ein zweites Mal hier (wie in `shopAtlasLayout.spec.ts`
 * gegenüber `voyagesAtlasLayout.spec.ts`), damit die Kopplung Kartenbreite ↔
 * Hafenabstand dort ungestört bleibt.
 */

const MODAL_GAP = 10
const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))
const hudScale = (w: number, h: number) => clamp(0.52, Math.min(w / 2560, h / 1440), 1)
const teamUiScale = (w: number, h: number) => clamp(0.62, Math.min(w / 1920, h / 1080), 1)

function atlasWidth(vw: number, vh: number): number {
  const panel = BOTTOM_BAR_SIDE_W * hudScale(vw, vh)
  return (vw - 2 * (panel + MODAL_GAP)) / teamUiScale(vw, vh)
}

function mapWidth(vw: number, vh: number, detailFolded = false): number {
  const detail = detailFolded
    ? VOYAGE_DETAIL_COLLAPSED
    : clamp(
        VOYAGE_DETAIL_MIN_WIDTH,
        (atlasWidth(vw, vh) * VOYAGE_DETAIL_PCT) / 100,
        VOYAGE_DETAIL_MAX_WIDTH,
      )
  return atlasWidth(vw, vh) - VOYAGE_RAIL_WIDTH - detail
}

/**
 * Bühnenhöhe MIT Streifen — im Browser gemessen, nicht gerechnet: `.rp-wrapper`
 * hängt oben an `--level-badge-bottom`, das der Header zur Laufzeit aus einem
 * gerenderten Rechteck setzt. Dieselben Zahlen wie in `voyagesAtlasLayout.spec.ts`.
 */
const STAGE_HEIGHT: Record<number, number> = {
  1080: 657.6,
  1200: 758.4,
  1440: 936,
  2160: 1645.2,
}

const DESKTOPS: Array<[string, number, number]> = [
  ['Full HD 1920×1080', 1920, 1080],
  ['WUXGA 1920×1200', 1920, 1200],
  ['2K/QHD 2560×1440', 2560, 1440],
  ['4K 3840×2160', 3840, 2160],
]

describe('voyages fleet strip', () => {
  it.each(DESKTOPS)('%s: der Streifen lässt das Datenband stehen', (_l, _vw, vh) => {
    expect(STAGE_HEIGHT[vh]).toBeGreaterThanOrEqual(VOYAGE_MAP_STATS_MIN_H)
  })

  /**
   * Der eigentliche Grund für die Datei: die Höhe, die der Streifen nimmt, hängt
   * an der Klickfläche zweier Nachbarhäfen.
   */
  it.each(DESKTOPS)('%s: zwei Nachbarhäfen bleiben getrennt anklickbar', (_l, vw, vh) => {
    const box = galaxyFitBox(
      mapWidth(vw, vh) - VOYAGE_MAP_GUTTER_PX,
      STAGE_HEIGHT[vh] - VOYAGE_MAP_STATS_BAND_H,
      VOYAGE_MAP_INSET_PX,
    )
    expect(VOYAGE_BERTH_MIN_SEPARATION * Math.min(box.w, box.h)).toBeGreaterThanOrEqual(
      VOYAGE_SITE_HIT_MIN,
    )
  })

  it('behält auf Full HD Spielraum über dem Bandboden', () => {
    // Full HD bindet: 657,6 gegen den Boden 620 sind 37,6 px. Die Zahl steht hier,
    // damit sie jemand liest, BEVOR er dem Streifen eine zweite Zeile gibt — 44 px
    // mehr, und das Datenband der Karte fällt weg.
    expect(STAGE_HEIGHT[1080] - VOYAGE_MAP_STATS_MIN_H).toBeGreaterThanOrEqual(30)
  })

  /**
   * Der Streifen bricht NICHT um — er hat feste Höhe, sonst änderte sich mit
   * jedem Spawn die Bühnenhöhe und die Galaxie würde neu gemalt. Also müssen die
   * Pillen in eine Zeile passen, und zwar so viele, wie der Rang-Deckel zulässt.
   */
  it('trägt so viele Pillen in einer Zeile, wie der Ledger-Rang Marken zulässt', () => {
    const top = EXPEDITION_LEDGER_RANKS[EXPEDITION_LEDGER_RANKS.length - 1]
    const most = top.activeSlots + top.offerSlots
    const need = most * VOYAGE_FLEET_PILL_MIN_W + (most - 1) * VOYAGE_FLEET_PILL_GAP
    // Der Streifen läuft über die ganze Kopfleiste, also über den ganzen Atlas.
    const room = atlasWidth(1920, 1080) - 2 * 14
    expect(need).toBeLessThanOrEqual(room)
  })
})
