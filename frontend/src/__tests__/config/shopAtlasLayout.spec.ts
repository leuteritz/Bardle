import { describe, it, expect } from 'vitest'
import {
  SHOP_ATLAS_FACET_RAIL_WIDTH,
  SHOP_ATLAS_DETAIL_MIN_WIDTH,
  SHOP_ATLAS_DETAIL_PCT,
  SHOP_ATLAS_DETAIL_MAX_WIDTH,
  SHOP_ATLAS_CARD_MIN_WIDTH,
  SHOP_ATLAS_GRID_GAP,
  SHOP_ATLAS_CARD_FULL_HD_COLUMNS,
  SHOP_ATLAS_CARD_COMFORT_MIN_GRID_WIDTH,
  SHOP_ATLAS_CARD_COMFORT_MAX_GRID_WIDTH,
  SHOP_ATLAS_COMFORT_CARD_COLUMNS,
  SHOP_HERO_ACTIONS_W,
  SHOP_HERO_ACTIONS_ICON_W,
  SHOP_HERO_FIELD_MIN_W,
  SHOP_HERO_LABEL_MIN_W,
  BOTTOM_BAR_SIDE_W,
} from '@/config/constants'

/**
 * The shop's three zones share one budget: facets + grid + detail = the whole
 * tab. The compact and comfort bands keep the card rhythm intentional instead
 * of letting five narrow cards appear at the lower Full HD container width.
 *
 * The numbers below mirror what App.vue computes and what the browser was
 * measured at (see the worked example in constants/economy.ts):
 *   Full HD  →  232px 636px 372px   4 columns
 *   2K       →  232px 930px 498px   5 columns
 */

/** Horizontal padding of .cs-atlas-grid, both sides. */
const GRID_PADDING = 28
/** .rp-wrapper's --bp-gap, both sides. */
const MODAL_GAP = 10

const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** `--hud-scale` / `--team-ui-scale` from App.vue. */
const hudScale = (w: number, h: number) => clamp(0.52, Math.min(w / 2560, h / 1440), 1)
const teamUiScale = (w: number, h: number) => clamp(0.62, Math.min(w / 1920, h / 1080), 1)

/**
 * Width of .cs-atlas in its own (zoomed) coordinate space. The profile modal is
 * inset by `--hud-panel-size` on both sides, which is the raised side panel of
 * the bottom bar scaled by `--hud-scale` (App.vue).
 */
function atlasWidth(vw: number, vh: number): number {
  const panel = BOTTOM_BAR_SIDE_W * hudScale(vw, vh)
  const modal = vw - 2 * (panel + MODAL_GAP)
  return modal / teamUiScale(vw, vh)
}

function zones(vw: number, vh: number) {
  const atlas = atlasWidth(vw, vh)
  const facets = SHOP_ATLAS_FACET_RAIL_WIDTH
  const detail = clamp(
    SHOP_ATLAS_DETAIL_MIN_WIDTH,
    (atlas * SHOP_ATLAS_DETAIL_PCT) / 100,
    SHOP_ATLAS_DETAIL_MAX_WIDTH,
  )
  const grid = atlas - facets - detail
  return { atlas, facets, detail, grid }
}

/** What the shop container queries resolve to. */
function columns(gridWidth: number): number {
  if (gridWidth < SHOP_ATLAS_CARD_COMFORT_MIN_GRID_WIDTH) {
    return SHOP_ATLAS_CARD_FULL_HD_COLUMNS
  }
  if (gridWidth <= SHOP_ATLAS_CARD_COMFORT_MAX_GRID_WIDTH) {
    return SHOP_ATLAS_COMFORT_CARD_COLUMNS
  }
  const usable = gridWidth - GRID_PADDING
  return Math.floor(
    (usable + SHOP_ATLAS_GRID_GAP) / (SHOP_ATLAS_CARD_MIN_WIDTH + SHOP_ATLAS_GRID_GAP),
  )
}

const DESKTOPS: Array<[string, number, number]> = [
  ['Full HD 1920×1080', 1920, 1080],
  ['WUXGA 1920×1200', 1920, 1200],
  ['2K/QHD 2560×1440', 2560, 1440],
  ['4K 3840×2160', 3840, 2160],
]

describe('shop atlas layout', () => {
  it.each(DESKTOPS)('%s keeps the compact grid at four or more columns', (_label, vw, vh) => {
    expect(columns(zones(vw, vh).grid)).toBeGreaterThanOrEqual(SHOP_ATLAS_CARD_FULL_HD_COLUMNS)
  })

  it.each(DESKTOPS)('%s leaves every zone a positive width', (_label, vw, vh) => {
    const z = zones(vw, vh)
    expect(z.facets).toBeGreaterThan(0)
    expect(z.detail).toBeGreaterThan(0)
    expect(z.grid).toBeGreaterThan(0)
    expect(z.facets + z.detail + z.grid).toBeCloseTo(z.atlas, 6)
  })

  it('matches the two widths measured in the browser', () => {
    const fhd = zones(1920, 1080)
    expect(Math.round(fhd.grid)).toBe(636)
    expect(Math.round(fhd.detail)).toBe(372)
    expect(columns(fhd.grid)).toBe(SHOP_ATLAS_CARD_FULL_HD_COLUMNS)

    const qhd = zones(2560, 1440)
    expect(Math.round(qhd.grid)).toBe(930)
    expect(Math.round(qhd.detail)).toBe(498)
    expect(columns(qhd.grid)).toBe(SHOP_ATLAS_COMFORT_CARD_COLUMNS)
  })

  it.each(DESKTOPS)('%s keeps the facet rail permanently open', (_l, vw, vh) => {
    expect(zones(vw, vh).facets).toBe(SHOP_ATLAS_FACET_RAIL_WIDTH)
    expect(columns(zones(vw, vh).grid)).toBeGreaterThanOrEqual(SHOP_ATLAS_CARD_FULL_HD_COLUMNS)
  })

  /** What the search row leaves the field once its two buttons took their share. */
  function searchFieldWidth(gridWidth: number): number {
    const actions =
      gridWidth >= SHOP_HERO_LABEL_MIN_W ? SHOP_HERO_ACTIONS_W : SHOP_HERO_ACTIONS_ICON_W
    return gridWidth - GRID_PADDING - actions
  }

  it.each(DESKTOPS)('%s: the search row leaves the field its floor', (_l, vw, vh) => {
    // The field takes what reset and collapse-all leave over. Widen a button or a
    // zone and the field is what pays for it — silently, until it is unreadable.
    expect(searchFieldWidth(zones(vw, vh).grid)).toBeGreaterThanOrEqual(SHOP_HERO_FIELD_MIN_W)
  })

  it('uses compact search actions at Full HD and labels at 2K', () => {
    // The threshold is the decision, not a round number: spelled out the buttons
    // cost 264px, which the Full HD column cannot pay and the 2K one can.
    expect(zones(1920, 1080).grid).toBeLessThan(SHOP_HERO_LABEL_MIN_W)
    expect(zones(2560, 1440).grid).toBeGreaterThanOrEqual(SHOP_HERO_LABEL_MIN_W)
    expect(SHOP_HERO_ACTIONS_ICON_W).toBeLessThan(SHOP_HERO_ACTIONS_W)
  })
})
